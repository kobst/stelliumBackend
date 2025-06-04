// Main horoscope generation pipeline

import { 
  generateTransitSeries, 
  scanTransitSeries, 
  mergeTransitWindows,
  scanTransitToTransitAspects,
  mergeTransitToTransitWindows
} from '../services/ephemerisDataService.js';
import { 
  getUserSingle,
  getBirthChart,
  getPreGeneratedTransitSeries,
  createHoroscope
} from '../services/dbService.js';
import { generateHoroscopeNarrative } from '../services/gptService.js';
import { 
  filterAndPrioritizeTransits, 
  categorizeTransits,
  TransitEvent,
  TransitWindow,
  calculateHouseFromDegree,
  getOrdinalHouse
} from './transitPrioritization.js';
import { 
  extractSignificantMoonPhases,
  NatalPoint,
  TransitSeriesEntry
} from './moonPhaseAnalysis.js';

export interface HoroscopeData {
  userId: string;
  period: 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  hasKnownBirthTime: boolean;
  mainThemes: TransitEvent[];
  immediateEvents: TransitEvent[];
  moonPhases: TransitEvent[];
  transitToTransitAspects: TransitEvent[];
}

export interface HoroscopeAnalysis {
  userId: string;
  period: 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  text: string;
  userPrompt: string;
  keyTransits: Array<{
    transitingPlanet: string;
    targetPlanet?: string;
    aspect?: string;
    exactDate: Date;
    description?: string;
    priority: number;
  }>;
  generatedAt: Date;
  metadata: {
    hasKnownBirthTime: boolean;
    mainThemeCount: number;
    immediateEventCount: number;
    moonPhaseCount: number;
    transitToTransitCount: number;
  };
}

// Extract natal points from birth chart data
function extractNatalPoints(birthChart: any): NatalPoint[] {
  const points: NatalPoint[] = [];
  
  // Add planets
  if (birthChart.planets) {
    for (const planet of birthChart.planets) {
      // Skip if it's Ascendant or Midheaven (they'll be added from houses)
      if (planet.name === 'Ascendant' || planet.name === 'Midheaven') {
        continue;
      }
      points.push({
        name: planet.name,
        lon: planet.full_degree || 0,
        sign: planet.sign,
        degree: planet.norm_degree || planet.degree
      });
    }
  }
  
  // Add angles if available
  if (birthChart.houses && birthChart.houses.length > 0) {
    // Ascendant is the cusp of the 1st house
    const ascendant = birthChart.houses[0];
    if (ascendant) {
      points.push({
        name: 'Ascendant',
        lon: ascendant.degree, // In houses, 'degree' is the full zodiac degree
        sign: ascendant.sign,
        degree: ascendant.degree % 30 // Calculate degree within sign
      });
    }
    
    // Midheaven is the cusp of the 10th house
    const midheaven = birthChart.houses[9];
    if (midheaven) {
      points.push({
        name: 'Midheaven',
        lon: midheaven.degree, // In houses, 'degree' is the full zodiac degree
        sign: midheaven.sign,
        degree: midheaven.degree % 30 // Calculate degree within sign
      });
    }
  }
  
  return points;
}

// Helper function to transform DB transit data to TransitSeriesEntry format
function transformDbTransitData(dbData: any[]): TransitSeriesEntry[] {
  return dbData.map(entry => ({
    date: entry.date instanceof Date ? entry.date : new Date(entry.date),
    planets: entry.planets.map(planet => ({
      name: planet.name,
      lon: planet.lon || planet.full_degree || planet.fullDegree,
      speed: planet.speed,
      sign: planet.sign
    })),
    moonPhase: entry.moonPhase
  }));
}

