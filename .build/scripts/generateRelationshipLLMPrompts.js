// @ts-nocheck
import { getRelationshipCategoryContextForUser } from "../services/vectorize.js";
import { fetchRelationshipAnalysisByCompositeId } from "../services/dbService.js"; // Ensure this is correctly imported
import { RELATIONSHIP_CATEGORIES } from "../utilities/relationshipScoringConstants.js";
import fs from "fs";
import path from "path";
// --- Configuration ---
const compositeChartId = "67fc0e7afd777c32433d2e8e"; // <<== INPUT: Your target compositeChartId
const outputDirectoryBase = "./llm_relationship_prompts";
// --- Helper Function to Fetch All Contexts for a User ---
async function fetchAllContextsForUser(userId, userName) {
    const userContexts = {};
    console.log(`\nFetching all contexts for ${userName} (ID: ${userId})...`);
    for (const categoryKey of Object.keys(RELATIONSHIP_CATEGORIES)) {
        // The actual value like 'OVERALL_ATTRACTION_CHEMISTRY' is what getRelationshipCategoryContextForUser expects
        const categoryValue = RELATIONSHIP_CATEGORIES[categoryKey];
        console.log(`  Fetching context for category: ${categoryValue} for ${userName}`);
        try {
            const contextArray = await getRelationshipCategoryContextForUser(userId, categoryValue);
            // We'll join the text excerpts for easier inclusion in the prompt
            // and keep only the text for brevity in the prompt, but you could include scores/descriptions if useful
            userContexts[categoryValue] = contextArray.map(item => item.text).join("\n\n---\n\n");
            if (!userContexts[categoryValue]) {
                userContexts[categoryValue] = "No specific context found from individual analysis for this category.";
            }
        }
        catch (error) {
            console.error(`    Error fetching context for ${categoryValue} for user ${userId}:`, error.message);
            userContexts[categoryValue] = "Error retrieving context for this category.";
        }
    }
    return userContexts;
}
// --- Helper Function to Format Astrological Details for the LLM ---
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
    return detailsString.trim() || "No specific astrological details formatted for this category.";
}
// --- Main Script Logic ---
async function main() {
    console.log(`Generating LLM prompts for relationship with compositeChartId: ${compositeChartId}`);
    const outputDirectory = path.join(outputDirectoryBase, `relationship_${compositeChartId}`);
    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory, { recursive: true });
        console.log(`Created output directory: ${outputDirectory}`);
    }
    // 1. Fetch the relationship analysis document
    const relationshipAnalysis = await fetchRelationshipAnalysisByCompositeId(compositeChartId);
    if (!relationshipAnalysis) {
        console.error(`No relationship analysis found for compositeChartId: ${compositeChartId}. Exiting.`);
        return;
    }
    const { userAId, userBId, userAName, userBName } = relationshipAnalysis.debug.inputSummary;
    console.log(`\nAnalyzing relationship between: ${userAName} (User A) and ${userBName} (User B)`);
    // 2. Fetch all contexts for User A
    const contextsUserA = await fetchAllContextsForUser(userAId, userAName);
    // 3. Fetch all contexts for User B
    const contextsUserB = await fetchAllContextsForUser(userBId, userBName);
    const allGeneratedPrompts = {};
    // 4. For each relationship category, generate an LLM prompt
    console.log("\n--- Generating LLM Prompts ---");
    for (const categoryKey of Object.keys(RELATIONSHIP_CATEGORIES)) {
        const categoryValue = RELATIONSHIP_CATEGORIES[categoryKey]; // e.g., OVERALL_ATTRACTION_CHEMISTRY
        const categoryDisplayName = categoryKey.replace(/_/g, ' '); // e.g., Overall Attraction Chemistry
        console.log(`\nProcessing category: ${categoryDisplayName}`);
        // Relationship-specific data for this category
        const relationshipScores = relationshipAnalysis.scores[categoryValue] || {};
        const relationshipAstrologyDetails = relationshipAnalysis.debug.categories[categoryValue] || {};
        // Individual contexts for this category
        const contextA = contextsUserA[categoryValue] || "No specific context found for User A in this category.";
        const contextB = contextsUserB[categoryValue] || "No specific context found for User B in this category.";
        // Format astrological details for the prompt
        const formattedAstrology = formatAstrologicalDetailsForLLM(relationshipAstrologyDetails, userAName, userBName);
        // 5. Construct the prompt
        const llmPrompt = `
You are an expert astrologer providing a detailed relationship analysis.
The relationship is between ${userAName} (referred to as User A) and ${userBName} (referred to as User B).
This specific analysis focuses on the category: "${categoryDisplayName}".

I. RELATIONSHIP DATA FOR "${categoryDisplayName.toUpperCase()}":
Overall Score for this category: ${relationshipScores.overall !== undefined ? relationshipScores.overall : 'N/A'}
  - Synastry Score: ${relationshipScores.synastry !== undefined ? relationshipScores.synastry : 'N/A'}
  - Composite Score: ${relationshipScores.composite !== undefined ? relationshipScores.composite : 'N/A'}
  - Synastry House Placements Score: ${relationshipScores.synastryHousePlacements !== undefined ? relationshipScores.synastryHousePlacements : 'N/A'}
  - Composite House Placements Score: ${relationshipScores.compositeHousePlacements !== undefined ? relationshipScores.compositeHousePlacements : 'N/A'}

Key Astrological Factors from their combined charts influencing "${categoryDisplayName}":
${formattedAstrology}

II. INDIVIDUAL CONTEXT FOR ${userAName.toUpperCase()} (USER A) RELEVANT TO "${categoryDisplayName.toUpperCase()}":
(The following is derived from ${userAName}'s individual birth chart analysis)
---
${contextA}
---

III. INDIVIDUAL CONTEXT FOR ${userBName.toUpperCase()} (USER B) RELEVANT TO "${categoryDisplayName.toUpperCase()}":
(The following is derived from ${userBName}'s individual birth chart analysis)
---
${contextB}
---

IV. ANALYSIS TASK:
Based on ALL the information above (the relationship scores, specific astrological interactions between User A and User B, and the individual contexts of User A and User B related to "${categoryDisplayName}"), provide a comprehensive astrological analysis for this facet of their relationship.

Please address the following:
1. How do the individual tendencies and needs of ${userAName} (User A), as suggested by their context, interact with the relationship dynamics for "${categoryDisplayName}"?
2. How do the individual tendencies and needs of ${userBName} (User B), as suggested by their context, interact with the relationship dynamics for "${categoryDisplayName}"?
3. What are the key strengths in this area of their relationship, considering both their individual charts and their combined astrology?
4. What are potential challenges or friction points in this area, and how might their individual natures contribute to or mitigate these?
5. Offer insights or advice for ${userAName} and ${userBName} to navigate and enhance the "${categoryDisplayName}" aspect of their connection.

Provide a thoughtful, balanced, and insightful analysis.
`;
        allGeneratedPrompts[categoryValue] = llmPrompt;
        const promptFileName = `prompt_${categoryValue}.txt`;
        fs.writeFileSync(path.join(outputDirectory, promptFileName), llmPrompt);
        console.log(`  Saved prompt to ${path.join(outputDirectory, promptFileName)}`);
    }
    const allPromptsFileName = `all_prompts_for_relationship_${compositeChartId}.json`;
    fs.writeFileSync(path.join(outputDirectory, allPromptsFileName), JSON.stringify(allGeneratedPrompts, null, 2));
    console.log(`\nAll prompts bundled and saved to ${path.join(outputDirectory, allPromptsFileName)}`);
    console.log("\nScript finished successfully.");
}
// Run the main function
main().catch(error => {
    console.error("An error occurred in the main script execution:", error);
});
