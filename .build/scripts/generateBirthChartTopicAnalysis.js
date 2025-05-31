// @ts-nocheck
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import { processTextSection, upsertRecords, retrieveTopicContext } from '../services/vectorize.ts';
import { generateTopicMapping } from '../utilities/birthChartScoring.ts';
import { getCompletionShortOverviewForTopic } from '../services/gptService.ts';
import { BroadTopicsEnum } from '../utilities/constants.ts';
// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const connection_string = process.env.MONGO_CONNECTION_STRING;
async function processBirthChartLogs() {
    try {
        const client = new MongoClient(connection_string, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        await client.connect();
        const db = client.db('stellium');
        const userCollection = db.collection('users');
        // Read from the correct logs directory
        const logsDir = join(rootDir, 'logs', 'birth-chart-analysis');
        const logFiles = readdirSync(logsDir)
            .filter(file => file.endsWith('.json'));
        console.log(`Found ${logFiles.length} log files to process`);
        for (const logFile of logFiles) {
            try {
                const filePath = join(logsDir, logFile);
                const logContent = readFileSync(filePath, 'utf8');
                const birthChartAnalysisLog = JSON.parse(logContent);
                console.log(`Processing analysis for user: ${birthChartAnalysisLog.metadata.userName}`);
                // if (birthChartAnalysisLog.metadata.userName !== "Beyonce Knowles") {
                //     continue;
                // }
                // Process the birth chart analysis
                const result = await processBirthChartAnalysisLog(birthChartAnalysisLog.analysis, birthChartAnalysisLog.metadata.userId, birthChartAnalysisLog.metadata.category);
                console.log(`Successfully processed ${result.recordCount} chunks for ${birthChartAnalysisLog.metadata.userName}`);
            }
            catch (error) {
                console.error(`Error processing log file ${logFile}:`, error);
                // Continue with next file even if one fails
                continue;
            }
        }
        await client.close();
        console.log('Completed processing all birth chart analyses');
    }
    catch (error) {
        console.error('Error in tagAndVectorizeBirthChartAnalysis:', error);
        throw error;
    }
}
async function processBirthChartAnalysisLog(birthChartData, userId) {
    try {
        let allRecords = [];
        // Process overview section
        if (birthChartData.overview) {
            const overviewRecords = await processTextSection(birthChartData.overview, userId, "Overview");
            allRecords = [...allRecords, ...overviewRecords];
        }
        // Process planet sections
        for (const [planet, data] of Object.entries(birthChartData.planets)) {
            const planetRecords = await processTextSection(data.interpretation, userId, data.description);
            allRecords = [...allRecords, ...planetRecords];
        }
        // Process dominance sections
        for (const [category, data] of Object.entries(birthChartData.dominance)) {
            const dominanceRecords = await processTextSection(data.interpretation, userId, data.description);
            allRecords = [...allRecords, ...dominanceRecords];
        }
        // Upsert all records to the vector store
        // console.log("allRecords: ", allRecords)
        await upsertRecords(allRecords, userId);
        return {
            success: true,
            recordCount: allRecords.length
        };
    }
    catch (error) {
        console.error("Error processing birth chart analysis:", error);
        throw error;
    }
}
async function generateTopicMappingForBirthCharts() {
    const client = new MongoClient(connection_string, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    await client.connect();
    const db = client.db('stellium');
    const userCollection = db.collection('users');
    // loop through users
    const users = await userCollection.find({}).limit(3).toArray();
    for (const user of users) {
        const relevantMappings = generateTopicMapping(user.birthChart);
        console.log("relevantMappings for user: ", relevantMappings);
    }
    await client.close();
}
async function getBirthData(userId) {
    console.log("getting birth data for user: ", userId);
    const client = new MongoClient(connection_string, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    await client.connect();
    const db = client.db('stellium');
    const userCollection = db.collection('users');
    const user = await userCollection.findOne({ _id: new ObjectId(userId) });
    console.log("user: ", user.firstName);
    return user.birthChart;
    await client.close();
}
async function testTopicRAGRetrieval() {
    const userId = "67f8a0a54edb7d81f72c78da";
    // const broadTopic = BroadTopicsEnum.PERSONALITY_IDENTITY.label;
    const subTopic = BroadTopicsEnum.PERSONALITY_IDENTITY.subtopics.INNER_EMOTIONAL_SELF;
    // const topic = "Relationships and Social Connections";
    // const prompt = "What are some of the key themes of this person's relationships and social connections?";
    const result = await retrieveTopicContext(userId, subTopic);
    console.log("result: ", result);
}
export async function handleBirthChartTopicAnalysis(userId) {
    console.log("handleBirthChartTopicAnalysis");
    const birthData = await getBirthData(userId);
    const allResults = {};
    try {
        // Generate mappings once for all topics
        const relevantMappings = generateTopicMapping(birthData);
        console.log("relevantMappings: ", relevantMappings);
        // Loop through broad topics
        for (const [broadTopic, topicData] of Object.entries(BroadTopicsEnum)) {
            console.log(`Processing broad topic: ${broadTopic}`);
            // Get the pre-generated natal positions using the topic's label
            const relevantNatalPositions = relevantMappings[topicData.label];
            console.log(`Natal positions for ${topicData.label}:`, relevantNatalPositions);
            if (!relevantNatalPositions) {
                console.error(`No natal positions found for topic: ${topicData.label}`);
                continue;
            }
            // Process all subtopics
            const subtopicResults = {};
            for (const [subtopicKey, subtopicLabel] of Object.entries(topicData.subtopics)) {
                console.log(`Processing subtopic: ${subtopicLabel}`);
                try {
                    // Get RAG response and wait for it explicitly
                    const RAGResponse = await retrieveTopicContext(userId, subtopicLabel);
                    // Verify we have RAG data before proceeding
                    if (!RAGResponse || !RAGResponse.matches) {
                        console.warn(`No RAG matches found for subtopic: ${subtopicLabel}`);
                        subtopicResults[subtopicKey] = "No relevant context found";
                        continue;
                    }
                    // Format RAG response for the completion
                    const formattedRAGContext = RAGResponse.matches
                        .map(match => {
                        const description = match.description ? `Context: ${match.description}\n` : '';
                        return `${description}${match.text}`;
                    })
                        .join('\n\n');
                    // Now pass the formatted RAG context to the completion
                    const completion = await getCompletionShortOverviewForTopic(subtopicLabel, relevantNatalPositions, formattedRAGContext);
                    subtopicResults[subtopicKey] = completion;
                }
                catch (error) {
                    console.error(`Error processing subtopic ${subtopicLabel}:`, error);
                    console.error("Full error:", error);
                    subtopicResults[subtopicKey] = `Error processing ${subtopicLabel}`;
                }
            }
            allResults[broadTopic] = {
                label: topicData.label,
                relevantPositions: relevantNatalPositions,
                subtopics: subtopicResults
            };
        }
        writeTopicAnalysisToLog(allResults, userId);
        console.log("allResults: ", allResults);
    }
    catch (error) {
        console.error("Error in handleBirthChartTopicAnalysis:", error);
        // return({
        //     success: false,
        //     error: error.message
        // });
    }
    finally {
        process.exit(0);
    }
}
// generateTopicMappingForBirthCharts()
// testTopicRAGRetrieval()
function writeTopicAnalysisToLog(analysisResults, userId) {
    console.log("writeTopicAnalysisToLog");
    console.log("logData: ", analysisResults);
    // add metadata to analysisResults
    analysisResults.metadata = {
        userId: userId,
        timestamp: new Date().toISOString()
    };
    // Create logs directory in system temp directory
    // Get the project root directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const rootDir = join(__dirname, '..'); // Go up one level from controllers to root
    try {
        // Create logs directory in project root
        const logsDir = join(rootDir, 'logs', 'birth-chart-topic-analysis');
        // Ensure directory exists
        mkdirSync(logsDir, { recursive: true });
        // Create filename with timestamp and userId
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `birth-chart-topic-analysis--${timestamp}.json`;
        // Write log file
        writeFileSync(join(logsDir, fileName), JSON.stringify(analysisResults, null, 2));
        console.log(`Analysis logged to: ${join(logsDir, fileName)}`);
    }
    catch (error) {
        console.error('Error writing log file:', error);
        // Don't throw - logging failure shouldn't affect the response
    }
}
handleBirthChartTopicAnalysis('67f8a0a54edb7d81f72c78da');
// export function writeTopicAnalysisToLog(analysisResults) {
//     console.log("Writing topic analysis to log");
//     try {
//         // Create logs/topic-analysis directory if it doesn't exist
//         const logsDir = path.join(process.cwd(), 'logs', 'topic-analysis');
//         if (!fs.existsSync(logsDir)) {
//             fs.mkdirSync(logsDir, { recursive: true });
//         }
//         // Create a filename with timestamp
//         const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
//         const filename = path.join(logsDir, `${timestamp}.json`);
//         // Format the results for better readability
//         const formattedResults = {
//             timestamp: new Date().toISOString(),
//             results: analysisResults
//         };
//         // Write the analysis results to file
//         fs.writeFileSync(filename, JSON.stringify(formattedResults, null, 2));
//         console.log(`Topic analysis log written to ${filename}`);
//     } catch (error) {
//         console.error('Error writing topic analysis log:', error);
//     }
// }
// handleBirthChartTopicAnalysis('67f8a0a54edb7d81f72c78da')
