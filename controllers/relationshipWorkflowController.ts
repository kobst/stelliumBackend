// @ts-nocheck

// Retry utility function
async function retryOperation<T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3, 
  baseDelayMs: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error(`Operation failed after ${maxRetries} attempts`);
        throw error; // Re-throw the last error
      }
      
      // Calculate exponential backoff delay
      const delayMs = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);
      console.log(`Waiting ${delayMs}ms before retry ${attempt + 1}...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error('Retry operation completed without result'); // Should never reach here
}

import {
  getUserSingle,
  saveRelationshipScoring,
  getRelationshipAnalysisByCompositeId,
  updateRelationshipAnalysisVectorization,
  saveCompositeChart,
  saveRelationshipAnalysis,
  fetchRelationshipAnalysisByCompositeId,
  updateRelationshipVectorizationStatus
} from '../services/dbService.js';
import {
  getCompletionForRelationshipCategory,
  generateRelationshipPrompt
} from '../services/gptService.js';
import {
  scoreRelationshipCompatibility
} from '../utilities/relationshipScoring.js';
import {
  generatePromptForRelationshipCategory
} from '../utilities/relationshipAnalysis.js';
import {
  getRelationshipCategoryContextForUser
} from '../services/vectorize.js';
import {
  RELATIONSHIP_CATEGORIES
} from '../utilities/relationshipScoringConstants.js';
import {
  findSynastryAspects,
  generateCompositeChart
} from '../services/ephemerisDataService.js';
import {
  upsertRecords,
  processTextSectionRelationship
} from '../services/vectorize.js';


export async function startRelationshipWorkflow(req, res) {
  try {
    const { userIdA, userIdB, compositeChartId } = req.body;
    
    if (!userIdA || !userIdB || !compositeChartId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: userIdA, userIdB, or compositeChartId' 
      });
    }

    // Check if both users exist
    const userA = await getUserSingle(userIdA);
    const userB = await getUserSingle(userIdB);
    
    if (!userA || !userB) {
      return res.status(404).json({ 
        success: false, 
        error: 'One or both users not found' 
      });
    }

    if (!userA.birthChart || !userB.birthChart) {
      return res.status(400).json({ 
        success: false, 
        error: 'One or both users do not have birth charts' 
      });
    }

    // Start the workflow in the background
    executeProcessRelationshipAnalysis(compositeChartId, userA, userB).catch(error => {
      console.error('Error in relationship workflow processing:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        compositeChartId: compositeChartId
      });
    });

    res.json({ 
      success: true, 
      message: 'Relationship workflow started',
      workflowId: compositeChartId
    });

  } catch (error) {
    console.error('Error starting relationship workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getRelationshipWorkflowStatusHandler(req, res) {
  try {
    const { compositeChartId } = req.body;
    
    if (!compositeChartId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing compositeChartId' 
      });
    }

    // Get current analysis data and determine progress from it
    console.log('Getting relationship analysis for compositeChartId:', compositeChartId);
    const analysisData = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
    console.log('Retrieved relationship analysisData:', analysisData ? 'found' : 'null/empty');
    
    // If no analysis data exists, relationship workflow hasn't started yet
    if (!analysisData) {
      return res.json({ 
        success: true, 
        status: {
          status: 'not_started',
          progress: {
            completed: 0,
            total: 0,
            percentage: 0
          }
        },
        analysisData: null
      });
    }
    
    const jobs = analyzeIncompleteRelationshipJobs(analysisData);
    console.log('Relationship jobs analysis for status check:', JSON.stringify(jobs, null, 2));
    
    // Calculate completion statistics
    // 1 scoring task + 7 categories (generation + vectorization = 2 tasks each)
    let totalTasks = 1; // scoring
    let completedTasks = 0;
    
    // Count scoring
    if (!jobs.scores.needsGeneration) completedTasks++;
    
    // Count categories (generation + vectorization = 2 tasks each)
    Object.values(jobs.categories).forEach((job: any) => {
      totalTasks += 2;
      if (!job.needsGeneration) completedTasks++;
      if (!job.needsVectorization) completedTasks++;
    });
    
    const isComplete = completedTasks >= totalTasks;
    const status = isComplete ? 'completed' : 'running';
    
    console.log(`Relationship progress calculation: ${completedTasks}/${totalTasks} tasks completed`);
    console.log(`Relationship workflow status: ${status}`);
    
    res.json({ 
      success: true, 
      status: {
        status,
        progress: {
          completed: completedTasks,
          total: totalTasks,
          percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        }
      },
      analysisData
    });

  } catch (error) {
    console.error('Error getting relationship workflow status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}



// Helper function to determine what needs to be processed for relationships
function analyzeIncompleteRelationshipJobs(existingData: any) {
  const jobs = {
    scores: { needsGeneration: true },
    categories: {}
  };

  // Set up defaults for relationship analysis and vector status
  const scores = existingData?.scores || {};
  const categoryAnalysis = existingData?.categoryAnalysis || {};
  const vectorStatus = existingData?.vectorizationStatus?.categoryAnalysis || {};

  // Check scores
  if (Object.keys(scores).length > 0) {
    jobs.scores.needsGeneration = false;
  }

  // Check categories
  Object.keys(RELATIONSHIP_CATEGORIES).forEach(categoryKey => {
    const categoryValue = RELATIONSHIP_CATEGORIES[categoryKey];
    jobs.categories[categoryValue] = {
      needsGeneration: !categoryAnalysis[categoryValue],
      needsVectorization: vectorStatus[categoryValue] !== true
    };
  });

  return jobs;
}

// Helper function to fetch all contexts for a user
async function fetchAllContextsForUser(userId, userName, relationshipCategories) {
  const userContexts = {};
  console.log(`[fetchAllContextsForUser] START for ${userName} (ID: ${userId})`);
  for (const categoryKey of Object.keys(relationshipCategories)) {
    const categoryValue = relationshipCategories[categoryKey];
    console.log(`  [fetchAllContextsForUser] ${userName} - Fetching context for category: ${categoryValue}`);
    try {
      console.log(`    [fetchAllContextsForUser] ${userName} - BEFORE getRelationshipCategoryContext for ${categoryValue}`);
      const contextArray = await getRelationshipCategoryContextForUser(userId, categoryValue);
      console.log(`    [fetchAllContextsForUser] ${userName} - AFTER getRelationshipCategoryContext for ${categoryValue}. Found ${contextArray.length} items.`);
      userContexts[categoryValue] = contextArray.map(item => item.text).join("\n\n---\n\n");
      if (!userContexts[categoryValue]) {
        userContexts[categoryValue] = "No specific context found from individual analysis for this category.";
      }
    } catch (error) {
      console.error(`    [fetchAllContextsForUser] ${userName} - ERROR fetching context for ${categoryValue}:`, error.message);
      userContexts[categoryValue] = `Error retrieving context for ${categoryValue}.`;
    }
  }
  console.log(`[fetchAllContextsForUser] END for ${userName} (ID: ${userId}). Returning contexts.`);
  return userContexts;
}

function formatAstrologicalDetailsForLLM(categoryDetails, userAName, userBName) {
  if (!categoryDetails || Object.keys(categoryDetails).length === 0) {
    return "No specific astrological details available for this category in the relationship data.";
  }
  let detailsString = "";

  if (categoryDetails.synastry && categoryDetails.synastry.matchedAspects && categoryDetails.synastry.matchedAspects.length > 0) {
    detailsString += `Synastry Aspects (interactions between ${userAName}'s and ${userBName}'s charts):\n`;
    categoryDetails.synastry.matchedAspects.forEach(aspect => {
      detailsString += `  - Aspect: "${aspect.aspect}" (Score impact: ${aspect.score})\n`;
    });
    detailsString += "\n";
  }

  if (categoryDetails.composite && categoryDetails.composite.matchedAspects && categoryDetails.composite.matchedAspects.length > 0) {
    detailsString += `Composite Chart Aspects (the relationship's own chart):\n`;
    categoryDetails.composite.matchedAspects.forEach(aspect => {
      detailsString += `  - Aspect: "${aspect.aspect}" (Score impact: ${aspect.score}, Type: ${aspect.scoreType})\n     Description: ${aspect.description}\n`;
    });
    detailsString += "\n";
  }
  
  if (categoryDetails.synastryHousePlacements) {
    detailsString += `Synastry House Placements:\n`;
    if (categoryDetails.synastryHousePlacements.AinB && categoryDetails.synastryHousePlacements.AinB.length > 0) {
      detailsString += `  ${userAName}'s planets in ${userBName}'s houses:\n`;
      categoryDetails.synastryHousePlacements.AinB.forEach(p => {
        detailsString += `    - ${p.description} (Points: ${p.points}, Reason: ${p.reason})\n`;
      });
    }
    if (categoryDetails.synastryHousePlacements.BinA && categoryDetails.synastryHousePlacements.BinA.length > 0) {
      detailsString += `  ${userBName}'s planets in ${userAName}'s houses:\n`;
      categoryDetails.synastryHousePlacements.BinA.forEach(p => {
        detailsString += `    - ${p.description} (Points: ${p.points}, Reason: ${p.reason})\n`;
      });
    }
    detailsString += "\n";
  }

  if (categoryDetails.compositeHousePlacements && categoryDetails.compositeHousePlacements.length > 0) {
    detailsString += `Composite Chart House Placements:\n`;
    categoryDetails.compositeHousePlacements.forEach(p => {
      detailsString += `  - ${p.description} (Points: ${p.points}, Reason: ${p.reason}, Type: ${p.type})\n`;
    });
    detailsString += "\n";
  }
  return detailsString || "No specific astrological details parsed for this category.";
}

