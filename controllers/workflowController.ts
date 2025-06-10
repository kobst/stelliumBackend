// @ts-nocheck
import { BroadTopicsEnum } from '../utilities/constants.js';

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
  saveBasicAnalysis,
  getBasicAnalysisByUserId,
  updateVectorizationStatus,
  getAllAnalysisByUserId,
  saveTopicAnalysis,
  getTopicAnalysisByUserId,
  updateWorkflowRunningStatus
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
  processTextSectionRelationship,
  retrieveTopicContext
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

    // Mark workflow as running
    await updateWorkflowRunningStatus(userId, true);
    
    // Start the workflow in the background
    executeProcessAllContent(userId).catch(error => {
      console.error('Error in workflow processing:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        userId: userId
      });
      // Mark workflow as not running on error
      updateWorkflowRunningStatus(userId, false, {
        'workflowStatus.error': error.message,
        'workflowStatus.errorAt': new Date()
      });
    });

    res.json({ 
      success: true, 
      message: 'Workflow started',
      workflowId: userId
    });

  } catch (error) {
    console.error('Error starting workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getWorkflowStatusHandler(req, res) {
  try {
    console.log('🚀 NEW WORKFLOW STATUS HANDLER CALLED - VERSION 2.0');
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    // Get current analysis data and determine progress from it
    console.log('Getting analysis for userId:', userId, 'type:', typeof userId);
    const analysisData = await getAllAnalysisByUserId(userId);
    console.log('Retrieved analysisData:', analysisData ? 'found' : 'null/empty');
    console.log('AnalysisData keys:', analysisData ? Object.keys(analysisData) : 'none');
    
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
        console.log(`⚠️ Workflow has been marked as running for ${Math.round(runningTime / 60000)} minutes - may be stale`);
        // Optionally auto-clear stale running status
        // await updateWorkflowRunningStatus(userId, false, { 'workflowStatus.staleDetected': true });
      }
    }
    
    // If no analysis data exists, user hasn't started any workflow yet
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
          overview: { needsGeneration: true, needsVectorization: true },
          dominance: {},
          planets: {},
          topics: {}
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
          fixesApplied: false,
          isWorkflowComplete: false,
          isTopicAnalysisComplete: false,
          completedWithFailures: false,
          remainingTasks: 0,
          totalTasks: 0,
          completedTasks: 0,
          isCurrentlyRunning: false,
          workflowStatus: {}
        }
      });
    }
    
    let jobs = analyzeIncompleteJobs(analysisData);
    console.log('Jobs analysis for status check (before fixes):', JSON.stringify(jobs, null, 2));
    
    // Fix impossible states in the database
    const fixesApplied = await fixImpossibleStates(userId, jobs, analysisData);
    
    // If fixes were applied, re-analyze with corrected data
    if (fixesApplied) {
      console.log('Re-analyzing jobs after database fixes...');
      const updatedAnalysisData = await getAllAnalysisByUserId(userId);
      jobs = analyzeIncompleteJobs(updatedAnalysisData);
      console.log('Jobs analysis after fixes:', JSON.stringify(jobs, null, 2));
    }
    
    // Calculate completion statistics and create detailed breakdown
    let totalTasks = 0;
    let completedTasks = 0;
    
    // Track what specifically needs work
    const needsGeneration = [];
    const needsVectorization = [];
    const completed = [];
    
    // Count overview (generation + vectorization = 2 tasks)
    totalTasks += 2;
    if (!jobs.overview.needsGeneration) {
      completedTasks++;
      completed.push('overview-generation');
    } else {
      needsGeneration.push('overview');
    }
    if (!jobs.overview.needsVectorization) {
      completedTasks++;
      completed.push('overview-vectorization');
    } else {
      needsVectorization.push('overview');
    }
    
    // Count dominance patterns (generation + vectorization = 2 tasks each)
    Object.entries(jobs.dominance).forEach(([type, job]: any) => {
      totalTasks += 2;
      if (!job.needsGeneration) {
        completedTasks++;
        completed.push(`dominance-${type}-generation`);
      } else {
        needsGeneration.push(`dominance-${type}`);
      }
      if (!job.needsVectorization) {
        completedTasks++;
        completed.push(`dominance-${type}-vectorization`);
      } else {
        needsVectorization.push(`dominance-${type}`);
      }
    });
    
    // Count planets (generation + vectorization = 2 tasks each)
    Object.entries(jobs.planets).forEach(([planet, job]: any) => {
      totalTasks += 2;
      if (!job.needsGeneration) {
        completedTasks++;
        completed.push(`planet-${planet}-generation`);
      } else {
        needsGeneration.push(`planet-${planet}`);
      }
      if (!job.needsVectorization) {
        completedTasks++;
        completed.push(`planet-${planet}-vectorization`);
      } else {
        needsVectorization.push(`planet-${planet}`);
      }
    });
    
    // Count topics (generation + vectorization = 2 tasks each)
    Object.entries(jobs.topics).forEach(([broadTopic, broadTopicJobs]: any) => {
      Object.entries(broadTopicJobs).forEach(([subtopicKey, job]: any) => {
        totalTasks += 2;
        if (!job.needsGeneration) {
          completedTasks++;
          completed.push(`topic-${broadTopic}-${subtopicKey}-generation`);
        } else {
          needsGeneration.push(`topic-${broadTopic}-${subtopicKey}`);
        }
        if (!job.needsVectorization) {
          completedTasks++;
          completed.push(`topic-${broadTopic}-${subtopicKey}-vectorization`);
        } else {
          needsVectorization.push(`topic-${broadTopic}-${subtopicKey}`);
        }
      });
    });
    
    // Check if workflow completed with failures
    const vectorStatus = analysisData?.vectorizationStatus || {};
    const completedWithFailures = vectorStatus.topicAnalysis?.completedWithFailures === true;
    const remainingTasks = vectorStatus.topicAnalysis?.remainingTasks || 0;
    const isTopicAnalysisComplete = vectorStatus.topicAnalysis?.isComplete === true;
    
    // The REAL workflow completion check
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
      // This is INCOMPLETE, not running
      status = 'incomplete';
    } else {
      // Fallback
      status = 'unknown';
    }
    
    // Debug status determination
    console.log(`📊 Status Debug: isCurrentlyRunning=${isCurrentlyRunning}, isWorkflowComplete=${isWorkflowComplete}, isTopicAnalysisComplete=${isTopicAnalysisComplete}, completedWithFailures=${completedWithFailures}, completedTasks=${completedTasks}, totalTasks=${totalTasks}`);
    if (status === 'incomplete') {
      console.log(`⚠️ Workflow is incomplete: ${completedTasks}/${totalTasks} tasks done. Process is NOT running.`);
      console.log(`📋 Missing items:`, needsGeneration);
    }
    
    console.log(`👤 BIRTH CHART WORKFLOW Progress calculation: ${completedTasks}/${totalTasks} tasks completed`);
    console.log(`👤 BIRTH CHART WORKFLOW status: ${status}`);
    console.log(`👤 BIRTH CHART WORKFLOW userId: ${userId}`);
    
    const responseData = { 
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
      jobs: jobs, // Include jobs analysis for debugging
      workflowBreakdown: {
        needsGeneration: needsGeneration,
        needsVectorization: needsVectorization,
        completed: completed,
        totalNeedsGeneration: needsGeneration.length,
        totalNeedsVectorization: needsVectorization.length,
        totalCompleted: completed.length
      },
      debug: {
        fixesApplied,
        isWorkflowComplete,
        isTopicAnalysisComplete,
        completedWithFailures,
        remainingTasks,
        totalTasks,
        completedTasks,
        isCurrentlyRunning,
        workflowStatus: workflowStatus
      }
    };
    
    console.log('🔥 RETURNING NEW RESPONSE STRUCTURE:', JSON.stringify(responseData, null, 2));
    
    res.json(responseData);

  } catch (error) {
    console.error('Error getting workflow status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Helper function to determine what needs to be processed
function analyzeIncompleteJobs(existingData: any) {
  const jobs = {
    overview: { needsGeneration: true, needsVectorization: true },
    dominance: {},
    planets: {},
    topics: {}
  };

  // Set up defaults for basic/topic analysis and vector status
  const basicAnalysis = existingData?.interpretation?.basicAnalysis || {};
  const topicAnalysis = existingData?.interpretation?.SubtopicAnalysis || {};
  const vectorStatus = existingData?.vectorizationStatus || {};

  // Check overview
  if (basicAnalysis.overview) {
    jobs.overview.needsGeneration = false;
    // Check vectorization - could be true, false, or undefined
    jobs.overview.needsVectorization = vectorStatus.overview !== true;
  }

  // Check dominance patterns
  const dominanceTypes = ['elements', 'modalities', 'quadrants', 'patterns'];
  dominanceTypes.forEach(type => {
    jobs.dominance[type] = {
      needsGeneration: !basicAnalysis.dominance?.[type],
      needsVectorization: vectorStatus.dominance?.[type] !== true
    };
  });

  // Check planets - ensure vectorization status aligns with generation status
  const planetNames = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Ascendant', 'Node', 'Midheaven'];
  planetNames.forEach(planet => {
    const hasContent = !!basicAnalysis.planets?.[planet];
    const isVectorized = vectorStatus.planets?.[planet] === true;
    
    // Fix impossible states: if no content but marked as vectorized, reset vectorization
    if (!hasContent && isVectorized) {
      console.log(`🔧 Fixing impossible state for planet ${planet}: no content but marked as vectorized`);
      // Note: We'll fix this in the database later
    }
    
    jobs.planets[planet] = {
      needsGeneration: !hasContent,
      needsVectorization: hasContent ? !isVectorized : true // If no content, will need vectorization after generation
    };
  });

  // Check topics
  console.log('Checking topic vectorization status...');
  console.log('VectorStatus topicAnalysis keys:', Object.keys(vectorStatus.topicAnalysis || {}));
  console.log('VectorStatus topics keys:', Object.keys(vectorStatus.topics || {}));
  console.log('VectorStatus flat topicAnalysis keys:', Object.keys(vectorStatus).filter(k => k.startsWith('topicAnalysis.')));
  console.log('VectorStatus flat topics keys:', Object.keys(vectorStatus).filter(k => k.startsWith('topics.')));
  console.log('All vectorStatus keys:', Object.keys(vectorStatus));
  
  for (const [broadTopic, topicData] of Object.entries(BroadTopicsEnum)) {
    jobs.topics[broadTopic] = {};
    for (const [subtopicKey, subtopicLabel] of Object.entries(topicData.subtopics)) {
      const hasContent = topicAnalysis[broadTopic]?.subtopics?.[subtopicKey];
      
      // Check vectorization status with multiple fallback approaches
      let isVectorized = false;
      const nestedPath = vectorStatus.topicAnalysis?.[broadTopic]?.[subtopicKey];
      const flatPath = vectorStatus[`topicAnalysis.${broadTopic}.${subtopicKey}`];
      const topicsPath = vectorStatus.topics?.[broadTopic]?.[subtopicKey];
      const flatTopicsPath = vectorStatus[`topics.${broadTopic}.${subtopicKey}`];
      
      // NEW: Check the nested topics structure that appears in the user's data
      const nestedTopicsPath = vectorStatus.topicAnalysis?.topics?.[broadTopic]?.subtopics?.[subtopicKey];
      const deepNestedPath = vectorStatus.topicAnalysis?.topics?.[broadTopic]?.[subtopicKey];
      
      if (nestedPath === true) {
        isVectorized = true;
      } else if (flatPath === true) {
        // Handle flat dot-notation structure from MongoDB
        isVectorized = true;
      } else if (topicsPath === true) {
        // Handle new flattened topics structure
        isVectorized = true;
      } else if (flatTopicsPath === true) {
        // Handle new flattened topics with dot notation
        isVectorized = true;
      } else if (nestedTopicsPath === true) {
        // Handle nested topics structure: topicAnalysis.topics.BROADTOPIC.subtopics.SUBTOPIC
        isVectorized = true;
      } else if (deepNestedPath === true) {
        // Handle: topicAnalysis.topics.BROADTOPIC.SUBTOPIC
        isVectorized = true;
      }
      
      console.log(`${broadTopic}.${subtopicKey}: hasContent=${!!hasContent}, nestedPath=${nestedPath}, flatPath=${flatPath}, topicsPath=${topicsPath}, flatTopicsPath=${flatTopicsPath}, nestedTopicsPath=${nestedTopicsPath}, deepNestedPath=${deepNestedPath}, isVectorized=${isVectorized}`);
      
      // Special case: if content exists but we have no vectorization status (neither nested nor flat),
      // and we only have the general isComplete flag, assume it needs vectorization
      if (hasContent && !isVectorized && vectorStatus.topicAnalysis?.isComplete === true && !nestedPath && !flatPath) {
        console.log(`Found content without specific vectorization status for ${broadTopic}.${subtopicKey} - marking as needing vectorization`);
      }
      
      // Fix impossible states: if no content but marked as vectorized, reset vectorization
      if (!hasContent && isVectorized) {
        console.log(`🔧 Fixing impossible state for topic ${broadTopic}.${subtopicKey}: no content but marked as vectorized`);
        // Note: We'll fix this in the database later
      }
      
      // Calculate the boolean values explicitly
      const needsGeneration = !hasContent;
      const needsVectorization = hasContent ? !isVectorized : true; // If no content, will need vectorization after generation
      
      console.log(`${broadTopic}.${subtopicKey}: needsGeneration=${needsGeneration}, needsVectorization=${needsVectorization}, hasContent=${!!hasContent}, isVectorized=${isVectorized}`);
      
      jobs.topics[broadTopic][subtopicKey] = {
        needsGeneration,
        needsVectorization
      };
    }
  }

  return jobs;
}

// Helper function to fix impossible states in the database
async function fixImpossibleStates(userId: string, jobs: any, analysisData: any): Promise<boolean> {
  const fixes = {};
  let needsFix = false;

  // Check planets for impossible states
  Object.entries(jobs.planets).forEach(([planet, job]: any) => {
    const hasContent = !!analysisData?.interpretation?.basicAnalysis?.planets?.[planet];
    const isVectorized = analysisData?.vectorizationStatus?.planets?.[planet] === true;
    
    if (!hasContent && isVectorized) {
      console.log(`🔧 DATABASE FIX: Planet ${planet} has no content but is marked as vectorized`);
      fixes[`planets.${planet}`] = false;
      needsFix = true;
    }
  });

  // Check topics for impossible states
  Object.entries(jobs.topics).forEach(([broadTopic, subtopics]: any) => {
    Object.entries(subtopics).forEach(([subtopicKey, job]: any) => {
      const hasContent = !!analysisData?.interpretation?.SubtopicAnalysis?.[broadTopic]?.subtopics?.[subtopicKey];
      const vectorStatus = analysisData?.vectorizationStatus || {};
      
      // Check multiple vectorization path formats (same as analyzeIncompleteJobs)
      const nestedPath = vectorStatus.topicAnalysis?.[broadTopic]?.[subtopicKey];
      const flatPath = vectorStatus[`topicAnalysis.${broadTopic}.${subtopicKey}`];
      const topicsPath = vectorStatus.topics?.[broadTopic]?.[subtopicKey];
      const flatTopicsPath = vectorStatus[`topics.${broadTopic}.${subtopicKey}`];
      const nestedTopicsPath = vectorStatus.topicAnalysis?.topics?.[broadTopic]?.subtopics?.[subtopicKey];
      const deepNestedPath = vectorStatus.topicAnalysis?.topics?.[broadTopic]?.[subtopicKey];
      
      const isVectorized = nestedPath === true || flatPath === true || topicsPath === true || flatTopicsPath === true || nestedTopicsPath === true || deepNestedPath === true;
      
      console.log(`🔍 Topic ${broadTopic}.${subtopicKey}: hasContent=${hasContent}, isVectorized=${isVectorized}, nestedPath=${nestedPath}, flatPath=${flatPath}, topicsPath=${topicsPath}, flatTopicsPath=${flatTopicsPath}, nestedTopicsPath=${nestedTopicsPath}, deepNestedPath=${deepNestedPath}`);
      
      if (!hasContent && isVectorized) {
        console.log(`🔧 DATABASE FIX: Topic ${broadTopic}.${subtopicKey} has no content but is marked as vectorized`);
        fixes[`topicAnalysis.${broadTopic}.${subtopicKey}`] = false;
        needsFix = true;
      }
      
      // ALSO CHECK: If there's content but vectorization shows as true in the nested structure 
      // but job analysis shows it needs vectorization, there might be a mismatch
      if (hasContent && isVectorized && job.needsVectorization) {
        console.log(`⚠️ POTENTIAL MISMATCH: Topic ${broadTopic}.${subtopicKey} has content and is marked as vectorized, but job analysis says it needs vectorization`);
        // Let's reset the vectorization status to false to force re-vectorization
        fixes[`topicAnalysis.${broadTopic}.${subtopicKey}`] = false;
        needsFix = true;
      }
    });
  });

  // Apply fixes if needed
  if (needsFix) {
    console.log('🔧 Applying database fixes for impossible states...');
    await updateVectorizationStatus(userId, fixes);
    console.log('✅ Database fixes applied');
    return true;
  }
  
  return false;
}

async function executeProcessAllContent(userId: string) {
  const user = await getUserSingle(userId);
  if (!user || !user.birthChart) {
    throw new Error('User or birth chart not found');
  }

  console.log(`Starting unified content processing for userId: ${userId}`);

  const planetNames = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Ascendant', 'Node', 'Midheaven'];

  // Initialize basic analysis object
  const basicAnalysis: any = { userId, dominance: {}, planets: {}, createdAt: new Date() };
  
  try {
    // 1. PROCESS OVERVIEW (generate → vectorize)
    console.log('Processing overview...');
    let overviewResponse;
    
    await retryOperation(async () => {
      const relevantNatalPositions = generateNatalPromptsShortOverview(user.birthChart);
      overviewResponse = await getCompletionShortOverview(relevantNatalPositions);
      basicAnalysis.overview = overviewResponse;
      
      // Save overview immediately
      await saveBasicAnalysis(userId, { basicAnalysis, timestamp: new Date().toISOString(), metadata: { generatedBy: 'workflow', version: '1.0' } });
      console.log('Overview saved to database');
      
      // Vectorize - but don't fail the whole task if this fails
      try {
        const overviewRecords = await processTextSection(overviewResponse, userId, 'overview');
        await upsertRecords(overviewRecords, userId);
        await updateVectorizationStatus(userId, { overview: true });
        console.log('Overview vectorized successfully');
      } catch (vectorError) {
        console.error('Failed to vectorize overview:', vectorError.message);
        await updateVectorizationStatus(userId, { overview: false });
      }
    }, 2); // 2 retries for overview
    
    console.log('Overview completed');
    
    // Add delay and memory management
    await new Promise(resolve => setTimeout(resolve, 2000));
    const memUsage = process.memoryUsage();
    console.log(`Memory usage: RSS=${Math.round(memUsage.rss/1024/1024)}MB, Heap=${Math.round(memUsage.heapUsed/1024/1024)}MB`);
    if (memUsage.heapUsed > 1024 * 1024 * 1024 && global.gc) {
      console.log('High memory usage detected, running garbage collection');
      global.gc();
    }

    // 2. PROCESS DOMINANCE PATTERNS (generate → save → vectorize each) IN PARALLEL
    const dominanceDescriptions = generateDominanceDescriptions(user.birthChart);
    console.log('Processing dominance patterns...');

    const dominanceTasks = Object.entries(dominanceDescriptions).map(async ([type, desc]) => {
      try {
        await retryOperation(async () => {
          // Generate content
          const response = type === 'patterns'
            ? await getCompletionForChartPattern('patterns', overviewResponse, desc.join('\n'))
            : await getCompletionForDominancePattern(type, overviewResponse, desc.join('\n'));
          
          // Update in-memory object
          basicAnalysis.dominance[type] = { description: desc, interpretation: response };

          // Save immediately (includes all content generated so far)
          await saveBasicAnalysis(userId, { 
            basicAnalysis, 
            timestamp: new Date().toISOString(), 
            metadata: { generatedBy: 'workflow', version: '1.0' } 
          });
          console.log(`${type} saved to database`);

          // Vectorize - but don't fail the whole task if this fails
          try {
            const descriptionText = `${type.charAt(0).toUpperCase() + type.slice(1)} Distribution:\n${desc.join('\n')}`;
            const records = await processTextSection(response, userId, descriptionText);
            await upsertRecords(records, userId);
            await updateVectorizationStatus(userId, { [`dominance.${type}`]: true });
            console.log(`${type} vectorized successfully`);
          } catch (vectorError) {
            console.error(`Failed to vectorize dominance ${type}:`, vectorError.message);
            await updateVectorizationStatus(userId, { [`dominance.${type}`]: false });
          }

          console.log(`${type} completed`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }, 2); // 2 retries for dominance patterns
      } catch (error) {
        console.error(`Failed to process dominance ${type} after retries:`, error.message);
        // Continue with other dominance patterns even if this one fails
      }
    });
    await Promise.all(dominanceTasks);

    // 3. PROCESS PLANETS (generate → save → vectorize each) IN PARALLEL
    console.log('Processing planets...');
    const planetTasks = planetNames.map(async planetName => {
      try {
        const rulerPlanet = getRulerPlanet(planetName, user.birthChart);
        const planetDescription = getPlanetDescription(planetName, user.birthChart, rulerPlanet);

        if (planetDescription) {
          await retryOperation(async () => {
            // Generate content
            const interpretation = await getCompletionForNatalPlanet(planetName, planetDescription, overviewResponse);
            
            // Update in-memory object
            basicAnalysis.planets[planetName] = {
              description: planetDescription,
              interpretation
            };

            // Save immediately (includes all content generated so far)
            await saveBasicAnalysis(userId, { 
              basicAnalysis, 
              timestamp: new Date().toISOString(), 
              metadata: { generatedBy: 'workflow', version: '1.0' } 
            });
            console.log(`Planet ${planetName} saved to database`);

            // Vectorize - but don't fail the whole task if this fails
            try {
              const planetRecords = await processTextSection(interpretation, userId, planetDescription || `planet_${planetName}`);
              await upsertRecords(planetRecords, userId);
              await updateVectorizationStatus(userId, { [`planets.${planetName}`]: true });
              console.log(`Planet ${planetName} vectorized successfully`);
            } catch (vectorError) {
              console.error(`Failed to vectorize planet ${planetName}:`, vectorError.message);
              await updateVectorizationStatus(userId, { [`planets.${planetName}`]: false });
            }

            console.log(`Planet ${planetName} completed`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }, 2); // 2 retries for planets
        }
      } catch (error) {
        console.error(`Failed to process planet ${planetName} after retries:`, error.message);
        // Continue with other planets even if this one fails
      }
    });
    await Promise.all(planetTasks);

    // Mark basic analysis as complete
    await updateVectorizationStatus(userId, { basicAnalysis: true });

    // 4. PROCESS TOPIC ANALYSIS (generate → vectorize each)
    console.log('Processing topic analysis...');
    const topicMapping = generateTopicMapping(user.birthChart);
    const results = {} as any;
    const topicTasks: Array<() => Promise<void>> = [];

    for (const [broadTopic, topicData] of Object.entries(BroadTopicsEnum)) {
      console.log(`Processing broad topic: ${broadTopic}`);
      const relevantPositions = topicMapping[topicData.label] || null;

      results[broadTopic] = {
        label: topicData.label,
        relevantPositions: relevantPositions,
        subtopics: {}
      };

      for (const [subtopicKey, subtopicLabel] of Object.entries(topicData.subtopics)) {
        console.log(`Processing subtopic: ${subtopicKey} (${subtopicLabel})`);
        topicTasks.push(async () => {
          try {
            await retryOperation(async () => {
              console.log(`Attempting ${subtopicKey} generation...`);
              
              const RAGResponse = await retrieveTopicContext(userId, subtopicLabel);
              console.log(`RAG Response for ${subtopicLabel}:`, JSON.stringify(RAGResponse, null, 2));
          
              // Verify we have RAG data before proceeding
              if (!RAGResponse || !RAGResponse.matches) {
                  throw new Error(`No RAG matches found for subtopic: ${subtopicLabel}`);
              }

              // Format RAG response for the completion
              const formattedRAGContext = RAGResponse.matches
                .map(match => {
                  const description = match.description ? `Context: ${match.description}\n` : '';
                  return `${description}${match.text}`;
                })
                .join('\n\n');

              console.log(`Getting completion for ${subtopicLabel} with formatted context length: ${formattedRAGContext.length}`);
              const response = await getCompletionShortOverviewForTopic(subtopicLabel, topicMapping[topicData.label] || '', formattedRAGContext);
              console.log(`Got completion for ${subtopicLabel}, response length: ${response?.length || 0}`);

              if (!response || typeof response !== 'string') {
                throw new Error(`Invalid response format for ${subtopicLabel}`);
              }

              results[broadTopic].subtopics[subtopicKey] = response;

              // Save the individual subtopic immediately
              await saveTopicAnalysis(userId, {
                [broadTopic]: {
                  label: topicData.label,
                  relevantPositions: relevantPositions,
                  subtopics: { [subtopicKey]: response }
                }
              });
              console.log(`Topic ${subtopicKey} saved to database`);

              // Vectorize - but don't fail the whole task if this fails
              try {
                const description = `${topicData.label} - ${BroadTopicsEnum[broadTopic].subtopics[subtopicKey]}\n\nRelevant Positions:\n${relevantPositions || 'None specified'}`;
                console.log(`Processing text section for ${subtopicLabel} with description length: ${description.length}`);
                const topicRecords = await processTextSection(response, userId, description);
                console.log(`Generated ${topicRecords?.length || 0} records for ${subtopicLabel}`);

                if (topicRecords && topicRecords.length > 0) {
                  await upsertRecords(topicRecords, userId);
                  await updateVectorizationStatus(userId, { [`topicAnalysis.${broadTopic}.${subtopicKey}`]: true });
                  console.log(`Topic ${subtopicKey} vectorized successfully`);
                } else {
                  console.warn(`No records generated for ${subtopicLabel}`);
                  await updateVectorizationStatus(userId, { [`topicAnalysis.${broadTopic}.${subtopicKey}`]: false });
                }
              } catch (vectorError) {
                console.error(`Failed to vectorize topic ${subtopicKey}:`, vectorError.message);
                await updateVectorizationStatus(userId, { [`topicAnalysis.${broadTopic}.${subtopicKey}`]: false });
              }

              console.log(`Topic ${subtopicKey} completed`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }, 3); // 3 retries for each topic
            
          } catch (error) {
            // Final failure after all retries - save error message
            console.error(`Final failure for subtopic ${subtopicLabel} after retries:`, error);
            const errorMessage = `Error: ${error.message}`;
            results[broadTopic].subtopics[subtopicKey] = errorMessage;
            
            // Save the error message to database so the content exists
            try {
              await saveTopicAnalysis(userId, {
                [broadTopic]: {
                  label: topicData.label,
                  relevantPositions: relevantPositions,
                  subtopics: { [subtopicKey]: errorMessage }
                }
              });
              console.log(`Topic ${subtopicKey} saved to database (final error after retries)`);
              
              // Mark vectorization as failed since content generation failed
              await updateVectorizationStatus(userId, { [`topicAnalysis.${broadTopic}.${subtopicKey}`]: false });
              console.log(`Topic ${subtopicKey} vectorization marked as failed (final error)`);
            } catch (saveError) {
              console.error(`Failed to save error message for topic ${subtopicKey}:`, saveError.message);
            }
          }
        });
      }
    }

    console.log('Executing all topic tasks...');
    await Promise.all(topicTasks.map(fn => fn()));
    console.log('All topic tasks completed');

    // AUTO-RETRY FAILED TASKS
    const maxWorkflowRetries = 3;
    let workflowRetryAttempt = 0;
    
    while (workflowRetryAttempt < maxWorkflowRetries) {
      console.log(`\n=== CHECKING FOR FAILED TASKS (Workflow Retry ${workflowRetryAttempt + 1}/${maxWorkflowRetries}) ===`);
      
      const analysisData = await getAllAnalysisByUserId(userId);
      const jobs = analyzeIncompleteJobs(analysisData);
      
      // Count remaining tasks that need work
      let remainingTasks = 0;
      const failedTopics = [];
      
      Object.entries(jobs.topics).forEach(([broadTopic, broadTopicJobs]: any) => {
        Object.entries(broadTopicJobs).forEach(([subtopicKey, job]: any) => {
          if (job.needsGeneration || job.needsVectorization) {
            remainingTasks++;
            failedTopics.push({ broadTopic, subtopicKey, job });
          }
        });
      });
      
      if (remainingTasks === 0) {
        console.log('✅ All topics completed successfully!');
        await updateVectorizationStatus(userId, {
          'topicAnalysis.isComplete': true,
          'topicAnalysis.completedAt': new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
        break;
      }
      
      console.log(`Found ${remainingTasks} remaining tasks. Retrying failed topics...`);
      
      // Retry only the failed topics
      const retryTasks = failedTopics.map(({ broadTopic, subtopicKey, job }) => async () => {
        const topicData = BroadTopicsEnum[broadTopic];
        const subtopicLabel = topicData.subtopics[subtopicKey];
        const relevantPositions = topicMapping[topicData.label] || null;
        
        console.log(`🔄 Retrying ${broadTopic}.${subtopicKey} (${subtopicLabel})`);
        
        try {
          await retryOperation(async () => {
            console.log(`Attempting ${subtopicKey} retry generation...`);
            
            const RAGResponse = await retrieveTopicContext(userId, subtopicLabel);
            console.log(`RAG Response for ${subtopicLabel}:`, JSON.stringify(RAGResponse, null, 2));
        
            // Verify we have RAG data before proceeding
            if (!RAGResponse || !RAGResponse.matches) {
                throw new Error(`No RAG matches found for subtopic: ${subtopicLabel}`);
            }

            // Format RAG response for the completion
            const formattedRAGContext = RAGResponse.matches
              .map(match => {
                const description = match.description ? `Context: ${match.description}\n` : '';
                return `${description}${match.text}`;
              })
              .join('\n\n');

            console.log(`Getting completion for ${subtopicLabel} with formatted context length: ${formattedRAGContext.length}`);
            const response = await getCompletionShortOverviewForTopic(subtopicLabel, topicMapping[topicData.label] || '', formattedRAGContext);
            console.log(`Got completion for ${subtopicLabel}, response length: ${response?.length || 0}`);

            if (!response || typeof response !== 'string') {
              throw new Error(`Invalid response format for ${subtopicLabel}`);
            }

            results[broadTopic].subtopics[subtopicKey] = response;

            // Save the individual subtopic immediately
            await saveTopicAnalysis(userId, {
              [broadTopic]: {
                label: topicData.label,
                relevantPositions: relevantPositions,
                subtopics: { [subtopicKey]: response }
              }
            });
            console.log(`Topic ${subtopicKey} saved to database (retry)`);

            // Vectorize - but don't fail the whole task if this fails
            try {
              const description = `${topicData.label} - ${BroadTopicsEnum[broadTopic].subtopics[subtopicKey]}\n\nRelevant Positions:\n${relevantPositions || 'None specified'}`;
              console.log(`Processing text section for ${subtopicLabel} with description length: ${description.length}`);
              const topicRecords = await processTextSection(response, userId, description);
              console.log(`Generated ${topicRecords?.length || 0} records for ${subtopicLabel}`);

              if (topicRecords && topicRecords.length > 0) {
                await upsertRecords(topicRecords, userId);
                await updateVectorizationStatus(userId, { [`topicAnalysis.${broadTopic}.${subtopicKey}`]: true });
                console.log(`Topic ${subtopicKey} vectorized successfully (retry)`);
              } else {
                console.warn(`No records generated for ${subtopicLabel} (retry)`);
                await updateVectorizationStatus(userId, { [`topicAnalysis.${broadTopic}.${subtopicKey}`]: false });
              }
            } catch (vectorError) {
              console.error(`Failed to vectorize topic ${subtopicKey} (retry):`, vectorError.message);
              await updateVectorizationStatus(userId, { [`topicAnalysis.${broadTopic}.${subtopicKey}`]: false });
            }

            console.log(`Topic ${subtopicKey} retry completed`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }, 2); // 2 retries for each failed topic
          
        } catch (error) {
          // Final failure after all retries - save error message
          console.error(`Final failure for subtopic ${subtopicLabel} after workflow retries:`, error);
          const errorMessage = `Error: ${error.message}`;
          results[broadTopic].subtopics[subtopicKey] = errorMessage;
          
          // Save the error message to database so the content exists
          try {
            await saveTopicAnalysis(userId, {
              [broadTopic]: {
                label: topicData.label,
                relevantPositions: relevantPositions,
                subtopics: { [subtopicKey]: errorMessage }
              }
            });
            console.log(`Topic ${subtopicKey} saved to database (final workflow error)`);
            
            // Mark vectorization as failed since content generation failed
            await updateVectorizationStatus(userId, { [`topicAnalysis.${broadTopic}.${subtopicKey}`]: false });
            console.log(`Topic ${subtopicKey} vectorization marked as failed (final workflow error)`);
          } catch (saveError) {
            console.error(`Failed to save error message for topic ${subtopicKey}:`, saveError.message);
          }
        }
      });
      
      // Execute all retry tasks in parallel
      console.log(`Executing ${retryTasks.length} retry tasks...`);
      await Promise.all(retryTasks.map(fn => fn()));
      
      workflowRetryAttempt++;
      
      // Add delay between workflow retry attempts
      if (workflowRetryAttempt < maxWorkflowRetries) {
        console.log(`Waiting 5 seconds before next workflow retry attempt...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Final status check after all retries
    const finalAnalysisData = await getAllAnalysisByUserId(userId);
    const finalJobs = analyzeIncompleteJobs(finalAnalysisData);
    
    // Count remaining tasks
    let remainingTasks = 0;
    Object.values(finalJobs.topics).forEach((broadTopicJobs: any) => {
      Object.values(broadTopicJobs).forEach((job: any) => {
        if (job.needsGeneration || job.needsVectorization) remainingTasks++;
      });
    });
    
    if (remainingTasks === 0) {
      console.log('✅ All topics completed successfully after retries!');
      await updateVectorizationStatus(userId, {
        'topicAnalysis.isComplete': true,
        'topicAnalysis.completedAt': new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
      // Mark workflow as not running - completed successfully
      await updateWorkflowRunningStatus(userId, false, {
        'workflowStatus.completedSuccessfully': true
      });
    } else {
      console.log(`⚠️ Workflow completed with ${remainingTasks} remaining tasks after ${maxWorkflowRetries} retry attempts`);
      await updateVectorizationStatus(userId, {
        'topicAnalysis.isComplete': false,
        'topicAnalysis.completedWithFailures': true,
        'topicAnalysis.remainingTasks': remainingTasks,
        'topicAnalysis.completedAt': new Date().toISOString(),
        'topicAnalysis.maxRetriesReached': true,
        lastUpdated: new Date().toISOString()
      });
      // Mark workflow as not running - completed with failures
      await updateWorkflowRunningStatus(userId, false, {
        'workflowStatus.completedWithFailures': true,
        'workflowStatus.remainingTasks': remainingTasks
      });
    }

    console.log(`All content processing completed for userId: ${userId}`);

  } catch (error) {
    console.error(`Content processing failed for userId: ${userId}`, {
      error: error.message,
      stack: error.stack
    });
    // Mark workflow as not running - failed with error
    await updateWorkflowRunningStatus(userId, false, {
      'workflowStatus.error': error.message,
      'workflowStatus.errorAt': new Date()
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