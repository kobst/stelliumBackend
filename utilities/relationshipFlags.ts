// Utility functions for extracting and analyzing top-scoring aspects from relationship analysis data
import { 
  RelationshipScoredItem, 
  CategoryScoreAnalysis, 
  ScoreExtractionResult, 
  DEFAULT_SCORE_THRESHOLDS,
  ScoreThresholds,
  // Legacy imports for backward compatibility
  RelationshipFlag,
  FlagExtractionResult,
  DEFAULT_FLAG_THRESHOLDS,
  FlagThresholds
} from '../types/relationshipFlags.js';

/**
 * Enhanced extraction that sorts ALL aspects/positions by absolute score value
 * and identifies high and low scoring items for analysis
 * @param categoryData - The category data from relationship analysis
 * @param thresholds - Score analysis thresholds (optional, uses defaults)
 * @returns Object with sorted positive/negative aspects and identified high/low scoring items
 */
export function extractCategoryScores(
  categoryData: any, 
  thresholds: ScoreThresholds = DEFAULT_SCORE_THRESHOLDS
): ScoreExtractionResult & { allPositiveAspects: RelationshipScoredItem[], allNegativeAspects: RelationshipScoredItem[] } {
  const allAspects: RelationshipScoredItem[] = [];

  // Extract ALL synastry aspects
  if (categoryData.synastry?.matchedAspects) {
    categoryData.synastry.matchedAspects.forEach((aspect: any) => {
      const scoredItem: RelationshipScoredItem = {
        score: aspect.score,
        source: 'synastry',
        type: 'aspect',
        reason: aspect.score > 0 
          ? `Positive synastry aspect (${aspect.score} points)`
          : `Challenging synastry aspect (${aspect.score} points)`,
        description: aspect.description,
        // Standardized aspect-specific fields
        aspect: aspect.aspect,
        orb: aspect.orb,
        // Additional data for reference
        planet1Sign: aspect.planet1Sign,
        planet2Sign: aspect.planet2Sign,
        planet1House: aspect.planet1House,
        planet2House: aspect.planet2House,
        pairKey: aspect.pairKey
      };
      allAspects.push(scoredItem);
    });
  }

  // Skip composite aspects - not used for score analysis
  // (Composite aspects are ignored per user request)

  // Extract ALL synastry house placements (AinB and BinA)
  if (categoryData.synastryHousePlacements) {
    // Process AinB placements
    if (categoryData.synastryHousePlacements.AinB) {
      categoryData.synastryHousePlacements.AinB.forEach((placement: any) => {
        const scoredItem: RelationshipScoredItem = {
          score: placement.points,
          source: 'synastryHousePlacement',
          type: 'housePlacement',
          reason: placement.points > 0
            ? `Positive synastry house placement (${placement.points} points): ${placement.reason}`
            : `Challenging synastry house placement (${placement.points} points): ${placement.reason}`,
          description: placement.description,
          // Standardized house placement fields
          planet: placement.planet,
          house: placement.house,
          direction: placement.direction
        };
        allAspects.push(scoredItem);
      });
    }

    // Process BinA placements
    if (categoryData.synastryHousePlacements.BinA) {
      categoryData.synastryHousePlacements.BinA.forEach((placement: any) => {
        const scoredItem: RelationshipScoredItem = {
          score: placement.points,
          source: 'synastryHousePlacement',
          type: 'housePlacement',
          reason: placement.points > 0
            ? `Positive synastry house placement (${placement.points} points): ${placement.reason}`
            : `Challenging synastry house placement (${placement.points} points): ${placement.reason}`,
          description: placement.description,
          // Standardized house placement fields
          planet: placement.planet,
          house: placement.house,
          direction: placement.direction
        };
        allAspects.push(scoredItem);
      });
    }
  }

  // Skip composite house placements - not used for score analysis
  // (Composite house placements are ignored per user request)

  // Sort all aspects by absolute score value (highest to lowest)
  allAspects.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

  // Separate into positive and negative, maintaining sort order
  const allPositiveAspects = allAspects.filter(aspect => aspect.score > 0);
  const allNegativeAspects = allAspects.filter(aspect => aspect.score < 0);

  // Identify high-scoring and low-scoring items based on thresholds
  const greenFlags = allPositiveAspects.filter(aspect => aspect.score >= thresholds.greenFlagMinScore);
  const redFlags = allNegativeAspects.filter(aspect => aspect.score <= thresholds.redFlagMaxScore);

  return {
    greenFlags,
    redFlags,
    totalFlags: greenFlags.length + redFlags.length,
    greenFlagCount: greenFlags.length,
    redFlagCount: redFlags.length,
    allPositiveAspects,
    allNegativeAspects
  };
}

/**
 * Generates a summary of top-scoring aspects for GPT analysis
 * Includes the highest scoring aspects regardless of threshold status
 * @param result - Score extraction result with all aspects
 * @param maxAspects - Maximum number of aspects to include (default: 3)
 * @returns Formatted string for GPT prompt
 */
