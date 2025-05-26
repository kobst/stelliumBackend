import os from 'os';
import { join, dirname } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

import {
  getCompletionWithRagResponse,
  getCompletionShortOverview,
  getCompletionShortOverviewRelationships,
  getCompletionPlanets,
  getCompletionGptResponseGeneral,
  getCompletionGptResponseChatThread,
  getCompletionShortOverviewForTopic, 
  expandPrompt, 
  expandPromptRelationship,
  getCompletionGptResponseRelationshipChatThread
} from '../services/gptService.js';
// import { processUserQueryAndAnswer } from '../services/vectorize.js';
import { 
  generateRelevantNatalPositions, 
  generateNatalPromptsShortOverview,
  generateDominanceDescriptions,
  getPlanetDescription,
  generateTopicMapping
} from '../utilities/birthChartScoring.js';

import { generateDominancePrompt, generatePlanetPrompt } from '../utilities/birthChartAnalysis.js';
import { BroadTopicsEnum } from '../utilities/constants.js';
import { 
  retrieveTopicContext, 
  upsertRecords, 
  processTextSection, 
  processTextSectionRelationship,
  processUserQueryForBirthChartAnalysis,
  processUserQueryForRelationshipAnalysis
} from '../services/vectorize.js';
import {
  saveBasicAnalysis,
  saveTopicAnalysis,
  getBasicAnalysisByUserId,
  getUserSingle,
  getAllAnalysisByUserId,
  getTopicAnalysisByUserId,
  updateVectorizationStatus,
  updateRelationshipVectorizationStatus,
  fetchRelationshipAnalysisByCompositeId,
  getChatHistoryForBirthChartAnalysis,
  saveChatHistoryForBirthChartAnalysis,
  getChatHistoryForRelationshipAnalysis,
  saveChatHistoryForRelationshipAnalysis
} from '../services/dbService.js';

export async function handleUserQuery(req, res) {
  try {
    const { userId, query } = req.body;
    // const ragResponse = await processUserQueryAndAnswer(userId, query);
    console.log(userId)
    const gptResponse = await getCompletionWithRagResponse(query);

    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.json({ gptResponse });
  } catch (error) {
    res.status(500).send('Server error');
  }
}


// export async function handleGptResponseForSynastryChart(req, res) {
//   console.log("handleGptResponseForSynastryChart")
//   try {
//     const { heading, synastryChart } = req.body;
//     const response = await getCompletionGptResponseForSynastryChart(heading, synastryChart);
//     res.json({ response });
//   } catch (error) {
//     res.status(500).send('Server error');
//   }
// }


export async function handleShortOverviewResponse(req, res) {
  console.log("handleShortOverviewResponse")
  try {
    // console.log("req.body: ", req.body)
    const { birthData } = req.body
    // const birthDataDescriptions = generateNatalPrompts('shortOverall', birthData)
    // const relevantNatalPositions = generateRelevantNatalPositions('shortOverall', birthData)
    const relevantNatalPositions = generateNatalPromptsShortOverview(birthData)
    console.log("relevantNatalPositions: ", relevantNatalPositions)
    // const response = await getCompletionShortOverviewRelationships(birthDataDescriptions)
   const response = await getCompletionShortOverview(relevantNatalPositions)
    return res.json({ response })
  } catch (error) { 
    res.status(500).send('Server error');         
  }
}

export async function handleShortOverviewRomanticResponse(req, res) {

  try {
    const { birthData } = req.body
    // const birthDataDescriptions = generateNatalPrompts('shortOverall', birthData)
    const relevantNatalPositions = generateRelevantNatalPositions('shortRomantic', birthData)

    console.log("relevantNatalPositions: ", relevantNatalPositions)
    const response = await getCompletionShortOverviewRelationships(relevantNatalPositions)
    return res.json({ response })
  } catch (error) { 
    res.status(500).send('Server error');         
  }
}

export async function handleShortOverviewPlanetResponse(req, res) {
  console.log("handleShortOverviewPlanetResponse")
  try {
    const { planetName, birthData } = req.body
    const planetDescription = await getPlanetDescription(planetName, birthData)
    console.log("planetDescription: ", planetDescription)
    const response = await getCompletionPlanets(planetName, planetDescription)
    return res.json({ response })
  } catch (error) { 
    res.status(500).send('Server error');         
  }
}

