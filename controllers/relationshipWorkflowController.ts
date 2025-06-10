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
  updateRelationshipVectorizationStatus,
  updateRelationshipWorkflowRunningStatus
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

    // Mark workflow as running
    await updateRelationshipWorkflowRunningStatus(compositeChartId, true);
    
    // Start the workflow in the background
    executeProcessRelationshipAnalysis(compositeChartId, userA, userB).catch(error => {
      console.error('Error in relationship workflow processing:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        compositeChartId: compositeChartId
      });
      // Mark workflow as not running on error
      updateRelationshipWorkflowRunningStatus(compositeChartId, false, {
        'workflowStatus.error': error.message,
        'workflowStatus.errorAt': new Date()
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
    
    // DEBUG: Log the actual structure to understand what's happening
    if (analysisData) {
      console.log('DEBUG - analysisData structure:');
      console.log('  - has scores:', !!analysisData.scores);
      console.log('  - has analysis:', !!analysisData.analysis);
      console.log('  - has vectorizationStatus:', !!analysisData.vectorizationStatus);
      console.log('  - vectorizationStatus.categories:', analysisData.vectorizationStatus?.categories ? Object.keys(analysisData.vectorizationStatus.categories) : 'none');
      console.log('  - scores keys:', analysisData.scores ? Object.keys(analysisData.scores) : 'none');
      console.log('  - analysis keys:', analysisData.analysis ? Object.keys(analysisData.analysis) : 'none');
    }
    
    // Check if workflow is running
    const workflowStatus = analysisData?.workflowStatus || {};
    const isCurrentlyRunning = workflowStatus.isRunning === true;
    const lastStarted = workflowStatus.startedAt ? new Date(workflowStatus.startedAt) : null;
    const lastCompleted = workflowStatus.completedAt ? new Date(workflowStatus.completedAt) : null;
    
    // Check for stale running status (running for more than 30 minutes)
    if (isCurrentlyRunning && lastStarted) {
      const runningTime = Date.now() - lastStarted.getTime();
      const thirtyMinutes = 30 * 60 * 1000;
      
      if (runningTime > thirtyMinutes) {
        console.log(`⚠️ Relationship workflow has been marked as running for ${Math.round(runningTime / 60000)} minutes - may be stale`);
      }
    }
    
    // If no analysis data exists, relationship workflow hasn't started yet
    if (!analysisData) {
      return res.json({ 
        success: true, 
        workflowStatus: {
          status: 'not_started',
          progress: {
            completed: 0,
            total: 0,
            percentage: 0
          }
        },
        analysisData: null,
        jobs: {
          scores: { needsGeneration: true },
          categories: {}
        },
        workflowBreakdown: {
          needsGeneration: [],
          needsVectorization: [],
          completed: [],
          totalNeedsGeneration: 0,
          totalNeedsVectorization: 0,
          totalCompleted: 0
        },
        debug: {
          isWorkflowComplete: false,
          completedWithFailures: false,
          totalTasks: 0,
          completedTasks: 0,
          isCurrentlyRunning: false,
          workflowStatus: {}
        }
      });
    }
    
    const jobs = analyzeIncompleteRelationshipJobs(analysisData);
    console.log('Relationship jobs analysis for status check:', JSON.stringify(jobs, null, 2));
    
    // Calculate completion statistics and create detailed breakdown
    let totalTasks = 1; // scoring task
    let completedTasks = 0;
    
    // Track what specifically needs work
    const needsGeneration = [];
    const needsVectorization = [];
    const completed = [];
    
    // Count scoring
    if (!jobs.scores.needsGeneration) {
      completedTasks++;
      completed.push('scores-generation');
    } else {
      needsGeneration.push('scores');
    }
    
    // Count categories (generation + vectorization = 2 tasks each)
    Object.entries(jobs.categories).forEach(([category, job]: any) => {
      totalTasks += 2;
      if (!job.needsGeneration) {
        completedTasks++;
        completed.push(`category-${category}-generation`);
      } else {
        needsGeneration.push(`category-${category}`);
      }
      if (!job.needsVectorization) {
        completedTasks++;
        completed.push(`category-${category}-vectorization`);
      } else {
        needsVectorization.push(`category-${category}`);
      }
    });
    
    // Check if workflow completed with failures
    const vectorStatus = analysisData?.vectorizationStatus || {};
    const completedWithFailures = vectorStatus.completedWithFailures === true;
    const remainingTasks = vectorStatus.remainingTasks || 0;
    
    const isWorkflowComplete = completedTasks >= totalTasks;
    let status;
    
    // Determine status more intelligently
    if (isWorkflowComplete) {
      status = 'completed';
    } else if (completedWithFailures && remainingTasks > 0) {
      status = 'completed_with_failures';
    } else if (isCurrentlyRunning) {
      // Workflow is actively running
      status = 'running';
    } else if (completedTasks === 0) {
      // Nothing has been processed yet
      status = 'not_started';
    } else if (completedTasks > 0 && completedTasks < totalTasks) {
      // Has some completed work but not all - and no active process
      status = 'incomplete';
    } else {
      // Fallback
      status = 'unknown';
    }
    
    console.log(`🔗 RELATIONSHIP WORKFLOW Progress calculation: ${completedTasks}/${totalTasks} tasks completed`);
    console.log(`🔗 RELATIONSHIP WORKFLOW status: ${status}`);
    console.log(`🔗 RELATIONSHIP WORKFLOW compositeChartId: ${compositeChartId}`);
    
    res.json({ 
      success: true, 
      workflowStatus: {
        status,
        progress: {
          completed: completedTasks,
          total: totalTasks,
          percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        }
      },
      analysisData,
      jobs: jobs,
      workflowBreakdown: {
        needsGeneration: needsGeneration,
        needsVectorization: needsVectorization,
        completed: completed,
        totalNeedsGeneration: needsGeneration.length,
        totalNeedsVectorization: needsVectorization.length,
        totalCompleted: completed.length
      },
      debug: {
        isWorkflowComplete,
        completedWithFailures,
        remainingTasks,
        totalTasks,
        completedTasks,
        isCurrentlyRunning,
        workflowStatus: workflowStatus
      }
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
  const categoryAnalysis = existingData?.analysis || {};
  const vectorStatus = existingData?.vectorizationStatus?.categories || {};

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

    // Add metadata with proper structure for status checking
    relationshipScores.compositeChartId = compositeChartId;
    relationshipScores.userIdA = userA._id.toString();
    relationshipScores.userIdB = userB._id.toString();
    relationshipScores.createdAt = new Date();
    relationshipScores.lastUpdated = new Date();
    
    // Merge debug structure (don't overwrite existing debug.categories)
    if (!relationshipScores.debug) {
      relationshipScores.debug = {};
    }
    if (!relationshipScores.debug.inputSummary) {
      relationshipScores.debug.inputSummary = {};
    }
    
    // Add/update only the inputSummary part
    relationshipScores.debug.inputSummary.compositeChartId = compositeChartId;
    relationshipScores.debug.inputSummary.userAId = userA._id.toString();
    relationshipScores.debug.inputSummary.userBId = userB._id.toString();
    relationshipScores.debug.inputSummary.userAName = userA.firstName + ' ' + userA.lastName;
    relationshipScores.debug.inputSummary.userBName = userB.firstName + ' ' + userB.lastName;

    // Save relationship scores using upsert to ensure single document
    await updateRelationshipAnalysisVectorization(compositeChartId, relationshipScores);
    
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

        await retryOperation(async () => {
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
            [`analysis.${categoryValue}`]: categoryAnalysis[categoryValue],
            analysisGeneratedAt: new Date()
          });
          console.log(`Category ${categoryDisplayName} saved to database`);

          // Vectorize - but don't fail the whole task if this fails
          try {
            console.log(`🔸 Starting vectorization for ${categoryDisplayName}`);
            const richDescription = formattedAstrology ?
              `${categoryDisplayName} Analysis\n\n${formattedAstrology}` :
              `Relationship analysis for ${categoryValue}`;

            console.log(`🔸 Calling processTextSectionRelationship for ${categoryDisplayName}`);
            const records = await processTextSectionRelationship(
              interpretation,
              compositeChartId,
              richDescription,
              categoryValue,
              formattedAstrology
            );

            console.log(`🔸 processTextSectionRelationship returned ${records ? records.length : 0} records for ${categoryDisplayName}`);

            if (records && records.length > 0) {
              console.log(`🔸 Calling upsertRecords for ${categoryDisplayName} with ${records.length} records`);
              await upsertRecords(records, compositeChartId);
              console.log(`🔸 upsertRecords completed for ${categoryDisplayName}`);
              
              await updateRelationshipAnalysisVectorization(compositeChartId, {
                [`vectorizationStatus.categories.${categoryValue}`]: true
              });
              console.log(`✅ Category ${categoryDisplayName} vectorized successfully`);
            } else {
              console.warn(`⚠️ No records generated for category ${categoryDisplayName}`);
              await updateRelationshipAnalysisVectorization(compositeChartId, {
                [`vectorizationStatus.categories.${categoryValue}`]: false
              });
            }
          } catch (vectorError) {
            console.error(`❌ Failed to vectorize category ${categoryDisplayName}:`, vectorError.message);
            console.error(`❌ Full vectorization error for ${categoryDisplayName}:`, vectorError);
            await updateRelationshipAnalysisVectorization(compositeChartId, {
              [`vectorizationStatus.categories.${categoryValue}`]: false
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
        }, 2); // 2 retries for each category

      } catch (error) {
        console.error(`Failed to process category ${categoryKey} after retries:`, error.message);
        // Continue with other categories even if this one fails
      }
    });

    await Promise.all(categoryTasks);

    // AUTO-RETRY FAILED CATEGORIES
    const maxWorkflowRetries = 3;
    let workflowRetryAttempt = 0;
    
    while (workflowRetryAttempt < maxWorkflowRetries) {
      console.log(`\n=== CHECKING FOR FAILED RELATIONSHIP CATEGORIES (Workflow Retry ${workflowRetryAttempt + 1}/${maxWorkflowRetries}) ===`);
      
      const analysisData = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
      const jobs = analyzeIncompleteRelationshipJobs(analysisData);
      
      // Count remaining tasks that need work
      let remainingTasks = 0;
      const failedCategories = [];
      
      Object.entries(jobs.categories).forEach(([categoryValue, job]: any) => {
        if (job.needsGeneration || job.needsVectorization) {
          remainingTasks++;
          failedCategories.push({ categoryValue, job });
        }
      });
      
      if (remainingTasks === 0) {
        console.log('✅ All relationship categories completed successfully!');
        await updateRelationshipAnalysisVectorization(compositeChartId, {
          vectorizationCompletedAt: new Date(),
          isVectorized: true,
          'vectorizationStatus.isComplete': true
        });
        break;
      }
      
      console.log(`Found ${remainingTasks} remaining category tasks. Retrying failed categories...`);
      
      // Retry only the failed categories
      const retryCategoryTasks = failedCategories.map(({ categoryValue, job }) => async () => {
        const categoryDisplayName = categoryValue.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        
        console.log(`🔄 Retrying category: ${categoryDisplayName}`);
        
        try {
          await retryOperation(async () => {
            console.log(`Attempting ${categoryDisplayName} retry generation...`);
            
            // Refetch the latest relationship analysis data
            const latestAnalysisData = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
            
            const relationshipScoresForCategory = latestAnalysisData?.scores?.[categoryValue] || {};
            const relationshipAstrologyDetails = latestAnalysisData?.debug?.categories?.[categoryValue] || {};
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
              [`analysis.${categoryValue}`]: categoryAnalysis[categoryValue],
              analysisGeneratedAt: new Date()
            });
            console.log(`Category ${categoryDisplayName} saved to database (retry)`);

            // Vectorize - but don't fail the whole task if this fails
            try {
              console.log(`🔸 Starting vectorization for ${categoryDisplayName} (retry)`);
              const richDescription = formattedAstrology ?
                `${categoryDisplayName} Analysis\n\n${formattedAstrology}` :
                `Relationship analysis for ${categoryValue}`;

              console.log(`🔸 Calling processTextSectionRelationship for ${categoryDisplayName} (retry)`);
              const records = await processTextSectionRelationship(
                interpretation,
                compositeChartId,
                richDescription,
                categoryValue,
                formattedAstrology
              );

              console.log(`🔸 processTextSectionRelationship returned ${records ? records.length : 0} records for ${categoryDisplayName} (retry)`);

              if (records && records.length > 0) {
                console.log(`🔸 Calling upsertRecords for ${categoryDisplayName} with ${records.length} records (retry)`);
                await upsertRecords(records, compositeChartId);
                console.log(`🔸 upsertRecords completed for ${categoryDisplayName} (retry)`);
                
                await updateRelationshipAnalysisVectorization(compositeChartId, {
                  [`vectorizationStatus.categories.${categoryValue}`]: true
                });
                console.log(`✅ Category ${categoryDisplayName} vectorized successfully (retry)`);
              } else {
                console.warn(`⚠️ No records generated for category ${categoryDisplayName} (retry)`);
                await updateRelationshipAnalysisVectorization(compositeChartId, {
                  [`vectorizationStatus.categories.${categoryValue}`]: false
                });
              }
            } catch (vectorError) {
              console.error(`❌ Failed to vectorize category ${categoryDisplayName} (retry):`, vectorError.message);
              console.error(`❌ Full vectorization error for ${categoryDisplayName} (retry):`, vectorError);
              await updateRelationshipAnalysisVectorization(compositeChartId, {
                [`vectorizationStatus.categories.${categoryValue}`]: false
              });
            }

            console.log(`Category ${categoryDisplayName} retry completed`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }, 2); // 2 retries for each failed category
          
        } catch (error) {
          console.error(`Final failure for category ${categoryDisplayName} after workflow retries:`, error);
          // Mark category as failed
          await updateRelationshipAnalysisVectorization(compositeChartId, {
            [`analysis.${categoryValue}`]: {
              interpretation: `Error: ${error.message}`,
              astrologyData: "Failed to generate",
              generatedAt: new Date(),
              failed: true
            },
            [`vectorizationStatus.categories.${categoryValue}`]: false
          });
        }
      });
      
      // Execute all retry tasks in parallel
      console.log(`Executing ${retryCategoryTasks.length} category retry tasks...`);
      await Promise.all(retryCategoryTasks.map(fn => fn()));
      
      workflowRetryAttempt++;
      
      // Add delay between workflow retry attempts
      if (workflowRetryAttempt < maxWorkflowRetries) {
        console.log(`Waiting 5 seconds before next relationship workflow retry attempt...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Final status check after all retries
    const finalAnalysisData = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
    const finalJobs = analyzeIncompleteRelationshipJobs(finalAnalysisData);
    
    // Count remaining tasks
    let remainingTasks = 0;
    Object.values(finalJobs.categories).forEach((job: any) => {
      if (job.needsGeneration || job.needsVectorization) remainingTasks++;
    });
    
    if (remainingTasks === 0) {
      console.log('✅ All relationship categories completed successfully after retries!');
      await updateRelationshipAnalysisVectorization(compositeChartId, {
        vectorizationCompletedAt: new Date(),
        isVectorized: true,
        'vectorizationStatus.isComplete': true
      });
      // Mark workflow as not running - completed successfully
      await updateRelationshipWorkflowRunningStatus(compositeChartId, false, {
        'workflowStatus.completedSuccessfully': true
      });
    } else {
      console.log(`⚠️ Relationship workflow completed with ${remainingTasks} remaining tasks after ${maxWorkflowRetries} retry attempts`);
      await updateRelationshipAnalysisVectorization(compositeChartId, {
        vectorizationCompletedAt: new Date(),
        isVectorized: false,
        'vectorizationStatus.completedWithFailures': true,
        'vectorizationStatus.remainingTasks': remainingTasks,
        'vectorizationStatus.maxRetriesReached': true
      });
      // Mark workflow as not running - completed with failures
      await updateRelationshipWorkflowRunningStatus(compositeChartId, false, {
        'workflowStatus.completedWithFailures': true,
        'workflowStatus.remainingTasks': remainingTasks
      });
    }

    console.log(`All relationship analysis processing completed for ${compositeChartId}`);

  } catch (error) {
    console.error(`Relationship analysis processing failed for ${compositeChartId}`, {
      error: error.message,
      stack: error.stack
    });
    // Mark workflow as not running - failed with error
    await updateRelationshipWorkflowRunningStatus(compositeChartId, false, {
      'workflowStatus.error': error.message,
      'workflowStatus.errorAt': new Date()
    });
    throw error;
  }
}

