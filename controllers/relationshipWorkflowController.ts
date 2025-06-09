// @ts-nocheck
import {
  getUserSingle,
  saveRelationshipScoring,
  getRelationshipAnalysisByCompositeId,
  updateRelationshipAnalysisVectorization,
  createRelationshipWorkflowStatus,
  getRelationshipWorkflowStatus,
  updateRelationshipWorkflowStatus,
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

const RELATIONSHIP_CATEGORIES = [
  'OVERALL_ATTRACTION_CHEMISTRY',
  'EMOTIONAL_SECURITY_CONNECTION',
  'COMMUNICATION_AND_MENTAL_CONNECTION',
  'SEX_AND_INTIMACY',
  'COMMITMENT_LONG_TERM_POTENTIAL',
  'PRACTICAL_GROWTH_SHARED_GOALS',
  'KARMIC_LESSONS_GROWTH'
];

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

    // Check if workflow is already running
    const existingWorkflow = await getRelationshipWorkflowStatus(compositeChartId);
    if (existingWorkflow && existingWorkflow.status === 'running') {
      return res.json({
        success: true,
        message: 'Relationship workflow already running',
        workflowId: compositeChartId,
        status: existingWorkflow
      });
    }

    // Initialize workflow status with unified step
  const workflowStatus = {
      compositeChartId,
      userIdA,
      userIdB,
      status: 'running',
      currentStep: 'processRelationshipAnalysis',
      progress: {
        processRelationshipAnalysis: { status: 'pending', startedAt: null, completedAt: null, completed: 0, total: 0 }
      },
      error: null,
      startedAt: new Date(),
      completedAt: null
    };

    await createRelationshipWorkflowStatus(compositeChartId, workflowStatus);

    // Start the workflow in the background
    processRelationshipWorkflowStep(compositeChartId, userA, userB, 'processRelationshipAnalysis').catch(error => {
      console.error('Error in relationship workflow processing:', error);
      updateRelationshipWorkflowStatus(compositeChartId, {
        status: 'error',
        error: error.message,
        completedAt: new Date()
      });
    });

    res.json({ 
      success: true, 
      message: 'Relationship workflow started',
      workflowId: compositeChartId,
      status: workflowStatus
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

    const status = await getRelationshipWorkflowStatus(compositeChartId);
    
    if (!status) {
      return res.status(404).json({ 
        success: false, 
        error: 'Relationship workflow not found' 
      });
    }

    // Also return the current analysis data if available
    const analysisData = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
    
    res.json({ 
      success: true, 
      status,
      analysisData
    });

  } catch (error) {
    console.error('Error getting relationship workflow status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}


async function processRelationshipWorkflowStep(compositeChartId: string, userA: any, userB: any, step: string) {
  try {
    await updateRelationshipWorkflowStatus(compositeChartId, {
      currentStep: step,
      [`progress.${step}.status`]: 'running',
      [`progress.${step}.startedAt`]: new Date()
    });

    switch (step) {
      case 'processRelationshipAnalysis':
        await executeProcessRelationshipAnalysis(compositeChartId, userA, userB);
        break;
      default:
        throw new Error(`Unknown workflow step: ${step}`);
    }

    await updateRelationshipWorkflowStatus(compositeChartId, {
      [`progress.${step}.status`]: 'completed',
      [`progress.${step}.completedAt`]: new Date()
    });

    // Workflow complete (only one step now)
    await updateRelationshipWorkflowStatus(compositeChartId, {
      status: 'completed',
      currentStep: null,
      completedAt: new Date()
    });

  } catch (error) {
    console.error(`Error in relationship workflow step ${step}:`, error);
    await updateRelationshipWorkflowStatus(compositeChartId, {
      status: 'error',
      error: error.message,
      [`progress.${step}.status`]: 'error',
      completedAt: new Date()
    });
    throw error;
  }
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

  // Calculate total tasks: 1 scoring + 7 categories (generate + vectorize each)
  const totalCategories = Object.keys(RELATIONSHIP_CATEGORIES).length;
  const totalTasks = 1 + totalCategories; // scoring + categories
  let completed = 0;

  await updateRelationshipWorkflowStatus(compositeChartId, {
    'progress.processRelationshipAnalysis.total': totalTasks,
    'progress.processRelationshipAnalysis.completed': 0
  });

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
    
    completed++;
    await updateRelationshipWorkflowStatus(compositeChartId, { 'progress.processRelationshipAnalysis.completed': completed });
    console.log(`Relationship scores completed (${completed}/${totalTasks})`);

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

        completed++;
        await updateRelationshipWorkflowStatus(compositeChartId, { 'progress.processRelationshipAnalysis.completed': completed });
        console.log(`Category ${categoryDisplayName} completed (${completed}/${totalTasks})`);

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
        completed++;
        await updateRelationshipWorkflowStatus(compositeChartId, { 'progress.processRelationshipAnalysis.completed': completed });
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
      stack: error.stack,
      completed: completed,
      total: totalTasks
    });
    throw error;
  }
}

// OLD FUNCTIONS BELOW - TO BE REMOVED
/*
async function executeGenerateScores(compositeChartId: string, userA: any, userB: any) {
  console.log(`Generating relationship scores for ${compositeChartId}`);

  await updateRelationshipWorkflowStatus(compositeChartId, {
    'progress.generateScores.total': 1,
    'progress.generateScores.completed': 0
  });
  
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

  await updateRelationshipWorkflowStatus(compositeChartId, { 'progress.generateScores.completed': 1 });
  
  console.log(`Relationship scores saved for ${compositeChartId}`);
}

async function executeGenerateAnalysis(compositeChartId: string, userA: any, userB: any) {
  console.log(`Generating relationship analysis for ${compositeChartId}`);

  const totalCategories = Object.keys(RELATIONSHIP_CATEGORIES).length;
  let completed = 0;
  await updateRelationshipWorkflowStatus(compositeChartId, {
    'progress.generateAnalysis.total': totalCategories,
    'progress.generateAnalysis.completed': 0
  });
  
  // 1. Fetch Relationship Analysis Document (following original flow)
  const relationshipAnalysis = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
  if (!relationshipAnalysis || !relationshipAnalysis.debug || !relationshipAnalysis.debug.inputSummary) {
    throw new Error('Relationship analysis data not found or incomplete for the given compositeChartId.');
  }
  console.log(`Fetched relationship analysis for compositeChartId: ${compositeChartId}`);

  const { userAId, userBId, userAName, userBName } = relationshipAnalysis.debug.inputSummary;
  if (!userAId || !userBId || !userAName || !userBName) {
    throw new Error('User IDs or names missing in relationship analysis data.');
  }

  console.log(`[executeGenerateAnalysis] About to call Promise.all for user contexts.`);
  const [contextsUserA, contextsUserB] = await Promise.all([
    fetchAllContextsForUser(userAId, userAName, RELATIONSHIP_CATEGORIES),
    fetchAllContextsForUser(userBId, userBName, RELATIONSHIP_CATEGORIES)
  ]);
  console.log(`[executeGenerateAnalysis] SUCCESSFULLY Fetched contexts for ${userAName} and ${userBName}`);

  const categoryAnalysis = {};

  console.log("[executeGenerateAnalysis] Preparing to generate prompts and initiate LLM calls.");

  for (const categoryKey of Object.keys(RELATIONSHIP_CATEGORIES)) {
    const categoryValue = RELATIONSHIP_CATEGORIES[categoryKey];
    const categoryDisplayName = categoryValue.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

    const relationshipScores = relationshipAnalysis.scores[categoryValue] || {};
    const relationshipAstrologyDetails = relationshipAnalysis.debug.categories[categoryValue] || {};
    const contextA = contextsUserA[categoryValue] || "No specific context found for User A in this category.";
    const contextB = contextsUserB[categoryValue] || "No specific context found for User B in this category.";
    const formattedAstrology = formatAstrologicalDetailsForLLM(relationshipAstrologyDetails, userAName, userBName);
    
    const promptString = await generateRelationshipPrompt(
      userAName,
      userBName,
      categoryDisplayName,
      relationshipScores,
      formattedAstrology,
      contextA,
      contextB
    );

    console.log(`--- PROMPT FOR CATEGORY: ${categoryDisplayName} ---`);

    const interpretation = await getCompletionForRelationshipCategory(
        userAName,
        userBName,
        categoryDisplayName,
        relationshipScores,
        formattedAstrology,
        contextA,
        contextB
    );

    categoryAnalysis[categoryValue] = {
      interpretation: interpretation,
      astrologyData: formattedAstrology,
      generatedAt: new Date()
    };

    await updateRelationshipAnalysisVectorization(compositeChartId, {
      [`categoryAnalysis.${categoryValue}`]: categoryAnalysis[categoryValue],
      analysisGeneratedAt: new Date()
    });

    completed++;
    await updateRelationshipWorkflowStatus(compositeChartId, { 'progress.generateAnalysis.completed': completed });
  }

  await updateRelationshipWorkflowStatus(compositeChartId, { 'progress.generateAnalysis.completed': totalCategories });
  
  console.log(`Relationship analysis saved for ${compositeChartId}`);
}


async function executeVectorizeAnalysis(compositeChartId: string) {
  console.log(`Starting vectorization for relationship analysis: ${compositeChartId}`);
  
  try {
    // Get the relationship analysis
    const relationshipData = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
    
    if (!relationshipData || !relationshipData.categoryAnalysis) {
      throw new Error('Relationship analysis not found');
    }

  const vectorizationStatus = {};
  const totalCategories = Object.keys(relationshipData.categoryAnalysis).length;
  let completed = 0;
  await updateRelationshipWorkflowStatus(compositeChartId, {
    'progress.vectorizeAnalysis.total': totalCategories,
    'progress.vectorizeAnalysis.completed': 0
  });

  // Process each category analysis
  for (const [category, data] of Object.entries(relationshipData.categoryAnalysis)) {
    if (data.interpretation) {
      try {
        console.log(`Vectorizing category: ${category}, content length: ${data.interpretation?.length || 0}`);
        
        if (!data.interpretation || typeof data.interpretation !== 'string' || data.interpretation.trim().length === 0) {
          console.log(`Skipping empty interpretation for category: ${category}`);
          continue;
        }
        
        // Create rich description using the stored astrology data
        const categoryDisplayName = category.split('_')
          .map(word => word.charAt(0) + word.slice(1).toLowerCase())
          .join(' ');
        
        const richDescription = data.astrologyData ? 
          `${categoryDisplayName} Analysis\n\n${data.astrologyData}` :
          `Relationship analysis for ${category}`;
        
        // Process and vectorize the text
        const records = await processTextSectionRelationship(
          data.interpretation,
          compositeChartId,
          richDescription,
          category,
          data.astrologyData
        );
        
        // Upsert records to vector database only if we have records
        if (records && records.length > 0) {
          await upsertRecords(records, compositeChartId);
          vectorizationStatus[`categoryAnalysis.${category}`] = true;
          completed++;
          await updateRelationshipWorkflowStatus(compositeChartId, { 'progress.vectorizeAnalysis.completed': completed });
          console.log(`Category ${category} vectorization completed`);
        } else {
          console.log(`No records generated for category: ${category}, skipping vectorization`);
        }
        
        // Add delay between operations to avoid rate limiting
        console.log('Waiting 2 seconds before next vectorization step...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Log memory usage and force cleanup if needed
        const memUsage = process.memoryUsage();
        console.log(`Memory usage: RSS=${Math.round(memUsage.rss/1024/1024)}MB, Heap=${Math.round(memUsage.heapUsed/1024/1024)}MB`);
        
        // Force garbage collection if memory usage is high
        if (memUsage.heapUsed > 1024 * 1024 * 1024 && global.gc) { // > 1GB heap
          console.log('High memory usage detected, running garbage collection');
          global.gc();
        }
        
      } catch (error) {
        console.error(`Category ${category} vectorization failed:`, error.message);
        throw new Error(`Failed to vectorize category ${category}: ${error.message}`);
      }
    }
  }

    // Update vectorization status
    await updateRelationshipAnalysisVectorization(compositeChartId, {
      vectorizationStatus,
      vectorizationCompletedAt: new Date(),
      isVectorized: true
    });

    await updateRelationshipWorkflowStatus(compositeChartId, { 'progress.vectorizeAnalysis.completed': totalCategories });
    
    console.log(`Relationship analysis vectorization completed successfully for ${compositeChartId}`);
  } catch (error) {
    console.error(`Relationship vectorization failed for ${compositeChartId}`, {
      error: error.message,
      stack: error.stack
    });
    
    // Update workflow status to show vectorization error
    await updateRelationshipWorkflowStatus(compositeChartId, {
      'progress.vectorizeAnalysis.status': 'error',
      'progress.vectorizeAnalysis.error': error.message
    });
    
    throw error;
  }
}
*/