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
  saveRelationshipScoresAndDebug,
  saveCompositeChart,
  saveRelationshipAnalysis,
  fetchRelationshipAnalysisByCompositeId,
  updateRelationshipVectorizationStatus,
  updateRelationshipWorkflowRunningStatus
} from '../services/dbService.js';
import {
  getCompletionForRelationshipCategory,
  generateRelationshipPrompt,
  getRelationshipCategoryPanels
} from '../services/gptService.js';
import {
  scoreRelationshipCompatibility
} from '../utilities/relationshipScoring.js';
import {
  scoreRelationshipCompatibilityWithFlags
} from '../utilities/relationshipScoringWithFlags.js';
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
    return {
      synastryAspects: "No synastry aspects available for this category.",
      synastryHousePlacements: "No synastry house placements available for this category.",
      compositeAspects: "No composite aspects available for this category.",
      compositeHousePlacements: "No composite house placements available for this category."
    };
  }

  let synastryAspects = "";
  let synastryHousePlacements = "";
  let compositeAspects = "";
  let compositeHousePlacements = "";

  if (categoryDetails.synastry && categoryDetails.synastry.matchedAspects && categoryDetails.synastry.matchedAspects.length > 0) {
    synastryAspects = `Synastry Aspects (interactions between ${userAName}'s and ${userBName}'s charts):\n`;
    categoryDetails.synastry.matchedAspects.forEach(aspect => {
      synastryAspects += `  - ${aspect.description}\n`;
    });
  } else {
    synastryAspects = "No synastry aspects found for this category.";
  }

  if (categoryDetails.composite && categoryDetails.composite.matchedAspects && categoryDetails.composite.matchedAspects.length > 0) {
    compositeAspects = `Composite Chart Aspects (the relationship's own chart):\n`;
    categoryDetails.composite.matchedAspects.forEach(aspect => {
      compositeAspects += `  - ${aspect.description}\n`;
    });
  } else {
    compositeAspects = "No composite aspects found for this category.";
  }
  
  if (categoryDetails.synastryHousePlacements) {
    synastryHousePlacements = `Synastry House Placements:\n`;
    if (categoryDetails.synastryHousePlacements.AinB && categoryDetails.synastryHousePlacements.AinB.length > 0) {
      synastryHousePlacements += `  ${userAName}'s planets in ${userBName}'s houses:\n`;
      categoryDetails.synastryHousePlacements.AinB.forEach(p => {
        synastryHousePlacements += `    - ${p.description}\n`;
      });
    }
    if (categoryDetails.synastryHousePlacements.BinA && categoryDetails.synastryHousePlacements.BinA.length > 0) {
      synastryHousePlacements += `  ${userBName}'s planets in ${userAName}'s houses:\n`;
      categoryDetails.synastryHousePlacements.BinA.forEach(p => {
        synastryHousePlacements += `    - ${p.description}\n`;
      });
    }
    if (!synastryHousePlacements.includes(' - ')) {
      synastryHousePlacements += "No specific house placements found for this category.\n";
    }
  } else {
    synastryHousePlacements = "No synastry house placements found for this category.";
  }

  if (categoryDetails.compositeHousePlacements && categoryDetails.compositeHousePlacements.length > 0) {
    compositeHousePlacements = `Composite Chart House Placements:\n`;
    categoryDetails.compositeHousePlacements.forEach(p => {
      compositeHousePlacements += `  - ${p.description}\n`;
    });
  } else {
    compositeHousePlacements = "No composite house placements found for this category.";
  }

  return {
    synastryAspects: synastryAspects.trim(),
    synastryHousePlacements: synastryHousePlacements.trim(),
    compositeAspects: compositeAspects.trim(),
    compositeHousePlacements: compositeHousePlacements.trim()
  };
}

