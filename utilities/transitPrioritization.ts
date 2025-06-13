// Transit filtering and prioritization for horoscope generation

export interface TransitWindow {
  start: Date;
  exact: Date;
  end: Date;
  transiting: string;
  natal: string;
  aspect: string;
  minOrb: number;
  exactEventApproaching: boolean;
  transitingSignAtStart?: string;
  transitingSignAtExact?: string;
  transitingSignAtEnd?: string;
  transitingDegreeAtStart?: number;
  transitingDegreeAtExact?: number;
  transitingDegreeAtEnd?: number;
  isRetrogradeAtStart?: boolean;
  isRetrogradeAtExact?: boolean;
  isRetrogradeAtEnd?: boolean;
}

export interface TransitEvent {
  type: 'transit-to-natal' | 'transit-to-transit' | 'moon-phase';
  start: Date;
  exact: Date;
  end: Date;
  priority: number; // 1-10, higher = more important
  transitingPlanet: string;
  targetPlanet?: string; // for transit-to-natal
  aspect?: string;
  description?: string;
  moonPhaseData?: any;
  aspectsToPersonalPlanets?: Array<{ planet: string; aspect: string }>;
  transitingSign?: string; // Sign at exact aspect (or current if ongoing)
  transitingSigns?: string[]; // All signs during the transit window
  targetSign?: string; // Natal planet's sign
  transitingHouse?: number; // House of the transiting planet (calculated from natal chart houses)
  targetHouse?: number; // Natal planet's house or calculated house for transit-to-transit
  isRetrograde?: boolean; // Whether the transiting planet is retrograde
  targetIsRetrograde?: boolean; // Whether the target planet is retrograde (for transit-to-transit) or natal planet retrograde status
}

// Average daily motion in degrees
export const PLANET_SPEEDS = {
  Moon: 13.2,
  Sun: 1.0,
  Mercury: 1.6,
  Venus: 1.2,
  Mars: 0.7,
  Jupiter: 0.08,
  Saturn: 0.03,
  Uranus: 0.01,
  Neptune: 0.006,
  Pluto: 0.004,
  Chiron: 0.05,
  'North Node': 0.05,
  'South Node': 0.05
};

const ASPECT_WEIGHTS: { [key: string]: number } = {
  conjunction: 3,
  opposition: 2.5,
  square: 2,
  trine: 1.5,
  sextile: 1,
  quincunx: 0.5
};

const PERSONAL_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'];

/**
 * Helper function to convert house number to ordinal string
 * @param houseNumber - House number (1-12)
 * @returns Ordinal string (1st, 2nd, 3rd, 4th, etc.)
 */
export function getOrdinalHouse(houseNumber: number): string {
  const j = houseNumber % 10;
  const k = houseNumber % 100;
  if (j === 1 && k !== 11) {
    return houseNumber + "st";
  }
  if (j === 2 && k !== 12) {
    return houseNumber + "nd";
  }
  if (j === 3 && k !== 13) {
    return houseNumber + "rd";
  }
  return houseNumber + "th";
}

/**
 * Calculate which house a planet degree falls into based on house cusps
 * @param planetDegree - The planet's degree (0-360)
 * @param houses - Array of house objects with degree property
 * @returns House number (1-12) or undefined if houses not available
 */