export async function handleShortOverviewAllPlanetsResponse(req, res) {
  console.log("handleShortOverviewAllPlanetsResponse")
  const planets = ['Sun', 'Moon', 'Ascendant', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Node']
  
  try {
    const { birthData } = req.body
    
    // Process all planets in parallel
    const planetPromises = planets.map(async (planet) => {
      console.log("planet: ", planet)
      try {
        const planetDescriptions = await getPlanetDescription(planet, birthData)
        const response = await Promise.race([
          getCompletionPlanets(planet, planetDescriptions),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('GPT timeout')), 15000) // 15 second timeout
          )
        ])
        return [planet, response]
      } catch (error) {
        console.error(`Error processing ${planet}:`, error)
        return [planet, `Error processing ${planet}`]
      }
    })

    // Wait for all planets to be processed
    const results = await Promise.all(planetPromises)
    
    // Convert results array to object
    const responses = Object.fromEntries(results)
    
    return res.json({ responses })
  } catch (error) { 
    console.error('Server error:', error)
    res.status(500).send('Server error')
  }
}

export async function handleFetchAnalysis(req, res) {
    console.log("handleFetchAnalysis");
    const { userId } = req.body;
    
    try {
        const analysis = await getAllAnalysisByUserId(userId);
        
        if (!analysis) {
            return res.status(404).json({
                success: false,
                message: "No analysis found for this user"
            });
        }

        return res.json({
            success: true,
            birthChartAnalysisId: analysis.birthChartAnalysisId,  
            interpretation: analysis.interpretation,
            vectorizationStatus: analysis.vectorizationStatus
        });
    } catch (error) {
        console.error("Error fetching analysis:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// generate initial overview, dominance, and planets and save to log file

export async function handleBirthChartAnalysis(req, res) {
  console.log("handleBirthChartAnalysis")
  try {
    const { user } = req.body;

    console.log("user: ", user)
    console.log("birthData: ", user.birthChart)
    const birthData = user.birthChart
    const planets = ['Sun', 'Moon', 'Ascendant', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Node'];
    const dominanceCategories = ['modalities', 'elements', 'quadrants'];

    // Get overall birth chart context first
    const relevantNatalPositions = generateNatalPromptsShortOverview(birthData);
    const shortOverviewResponse = await getCompletionShortOverview(relevantNatalPositions);

    // Generate all dominance descriptions once
    const dominanceDescriptions = generateDominanceDescriptions(birthData);
    console.log("dominanceDescriptions: ", dominanceDescriptions)
    // Process dominance categories
    const dominancePromises = dominanceCategories.map(async (category) => {
      try {
        const dominanceDescription = dominanceDescriptions[category];
        console.log("dominanceDescription: ", dominanceDescription)
        const dominancePrompt = generateDominancePrompt(category, dominanceDescription, shortOverviewResponse);
        console.log("dominancePrompt: ", dominancePrompt)
        const response = await getCompletionGptResponseGeneral(dominancePrompt);
        console.log("dominance response: ", response)
        // return [category, response];
        return [category, {
          description: dominanceDescription,
          interpretation: response
        }];
      } catch (error) {
        console.error(`Error processing dominance category ${category}:`, error);
        return [category, `Error processing ${category}`];
      }
    });

    // Process planets
    const planetPromises = planets.map(async (planet) => {
      try {
        const planetDescriptions = getPlanetDescription(planet, birthData);
        console.log("planetDescriptions: ", planetDescriptions);
        const planetPrompt = generatePlanetPrompt(planet, planetDescriptions, shortOverviewResponse);
        console.log("planetPrompt: ", planetPrompt);
        const response = await getCompletionGptResponseGeneral(planetPrompt);
        console.log("planet response: ", response);
        return [planet, {
          description: planetDescriptions,
          interpretation: response
        }];
      } catch (error) {
        console.error(`Error processing planet ${planet}:`, error);
        return [planet, {
          description: null,
          interpretation: `Error processing ${planet}`,
          error: error.message
        }];
      }
    });

    // Wait for all promises to resolve
    const [dominanceResults, planetResults] = await Promise.all([
      Promise.all(dominancePromises),
      Promise.all(planetPromises)
    ]);

    // Convert arrays to objects for clearer structure
    const response = {
      overview: shortOverviewResponse,
      dominance: Object.fromEntries(dominanceResults),
      planets: Object.fromEntries(planetResults)
    };


    // copy this response to a file under /logBirthChart
    const logData = {
      timestamp: new Date().toISOString(),
      metadata: {
          userId: user._id|| 'unknown',
          userName: user.firstName + ' ' + user.lastName || 'unknown',
      },
      basicAnalysis: response
  };
  

    // Process birth chart analysis and wait for it
    // const result = await processBirthChartAnalysisLog(response, user._id);
    // console.log("Analysis processing result:", result);

    // Write to log and wait for it
    await writeToLog(logData);
    console.log("Log written successfully");

    // Save to database and wait for it
    const resultSave = await saveBasicAnalysis(user._id, logData);
    console.log("Save result:", resultSave);

    // If all operations succeeded, send response
    return res.json({
        success: true,
        data: response,
        processingDetails: {
            analysisProcessed: true,
            logWritten: true,
            savedToDatabase: true
        }
    });

  } catch (error) {
    console.error("Error in processing chain:", error);
    
    // Send error response
    return res.status(500).json({
        success: false,
        error: "Failed to process analysis completely",
        details: error.message,
        processingDetails: {
            analysisProcessed: false,
            logWritten: false,
            savedToDatabase: false
        }
    });
  }
}


export function writeToLog(logData, basicAnalysis = true) {
  console.log("logData: ", logData)

  // Create logs directory in system temp directory
  // Get the project root directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const rootDir = join(__dirname, '..');  // Go up one level from controllers to root


try {
  // Create logs directory in project root
  // if true, write to basicAnalysis. If false, write to topicAnalysis folder
  const logsDir = join(rootDir, 'logs', basicAnalysis ? 'basic-analysis' : 'topic-analysis');
  
  // Ensure directory exists
  mkdirSync(logsDir, { recursive: true });
  
  // Create filename with timestamp and userId
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `birth-chart-analysis-${logData.metadata.userId}-${timestamp}.json`;
  
  // Write log file
  writeFileSync(
      join(logsDir, fileName),
      JSON.stringify(logData, null, 2)
  );
  
  console.log(`Analysis logged to: ${join(logsDir, fileName)}`);
} catch (error) {
  console.error('Error writing log file:', error);
  // Don't throw - logging failure shouldn't affect the response
}
}


export async function handleVectorizeBirthChartAnalysisLog(req, res) {
    console.log("handleVectorizeBirthChartAnalysisLog");
    const { userId, section = 'overview', index = 0 } = req.body;
    try {
        const birthChartBasicAnalysis = await getBasicAnalysisByUserId(userId);
        console.log(`Processing section: ${section}, index: ${index}`);
        
        let nextSection = section;
        let nextIndex = index;
        let recordCount = 0;

        // Track vectorization status
        const vectorizationStatus = {
            section,
            success: false
        };

        switch(section) {
            case 'overview':
                if (birthChartBasicAnalysis.overview) {
                    const overviewRecords = await processTextSection(
                        birthChartBasicAnalysis.overview,
                        userId,
                        "Overview"
                    );
                    await upsertRecords(overviewRecords, userId);
                    recordCount = overviewRecords.length;
                    
                    // Mark overview as vectorized
                    await updateVectorizationStatus(userId, 'overview', true);
                }
                nextSection = 'planets';
                nextIndex = 0;
                break;

            case 'planets':
                const planetEntries = Object.entries(birthChartBasicAnalysis.planets || {});
                if (index < planetEntries.length) {
                    const [planet, data] = planetEntries[index];
                    const planetRecords = await processTextSection(
                        data.interpretation,
                        userId,
                        data.description
                    );
                    await upsertRecords(planetRecords, userId);
                    recordCount = planetRecords.length;
                    
                    // Mark this planet as vectorized
                    await updateVectorizationStatus(userId, 'planets', true, planet);
                    
                    nextIndex = index + 1;
                    if (nextIndex >= planetEntries.length) {
                        nextSection = 'dominance';
                        nextIndex = 0;
                    }
                }
                break;

            case 'dominance':
                const dominanceEntries = Object.entries(birthChartBasicAnalysis.dominance || {});
                if (index < dominanceEntries.length) {
                    const [category, data] = dominanceEntries[index];
                    const dominanceRecords = await processTextSection(
                        data.interpretation,
                        userId,
                        data.description
                    );
                    await upsertRecords(dominanceRecords, userId);
                    recordCount = dominanceRecords.length;
                    
                    // Mark this dominance category as vectorized
                    await updateVectorizationStatus(userId, 'dominance', true, category);
                    
                    nextIndex = index + 1;
                    if (nextIndex >= dominanceEntries.length) {
                        nextSection = 'complete';
                        nextIndex = 0;
                    }
                }
                break;
        }

        const isComplete = nextSection === 'complete';
        if (isComplete) {
            // Mark entire basic analysis as fully vectorized
            await updateVectorizationStatus(userId, 'basicAnalysis', true);
        }
        
        return res.json({
            success: true,
            recordCount,
            isComplete,
            nextSection,
            nextIndex
        });
    } catch (error) {
        console.error("Error processing birth chart analysis:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}







// export async function handleBirthChartTopicAnalysis(req, res) {


//     console.log("handleBirthChartTopicAnalysis");
//     const { userId } = req.body;
//     console.log("userId: ", userId);
//     const allResults = {};

//     // Send initial response to keep connection alive
//     res.writeHead(200, {
//         'Content-Type': 'application/json',
//         'Transfer-Encoding': 'chunked'
//     });

//     try {
//         const user = await getUserSingle(userId);
//         const birthData = user.birthChart;
//         const relevantMappings = generateTopicMapping(birthData);

//         // Process topics in batches
//         const BATCH_SIZE = 3; // Process 3 topics at a time
//         const topics = Object.entries(BroadTopicsEnum);
        
//         for (let i = 0; i < topics.length; i += BATCH_SIZE) {
//             const batch = topics.slice(i, i + BATCH_SIZE);
            
//             // Process batch in parallel
//             const batchPromises = batch.map(async ([broadTopic, topicData]) => {
//                 try {
//                     const relevantNatalPositions = relevantMappings[topicData.label];
//                     if (!relevantNatalPositions) {
//                         console.error(`No natal positions found for topic: ${topicData.label}`);
//                         return [broadTopic, {
//                             label: topicData.label,
//                             relevantPositions: null,
//                             subtopics: {}
//                         }];
//                     }

//                     // Process subtopics with timeout protection
//                     const subtopicResults = {};
//                     const subtopicEntries = Object.entries(topicData.subtopics);
                    
//                     for (const [subtopicKey, subtopicLabel] of subtopicEntries) {
//                         try {
//                             const RAGResponse = await Promise.race([
//                                 retrieveTopicContext(userId, subtopicLabel),
//                                 new Promise((_, reject) => 
//                                     setTimeout(() => reject(new Error('RAG timeout')), 30000)
//                                 )
//                             ]);

//                             if (!RAGResponse?.matches) {
//                                 subtopicResults[subtopicKey] = "No relevant context found";
//                                 continue;
//                             }

//                             const formattedRAGContext = RAGResponse.matches
//                                 .map(match => `${match.description ? `Context: ${match.description}\n` : ''}${match.text}`)
//                                 .join('\n\n');

//                             const completion = await Promise.race([
//                                 getCompletionShortOverviewForTopic(
//                                     subtopicLabel,
//                                     relevantNatalPositions,
//                                     formattedRAGContext
//                                 ),
//                                 new Promise((_, reject) => 
//                                     setTimeout(() => reject(new Error('Completion timeout')), 30000)
//                                 )
//                             ]);

//                             subtopicResults[subtopicKey] = completion;

//                         } catch (error) {
//                             console.error(`Error processing subtopic ${subtopicLabel}:`, error);
//                             subtopicResults[subtopicKey] = `Error: ${error.message}`;
//                         }

//                         // Send progress update
//                         res.write(JSON.stringify({ 
//                             type: 'progress', 
//                             topic: broadTopic, 
//                             subtopic: subtopicKey,
//                             status: 'completed'
//                         }) + '\n');
//                     }

//                     return [broadTopic, {
//                         label: topicData.label,
//                         relevantPositions: relevantNatalPositions,
//                         subtopics: subtopicResults
//                     }];
//                 } catch (error) {
//                     console.error(`Error processing topic ${broadTopic}:`, error);
//                     return [broadTopic, { error: error.message }];
//                 }
//             });

//             // Wait for batch to complete and merge results
//             const batchResults = await Promise.all(batchPromises);
//             batchResults.forEach(([topic, result]) => {
//                 allResults[topic] = result;
//             });
//         }

//         const logData = {
//             timestamp: new Date().toISOString(),
//             metadata: {
//                 userId: userId || 'unknown',
//             },
//             topicAnalysis: allResults
//         };

//         // Handle logging and database operations in parallel
//         await Promise.all([
//             writeToLog(logData, false),
//             saveTopicAnalysis(userId, allResults)
//         ]);

//         // Send final response
//         res.write(JSON.stringify({
//             type: 'complete',
//             success: true,
//             results: allResults,
//             processingDetails: {
//                 logWritten: true,
//                 savedToDatabase: true
//             }
//         }));
//         res.end();

//     } catch (error) {
//         console.error("Error in handleBirthChartTopicAnalysis:", error);
//         res.write(JSON.stringify({
//             type: 'error',
//             success: false,
//             error: error.message
//         }));
//         res.end();
//     }
// }


// Main endpoint that client calls first to initiate analysis

//this times out, not usable
export async function handleBirthChartTopicAnalysis(req, res) {
    const { userId, topic } = req.body;
    console.log("handleBirthChartTopicAnalysis for userId:", userId, "topic:", topic);

    try {
        const user = await getUserSingle(userId);
        const birthData = user.birthChart;
        const relevantMappings = generateTopicMapping(birthData);

        // If topic is specified, only process that topic
        const topicsToProcess = topic 
            ? { [topic]: BroadTopicsEnum[topic] }
            : BroadTopicsEnum;

        const results = {};
        
        for (const [broadTopic, topicData] of Object.entries(topicsToProcess)) {
            const relevantNatalPositions = relevantMappings[topicData.label];
            const subtopicResults = {};

            for (const [subtopicKey, subtopicLabel] of Object.entries(topicData.subtopics)) {
                try {
                    const RAGResponse = await retrieveTopicContext(userId, subtopicLabel);
                    
                    if (!RAGResponse?.matches) {
                        subtopicResults[subtopicKey] = "No relevant context found";
                        continue;
                    }

                    const formattedRAGContext = RAGResponse.matches
                        .map(match => {
                            const description = match.description ? `Context: ${match.description}\n` : '';
                            return `${description}${match.text}`;
                        })
                        .join('\n\n');

                    const completion = await getCompletionShortOverviewForTopic(
                        subtopicLabel,
                        relevantNatalPositions,
                        formattedRAGContext
                    );

                    subtopicResults[subtopicKey] = completion;

                } catch (error) {
                    console.error(`Error processing subtopic ${subtopicLabel}:`, error);
                    subtopicResults[subtopicKey] = `Error: ${error.message}`;
                }
            }

            results[broadTopic] = {
                label: topicData.label,
                relevantPositions: relevantNatalPositions,
                subtopics: subtopicResults
            };

            // Save results for this topic
            await saveTopicAnalysis(userId, { [broadTopic]: results[broadTopic] });
        }

        res.json({
            success: true,
            results: results
        });

    } catch (error) {
        console.error("Error in handleBirthChartTopicAnalysis:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}



export async function handleSubtopicAnalysis(req, res) {
  const { userId, broadTopic, subtopicKey, subtopicLabel } = req.body;
  console.log(`Processing subtopic: ${subtopicLabel} for user: ${userId}`);

  try {
      const user = await getUserSingle(userId);
      const birthData = user.birthChart;
      const relevantMappings = generateTopicMapping(birthData);
      
      const topicData = BroadTopicsEnum[broadTopic];
      const relevantNatalPositions = relevantMappings[topicData.label];

      // Get RAG response
      const RAGResponse = await retrieveTopicContext(userId, subtopicLabel);
      
      if (!RAGResponse?.matches) {
          return res.json({
              success: true,
              result: "No relevant context found"
          });
      }

      const formattedRAGContext = RAGResponse.matches
          .map(match => {
              const description = match.description ? `Context: ${match.description}\n` : '';
              return `${description}${match.text}`;
          })
          .join('\n\n');

      // Get completion
      const completion = await getCompletionShortOverviewForTopic(
          subtopicLabel,
          relevantNatalPositions,
          formattedRAGContext
      );

      // Save just this subtopic result
      const subtopicResult = {
          [broadTopic]: {
              label: topicData.label,
              relevantPositions: relevantNatalPositions,
              subtopics: {
                  [subtopicKey]: completion
              }
          }
      };
      
      await saveTopicAnalysis(userId, subtopicResult);

      res.json({
          success: true,
          result: completion
      });

  } catch (error) {
      console.error(`Error processing subtopic ${subtopicLabel}:`, error);
      res.status(500).json({
          success: false,
          error: error.message
      });
  }
}







export async function handleVectorizeTopicAnalysis(req, res) {
    console.log("handleVectorizeTopicAnalysis");
    const { userId, topic = null, subtopic = null } = req.body;
    
    try {
        const topicAnalysis = await getTopicAnalysisByUserId(userId);
        console.log(`Processing topic: ${topic}, subtopic: ${subtopic}`);
        
        let nextTopic = topic;
        let nextSubtopic = subtopic;
        let recordCount = 0;
        let isComplete = false;

        // If no topic specified, start with first topic
        if (!topic) {
            nextTopic = Object.keys(BroadTopicsEnum)[0];
            nextSubtopic = Object.keys(BroadTopicsEnum[nextTopic].subtopics)[0];
            return res.json({
                success: true,
                nextTopic,
                nextSubtopic,
                isComplete: false
            });
        }

        // Process the current topic and subtopic
        const topicData = topicAnalysis[topic];
        if (topicData && topicData.subtopics[subtopic]) {
            const description = `${topicData.label} - ${BroadTopicsEnum[topic].subtopics[subtopic]}\n\nRelevant Positions:\n${topicData.relevantPositions}`;
            
            const subtopicRecords = await processTextSection(
                topicData.subtopics[subtopic],
                userId,
                description
            );
            await upsertRecords(subtopicRecords, userId);
            recordCount = subtopicRecords.length;

            // Mark this subtopic as vectorized
            await updateVectorizationStatus(userId, 'topicAnalysis', true, {
                topic,
                subtopic
            });

            // Calculate next subtopic/topic
            const currentTopicSubtopics = Object.keys(BroadTopicsEnum[topic].subtopics);
            const currentSubtopicIndex = currentTopicSubtopics.indexOf(subtopic);
            
            if (currentSubtopicIndex < currentTopicSubtopics.length - 1) {
                // Move to next subtopic in current topic
                nextSubtopic = currentTopicSubtopics[currentSubtopicIndex + 1];
            } else {
                // Move to next topic
                const allTopics = Object.keys(BroadTopicsEnum);
                const currentTopicIndex = allTopics.indexOf(topic);
                
                if (currentTopicIndex < allTopics.length - 1) {
                    nextTopic = allTopics[currentTopicIndex + 1];
                    nextSubtopic = Object.keys(BroadTopicsEnum[nextTopic].subtopics)[0];
                } else {
                    // All topics complete
                    isComplete = true;
                    nextTopic = null;
                    nextSubtopic = null;
                    await updateVectorizationStatus(userId, 'topicAnalysis', true);
                }
            }
        }

        return res.json({
            success: true,
            recordCount,
            isComplete,
            nextTopic,
            nextSubtopic
        });

    } catch (error) {
        console.error("Error processing topic analysis:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}


export async function handleVectorizeRelationshipAnalysis(req, res) {
  console.log("handleVectorizeRelationshipAnalysis");
  const { compositeChartId, category = null } = req.body;
  
  try {
      // Get the relationship analysis document
      const relationshipAnalysis = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
      if (!relationshipAnalysis) {
          return res.status(404).json({
              success: false,
              error: "Relationship analysis not found"
          });
      }
      
      console.log(`Processing category: ${category}`);
      
      // Define the categories enum based on your document structure
      const RelationshipCategoriesEnum = {
          OVERALL_ATTRACTION_CHEMISTRY: { label: "Overall Attraction & Chemistry" },
          EMOTIONAL_SECURITY_CONNECTION: { label: "Emotional Security & Connection" },
          SEX_AND_INTIMACY: { label: "Sex & Intimacy" },
          COMMUNICATION_AND_MENTAL_CONNECTION: { label: "Communication & Mental Connection" },
          COMMITMENT_LONG_TERM_POTENTIAL: { label: "Commitment & Long-Term Potential" },
          KARMIC_LESSONS_GROWTH: { label: "Karmic Lessons & Growth" },
          PRACTICAL_GROWTH_SHARED_GOALS: { label: "Practical Growth & Shared Goals" }
      };
      
      let nextCategory = category;
      let recordCount = 0;
      let isComplete = false;

      // If no category specified, start with first category
      if (!category) {
          nextCategory = Object.keys(RelationshipCategoriesEnum)[0];
          return res.json({
              success: true,
              nextCategory,
              isComplete: false
          });
      }

      // Process the current category
      if (
          relationshipAnalysis.analysis &&
          relationshipAnalysis.analysis[category] &&
          typeof relationshipAnalysis.analysis[category] === 'object' && // Ensure it's the new object structure
          relationshipAnalysis.analysis[category].interpretation // Check for the interpretation text
      ) {
          const categoryData = relationshipAnalysis.analysis[category];
          const interpretationText = categoryData.interpretation; // Get the interpretation text
          const relevantPositionData = categoryData.relevantPosition; // Get the relevant astrological positions

          const { userAName, userBName } = relationshipAnalysis.debug.inputSummary;
          
          const description = `Relationship Analysis - ${RelationshipCategoriesEnum[category].label} between ${userAName} and ${userBName}`;
          
          // Process the text and create vector embeddings
          const categoryRecords = await processTextSectionRelationship(
              interpretationText,     // Pass the interpretation text
              compositeChartId,
              description,
              category,
              relevantPositionData  // Pass the relevant astrological positions
          );
          
          // Save the vector records
          const nameSpaceId = `relationship_${compositeChartId}`;
          await upsertRecords(categoryRecords, nameSpaceId);
          recordCount = categoryRecords.length;

          // Mark this category as vectorized
          await updateRelationshipVectorizationStatus(compositeChartId, 'relationshipAnalysis', true, {
              category
          });

          // Calculate next category
          const allCategories = Object.keys(RelationshipCategoriesEnum);
          const currentCategoryIndex = allCategories.indexOf(category);
          
          if (currentCategoryIndex < allCategories.length - 1) {
              // Move to next category
              nextCategory = allCategories[currentCategoryIndex + 1];
          } else {
              // All categories complete
              isComplete = true;
              nextCategory = null;
              await updateRelationshipVectorizationStatus(compositeChartId, 'relationshipAnalysis', true);
          }
      } else {
          console.warn(`Category ${category} not found in relationship analysis`);
      }

      return res.json({
          success: true,
          recordCount,
          isComplete,
          nextCategory
      });

  } catch (error) {
      console.error("Error processing relationship analysis:", error);
      return res.status(500).json({
          success: false,
          error: error.message
      });
  }
}

export const handleProcessUserQueryForBirthChartAnalysis = async (req, res) => {
    console.log("handleProcessUserQueryForBirthChartAnalysis");
    
    try {
        const { userId, birthChartAnalysisId, query } = req.body;
        
        // Validate required parameters
        if (!userId || !birthChartAnalysisId || !query) {
            return res.status(400).json({ 
                success: false, 
                error: "Missing required parameters: userId, birthChartAnalysisId, and query are required" 
            });
        }
        
        console.log("userId: ", userId);
        console.log("birthChartAnalysisId: ", birthChartAnalysisId);
        console.log("query: ", query);
        
        const expandedQuery = await expandPrompt(query);
        const chatHistory = await getChatHistoryForBirthChartAnalysis(userId, birthChartAnalysisId);

        console.log("expandedQuery: ", expandedQuery);
        const contextFromAnalysis = await processUserQueryForBirthChartAnalysis(userId, expandedQuery);
        console.log("expandedQueryWithContext: ", contextFromAnalysis);
        
        const answer = await getCompletionGptResponseChatThread(query, contextFromAnalysis, chatHistory);
        const result = await saveChatHistoryForBirthChartAnalysis(userId, birthChartAnalysisId, query, answer);
        
        console.log("result: ", result);
        res.json({ success: true, result, answer });
        
    } catch (error) {
        console.error("Error in handleProcessUserQueryForBirthChartAnalysis:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

export const handleFetchUserChatBirthChartAnalysis = async (req, res) => {
    console.log("handleFetchUserChatBirthChartAnalysis");
    const { userId, birthChartAnalysisId } = req.body;
    const chatHistory = await getChatHistoryForBirthChartAnalysis(userId, birthChartAnalysisId);
    res.json({ success: true, chatHistory });
}


export const handleProcessUserQueryForRelationshipAnalysis = async (req, res) => {
  console.log("handleProcessUserQueryForRelationshipAnalysis");
  
  try {
      const { userId, compositeChartId, query } = req.body;
      
      // Validate required parameters
      if (!userId || !compositeChartId || !query) {
          return res.status(400).json({ 
              success: false, 
              error: "Missing required parameters: userId, compositeChartId, and query are required" 
          });
      }
      
      console.log("userId: ", userId);
      console.log("compositeChartId: ", compositeChartId);
      console.log("query: ", query);
      
      const expandedQuery = await expandPromptRelationship(query);
      const chatHistory = await getChatHistoryForRelationshipAnalysis(userId, compositeChartId);

      console.log("expandedQuery: ", expandedQuery);

      const relationshipAnalysis = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
      if (!relationshipAnalysis || !relationshipAnalysis.debug || !relationshipAnalysis.debug.inputSummary) {
          return res.status(404).json({
              success: false,
              error: "Relationship analysis not found for this compositeChartId"
          });
      }

      const { userAId, userBId, userAName, userBName } = relationshipAnalysis.debug.inputSummary;

      const [contextFromAnalysis, contextFromUserA, contextFromUserB] = await Promise.all([
          processUserQueryForRelationshipAnalysis(compositeChartId, expandedQuery),
          processUserQueryForBirthChartAnalysis(userAId, expandedQuery),
          processUserQueryForBirthChartAnalysis(userBId, expandedQuery)
      ]);

      console.log("relationship RAG context: ", contextFromAnalysis);
      console.log("userA RAG context: ", contextFromUserA);
      console.log("userB RAG context: ", contextFromUserB);

      const answer = await getCompletionGptResponseRelationshipChatThread(
          query,
          contextFromAnalysis,
          contextFromUserA,
          contextFromUserB,
          chatHistory,
          userAName,
          userBName
      );
      const result = await saveChatHistoryForRelationshipAnalysis(userId, compositeChartId, query, answer);
      
      console.log("result: ", result);
      res.json({ success: true, result, answer });
      
  } catch (error) {
      console.error("Error in handleProcessUserQueryForBirthChartAnalysis:", error);
      res.status(500).json({ 
          success: false, 
          error: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
  }
}


export const handleFetchUserChatRelationshipAnalysis = async (req, res) => {
  console.log("handleFetchUserChatRelationshipAnalysis");
  const { userId, compositeChartId } = req.body;
  const chatHistory = await getChatHistoryForRelationshipAnalysis(userId, compositeChartId);
  res.json({ success: true, chatHistory });
}