async function executeProcessRelationshipAnalysis(compositeChartId: string, userA: any, userB: any) {
  console.log(`Starting unified relationship analysis processing for ${compositeChartId}`);

  try {
    // First, check what's already been done
    const existingAnalysisData = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
    const jobs = analyzeIncompleteRelationshipJobs(existingAnalysisData);
    
    console.log('🔍 RELATIONSHIP WORKFLOW CONTINUATION: Checking what needs to be done...');
    console.log('Jobs analysis:', JSON.stringify(jobs, null, 2));

    // 1. GENERATE SCORES - ONLY IF NEEDED
    if (jobs.scores.needsGeneration) {
      console.log(`⚡ Generating relationship scores for ${compositeChartId} (generation needed)...`);
      
      // Generate synastry aspects
      const synastryAspects = await findSynastryAspects(userA.birthChart.planets, userB.birthChart.planets);
      
      // Generate composite chart
      const compositeChart = await generateCompositeChart(userA.birthChart, userB.birthChart);
      
      // Calculate relationship scores with flags
      console.log('🏁 Generating relationship scores with green/red flags...');
      const relationshipScores = await scoreRelationshipCompatibilityWithFlags(
        synastryAspects,
        compositeChart,
        userA,
        userB,
        compositeChartId,
        true, // debug mode
        true  // generate flags
      );
      console.log('🏁 Relationship scores with flags generated successfully');

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

      // Save relationship scores safely without overwriting existing analysis
      await saveRelationshipScoresAndDebug(compositeChartId, relationshipScores);
      
      console.log('Relationship scores generated and saved');
    } else {
      console.log('✅ Relationship scores already generated, skipping generation');
    }

    // 2. GET RELATIONSHIP ANALYSIS DATA
    const relationshipAnalysis = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
    if (!relationshipAnalysis || !relationshipAnalysis.debug || !relationshipAnalysis.debug.inputSummary) {
      throw new Error('Relationship analysis data not found or incomplete for the given compositeChartId.');
    }

    const { userAId, userBId, userAName, userBName } = relationshipAnalysis.debug.inputSummary;
    if (!userAId || !userBId || !userAName || !userBName) {
      throw new Error('User IDs or names missing in relationship analysis data.');
    }

    // Only fetch contexts if there are categories that need processing
    let contextsUserA = {};
    let contextsUserB = {};
    const needsContextFetching = Object.values(jobs.categories).some((job: any) => job.needsGeneration);
    
    if (needsContextFetching) {
      console.log(`[executeProcessRelationshipAnalysis] Fetching contexts for users (${Object.values(jobs.categories).filter((job: any) => job.needsGeneration).length} categories need generation)...`);
      [contextsUserA, contextsUserB] = await Promise.all([
        fetchAllContextsForUser(userAId, userAName, RELATIONSHIP_CATEGORIES),
        fetchAllContextsForUser(userBId, userBName, RELATIONSHIP_CATEGORIES)
      ]);
      console.log(`[executeProcessRelationshipAnalysis] Contexts fetched for ${userAName} and ${userBName}`);
    } else {
      console.log('✅ No categories need generation, skipping context fetching');
    }

    // 3. PROCESS EACH CATEGORY (generate → vectorize) - ONLY NEEDED ONES
    const categoryAnalysis = {} as any;
    const categoryTasks = Object.keys(RELATIONSHIP_CATEGORIES)
      .filter(categoryKey => {
        const categoryValue = RELATIONSHIP_CATEGORIES[categoryKey];
        return jobs.categories[categoryValue]?.needsGeneration || jobs.categories[categoryValue]?.needsVectorization;
      })
      .map(async categoryKey => {
        try {
          const categoryValue = RELATIONSHIP_CATEGORIES[categoryKey];
          const categoryDisplayName = categoryValue.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
          const needsGeneration = jobs.categories[categoryValue]?.needsGeneration;
          const needsVectorization = jobs.categories[categoryValue]?.needsVectorization;

          console.log(`📋 Processing category: ${categoryDisplayName} (generation: ${needsGeneration}, vectorization: ${needsVectorization})`);

          // Get existing analysis if it exists
          let existingAnalysis = relationshipAnalysis.analysis?.[categoryValue];

          if (needsGeneration) {
            console.log(`⚡ Processing category ${categoryDisplayName} (generation needed)...`);
            await retryOperation(async () => {
              const relationshipScoresForCategory = relationshipAnalysis.scores[categoryValue] || {};
              const relationshipAstrologyDetails = relationshipAnalysis.debug.categories[categoryValue] || {};
              const contextA = contextsUserA[categoryValue] || "No specific context found for User A in this category.";
              const contextB = contextsUserB[categoryValue] || "No specific context found for User B in this category.";
              const astrologicalDetails = formatAstrologicalDetailsForLLM(relationshipAstrologyDetails, userAName, userBName);

              // Get score synopsis data for inline context if available
              const scoreSynopsisData = relationshipAnalysis.debug?.categories?.[categoryValue]?.scoreAnalysis || null;
              
              // Generate panel analyses with enhanced context
              const panels = await getRelationshipCategoryPanels(
                  userAName,
                  userBName,
                  categoryDisplayName,
                  relationshipScoresForCategory,
                  astrologicalDetails,
                  contextA,
                  contextB,
                  categoryValue, // Pass category for context summarization
                  scoreSynopsisData // Pass synopsis data for inline context
              );

              // Create combined string for storage compatibility
              const combinedAstrology = [
                astrologicalDetails.synastryAspects,
                astrologicalDetails.synastryHousePlacements,
                astrologicalDetails.compositeAspects,
                astrologicalDetails.compositeHousePlacements
              ].filter(section => section && !section.startsWith('No ')).join('\n\n');

              categoryAnalysis[categoryValue] = {
                relevantPosition: combinedAstrology || "No specific astrological details parsed for this category.",
                panels,
                generatedAt: new Date()
              };

              // Save analysis immediately
              await updateRelationshipAnalysisVectorization(compositeChartId, {
                [`analysis.${categoryValue}`]: categoryAnalysis[categoryValue],
                analysisGeneratedAt: new Date()
              });
              console.log(`Category ${categoryDisplayName} generated and saved to database`);
            }, 2);
          } else {
            console.log(`✅ Category ${categoryDisplayName} already generated, skipping generation`);
            categoryAnalysis[categoryValue] = existingAnalysis;
          }

          if (needsVectorization && (categoryAnalysis[categoryValue] || existingAnalysis)) {
            console.log(`⚡ Processing category ${categoryDisplayName} vectorization...`);
            try {
              const analysisToVectorize = categoryAnalysis[categoryValue] || existingAnalysis;
              const relationshipAstrologyDetails = relationshipAnalysis.debug.categories[categoryValue] || {};
              const astrologicalDetails = formatAstrologicalDetailsForLLM(relationshipAstrologyDetails, userAName, userBName);
              
              console.log(`🔸 Starting vectorization for ${categoryDisplayName}`);
              // Create combined description from structured data
              const combinedAstrology = [
                astrologicalDetails.synastryAspects,
                astrologicalDetails.synastryHousePlacements,
                astrologicalDetails.compositeAspects,
                astrologicalDetails.compositeHousePlacements
              ].filter(section => section && !section.startsWith('No ')).join('\n\n');
              
              const richDescription = combinedAstrology ?
                `${categoryDisplayName} Analysis\n\n${combinedAstrology}` :
                `Relationship analysis for ${categoryValue}`;

              console.log(`🔸 Calling processTextSectionRelationship for ${categoryDisplayName} (all panels)`);
              
              // Vectorize all three panels
              const panels = analysisToVectorize.panels || {};
              const allRecords = [];
              
              // 1. Synastry Panel
              if (panels.synastry) {
                console.log(`🔸 Vectorizing synastry for ${categoryDisplayName}`);
                const synastryRecords = await processTextSectionRelationship(
                  panels.synastry,
                  compositeChartId,
                  `${categoryDisplayName} - Synastry Analysis\n\n${astrologicalDetails.synastryAspects}\n\n${astrologicalDetails.synastryHousePlacements}`,
                  `${categoryValue}_synastry`,
                  `${astrologicalDetails.synastryAspects}\n\n${astrologicalDetails.synastryHousePlacements}`
                );
                if (synastryRecords) allRecords.push(...synastryRecords);
              }
              
              // 2. Composite Chart Analysis
              if (panels.composite) {
                console.log(`🔸 Vectorizing composite for ${categoryDisplayName}`);
                const compositeRecords = await processTextSectionRelationship(
                  panels.composite,
                  compositeChartId,
                  `${categoryDisplayName} - Composite Chart Analysis\n\n${astrologicalDetails.compositeAspects}\n\n${astrologicalDetails.compositeHousePlacements}`,
                  `${categoryValue}_composite`,
                  `${astrologicalDetails.compositeAspects}\n\n${astrologicalDetails.compositeHousePlacements}`
                );
                if (compositeRecords) allRecords.push(...compositeRecords);
              }
              
              // 3. Full Analysis
              if (panels.fullAnalysis) {
                console.log(`🔸 Vectorizing fullAnalysis for ${categoryDisplayName}`);
                const fullRecords = await processTextSectionRelationship(
                  panels.fullAnalysis,
                  compositeChartId,
                  richDescription,
                  `${categoryValue}_full`,
                  combinedAstrology
                );
                if (fullRecords) allRecords.push(...fullRecords);
              }

              console.log(`🔸 processTextSectionRelationship returned ${allRecords.length} total records for ${categoryDisplayName}`);

              if (allRecords.length > 0) {
                console.log(`🔸 Calling upsertRecords for ${categoryDisplayName} with ${allRecords.length} records`);
                await upsertRecords(allRecords, compositeChartId);
                console.log(`🔸 upsertRecords completed for ${categoryDisplayName}`);
                
                await updateRelationshipAnalysisVectorization(compositeChartId, {
                  [`vectorizationStatus.categories.${categoryValue}`]: true
                });
                console.log(`✅ Category ${categoryDisplayName} vectorized successfully (all panels)`);
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
          } else if (categoryAnalysis[categoryValue] || existingAnalysis) {
            console.log(`✅ Category ${categoryDisplayName} already vectorized, skipping vectorization`);
          }

          console.log(`Category ${categoryDisplayName} processing completed`);

          // Add delay and memory management
          await new Promise(resolve => setTimeout(resolve, 2000));
          const memUsage = process.memoryUsage();
          console.log(`Memory usage: RSS=${Math.round(memUsage.rss/1024/1024)}MB, Heap=${Math.round(memUsage.heapUsed/1024/1024)}MB`);
          if (memUsage.heapUsed > 1024 * 1024 * 1024 && global.gc) {
            console.log('High memory usage detected, running garbage collection');
            global.gc();
          }

      } catch (error) {
        console.error(`Failed to process category ${categoryKey} after retries:`, error.message);
        // Continue with other categories even if this one fails
      }
    });

    if (categoryTasks.length > 0) {
      console.log(`Executing ${categoryTasks.length} category tasks...`);
      await Promise.all(categoryTasks);
      console.log('All category tasks completed');
    } else {
      console.log('✅ All relationship categories already completed, skipping category processing');
    }

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
            const astrologicalDetails = formatAstrologicalDetailsForLLM(relationshipAstrologyDetails, userAName, userBName);

            // Get score synopsis data for inline context if available
            const scoreSynopsisData = relationshipAnalysis.debug?.categories?.[categoryValue]?.scoreAnalysis || null;
            
            // Generate panel analyses with enhanced context
            const panels = await getRelationshipCategoryPanels(
                userAName,
                userBName,
                categoryDisplayName,
                relationshipScoresForCategory,
                astrologicalDetails,
                contextA,
                contextB,
                categoryValue, // Pass category for context summarization
                scoreSynopsisData // Pass synopsis data for inline context
            );

            // Create combined string for storage compatibility
            const combinedAstrology = [
              astrologicalDetails.synastryAspects,
              astrologicalDetails.synastryHousePlacements,
              astrologicalDetails.compositeAspects,
              astrologicalDetails.compositeHousePlacements
            ].filter(section => section && !section.startsWith('No ')).join('\n\n');

            categoryAnalysis[categoryValue] = {
              relevantPosition: combinedAstrology || "No specific astrological details parsed for this category.",
              panels,
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
              const richDescription = combinedAstrology ?
                `${categoryDisplayName} Analysis\n\n${combinedAstrology}` :
                `Relationship analysis for ${categoryValue}`;

              console.log(`🔸 Calling processTextSectionRelationship for ${categoryDisplayName} (retry - all panels)`);
              
              // Vectorize all three panels
              const allRecords = [];
              
              // 1. Synastry Panel
              if (panels.synastry) {
                console.log(`🔸 Vectorizing synastry for ${categoryDisplayName} (retry)`);
                const synastryRecords = await processTextSectionRelationship(
                  panels.synastry,
                  compositeChartId,
                  `${categoryDisplayName} - Synastry Analysis\n\n${astrologicalDetails.synastryAspects}\n\n${astrologicalDetails.synastryHousePlacements}`,
                  `${categoryValue}_synastry`,
                  `${astrologicalDetails.synastryAspects}\n\n${astrologicalDetails.synastryHousePlacements}`
                );
                if (synastryRecords) allRecords.push(...synastryRecords);
              }
              
              // 2. Composite Chart Analysis
              if (panels.composite) {
                console.log(`🔸 Vectorizing composite for ${categoryDisplayName} (retry)`);
                const compositeRecords = await processTextSectionRelationship(
                  panels.composite,
                  compositeChartId,
                  `${categoryDisplayName} - Composite Chart Analysis\n\n${astrologicalDetails.compositeAspects}\n\n${astrologicalDetails.compositeHousePlacements}`,
                  `${categoryValue}_composite`,
                  `${astrologicalDetails.compositeAspects}\n\n${astrologicalDetails.compositeHousePlacements}`
                );
                if (compositeRecords) allRecords.push(...compositeRecords);
              }
              
              // 3. Full Analysis
              if (panels.fullAnalysis) {
                console.log(`🔸 Vectorizing fullAnalysis for ${categoryDisplayName} (retry)`);
                const fullRecords = await processTextSectionRelationship(
                  panels.fullAnalysis,
                  compositeChartId,
                  richDescription,
                  `${categoryValue}_full`,
                  combinedAstrology
                );
                if (fullRecords) allRecords.push(...fullRecords);
              }

              console.log(`🔸 processTextSectionRelationship returned ${allRecords.length} total records for ${categoryDisplayName} (retry)`);

              if (allRecords.length > 0) {
                console.log(`🔸 Calling upsertRecords for ${categoryDisplayName} with ${allRecords.length} records (retry)`);
                await upsertRecords(allRecords, compositeChartId);
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
              relevantPosition: "Failed to generate",
              panels: {
                synastry: `Error: ${error.message}`,
                composite: "",
                fullAnalysis: ""
              },
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

