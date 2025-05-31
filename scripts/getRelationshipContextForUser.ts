// @ts-nocheck
// create a script that will get the relationship context for a user, using the getRelationshipCategoryContextForUser function

import { getRelationshipCategoryContextForUser } from "../services/vectorize.js"
import { ALL_RELATIONSHIP_CATEGORIES } from "../utilities/relationshipScoringConstants.js"
import { fetchRelationshipAnalysisByCompositeId } from "../services/dbService.js"
import fs from "fs"

// const userAId = "67f9d8e097321dcacc88a9c2"
// const userBId = "67f9d929b924d8f22ae3d9bb"
const compositeChartId = "67fc0e7afd777c32433d2e8e"

async function testRelationshipAnalysis() {
    console.log("Getting relationship context for user ", userAId)
    // loop through all the relationship categories




    const relationshipAnalysis = await fetchRelationshipAnalysisByCompositeId(compositeChartId)
    if (!relationshipAnalysis) {
        console.log("No relationship analysis found for composite chart id ", compositeChartId)
        return
    }
    const userAId = relationshipAnalysis.inputSummary.userAId
    const userBId = relationshipAnalysis.inputSummary.userBId

    const relationshipContextForUserA = {}
    const relationshipContextForUserB = {}
    for (const category of ALL_RELATIONSHIP_CATEGORIES) {
        const context = await getRelationshipCategoryContextForUser(userAId, category)
        relationshipContextForUserA[category] = context
    }
    for (const category of ALL_RELATIONSHIP_CATEGORIES) {
        const context = await getRelationshipCategoryContextForUser(userBId, category)
        relationshipContextForUserB[category] = context
    }

    console.log("Relationship context for user A: ", relationshipContextForUserA)
    console.log("Relationship context for user B: ", relationshipContextForUserB)
}

testRelationshipAnalysis()



