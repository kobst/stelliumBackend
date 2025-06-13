import { MongoClient, ObjectId, Db, Collection } from 'mongodb';
import { processInterpretationSection } from './vectorize.js';
import { getMongoConnectionString } from './secretsService.js';
import { 
  UserDocument, 
  BirthChartAnalysisDocument, 
  RelationshipAnalysisDocument,
  CompositeChartDocument,
  CompositeChartInterpretationDocument,
  HoroscopeDocument,
  TransitEphemerisDocument,
  RelationshipLogDocument,
  ChatThreadDocument,
  BirthChartInterpretationDocument
} from '../types/database.js';
import { BirthChart, Planet } from '../types/astrology.js';

let connection_string: string;

// Connection promise to ensure single connection attempt
let connectionPromise: Promise<MongoClient> | null = null;

async function getClient(): Promise<MongoClient> {
  if (!connectionPromise) {
    if (!connection_string) {
      connection_string = await getMongoConnectionString();
    }
    const clientWithConnectionString = new MongoClient(connection_string, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 30000,
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true
    });
    connectionPromise = clientWithConnectionString.connect();
  }
  return connectionPromise;
}
// Database and collection getters with proper connection handling
let db: Db;
let transitsCollection: Collection<any>;
let aspectsCollection: Collection<any>;
let retrogradesCollection: Collection<any>;
let userCollection: Collection<any>;
let birthChartInterpretations: Collection<any>;
let userTransitAspectsCollection: Collection<any>;
let dailyTransitInterpretations: Collection<any>;
let weeklyTransitInterpretations: Collection<any>;
let compositeChartCollection: Collection<any>;
let compositeChartInterpretations: Collection<any>;
let relationshipLogCollection: Collection<any>;
let birthChartAnalysisCollection: Collection<any>;
let relationshipAnalysisCollection: Collection<any>;
let chatThreadCollectionBirthChartAnalysis: Collection<any>;
let chatThreadRelationshipAnalysisCollection: Collection<any>;
let transitEphemerisCollection: Collection<any>;
let horoscopesCollection: Collection<any>;

async function getDb(): Promise<Db> {
  if (!db) {
    const client = await getClient();
    db = client.db('stellium');
    
    // Initialize collections
    transitsCollection = db.collection('daily_transits');
    aspectsCollection = db.collection('daily_aspects');
    retrogradesCollection = db.collection('retrogrades');
    userCollection = db.collection('users');
    birthChartInterpretations = db.collection('user_birth_chart_interpretation');
    userTransitAspectsCollection = db.collection('user_transit_aspects');
    dailyTransitInterpretations = db.collection('daily_transit_interpretations');
    weeklyTransitInterpretations = db.collection('weekly_transit_interpretations');
    compositeChartCollection = db.collection('composite_charts');
    compositeChartInterpretations = db.collection('composite_chart_interpretations');
    relationshipLogCollection = db.collection('relationship_logs');
    birthChartAnalysisCollection = db.collection('birth_chart_analysis');
    relationshipAnalysisCollection = db.collection('relationship_analysis');
    chatThreadCollectionBirthChartAnalysis = db.collection('chat_threads_birth_chart_analysis');
    chatThreadRelationshipAnalysisCollection = db.collection('chat_threads_relationship_analysis');
    transitEphemerisCollection = db.collection('transit_ephemeris');
    horoscopesCollection = db.collection('horoscopes');
  }
  return db;
}
// const synastryChartInterpretations = db.collection('synastry_chart_interpretations');

export async function initializeDatabase(): Promise<void> {
    try {
        console.log("Initializing database with connection pooling");
        
        // Ensure database connection is established
        await getDb();
        
        // Create essential indexes for performance
        console.log("Creating database indexes...");
        
        // User collection indexes
        await userCollection.createIndex({ email: 1 }, { unique: true });
        await userCollection.createIndex({ _id: 1, email: 1 });
        
        // Transit collection indexes
        await transitsCollection.createIndex({ date: 1 });
        await aspectsCollection.createIndex({ "date_range.0": 1, "date_range.1": 1 });
        await retrogradesCollection.createIndex({ "date_range.0": 1, "date_range.1": 1 });
        
        // Birth chart analysis indexes
        await birthChartAnalysisCollection.createIndex({ userId: 1 });
        await birthChartAnalysisCollection.createIndex({ "debug.inputSummary.userId": 1 });
        
        // Relationship analysis indexes
        await relationshipAnalysisCollection.createIndex({ "debug.inputSummary.compositeChartId": 1 });
        await relationshipAnalysisCollection.createIndex({ "debug.inputSummary.userAId": 1, "debug.inputSummary.userBId": 1 });
        
        // Composite chart indexes
        await compositeChartCollection.createIndex({ userAId: 1, userBId: 1 });
        await compositeChartCollection.createIndex({ _id: 1 });
        
        // Chat thread indexes
        await chatThreadCollectionBirthChartAnalysis.createIndex({ userId: 1 });
        await chatThreadRelationshipAnalysisCollection.createIndex({ compositeChartId: 1 });
        
        // Horoscope collection indexes
        await horoscopesCollection.createIndex({ userId: 1, date: 1 });
        
        // Transit ephemeris indexes
        await transitEphemerisCollection.createIndex({ date: 1 });
        
        console.log('Database initialized successfully with indexes');
    } catch (error: unknown) {
        console.error('Error initializing database:', error);
        throw error;
    }
}




