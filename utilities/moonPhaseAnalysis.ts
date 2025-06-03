// Moon phase analysis for horoscope generation

import { TransitEvent } from './transitPrioritization.js';

export interface TransitSeriesEntry {
  date: Date;
  planets: Array<{
    name: string;
    lon: number;
    speed: number;
    sign: string;
  }>;
  moonPhase: MoonPhaseInfo;
}

export interface MoonPhaseInfo {
  phase: string;
  angle: number;
  waxing: boolean;
  moonSign: string;
  description: string;
}

export interface NatalPoint {
  name: string;
  lon: number;
  sign?: string;
  degree?: number;
}

const PERSONAL_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'];

// Helper function to calculate angular difference
function angularDifference(a: number, b: number): number {
  return Math.abs(((a - b + 180) % 360) - 180);
}

export function extractSignificantMoonPhases(
  transitSeries: TransitSeriesEntry[],
  natalPlanets: NatalPoint[],
  period: { start: Date; end: Date }
): TransitEvent[] {
  
  const significantPhases: TransitEvent[] = [];
  
  for (const entry of transitSeries) {
    // Skip if outside our period
    if (entry.date < period.start || entry.date > period.end) continue;
    
    const { moonPhase, planets } = entry;
    const moon = planets.find(p => p.name === 'Moon');
    
    if (!moon) continue;
    
    // Only process New and Full Moons
    if (moonPhase.phase === 'New Moon' || moonPhase.phase === 'Full Moon') {
      const moonAspects: Array<{ planet: string; aspect: string }> = [];
      
      // Check aspects to personal planets only
      for (const natal of natalPlanets) {
        if (!PERSONAL_PLANETS.includes(natal.name)) continue;
        
        const angle = angularDifference(moon.lon, natal.lon);
        
        // Check for major aspects with tight orbs
        if (angle <= 5) {
          // Conjunction
          moonAspects.push({ planet: natal.name, aspect: 'conjunction' });
        } else if (Math.abs(angle - 180) <= 5) {
          // Opposition
          moonAspects.push({ planet: natal.name, aspect: 'opposition' });
        } else if (Math.abs(angle - 90) <= 3) {
          // Square (tighter orb)
          moonAspects.push({ planet: natal.name, aspect: 'square' });
        } else if (Math.abs(angle - 120) <= 3) {
          // Trine (tighter orb)
          moonAspects.push({ planet: natal.name, aspect: 'trine' });
        }
      }
      
      // Include if it aspects at least one personal planet
      if (moonAspects.length > 0) {
        let priority = 7; // Base priority for significant moon phases
        
        // Boost priority for multiple aspects
        if (moonAspects.length > 1) priority += 0.5;
        
        // Boost for aspects to Sun or Moon
        if (moonAspects.some(a => ['Sun', 'Moon'].includes(a.planet))) {
          priority += 0.5;
        }
        
        significantPhases.push({
          type: 'moon-phase',
          exact: entry.date,
          start: entry.date,
          end: entry.date,
          priority,
          transitingPlanet: 'Moon',
          description: `${moonPhase.phase} in ${moonPhase.moonSign} - ${moonPhase.description}`,
          moonPhaseData: moonPhase,
          aspectsToPersonalPlanets: moonAspects
        });
      }
    }
  }
  
  return significantPhases;
}

// Format moon phase for GPT prompt
export function formatMoonPhaseForPrompt(moonPhase: TransitEvent): string {
  if (moonPhase.type !== 'moon-phase' || !moonPhase.aspectsToPersonalPlanets) {
    return moonPhase.description || 'Moon phase event';
  }
  
  const aspects = moonPhase.aspectsToPersonalPlanets
    .map(a => `${a.aspect} to natal ${a.planet}`)
    .join(', ');
  
  return `${moonPhase.description} (${aspects})`;
}

// Check if a date is near a New or Full Moon (within 1 day)
export function isNearSignificantMoonPhase(
  date: Date,
  transitSeries: TransitSeriesEntry[]
): { isNear: boolean; phase?: string; exactDate?: Date } {
  
  for (const entry of transitSeries) {
    const dayDiff = Math.abs(date.getTime() - entry.date.getTime()) / (1000 * 60 * 60 * 24);
    
    if (dayDiff <= 1 && 
        (entry.moonPhase.phase === 'New Moon' || entry.moonPhase.phase === 'Full Moon')) {
      return {
        isNear: true,
        phase: entry.moonPhase.phase,
        exactDate: entry.date
      };
    }
  }
  
  return { isNear: false };
}

// Get moon phase context for a specific date
export function getMoonPhaseContext(
  date: Date,
  transitSeries: TransitSeriesEntry[]
): MoonPhaseInfo | null {
  
  // Find the entry closest to our date
  let closestEntry: TransitSeriesEntry | null = null;
  let minDiff = Infinity;
  
  for (const entry of transitSeries) {
    const diff = Math.abs(date.getTime() - entry.date.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closestEntry = entry;
    }
  }
  
  return closestEntry?.moonPhase || null;
}