// Main horoscope generation function
export async function generateHoroscope(
  userId: string,
  startDate: Date,
  endDate: Date,
  type: 'weekly' | 'monthly'
): Promise<any> {
  
  // 1. Get user's natal data
  const userData = await getUserSingle(userId);
  if (!userData) {
    throw new Error(`User not found: ${userId}`);
  }
  
  const hasKnownBirthTime = userData.birth_time_known !== false;
  const birthChart = userData.birthChart
  if (!birthChart) {
    throw new Error(`Birth chart not found for user: ${userId}`);
  }
  
  // 2. Generate extended transit series (add buffer for exact calculations)
  const bufferDays = type === 'monthly' ? 7 : 2;
  const bufferedStart = new Date(startDate);
  bufferedStart.setDate(bufferedStart.getDate() - bufferDays);
  const bufferedEnd = new Date(endDate);
  bufferedEnd.setDate(bufferedEnd.getDate() + bufferDays);
  
  // Convert dates to ISO strings for database query
  const startISO = bufferedStart.toISOString().split('T')[0];
  const endISO = bufferedEnd.toISOString().split('T')[0];
  
  // const transitSeries = generateTransitSeries(bufferedStart, bufferedEnd);
  const rawTransitSeries = await getPreGeneratedTransitSeries(startISO, endISO);
  const transitSeries = transformDbTransitData(rawTransitSeries);
  
  // 3. Calculate all transit events
  const natalPoints = extractNatalPoints(birthChart);
  const rawTransitEvents = Array.from(scanTransitSeries(transitSeries, natalPoints));
  const mergedWindows = mergeTransitWindows(rawTransitEvents);
  
  // 4. Get transit-to-transit aspects
  const transitAspects = Array.from(scanTransitToTransitAspects(transitSeries));
  const mergedTransitWindows = mergeTransitToTransitWindows(transitAspects);
  
  // 5. Extract moon phases
  const moonPhases = extractSignificantMoonPhases(
    transitSeries, 
    natalPoints, 
    { start: startDate, end: endDate }
  );
  
  // 6. Filter and prioritize transits, and transform the transit windows into TransitEvents
  const prioritizedTransits = filterAndPrioritizeTransits(
    mergedWindows as TransitWindow[],
    { start: startDate, end: endDate },
    hasKnownBirthTime,
    birthChart
  );
  
  // 7. Separate into themes and immediate events
  const { mainThemes, immediateEvents } = categorizeTransits(
    prioritizedTransits,
    type
  );
  
  // 8. Convert transit-to-transit windows to events
  const transitToTransitEvents = convertTransitToTransitToEvents(
    mergedTransitWindows,
    { start: startDate, end: endDate },
    birthChart
  );
  
  // 9. Generate narrative with GPT
  const horoscopeData: HoroscopeData = {
    userId,
    period: type,
    startDate,
    endDate,
    hasKnownBirthTime,
    mainThemes,
    immediateEvents,
    moonPhases,
    transitToTransitAspects: transitToTransitEvents.slice(0, 3), // Top 3 sky patterns
  };
  
  // Temporarily skip GPT for debugging
  const { horoscopeText, userPrompt } = await generateHoroscopeNarrative(horoscopeData);
  
  // 10. Prepare key transits for storage
  const keyTransits = [...mainThemes, ...immediateEvents]
    .slice(0, 5)
    .map(t => ({
      transitingPlanet: t.transitingPlanet,
      targetPlanet: t.targetPlanet,
      aspect: t.aspect,
      exactDate: t.exact,
      description: t.description,
      priority: t.priority
    }));
  
  // 11. Create analysis object
  const analysis: HoroscopeAnalysis = {
    userId,
    period: type,
    startDate,
    endDate,
    text: horoscopeText,
    keyTransits,
    generatedAt: new Date(),
    userPrompt: userPrompt,
    metadata: {
      hasKnownBirthTime,
      mainThemeCount: mainThemes.length,
      immediateEventCount: immediateEvents.length,
      moonPhaseCount: moonPhases.length,
      transitToTransitCount: transitToTransitEvents.length
    }
  };
  
  // 12. Store in database
  const horoscopeDoc = {
    userId,
    period: type,
    startDate,
    endDate,
    transitData: {
      transits: mergedWindows,
      retrogrades: [] // TODO: Add retrograde detection
    },
    analysis: {
      keyThemes: keyTransits,
      detailedAnalysis: []
    },
    interpretation: horoscopeText,
    userPrompt: userPrompt,
    generatedAt: new Date()
  };
  
  const savedHoroscope = await createHoroscope(horoscopeDoc);
  
  return savedHoroscope;
}

