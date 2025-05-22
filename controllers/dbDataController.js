import { 
    getDailyTransits, 
    getDailyAspects, 
    getPeriodAspects, 
    getRetrogrades, 
    getRetrogradesForDateRange,
    getPeriodTransits,
    getPeriodTransitsObject, 
    getBirthChart, 
    saveUser, 
    saveCompositeChart,
    getCompositeCharts,
    getCompositeChartInterpretation,
    saveCompositeChartInterpretation,
    saveSynastryChartInterpretation,
    getSynastryInterpretation,
    getUsers,
    getUserSingle,
    saveUserTransitAspects, 
    getPeriodAspectsForUser,
    saveBirthChartInterpretation,
    getBirthChartInterpretation,
    saveDailyTransitInterpretationData,
    saveWeeklyTransitInterpretationData,
    getWeeklyTransitInterpretationData,
    upsertVectorizedInterpretation,
    saveRelationshipScoring,
    fetchRelationshipAnalysisByCompositeId,
    getDailyTransitInterpretationData,
    saveRelationshipAnalysis
} from '../services/dbService.js'

import { findDailyTransitAspectsForBirthChart, 
    createGroupedTransitObjects, 
    findAspectsForBirthChart,
    trackPlanetaryTransits,
    trackPlanetaryHouses,
    
    } from '../utilities/archive/generateTransitAspects.js'

import { scoreRelationshipCompatibility } from '../utilities/relationshipScoring.js';
// import {scoreBirthChart} from '../utilities/birthChartScoring.js'

import { findSynastryAspects, generateCompositeChart } from '../utilities/archive/generateSynastryAspects.js';
import { processInterpretationSection, 
    processCompositeChartInterpretationSection, 
    processSynastryChartInterpretationSection,
    getRelationshipCategoryContextForUser
 } from '../services/vectorize.js';

 import { generateRelationshipPrompt, getCompletionGptResponseGeneral} from '../services/gptService.js';
 import { RELATIONSHIP_CATEGORIES } from '../utilities/relationshipScoringConstants.js';