export async function getDailyTransits(date: string | Date): Promise<any[]> {
    await getDb();
    const inputDate = new Date(date);
    const closestTransit = await transitsCollection.findOne({ date: { $gte: inputDate } }, { sort: { date: 1 } });
    return closestTransit ? closestTransit.transits : [];
};

export async function getPeriodTransitsObject(startDate: string | Date, endDate: string | Date): Promise<Record<string, any[]>> {
    const query = {
        date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    };
    const matchingTransits = await transitsCollection.find(query).toArray();
    const transitsData = matchingTransits.reduce((acc: Record<string, any>, transit: any) => {
        const dateKey = transit.date.toISOString();
        acc[dateKey] = transit.transits.map((planet: Planet) => ({
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
};


// get all transits from the general transit collection for a given date range
export async function getPeriodTransits(startDate: string | Date, endDate: string | Date): Promise<any[]> {
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
    return matchingAspects
};


// get all aspects from the general transit collection db for a given date
export async function getDailyAspects(date: string | Date): Promise<any[]> {
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
export async function getPeriodAspects(startDate: string | Date, endDate: string | Date): Promise<any[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const matchingAspects = await aspectsCollection.find({
        $and: [
            { "date_range.0": { $lte: end } },   // Start of the aspect's date range is before or at the end date
            { "date_range.1": { $gte: start } }  // End of the aspect's date range is after or at the start date
        ]
    }).toArray();
    return matchingAspects;
}

// get all retrogrades from the retrogrades collection for a given date
export async function getRetrogrades(date: string | Date): Promise<any[]> {
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
    } catch (error: unknown) {
        console.error("Error fetching retrogrades:", error);
        throw new Error("Unable to fetch retrogrades");
    }
};


// get all retrogrades from the retrogrades collection for a given date range
export async function getRetrogradesForDateRange(startDate: string | Date, endDate: string | Date): Promise<any[]> {
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
    } catch (error: unknown) {
        console.error("Error fetching retrogrades for date range:", error);
        throw new Error("Unable to fetch retrogrades for date range");
    }
};

// get aspects from the general transit collection given a start and end date for the requested birthchart
export async function getAspectsForChart(startDate: string | Date, endDate: string | Date, birthChartId: string): Promise<any[]> {
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
export async function getBirthChart(userId: string): Promise<any> {
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
    } catch (error: unknown) {
        console.error("Error in getBirthChart:", error);
        throw error;
    }
}


export async function getUsers(): Promise<any[]> {
    try {
        const users = await userCollection.find({})
            .limit(50)
            .toArray();
        return users;
    } catch (error: unknown) {
        console.error('Error fetching users:', error);
        throw error;
    }
}


export async function getUserSingle(userId: string): Promise<any> {
    console.log("getUserSingle", { userId });
    try {
        const user = await userCollection.findOne({ _id: new ObjectId(userId) });
        return user;
    } catch (error: unknown) {
        console.error("Error in getUserSingle:", error);
        throw error;
    }
}

export async function getCompositeCharts(): Promise<any[]> {
    console.log("getCompositeCharts")
    try {
        const compositeCharts = await compositeChartCollection.find({}).toArray();
        return compositeCharts;
    } catch (error: unknown) {
        console.error("Error in getCompositeCharts:", error);
        throw error;
    }
}

export async function saveUser(user: any): Promise<any> {
    const result = await userCollection.insertOne(user);
    return result;
}

export async function saveCompositeChart(compositeChart: any): Promise<any> {
    // console.log("saveCompositeChart", compositeChart)
    const result = await compositeChartCollection.insertOne(compositeChart);
    return result;
}

export async function saveRelationshipLog(relationshipLog: any): Promise<any> {
    const result = await relationshipLogCollection.insertOne(relationshipLog);
    return result;
}

export async function saveRelationshipScoring(relationshipScoringLog: any): Promise<any> {
    try {
        const result = await relationshipAnalysisCollection.insertOne(relationshipScoringLog);
        return result;
    } catch (error: unknown) {
        console.error("Error in saveRelationshipScoring:", error);
        throw error;
    }
}

export async function saveRelationshipAnalysis(compositeChartId: string, analysis: any): Promise<any> {
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
        const result = await relationshipAnalysisCollection.replaceOne(
            { _id: document._id },
            document
        );

        if (result.modifiedCount === 1) {
            console.log(`Successfully saved analysis for compositeChartId: ${compositeChartId}`);
            return { success: true, message: "Analysis saved successfully" };
        } else {
            console.warn(`Document found but not updated for compositeChartId: ${compositeChartId}`);
            return { success: false, message: "Document found but not updated" };
        }
    } catch (error: any) {
        console.error(`Error saving relationship analysis for compositeChartId: ${compositeChartId}:`, error.message, error.stack);
        throw error; // Re-throw to allow the caller to handle it
    }
}

export async function fetchRelationshipAnalysisByCompositeId(compositeChartId: string) {
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
            lastUpdated: null as Date | null,
            relationshipAnalysis: false
        };

        return {
            scores: analysis.scores,
            debug: analysis.debug,
            analysis: analysis.analysis || analysis.categoryAnalysis, // Support both field names
            categoryAnalysis: analysis.categoryAnalysis || analysis.analysis, // Backward compatibility
            vectorizationStatus: analysis.vectorizationStatus || defaultVectorizationStatus,
            workflowStatus: analysis.workflowStatus || {
                isRunning: false,
                startedAt: null,
                completedAt: null,
                lastUpdated: null
            },
            _id: analysis._id
        };
    } catch (error: any) {
        console.error(`Error fetching relationship analysis for compositeChartId ${compositeChartId}:`, error);
        throw error;
    }
}




export async function saveUserTransitAspects(groupedAspects: any[], userId: string): Promise<void> {
    const savePromises = groupedAspects.map((aspect: any) => 
        userTransitAspectsCollection.insertOne({ ...aspect, userId })
    );
    await Promise.all(savePromises);
}

// get aspects from the general transit collection given a start and end date
export async function getPeriodAspectsForUser(startDate: string | Date, endDate: string | Date, userId: string): Promise<any[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const matchingAspects = await userTransitAspectsCollection.find({
        userId: userId,
        $or: [
            { "date_range.0": { $lte: end } },   // Start of the aspect's date range is before or at the end date
            { "date_range.1": { $gte: start } }  // End of the aspect's date range is after or at the start date
        ]
    }).toArray();
    return matchingAspects;
}

export async function saveBirthChartInterpretation(userId: string, heading: string, promptDescription: string, interpretation: string): Promise<any> {
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
        } else if (!document.birthChartInterpretation) {
            // If the document exists but doesn't have a birthChartInterpretation field, add it
            document.birthChartInterpretation = {};
        }

        // Update the specific heading within the birthChartInterpretation object
        document.birthChartInterpretation[heading] = { promptDescription, interpretation };

        // Use replaceOne with upsert to either update the existing document or insert a new one
        const result = await birthChartInterpretations.replaceOne(
            { userId: objectId },
            document,
            { upsert: true }
        );

        console.log("Update result:", JSON.stringify(result, null, 2));
        return result;
    } catch (error: any) {
        console.error("Error in saveBirthChartInterpretation:", error);
        console.error("Error stack:", error.stack);
        throw error;
    }
}


