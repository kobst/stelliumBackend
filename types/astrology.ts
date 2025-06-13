// Core Astrology Domain Types

export interface Planet {
  name: string;
  fullDegree: number;
  normDegree: number;
  speed: number;
  isRetro: boolean;
  sign: string;
  house?: number;
}

export interface House {
  number: number;
  cusp: number;
  sign: string;
}

export interface Aspect {
  planet1: string;
  planet2: string;
  aspectType: AspectType;
  angle: number;
  orb: number;
  isApplying?: boolean;
  exactDate?: Date;
}

export type AspectType = 
  | 'conjunction' 
  | 'opposition' 
  | 'square' 
  | 'trine' 
  | 'sextile' 
  | 'quincunx'
  | 'semisquare'
  | 'sesquiquadrate';

export type ZodiacSign = 
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' 
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio' 
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type PlanetName = 
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' 
  | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto'
  | 'North Node' | 'South Node' | 'Chiron';

export interface BirthChart {
  planets: Record<PlanetName, Planet>;
  houses: House[];
  aspects: Aspect[];
  ascendant: number;
  midheaven: number;
  chartDate: Date;
  location: ChartLocation;
}

export interface ChartLocation {
  latitude: number;
  longitude: number;
  timezone: string;
  city?: string;
  country?: string;
}

export interface TransitData {
  planet: PlanetName;
  degree: number;
  sign: ZodiacSign;
  speed: number;
  isRetrograde: boolean;
  date: Date;
}

export interface TransitAspect extends Aspect {
  transitingPlanet: PlanetName;
  natalPlanet: PlanetName;
  startDate: Date;
  exactDate: Date;
  endDate: Date;
}

export interface CompositeChart extends BirthChart {
  userAId: string;
  userBId: string;
  relationshipType?: string;
}

export interface RelationshipScores {
  overall: number;
  romantic: number;
  friendship: number;
  communication: number;
  values: number;
  [category: string]: number;
}

export interface SynastryAspect extends Aspect {
  personA: PlanetName;
  personB: PlanetName;
  significance: number;
}

// Ephemeris and calculation types
export interface EphemerisData {
  date: Date;
  planets: Record<PlanetName, Planet>;
}

export interface SwissEphemerisConfig {
  ephePath: string;
  iflag: number;
}

// Analysis and interpretation types
export interface ChartAnalysis {
  strengths: string[];
  challenges: string[];
  themes: string[];
  interpretation: string;
  generatedAt: Date;
}

export interface RelationshipAnalysis {
  compatibility: RelationshipScores;
  synastryAspects: SynastryAspect[];
  compositeChart: CompositeChart;
  interpretation: string;
  categories: {
    [category: string]: {
      interpretation: string;
      astrologyData: string;
      generatedAt: Date;
    };
  };
}