// Enhanced relationship scoring that includes score analysis generation
import { scoreRelationshipCompatibility } from './relationshipScoring.js';
import { 
  extractCategoryScores, 
  createCategoryScoreAnalysis, 
  getFlagSummary,
  // Legacy imports for backward compatibility  
  extractCategoryFlags,
  createCategoryFlags
} from './relationshipFlags.js';
import { 
  generateScoreAnalysis,
  // Legacy import for backward compatibility
  generateFlagAnalysis 
} from '../services/gptService.js';
import { 
  DEFAULT_SCORE_THRESHOLDS, 
  ScoreThresholds, 
  CategoryScoreAnalysis,
  // Legacy imports for backward compatibility
  DEFAULT_FLAG_THRESHOLDS, 
  FlagThresholds, 
  CategoryFlags 
} from '../types/relationshipFlags.js';

/**
 * Enhanced version of scoreRelationshipCompatibility that includes score analysis generation
 * @param synastryAspects - Array of synastry aspects
 * @param compositeChart - Composite chart object
 * @param userA - First person's user information
 * @param userB - Second person's user information
 * @param compositeChartId - Composite chart ID
 * @param debug - Whether to generate debug logs
 * @param generateFlags - Whether to generate score analysis (default: true)
 * @param thresholds - Score analysis thresholds (optional)
 * @returns Enhanced scores object with score analysis for each category
 */
export async function scoreRelationshipCompatibilityWithFlags(
  synastryAspects: any,
  compositeChart: any,
  userA: any,
  userB: any,
  compositeChartId: string,
  debug: boolean = true,
  generateFlags: boolean = true,
  thresholds: ScoreThresholds = DEFAULT_SCORE_THRESHOLDS
): Promise<any> {
  console.log("scoreRelationshipCompatibilityWithFlags: Starting enhanced scoring with score analysis");
  
  // First, get the regular scores using the existing function
  const relationshipScores: any = scoreRelationshipCompatibility(
    synastryAspects,
    compositeChart,
    userA,
    userB,
    compositeChartId,
    debug
  );
  
  if (!generateFlags) {
    console.log("Score analysis generation disabled, returning standard scores");
    return relationshipScores;
  }
  
  console.log("scoreRelationshipCompatibilityWithFlags: Adding score analysis to categories");
  
  // Extract user names for GPT analysis
  const userAName = `${userA.firstName} ${userA.lastName}`;
  const userBName = `${userB.firstName} ${userB.lastName}`;
  
  try {
    // Process each category to add score analysis
    const categoriesWithScoreAnalysis = {};
    const scoreAnalysisPromises: Promise<{categoryKey: string, categoryScoreAnalysis: CategoryScoreAnalysis}>[] = [];
    
    if (!relationshipScores.debug || !relationshipScores.debug.categories) {
      throw new Error('Relationship scores missing debug data');
    }
    
    Object.keys(relationshipScores.debug.categories).forEach(categoryKey => {
      const categoryData = relationshipScores.debug.categories[categoryKey];
      const categoryDisplayName = categoryKey.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
      
      console.log(`Processing score analysis for category: ${categoryDisplayName}`);
      
      // Extract scores from this category's data
      const scoreResult = extractCategoryScores(categoryData, thresholds);
      
      console.log(getFlagSummary(scoreResult, categoryDisplayName));
      
      // Get the normalized score for this category
      const categoryScore = relationshipScores.scores?.[categoryKey]?.overallNormalized;
      
      // Create a promise for score analysis generation
      const scoreAnalysisPromise = generateScoreAnalysis(
        categoryDisplayName,
        scoreResult,  // Pass the full extraction result
        userAName,
        userBName,
        categoryScore
      ).then(scoreAnalysis => {
        // Create the complete category score analysis object
        const categoryScoreAnalysis = createCategoryScoreAnalysis(categoryData, scoreAnalysis, thresholds);
        return { categoryKey, categoryScoreAnalysis };
      }).catch(error => {
        console.error(`Failed to generate score analysis for ${categoryDisplayName}:`, error);
        // Return a fallback category score analysis object
        const fallbackAnalysis = scoreResult.allPositiveAspects.length === 0 && scoreResult.allNegativeAspects.length === 0
          ? "No significant aspects found in this area."
          : "Score analysis temporarily unavailable.";
        const categoryScoreAnalysis = createCategoryScoreAnalysis(categoryData, fallbackAnalysis, thresholds);
        return { categoryKey, categoryScoreAnalysis };
      });
      
      scoreAnalysisPromises.push(scoreAnalysisPromise);
    });
    
    // Wait for all score analyses to complete
    console.log(`Generating score analyses for ${scoreAnalysisPromises.length} categories...`);
    const scoreResults = await Promise.all(scoreAnalysisPromises);
    
    // Add score analysis to the debug categories structure
    scoreResults.forEach(({ categoryKey, categoryScoreAnalysis }: {categoryKey: string, categoryScoreAnalysis: CategoryScoreAnalysis}) => {
      if (!relationshipScores.debug.categories[categoryKey]) {
        relationshipScores.debug.categories[categoryKey] = {};
      }
      relationshipScores.debug.categories[categoryKey].scoreAnalysis = categoryScoreAnalysis;
    });
    
    console.log("scoreRelationshipCompatibilityWithFlags: Score analysis generation completed");
    
    // Add score analysis generation metadata
    relationshipScores.debug.scoreGeneration = {
      scoresAnalyzed: true,
      scoresAnalyzedAt: new Date(),
      thresholds: thresholds,
      totalCategories: scoreResults.length,
      scoreSummary: scoreResults.reduce((summary: any, { categoryKey, categoryScoreAnalysis }: {categoryKey: string, categoryScoreAnalysis: CategoryScoreAnalysis}) => {
        const categoryDisplayName = categoryKey.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
        summary[categoryKey] = {
          greenFlags: categoryScoreAnalysis.greenFlags.length,
          redFlags: categoryScoreAnalysis.redFlags.length,
          hasAnalysis: !!categoryScoreAnalysis.scoreAnalysis
        };
        return summary;
      }, {} as any)
    };
    
    return relationshipScores;
    
  } catch (error) {
    console.error("Error in score analysis generation process:", error);
    
    // Add error information but still return the scores
    relationshipScores.debug.scoreGeneration = {
      scoresAnalyzed: false,
      error: (error as Error).message,
      scoresAnalyzedAt: new Date()
    };
    
    return relationshipScores;
  }
}