export async function upsertVectorizedInterpretation(userId: string, heading: string, promptDescription: string, interpretation: string): Promise<void> {
    try {
        await processInterpretationSection(userId, heading, promptDescription, interpretation);
    } catch (error: unknown) {
        console.error("Error in upsertVectorizedInterpretation:", error);
        throw error;
    }
}

export async function getBirthChartInterpretation(userId: string): Promise<any> {
    console.log("getBirthChartInterpretation", { userId });
    try {
        if (!ObjectId.isValid(userId)) {
            throw new Error(`Invalid userId: ${userId}`);
        }

        const document = await birthChartInterpretations.findOne(
            { userId: new ObjectId(userId) }
        );

        return document?.birthChartInterpretation|| {};
    } catch (error: unknown) {
        console.error("Error in getBirthChartInterpretation:", error);
        throw error;
    }
}



export async function saveCompositeChartInterpretation(compositeChartId: string, heading: string, promptDescription: string, interpretation: string): Promise<any> {
    console.log("saveCompositeChartInterpretation", { compositeChartId, heading, promptDescription, interpretation});
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
        } else {
            if (!document.compositeChartInterpretation) {
                document.compositeChartInterpretation = {};
            }
            // Preserve any existing synastryInterpretation if it exists
        }

        // Update the specific heading under the appropriate interpretation object
        document.compositeChartInterpretation[heading] = { promptDescription, interpretation };
      
        // Use replaceOne with upsert to either update the existing document or insert a new one
        const result = await compositeChartInterpretations.replaceOne(
            { _id: objectId },
            document,
            { upsert: true }
        );

        console.log("Update result:", JSON.stringify(result, null, 2));
        return result;
    } catch (error: any) {
        console.error("Error in saveCompositeChartInterpretation:", error);
        console.error("Error stack:", error.stack);
        throw error;
    }
}

