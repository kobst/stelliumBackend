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
/**
 * Users Collection - TESTING PHASE ONLY
 * 
 * Current Implementation:
 * - Used for testing and development purposes
 * - Email field serves as unique identifier (with upsert fallback)
 * - Not true user accounts - represents birth chart data
 * - Some entries share emails for testing different charts
 * 
 * Future Architecture:
 * - Will integrate with Firebase Auth or AWS Cognito
 * - User accounts will have auth provider IDs
 * - Birth charts will be separated into their own collection
 * - Support for anonymous charts and multiple charts per user
 * 
 * See DATABASE.md for complete collection documentation
 */
let userCollection: Collection<any>;
let celebCollection: Collection<any>;
let subjectsCollection: Collection<any>;
let birthChartInterpretations: Collection<any>;
let compositeChartCollection: Collection<any>;
let compositeChartInterpretations: Collection<any>;
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
    userCollection = db.collection('users');
    celebCollection = db.collection('celebs');
    subjectsCollection = db.collection('subjects');
    birthChartInterpretations = db.collection('user_birth_chart_interpretation');
    compositeChartCollection = db.collection('composite_charts');
    compositeChartInterpretations = db.collection('composite_chart_interpretations');
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
        
        // Helper function to create index with error handling
        async function createIndexSafely(collection: Collection<any>, indexSpec: any, options?: any) {
            try {
                await collection.createIndex(indexSpec, options);
            } catch (error: any) {
                // Ignore duplicate key errors (code 11000) and index already exists errors (code 85)
                if (error.code === 11000) {
                    console.log(`Warning: Cannot create unique index on ${collection.collectionName} due to duplicate values. Index: ${JSON.stringify(indexSpec)}`);
                    // Try to create a non-unique index instead if it was supposed to be unique
                    if (options?.unique) {
                        try {
                            const nonUniqueOptions = { ...options };
                            delete nonUniqueOptions.unique;
                            await collection.createIndex(indexSpec, nonUniqueOptions);
                            console.log(`Created non-unique index instead for ${collection.collectionName}`);
                        } catch (retryError: any) {
                            if (retryError.code !== 85 && retryError.codeName !== 'IndexOptionsConflict') {
                                console.error(`Failed to create alternative index: ${retryError.message}`);
                            }
                        }
                    }
                } else if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
                    console.log(`Index already exists for ${collection.collectionName}: ${JSON.stringify(indexSpec)}`);
                } else if (error.code === 86 || error.codeName === 'IndexKeySpecsConflict') {
                    console.log(`Index name conflict for ${collection.collectionName}: ${JSON.stringify(indexSpec)}. An index with the same name but different options already exists.`);
                    // Try to drop the existing index and recreate with new options
                    try {
                        const indexName = Object.keys(indexSpec).map(key => `${key}_${indexSpec[key]}`).join('_');
                        await collection.dropIndex(indexName);
                        console.log(`Dropped existing index ${indexName} for ${collection.collectionName}`);
                        // Retry creating the index
                        await collection.createIndex(indexSpec, options);
                        console.log(`Successfully recreated index for ${collection.collectionName}: ${JSON.stringify(indexSpec)}`);
                    } catch (dropError: any) {
                        console.log(`Could not drop/recreate index for ${collection.collectionName}: ${dropError.message}`);
                    }
                } else {
                    throw error;
                }
            }
        }
        
        // User collection indexes
        await createIndexSafely(userCollection, { email: 1 }, { unique: true });
        await createIndexSafely(userCollection, { _id: 1, email: 1 });
        
        // Celeb collection indexes
        await createIndexSafely(celebCollection, { _id: 1 });
        await createIndexSafely(celebCollection, { firstName: 1, lastName: 1 });
        
        
        // Birth chart analysis indexes
        await createIndexSafely(birthChartAnalysisCollection, { userId: 1 });
        await createIndexSafely(birthChartAnalysisCollection, { "debug.inputSummary.userId": 1 });
        
        // Relationship analysis indexes
        await createIndexSafely(relationshipAnalysisCollection, { "debug.inputSummary.compositeChartId": 1 });
        await createIndexSafely(relationshipAnalysisCollection, { "debug.inputSummary.userAId": 1, "debug.inputSummary.userBId": 1 });
        
        // Composite chart indexes
        await createIndexSafely(compositeChartCollection, { userAId: 1, userBId: 1 });
        await createIndexSafely(compositeChartCollection, { _id: 1 });
        
        // Chat thread indexes
        await createIndexSafely(chatThreadCollectionBirthChartAnalysis, { userId: 1 });
        await createIndexSafely(chatThreadRelationshipAnalysisCollection, { compositeChartId: 1 });
        
        // Horoscope collection indexes
        await createIndexSafely(horoscopesCollection, { userId: 1, date: 1 });
        
        // Transit ephemeris indexes
        await createIndexSafely(transitEphemerisCollection, { date: 1 });
        
        console.log('Database initialized successfully with indexes');
    } catch (error: unknown) {
        console.error('Error initializing database:', error);
        throw error;
    }
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
        const users = await subjectsCollection.find({ 
            $or: [{ kind: "accountSelf" }, { isCelebrity: false }] 
        })
            .limit(50)
            .toArray();
        return users;
    } catch (error: unknown) {
        console.error('Error fetching users:', error);
        throw error;
    }
}