export function calculateHouseFromDegree(planetDegree: number, houses: any[]): number | undefined {
  if (!houses || houses.length !== 12) {
    return undefined;
  }
  
  // Normalize the planet degree to 0-360 range
  let normalizedDegree = ((planetDegree % 360) + 360) % 360;
  
  // Sort houses by degree to ensure proper order
  const sortedHouses = [...houses].sort((a, b) => a.degree - b.degree);
  
  // Find which house the planet falls into
  for (let i = 0; i < sortedHouses.length; i++) {
    const currentHouse = sortedHouses[i];
    const nextHouse = sortedHouses[(i + 1) % sortedHouses.length];
    
    let houseStart = currentHouse.degree;
    let houseEnd = nextHouse.degree;
    
    // Handle wrap-around from house 12 to house 1
    if (i === sortedHouses.length - 1) {
      // Last house wraps around to first house
      if (normalizedDegree >= houseStart || normalizedDegree < houseEnd) {
        return currentHouse.house;
      }
    } else {
      // Normal case: check if planet is between current and next house
      if (houseEnd > houseStart) {
        // Normal case - no wrap around
        if (normalizedDegree >= houseStart && normalizedDegree < houseEnd) {
          return currentHouse.house;
        }
      } else {
        // Wrap around case
        if (normalizedDegree >= houseStart || normalizedDegree < houseEnd) {
          return currentHouse.house;
        }
      }
    }
  }
  
  // Fallback - shouldn't reach here with valid house data
  return undefined;
}