// save synastry chart interpretation
export async function saveSynastryChartInterpretation(compositeChartId: string, heading: string, promptDescription: string, interpretation: string): Promise<any> {
    console.log("saveCompositeChartInterpretation", { compositeChartId, heading, promptDescription, interpretation});
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
        } else {
            if (!document.synastryInterpretation) {
                document.synastryInterpretation = {};
            }
            // Preserve any existing synastryInterpretation if it exists
        }

        // Update the specific heading under the appropriate interpretation object
        document.synastryInterpretation[heading] = { promptDescription, interpretation };
      
        // Use replaceOne with upsert to either update the existing document or insert a new one
        const result = await compositeChartInterpretations.replaceOne(
            { _id: objectId },
            document,
            { upsert: true }
        );

        console.log("Update result:", JSON.stringify(result, null, 2));
        return result;
    } catch (error: any) {
        console.error("Error in saveCompositeChartInterpretation:", error);
        console.error("Error stack:", error.stack);
        throw error;
    }
}



export async function getCompositeChartInterpretation(compositeChartId: string): Promise<any> {
    console.log("getCompositeChartInterpretation", { compositeChartId });
    try {
        if (!ObjectId.isValid(compositeChartId)) {
            throw new Error(`Invalid compositeChartId: ${compositeChartId}`);
        }

        const document = await compositeChartInterpretations.findOne(
            { _id: new ObjectId(compositeChartId) }
        );

        return document?.compositeChartInterpretation|| {};
    } catch (error: any) {
        console.error("Error in getCompositeChartInterpretation:", error);
        throw error;
    }
}

export async function getSynastryInterpretation(compositeChartId: string): Promise<any> {
    console.log("getSynastryInterpretation", { compositeChartId });
    try {
        if (!ObjectId.isValid(compositeChartId)) {
            throw new Error(`Invalid compositeChartId: ${compositeChartId}`);
        }

        const document = await compositeChartInterpretations.findOne(
            { _id: new ObjectId(compositeChartId) }
        );
        
        return document?.synastryInterpretation|| {};
    } catch (error: any) {
        console.error("Error in getSynastryInterpretation:", error);
        throw error;
    }
}



export async function getSynastryChartInterpretation(synastryChartId: string): Promise<any> {
    console.log("getSynastryChartInterpretation", { synastryChartId });
    try {
        if (!ObjectId.isValid(synastryChartId)) {
            throw new Error(`Invalid synastryChartId: ${synastryChartId}`);
        }

        const document = await compositeChartInterpretations.findOne({ _id: new ObjectId(synastryChartId) });
        return document?.synastryChartInterpretation|| {};
    } catch (error: any) {
        console.error("Error in getSynastryChartInterpretation:", error);
        throw error;
    }
}


export async function saveDailyTransitInterpretationData(date: string | Date, combinedAspectsDescription: any[], dailyTransitInterpretation: string): Promise<any> {

    // Convert the date string to a Date object
    const isoDate = new Date(date);
    // Set the time to 00:00:00
    isoDate.setUTCHours(0, 0, 0, 0);

    const document = {
        date: isoDate,
        combinedDescription: combinedAspectsDescription,
        dailyTransitInterpretation: dailyTransitInterpretation
    };

    const result = await dailyTransitInterpretations.updateOne(
        { date: isoDate },
        { $set: document },
        { upsert: true }
    );

    // If a new document was inserted, we need to fetch it to get the _id
    if (result.upsertedId) {
        const insertedDocument = await dailyTransitInterpretations.findOne({ _id: result.upsertedId });
        return insertedDocument;
    } else {
        // If the document was updated, fetch and return the updated document
        const updatedDocument = await dailyTransitInterpretations.findOne({ date: isoDate });
        return updatedDocument;
    }
}


