// @ts-nocheck
// loop through existing composite charts
// for each chart, get the relationship score
import { MongoClient, ObjectId } from 'mongodb';
import { scoreRelationshipCompatibility } from '../utilities/relationshipScoring.js';
const connection_string = process.env.MONGO_CONNECTION_STRING;
async function generateRelationshipScores() {
    const client = new MongoClient(connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db('stellium');
    const compositeChartCollection = db.collection('composite_charts');
    const batchSize = 100; // Process 100 documents at a time
    let processed = 0;
    // Use cursor for efficient pagination
    const cursor = compositeChartCollection.find({}).batchSize(batchSize);
    while (await cursor.hasNext()) {
        const compositeChart = await cursor.next();
        try {
            const userA = await db.collection('users').findOne({ _id: new ObjectId(compositeChart.userA_id) });
            const userB = await db.collection('users').findOne({ _id: new ObjectId(compositeChart.userB_id) });
            if (!userA || !userB) {
                console.log(`Skipping chart ${compositeChart._id} - missing user data`);
                continue;
            }
            await scoreRelationshipCompatibility(compositeChart.synastryAspects, compositeChart.compositeChart, userA, userB, compositeChart._id);
            // Add a small delay between processing each chart
            await new Promise(resolve => setTimeout(resolve, 500));
            processed++;
            if (processed % 10 === 0) {
                console.log(`Processed ${processed} charts`);
            }
        }
        catch (error) {
            console.error(`Error processing chart ${compositeChart._id}:`, error);
        }
    }
    console.log(`Finished processing ${processed} charts`);
    await client.close();
}
generateRelationshipScores();
