// @ts-nocheck
import { BroadTopicsEnum } from '../utilities/constants.js';
import {
  getUserSingle,
  saveBasicAnalysis,
  getBasicAnalysisByUserId,
  updateVectorizationStatus,
  getAllAnalysisByUserId,
  getWorkflowStatus,
  updateWorkflowStatus,
  createWorkflowStatus,
  saveTopicAnalysis,
  getTopicAnalysisByUserId
} from '../services/dbService.js';
import {
  getCompletionShortOverview,
  getCompletionForNatalPlanet,
  getCompletionForDominancePattern,
  getCompletionForChartPattern,
  getCompletionShortOverviewForTopic
} from '../services/gptService.js';
import {
  generateNatalPromptsShortOverview,
  generateDominanceDescriptions,
  getPlanetDescription,
  generateTopicMapping,
  getRulerPlanet
} from '../utilities/birthChartScoring.js';
import {
  upsertRecords,
  processTextSection,
  processTextSectionRelationship
} from '../services/vectorize.js';

export async function startWorkflow(req, res) {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    // Check if user exists
    const user = await getUserSingle(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if workflow is already running
    const existingWorkflow = await getWorkflowStatus(userId);
    if (existingWorkflow && existingWorkflow.status === 'running') {
      return res.json({
        success: true,
        message: 'Workflow already running',
        workflowId: userId,
        status: existingWorkflow
      });
    }

    // Initialize or reset workflow status with unified step
  const workflowStatus = {
      userId,
      status: 'running',
      currentStep: 'processAllContent',
      progress: {
        processAllContent: { status: 'pending', startedAt: null, completedAt: null, completed: 0, total: 0 }
      },
      error: null,
      startedAt: new Date(),
      completedAt: null
    };

    await createWorkflowStatus(userId, workflowStatus);

    // Start the workflow in the background
    processWorkflowStep(userId, 'processAllContent').catch(error => {
      console.error('Error in workflow processing:', error);
      updateWorkflowStatus(userId, {
        status: 'error',
        error: error.message,
        completedAt: new Date()
      });
    });

    res.json({ 
      success: true, 
      message: 'Workflow started',
      workflowId: userId,
      status: workflowStatus
    });

  } catch (error) {
    console.error('Error starting workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getWorkflowStatusHandler(req, res) {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    const status = await getWorkflowStatus(userId);
    
    if (!status) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    // Also return the current analysis data if available
    const analysisData = await getAllAnalysisByUserId(userId);
    
    res.json({ 
      success: true, 
      status,
      analysisData
    });

  } catch (error) {
    console.error('Error getting workflow status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function processWorkflowStep(userId: string, step: string) {
  try {
    await updateWorkflowStatus(userId, {
      currentStep: step,
      [`progress.${step}.status`]: 'running',
      [`progress.${step}.startedAt`]: new Date()
    });

    switch (step) {
      case 'processAllContent':
        await executeProcessAllContent(userId);
        break;
      default:
        throw new Error(`Unknown workflow step: ${step}`);
    }

    await updateWorkflowStatus(userId, {
      [`progress.${step}.status`]: 'completed',
      [`progress.${step}.completedAt`]: new Date()
    });

    // Workflow complete (only one step now)
    await updateWorkflowStatus(userId, {
      status: 'completed',
      currentStep: null,
      completedAt: new Date()
    });

  } catch (error) {
    console.error(`Error in workflow step ${step}:`, error);
    await updateWorkflowStatus(userId, {
      status: 'error',
      error: error.message,
      [`progress.${step}.status`]: 'error',
      completedAt: new Date()
    });
    throw error;
  }
}

async function executeProcessAllContent(userId: string) {
  const user = await getUserSingle(userId);
  if (!user || !user.birthChart) {
    throw new Error('User or birth chart not found');
  }

  console.log(`Starting unified content processing for userId: ${userId}`);

  const planetNames = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Ascendant', 'Node', 'Midheaven'];
  
  // Calculate total items: overview + dominance(4) + planets + topic analysis
  const totalSubtopics = Object.values(BroadTopicsEnum).reduce((acc: number, t: any) => acc + Object.keys(t.subtopics).length, 0);
  const totalTasks = 1 + 4 + planetNames.length + totalSubtopics; // overview + dominance + planets + topics
  let completed = 0;

  await updateWorkflowStatus(userId, {
    'progress.processAllContent.total': totalTasks,
    'progress.processAllContent.completed': 0
  });

  // Initialize basic analysis object
  const basicAnalysis: any = { userId, dominance: {}, planets: {}, createdAt: new Date() };
  
  try {
    // 1. PROCESS OVERVIEW (generate → vectorize)
    console.log('Processing overview...');
    const relevantNatalPositions = generateNatalPromptsShortOverview(user.birthChart);
    const overviewResponse = await getCompletionShortOverview(relevantNatalPositions);
    basicAnalysis.overview = overviewResponse;
    
    // Save and vectorize overview immediately
    await saveBasicAnalysis(userId, { basicAnalysis, timestamp: new Date().toISOString(), metadata: { generatedBy: 'workflow', version: '1.0' } });
    const overviewRecords = await processTextSection(overviewResponse, userId, 'overview');
    await upsertRecords(overviewRecords, userId);
    await updateVectorizationStatus(userId, { overview: true });
    
    completed++;
    await updateWorkflowStatus(userId, { 'progress.processAllContent.completed': completed });
    console.log(`Overview completed (${completed}/${totalTasks})`);
    
    // Add delay and memory management
    await new Promise(resolve => setTimeout(resolve, 2000));
    const memUsage = process.memoryUsage();
    console.log(`Memory usage: RSS=${Math.round(memUsage.rss/1024/1024)}MB, Heap=${Math.round(memUsage.heapUsed/1024/1024)}MB`);
    if (memUsage.heapUsed > 1024 * 1024 * 1024 && global.gc) {
      console.log('High memory usage detected, running garbage collection');
      global.gc();
    }

    // 2. PROCESS DOMINANCE PATTERNS (generate → vectorize each) IN PARALLEL
    const dominanceDescriptions = generateDominanceDescriptions(user.birthChart);
    console.log('Processing dominance patterns...');

    const dominanceTasks = Object.entries(dominanceDescriptions).map(async ([type, desc]) => {
      const response = type === 'patterns'
        ? await getCompletionForChartPattern('patterns', overviewResponse, desc.join('\n'))
        : await getCompletionForDominancePattern(type, overviewResponse, desc.join('\n'));
      basicAnalysis.dominance[type] = { description: desc, interpretation: response };

      const descriptionText = `${type.charAt(0).toUpperCase() + type.slice(1)} Distribution:\n${desc.join('\n')}`;
      const records = await processTextSection(response, userId, descriptionText);
      await upsertRecords(records, userId);
      await updateVectorizationStatus(userId, { [`dominance.${type}`]: true });

      completed++;
      await updateWorkflowStatus(userId, { 'progress.processAllContent.completed': completed });
      console.log(`${type} completed (${completed}/${totalTasks})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    });
    await Promise.all(dominanceTasks);

    // 3. PROCESS PLANETS (generate → vectorize each) IN PARALLEL
    console.log('Processing planets...');
    const planetTasks = planetNames.map(async planetName => {
      const rulerPlanet = getRulerPlanet(planetName, user.birthChart);
      const planetDescription = getPlanetDescription(planetName, user.birthChart, rulerPlanet);

      if (planetDescription) {
        const interpretation = await getCompletionForNatalPlanet(planetName, planetDescription, overviewResponse);
        basicAnalysis.planets[planetName] = {
          description: planetDescription,
          interpretation
        };

        const planetRecords = await processTextSection(interpretation, userId, planetDescription || `planet_${planetName}`);
        await upsertRecords(planetRecords, userId);
        await updateVectorizationStatus(userId, { [`planets.${planetName}`]: true });

        completed++;
        await updateWorkflowStatus(userId, { 'progress.processAllContent.completed': completed });
        console.log(`Planet ${planetName} completed (${completed}/${totalTasks})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    });
    await Promise.all(planetTasks);

    await saveBasicAnalysis(userId, { basicAnalysis, timestamp: new Date().toISOString(), metadata: { generatedBy: 'workflow', version: '1.0' } });
    await updateVectorizationStatus(userId, { basicAnalysis: true });

    // 4. PROCESS TOPIC ANALYSIS (generate → vectorize each)
    console.log('Processing topic analysis...');
    const topicMapping = generateTopicMapping(user.birthChart);
    const results = {} as any;
    const topicTasks: Array<() => Promise<void>> = [];

    for (const [broadTopic, topicData] of Object.entries(BroadTopicsEnum)) {
      const relevantPositions = topicMapping[topicData.label] || null;

      results[broadTopic] = {
        label: topicData.label,
        relevantPositions: relevantPositions,
        subtopics: {}
      };

      for (const [subtopicKey, subtopicLabel] of Object.entries(topicData.subtopics)) {
        topicTasks.push(async () => {
          const response = await getCompletionShortOverviewForTopic(subtopicLabel, topicMapping[topicData.label] || '', '');
          results[broadTopic].subtopics[subtopicKey] = response;

          const description = `${topicData.label} - ${BroadTopicsEnum[broadTopic].subtopics[subtopicKey]}\n\nRelevant Positions:\n${relevantPositions || 'None specified'}`;
          const topicRecords = await processTextSection(response, userId, description);
          await upsertRecords(topicRecords, userId);
          await updateVectorizationStatus(userId, { [`topicAnalysis.${broadTopic}.${subtopicKey}`]: true });

          completed++;
          await updateWorkflowStatus(userId, { 'progress.processAllContent.completed': completed });
          console.log(`Topic ${subtopicKey} completed (${completed}/${totalTasks})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        });
      }
    }

    await Promise.all(topicTasks.map(fn => fn()));

    // Final save and cleanup
    await saveTopicAnalysis(userId, results);
    await updateVectorizationStatus(userId, {
      'topicAnalysis.isComplete': true,
      lastUpdated: new Date().toISOString()
    });

    console.log(`All content processing completed for userId: ${userId}`);

  } catch (error) {
    console.error(`Content processing failed for userId: ${userId}`, {
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
async function executeGenerateBasic(userId: string) {
  const user = await getUserSingle(userId);
  if (!user || !user.birthChart) {
    throw new Error('User or birth chart not found');
  }

  const planetNames = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Ascendant', 'Node', 'Midheaven'];
  const totalTasks = 1 + 4 + planetNames.length; // overview + dominance(4) + planets
  let completed = 0;

  await updateWorkflowStatus(userId, {
    'progress.generateBasic.total': totalTasks,
    'progress.generateBasic.completed': 0
  });
  const basicAnalysis: any = { userId, dominance: {}, planets: {}, createdAt: new Date() };

  // Generate overview
  const relevantNatalPositions = generateNatalPromptsShortOverview(user.birthChart);
  const overviewResponse = await getCompletionShortOverview(relevantNatalPositions);
  basicAnalysis.overview = overviewResponse;
  completed++;
  await saveBasicAnalysis(userId, { basicAnalysis, timestamp: new Date().toISOString(), metadata: { generatedBy: 'workflow', version: '1.0' } });
  await updateWorkflowStatus(userId, { 'progress.generateBasic.completed': completed });

  // Generate dominance patterns
  const dominanceDescriptions = generateDominanceDescriptions(user.birthChart);
  console.log('dominanceDescriptions.elements:', dominanceDescriptions.elements);
  console.log('dominanceDescriptions.modalities:', dominanceDescriptions.modalities);
  console.log('dominanceDescriptions.quadrants:', dominanceDescriptions.quadrants);

  const elementsResponse = await getCompletionForDominancePattern('elements', overviewResponse, dominanceDescriptions.elements.join('\n'));
  const modalitiesResponse = await getCompletionForDominancePattern('modalities', overviewResponse, dominanceDescriptions.modalities.join('\n'));
  const quadrantsResponse = await getCompletionForDominancePattern('quadrants', overviewResponse, dominanceDescriptions.quadrants.join('\n'));
  const patternsResponse = await getCompletionForChartPattern('patterns', overviewResponse, dominanceDescriptions.patterns.join('\n'));

  basicAnalysis.dominance = {
    elements: {
      description: dominanceDescriptions.elements,
      interpretation: elementsResponse
    },
    modalities: {
      description: dominanceDescriptions.modalities,
      interpretation: modalitiesResponse
    },
    quadrants: {
      description: dominanceDescriptions.quadrants,
      interpretation: quadrantsResponse
    },
    patterns: {
      description: dominanceDescriptions.patterns,
      interpretation: patternsResponse
    }
  };
  completed += 3;
  await saveBasicAnalysis(userId, { basicAnalysis, timestamp: new Date().toISOString(), metadata: { generatedBy: 'workflow', version: '1.0' } });
  await updateWorkflowStatus(userId, { 'progress.generateBasic.completed': completed });
  // Generate planet interpretations
  for (const planetName of planetNames) {
    const rulerPlanet = getRulerPlanet(planetName, user.birthChart);
    const planetDescription = getPlanetDescription(planetName, user.birthChart, rulerPlanet);
    if (planetDescription) {
      const interpretation = await getCompletionForNatalPlanet(planetName, planetDescription, overviewResponse);
      basicAnalysis.planets[planetName] = {
        description: planetDescription,
        interpretation
      };
      completed++;
      await saveBasicAnalysis(userId, { basicAnalysis, timestamp: new Date().toISOString(), metadata: { generatedBy: 'workflow', version: '1.0' } });
      await updateWorkflowStatus(userId, { 'progress.generateBasic.completed': completed });
    }
  }

  console.log('Saving basic analysis for userId:', userId);
  console.log('Basic analysis object keys:', Object.keys(basicAnalysis));
  console.log('Basic analysis planets:', Object.keys(basicAnalysis.planets));
  
  try {
    // Format the data structure that saveBasicAnalysis expects
    const analysisToSave = {
      basicAnalysis: basicAnalysis,
      timestamp: new Date().toISOString(),
      metadata: {
        generatedBy: 'workflow',
        version: '1.0'
      }
    };
    
    await saveBasicAnalysis(userId, analysisToSave);
    console.log('Basic analysis saved successfully');
  } catch (error) {
    console.error('Error saving basic analysis:', error);
    throw error;
  }
}

async function executeVectorizeBasic(userId: string) {
  console.log('Starting vectorization for userId:', userId);
  
  try {
    const analysis = await getBasicAnalysisByUserId(userId);
    console.log('Retrieved analysis:', analysis ? 'found' : 'not found');

    if (!analysis) {
      console.error('No basic analysis found for userId:', userId);
      throw new Error('Basic analysis not found');
    }

  let totalTasks = 0;
  let completed = 0;
  if (analysis.overview) totalTasks++;
  if (analysis.dominance && typeof analysis.dominance === 'object') {
    totalTasks += Object.keys(analysis.dominance).length;
  }
  if (analysis.planets && typeof analysis.planets === 'object') {
    totalTasks += Object.keys(analysis.planets).length;
  }

  await updateWorkflowStatus(userId, {
    'progress.vectorizeBasic.total': totalTasks,
    'progress.vectorizeBasic.completed': 0
  });

  console.log('Analysis object:', JSON.stringify(analysis, null, 2));
  console.log('analysis.overview:', analysis.overview);
  console.log('analysis.dominance:', analysis.dominance);
  console.log('analysis.planets:', analysis.planets);

  // Process overview
  if (analysis.overview) {
    try {
      console.log(`Processing overview for userId: ${userId}`);
      const records = await processTextSection(analysis.overview, userId, 'overview');
      await upsertRecords(records, userId);
      await updateVectorizationStatus(userId, { overview: true });
      completed++;
      await updateWorkflowStatus(userId, { 'progress.vectorizeBasic.completed': completed });
      console.log(`Overview vectorization completed for userId: ${userId}`);
    } catch (error) {
      console.error(`Overview vectorization failed for userId: ${userId}:`, error.message);
      throw new Error(`Failed to vectorize overview: ${error.message}`);
    }
  }

  // Process dominance patterns
  if (analysis.dominance && typeof analysis.dominance === 'object') {
    for (const [type, data] of Object.entries(analysis.dominance)) {
      if (data && data.interpretation) {
        try {
          console.log(`Processing dominance ${type} for userId: ${userId}`);
          // Create rich description using the dominance description array
          const dominanceDescription = data.description ? 
            `${type.charAt(0).toUpperCase() + type.slice(1)} Distribution:\n${data.description.join('\n')}` : 
            `dominance_${type}`;
          
          const records = await processTextSection(data.interpretation, userId, dominanceDescription);
          await upsertRecords(records, userId);
          await updateVectorizationStatus(userId, { [`dominance.${type}`]: true });
          completed++;
          await updateWorkflowStatus(userId, { 'progress.vectorizeBasic.completed': completed });
          console.log(`Dominance ${type} vectorization completed for userId: ${userId}`);
          
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
          console.error(`Dominance ${type} vectorization failed for userId: ${userId}:`, error.message);
          throw new Error(`Failed to vectorize dominance ${type}: ${error.message}`);
        }
      }
    }
  }

  // Process planets
  if (analysis.planets && typeof analysis.planets === 'object') {
    for (const [planetName, data] of Object.entries(analysis.planets)) {
      if (data && data.interpretation) {
        try {
          console.log(`Processing planet ${planetName} for userId: ${userId}`);
          const records = await processTextSection(data.interpretation, userId, data.description || `planet_${planetName}`);
          await upsertRecords(records, userId);
          await updateVectorizationStatus(userId, { [`planets.${planetName}`]: true });
          completed++;
          await updateWorkflowStatus(userId, { 'progress.vectorizeBasic.completed': completed });
          console.log(`Planet ${planetName} vectorization completed for userId: ${userId}`);
          
          // Add delay between operations to avoid rate limiting
          console.log('Waiting 2 seconds before next vectorization step...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Planet ${planetName} vectorization failed for userId: ${userId}:`, error.message);
          throw new Error(`Failed to vectorize planet ${planetName}: ${error.message}`);
        }
      }
    }
  }

    await updateVectorizationStatus(userId, { basicAnalysis: true });
    await updateWorkflowStatus(userId, { 'progress.vectorizeBasic.completed': totalTasks });
    
    console.log(`Vectorization completed successfully for userId: ${userId}`);
  } catch (error) {
    console.error(`Vectorization failed for userId: ${userId}`, {
      error: error.message,
      stack: error.stack
    });
    
    // Update workflow status to show vectorization error
    await updateWorkflowStatus(userId, {
      'progress.vectorizeBasic.status': 'error',
      'progress.vectorizeBasic.error': error.message
    });
    
    throw error;
  }
}

async function executeGenerateTopic(userId: string) {
  const user = await getUserSingle(userId);
  if (!user || !user.birthChart) {
    throw new Error('User or birth chart not found');
  }
  let completed = 0;
  const totalSubtopics = Object.values(BroadTopicsEnum).reduce((acc: number, t: any) => acc + Object.keys(t.subtopics).length, 0);

  await updateWorkflowStatus(userId, {
    'progress.generateTopic.total': totalSubtopics,
    'progress.generateTopic.completed': 0
  });

  const results = {};

  // Generate topic mapping once for the birth chart
  const topicMapping = generateTopicMapping(user.birthChart);

  console.log('BroadTopicsEnum:', BroadTopicsEnum);
  console.log('BroadTopicsEnum type:', typeof BroadTopicsEnum);
  
  if (!BroadTopicsEnum || typeof BroadTopicsEnum !== 'object') {
    throw new Error('BroadTopicsEnum is not defined or not an object');
  }

  for (const [broadTopic, topicData] of Object.entries(BroadTopicsEnum)) {
    // Get the relevant positions for this topic from the mapping
    const relevantPositions = topicMapping[topicData.label] || null;
    
    results[broadTopic] = {
      label: topicData.label,
      relevantPositions: relevantPositions,
      subtopics: {}
    };

    for (const [subtopicKey, subtopicLabel] of Object.entries(topicData.subtopics)) {
      // For now, use empty string for RAGResponse since RAG isn't implemented in workflow
      const response = await getCompletionShortOverviewForTopic(subtopicLabel, topicMapping[topicData.label] || '', '');
      results[broadTopic].subtopics[subtopicKey] = response;

      await saveTopicAnalysis(userId, {
        [broadTopic]: {
          label: topicData.label,
          relevantPositions: relevantPositions,
          subtopics: { [subtopicKey]: response }
        }
      });
      completed++;
      await updateWorkflowStatus(userId, { 'progress.generateTopic.completed': completed });
    }
  }

  // Save topic analysis to database
  await saveTopicAnalysis(userId, results);
  await updateWorkflowStatus(userId, { 'progress.generateTopic.completed': totalSubtopics });
}

async function executeVectorizeTopic(userId: string) {
  const topicAnalysis = await getTopicAnalysisByUserId(userId);
  if (!topicAnalysis) {
    throw new Error('Topic analysis not found');
  }

  const totalSubtopics = Object.values(topicAnalysis).reduce((acc: number, t: any) => acc + (t.subtopics ? Object.keys(t.subtopics).length : 0), 0);
  let completed = 0;
  await updateWorkflowStatus(userId, {
    'progress.vectorizeTopic.total': totalSubtopics,
    'progress.vectorizeTopic.completed': 0
  });

  for (const [topicKey, topicData] of Object.entries(topicAnalysis)) {
    if (topicData.subtopics) {
      for (const [subtopicKey, content] of Object.entries(topicData.subtopics)) {
        console.log(`Processing topic ${topicKey}.${subtopicKey}, content length: ${content?.length || 0}`);
        
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
          console.log(`Skipping empty content for ${topicKey}.${subtopicKey}`);
          continue;
        }
        
        // Create rich description like the previous implementation
        const description = `${topicData.label} - ${BroadTopicsEnum[topicKey].subtopics[subtopicKey]}\n\nRelevant Positions:\n${topicData.relevantPositions || 'None specified'}`;
        
        const records = await processTextSection(content, userId, description);

        if (records && records.length > 0) {
          await upsertRecords(records, userId);
          await updateVectorizationStatus(userId, {
            [`topicAnalysis.${topicKey}.${subtopicKey}`]: true
          });
          completed++;
          await updateWorkflowStatus(userId, { 'progress.vectorizeTopic.completed': completed });
        } else {
          console.log(`No records generated for ${topicKey}.${subtopicKey}, skipping vectorization`);
        }
      }
    }
  }

  await updateVectorizationStatus(userId, {
    'topicAnalysis.isComplete': true,
    lastUpdated: new Date().toISOString()
  });
  await updateWorkflowStatus(userId, { 'progress.vectorizeTopic.completed': totalSubtopics });
}
*/