export function formatAspectsForGPT(
  result: ScoreExtractionResult & { allPositiveAspects: RelationshipScoredItem[], allNegativeAspects: RelationshipScoredItem[] },
  maxAspects: number = 3
): { positiveSummary: string, negativeSummary: string } {
  let positiveSummary = "";
  let negativeSummary = "";

  // Format top positive aspects (regardless of threshold status)
  if (result.allPositiveAspects.length > 0) {
    const topPositive = result.allPositiveAspects.slice(0, maxAspects);
    positiveSummary = "STRONGEST POSITIVE FACTORS:\n";
    topPositive.forEach(item => {
      const isHighScoring = result.greenFlags.includes(item);
      const emoji = isHighScoring ? "💚 " : "";
      const scoreIndicator = isHighScoring ? " [HIGH SCORE]" : "";
      
      if (item.type === 'aspect') {
        positiveSummary += `- ${emoji}${item.description} (Score: ${item.score}, Orb: ${item.orb}°)${scoreIndicator}\n`;
      } else if (item.type === 'housePlacement') {
        positiveSummary += `- ${emoji}${item.description} (${item.score} points)${scoreIndicator}\n`;
      }
    });
  }

  // Format top negative aspects (regardless of threshold status)
  if (result.allNegativeAspects.length > 0) {
    const topNegative = result.allNegativeAspects.slice(0, maxAspects);
    negativeSummary = "MAIN CHALLENGES:\n";
    topNegative.forEach(item => {
      const isLowScoring = result.redFlags.includes(item);
      const emoji = isLowScoring ? "🔴 " : "";
      const scoreIndicator = isLowScoring ? " [LOW SCORE]" : "";
      
      if (item.type === 'aspect') {
        negativeSummary += `- ${emoji}${item.description} (Score: ${item.score}, Orb: ${item.orb}°)${scoreIndicator}\n`;
      } else if (item.type === 'housePlacement') {
        negativeSummary += `- ${emoji}${item.description} (${item.score} points)${scoreIndicator}\n`;
      }
    });
  }

  return { positiveSummary: positiveSummary.trim(), negativeSummary: negativeSummary.trim() };
}

/**
 * Creates a complete CategoryScoreAnalysis object with GPT analysis
 * @param categoryData - The category data from relationship analysis
 * @param scoreAnalysis - GPT-generated analysis of the top scoring aspects
 * @param thresholds - Score analysis thresholds (optional)
 * @returns Complete CategoryScoreAnalysis object
 */
export function createCategoryScoreAnalysis(
  categoryData: any,
  scoreAnalysis: string,
  thresholds: ScoreThresholds = DEFAULT_SCORE_THRESHOLDS
): CategoryScoreAnalysis {
  const scoreResult = extractCategoryScores(categoryData, thresholds);
  
  return {
    greenFlags: scoreResult.greenFlags,
    redFlags: scoreResult.redFlags,
    scoreAnalysis,
    scoresAnalyzedAt: new Date()
  };
}

// Legacy function name for backward compatibility
export function createCategoryFlags(
  categoryData: any,
  flagAnalysis: string,
  thresholds: ScoreThresholds = DEFAULT_SCORE_THRESHOLDS
): CategoryScoreAnalysis {
  return createCategoryScoreAnalysis(categoryData, flagAnalysis, thresholds);
}

// Legacy function name for backward compatibility
export function extractCategoryFlags(
  categoryData: any, 
  thresholds: ScoreThresholds = DEFAULT_SCORE_THRESHOLDS
): ScoreExtractionResult & { allPositiveAspects: RelationshipScoredItem[], allNegativeAspects: RelationshipScoredItem[] } {
  return extractCategoryScores(categoryData, thresholds);
}

/**
 * Validates that category data has the expected structure
 * @param categoryData - Data to validate
 * @returns True if valid, false otherwise
 */
export function validateCategoryData(categoryData: any): boolean {
  if (!categoryData || typeof categoryData !== 'object') {
    return false;
  }

  // Check for expected top-level properties
  const expectedProperties = ['synastry', 'composite', 'synastryHousePlacements', 'compositeHousePlacements'];
  const hasAtLeastOneProperty = expectedProperties.some(prop => categoryData.hasOwnProperty(prop));
  
  return hasAtLeastOneProperty;
}

/**
 * Gets a human-readable summary of flag extraction results
 * @param result - Flag extraction result
 * @param categoryName - Name of the category for context
 * @returns Summary string
 */
export function getFlagSummary(result: FlagExtractionResult & { allPositiveAspects?: RelationshipFlag[], allNegativeAspects?: RelationshipFlag[] }, categoryName: string): string {
  const parts = [`${categoryName}:`];
  
  // Add aspect counts
  if (result.allPositiveAspects && result.allNegativeAspects) {
    parts.push(`${result.allPositiveAspects.length} positive aspects`);
    parts.push(`${result.allNegativeAspects.length} negative aspects`);
  }
  
  // Add flag counts if any
  if (result.greenFlagCount > 0) {
    parts.push(`${result.greenFlagCount} green flags`);
  }
  if (result.redFlagCount > 0) {
    parts.push(`${result.redFlagCount} red flags`);
  }
  
  return parts.join(' ');
}