// Score Analysis interfaces for relationship analysis
// Analyzes the highest and lowest scoring aspects and placements

// Unified relationship scored item interface with consistent structure
export interface RelationshipScoredItem {
  score: number;
  source: 'synastry' | 'composite' | 'synastryHousePlacement' | 'compositeHousePlacement';
  type: 'aspect' | 'housePlacement';
  reason: string;
  description: string;
  
  // Optional aspect-specific fields (present when type === 'aspect')
  aspect?: string;
  orb?: number;
  pairKey?: string;
  planet1Sign?: string;
  planet2Sign?: string;
  planet1House?: number;
  planet2House?: number;
  
  // Optional house placement fields (present when type === 'housePlacement')
  planet?: string;
  house?: number;
  direction?: string;
}

// Legacy type aliases for backward compatibility
export type RelationshipFlag = RelationshipScoredItem;
export type SynastryAspectFlag = RelationshipScoredItem;
export type HousePlacementFlag = RelationshipScoredItem;

// Category score analysis structure
export interface CategoryScoreAnalysis {
  greenFlags: RelationshipScoredItem[]; // High-scoring positive aspects (score >= 12)
  redFlags: RelationshipScoredItem[];   // Low-scoring negative aspects (score <= -10)
  scoreAnalysis: string; // GPT-generated analysis of the top scoring aspects
  scoresAnalyzedAt: Date;
}

// Complete category structure with score analysis (extends your existing structure)
export interface CategoryWithScoreAnalysis {
  // Your existing category structure
  synastry: {
    matchedAspects: Array<{
      aspect: string;
      orb: number;
      score: number;
      pairKey: string;
      planet1Sign: string;
      planet2Sign: string;
      planet1House: number;
      planet2House: number;
    }>;
  };
  composite: {
    matchedAspects: Array<{
      aspect: string;
      orb: number;
      score: number;
      scoreType: 'positive' | 'negative';
      rule: string;
      description: string;
    }>;
  };
  synastryHousePlacements: {
    AinB: Array<{
      planet: string;
      house: number;
      points: number;
      reason: string;
      direction: 'A->B';
      description: string;
    }>;
    BinA: Array<{
      planet: string;
      house: number;
      points: number;
      reason: string;
      direction: 'B->A';
      description: string;
    }>;
  };
  compositeHousePlacements: Array<{
    planet: string;
    house: number;
    points: number;
    reason: string;
    type: 'positive' | 'negative' | 'default';
    description: string;
  }>;
  // NEW: Score analysis field
  scoreAnalysis: CategoryScoreAnalysis;
}

// Updated relationship analysis document interface with score analysis
export interface RelationshipAnalysisDocumentWithScoreAnalysis {
  userAId: string;
  userBId: string;
  compositeChartId: string;
  scores: Record<string, number>;
  // Your existing categories structure + score analysis
  categories: Record<string, CategoryWithScoreAnalysis>;
  analysis?: {
    [category: string]: {
      interpretation: string;
      astrologyData: string;
      generatedAt: Date;
    };
  };
  vectorizationStatus?: {
    completed: boolean;
    categories: Record<string, boolean>;
  };
  debug?: {
    inputSummary: any;
    categories: Record<string, any>;
    [key: string]: any;
  };
  createdAt: Date;
  lastUpdated: Date;
}

// Score analysis thresholds configuration (can be modified easily)
export interface ScoreThresholds {
  greenFlagMinScore: number; // Default: 12 - minimum score for high positive aspects
  redFlagMaxScore: number;   // Default: -10 - maximum score for challenging aspects
}

export const DEFAULT_SCORE_THRESHOLDS: ScoreThresholds = {
  greenFlagMinScore: 12,
  redFlagMaxScore: -10
};

// Legacy type alias for backward compatibility
export type FlagThresholds = ScoreThresholds;
export const DEFAULT_FLAG_THRESHOLDS = DEFAULT_SCORE_THRESHOLDS;

// Utility type for score extraction results
export interface ScoreExtractionResult {
  greenFlags: RelationshipScoredItem[]; // High-scoring positive aspects
  redFlags: RelationshipScoredItem[];   // Low-scoring challenging aspects
  totalFlags: number;
  greenFlagCount: number;
  redFlagCount: number;
}

// Legacy type alias for backward compatibility
export type FlagExtractionResult = ScoreExtractionResult;

// Legacy interface alias for backward compatibility
export type CategoryFlags = CategoryScoreAnalysis;