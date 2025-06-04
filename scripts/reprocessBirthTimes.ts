import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { getRawChartDataEphemeris, getRawChartDataEphemerisNoTime } from '../services/ephemerisDataService.js';

dotenv.config();

const connection_string = process.env.MONGO_CONNECTION_STRING;

async function reprocessBirthTimes() {
  const client = new MongoClient(connection_string);

  try {
    await client.connect();
    const db = client.db('stellium');
    const userCollection = db.collection('users');

    const cursor = userCollection.find({});
    let processed = 0;
    let errors = 0;

    for await (const user of cursor) {
      try {
        if (!user.dateOfBirth || !user.birthChart) {
          continue;
        }

        const date = new Date(user.dateOfBirth);

        let updatedChart;

        if (user.birthTimeUnknown) {
          // For unknown birth time users, use 12:00 noon and remove house data
          const data = {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            hour: 12, // Use noon for unknown time
            min: 0,
            lat: parseFloat(user.birthChart.lat),
            lon: parseFloat(user.birthChart.lon),
            tzone: parseFloat(user.totalOffsetHours)
          };

          const baseChart = await getRawChartDataEphemeris(data);
          updatedChart = getRawChartDataEphemerisNoTime(baseChart);
        } else {
          // For known birth time users, use the existing logic
          const data = {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            hour: date.getHours(),
            min: date.getMinutes(),
            lat: parseFloat(user.birthChart.lat),
            lon: parseFloat(user.birthChart.lon),
            tzone: parseFloat(user.totalOffsetHours)
          };

          updatedChart = await getRawChartDataEphemeris(data);
        }

        await userCollection.updateOne(
          { _id: user._id },
          { $set: { birthChart: updatedChart } }
        );

        processed++;
        if (processed % 10 === 0) {
          console.log(`Processed ${processed} users`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        errors++;
        console.error(`Error processing user ${user._id}:`, err);
      }
    }

    console.log(`Completed ${processed} users with ${errors} errors`);
  } catch (err) {
    console.error('Script error:', err);
  } finally {
    await client.close();
  }
}

reprocessBirthTimes().catch(console.error);