// Convert transit-to-transit windows to events
function convertTransitToTransitToEvents(
  windows: any[],
  period: { start: Date; end: Date },
  birthChart?: any
): TransitEvent[] {
  
  return windows
    .filter(w => {
      // Include if exact during period or if ongoing
      return (w.exact >= period.start && w.exact <= period.end) ||
             (w.start <= period.end && (!w.end || w.end >= period.start));
    })
    .map(w => {
      // Calculate priority based on planets involved
      let priority = 5;
      
      // Both slow planets = higher priority
      const planet1Speed = PLANET_SPEEDS[w.planet1] || 1;
      const planet2Speed = PLANET_SPEEDS[w.planet2] || 1;
      
      if (planet1Speed < 0.1 && planet2Speed < 0.1) {
        priority += 2;
      } else if (planet1Speed < 0.5 || planet2Speed < 0.5) {
        priority += 1;
      }
      
      // Major aspects get boost
      if (['conjunction', 'opposition', 'square'].includes(w.aspect)) {
        priority += 1;
      }
      
      // Calculate house positions for both planets if birth chart houses are available
      let transitingHouse: number | undefined;
      let targetHouse: number | undefined;
      
      if (birthChart && birthChart.houses && w.degree1AtExact !== undefined && w.degree2AtExact !== undefined) {
        transitingHouse = calculateHouseFromDegree(w.degree1AtExact, birthChart.houses);
        targetHouse = calculateHouseFromDegree(w.degree2AtExact, birthChart.houses);
      }
      
      // Create description with signs and houses if available
      let description = w.planet1;
      if (w.sign1) {
        description += ` in ${w.sign1}`;
      }
      if (transitingHouse) {
        description += ` in the ${getOrdinalHouse(transitingHouse)} house`;
      }
      description += ` ${w.aspect} ${w.planet2}`;
      if (w.sign2) {
        description += ` in ${w.sign2}`;
      }
      if (targetHouse) {
        description += ` in the ${getOrdinalHouse(targetHouse)} house`;
      }
      description += ` in the sky`;
      
      return {
        type: 'transit-to-transit' as const,
        start: w.start,
        exact: w.exact,
        end: w.end,
        priority,
        transitingPlanet: w.planet1,
        targetPlanet: w.planet2,
        aspect: w.aspect,
        transitingSign: w.sign1,
        targetSign: w.sign2,
        transitingHouse,
        targetHouse,
        description,
        isRetrograde: w.isRetrograde1AtExact, // planet1's retrograde status at exact
        targetIsRetrograde: w.isRetrograde2AtExact // planet2's retrograde status at exact
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

// Import PLANET_SPEEDS from transitPrioritization
import { PLANET_SPEEDS } from './transitPrioritization.js';

// Format sky pattern for GPT prompt
export function formatSkyPatternForPrompt(pattern: TransitEvent): string {
  if (pattern.type !== 'transit-to-transit') {
    return pattern.description || 'Sky pattern';
  }
  
  let desc = pattern.description || '';
  
  // Add retrograde indicators for both planets
  if (pattern.isRetrograde) {
    const planetName = pattern.transitingPlanet;
    desc = desc.replace(planetName, `${planetName} (retrograde)`);
  }
  
  if (pattern.targetIsRetrograde && pattern.targetPlanet) {
    const targetPlanetName = pattern.targetPlanet;
    desc = desc.replace(targetPlanetName, `${targetPlanetName} (retrograde)`);
  }
  
  return `${desc} (exact: ${pattern.exact.toDateString()})`;
}