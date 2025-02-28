import { MongoClient, ObjectId } from 'mongodb';
import { processInterpretationSection } from '../utilities/vectorize.js';

const connection_string = process.env.MONGO_CONNECTION_STRING
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
const synastryChartInterpretations = db.collection('synastry_chart_interpretations');

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
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}




export async function getDailyTransits (date) {
    const inputDate = new Date(date);
    const closestTransit = await transitsCollection.findOne({ date: { $gte: inputDate } }, { sort: { date: 1 } });
    return closestTransit ? closestTransit.transits : [];
};

export async function getPeriodTransitsObject (startDate, endDate) {
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
};


// get all transits from the general transit collection for a given date range
export async function getPeriodTransits (startDate, endDate) {
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
            { "date_range.0": { $lte: end } },   // Start of the aspect's date range is before or at the end date
            { "date_range.1": { $gte: start } }  // End of the aspect's date range is after or at the start date
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
    } catch (error) {
        console.error("Error fetching retrogrades:", error);
        throw new Error("Unable to fetch retrogrades");
    }
};


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
    } catch (error) {
        console.error("Error fetching retrogrades for date range:", error);
        throw new Error("Unable to fetch retrogrades for date range");
    }
};

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
    } catch (error) {
        console.error("Error in getBirthChart:", error);
        throw error;
    }
}


export async function getUsers() {
    try {
        const users = await userCollection.find({})
            .limit(20)
            .toArray();
        return users;
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
}


export async function getUserSingle(userId) {
    console.log("getUserSingle", { userId });
    try {
        const user = await userCollection.findOne({ _id: new ObjectId(userId) });
        return user;
    } catch (error) {
        console.error("Error in getUserSingle:", error);
        throw error;
    }
}

export async function getCompositeCharts() {
    console.log("getCompositeCharts")
    try {
        const compositeCharts = await compositeChartCollection.find({}).toArray();
        return compositeCharts;
    } catch (error) {
        console.error("Error in getCompositeCharts:", error);
        throw error;
    }
}

export async function saveUser(user) {
    const result = await userCollection.insertOne(user);
    return result;
}

export async function saveCompositeChart(compositeChart) {
    console.log("saveCompositeChart", compositeChart)
    const result = await compositeChartCollection.insertOne(compositeChart);
    return result;
}


export async function saveUserTransitAspects(groupedAspects, userId) {
    const savePromises = groupedAspects.map(aspect => 
        userTransitAspectsCollection.insertOne({ ...aspect, userId })
    );
    await Promise.all(savePromises);
}

// get aspects from the general transit collection given a start and end date
export async function getPeriodAspectsForUser(startDate, endDate, userId) {
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
    } catch (error) {
        console.error("Error in saveBirthChartInterpretation:", error);
        console.error("Error stack:", error.stack);
        throw error;
    }
}


export async function upsertVectorizedInterpretation(userId, heading, promptDescription, interpretation) {
    try {
        await processInterpretationSection(userId, heading, promptDescription, interpretation);
    } catch (error) {
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

        const document = await birthChartInterpretations.findOne(
            { userId: new ObjectId(userId) }
        );

        return document?.birthChartInterpretation|| {};
    } catch (error) {
        console.error("Error in getBirthChartInterpretation:", error);
        throw error;
    }
}



export async function saveCompositeChartInterpretation(compositeChartId, heading, promptDescription, interpretation, isCompositeChart) {
    console.log("saveCompositeChartInterpretation", { compositeChartId, heading, promptDescription, interpretation, isCompositeChart });
    try {
        if (!ObjectId.isValid(compositeChartId)) {
            throw new Error(`Invalid compositeChartId: ${compositeChartId}`);
        }

        const objectId = new ObjectId(compositeChartId);

        // First, try to find the existing document
        let document = await compositeChartInterpretations.findOne({ _id: objectId });

        if (!document) {
            // If no document exists, create a new one with empty objects for both interpretation types
            document = { 
                _id: objectId, 
                compositeChartInterpretation: {},
                synastryInterpretation: {}
            };
        } else {
            // Ensure both interpretation objects exist
            if (!document.compositeChartInterpretation) {
                document.compositeChartInterpretation = {};
            }
            if (!document.synastryInterpretation) {
                document.synastryInterpretation = {};
            }
        }

        // Update the specific heading under the appropriate interpretation object
        if (isCompositeChart) {
            document.compositeChartInterpretation[heading] = { promptDescription, interpretation };
        } else {
            document.synastryInterpretation[heading] = { promptDescription, interpretation };
        }

        // Use replaceOne with upsert to either update the existing document or insert a new one
        const result = await compositeChartInterpretations.replaceOne(
            { _id: objectId },
            document,
            { upsert: true }
        );

        console.log("Update result:", JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
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

        const document = await compositeChartInterpretations.findOne(
            { _id: new ObjectId(compositeChartId) }
        );

        return document?.compositeChartInterpretation|| {};
    } catch (error) {
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

        const document = await compositeChartInterpretations.findOne(
            { _id: new ObjectId(compositeChartId) }
        );
        
        return document?.synastryInterpretation|| {};
    } catch (error) {
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
        return document?.synastryChartInterpretation|| {};
    } catch (error) {
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


    const result = await weeklyTransitInterpretations.updateOne(
        { date: isoDate },
        { 
            $setOnInsert: { date: isoDate },
            $push: { weeklyInterpretations: interpretation }
        },
        { upsert: true }
    );

    if (result.upsertedId) {
        return await weeklyTransitInterpretations.findOne({ _id: result.upsertedId });
    } else {
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