/**
 * Utility function to extract flags from an existing relationship analysis document
 * @param relationshipAnalysis - Existing relationship analysis document
 * @param thresholds - Flag score thresholds (optional)
 * @returns Object with flags for each category
 */
export function extractFlagsFromExistingAnalysis(
  relationshipAnalysis: any,
  thresholds: FlagThresholds = DEFAULT_FLAG_THRESHOLDS
): Record<string, { greenFlags: any[], redFlags: any[], totalFlags: number }> {
  const categoryFlags: Record<string, { greenFlags: any[], redFlags: any[], totalFlags: number }> = {};
  
  if (relationshipAnalysis.debug?.categories) {
    Object.keys(relationshipAnalysis.debug.categories).forEach(categoryKey => {
      const categoryData = relationshipAnalysis.debug.categories[categoryKey];
      const flagResult = extractCategoryFlags(categoryData, thresholds);
      categoryFlags[categoryKey] = flagResult;
    });
  }
  
  return categoryFlags;
}

/**
 * Generates flag analysis for existing relationship data without re-scoring
 * @param relationshipAnalysis - Existing relationship analysis document
 * @param userAName - First person's name
 * @param userBName - Second person's name
 * @param thresholds - Flag score thresholds (optional)
 * @returns Updated relationship analysis with flags
 */
export async function addFlagsToExistingAnalysis(
  relationshipAnalysis: any,
  userAName: string,
  userBName: string,
  thresholds: FlagThresholds = DEFAULT_FLAG_THRESHOLDS
): Promise<any> {
  console.log("Adding flags to existing relationship analysis");
  
  if (!relationshipAnalysis.debug?.categories) {
    console.warn("No debug categories found in relationship analysis");
    return relationshipAnalysis;
  }
  
  const flagGenerationPromises: Promise<{categoryKey: string, categoryFlags: CategoryFlags}>[] = [];
  
  Object.keys(relationshipAnalysis.debug.categories).forEach(categoryKey => {
    const categoryData = relationshipAnalysis.debug.categories[categoryKey];
    const categoryDisplayName = categoryKey.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
    
    console.log(`Generating flags for existing category: ${categoryDisplayName}`);
    
    const flagResult = extractCategoryFlags(categoryData, thresholds);
    console.log(getFlagSummary(flagResult, categoryDisplayName));
    
    const flagAnalysisPromise = generateFlagAnalysis(
      categoryDisplayName,
      flagResult,  // Pass the full extraction result
      userAName,
      userBName
    ).then(flagAnalysis => {
      const categoryFlags = createCategoryFlags(categoryData, flagAnalysis, thresholds);
      return { categoryKey, categoryFlags };
    }).catch(error => {
      console.error(`Failed to generate flag analysis for ${categoryDisplayName}:`, error);
      const fallbackAnalysis = flagResult.allPositiveAspects.length === 0 && flagResult.allNegativeAspects.length === 0
        ? "No significant aspects found in this area."
        : "Aspect analysis temporarily unavailable.";
      const categoryFlags = createCategoryFlags(categoryData, fallbackAnalysis, thresholds);
      return { categoryKey, categoryFlags };
    });
    
    flagGenerationPromises.push(flagAnalysisPromise);
  });
  
  try {
    const flagResults = await Promise.all(flagGenerationPromises);
    
    // Add flags to each category
    flagResults.forEach(({ categoryKey, categoryFlags }) => {
      relationshipAnalysis.debug.categories[categoryKey].flags = categoryFlags;
    });
    
    // Add flag generation metadata
    relationshipAnalysis.debug.flagGeneration = {
      flagsGenerated: true,
      flagsGeneratedAt: new Date(),
      thresholds: thresholds,
      totalCategories: flagResults.length
    };
    
    console.log("Successfully added flags to existing relationship analysis");
    return relationshipAnalysis;
    
  } catch (error) {
    console.error("Error adding flags to existing analysis:", error);
    
    relationshipAnalysis.debug.flagGeneration = {
      flagsGenerated: false,
      error: error.message,
      flagsGeneratedAt: new Date()
    };
    
    return relationshipAnalysis;
  }
}