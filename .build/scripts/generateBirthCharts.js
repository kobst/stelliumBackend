// @ts-nocheck
import { MongoClient } from 'mongodb';
import { getRawChartDataEphemeris } from '../services/ephemerisDataService.ts';
const connection_string = process.env.MONGO_CONNECTION_STRING;
async function regenerateBirthCharts() {
    const client = new MongoClient(connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    try {
        await client.connect();
        const db = client.db('stellium');
        const userCollection = db.collection('users');
        const cursor = userCollection.find({});
        let processed = 0;
        let errors = 0;
        while (await cursor.hasNext()) {
            const user = await cursor.next();
            // just try user with firstname 'Angelina' 
            try {
                // Parse date of birth
                const date = new Date(user.dateOfBirth);
                // Prepare data for ephemeris calculation
                const data = {
                    year: date.getFullYear(),
                    month: date.getMonth() + 1, // Months are 0-indexed
                    day: date.getDate(),
                    hour: date.getHours(),
                    min: date.getMinutes(),
                    lat: parseFloat(user.birthChart.lat),
                    lon: parseFloat(user.birthChart.lon),
                    tzone: parseFloat(user.totalOffsetHours)
                };
                // Get new birth chart data
                const newBirthChart = await getRawChartDataEphemeris(data);
                // Update user document
                await userCollection.updateOne({ _id: user._id }, { $set: { birthChart: newBirthChart } });
                processed++;
                console.log(`Processed user ${user._id} (${processed} total)`);
                // Optional: Add a small delay to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            catch (error) {
                errors++;
                console.error(`Error processing user ${user._id}:`, error);
            }
        }
        console.log(`Finished processing ${processed} users with ${errors} errors`);
    }
    catch (error) {
        console.error('Script error:', error);
    }
    finally {
        await client.close();
    }
}
// Run the script
regenerateBirthCharts().catch(console.error);