export function filterAndPrioritizeTransits(
  mergedWindows: TransitWindow[],
  period: { start: Date; end: Date },
  hasKnownBirthTime: boolean,
  birthChart?: any
): TransitEvent[] {
  
  return mergedWindows
    .filter(window => {
      // Filter out regular Moon transits (handled separately via moon phases)
      if (window.transiting === 'Moon') {
        return false;
      }
      
      // Filter out house-based transits for unknown birth times
      if (!hasKnownBirthTime && 
          ['Ascendant', 'Midheaven'].includes(window.natal)) {
        return false;
      }
      
      // Include if any part of window overlaps with period
      return window.start <= period.end && 
             (!window.end || window.end >= period.start);
    })
    .map(window => {
      // Calculate priority based on multiple factors
      const priority = calculateTransitPriority(window, period);
      
      // Collect all unique signs during the transit window
      const transitingSigns: string[] = [];
      if (window.transitingSignAtStart) transitingSigns.push(window.transitingSignAtStart);
      if (window.transitingSignAtExact && !transitingSigns.includes(window.transitingSignAtExact)) {
        transitingSigns.push(window.transitingSignAtExact);
      }
      if (window.transitingSignAtEnd && !transitingSigns.includes(window.transitingSignAtEnd)) {
        transitingSigns.push(window.transitingSignAtEnd);
      }
      
      // Get natal planet information from birth chart
      let targetSign: string | undefined;
      let targetHouse: number | undefined;
      let targetIsRetrograde: boolean | undefined;
      
      if (birthChart && birthChart.planets && window.natal) {
        const natalPlanet = birthChart.planets.find((p: any) => p.name === window.natal);
        if (natalPlanet) {
          targetSign = natalPlanet.sign;
          targetHouse = natalPlanet.house;
          targetIsRetrograde = natalPlanet.is_retro;
        }
      }
      
      // Calculate transiting planet's house position if birth chart houses are available
      let transitingHouse: number | undefined;
      if (birthChart && birthChart.houses && hasKnownBirthTime && window.transitingDegreeAtExact !== undefined) {
        transitingHouse = calculateHouseFromDegree(window.transitingDegreeAtExact, birthChart.houses);
      }
      
      return {
        type: 'transit-to-natal' as const,
        start: window.start,
        exact: window.exact,
        end: window.end,
        priority,
        transitingPlanet: window.transiting,
        targetPlanet: window.natal,
        aspect: window.aspect,
        transitingSign: window.transitingSignAtExact || window.transitingSignAtStart,
        transitingSigns: transitingSigns.length > 0 ? transitingSigns : undefined,
        targetSign,
        transitingHouse,
        targetHouse,
        isRetrograde: window.isRetrogradeAtExact !== undefined ? window.isRetrogradeAtExact : window.isRetrogradeAtStart,
        targetIsRetrograde
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

export function calculateTransitPriority(
  window: TransitWindow, 
  period: { start: Date; end: Date }
): number {
  let priority = 5; // Base priority
  
  // 1. Exact during period gets highest boost
  if (window.exact >= period.start && window.exact <= period.end) {
    priority += 3;
  }
  
  // 2. Planet speed factor (slower = more important for themes)
  const speed = (PLANET_SPEEDS as { [key: string]: number })[window.transiting] || 1;
  if (speed < 0.1) {
    priority += 2;  // Very slow (outer planets)
  } else if (speed < 1) {
    priority += 1; // Medium speed
  }
  
  // 3. Aspect strength
  priority += (ASPECT_WEIGHTS as { [key: string]: number })[window.aspect] || 0;
  
  // 4. Personal planet involvement
  if (PERSONAL_PLANETS.includes(window.natal)) {
    priority += 1;
  }
  
  // 5. Applying aspects get slight boost
  if (window.exactEventApproaching) {
    priority += 0.5;
  }
  
  return Math.min(priority, 10); // Cap at 10
}

export function categorizeTransits(
  transits: TransitEvent[], 
  type: 'weekly' | 'monthly'
): { mainThemes: TransitEvent[]; immediateEvents: TransitEvent[] } {
  
  const mainThemes: TransitEvent[] = [];
  const immediateEvents: TransitEvent[] = [];
  
  for (const transit of transits) {
    const planetSpeed = (PLANET_SPEEDS as { [key: string]: number })[transit.transitingPlanet] || 1;
    
    if (type === 'weekly') {
      // For weekly: fast transits are immediate, slow are themes
      if (planetSpeed > 0.5) {
        immediateEvents.push(transit);
      } else {
        mainThemes.push(transit);
      }
    } else {
      // For monthly: very slow are themes, medium/fast are episodes
      if (planetSpeed < 0.1) {
        mainThemes.push(transit);
      } else {
        immediateEvents.push(transit);
      }
    }
  }
  
  // Limit numbers for readability
  return {
    mainThemes: mainThemes.slice(0, 3),
    immediateEvents: immediateEvents.slice(0, type === 'weekly' ? 5 : 10)
  };
}

// Format transit for display or logging
export function formatTransitForPrompt(transit: TransitEvent): string {
  const speed = (PLANET_SPEEDS as { [key: string]: number })[transit.transitingPlanet] || 1;
  const speedDesc = speed < 0.1 ? 'very slow' : speed < 1 ? 'medium' : 'fast';
  
  if (transit.type === 'transit-to-natal') {
    let description = `${transit.transitingPlanet}`;
    
    // Add retrograde indicator if applicable
    if (transit.isRetrograde) {
      description += ` (retrograde)`;
    }
    
    // Add sign information
    if (transit.transitingSigns && transit.transitingSigns.length > 1) {
      description += ` (moving from ${transit.transitingSigns[0]} to ${transit.transitingSigns[transit.transitingSigns.length - 1]})`;
    } else if (transit.transitingSign) {
      description += ` in ${transit.transitingSign}`;
    }
    
    // Add transiting planet's house if available
    if (transit.transitingHouse) {
      description += ` in the ${getOrdinalHouse(transit.transitingHouse)} house`;
    }
    
    description += ` ${transit.aspect} natal ${transit.targetPlanet}`;
    
    // Add natal planet's retrograde status
    if (transit.targetIsRetrograde) {
      description += ` (natal retrograde)`;
    }
    
    // Add natal planet's sign and house
    if (transit.targetSign) {
      description += ` in ${transit.targetSign}`;
    }
    if (transit.targetHouse) {
      description += ` in the ${getOrdinalHouse(transit.targetHouse)} house`;
    }
    
    description += ` (exact: ${transit.exact.toDateString()}, priority: ${transit.priority}, ${speedDesc} moving)`;
    
    return description;
  } else if (transit.type === 'moon-phase') {
    return transit.description || 'Moon phase event';
  } else {
    return `Sky pattern: ${transit.description || 'Transit aspect'}`;
  }
}