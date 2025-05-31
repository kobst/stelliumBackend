// @ts-nocheck
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RELATIONSHIP_CATEGORIES } from '../utilities/relationshipScoringConstants.js';
// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Directory containing the log files
const logsDir = path.join(__dirname, '../logs');
// Create a debug log file
const debugLogPath = path.join(__dirname, '../logs/score_analysis_debug.log');
// Helper function to write to debug log
function debugLog(message, data = '') {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${message} ${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}\n`;
    fs.appendFileSync(debugLogPath, logMessage);
}
// Function to extract normalized scores from log files
function extractScoresFromLogs() {
    const allScores = [];
    // Read all files in the logs directory
    const files = fs.readdirSync(logsDir);
    // Filter for JSON files that match our pattern
    const logFiles = files.filter(file => file.startsWith('relationship-scoring-') && file.endsWith('.json'));
    console.log(`Found ${logFiles.length} log files to analyze`);
    // Process each log file
    logFiles.forEach(file => {
        try {
            const filePath = path.join(logsDir, file);
            const logData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            // Check if the file has normalized scores
            if (logData.normalizedScores) {
                allScores.push(logData.normalizedScores);
                console.log(`Extracted scores from ${file}`);
            }
        }
        catch (error) {
            console.error(`Error processing file ${file}:`, error.message);
        }
    });
    return allScores;
}
// Calculate statistics for a set of values
function calculateStats(values) {
    debugLog('\n--- Calculating Stats ---');
    debugLog('Input values:', values);
    if (!values || values.length === 0) {
        debugLog('No values provided');
        return { count: 0, mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
    }
    // Filter out undefined/null values and convert to numbers
    const validValues = values
        .filter(v => {
        if (v === undefined || v === null || isNaN(Number(v))) {
            debugLog('Filtered out invalid value:', v);
            return false;
        }
        return true;
    })
        .map(v => Number(v));
    debugLog('Valid values after filtering:', validValues);
    if (validValues.length === 0) {
        debugLog('No valid numerical values found');
        return { count: 0, mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
    }
    // Sort values for median and percentiles
    const sortedValues = [...validValues].sort((a, b) => a - b);
    // Calculate basic statistics
    const count = validValues.length;
    const sum = validValues.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;
    const min = sortedValues[0];
    const max = sortedValues[count - 1];
    // Calculate median
    const midIndex = Math.floor(count / 2);
    const median = count % 2 === 0
        ? (sortedValues[midIndex - 1] + sortedValues[midIndex]) / 2
        : sortedValues[midIndex];
    // Calculate standard deviation
    const squaredDiffs = validValues.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / count;
    const stdDev = Math.sqrt(variance);
    // Calculate percentiles
    const p25 = sortedValues[Math.floor(count * 0.25)];
    const p75 = sortedValues[Math.floor(count * 0.75)];
    // Add debug logging for final stats
    const stats = {
        count,
        mean: parseFloat(mean.toFixed(2)),
        median: parseFloat(median.toFixed(2)),
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        stdDev: parseFloat(stdDev.toFixed(2)),
        p25: parseFloat(p25.toFixed(2)),
        p75: parseFloat(p75.toFixed(2))
    };
    debugLog('Calculated stats:', stats);
    return stats;
}
// Analyze scores and calculate statistics
function analyzeScores(allScores) {
    debugLog('\n=== Starting Score Analysis ===');
    debugLog(`Analyzing ${allScores.length} score records`);
    // Define the categories and components we want to analyze
    const categories = [
        RELATIONSHIP_CATEGORIES.OVERALL_ATTRACTION_CHEMISTRY,
        RELATIONSHIP_CATEGORIES.EMOTIONAL_SECURITY_CONNECTION,
        RELATIONSHIP_CATEGORIES.SEX_AND_INTIMACY,
        RELATIONSHIP_CATEGORIES.COMMUNICATION_AND_MENTAL_CONNECTION,
        RELATIONSHIP_CATEGORIES.COMMITMENT_LONG_TERM_POTENTIAL,
        RELATIONSHIP_CATEGORIES.KARMIC_LESSONS_GROWTH,
        RELATIONSHIP_CATEGORIES.PRACTICAL_GROWTH_SHARED_GOALS
    ];
    const components = [
        'synastry',
        'composite',
        'synastryHousePlacements',
        'compositeHousePlacements',
        'overall'
    ];
    // Initialize results object
    const results = {};
    // Process each category
    categories.forEach(category => {
        debugLog(`\nAnalyzing category: ${category}`);
        results[category] = {};
        // Process each component within the category
        components.forEach(component => {
            debugLog(`\nAnalyzing component: ${component}`);
            // Extract and log raw data structure
            const sampleScore = allScores[0]?.[category]?.[component];
            debugLog('Sample data structure:', {
                category,
                component,
                sampleScore
            });
            // Extract raw values for this category and component
            const values = allScores
                .filter(score => {
                if (!score[category]) {
                    debugLog(`Missing category ${category} in score`);
                    return false;
                }
                if (!score[category][component]) {
                    debugLog(`Missing component ${component} in category ${category}`);
                    return false;
                }
                return true;
            })
                .map(score => {
                const value = score[category][component].raw || score[category][component];
                if (value === undefined || value === null) {
                    debugLog(`Null/undefined value found for ${category}.${component}`);
                }
                return value;
            });
            debugLog(`Found ${values.length} values for ${category}.${component}`);
            // Calculate statistics
            results[category][component] = calculateStats(values);
        });
    });
    return results;
}
// Generate grading functions based on statistics
function generateGradingFunctions(stats) {
    debugLog('\n=== Generating Grading Functions ===');
    const gradingFunctions = {};
    // For each category and component
    Object.keys(stats).forEach(category => {
        debugLog(`Processing category: ${category}`);
        gradingFunctions[category] = {};
        Object.keys(stats[category]).forEach(component => {
            debugLog(`Processing component: ${category}.${component}`);
            const componentStats = stats[category][component];
            // Check if we have valid stats to create grading function
            if (!componentStats || componentStats.mean === null || componentStats.stdDev === null) {
                debugLog(`Invalid stats for ${category}.${component}:`, componentStats);
                // Provide a default grading function that returns 'N/A'
                gradingFunctions[category][component] = () => 'N/A';
                return;
            }
            // Create a grading function based on standard deviations
            gradingFunctions[category][component] = (value) => {
                if (value === undefined || value === null)
                    return 'N/A';
                const mean = componentStats.mean;
                const stdDev = componentStats.stdDev;
                // Additional check for valid mean and stdDev
                if (mean === null || stdDev === null || stdDev === 0) {
                    debugLog(`Invalid mean/stdDev for ${category}.${component}: mean=${mean}, stdDev=${stdDev}`);
                    return 'N/A';
                }
                // Calculate z-score (number of standard deviations from mean)
                const zScore = (value - mean) / stdDev;
                // Assign letter grade based on z-score
                if (zScore >= 2)
                    return 'A+';
                if (zScore >= 1.5)
                    return 'A';
                if (zScore >= 1)
                    return 'A-';
                if (zScore >= 0.5)
                    return 'B+';
                if (zScore >= 0)
                    return 'B';
                if (zScore >= -0.5)
                    return 'B-';
                if (zScore >= -1)
                    return 'C+';
                if (zScore >= -1.5)
                    return 'C';
                if (zScore >= -2)
                    return 'C-';
                if (zScore >= -2.5)
                    return 'D';
                return 'F';
            };
        });
    });
    return gradingFunctions;
}
// Main function
function main() {
    // Extract scores from log files
    const allScores = extractScoresFromLogs();
    debugLog(`Extracted scores from ${allScores.length} log files`);
    // Calculate statistics
    const stats = analyzeScores(allScores);
    // Generate grading functions
    const gradingFunctions = generateGradingFunctions(stats);
    // Save results to file
    const outputFile = path.join(__dirname, '../relationship_scoring_stats.json');
    fs.writeFileSync(outputFile, JSON.stringify({
        stats,
        sampleSize: allScores.length,
        generatedAt: new Date().toISOString()
    }, null, 2));
    debugLog(`Statistics saved to ${outputFile}`);
    // Example of using the grading function - with error checking
    debugLog("\nExample Grading:");
    const exampleCategory = 'OVERALL_ATTRACTION_CHEMISTRY';
    const exampleComponent = 'overall';
    const exampleValue = 75;
    // Check if the category and component exist
    if (!gradingFunctions[exampleCategory]) {
        debugLog(`Error: Category ${exampleCategory} not found in grading functions`);
        return;
    }
    if (!gradingFunctions[exampleCategory][exampleComponent]) {
        debugLog(`Error: Component ${exampleComponent} not found in category ${exampleCategory}`);
        return;
    }
    const grade = gradingFunctions[exampleCategory][exampleComponent](exampleValue);
    const stats_ref = stats[exampleCategory][exampleComponent];
    console.log(`A score of ${exampleValue} for ${exampleCategory}.${exampleComponent} gets a grade of ${grade}`);
    console.log(`Reference stats: mean=${stats_ref.mean}, stdDev=${stats_ref.stdDev}`);
    // Create a simple distribution visualization for this component
    console.log("\nDistribution for", exampleCategory, exampleComponent);
    const mean = stats_ref.mean;
    const stdDev = stats_ref.stdDev;
    // Show distribution at -2, -1, 0, 1, and 2 standard deviations
    for (let i = -2; i <= 2; i++) {
        const value = mean + (i * stdDev);
        const grade = gradingFunctions[exampleCategory][exampleComponent](value);
        const bar = '|' + '='.repeat(10 + (i * 5)) + '>';
        console.log(`${i} stdDev (${value.toFixed(1)}): ${bar} Grade: ${grade}`);
    }
}
main();
