// @ts-nocheck
import { handleProcessUserQueryForBirthChartAnalysis } from '../controllers/gptController.js';
import { getUserSingle } from '../services/dbService.js'; // Assuming you have this function
async function testLiveUserChatAnalysis() {
    console.log("=== Live End-to-End Test: handleProcessUserQueryForBirthChartAnalysis ===\n");
    // Test configuration - UPDATE THESE WITH REAL VALUES FROM YOUR DATABASE
    const testConfig = {
        userId: "67f8a0a54edb7d81f72c78da", // Replace with actual userId from your database
        birthChartId: "6827db6fcd440b51509e508e", // Replace with actual birthChartId
        testQueries: [
            "What does my Venus placement mean for my love life?",
            "I have trouble expressing my feelings to my partner, what can I do?",
            "How do my Moon and Mars interact in my chart?",
            "What can you tell me about my career prospects based on my 10th house?",
            "Explain my relationship patterns based on my birth chart"
        ]
    };
    // Verify test configuration
    if (testConfig.userId === "YOUR_REAL_USER_ID_HERE" || testConfig.birthChartId === "YOUR_REAL_BIRTH_CHART_ID_HERE") {
        console.error("❌ ERROR: Please update testConfig with real userId and birthChartId values");
        console.log("You can find these values in your MongoDB database:");
        console.log("- Check the 'users' collection for userId");
        console.log("- Check the birth chart related collections for birthChartId");
        return;
    }
    // Verify user exists in database
    try {
        console.log("🔍 Verifying user exists in database...");
        const user = await getUserSingle(testConfig.userId);
        console.log("user: ", user);
        if (!user) {
            console.error(`❌ ERROR: User with ID ${testConfig.userId} not found in database`);
            return;
        }
        console.log(`✅ User found: ${user.firstName} ${user.lastName}`);
    }
    catch (error) {
        console.error("❌ ERROR: Could not verify user:", error.message);
        return;
    }
    console.log("\n🚀 Starting live tests...\n");
    // Test Case 1: Single query test
    console.log("Test Case 1: Single Query Test");
    console.log("================================");
    try {
        const startTime = Date.now();
        // Create real request object
        const req = {
            body: {
                userId: testConfig.userId,
                birthChartId: testConfig.birthChartId,
                query: testConfig.testQueries[0]
            }
        };
        // Create response object that captures the actual response
        let responseData = null;
        let statusCode = 200;
        const res = {
            status: function (code) {
                statusCode = code;
                return this;
            },
            json: function (data) {
                responseData = data;
                return this;
            }
        };
        console.log(`📤 Sending query: "${req.body.query}"`);
        console.log(`👤 User ID: ${req.body.userId}`);
        console.log(`📊 Birth Chart ID: ${req.body.birthChartId}`);
        // Execute the actual method
        await handleProcessUserQueryForBirthChartAnalysis(req, res);
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`⏱️  Response time: ${duration}ms`);
        console.log(`📥 Status Code: ${statusCode}`);
        if (statusCode === 200 && responseData && responseData.success) {
            console.log("✅ Test Case 1 PASSED");
            console.log(`📝 Answer preview: ${responseData.answer.substring(0, 200)}...`);
            console.log(`💾 Chat history saved: ${responseData.result ? 'Yes' : 'No'}`);
        }
        else {
            console.log("❌ Test Case 1 FAILED");
            console.log("Response:", responseData);
        }
    }
    catch (error) {
        console.log("❌ Test Case 1 FAILED with exception:");
        console.error(error);
    }
    console.log("\n");
    // Test Case 2: Multiple queries in sequence (simulating conversation)
    console.log("Test Case 2: Conversation Simulation");
    console.log("====================================");
    for (let i = 0; i < testConfig.testQueries.length; i++) {
        try {
            console.log(`\n--- Query ${i + 1}/${testConfig.testQueries.length} ---`);
            const startTime = Date.now();
            const req = {
                body: {
                    userId: testConfig.userId,
                    birthChartId: testConfig.birthChartId,
                    query: testConfig.testQueries[i]
                }
            };
            let responseData = null;
            let statusCode = 200;
            const res = {
                status: function (code) {
                    statusCode = code;
                    return this;
                },
                json: function (data) {
                    responseData = data;
                    return this;
                }
            };
            console.log(`📤 Query: "${req.body.query}"`);
            await handleProcessUserQueryForBirthChartAnalysis(req, res);
            const endTime = Date.now();
            const duration = endTime - startTime;
            if (statusCode === 200 && responseData && responseData.success) {
                console.log(`✅ Query ${i + 1} SUCCESS (${duration}ms)`);
                console.log(`📝 Answer length: ${responseData.answer.length} characters`);
                // Show a snippet of the answer
                const snippet = responseData.answer.substring(0, 150);
                console.log(`📖 Answer snippet: "${snippet}..."`);
            }
            else {
                console.log(`❌ Query ${i + 1} FAILED`);
                console.log("Response:", responseData);
            }
            // Add a small delay between queries to be respectful to APIs
            if (i < testConfig.testQueries.length - 1) {
                console.log("⏳ Waiting 2 seconds before next query...");
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        catch (error) {
            console.log(`❌ Query ${i + 1} FAILED with exception:`, error.message);
        }
    }
    // Test Case 3: Error handling test
    console.log("\n\nTest Case 3: Error Handling");
    console.log("===========================");
    try {
        const req = {
            body: {
                userId: testConfig.userId,
                birthChartId: "invalid_birth_chart_id",
                query: "Test query"
            }
        };
        let responseData = null;
        let statusCode = 200;
        const res = {
            status: function (code) {
                statusCode = code;
                return this;
            },
            json: function (data) {
                responseData = data;
                return this;
            }
        };
        console.log("📤 Testing with invalid birthChartId...");
        await handleProcessUserQueryForBirthChartAnalysis(req, res);
        if (statusCode >= 400 || (responseData && !responseData.success)) {
            console.log("✅ Error handling test PASSED - properly handled invalid data");
        }
        else {
            console.log("⚠️  Error handling test - unexpected success with invalid data");
        }
    }
    catch (error) {
        console.log("✅ Error handling test PASSED - exception caught:", error.message);
    }
    console.log("\n=== Test Summary ===");
    console.log("🏁 All live tests completed!");
    console.log("📊 Check your database to verify chat history was saved correctly");
    console.log("🔍 Monitor your API usage and costs");
    console.log("📝 Review the generated responses for quality and accuracy");
}
// Helper function to get user info (you might need to adjust this based on your actual function)
// async function getUserById(userId) {
//     try {
//         // Import your actual getUserById function or implement a simple version
//         // This is just a placeholder - replace with your actual implementation
//         const { getUserById: getUser } = await import('./services/dbService.js');
//         return await getUser(userId);
//     } catch (error) {
//         console.log("Note: Could not import getUserById function. Skipping user verification.");
//         return { firstName: "Test", lastName: "User" }; // Mock response for testing
//     }
// }
// Run the live tests
console.log("🎯 Starting Live End-to-End Tests");
console.log("==================================");
testLiveUserChatAnalysis().catch(error => {
    console.error("💥 Test execution failed:", error);
    process.exit(1);
});