// all GENERAL DAILY ASPECTS/TRANSITS 
export async function handleDailyTransits (req, res) {
    try {
        const date = req.body.date;
        const transits = await getDailyTransits(date);
        res.status(200).json(transits);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export async function handleDailyAspects (req, res) {
    try {
        const date = req.body.date;
        const aspects = await getDailyAspects(date);
        res.status(200).json(aspects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// all GENERAL DAILY ASPECTS fro a period of dates
export async function handlePeriodTransits (req, res) {
    try {
        const { startDate, endDate } = req.body;
        const transits = await getPeriodTransitsObject(startDate, endDate);
        res.status(200).json(transits);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handlePeriodAspects (req, res)  {
    try {
        const { startDate, endDate } = req.body;
        const aspects = await getPeriodAspects(startDate, endDate);
      
        res.status(200).json(aspects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleRetrogrades (req, res) {
    try {
        const date = req.body.date;
        const retrogrades = await getRetrogrades(date);
        res.status(200).json(retrogrades);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleRetrogradesForDateRange (req, res) {
    try {
        const { startDate, endDate } = req.body;
        const retrogrades = await getRetrogradesForDateRange(startDate, endDate);
        res.status(200).json(retrogrades);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function generateSummaryTransitSignsForPeriod (req, res) {
    try {
        const { startDate, endDate } = req.body;

        const transitData = await getPeriodTransits(startDate, endDate);
       
        const transits = trackPlanetaryTransits(transitData);
        res.status(200).json(transits);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



// all BIRTHCHART SPECIFIC DAILY ASPECTS/TRANSITS 
export async function generatePeriodAspectsForChart (req, res) {
    try {
        const { startDate, endDate, birthChart } = req.body;
        console.log(startDate)
        console.log(endDate)
        const groupedTransits = await getPeriodTransits(startDate, endDate);
        const transits = findDailyTransitAspectsForBirthChart(groupedTransits, birthChart) 
        const groupedAspects = createGroupedTransitObjects(transits)
        res.status(200).json(groupedAspects);
        // TODO: save this to database
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export async function generateSummaryTransitHousesforBirthChart (req, res) {
    try {
        const { startDate, endDate, birthChartHouses } = req.body;
        console.log(startDate)
        console.log(endDate)
        console.log(birthChartHouses)
        const transitData = await getPeriodTransits(startDate, endDate);
        const transits = trackPlanetaryHouses(transitData, birthChartHouses);
        console.log(transits)
        res.status(200).json(transits);
        // TODO: save transits to databse

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// produces the full summary of transits for the birthchart for a given period of dates and USER ID, 
//saves to the user_transit_aspects collection
export async function generateSummaryTransitsForUser(req, res) {
    console.log("generateSummaryTransitsForUser")
    try {
        const { startDate, endDate, userId } = req.body;
        console.log("Generating summary transits for:", { userId, startDate, endDate });

        // get the birthchart for the user
        const birthChart = await getBirthChart(userId);
        console.log("Birth chart planets:", birthChart.planets.length);

        const groupedTransits = await getPeriodTransits(startDate, endDate);
        const transits = findDailyTransitAspectsForBirthChart(groupedTransits, birthChart.planets);
        const groupedAspects = createGroupedTransitObjects(transits);

        // Save grouped aspects using the new service function
        const saveResult = await saveUserTransitAspects(groupedAspects, userId);

        res.status(200).json({
            success: true,
            message: "Summary transits generated and saved successfully",
            data: {
                userId,
                startDate,
                endDate,
                aspectsCount: groupedAspects.length,
                saveResult: {
                    upsertedId: saveResult.upsertedId
                }
            },
            groupedAspects
        });
    } catch (error) {
        console.error("Error in generateSummaryTransitsForUser:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate and save summary transits",
            error: error.message
        });
    }
};


export async function handleGetUsers(req, res) {
    console.log("handleGetUsers")
    try {
        const users = await getUsers();
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleGetUserSingle(req, res) {
    console.log("handleGetUserSingle")
    try {
        const { userId } = req.body;
        const user = await getUserSingle(userId);
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleGetCompositeCharts(req, res) {
    console.log("handleGetCompositeCharts")
    try {
        const compositeCharts = await getCompositeCharts();
        res.status(200).json(compositeCharts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// still needs to be done.....
export async function handleSaveUserProfile(req, res) {
    console.log("handleSaveUserProfile")
    try {
        const { email, firstName, lastName, dateOfBirth, placeOfBirth, time, totalOffsetHours, birthChart } = req.body;
        console.log("dateOfBirth: ", dateOfBirth)
        const aspectsComputed = findAspectsForBirthChart(birthChart.planets);
        birthChart.aspectsComputed = aspectsComputed;

        const user = { 
            email, 
            firstName, 
            lastName, 
            dateOfBirth, 
            placeOfBirth, 
            time, 
            totalOffsetHours, 
            birthChart
        };

        const result = await saveUser(user);
        console.log("insertedId: ", result.insertedId)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.status(200).json({ userId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export async function handleSaveCompositeChartProfile(req, res) {
    console.log("handleSaveCompositeChartProfile");
    try {
        const { userA_id, userB_id, userA_dateOfBirth, userB_dateOfBirth, userA_name, userB_name, synastryAspects, compositeBirthChart } = req.body;
        
        // Check if all required fields are present
        if (!userA_id || !userB_id || !userA_dateOfBirth || !userB_dateOfBirth || !userA_name || !userB_name || !synastryAspects || !compositeBirthChart) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const compositeChart = {
            userA_id,
            userB_id,
            userA_dateOfBirth,
            userB_dateOfBirth,
            userA_name,
            userB_name,
            synastryAspects,
            compositeBirthChart
        };

        console.log("saveCompositeChart", compositeChart);

        const result = await saveCompositeChart(compositeChart);
        console.log("insertedId: ", result.insertedId);
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.status(200).json({ compositeChartId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// maybe refactor to just take the birthchart and find the natal aspects
// Do I need this anymore?
export async function handleSingleTransitAspectsForChart (req, res) {
    try {
        const { transits, birthChart } = req.body;
        const groupedTransits = await findDailyTransitAspectsForBirthChart(transits, birthChart)
        res.status(200).json(groupedTransits);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handlePeriodAspectsForUser (req, res)  {
    try {
        const { startDate, endDate, userId } = req.body;
        const aspects = await getPeriodAspectsForUser(startDate, endDate, userId);
      
        res.status(200).json(aspects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleSaveBirthChartInterpretation(req, res) {
    console.log("handleSaveBirthChartInterpretation")
    try {
        const { userId, heading, promptDescription, interpretation } = req.body;
        const result = await saveBirthChartInterpretation(userId, heading, promptDescription, interpretation);
        await upsertVectorizedInterpretation(userId, heading, promptDescription, interpretation);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleSaveCompositeChartInterpretation(req, res) {
    console.log("handleSaveCompositeChartInterpretation")
    try {
        const { compositeChartId, heading, promptDescription, interpretation } = req.body;
        const result = await saveCompositeChartInterpretation(compositeChartId, heading, promptDescription, interpretation);
        await processCompositeChartInterpretationSection(compositeChartId, heading, promptDescription, interpretation);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleSaveSynastryChartInterpretation(req, res) {
    console.log("handleSaveSynastryChartInterpretation")
    try {
        const { compositeChartId, heading, promptDescription, interpretation} = req.body;
        const result = await saveSynastryChartInterpretation(compositeChartId, heading, promptDescription, interpretation);
        await processSynastryChartInterpretationSection(compositeChartId, heading, promptDescription, interpretation);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleGetBirthChartInterpretation(req, res) {
    try {
        const { userId } = req.body;
        const interpretation = await getBirthChartInterpretation(userId);
        res.status(200).json(interpretation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleGetCompositeChartInterpretation(req, res) {
    try {
        const { compositeChartId } = req.body;
        const interpretation = await getCompositeChartInterpretation(compositeChartId);
        res.status(200).json(interpretation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleGetSynastryChartInterpretation(req, res) {
    try {
        const { compositeChartId } = req.body;
        const interpretation = await getSynastryInterpretation(compositeChartId);
        res.status(200).json(interpretation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



export async function handleSaveDailyTransitInterpretationData(req, res) {
    console.log("handleSaveDailyTransitInterpretationData")
    console.log(req.body)
    try {
        const { date, combinedAspectsDescription, dailyTransitInterpretation } = req.body;
        const dailyTransit = await saveDailyTransitInterpretationData(date, combinedAspectsDescription, dailyTransitInterpretation);
        res.status(200).json({ message: 'Daily transit data saved successfully', dailyTransit });
      } catch (error) {
        console.error('Error saving daily transit data:', error);
        res.status(500).json({ message: 'Error saving daily transit data', error: error.message });
      }
}

export async function handleGetDailyTransitInterpretationData(req, res) {
    console.log("handleGetDailyTransitInterpretationData")
    try {
        const { date } = req.body;
        const dailyTransit = await getDailyTransitInterpretationData(date);
        res.status(200).json(dailyTransit);
    } catch (error) {
        console.error('Error getting daily transit data:', error);
        res.status(500).json({ message: 'Error getting daily transit data', error: error.message });
    }
}


export async function handleSaveWeeklyTransitInterpretationData(req, res) {
    console.log("handleSaveWeeklyTransitInterpretationData")
    console.log(req.body)
    try {
        const { date, combinedAspectsDescription, weeklyTransitInterpretation, sign } = req.body;
        const weeklyTransit = await saveWeeklyTransitInterpretationData(date, combinedAspectsDescription, weeklyTransitInterpretation, sign);
        res.status(200).json({ message: 'Weekly transit data saved successfully', weeklyTransit });
    } catch (error) {
        console.error('Error saving weekly transit data:', error);          
        res.status(500).json({ message: 'Error saving weekly transit data', error: error.message });
    }
}

export async function handleGetWeeklyTransitInterpretationData(req, res) {
    console.log("handleGetWeeklyTransitInterpretationData")
    try {
        const { date } = req.body;
        const weeklyTransit = await getWeeklyTransitInterpretationData(date);
        res.status(200).json(weeklyTransit);
    } catch (error) {
        console.error('Error getting weekly transit data:', error);
        res.status(500).json({ message: 'Error getting weekly transit data', error: error.message });
    }
}           


export async function handleFindSynastryAspects(req, res) {
    console.log("handleFindSynastryAspects")
    try {
        const { birthData_1, birthData_2 } = req.body;
        // console.log("birthData_1: ", birthData_1.planets )
        // console.log("birthData_2: ", birthData_2.planets)
        const synastryAspects = await findSynastryAspects(birthData_1.planets, birthData_2.planets);
        res.status(200).json(synastryAspects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function handleGenerateCompositeChart(req, res) {
    console.log("handleGenerateCompositeChart")
    try {
        const { birthChart1, birthChart2 } = req.body;
        console.log("birthChart1: ", birthChart1.planets[0])
        console.log("birthChart2: ", birthChart2.planets[0])
        const compositeChart = await generateCompositeChart(birthChart1, birthChart2);
        res.status(200).json(compositeChart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function handleGetRelationshipScore(req, res) {
    console.log("handleGetRelationshipScore")
    try {
        const { synastryAspects, compositeChart, userA, userB, compositeChartId } = req.body;
        const relationshipScore = await scoreRelationshipCompatibility(synastryAspects, compositeChart, userA, userB, compositeChartId);
        const saveResult = await saveRelationshipScoring(relationshipScore);
        res.status(200).json({ relationshipScore, saveResult });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


export async function handleFetchRelationshipAnalysis(req, res) {
    console.log("handleFetchRelationshipAnalysis")
    try {
        const { compositeChartId } = req.body;
        const relationshipScore = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
        res.status(200).json(relationshipScore);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function handleGenerateRelationshipAnalysis(req, res) {
    console.log("handleGenerateRelationshipAnalysis called");
    try {
        const { compositeChartId } = req.body;
        if (!compositeChartId) {
            return res.status(400).json({ error: "compositeChartId is required." });
        }

        // 1. Fetch Relationship Analysis Document
        const relationshipAnalysis = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
        if (!relationshipAnalysis || !relationshipAnalysis.debug || !relationshipAnalysis.debug.inputSummary) {
            return res.status(404).json({ error: "Relationship analysis data not found or incomplete for the given compositeChartId." });
        }
        console.log(`Fetched relationship analysis for compositeChartId: ${compositeChartId}`);

        const { userAId, userBId, userAName, userBName } = relationshipAnalysis.debug.inputSummary;
        if (!userAId || !userBId || !userAName || !userBName) {
            return res.status(400).json({ error: "User IDs or names missing in relationship analysis data." });
        }

        console.log(`[handleGenerateRelationshipAnalysis] About to call Promise.all for user contexts.`);
        const [contextsUserA, contextsUserB] = await Promise.all([
            fetchAllContextsForUser(userAId, userAName, RELATIONSHIP_CATEGORIES),
            fetchAllContextsForUser(userBId, userBName, RELATIONSHIP_CATEGORIES)
        ]);
        console.log(`[handleGenerateRelationshipAnalysis] SUCCESSFULLY Fetched contexts for ${userAName} and ${userBName}`);

        const allGeneratedAnalyses = {};
        const promises = []; // Array to hold all the promises for LLM calls

        console.log("[handleGenerateRelationshipAnalysis] Preparing to generate prompts and initiate LLM calls.");

        for (const categoryKey of Object.keys(RELATIONSHIP_CATEGORIES)) {
            const categoryValue = RELATIONSHIP_CATEGORIES[categoryKey];
            const categoryDisplayName = categoryValue.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

            const relationshipScores = relationshipAnalysis.scores[categoryValue] || {};
            const relationshipAstrologyDetails = relationshipAnalysis.debug.categories[categoryValue] || {};
            const contextA = contextsUserA[categoryValue] || "No specific context found for User A in this category.";
            const contextB = contextsUserB[categoryValue] || "No specific context found for User B in this category.";
            const formattedAstrology = formatAstrologicalDetailsForLLM(relationshipAstrologyDetails, userAName, userBName);
            
            // Note: generateRelationshipPrompt might be async or not.
            // If it's not async, you don't need await here. If it is, you do.
            // Based on previous discussion, it might have been made non-async.
            const promptString = await generateRelationshipPrompt( // Or just generateRelationshipPrompt(...) if it's not async
                userAName, 
                userBName, 
                categoryDisplayName, 
                relationshipScores, 
                formattedAstrology, 
                contextA, 
                contextB
            );

            console.log(`--- PROMPT FOR CATEGORY: ${categoryDisplayName} ---`);
            // console.log(promptString); // Keep this for debugging if needed

            // Add the promise to the array, but don't await it yet
            promises.push(
                getCompletionGptResponseGeneral(promptString)
                    .then(analysis => {
                        console.log(`[LLM SUCCESS] Received analysis for ${categoryDisplayName}`);
                        return { categoryValue, analysis }; // Return an object to map back
                    })
                    .catch(error => {
                        console.error(`[LLM ERROR] Failed to get analysis for ${categoryDisplayName}:`, error.message);
                        return { categoryValue, analysis: `Error generating analysis for this category: ${error.message}` };
                    })
            );
        }

        console.log(`[handleGenerateRelationshipAnalysis] All ${promises.length} LLM calls initiated. Waiting for all to complete...`);
        
        // Wait for all promises to settle
        const results = await Promise.all(promises);

        console.log("[handleGenerateRelationshipAnalysis] All LLM calls completed.");

        // Populate allGeneratedAnalyses from the results
        results.forEach(result => {
            if (result) { // Check if result is not undefined (e.g. if a promise was malformed, though .catch should prevent this)
                allGeneratedAnalyses[result.categoryValue] = result.analysis;
            }
        });

        // After all LLM calls are completed and allGeneratedAnalyses is populated
        console.log("[handleGenerateRelationshipAnalysis] All categories processed. About to save analysis.");

        try {
            // Save the analysis to the database
            const saveResult = await saveRelationshipAnalysis(compositeChartId, allGeneratedAnalyses);
            console.log("[handleGenerateRelationshipAnalysis] Analysis saved:", saveResult);

            // Send the response to the client
            res.status(200).json({
                compositeChartId: compositeChartId,
                userAName: userAName,
                userBName: userBName,
                analysis: allGeneratedAnalyses,
                saved: saveResult.success
            });
        } catch (saveError) {
            console.error("[handleGenerateRelationshipAnalysis] Error saving analysis:", saveError.message);
            
            // Still send the generated analyses to the client, but indicate save failure
            res.status(200).json({
                compositeChartId: compositeChartId,
                userAName: userAName,
                userBName: userBName,
                analysis: allGeneratedAnalyses,
                saved: false,
                saveError: saveError.message
            });
        }

    } catch (error) {
        console.error("Error in handleGenerateRelationshipAnalysis:", error.message, error.stack);
        res.status(500).json({ error: error.message, details: error.stack });
    }
}


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
            console.error(`    [fetchAllContextsForUser] ${userName} - ERROR fetching context for ${categoryValue}:`, error.message, error.stack);
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






// export async function handleGetBirthChartScore(req, res) {
//     console.log("handleGetBirthChartScore")
//     try {
//         const { birthChart } = req.body;
//         const birthChartScore = await scoreBirthFChart(birthChart);
//         res.status(200).json(birthChartScore);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// }