export async function getDailyTransitInterpretationData(date: string | Date): Promise<any[]> {
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


export async function saveWeeklyTransitInterpretationData(date: string | Date, combinedAspectsDescription: any[], weeklyTransitInterpretation: string, sign: string): Promise<any> {
    const isoDate = new Date(date);
    isoDate.setUTCHours(0, 0, 0, 0);

    const interpretation = {
        sign,
        combinedDescription: Array.isArray(combinedAspectsDescription) ? combinedAspectsDescription : [combinedAspectsDescription],
        weeklyTransitInterpretation
    };


    const result = await weeklyTransitInterpretations.updateOne(
        { date: isoDate },
        { 
            $setOnInsert: { date: isoDate },
            $push: { weeklyInterpretations: interpretation }
        } as any,
        { upsert: true }
    );

    if (result.upsertedId) {
        return await weeklyTransitInterpretations.findOne({ _id: result.upsertedId });
    } else {
        return await weeklyTransitInterpretations.findOne({ date: isoDate });
    }

}

export async function getWeeklyTransitInterpretationData(date: string | Date): Promise<any[]> {
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


export async function saveBasicAnalysis(userId: string, analysis: any) {
    const existingDocument = await birthChartAnalysisCollection.findOne({
        userId: new ObjectId(userId)
    });

    if (existingDocument) {
        // Use atomic field updates to prevent overwriting existing data
        const updateFields: Record<string, any> = {
            'interpretation.timestamp': analysis.timestamp,
            'interpretation.metadata': analysis.metadata
        };

        // Only update specific fields that exist in the new analysis
        if (analysis.basicAnalysis.overview !== undefined) {
            updateFields['interpretation.basicAnalysis.overview'] = analysis.basicAnalysis.overview;
        }
        
        if (analysis.basicAnalysis.dominance) {
            Object.entries(analysis.basicAnalysis.dominance).forEach(([type, data]: [string, any]) => {
                updateFields[`interpretation.basicAnalysis.dominance.${type}`] = data;
            });
        }
        
        if (analysis.basicAnalysis.planets) {
            Object.entries(analysis.basicAnalysis.planets).forEach(([planet, data]: [string, any]) => {
                updateFields[`interpretation.basicAnalysis.planets.${planet}`] = data;
            });
        }

        if (analysis.basicAnalysis.userId) {
            updateFields['interpretation.basicAnalysis.userId'] = analysis.basicAnalysis.userId;
        }
        
        if (analysis.basicAnalysis.createdAt) {
            updateFields['interpretation.basicAnalysis.createdAt'] = analysis.basicAnalysis.createdAt;
        }

        const result = await birthChartAnalysisCollection.updateOne(
            { userId: new ObjectId(userId) },
            { $set: updateFields }
        );
        return result;
    } else {
        // Create a new document if none exists
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

export async function getBasicAnalysisByUserId(userId: string) {
    try {
        const document = await birthChartAnalysisCollection.findOne({ 
            userId: new ObjectId(userId)  });
        
        if (!document || !document.interpretation || !document.interpretation.basicAnalysis) {
            console.log(`No basic analysis found for userId: ${userId}`);
            return {};
        }
        
        return document.interpretation.basicAnalysis;
    } catch (error: any) {
        console.error(`Error retrieving basic analysis for userId ${userId}:`, error);
        throw error;
    }
}

export async function getTopicAnalysisByUserId(userId: string) {
    try {
        const document = await birthChartAnalysisCollection.findOne({ 
            userId: new ObjectId(userId) });
        

        if (!document || !document.interpretation || !document.interpretation.SubtopicAnalysis) {
            console.log(`No topic analysis found for userId: ${userId}`);
            return {};
        }
        return document?.interpretation.SubtopicAnalysis || {};
    } catch (error: any) {
        console.error(`Error retrieving topic analysis for userId ${userId}:`, error);
        throw error;
    }
}

export async function getAllAnalysisByUserId(userId: string) {
    try {   
        const document = await birthChartAnalysisCollection.findOne({ 
            userId: new ObjectId(userId) 
        });
        
        if (!document) {
            return null;
        }

        return {
            birthChartAnalysisId: document._id,
            interpretation: {
                basicAnalysis: document.interpretation?.basicAnalysis || null,
                SubtopicAnalysis: document.interpretation?.SubtopicAnalysis || null,
                timestamp: document.interpretation?.timestamp || null,
                metadata: document.interpretation?.metadata || null
            },
            vectorizationStatus: document.vectorizationStatus || {
                overview: false,
                planets: {},
                dominance: {},
                basicAnalysis: false,
                topicAnalysis: {
                    isComplete: false
                },
                lastUpdated: null
            },
            workflowStatus: document.workflowStatus || {
                isRunning: false,
                startedAt: null,
                completedAt: null,
                lastUpdated: null
            }
        };
    } catch (error: any) {
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

export async function saveTopicAnalysis(userId: string, topicAnalysis: any) {
    const existingDocument = await birthChartAnalysisCollection.findOne({ 
        userId: new ObjectId(userId) 
    });
    
    if (existingDocument) {
        // Use atomic field updates to prevent race conditions
        const updateFields: Record<string, any> = {};
        
        // Iterate through each broad topic in the new analysis
        Object.entries(topicAnalysis).forEach(([broadTopic, topicData]: [string, any]) => {
            // Set the topic metadata
            updateFields[`interpretation.SubtopicAnalysis.${broadTopic}.label`] = topicData.label;
            updateFields[`interpretation.SubtopicAnalysis.${broadTopic}.relevantPositions`] = topicData.relevantPositions;
            
            // Set each individual subtopic atomically
            if (topicData.subtopics) {
                Object.entries(topicData.subtopics).forEach(([subtopicKey, subtopicContent]: [string, any]) => {
                    updateFields[`interpretation.SubtopicAnalysis.${broadTopic}.subtopics.${subtopicKey}`] = subtopicContent;
                });
            }
        });

        // Atomic update - only sets the specific fields that are changing
        const result = await birthChartAnalysisCollection.updateOne(
            { userId: new ObjectId(userId) },
            { $set: updateFields }
        );
        return result;
    } else {
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





export async function updateVectorizationStatus(userId: string, statusUpdates: any) {
    try {
        // Handle both old format (section, status, details) and new format (object of updates)
        if (typeof statusUpdates === 'string') {
            // Old format: updateVectorizationStatus(userId, section, status, details)
            const section = statusUpdates;
            const status = arguments[2];
            const details = arguments[3];
            
            let updatePath;
            if (section === 'topicAnalysis') {
                if (!details) {
                    updatePath = `vectorizationStatus.topicAnalysis.isComplete`;
                } else if (details.subtopic) {
                    updatePath = `vectorizationStatus.topicAnalysis.topics.${details.topic}.subtopics.${details.subtopic}`;
                } else if (details.topic) {
                    updatePath = `vectorizationStatus.topicAnalysis.topics.${details.topic}.isComplete`;
                }
            } else {
                updatePath = details 
                    ? `vectorizationStatus.${section}.${details}`
                    : `vectorizationStatus.${section}`;
            }

            await birthChartAnalysisCollection.updateOne(
                { userId: new ObjectId(userId) },
                { 
                    $set: { 
                        [updatePath]: status,
                        'vectorizationStatus.lastUpdated': new Date()
                    }
                }
            );
        } else {
            // New format: updateVectorizationStatus(userId, { key: value, key2: value2 })
            const setData: Record<string, any> = {};
            
            // Convert the object keys to vectorizationStatus paths
            for (const [key, value] of Object.entries(statusUpdates)) {
                setData[`vectorizationStatus.${key}`] = value;
            }
            
            setData['vectorizationStatus.lastUpdated'] = new Date();

            await birthChartAnalysisCollection.updateOne(
                { userId: new ObjectId(userId) },
                { $set: setData }
            );
        }
    } catch (error: any) {
        console.error(`Error updating vectorization status:`, error);
        throw error;
    }
}

export async function updateWorkflowRunningStatus(userId: string, isRunning: boolean, additionalData: Record<string, any> = {}) {
    try {
        const updateData: Record<string, any> = {
            'workflowStatus.isRunning': isRunning,
            'workflowStatus.lastUpdated': new Date(),
            ...additionalData
        };
        
        if (isRunning) {
            updateData['workflowStatus.startedAt'] = new Date();
        } else {
            updateData['workflowStatus.completedAt'] = new Date();
        }
        
        await birthChartAnalysisCollection.updateOne(
            { userId: new ObjectId(userId) },
            { $set: updateData },
            { upsert: true }
        );
        
        console.log(`✅ Updated workflow running status for user ${userId}: isRunning=${isRunning}`);
    } catch (error: any) {
        console.error(`Error updating workflow running status:`, error);
        throw error;
    }
}

export async function updateRelationshipVectorizationStatus(compositeChartId: string, analysisType: string, isVectorized: boolean, details: Record<string, any> = {}) {
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
        
        const result = await relationshipAnalysisCollection.updateOne(
            { 'debug.inputSummary.compositeChartId': compositeChartId },
            updateData
        );
        
        return {
            success: result.modifiedCount > 0,
            modifiedCount: result.modifiedCount
        };
    } catch (error: any) {
        console.error(`Error updating vectorization status for compositeChartId ${compositeChartId}:`, error);
        throw error;
    }
}

export async function updateRelationshipWorkflowRunningStatus(compositeChartId: string, isRunning: boolean, additionalData: Record<string, any> = {}) {
    try {
        const updateData: Record<string, any> = {
            'workflowStatus.isRunning': isRunning,
            'workflowStatus.lastUpdated': new Date(),
            ...additionalData
        };
        
        if (isRunning) {
            updateData['workflowStatus.startedAt'] = new Date();
        } else {
            updateData['workflowStatus.completedAt'] = new Date();
        }
        
        const result = await relationshipAnalysisCollection.updateOne(
            { 'debug.inputSummary.compositeChartId': compositeChartId },
            { $set: updateData },
            { upsert: true }
        );
        
        console.log(`✅ Updated relationship workflow running status for ${compositeChartId}: isRunning=${isRunning}`);
        
        return {
            success: result.modifiedCount > 0 || result.upsertedCount > 0,
            modifiedCount: result.modifiedCount,
            upsertedCount: result.upsertedCount
        };
    } catch (error: any) {
        console.error(`Error updating relationship workflow running status:`, error);
        throw error;
    }
}

export async function updateRelationshipAnalysisVectorization(compositeChartId: string, updateFields: Record<string, any>) {
    try {
        const updateData = { $set: updateFields };
        
        const result = await relationshipAnalysisCollection.updateOne(
            { 'debug.inputSummary.compositeChartId': compositeChartId },
            updateData,
            { upsert: true } // Add upsert to handle new documents
        );
        
        return {
            success: result.modifiedCount > 0 || result.upsertedCount > 0,
            modifiedCount: result.modifiedCount,
            upsertedCount: result.upsertedCount || 0
        };
    } catch (error: any) {
        console.error(`Error updating relationship analysis for compositeChartId ${compositeChartId}:`, error);
        throw error;
    }
}

// Safe function for saving initial relationship scores without overwriting existing analysis
export async function saveRelationshipScoresAndDebug(compositeChartId: string, relationshipScores: any) {
    try {
        const existingDocument = await relationshipAnalysisCollection.findOne({
            'debug.inputSummary.compositeChartId': compositeChartId
        });

        if (existingDocument) {
            // Only update specific fields to preserve existing analysis and vectorization
            const updateFields = {
                scores: relationshipScores.scores,
                'debug.categories': relationshipScores.debug.categories,
                'debug.inputSummary': relationshipScores.debug.inputSummary,
                compositeChartId: relationshipScores.compositeChartId,
                userIdA: relationshipScores.userIdA,
                userIdB: relationshipScores.userIdB,
                lastUpdated: relationshipScores.lastUpdated
            };

            // Only set createdAt if it doesn't exist
            if (!(existingDocument as any).createdAt) {
                (updateFields as any).createdAt = relationshipScores.createdAt;
            }

            const result = await relationshipAnalysisCollection.updateOne(
                { 'debug.inputSummary.compositeChartId': compositeChartId },
                { $set: updateFields }
            );
            return result;
        } else {
            // Create new document with full data
            const result = await relationshipAnalysisCollection.insertOne(relationshipScores);
            return result;
        }
    } catch (error: any) {
        console.error(`Error saving relationship scores for compositeChartId ${compositeChartId}:`, error);
        throw error;
    }
}


// chat

export async function saveChatHistoryForBirthChartAnalysis(userId: string, birthChartAnalysisId: string, userQuery: string, response: string) {
    const timestamp = new Date();

    // Ensure consistent data types
    const normalizedUserId = typeof userId === 'string' ? userId : (userId as any).toString();
    const normalizedBirthChartAnalysisId = typeof birthChartAnalysisId === 'string' ? birthChartAnalysisId : (birthChartAnalysisId as any).toString();

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
    } as any;

    const options = {
        upsert: true,
        returnDocument: 'after'
    } as any;

    try {
        const result = await chatThreadCollectionBirthChartAnalysis.findOneAndUpdate(filter, updateDoc, options);
        return result;
    } catch (error: any) {
        console.error(`Error saving chat history for userId ${userId} and birthChartAnalysisId ${birthChartAnalysisId}:`, error);
        throw error;
    }
}

export async function saveChatHistoryForRelationshipAnalysis(userId: string, compositeChartId: string, userQuery: string, response: string) {
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
    } as any;

    const options = {
        upsert: true, // Create the document if it doesn't exist
        returnDocument: 'after' // Return the modified document
    } as any;

    try {
        const result = await chatThreadRelationshipAnalysisCollection.findOneAndUpdate(filter, updateDoc, options);
        return result.value ? result.value : result;
    } catch (error: any) {
        console.error(`Error saving chat history for relationship analysis (userId: ${userId}, compositeChartId: ${compositeChartId}):`, error);
        throw error;
    }
}

export async function getChatHistoryForBirthChartAnalysis(userId: string, birthChartAnalysisId: string, numPairs: number = 5) {
    console.log("getChatHistoryForBirthChartAnalysis")
    console.log("userId: ", userId)
    console.log("birthChartAnalysisId: ", birthChartAnalysisId)
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
        } else {
            return []; // Return an empty array if no thread or messages are found
        }
    } catch (error: any) {
        console.error(`Error fetching chat history for birth chart (userId: ${userId}, birthChartAnalysisId: ${birthChartAnalysisId}):`, error);
        throw error;
    }
}

export async function getChatHistoryForRelationshipAnalysis(userId: string, compositeChartId: string, numPairs: number = 5) {
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
        } else {
            return []; // Return an empty array if no thread or messages are found
        }
    } catch (error: any) {
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
export async function getPreGeneratedTransitSeries(startDateStr: string, endDateStr: string) {
    try {
        const query = {
            date: {
                $gte: startDateStr, // MongoDB can compare ISO date strings
                $lte: endDateStr
            }
        };
        const seriesDocuments = await transitEphemerisCollection.find(query).sort({ date: 1 }).toArray();
        // console.log("seriesDocuments: ", seriesDocuments)
        // Transform documents to ensure the 'date' field is a Date object,
        // consistent with what scanTransitSeries might expect.
        return seriesDocuments.map((doc: any) => ({
            ...doc,
            date: new Date(doc.date) // Convert ISO string from DB to Date object
        }));
    } catch (error: any) {
        console.error('Error fetching pre-generated transit series:', error);
        throw error; // Re-throw to be handled by the caller
    }
}

// Horoscope storage functions

// Create or update a horoscope
export async function createHoroscope(horoscope: any) {
    try {
        const horoscopeDoc = {
            ...horoscope,
            _id: new ObjectId(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await horoscopesCollection.insertOne(horoscopeDoc);
        
        if (result.acknowledged) {
            return { ...horoscopeDoc, _id: result.insertedId };
        }
        throw new Error('Failed to create horoscope');
    } catch (error: any) {
        console.error('Error creating horoscope:', error);
        throw error;
    }
}

// Update an existing horoscope
export async function updateHoroscope(horoscopeId: string, updates: Record<string, any>) {
    try {
        const result = await horoscopesCollection.updateOne(
            { _id: new ObjectId(horoscopeId) },
            { 
                $set: {
                    ...updates,
                    updatedAt: new Date()
                }
            }
        );
        
        return result.modifiedCount > 0;
    } catch (error: any) {
        console.error('Error updating horoscope:', error);
        throw error;
    }
}

// Get horoscopes by user ID
export async function getHoroscopesByUserId(userId: string, type: string | null = null, limit: number = 10) {
    try {
        const query: Record<string, any> = { userId };
        if (type) {
            query.period = type;
        }
        
        const horoscopes = await horoscopesCollection
            .find(query)
            .sort({ generatedAt: -1 })
            .limit(limit)
            .toArray();
            
        return horoscopes;
    } catch (error: any) {
        console.error('Error fetching horoscopes:', error);
        throw error;
    }
}

// Get a specific horoscope
export async function getHoroscopeById(horoscopeId: string) {
    try {
        const horoscope = await horoscopesCollection.findOne({
            _id: new ObjectId(horoscopeId)
        });
        
        return horoscope;
    } catch (error: any) {
        console.error('Error fetching horoscope:', error);
        throw error;
    }
}

// Get latest horoscope for a user
export async function getLatestHoroscope(userId: string, type: string | null = null) {
    try {
        const query: Record<string, any> = { userId };
        if (type) {
            query.period = type;
        }
        
        const horoscope = await horoscopesCollection
            .findOne(query, { sort: { generatedAt: -1 } });
            
        return horoscope;
    } catch (error: any) {
        console.error('Error fetching latest horoscope:', error);
        throw error;
    }
}

// Delete a horoscope
export async function deleteHoroscope(horoscopeId: string, userId: string | null = null) {
    try {
        const query: Record<string, any> = { _id: new ObjectId(horoscopeId) };
        if (userId) {
            query.userId = userId; // Ensure user owns the horoscope
        }
        
        const result = await horoscopesCollection.deleteOne(query);
        
        return result.deletedCount > 0;
    } catch (error: any) {
        console.error('Error deleting horoscope:', error);
        throw error;
    }
}

// Check for existing horoscope within a date range
export async function getExistingHoroscope(userId: string, startDate: Date, endDate: Date, type: 'weekly' | 'monthly') {
    try {
        const horoscope = await horoscopesCollection.findOne({
            userId,
            period: type,
            startDate: { $eq: startDate },
            endDate: { $eq: endDate }
        });
        
        return horoscope;
    } catch (error: any) {
        console.error('Error checking for existing horoscope:', error);
        throw error;
    }
}