async function executeProcessRelationshipAnalysis(compositeChartId: string, userA: any, userB: any) {
  console.log(`Starting unified relationship analysis processing for ${compositeChartId}`);

  try {
    // 1. GENERATE SCORES FIRST
    console.log(`Generating relationship scores for ${compositeChartId}`);
    
    // Generate synastry aspects
    const synastryAspects = await findSynastryAspects(userA.birthChart.planets, userB.birthChart.planets);
    
    // Generate composite chart
    const compositeChart = await generateCompositeChart(userA.birthChart, userB.birthChart);
    
    // Calculate relationship scores
    const relationshipScores = scoreRelationshipCompatibility(
      synastryAspects,
      compositeChart,
      userA,
      userB,
      compositeChartId,
      true // debug mode
    );

    // Add metadata
    relationshipScores.compositeChartId = compositeChartId;
    relationshipScores.userIdA = userA._id.toString();
    relationshipScores.userIdB = userB._id.toString();
    relationshipScores.createdAt = new Date();
    relationshipScores.lastUpdated = new Date();

    // Save relationship scores
    await saveRelationshipScoring(relationshipScores);
    
    console.log('Relationship scores completed');

    // 2. GET RELATIONSHIP ANALYSIS DATA
    const relationshipAnalysis = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
    if (!relationshipAnalysis || !relationshipAnalysis.debug || !relationshipAnalysis.debug.inputSummary) {
      throw new Error('Relationship analysis data not found or incomplete for the given compositeChartId.');
    }

    const { userAId, userBId, userAName, userBName } = relationshipAnalysis.debug.inputSummary;
    if (!userAId || !userBId || !userAName || !userBName) {
      throw new Error('User IDs or names missing in relationship analysis data.');
    }

    console.log(`[executeProcessRelationshipAnalysis] Fetching contexts for users.`);
    const [contextsUserA, contextsUserB] = await Promise.all([
      fetchAllContextsForUser(userAId, userAName, RELATIONSHIP_CATEGORIES),
      fetchAllContextsForUser(userBId, userBName, RELATIONSHIP_CATEGORIES)
    ]);
    console.log(`[executeProcessRelationshipAnalysis] Contexts fetched for ${userAName} and ${userBName}`);

    // 3. PROCESS EACH CATEGORY (generate → vectorize) IN PARALLEL
    const categoryAnalysis = {} as any;
    const categoryTasks = Object.keys(RELATIONSHIP_CATEGORIES).map(async categoryKey => {
      try {
        const categoryValue = RELATIONSHIP_CATEGORIES[categoryKey];
        const categoryDisplayName = categoryValue.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

        console.log(`Processing category: ${categoryDisplayName}`);

        const relationshipScoresForCategory = relationshipAnalysis.scores[categoryValue] || {};
        const relationshipAstrologyDetails = relationshipAnalysis.debug.categories[categoryValue] || {};
        const contextA = contextsUserA[categoryValue] || "No specific context found for User A in this category.";
        const contextB = contextsUserB[categoryValue] || "No specific context found for User B in this category.";
        const formattedAstrology = formatAstrologicalDetailsForLLM(relationshipAstrologyDetails, userAName, userBName);

        // Generate interpretation
        const interpretation = await getCompletionForRelationshipCategory(
            userAName,
            userBName,
            categoryDisplayName,
            relationshipScoresForCategory,
            formattedAstrology,
            contextA,
            contextB
        );

        categoryAnalysis[categoryValue] = {
          interpretation: interpretation,
          astrologyData: formattedAstrology,
          generatedAt: new Date()
        };

        // Save analysis immediately
        await updateRelationshipAnalysisVectorization(compositeChartId, {
          [`categoryAnalysis.${categoryValue}`]: categoryAnalysis[categoryValue],
          analysisGeneratedAt: new Date()
        });
        console.log(`Category ${categoryDisplayName} saved to database`);

        // Vectorize - but don't fail the whole task if this fails
        try {
          const richDescription = formattedAstrology ?
            `${categoryDisplayName} Analysis\n\n${formattedAstrology}` :
            `Relationship analysis for ${categoryValue}`;

          const records = await processTextSectionRelationship(
            interpretation,
            compositeChartId,
            richDescription,
            categoryValue,
            formattedAstrology
          );

          if (records && records.length > 0) {
            await upsertRecords(records, compositeChartId);
            await updateRelationshipAnalysisVectorization(compositeChartId, {
              [`vectorizationStatus.categoryAnalysis.${categoryValue}`]: true
            });
            console.log(`Category ${categoryDisplayName} vectorized successfully`);
          } else {
            console.warn(`No records generated for category ${categoryDisplayName}`);
            await updateRelationshipAnalysisVectorization(compositeChartId, {
              [`vectorizationStatus.categoryAnalysis.${categoryValue}`]: false
            });
          }
        } catch (vectorError) {
          console.error(`Failed to vectorize category ${categoryDisplayName}:`, vectorError.message);
          await updateRelationshipAnalysisVectorization(compositeChartId, {
            [`vectorizationStatus.categoryAnalysis.${categoryValue}`]: false
          });
        }

        console.log(`Category ${categoryDisplayName} completed`);

        // Add delay and memory management
        await new Promise(resolve => setTimeout(resolve, 2000));
        const memUsage = process.memoryUsage();
        console.log(`Memory usage: RSS=${Math.round(memUsage.rss/1024/1024)}MB, Heap=${Math.round(memUsage.heapUsed/1024/1024)}MB`);
        if (memUsage.heapUsed > 1024 * 1024 * 1024 && global.gc) {
          console.log('High memory usage detected, running garbage collection');
          global.gc();
        }

      } catch (error) {
        console.error(`Failed to process category ${categoryKey}:`, error.message);
        // Continue with other categories even if this one fails
      }
    });

    await Promise.all(categoryTasks);

    // Final updates
    await updateRelationshipAnalysisVectorization(compositeChartId, {
      vectorizationCompletedAt: new Date(),
      isVectorized: true
    });

    console.log(`All relationship analysis processing completed for ${compositeChartId}`);

  } catch (error) {
    console.error(`Relationship analysis processing failed for ${compositeChartId}`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

