import {
    saveCompositeChart,
    getCompositeCharts,
    saveSynastryChartInterpretation,
    getUsers,
    getUserSingle,
    saveRelationshipScoring,
    fetchRelationshipAnalysisByCompositeId,
    saveRelationshipAnalysis
} from '../services/dbService.js';

import { getRelationshipCategoryContextForUser } from '../services/vectorize.js';
import { scoreRelationshipCompatibility } from '../utilities/relationshipScoring.js';
import { generateRelationshipPrompt, getCompletionGptResponseGeneral } from '../services/gptService.js';
import { RELATIONSHIP_CATEGORIES } from '../utilities/relationshipScoringConstants.js';

// all GENERAL DAILY ASPECTS/TRANSITS 


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
            // console.log(promptString); 

            promises.push(
                getCompletionGptResponseGeneral(promptString)
                    .then(interpretation => {
                        console.log(`[LLM SUCCESS] Received analysis for ${categoryDisplayName}`);
                        // Return an object containing the category, interpretation, and the formattedAstrology
                        return { categoryValue, interpretation, formattedAstrology }; 
                    })
                    .catch(error => {
                        console.error(`[LLM ERROR] Failed to get analysis for ${categoryDisplayName}:`, error.message);
                        // Still return the structure, with an error message for the interpretation
                        return { 
                            categoryValue, 
                            interpretation: `Error generating analysis for this category: ${error.message}`, 
                            formattedAstrology // Include formattedAstrology even on error
                        };
                    })
            );
        }

        console.log(`[handleGenerateRelationshipAnalysis] All ${promises.length} LLM calls initiated. Waiting for all to complete...`);
        
        const results = await Promise.all(promises);

        console.log("[handleGenerateRelationshipAnalysis] All LLM calls completed.");

        results.forEach(result => {
            if (result) { 
                allGeneratedAnalyses[result.categoryValue] = {
                    relevantPosition: result.formattedAstrology, // Store formattedAstrology
                    interpretation: result.interpretation      // Store the LLM's interpretation
                };
            }
        });

        console.log("[handleGenerateRelationshipAnalysis] All categories processed. About to save analysis.");

        try {
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

