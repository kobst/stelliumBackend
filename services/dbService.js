import { MongoClient, ObjectId } from 'mongodb';

const connection_string = process.env.MONGO_CONNECTION_STRING;
const client = new MongoClient(connection_string, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect();
const db = client.db('stellium');
const transitsCollection = db.collection('daily_transits');
const aspectsCollection = db.collection('daily_aspects');
const retrogradesCollection = db.collection('retrogrades');
const userCollection = db.collection('users');
const birthChartInterpretations = db.collection('user_birth_chart_interpretation');
const userTransitAspectsCollection = db.collection('user_transit_aspects');

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


export async function saveUser(user) {
    const result = await userCollection.insertOne(user);
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