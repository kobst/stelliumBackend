import { MongoClient } from 'mongodb';
import { findPlanetsInModalitiesObjects, findPlanetsInElementsObjects, findPlanetsInQuadrantObjects } from '../utilities/generateDescriptions.js';

const connection_string = process.env.MONGO_CONNECTION_STRING || "mongodb+srv://kobst:AUG2013@version1.obfam.mongodb.net/stellium?retryWrites=true&w=majority";

async function updateUsers() {
    const client = new MongoClient(connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('stellium');
        const userCollection = db.collection('users');
        
        function addDominanceAndModalities(user) {
            // Check if user has birthChart and planets
            if (!user.birthChart?.planets) {
                console.log(`User ${user._id} missing birthChart or planets`);
                return user;
            }
            
            const planets = user.birthChart.planets;
            const modalities = findPlanetsInModalitiesObjects(planets);
            const elements = findPlanetsInElementsObjects(planets);
            const quadrants = findPlanetsInQuadrantObjects(planets);
            
            return {
                ...user,
                birthChart: {
                    ...user.birthChart,
                    modalities,
                    elements,
                    quadrants
                }
            };
        }
        
        // Use cursor to handle large collections efficiently
        const cursor = userCollection.find({});
        let updateCount = 0;
        
        for await (const user of cursor) {
            try {
                const modifiedUser = addDominanceAndModalities(user);
                await userCollection.updateOne(
                    { _id: user._id },
                    { 
                        $set: {
                            'birthChart.modalities': modifiedUser.birthChart.modalities,
                            'birthChart.elements': modifiedUser.birthChart.elements,
                            'birthChart.quadrants': modifiedUser.birthChart.quadrants
                        }
                    }
                );
                updateCount++;
                if (updateCount % 10 === 0) {
                    console.log(`Updated ${updateCount} users`);
                }
            } catch (error) {
                console.error(`Error updating user ${user._id}:`, error);
            }
        }
        
        console.log(`Completed updating ${updateCount} users`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run the update function
updateUsers().catch(console.error);