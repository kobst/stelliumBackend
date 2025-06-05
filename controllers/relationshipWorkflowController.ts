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

    // Initialize workflow status
    const workflowStatus = {
      compositeChartId,
      userIdA,
      userIdB,
      status: 'running',
      currentStep: 'generateScores',
      progress: {
        generateScores: { status: 'pending', startedAt: null, completedAt: null },
        generateAnalysis: { status: 'pending', startedAt: null, completedAt: null },
        vectorizeAnalysis: { status: 'pending', startedAt: null, completedAt: null }
      },
      error: null,
      startedAt: new Date(),
      completedAt: null
    };

    await createRelationshipWorkflowStatus(compositeChartId, workflowStatus);

    // Start the workflow in the background
    processRelationshipWorkflowStep(compositeChartId, userA, userB, 'generateScores').catch(error => {
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
      case 'generateScores':
        await executeGenerateScores(compositeChartId, userA, userB);
        break;
      case 'generateAnalysis':
        await executeGenerateAnalysis(compositeChartId, userA, userB);
        break;
      case 'vectorizeAnalysis':
        await executeVectorizeAnalysis(compositeChartId);
        break;
      default:
        throw new Error(`Unknown workflow step: ${step}`);
    }

    await updateRelationshipWorkflowStatus(compositeChartId, {
      [`progress.${step}.status`]: 'completed',
      [`progress.${step}.completedAt`]: new Date()
    });

    // Determine next step
    const nextStep = getNextRelationshipStep(step);
    if (nextStep) {
      // Continue to next step
      await processRelationshipWorkflowStep(compositeChartId, userA, userB, nextStep);
    } else {
      // Workflow complete
      await updateRelationshipWorkflowStatus(compositeChartId, {
        status: 'completed',
        currentStep: null,
        completedAt: new Date()
      });
    }

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

function getNextRelationshipStep(currentStep: string): string | null {
  const stepOrder = ['generateScores', 'generateAnalysis', 'vectorizeAnalysis'];
  const currentIndex = stepOrder.indexOf(currentStep);
  return currentIndex >= 0 && currentIndex < stepOrder.length - 1 
    ? stepOrder[currentIndex + 1] 
    : null;
}

async function executeGenerateScores(compositeChartId: string, userA: any, userB: any) {
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
  
  console.log(`Relationship scores saved for ${compositeChartId}`);
}

// Helper functions copied from dbDataController
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

async function executeGenerateAnalysis(compositeChartId: string, userA: any, userB: any) {
  console.log(`Generating relationship analysis for ${compositeChartId}`);
  
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

  const allGeneratedAnalyses = {};
  const promises = []; // Array to hold all the promises for LLM calls

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

    promises.push(
      getCompletionForRelationshipCategory(
        userAName, 
        userBName, 
        categoryDisplayName, 
        relationshipScores, 
        formattedAstrology, 
        contextA, 
        contextB
      )
      .then(interpretation => {
        console.log(`[LLM SUCCESS] Received analysis for ${categoryDisplayName}`);
        return { categoryValue, interpretation, formattedAstrology }; 
      })
      .catch(error => {
        console.error(`[LLM ERROR] Failed to get analysis for ${categoryDisplayName}:`, error.message);
        return { 
          categoryValue, 
          interpretation: `Error generating analysis for this category: ${error.message}`, 
          formattedAstrology
        };
      })
    );
  }

  console.log(`[executeGenerateAnalysis] All ${promises.length} LLM calls initiated. Waiting for all to complete...`);
  
  const results = await Promise.all(promises);

  console.log("[executeGenerateAnalysis] All LLM calls completed.");

  const categoryAnalysis = {};
  results.forEach(result => {
    if (result) { 
      categoryAnalysis[result.categoryValue] = {
        interpretation: result.interpretation,
        astrologyData: result.formattedAstrology,
        generatedAt: new Date()
      };
    }
  });

  // Update the relationship document with the analysis
  await updateRelationshipAnalysisVectorization(compositeChartId, {
    categoryAnalysis,
    analysisGeneratedAt: new Date()
  });
  
  console.log(`Relationship analysis saved for ${compositeChartId}`);
}


async function executeVectorizeAnalysis(compositeChartId: string) {
  console.log(`Vectorizing relationship analysis for ${compositeChartId}`);
  
  // Get the relationship analysis
  const relationshipData = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
  
  if (!relationshipData || !relationshipData.categoryAnalysis) {
    throw new Error('Relationship analysis not found');
  }

  const vectorizationStatus = {};

  // Process each category analysis
  for (const [category, data] of Object.entries(relationshipData.categoryAnalysis)) {
    if (data.interpretation) {
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
      } else {
        console.log(`No records generated for category: ${category}, skipping vectorization`);
      }
    }
  }

  // Update vectorization status
  await updateRelationshipAnalysisVectorization(compositeChartId, {
    vectorizationStatus,
    vectorizationCompletedAt: new Date(),
    isVectorized: true
  });
  
  console.log(`Relationship analysis vectorized for ${compositeChartId}`);
}