export async function getCelebs(): Promise<any[]> {
    try {
        const celebs = await subjectsCollection.find({ 
            $or: [{ kind: "celebrity" }, { isCelebrity: true }] 
        })
            .limit(50)
            .toArray();
        return celebs;
    } catch (error: unknown) {
        console.error('Error fetching celebs:', error);
        throw error;
    }
}


export async function getUserSingle(userId: string): Promise<any> {
    console.log("getUserSingle", { userId });
    try {
        const subject = await subjectsCollection.findOne({ _id: new ObjectId(userId) });
        return subject;
    } catch (error: unknown) {
        console.error("Error in getUserSingle:", error);
        throw error;
    }
}

export async function getCelebSingle(celebId: string): Promise<any> {
    console.log("getCelebSingle", { celebId });
    try {
        const celeb = await subjectsCollection.findOne({ 
            _id: new ObjectId(celebId),
            $or: [{ kind: "celebrity" }, { isCelebrity: true }]
        });
        return celeb;
    } catch (error: unknown) {
        console.error("Error in getCelebSingle:", error);
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

/**
 * Save a user to the database
 * 
 * IMPORTANT: This is a TESTING implementation
 * - Currently uses email as unique identifier
 * - Automatically updates if email already exists (upsert behavior)
 * - Allows multiple test charts with same email
 * 
 * Future implementation will:
 * - Use auth provider IDs (Firebase/Cognito)
 * - Separate user accounts from birth chart data
 * - Support proper user authentication
 * 
 * @param user - User object with email, name, birth data, and chart
 * @returns Insert result or update result if email exists
 */
export async function saveUser(user: any): Promise<any> {
    try {
        // Add subjects collection fields
        const subjectData = {
            ...user,
            kind: "accountSelf",
            ownerUserId: null,
            isCelebrity: false,
            isReadOnly: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // Try to insert the user
        const result = await subjectsCollection.insertOne(subjectData);
        return result;
    } catch (error: any) {
        // If it's a duplicate key error on email, update the existing user instead
        if (error.code === 11000 && error.keyPattern?.email) {
            console.log(`User with email ${user.email} already exists. Updating instead.`);
            const updateResult = await subjectsCollection.findOneAndUpdate(
                { email: user.email },
                { $set: { ...user, updatedAt: new Date() } },
                { returnDocument: 'after' }
            );
            return {
                acknowledged: true,
                insertedId: updateResult._id,
                upserted: true,
                matchedCount: 1,
                modifiedCount: 1
            };
        }
        // Re-throw other errors
        throw error;
    }
}

export async function saveCeleb(celeb: any): Promise<any> {
    try {
        // Add subjects collection fields for celebrity
        const subjectData = {
            ...celeb,
            kind: "celebrity",
            ownerUserId: null,
            isCelebrity: true,
            isReadOnly: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // Insert the celeb into subjects collection
        const result = await subjectsCollection.insertOne(subjectData);
        return result;
    } catch (error: any) {
        console.error('Error saving celeb:', error);
        throw error;
    }
}

export async function saveGuestSubject(subject: any, ownerUserId: string): Promise<any> {
    try {
        // Add subjects collection fields for guest subject
        const subjectData = {
            ...subject,
            kind: "guest",
            ownerUserId: new ObjectId(ownerUserId),
            isCelebrity: false,
            isReadOnly: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // Insert the guest subject into subjects collection
        const result = await subjectsCollection.insertOne(subjectData);
        return result;
    } catch (error: any) {
        console.error('Error saving guest subject:', error);
        throw error;
    }
}

export async function getUserSubjects(ownerUserId: string): Promise<any[]> {
    try {
        const subjects = await subjectsCollection.find({ 
            ownerUserId: new ObjectId(ownerUserId),
            kind: "guest"
        })
            .limit(50)
            .toArray();
        return subjects;
    } catch (error: unknown) {
        console.error('Error fetching user subjects:', error);
        throw error;
    }
}

export async function saveCompositeChart(compositeChart: any, ownerUserId?: string): Promise<any> {
    // Add ownership tracking if ownerUserId is provided
    const chartData = {
        ...compositeChart,
        ownerUserId: ownerUserId ? new ObjectId(ownerUserId) : null,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    const result = await compositeChartCollection.insertOne(chartData);
    return result;
}

export async function getUserCompositeCharts(ownerUserId: string): Promise<any[]> {
    try {
        const compositeCharts = await compositeChartCollection.find({ 
            $or: [
                { ownerUserId: new ObjectId(ownerUserId) },
                { userA_id: new ObjectId(ownerUserId) },
                { userB_id: new ObjectId(ownerUserId) }
            ]
        })
            .limit(50)
            .toArray();
        return compositeCharts;
    } catch (error: unknown) {
        console.error('Error fetching user composite charts:', error);
        throw error;
    }
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

