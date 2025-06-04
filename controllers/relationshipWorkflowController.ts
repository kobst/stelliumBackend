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
  getCompletionForRelationshipCategory
} from '../services/gptService.js';
import {
  scoreRelationshipCompatibility
} from '../utilities/relationshipScoring.js';
import {
  generatePromptForRelationshipCategory
} from '../utilities/relationshipAnalysis.js';
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

async function executeGenerateAnalysis(compositeChartId: string, userA: any, userB: any) {
  console.log(`Generating relationship analysis for ${compositeChartId}`);
  
  // Get the relationship scores
  const relationshipData = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
  
  if (!relationshipData) {
    throw new Error('Relationship scores not found');
  }

  const categoryAnalysis = {};

  // Generate analysis for each category
  for (const category of RELATIONSHIP_CATEGORIES) {
    console.log(`Generating analysis for category: ${category}`);
    
    // Format category display name
    const categoryDisplayName = category.split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
    
    // Get scores for this category
    const categoryScores = relationshipData.normalizedScores?.[category] || {};
    const scores = {
      overall: categoryScores.overallNormalized,
      synastry: categoryScores.synastry?.normalized,
      composite: categoryScores.composite?.normalized,
      synastryHousePlacements: categoryScores.synastryHousePlacements?.normalized,
      compositeHousePlacements: categoryScores.compositeHousePlacements?.normalized
    };
    
    // Format astrology data for this category
    const categoryData = relationshipData.categories?.[category] || {};
    const formattedAstrology = formatAstrologyForCategory(categoryData);
    
    // Get user snippets/context
    const contextA = userA.snippet || `${userA.firstName} - Birth chart overview not available`;
    const contextB = userB.snippet || `${userB.firstName} - Birth chart overview not available`;
    
    // Get AI completion with correct parameters
    const analysis = await getCompletionForRelationshipCategory(
      userA.firstName,
      userB.firstName,
      categoryDisplayName,
      scores,
      formattedAstrology,
      contextA,
      contextB
    );
    
    categoryAnalysis[category] = {
      interpretation: analysis,
      generatedAt: new Date()
    };
  }

  // Update the relationship document with the analysis
  await updateRelationshipAnalysisVectorization(compositeChartId, {
    categoryAnalysis,
    analysisGeneratedAt: new Date()
  });
  
  console.log(`Relationship analysis saved for ${compositeChartId}`);
}

function formatAstrologyForCategory(categoryData) {
  let formatted = '';
  
  // Format synastry aspects
  if (categoryData.synastry?.matchedAspects?.length > 0) {
    formatted += 'SYNASTRY ASPECTS:\n';
    categoryData.synastry.matchedAspects
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 5)
      .forEach(aspect => {
        formatted += `- ${aspect.aspect} (orb: ${aspect.orb}°, score: ${aspect.score})\n`;
      });
    formatted += '\n';
  }
  
  // Format composite aspects
  if (categoryData.composite?.matchedAspects?.length > 0) {
    formatted += 'COMPOSITE ASPECTS:\n';
    categoryData.composite.matchedAspects
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 5)
      .forEach(aspect => {
        formatted += `- ${aspect.aspect} (orb: ${aspect.orb}°, score: ${aspect.score})\n`;
      });
    formatted += '\n';
  }
  
  // Format house placements
  if (categoryData.synastryHousePlacements) {
    formatted += 'HOUSE PLACEMENTS:\n';
    const allPlacements = [
      ...(categoryData.synastryHousePlacements.AinB || []),
      ...(categoryData.synastryHousePlacements.BinA || [])
    ];
    allPlacements
      .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
      .slice(0, 3)
      .forEach(placement => {
        formatted += `- ${placement.description} (points: ${placement.points})\n`;
      });
  }
  
  return formatted || 'No specific astrological factors for this category.';
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
      
      // Process and vectorize the text
      const records = await processTextSectionRelationship(
        data.interpretation,
        compositeChartId,
        `Relationship analysis for ${category}`,
        category
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