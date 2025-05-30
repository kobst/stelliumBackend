// @ts-nocheck
import { MongoClient, ObjectId } from 'mongodb';
import { processInterpretationSection } from './vectorize.js';

const connection_string = process.env.MONGODB_URI
const client = new MongoClient(connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect();
const db = client.db('stellium');
const transitsCollection = db.collection('daily_transits');
const aspectsCollection = db.collection('daily_aspects');
const retrogradesCollection = db.collection('retrogrades');
const userCollection = db.collection('users');
const birthChartInterpretations = db.collection('user_birth_chart_interpretation');
const userTransitAspectsCollection = db.collection('user_transit_aspects');
const dailyTransitInterpretations = db.collection('daily_transit_interpretations');
const weeklyTransitInterpretations = db.collection('weekly_transit_interpretations');
const compositeChartCollection = db.collection('composite_charts');
const compositeChartInterpretations = db.collection('composite_chart_interpretations');
const relationshipLogCollection = db.collection('relationship_logs');
const birthChartAnalysisCollection = db.collection('birth_chart_analysis');
const relationshipAnalysisCollection = db.collection('relationship_analysis');
const chatThreadCollectionBirthChartAnalysis = db.collection('chat_threads_birth_chart_analysis');
const chatThreadRelationshipAnalysisCollection = db.collection('chat_threads_relationship_analysis');
const transitEphemerisCollection = db.collection('transit_ephemeris');
// const synastryChartInterpretations = db.collection('synastry_chart_interpretations');
export async function initializeDatabase() {
    try {
        console.log("Initializing database");
        // Create indexes
        //     await userCollection.createIndex({ email: 1 }, { unique: true });
        //     // You could also add schema validation if desired
        //     await db.command({
        //         collMod: 'users',
        //         validator: {
        //             $jsonSchema: {
        //                 bsonType: 'object',
        //                 required: ['email', 'firstName', 'lastName'],
        //                 properties: {
        //                     email: {
        //                         bsonType: 'string',
        //                         pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        //                     },
        //                     firstName: { bsonType: 'string' },
        //                     lastName: { bsonType: 'string' },
        //                     dateOfBirth: { bsonType: 'date' },
        //                     placeOfBirth: { bsonType: 'string' },
        //                     birthChart: { bsonType: 'object' }
        //                 }
        //             }
        //         }
        //     });
        //     console.log('Database initialized successfully');
    }
    catch (error) {
        console.error('Error initializing database:', error);
    }
}
export async function getDailyTransits(date) {
    const inputDate = new Date(date);
    const closestTransit = await transitsCollection.findOne({ date: { $gte: inputDate } }, { sort: { date: 1 } });
    return closestTransit ? closestTransit.transits : [];
}
;
export async function getPeriodTransitsObject(startDate, endDate) {
    const query = {
        date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    };
    const matchingTransits = await transitsCollection.find(query).toArray();
    const transitsData = matchingTransits.reduce((acc, transit) => {
        const dateKey = transit.date.toISOString();
        acc[dateKey] = transit.transits.map(planet => ({
            name: planet.name,
            fullDegree: planet.fullDegree,
            normDegree: planet.normDegree,
            speed: planet.speed,
            isRetro: planet.isRetro.toString(),
            sign: planet.sign,
            date: dateKey
        }));
        return acc;
    }, {});
    return transitsData;
}
;
// get all transits from the general transit collection for a given date range
export async function getPeriodTransits(startDate, endDate) {
    const start = new Date(startDate);
    start.setDate(start.getDate() - 7); //
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    const query = {
        date: {
            $gte: start,
            $lte: end
        }
    };
    const matchingAspects = await transitsCollection.find(query).toArray();
    return matchingAspects;
}
;
// get all aspects from the general transit collection db for a given date
export async function getDailyAspects(date) {
    const inputDate = new Date(date);
    const matchingAspects = await aspectsCollection.find({
        $and: [
            { "date_range.0": { $lte: inputDate } },
            { "date_range.1": { $gte: inputDate } }
        ]
    }).toArray();
    return matchingAspects;
}
// get aspects from the general transit collection given a start and end date
export async function getPeriodAspects(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const matchingAspects = await aspectsCollection.find({
        $and: [
            { "date_range.0": { $lte: end } }, // Start of the aspect's date range is before or at the end date
            { "date_range.1": { $gte: start } } // End of the aspect's date range is after or at the start date
        ]
    }).toArray();
    return matchingAspects;
}
// get all retrogrades from the retrogrades collection for a given date
export async function getRetrogrades(date) {
    try {
        const inputDate = new Date(date);
        console.log("Input Date:", inputDate);
        const retrogrades = await retrogradesCollection.find({
            $and: [
                { "date_range.0": { $lte: inputDate } },
                { "date_range.1": { $gte: inputDate } }
            ]
        }).toArray();
        return retrogrades;
    }
    catch (error) {
        console.error("Error fetching retrogrades:", error);
        throw new Error("Unable to fetch retrogrades");
    }
}
;
// get all retrogrades from the retrogrades collection for a given date range
export async function getRetrogradesForDateRange(startDate, endDate) {
    try {
        const inputStartDate = new Date(startDate);
        const inputEndDate = new Date(endDate);
        console.log("Input Start Date:", inputStartDate);
        console.log("Input End Date:", inputEndDate);
        const retrogrades = await retrogradesCollection.find({
            $or: [
                { $and: [
                        { "date_range.0": { $gte: inputStartDate } },
                        { "date_range.0": { $lte: inputEndDate } }
                    ] },
                { $and: [
                        { "date_range.1": { $gte: inputStartDate } },
                        { "date_range.1": { $lte: inputEndDate } }
                    ] },
                { $and: [
                        { "date_range.0": { $lte: inputStartDate } },
                        { "date_range.1": { $gte: inputEndDate } }
                    ] }
            ]
        }).toArray();
        return retrogrades;
    }
    catch (error) {
        console.error("Error fetching retrogrades for date range:", error);
        throw new Error("Unable to fetch retrogrades for date range");
    }
}
;
// get aspects from the general transit collection given a start and end date for the requested birthchart
export async function getAspectsForChart(startDate, endDate, birthChartId) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const matchingAspects = await aspectsCollection.find({
        $and: [
            { birthChartId: birthChartId },
            {
                $or: [
                    { "date_range.0": { $lte: end } },
                    { "date_range.1": { $gte: start } }
                ]
            }
        ]
    }).toArray();
    return matchingAspects;
}
// TODO: add error handling for when the user does not have a birthchart
// TODO: add collection and metho
export async function getBirthChart(userId) {
    try {
        if (!ObjectId.isValid(userId)) {
            throw new Error(`Invalid userId: ${userId}`);
        }
        const user = await userCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            throw new Error(`User not found for id: ${userId}`);
        }
        if (!user.birthChart) {
            throw new Error(`Birth chart not found for user: ${userId}`);
        }
        return user.birthChart;
    }
    catch (error) {
        console.error("Error in getBirthChart:", error);
        throw error;
    }
}
export async function getUsers() {
    try {
        const users = await userCollection.find({})
            .limit(50)
            .toArray();
        return users;
    }
    catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
}
export async function getUserSingle(userId) {
    console.log("getUserSingle", { userId });
    try {
        const user = await userCollection.findOne({ _id: new ObjectId(userId) });
        return user;
    }
    catch (error) {
        console.error("Error in getUserSingle:", error);
        throw error;
    }
}
export async function getCompositeCharts() {
    console.log("getCompositeCharts");
    try {
        const compositeCharts = await compositeChartCollection.find({}).toArray();
        return compositeCharts;
    }
    catch (error) {
        console.error("Error in getCompositeCharts:", error);
        throw error;
    }
}
export async function saveUser(user) {
    const result = await userCollection.insertOne(user);
    return result;
}
export async function saveCompositeChart(compositeChart) {
    // console.log("saveCompositeChart", compositeChart)
    const result = await compositeChartCollection.insertOne(compositeChart);
    return result;
}
export async function saveRelationshipLog(relationshipLog) {
    const result = await relationshipLogCollection.insertOne(relationshipLog);
    return result;
}
export async function saveRelationshipScoring(relationshipScoringLog) {
    try {
        const result = await relationshipAnalysisCollection.insertOne(relationshipScoringLog);
        return result;
    }
    catch (error) {
        console.error("Error in saveRelationshipScoring:", error);
        throw error;
    }
}
export async function saveRelationshipAnalysis(compositeChartId, analysis) {
    try {
        // Find the existing document using the compositeChartId
        const document = await relationshipAnalysisCollection.findOne({
            'debug.inputSummary.compositeChartId': compositeChartId
        });
        if (!document) {
            throw new Error(`No relationship analysis document found for compositeChartId: ${compositeChartId}`);
        }
        // Add the analysis to the document
        document.analysis = analysis;
        // Save the updated document
        const result = await relationshipAnalysisCollection.replaceOne({ _id: document._id }, document);
        if (result.modifiedCount === 1) {
            console.log(`Successfully saved analysis for compositeChartId: ${compositeChartId}`);
            return { success: true, message: "Analysis saved successfully" };
        }
        else {
            console.warn(`Document found but not updated for compositeChartId: ${compositeChartId}`);
            return { success: false, message: "Document found but not updated" };
        }
    }
    catch (error) {
        console.error(`Error saving relationship analysis for compositeChartId: ${compositeChartId}:`, error.message, error.stack);
        throw error; // Re-throw to allow the caller to handle it
    }
}
export async function fetchRelationshipAnalysisByCompositeId(compositeChartId) {
    try {
        const analysis = await relationshipAnalysisCollection.findOne({
            'debug.inputSummary.compositeChartId': compositeChartId
        });
        if (!analysis) {
            return null;
        }
        // Default vectorization status if not present
        const defaultVectorizationStatus = {
            categories: {
                OVERALL_ATTRACTION_CHEMISTRY: false,
                EMOTIONAL_SECURITY_CONNECTION: false,
                SEX_AND_INTIMACY: false,
                COMMUNICATION_AND_MENTAL_CONNECTION: false,
                COMMITMENT_LONG_TERM_POTENTIAL: false,
                KARMIC_LESSONS_GROWTH: false,
                PRACTICAL_GROWTH_SHARED_GOALS: false
            },
            lastUpdated: null,
            relationshipAnalysis: false
        };
        return {
            scores: analysis.scores,
            debug: analysis.debug,
            analysis: analysis.analysis,
            vectorizationStatus: analysis.vectorizationStatus || defaultVectorizationStatus,
            _id: analysis._id
        };
    }
    catch (error) {
        console.error(`Error fetching relationship analysis for compositeChartId ${compositeChartId}:`, error);
        throw error;
    }
}
export async function saveUserTransitAspects(groupedAspects, userId) {
    const savePromises = groupedAspects.map(aspect => userTransitAspectsCollection.insertOne({ ...aspect, userId }));
    await Promise.all(savePromises);
}
// get aspects from the general transit collection given a start and end date
export async function getPeriodAspectsForUser(startDate, endDate, userId) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const matchingAspects = await userTransitAspectsCollection.find({
        userId: userId,
        $or: [
            { "date_range.0": { $lte: end } }, // Start of the aspect's date range is before or at the end date
            { "date_range.1": { $gte: start } } // End of the aspect's date range is after or at the start date
        ]
    }).toArray();
    return matchingAspects;
}
export async function saveBirthChartInterpretation(userId, heading, promptDescription, interpretation) {
    console.log("saveBirthChartInterpretation", { userId, heading, promptDescription, interpretation });
    try {
        if (!ObjectId.isValid(userId)) {
            throw new Error(`Invalid userId: ${userId}`);
        }
        const objectId = new ObjectId(userId);
        // First, try to find the existing document
        let document = await birthChartInterpretations.findOne({ userId: objectId });
        if (!document) {
            // If no document exists, create a new one with an empty birthChartInterpretation object
            document = { userId: objectId, birthChartInterpretation: {} };
        }
        else if (!document.birthChartInterpretation) {
            // If the document exists but doesn't have a birthChartInterpretation field, add it
            document.birthChartInterpretation = {};
        }
        // Update the specific heading within the birthChartInterpretation object
        document.birthChartInterpretation[heading] = { promptDescription, interpretation };
        // Use replaceOne with upsert to either update the existing document or insert a new one
        const result = await birthChartInterpretations.replaceOne({ userId: objectId }, document, { upsert: true });
        console.log("Update result:", JSON.stringify(result, null, 2));
        return result;
    }
    catch (error) {
        console.error("Error in saveBirthChartInterpretation:", error);
        console.error("Error stack:", error.stack);
        throw error;
    }
}
export async function upsertVectorizedInterpretation(userId, heading, promptDescription, interpretation) {
    try {
        await processInterpretationSection(userId, heading, promptDescription, interpretation);
    }
    catch (error) {
        console.error("Error in upsertVectorizedInterpretation:", error);
        throw error;
    }
}
export async function getBirthChartInterpretation(userId) {
    console.log("getBirthChartInterpretation", { userId });
    try {
        if (!ObjectId.isValid(userId)) {
            throw new Error(`Invalid userId: ${userId}`);
        }
        const document = await birthChartInterpretations.findOne({ userId: new ObjectId(userId) });
        return document?.birthChartInterpretation || {};
    }
    catch (error) {
        console.error("Error in getBirthChartInterpretation:", error);
        throw error;
    }
}
export async function saveCompositeChartInterpretation(compositeChartId, heading, promptDescription, interpretation) {
    console.log("saveCompositeChartInterpretation", { compositeChartId, heading, promptDescription, interpretation });
    try {
        if (!ObjectId.isValid(compositeChartId)) {
            throw new Error(`Invalid compositeChartId: ${compositeChartId}`);
        }
        const objectId = new ObjectId(compositeChartId);
        // First, try to find the existing document
        let document = await compositeChartInterpretations.findOne({ _id: objectId });
        if (!document) {
            // If no document exists, create a new one with only compositeChartInterpretation
            document = {
                _id: objectId,
                compositeChartInterpretation: {}
            };
        }
        else {
            if (!document.compositeChartInterpretation) {
                document.compositeChartInterpretation = {};
            }
            // Preserve any existing synastryInterpretation if it exists
        }
        // Update the specific heading under the appropriate interpretation object
        document.compositeChartInterpretation[heading] = { promptDescription, interpretation };
        // Use replaceOne with upsert to either update the existing document or insert a new one
        const result = await compositeChartInterpretations.replaceOne({ _id: objectId }, document, { upsert: true });
        console.log("Update result:", JSON.stringify(result, null, 2));
        return result;
    }
    catch (error) {
        console.error("Error in saveCompositeChartInterpretation:", error);
        console.error("Error stack:", error.stack);
        throw error;
    }
}
// save synastry chart interpretation
export async function saveSynastryChartInterpretation(compositeChartId, heading, promptDescription, interpretation) {
    console.log("saveCompositeChartInterpretation", { compositeChartId, heading, promptDescription, interpretation });
    try {
        if (!ObjectId.isValid(compositeChartId)) {
            throw new Error(`Invalid compositeChartId: ${compositeChartId}`);
        }
        const objectId = new ObjectId(compositeChartId);
        // First, try to find the existing document
        let document = await compositeChartInterpretations.findOne({ _id: objectId });
        if (!document) {
            // If no document exists, create a new one with only compositeChartInterpretation
            document = {
                _id: objectId,
                synastryInterpretation: {}
            };
        }
        else {
            if (!document.synastryInterpretation) {
                document.synastryInterpretation = {};
            }
            // Preserve any existing synastryInterpretation if it exists
        }
        // Update the specific heading under the appropriate interpretation object
        document.synastryInterpretation[heading] = { promptDescription, interpretation };
        // Use replaceOne with upsert to either update the existing document or insert a new one
        const result = await compositeChartInterpretations.replaceOne({ _id: objectId }, document, { upsert: true });
        console.log("Update result:", JSON.stringify(result, null, 2));
        return result;
    }
    catch (error) {
        console.error("Error in saveCompositeChartInterpretation:", error);
        console.error("Error stack:", error.stack);
        throw error;
    }
}
export async function getCompositeChartInterpretation(compositeChartId) {
    console.log("getCompositeChartInterpretation", { compositeChartId });
    try {
        if (!ObjectId.isValid(compositeChartId)) {
            throw new Error(`Invalid compositeChartId: ${compositeChartId}`);
        }
        const document = await compositeChartInterpretations.findOne({ _id: new ObjectId(compositeChartId) });
        return document?.compositeChartInterpretation || {};
    }
    catch (error) {
        console.error("Error in getCompositeChartInterpretation:", error);
        throw error;
    }
}
export async function getSynastryInterpretation(compositeChartId) {
    console.log("getSynastryInterpretation", { compositeChartId });
    try {
        if (!ObjectId.isValid(compositeChartId)) {
            throw new Error(`Invalid compositeChartId: ${compositeChartId}`);
        }
        const document = await compositeChartInterpretations.findOne({ _id: new ObjectId(compositeChartId) });
        return document?.synastryInterpretation || {};
    }
    catch (error) {
        console.error("Error in getSynastryInterpretation:", error);
        throw error;
    }
}
export async function getSynastryChartInterpretation(synastryChartId) {
    console.log("getSynastryChartInterpretation", { synastryChartId });
    try {
        if (!ObjectId.isValid(synastryChartId)) {
            throw new Error(`Invalid synastryChartId: ${synastryChartId}`);
        }
        const document = await synastryChartInterpretations.findOne({ _id: new ObjectId(synastryChartId) });
        return document?.synastryChartInterpretation || {};
    }
    catch (error) {
        console.error("Error in getSynastryChartInterpretation:", error);
        throw error;
    }
}
export async function saveDailyTransitInterpretationData(date, combinedAspectsDescription, dailyTransitInterpretation) {
    // Convert the date string to a Date object
    const isoDate = new Date(date);
    // Set the time to 00:00:00
    isoDate.setUTCHours(0, 0, 0, 0);
    const document = {
        date: isoDate,
        combinedDescription: combinedAspectsDescription,
        dailyTransitInterpretation: dailyTransitInterpretation
    };
    const result = await dailyTransitInterpretations.updateOne({ date: isoDate }, { $set: document }, { upsert: true });
    // If a new document was inserted, we need to fetch it to get the _id
    if (result.upsertedId) {
        const insertedDocument = await dailyTransitInterpretations.findOne({ _id: result.upsertedId });
        return insertedDocument;
    }
    else {
        // If the document was updated, fetch and return the updated document
        const updatedDocument = await dailyTransitInterpretations.findOne({ date: isoDate });
        return updatedDocument;
    }
}
export async function getDailyTransitInterpretationData(date) {
    const startDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    const documents = await dailyTransitInterpretations.find({
        date: {
            $gte: startDate,
            $lt: endDate
        }
    }).sort({ date: 1 }).toArray();
    return documents;
}
export async function saveWeeklyTransitInterpretationData(date, combinedAspectsDescription, weeklyTransitInterpretation, sign) {
    const isoDate = new Date(date);
    isoDate.setUTCHours(0, 0, 0, 0);
    const interpretation = {
        sign,
        combinedDescription: Array.isArray(combinedAspectsDescription) ? combinedAspectsDescription : [combinedAspectsDescription],
        weeklyTransitInterpretation
    };
    const result = await weeklyTransitInterpretations.updateOne({ date: isoDate }, {
        $setOnInsert: { date: isoDate },
        $push: { weeklyInterpretations: interpretation }
    }, { upsert: true });
    if (result.upsertedId) {
        return await weeklyTransitInterpretations.findOne({ _id: result.upsertedId });
    }
    else {
        return await weeklyTransitInterpretations.findOne({ date: isoDate });
    }
}
export async function getWeeklyTransitInterpretationData(date) {
    const startDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    const documents = await weeklyTransitInterpretations.find({
        date: {
            $gte: startDate,
            $lt: endDate
        }
    }).sort({ date: 1 }).toArray();
    return documents;
}
export async function saveBasicAnalysis(userId, analysis) {
    const existingDocument = await birthChartAnalysisCollection.findOne({
        userId: new ObjectId(userId)
    });
    if (existingDocument) {
        // Update the existing document
        const result = await birthChartAnalysisCollection.updateOne({ userId: new ObjectId(userId) }, {
            $set: {
                interpretation: {
                    timestamp: analysis.timestamp,
                    metadata: analysis.metadata,
                    basicAnalysis: analysis.basicAnalysis
                }
            }
        });
        return result;
    }
    else {
        // Create a new document
        const result = await birthChartAnalysisCollection.insertOne({
            userId: new ObjectId(userId),
            interpretation: {
                timestamp: analysis.timestamp,
                metadata: analysis.metadata,
                basicAnalysis: analysis.basicAnalysis
            }
        });
        return result;
    }
}
export async function getBasicAnalysisByUserId(userId) {
    try {
        const document = await birthChartAnalysisCollection.findOne({
            userId: new ObjectId(userId)
        });
        if (!document || !document.interpretation || !document.interpretation.basicAnalysis) {
            console.log(`No basic analysis found for userId: ${userId}`);
            return {};
        }
        return document.interpretation.basicAnalysis;
    }
    catch (error) {
        console.error(`Error retrieving basic analysis for userId ${userId}:`, error);
        throw error;
    }
}
export async function getTopicAnalysisByUserId(userId) {
    try {
        const document = await birthChartAnalysisCollection.findOne({
            userId: new ObjectId(userId)
        });
        if (!document || !document.interpretation || !document.interpretation.SubtopicAnalysis) {
            console.log(`No topic analysis found for userId: ${userId}`);
            return {};
        }
        return document?.interpretation.SubtopicAnalysis || {};
    }
    catch (error) {
        console.error(`Error retrieving topic analysis for userId ${userId}:`, error);
        throw error;
    }
}
export async function getAllAnalysisByUserId(userId) {
    try {
        const document = await birthChartAnalysisCollection.findOne({
            userId: new ObjectId(userId)
        });
        if (!document) {
            return null;
        }
        return {
            birthChartAnalysisId: document._id,
            interpretation: document.interpretation || {},
            vectorizationStatus: document.vectorizationStatus || {
                overview: false,
                planets: {},
                dominance: {},
                basicAnalysis: false,
                topicAnalysis: {
                    isComplete: false
                },
                lastUpdated: null
            }
        };
    }
    catch (error) {
        console.error(`Error retrieving all analysis for userId ${userId}:`, error);
        throw error;
    }
}
// export async function saveTopicAnalysis(userId, topicAnalysis) {
//     const existingDocument = await birthChartAnalysisCollection.findOne({ 
//         userId: new ObjectId(userId) 
//     });
//     if (existingDocument) {
//         // Update the existing document by adding SubtopicAnalysis under interpretation
//         const result = await birthChartAnalysisCollection.updateOne(
//             { userId: new ObjectId(userId) },
//             { 
//                 $set: { 
//                     'interpretation.SubtopicAnalysis': topicAnalysis 
//                 }
//             }
//         );
//         return result;
//     } else {
//         // Create a new document with the interpretation structure
//         const result = await birthChartAnalysisCollection.insertOne({ 
//             userId: new ObjectId(userId), 
//             interpretation: {
//                 SubtopicAnalysis: topicAnalysis
//             }
//         });
//         return result;
//     }
// }
export async function saveTopicAnalysis(userId, topicAnalysis) {
    const existingDocument = await birthChartAnalysisCollection.findOne({
        userId: new ObjectId(userId)
    });
    if (existingDocument) {
        // Get existing analysis
        const existingAnalysis = existingDocument.interpretation?.SubtopicAnalysis || {};
        // Deep merge the new topic analysis with existing ones
        const mergedAnalysis = { ...existingAnalysis };
        // Iterate through each broad topic in the new analysis
        Object.entries(topicAnalysis).forEach(([broadTopic, topicData]) => {
            if (!mergedAnalysis[broadTopic]) {
                mergedAnalysis[broadTopic] = {
                    label: topicData.label,
                    relevantPositions: topicData.relevantPositions,
                    subtopics: {}
                };
            }
            // Merge subtopics
            mergedAnalysis[broadTopic].subtopics = {
                ...mergedAnalysis[broadTopic].subtopics,
                ...topicData.subtopics
            };
        });
        // Update with merged results
        const result = await birthChartAnalysisCollection.updateOne({ userId: new ObjectId(userId) }, {
            $set: {
                'interpretation.SubtopicAnalysis': mergedAnalysis
            }
        });
        return result;
    }
    else {
        // Create a new document with the interpretation structure
        const result = await birthChartAnalysisCollection.insertOne({
            userId: new ObjectId(userId),
            interpretation: {
                SubtopicAnalysis: topicAnalysis
            }
        });
        return result;
    }
}
export async function updateVectorizationStatus(userId, section, status, details = null) {
    try {
        let updatePath;
        if (section === 'topicAnalysis') {
            if (!details) {
                updatePath = `vectorizationStatus.topicAnalysis.isComplete`;
            }
            else if (details.subtopic) {
                updatePath = `vectorizationStatus.topicAnalysis.topics.${details.topic}.subtopics.${details.subtopic}`;
            }
            else if (details.topic) {
                updatePath = `vectorizationStatus.topicAnalysis.topics.${details.topic}.isComplete`;
            }
        }
        else {
            // Handle basic analysis status updates (previous implementation)
            updatePath = details
                ? `vectorizationStatus.${section}.${details}`
                : `vectorizationStatus.${section}`;
        }
        await birthChartAnalysisCollection.updateOne({ userId: new ObjectId(userId) }, {
            $set: {
                [updatePath]: status,
                'vectorizationStatus.lastUpdated': new Date()
            }
        });
    }
    catch (error) {
        console.error(`Error updating vectorization status for ${section}:`, error);
        throw error;
    }
}
export async function updateRelationshipVectorizationStatus(compositeChartId, analysisType, isVectorized, details = {}) {
    try {
        const updateData = {
            $set: {
                [`vectorizationStatus.${analysisType}`]: isVectorized,
                [`vectorizationStatus.lastUpdated`]: new Date()
            }
        };
        // If we have category details, add them to the update
        if (details.category) {
            updateData.$set[`vectorizationStatus.categories.${details.category}`] = isVectorized;
        }
        const result = await relationshipAnalysisCollection.updateOne({ 'debug.inputSummary.compositeChartId': compositeChartId }, updateData);
        return {
            success: result.modifiedCount > 0,
            modifiedCount: result.modifiedCount
        };
    }
    catch (error) {
        console.error(`Error updating vectorization status for compositeChartId ${compositeChartId}:`, error);
        throw error;
    }
}
// chat
export async function saveChatHistoryForBirthChartAnalysis(userId, birthChartAnalysisId, userQuery, response) {
    const timestamp = new Date();
    // Ensure consistent data types
    const normalizedUserId = typeof userId === 'string' ? userId : userId.toString();
    const normalizedBirthChartAnalysisId = typeof birthChartAnalysisId === 'string' ? birthChartAnalysisId : birthChartAnalysisId.toString();
    const userMessage = {
        role: "user",
        content: userQuery,
        timestamp: timestamp
    };
    const assistantMessage = {
        role: "assistant",
        content: response,
        timestamp: new Date()
    };
    const filter = {
        userId: normalizedUserId,
        birthChartAnalysisId: normalizedBirthChartAnalysisId
    };
    const updateDoc = {
        $push: {
            messages: { $each: [userMessage, assistantMessage] }
        },
        $set: {
            updatedAt: new Date()
        },
        $setOnInsert: {
            userId: normalizedUserId,
            birthChartAnalysisId: normalizedBirthChartAnalysisId,
            createdAt: timestamp
        }
    };
    const options = {
        upsert: true,
        returnDocument: 'after'
    };
    try {
        const result = await chatThreadCollectionBirthChartAnalysis.findOneAndUpdate(filter, updateDoc, options);
        return result;
    }
    catch (error) {
        console.error(`Error saving chat history for userId ${userId} and birthChartAnalysisId ${birthChartAnalysisId}:`, error);
        throw error;
    }
}
export async function saveChatHistoryForRelationshipAnalysis(userId, compositeChartId, userQuery, response) {
    const timestamp = new Date();
    const userMessage = {
        role: "user",
        content: userQuery,
        timestamp: timestamp
    };
    const assistantMessage = {
        role: "assistant",
        content: response,
        timestamp: new Date() // Ensure current timestamp for assistant message
    };
    const filter = {
        userId: userId,
        compositeChartId: compositeChartId
    };
    const updateDoc = {
        $push: {
            messages: { $each: [userMessage, assistantMessage] }
        },
        $set: {
            updatedAt: new Date() // Always update the last modified time
        },
        $setOnInsert: {
            // userId and compositeChartId are part of the filter,
            // so they'll be in the doc if inserted.
            // MongoDB will automatically generate an _id.
            createdAt: timestamp // Set only when the document is first created
        }
    };
    const options = {
        upsert: true, // Create the document if it doesn't exist
        returnDocument: 'after' // Return the modified document
    };
    try {
        const result = await chatThreadRelationshipAnalysisCollection.findOneAndUpdate(filter, updateDoc, options);
        return result.value ? result.value : result;
    }
    catch (error) {
        console.error(`Error saving chat history for relationship analysis (userId: ${userId}, compositeChartId: ${compositeChartId}):`, error);
        throw error;
    }
}
export async function getChatHistoryForBirthChartAnalysis(userId, birthChartAnalysisId, numPairs = 5) {
    console.log("getChatHistoryForBirthChartAnalysis");
    console.log("userId: ", userId);
    console.log("birthChartAnalysisId: ", birthChartAnalysisId);
    const filter = {
        userId: userId,
        birthChartAnalysisId: birthChartAnalysisId
    };
    // We want to retrieve 'numPairs' of (user + assistant) messages.
    // So, we need to get the last (numPairs * 2) messages from the array.
    const numberOfMessagesToRetrieve = numPairs * 2;
    const projection = {
        // Slice the messages array to get the last 'numberOfMessagesToRetrieve' elements.
        // A negative value for $slice takes elements from the end of the array.
        messages: { $slice: -numberOfMessagesToRetrieve },
        // You can include other fields if needed, like _id, userId, birthChartId
        _id: 0 // Exclude _id if you only want the messages
    };
    try {
        const chatThread = await chatThreadCollectionBirthChartAnalysis.findOne(filter, { projection });
        if (chatThread && chatThread.messages) {
            return chatThread.messages; // Returns an array of message objects
        }
        else {
            return []; // Return an empty array if no thread or messages are found
        }
    }
    catch (error) {
        console.error(`Error fetching chat history for birth chart (userId: ${userId}, birthChartAnalysisId: ${birthChartAnalysisId}):`, error);
        throw error;
    }
}
export async function getChatHistoryForRelationshipAnalysis(userId, compositeChartId, numPairs = 5) {
    const filter = {
        userId: userId,
        compositeChartId: compositeChartId
    };
    // We want to retrieve 'numPairs' of (user + assistant) messages.
    // So, we need to get the last (numPairs * 2) messages from the array.
    const numberOfMessagesToRetrieve = numPairs * 2;
    const projection = {
        // Slice the messages array to get the last 'numberOfMessagesToRetrieve' elements.
        // A negative value for $slice takes elements from the end of the array.
        messages: { $slice: -numberOfMessagesToRetrieve },
        // You can include other fields if needed, like _id, userId, compositeChartId
        _id: 0 // Exclude _id if you only want the messages
    };
    try {
        // Assuming your collection for relationship chat threads is named 'chatThreadRelationshipAnalysisCollection'
        const chatThread = await chatThreadRelationshipAnalysisCollection.findOne(filter, { projection });
        if (chatThread && chatThread.messages) {
            return chatThread.messages; // Returns an array of message objects
        }
        else {
            return []; // Return an empty array if no thread or messages are found
        }
    }
    catch (error) {
        console.error(`Error fetching chat history for relationship analysis (userId: ${userId}, compositeChartId: ${compositeChartId}):`, error);
        throw error;
    }
}
/**
 * Fetches pre-generated transit series data from the database for a given date range.
 * @param {string} startDateStr - The start date of the range (ISO string format).
 * @param {string} endDateStr - The end date of the range (ISO string format).
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of transit series objects.
 * Each object will have its 'date' property as a Date object.
 */
export async function getPreGeneratedTransitSeries(startDateStr, endDateStr) {
    try {
        const query = {
            date: {
                $gte: startDateStr, // MongoDB can compare ISO date strings
                $lte: endDateStr
            }
        };
        const seriesDocuments = await transitEphemerisCollection.find(query).sort({ date: 1 }).toArray();
        console.log("seriesDocuments: ", seriesDocuments);
        // Transform documents to ensure the 'date' field is a Date object,
        // consistent with what scanTransitSeries might expect.
        return seriesDocuments.map(doc => ({
            ...doc,
            date: new Date(doc.date) // Convert ISO string from DB to Date object
        }));
    }
    catch (error) {
        console.error('Error fetching pre-generated transit series:', error);
        throw error; // Re-throw to be handled by the caller
    }
}
