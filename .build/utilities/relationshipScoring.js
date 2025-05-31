// @ts-nocheck
import path from 'path';
import fs from 'fs';
let statsData;
try {
    statsData = JSON.parse(fs.readFileSync(new URL('../relationship_scoring_stats.json', import.meta.url), 'utf-8'));
}
catch {
    const fallbackPath = path.join(process.cwd(), 'relationship_scoring_stats.json');
    statsData = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
}
import { ALL_RELATIONSHIP_CATEGORIES, categoryWeights, aspectScoringRules, compositeAspectScoringRules, planetHouseScores } from './relationshipScoringConstants.js';
/**
 * Scores relationship compatibility with directional sensitivity and detailed logging
 * @param {Array} synastryAspects - Array of synastry aspects
 * @param {Object} compositeChart - Composite chart object
 * @param {Object} userA - First person's user information with name, birth chart withplanets and houses
 * @param {Object} userB - Second person's birth chart with planets and houses
 * @param {Boolean} debug - Whether to generate debug logs
 * @returns {Object} Scores for each relationship category
 */
export function scoreRelationshipCompatibility(synastryAspects, compositeChart, userA, userB, compositeChartId, debug = true) {
    console.log("calculateRelationshipScores: Starting");
    try {
        // Initialize scores structure
        console.log("calculateRelationshipScores: Initializing score structure");
        const rawScores = {};
        // Use ALL_RELATIONSHIP_CATEGORIES to ensure we cover all categories
        ALL_RELATIONSHIP_CATEGORIES.forEach(category => {
            rawScores[category] = {
                synastry: { score: 0 },
                composite: { score: 0 },
                synastryHousePlacements: { score: 0 },
                compositeHousePlacements: { score: 0 }
            };
        });
        // Initialize debug log structure
        console.log("calculateRelationshipScores: Initializing debug log");
        const debugLog = {
            timestamp: new Date().toISOString(),
            inputSummary: {
                compositeChartId: compositeChartId,
                synastryAspectsCount: synastryAspects ? synastryAspects.length : 0,
                compositeAspectsCount: compositeChart.aspects ? compositeChart.aspects.length : 0,
                userAName: userA.firstName + " " + userA.lastName,
                userBName: userB.firstName + " " + userB.lastName,
                userAGender: userA.gender,
                userBGender: userB.gender,
                userAId: userA._id,
                userBId: userB._id,
                // birthChart2Summary: summarizeBirthChart(birthChart2)
            },
            categories: {},
            normalizedScores: {}
        };
        // Initialize category-specific logs
        ALL_RELATIONSHIP_CATEGORIES.forEach(category => {
            debugLog.categories[category] = {
                synastry: {},
                composite: {},
                synastryHousePlacements: {},
                compositeHousePlacements: {}
            };
        });
        console.log("Starting relationship scoring with input:");
        console.log("calculateRelationshipScores: Validating synastry aspects");
        if (!synastryAspects || !Array.isArray(synastryAspects)) {
            console.warn("synastryAspects is not a valid array, using empty array instead");
            synastryAspects = [];
        }
        // Validate composite aspects
        console.log("calculateRelationshipScores: Validating composite aspects");
        const compositeAspects = compositeChart.aspects;
        if (!compositeAspects || !Array.isArray(compositeAspects)) {
            console.warn("compositeAspects is not a valid array, using empty array instead");
            compositeAspects = [];
        }
        ALL_RELATIONSHIP_CATEGORIES.forEach(category => {
            // Process synastry aspects
            const synastryResults = scoreSynastryCategoryAspects(category, synastryAspects, userA, userB);
            // Add to raw scores
            console.log(`calculateRelationshipScores: Synastry results for category ${category}:`, synastryResults);
            rawScores[category].synastry = {
                score: synastryResults.score,
            };
            // Add debug info if needed
            if (debugLog && synastryResults.debugInfo) {
                console.log("debugLog.categories[category]", debugLog.categories[category]);
                if (!debugLog.categories[category]) {
                    console.log("debugLog.categories[category] is undefined, initializing");
                    debugLog.categories[category] = {};
                }
                console.log("debugLog.categories[category] exists", synastryResults.debugInfo);
                debugLog.categories[category].synastry = synastryResults.debugInfo;
            }
            console.log(`calculateRelationshipScores: Processing composite aspects for category ${category}`);
            const compositeResults = scoreCompositeCategoryAspects(category, compositeAspects);
            // Add to raw scores
            rawScores[category].composite = {
                score: compositeResults.score,
            };
            // Add debug info if needed
            if (debugLog && compositeResults.debugInfo) {
                if (!debugLog.categories[category]) {
                    debugLog.categories[category] = {};
                }
                debugLog.categories[category].composite = compositeResults.debugInfo;
            }
            const synastryHousePlacementsResults = scoreSynastryHousePlacements(userA, userB, category);
            rawScores[category].synastryHousePlacements = {
                score: synastryHousePlacementsResults.score,
            };
            if (debugLog && synastryHousePlacementsResults.debugInfo) {
                if (!debugLog.categories[category]) {
                    debugLog.categories[category] = {};
                }
                debugLog.categories[category].synastryHousePlacements = synastryHousePlacementsResults.debugInfo;
            }
            const compositeHousePlacements = scoreCompositeHousePlacements(compositeChart, category);
            rawScores[category].compositeHousePlacements = {
                score: compositeHousePlacements.score,
            };
            if (debugLog && compositeHousePlacements.details) {
                if (!debugLog.categories[category]) {
                    debugLog.categories[category] = {};
                }
                debugLog.categories[category].compositeHousePlacements = compositeHousePlacements.details;
            }
        });
        // Calculate final scores
        console.log("calculateRelationshipScores: Calculating final scores");
        const finalScores = {};
        Object.keys(categoryWeights).forEach(category => {
            const weights = categoryWeights[category];
            console.log("calculateRelationshipScores: weights", weights);
            // // Normalize individual direction scores
            // const normalizedSynastry = normalizeScore(rawScores[category].synastry.score, rawScores[category].synastry.maxPossible);
            // const normalizedComposite = normalizeScore(rawScores[category].composite.score, rawScores[category].composite.maxPossible);
            // // Calculate overall score using category weights
            // const overallScore = (normalizedSynastry * weights.synastry) + (normalizedComposite * weights.composite);
            const overallScore = ((rawScores[category].synastry.score + rawScores[category].synastryHousePlacements.score) * weights.synastry) + ((rawScores[category].composite.score + rawScores[category].compositeHousePlacements.score) * weights.composite);
            console.log("calculateRelationshipScores: overallScore", overallScore);
            finalScores[category] = {
                overall: Math.round(overallScore),
                synastry: Math.round(rawScores[category].synastry.score),
                composite: Math.round(rawScores[category].composite.score),
                synastryHousePlacements: Math.round(rawScores[category].synastryHousePlacements.score),
                compositeHousePlacements: Math.round(rawScores[category].compositeHousePlacements.score)
            };
            // Log normalized scores
            if (debug) {
                const categoryStats = statsData.stats[category];
                debugLog.normalizedScores[category] = {
                    synastry: {
                        raw: rawScores[category].synastry.score,
                        normalized: normalizeToPercentile(rawScores[category].synastry.score, categoryStats.synastry.mean, categoryStats.synastry.stdDev)
                    },
                    composite: {
                        raw: rawScores[category].composite.score,
                        normalized: normalizeToPercentile(rawScores[category].composite.score, categoryStats.composite.mean, categoryStats.composite.stdDev)
                    },
                    synastryHousePlacements: {
                        raw: rawScores[category].synastryHousePlacements.score,
                        normalized: normalizeToPercentile(rawScores[category].synastryHousePlacements.score, categoryStats.synastryHousePlacements.mean, categoryStats.synastryHousePlacements.stdDev)
                    },
                    compositeHousePlacements: {
                        raw: rawScores[category].compositeHousePlacements.score,
                        normalized: normalizeToPercentile(rawScores[category].compositeHousePlacements.score, categoryStats.compositeHousePlacements.mean, categoryStats.compositeHousePlacements.stdDev)
                    },
                    overall: Math.round(overallScore),
                    overallNormalized: normalizeToPercentile(overallScore, categoryStats.overall.mean, categoryStats.overall.stdDev)
                };
            }
        });
        // Write debug log to file if debug is enabled
        if (debug) {
            writeDebugLog(debugLog);
        }
        console.log("calculateRelationshipScores: Completed successfully");
        return debug ? { scores: finalScores, debug: debugLog } : finalScores;
    }
    catch (error) {
        console.error("ERROR in calculateRelationshipScores:", error);
        console.error("Error stack:", error.stack);
        // Return a default result to prevent 500 errors
        console.log("calculateRelationshipScores: Returning default scores due to error");
        const defaultScores = {};
        ALL_RELATIONSHIP_CATEGORIES.forEach(category => {
            defaultScores[category] = { overall: 0, synastry: 0, composite: 0 };
        });
        return defaultScores;
    }
}
/**
 * Scores synastry aspects for a specific relationship category
 * @param {string} category - The relationship category to score
 * @param {Array} synastryAspects - Array of synastry aspects
 * @param {Object} userAFirstName - First person's first name
 * @param {Object} userBFirstName - Second person's first name
 * @param {boolean} debug - Whether to include debug information
 * @returns {Object} - Score results and debug information
 */
function scoreSynastryCategoryAspects(category, synastryAspects, userA, userB, debug = true) {
    const result = {
        score: 0,
        debugInfo: debug ? { matchedAspects: [] } : null
    };
    const userAFirstName = userA.firstName;
    const userBFirstName = userB.firstName;
    const birthChartPlanets1 = userA.birthChart.planets;
    const birthChartPlanets2 = userB.birthChart.planets;
    try {
        for (let i = 0; i < synastryAspects.length; i++) {
            const aspect = synastryAspects[i];
            // console.log(`Processing synastry aspect ${i+1}/${synastryAspects.length}: ${aspect.planet1} ${aspect.aspectType} ${aspect.planet2}`);
            // Pre-sort the aspect's planet names:
            const p1Lower = aspect.planet1.toLowerCase();
            const p2Lower = aspect.planet2.toLowerCase();
            // e.g., "mars" < "venus" => "mars_venus"
            const aspectPair = [p1Lower, p2Lower].sort().join('_');
            const pairMap = aspectScoringRules[category];
            if (!pairMap)
                continue;
            // Check if aspectPair is in this category
            if (pairMap[aspectPair]) {
                // console.log(`  Found match in [${category}] for pair "${aspectPair}"`);
                try {
                    console.log("calculateAspectScore: aspect", aspect);
                    // We no longer do "A->B" or "B->A" differentiation – we treat them the same.
                    const score = calculateAspectScore(aspect.aspectType, aspect.orb, aspect.planet1, aspect.planet2, category);
                    // Add to synastry score
                    result.score += score;
                    // Debug logging
                    if (debug && result.debugInfo) {
                        const planet1Sign = getSign(aspect.planet1Degree);
                        const planet2Sign = getSign(aspect.planet2Degree);
                        const planet1House = getHouse(birthChartPlanets1, aspect.planet1);
                        const planet2House = getHouse(birthChartPlanets2, aspect.planet2);
                        result.debugInfo.matchedAspects.push({
                            aspect: `${userAFirstName}'s ${aspect.planet1} in ${planet1Sign} their ${planet1House}th house is ${aspect.aspectType} ${userBFirstName}'s ${aspect.planet2} in ${planet2Sign} and their ${planet2House}th house`,
                            orb: aspect.orb,
                            score: score,
                            pairKey: aspectPair,
                            planet1Sign: planet1Sign,
                            planet2Sign: planet2Sign,
                            planet1House: planet1House,
                            planet2House: planet2House
                        });
                    }
                }
                catch (error) {
                    console.error(`  ERROR calculating score for ${aspectPair}: ${error.message}`);
                }
            } // if pairMap[aspectPair]
        }
    }
    catch (error) {
        console.error(`ERROR processing synastry aspects for category ${category}:`, error);
        console.error("Error stack:", error.stack);
    }
    return result;
}
/**
 * Scores composite aspects for a specific relationship category
 * @param {string} category - The relationship category to score
 * @param {Array} compositeAspects - Array of composite aspects
 * @param {boolean} debug - Whether to include debug information
 * @returns {Object} - Score results and debug information
 */
function scoreCompositeCategoryAspects(category, compositeAspects, debug = true) {
    console.log(`scoreCompositeCategoryAspects: Processing ${compositeAspects ? compositeAspects.length : 0} composite aspects for category ${category}`);
    const result = {
        score: 0,
        debugInfo: debug ? { matchedAspects: [] } : null
    };
    try {
        // Process each composite aspect
        for (let i = 0; i < compositeAspects.length; i++) {
            const aspect = compositeAspects[i];
            console.log(`Processing composite aspect ${i + 1}/${compositeAspects.length}: ${aspect.planet1 || aspect.aspectingPlanet} ${aspect.aspectType} ${aspect.planet2 || aspect.aspectedPlanet}`);
            // Normalize planet names for consistency
            const planet1 = aspect.planet1 || aspect.aspectingPlanet;
            const planet2 = aspect.planet2 || aspect.aspectedPlanet;
            const planet1Sign = getSign(aspect.aspectingPlanetDegree);
            const planet2Sign = getSign(aspect.aspectedPlanetDegree);
            if (!planet1 || !planet2 || !aspect.aspectType) {
                console.warn(`  WARNING: Missing data in composite aspect ${i + 1}: ${JSON.stringify(aspect)}`);
                continue; // Skip this aspect
            }
            console.log(`  Checking category: ${category}`);
            const pairMap = compositeAspectScoringRules[category];
            if (!pairMap) {
                console.log(`  No composite scoring rules found for category ${category}`);
                return result; // Return early with empty result
            }
            // For each planet pair string in the category
            Object.keys(pairMap).forEach(pairKey => {
                // Parse the pair key
                const [p1, p2] = pairKey.split('_');
                // Normalize planet names for comparison
                const asp1Lower = planet1.toLowerCase();
                const asp2Lower = planet2.toLowerCase();
                const p1Lower = p1.toLowerCase();
                const p2Lower = p2.toLowerCase();
                // For composite aspects, direction doesn't matter, so check both ways
                if ((asp1Lower === p1Lower && asp2Lower === p2Lower) ||
                    (asp1Lower === p2Lower && asp2Lower === p1Lower)) {
                    console.log(`    Found composite match: ${pairKey} for ${planet1} ${aspect.aspectType} ${planet2}`);
                    try {
                        // Calculate score
                        const score = calculateAspectScore(aspect.aspectType, aspect.orb, p1, // Use the original pair key planets for consistency
                        p2, category);
                        console.log(`    Calculated composite score: ${score}`);
                        // Add to result scores
                        result.score += score;
                        // Log this match for debugging
                        if (debug && result.debugInfo) {
                            const scoreType = score >= 0 ? "positive" : "negative";
                            result.debugInfo.matchedAspects.push({
                                aspect: `${planet1} ${aspect.aspectType} ${planet2}`,
                                orb: aspect.orb,
                                score: score,
                                scoreType: scoreType,
                                rule: pairKey,
                                description: `${planet1} in ${planet1Sign} ${aspect.aspectType} ${planet2} in ${planet2Sign}`,
                            });
                            // Add special logging for negative scores
                            if (score < 0) {
                                console.log(`[${category}] NEGATIVE Composite: ${planet1} ${aspect.aspectType} ${planet2} (orb: ${aspect.orb}°) - Score: ${score}`);
                            }
                        }
                    }
                    catch (error) {
                        console.error(`    ERROR calculating composite score: ${error.message}`);
                    }
                }
            });
        }
        console.log(`Finished processing composite aspects for category ${category}`);
    }
    catch (error) {
        console.error(`ERROR processing composite aspects for category ${category}:`, error);
        console.error("Error stack:", error.stack);
    }
    return result;
}
/**
 * Writes debug log to a file
 * @param {Object} debugLog - Debug log object
 */
function writeDebugLog(debugLog) {
    console.log("writeDebugLog");
    try {
        // Create logs directory if it doesn't exist
        const logsDir = path.join(process.cwd(), 'logs', 'relationship-scoring');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        // Create a filename with timestamp
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
        const filename = path.join(logsDir, `relationship-scoring-${timestamp}.json`);
        // Write the debug log to file
        fs.writeFileSync(filename, JSON.stringify(debugLog, null, 2));
        console.log(`Debug log written to ${filename}`);
    }
    catch (error) {
        console.error('Error writing debug log:', error);
    }
}
/**
 * Creates a summary of a birth chart for logging
 * @param {Object} birthChart - Birth chart object
 * @returns {Object} Summary of the birth chart
 */
function summarizeBirthChart(birthChart) {
    console.log("summarizeBirthChart");
    if (!birthChart) {
        console.log("WARNING: birthChart is null or undefined");
        return null;
    }
    console.log("birthChart has planets:", !!birthChart.planets);
    if (birthChart.planets && birthChart.planets.length > 0) {
        // Log the first planet to see its structure
        console.log("First planet structure:", JSON.stringify(birthChart.planets[0]));
    }
    try {
        return {
            name: birthChart.firstName || 'Unknown',
            planetCount: birthChart.planets ? birthChart.planets.length : 0,
            houseCount: birthChart.houses ? birthChart.houses.length : 0,
            planets: birthChart.planets ? birthChart.planets.map(p => {
                // Check if each property exists before accessing
                if (!p) {
                    console.log("WARNING: Undefined planet in array");
                    return { name: 'Unknown', sign: 'Unknown', degree: 0, house: 0 };
                }
                // Log any missing properties
                if (!p.name)
                    console.log("WARNING: Planet missing name property");
                if (!p.sign)
                    console.log("WARNING: Planet missing sign property");
                if (p.full_degree === undefined && p.degree === undefined) {
                    console.log("WARNING: Planet missing both full_degree and degree properties");
                }
                if (p.house === undefined)
                    console.log("WARNING: Planet missing house property");
                return {
                    name: p.name || 'Unknown',
                    sign: p.sign || 'Unknown',
                    // Use full_degree if available, fall back to degree, or default to 0
                    degree: p.full_degree !== undefined ? p.full_degree : (p.degree !== undefined ? p.degree : 0),
                    house: p.house !== undefined ? p.house : 0
                };
            }) : []
        };
    }
    catch (error) {
        console.error("Error in summarizeBirthChart:", error);
        console.error("Error stack:", error.stack);
        // Return a minimal valid object to prevent further errors
        return {
            name: birthChart.firstName || 'Unknown',
            planetCount: 0,
            houseCount: 0,
            planets: []
        };
    }
}
/**
 * Normalizes a score to a 0-100 scale
 * @param {Number} score - Raw score
 * @param {Number} maxPossible - Maximum possible score
 * @returns {Number} Normalized score (0-100)
 */
function normalizeToPercentile(score, mean, stdDev) {
    if (!score || !mean || !stdDev)
        return 50; // Default to middle if missing data
    // Calculate z-score
    const zScore = (score - mean) / stdDev;
    // Approximation of error function
    function erf(x) {
        // Constants
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        // Save the sign of x
        const sign = (x >= 0) ? 1 : -1;
        x = Math.abs(x);
        // Formula
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        return sign * y;
    }
    // Convert to percentile (0-100 scale)
    const percentile = Math.round(((erf(zScore / Math.sqrt(2)) + 1) / 2) * 100);
    // Ensure result is between 0 and 100
    return Math.max(0, Math.min(100, percentile));
}
function getSign(degree) {
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const signIndex = Math.floor(degree / 30);
    return signs[signIndex];
}
;
function getHouse(birthChartPlanets, planetName) {
    const house = birthChartPlanets.find(planet => planet.name.toLowerCase() === planetName.toLowerCase())?.house;
    return house;
}
// function addMaxPossibleScore(aspectType) {
//     if (aspectType.includes('conjunction') || aspectType.includes('trine')) {
//         return 15;
//       } else if (aspectType.includes('sextile')) {
//         return 10;
//         } else if (aspectType.includes('square') || aspectType.includes('opposition')) {
//         return 8; // or maybe +5
//       } else {
//         // minor aspect
//         rawScores[category].AtoB.maxPossible += 5;
//       }
// }
/**
 * Calculates the score for an aspect based on aspect type, orb, planets involved, and relationship category
 * @param {String} aspectType - The type of aspect (conjunction, trine, etc.)
 * @param {Number} orb - The orb (deviation from exact aspect)
 * @param {String} planet1 - The first planet
 * @param {String} planet2 - The second planet
 * @param {String} category - The relationship category being scored
 * @returns {Number} The calculated score for this aspect
 */
function calculateAspectScore(aspectType, orb, planet1, planet2, category) {
    try {
        // Normalize inputs
        aspectType = aspectType.toLowerCase();
        const p1 = planet1.toLowerCase();
        const p2 = planet2.toLowerCase();
        // Create the pair key (both directions)
        const pairKey1 = `${p1}_${p2}`;
        const pairKey2 = `${p2}_${p1}`;
        // Get the scoring rules for this category
        const categoryRules = aspectScoringRules[category] || compositeAspectScoringRules[category];
        if (!categoryRules) {
            console.warn(`No scoring rules found for category: ${category}`);
            return 0;
        }
        // Check if we have rules for this planet pair
        let pairRules = categoryRules[pairKey1] || categoryRules[pairKey2];
        if (!pairRules) {
            console.warn(`No scoring rules found for planet pair: ${pairKey1} or ${pairKey2} in category ${category}`);
            return 0;
        }
        // Get the base score for this aspect type
        let baseScore = pairRules[aspectType];
        if (baseScore === undefined) {
            console.warn(`No score defined for aspect type: ${aspectType} for pair ${pairKey1} in category ${category}`);
            return 0;
        }
        console.log(`calculateAspectScore: ${planet1} ${aspectType} ${planet2}, category=${category}, baseScore=${baseScore}, orb=${orb}`);
        // Apply orb adjustment
        const finalScore = applyOrbAdjustment(baseScore, orb);
        console.log(`  Final score after orb adjustment: ${finalScore}`);
        return finalScore;
    }
    catch (error) {
        console.error(`Error in calculateAspectScore: ${error.message}`);
        console.error(`Inputs: aspectType=${aspectType}, orb=${orb}, planet1=${planet1}, planet2=${planet2}, category=${category}`);
        return 0; // Return 0 instead of throwing to prevent cascading errors
    }
}
/**
 * Applies orb-based adjustments to aspect scores using a continuous scale
 * @param {Number} baseScore - The base score for the aspect
 * @param {Number} orb - The orb value
 * @returns {Number} The adjusted score
 */
function applyOrbAdjustment(baseScore, orb) {
    // Log inputs for debugging
    console.log(`applyOrbAdjustment: baseScore=${baseScore}, orb=${orb}, type=${typeof orb}`);
    // Handle undefined or non-numeric orbs
    if (orb === undefined || orb === null || isNaN(orb)) {
        console.warn("Invalid orb value in applyOrbAdjustment:", orb);
        return baseScore * 0.5; // Default to half value for invalid orbs
    }
    // Ensure orb is a number
    const orbValue = parseFloat(orb);
    console.log(`  Parsed orbValue: ${orbValue}`);
    // Tight orbs (0-1.25°) get a bonus
    if (orbValue <= 1.25) {
        const adjustedScore = baseScore * 1.25;
        console.log(`  Tight orb (${orbValue}°): ${baseScore} * 1.25 = ${adjustedScore}`);
        return adjustedScore; // 25% bonus for very tight orbs
    }
    // Orbs beyond 10° have negligible effect
    if (orbValue >= 10) {
        console.log(`  Wide orb (${orbValue}°): score = 0`);
        return 0;
    }
    // For orbs between 1.25° and 10°, apply a smooth linear factor
    // This maps orb from 1.25..10 => factor from 1..0
    const factor = 1 - (orbValue - 1.25) / (10 - 1.25);
    const adjustedScore = Math.round(baseScore * factor);
    console.log(`  Medium orb (${orbValue}°): factor=${factor.toFixed(2)}, ${baseScore} * ${factor.toFixed(2)} = ${adjustedScore}`);
    return adjustedScore;
}
/**
 * Scores house placements with detailed planet-specific scoring
 * @param {Object} userA - First person's user information
 * @param {Object} userB - Second person's user information
 * @param {String} category - The relationship category being scored
 * @returns {Object} Score and max possible score with details
 */
function scoreSynastryHousePlacements(userA, userB, category) {
    // Initialize combined score and max possible
    let totalScore = 0;
    // Keep detailed logs separate for A->B and B->A
    const details = {
        AinB: [], // A's planets in B's relevant houses
        BinA: [] // B's planets in A's relevant houses
    };
    // Get the scoring rules for this category
    const categoryRules = planetHouseScores[category] || {
        relevantHouses: [],
        positive: [],
        negative: []
    };
    // Get the relevant houses for this category
    const relevantHouses = categoryRules.relevantHouses || [];
    console.log(`scoreSynastryHousePlacements: Processing category ${category} with ${relevantHouses.length} relevant houses`);
    // Check A's planets in B's houses
    const birthChart1 = userA.birthChart;
    const birthChart2 = userB.birthChart;
    const userAName = userA.firstName;
    const userBName = userB.firstName;
    if (birthChart1 && birthChart1.planets && birthChart2 && birthChart2.houses) {
        console.log(`  Processing ${birthChart1.planets.length} planets from chart A in chart B's houses`);
        birthChart1.planets.forEach(planet => {
            // Find where this planet falls in B's chart
            const houseInB = findHousePosition(planet.full_degree, birthChart2.houses);
            // Check if this house is in our relevant houses list
            if (relevantHouses.includes(houseInB)) {
                console.log(`${userAName} ${planet.name} falls in chart ${userBName}'s house ${houseInB} (relevant)`);
                // Look for specific planet-house combinations
                let foundSpecific = false;
                // Check positive combinations
                categoryRules.positive.forEach(rule => {
                    if (planet.name === rule.planet && houseInB === rule.house) {
                        totalScore += rule.points;
                        details.AinB.push({
                            planet: planet.name,
                            house: houseInB,
                            points: rule.points,
                            reason: rule.reason,
                            direction: "A->B",
                            description: `${userAName}'s ${planet.name} in ${userBName}'s house ${houseInB} (relevant)`
                        });
                        console.log(`      Matched positive rule: ${rule.points} points (${rule.reason})`);
                        foundSpecific = true;
                    }
                });
                // Check negative combinations
                categoryRules.negative.forEach(rule => {
                    if (planet.name === rule.planet && houseInB === rule.house) {
                        totalScore += rule.points; // This will be negative
                        details.AinB.push({
                            planet: planet.name,
                            house: houseInB,
                            points: rule.points,
                            reason: rule.reason,
                            direction: "A->B",
                            description: `${userAName}'s ${planet.name} in ${userBName}'s house ${houseInB} (relevant)`
                        });
                        console.log(`      Matched negative rule: ${rule.points} points (${rule.reason})`);
                        foundSpecific = true;
                    }
                });
                // If no specific rule was found, use default scoring
                if (!foundSpecific) {
                    totalScore += 5; // Default points
                    details.AinB.push({
                        planet: planet.name,
                        house: houseInB,
                        points: 5,
                        reason: "General house placement",
                        direction: "A->B",
                        description: `${userAName}'s ${planet.name} in ${userBName}'s house ${houseInB} (relevant)`
                    });
                    console.log(`      No specific rule found, using default: 5 points`);
                }
            }
            else {
                console.log(`${userAName} ${planet.name} falls in chart ${userBName}'s house ${houseInB} (not relevant)`);
            }
        });
    }
    // Check B's planets in A's houses
    if (birthChart2 && birthChart2.planets && birthChart1 && birthChart1.houses) {
        console.log(`  Processing ${birthChart2.planets.length} planets from chart B in chart A's houses`);
        birthChart2.planets.forEach(planet => {
            // Find where this planet falls in A's chart
            const houseInA = findHousePosition(planet.full_degree, birthChart1.houses);
            // Check if this house is in our relevant houses list
            if (relevantHouses.includes(houseInA)) {
                console.log(`${userBName} ${planet.name} falls in chart ${userAName}'s house ${houseInA} (relevant)`);
                // Look for specific planet-house combinations
                let foundSpecific = false;
                // Check positive combinations
                categoryRules.positive.forEach(rule => {
                    if (planet.name === rule.planet && houseInA === rule.house) {
                        totalScore += rule.points;
                        details.BinA.push({
                            planet: planet.name,
                            house: houseInA,
                            points: rule.points,
                            reason: rule.reason,
                            direction: "B->A",
                            description: `${userBName}'s ${planet.name} in ${userAName}'s house ${houseInA} (relevant)`
                        });
                        console.log(`      Matched positive rule: ${rule.points} points (${rule.reason})`);
                        foundSpecific = true;
                    }
                });
                // Check negative combinations
                categoryRules.negative.forEach(rule => {
                    if (planet.name === rule.planet && houseInA === rule.house) {
                        totalScore += rule.points; // This will be negative
                        details.BinA.push({
                            planet: planet.name,
                            house: houseInA,
                            points: rule.points,
                            reason: rule.reason,
                            direction: "B->A",
                            description: `${userBName}'s ${planet.name} in ${userAName}'s house ${houseInA} (relevant)`
                        });
                        console.log(`      Matched negative rule: ${rule.points} points (${rule.reason})`);
                        foundSpecific = true;
                    }
                });
                // If no specific rule was found, use default scoring
                if (!foundSpecific) {
                    totalScore += 5; // Default points
                    details.BinA.push({
                        planet: planet.name,
                        house: houseInA,
                        points: 5,
                        reason: "General house placement",
                        direction: "B->A",
                        description: `${userBName}'s ${planet.name} in ${userAName}'s house ${houseInA} (relevant)`
                    });
                    console.log(`      No specific rule found, using default: 5 points`);
                }
            }
            else {
                console.log(`${userBName} ${planet.name} falls in chart ${userAName}'s house ${houseInA} (not relevant)`);
            }
        });
    }
    console.log(`scoreSynastryHousePlacements: Total score = ${totalScore}`);
    // Return combined score but keep detailed logs separate
    return {
        score: totalScore,
        debugInfo: details
    };
}
/**
 * Scores house placements in a composite chart for a specific relationship category
 * @param {Object} compositeChart - The composite chart with planets
 * @param {string} category - The relationship category to score
 * @param {boolean} debug - Whether to include debug information
 * @returns {Object} - Score results and debug information
 */
function scoreCompositeHousePlacements(compositeChart, category, debug = true) {
    console.log(`scoreCompositeHousePlacements: category=${category}`);
    // Initialize result object
    const result = {
        score: 0,
        details: debug ? [] : null
    };
    // Validate inputs
    if (!compositeChart || !compositeChart.planets || !Array.isArray(compositeChart.planets)) {
        console.error("Invalid composite chart or missing planets array");
        return result;
    }
    console.log(`scoreCompositeHousePlacements: Found ${compositeChart.planets.length} planets in composite chart`);
    // Get scoring rules for this category
    const categoryRules = planetHouseScores[category] || {
        relevantHouses: [],
        positive: [],
        negative: []
    };
    // Get relevant houses for this category
    const relevantHouses = categoryRules.relevantHouses || [];
    console.log(`Relevant compositehouses for ${category}: ${relevantHouses.join(', ')}`);
    // Process each planet in the composite chart
    compositeChart.planets.forEach(planet => {
        if (!planet || !planet.name || !planet.house) {
            console.warn(`Skipping invalid planet: ${JSON.stringify(planet)}`);
            return;
        }
        const planetName = planet.name;
        const housePosition = planet.house;
        const planetSign = planet.sign;
        console.log(`Checking composite ${planetName} in house ${housePosition}`);
        // Check if this house is relevant for the category
        if (relevantHouses.includes(housePosition)) {
            console.log(`  ${planetName} in compositehouse ${housePosition} is relevant for ${category}`);
            // Look for specific planet-house combinations
            let foundSpecific = false;
            // Check positive combinations
            categoryRules.positive.forEach(rule => {
                if (planetName === rule.planet && housePosition === rule.house) {
                    result.score += rule.points;
                    console.log(`  MATCH: ${planetName} in house ${housePosition}: +${rule.points} points (${rule.reason})`);
                    if (debug && result.details) {
                        result.details.push({
                            planet: planetName,
                            house: housePosition,
                            points: rule.points,
                            reason: rule.reason,
                            type: 'positive',
                            description: `${planetName} in house ${housePosition} (relevant) and ${planetSign}`
                        });
                    }
                    foundSpecific = true;
                }
            });
            // Check negative combinations
            categoryRules.negative.forEach(rule => {
                if (planetName === rule.planet && housePosition === rule.house) {
                    result.score += rule.points; // This will be negative
                    console.log(`  MATCH: ${planetName} in house ${housePosition}: ${rule.points} points (${rule.reason})`);
                    if (debug && result.details) {
                        result.details.push({
                            planet: planetName,
                            house: housePosition,
                            points: rule.points,
                            reason: rule.reason,
                            type: 'negative',
                            description: `${planetName} in house ${housePosition} (relevant) and${planetSign}`
                        });
                    }
                    foundSpecific = true;
                }
            });
            // If no specific rule was found, use default scoring
            if (!foundSpecific) {
                const defaultPoints = 5;
                result.score += defaultPoints;
                console.log(`  No specific rule found for ${planetName} in house ${housePosition}, using default: +${defaultPoints} points`);
                if (debug && result.details) {
                    result.details.push({
                        planet: planetName,
                        house: housePosition,
                        points: defaultPoints,
                        reason: "General placement in relevant house",
                        type: 'default',
                        description: `${planetName} in house ${housePosition} (relevant) and ${planetSign}`
                    });
                }
            }
        }
        else {
            console.log(`  ${planetName} in house ${housePosition} is not relevant for ${category}`);
        }
    });
    console.log(`scoreCompositeHousePlacements: Total score for ${category} = ${result.score}`);
    console.log(`scoreCompositeHousePlacements: result.details = ${result.details}`);
    return result;
}
/**
 * Finds the house position for a given degree
 * @param {Number} degree - The degree position (0-360)
 * @param {Array} houses - Array of house objects with house and degree properties
 * @returns {Number} The house number (1-12)
 */
function findHousePosition(degree, houses) {
    if (!houses || !Array.isArray(houses) || houses.length === 0) {
        console.warn("Invalid houses data provided to findHousePosition");
        return 1; // Default to 1st house if houses data is invalid
    }
    // Sort houses by degree to ensure proper order
    const sortedHouses = [...houses].sort((a, b) => a.degree - b.degree);
    // Normalize the degree to ensure it's between 0-360
    const normalizedDegree = ((degree % 360) + 360) % 360;
    // Check each house
    for (let i = 0; i < sortedHouses.length; i++) {
        const currentHouse = sortedHouses[i];
        const nextHouse = sortedHouses[(i + 1) % sortedHouses.length];
        // Handle the case where we cross the 0° boundary
        if (i === sortedHouses.length - 1 && nextHouse.degree < currentHouse.degree) {
            if (normalizedDegree >= currentHouse.degree || normalizedDegree < nextHouse.degree) {
                return currentHouse.house;
            }
        }
        // Normal case
        else if (normalizedDegree >= currentHouse.degree && normalizedDegree < nextHouse.degree) {
            return currentHouse.house;
        }
    }
    // If we couldn't determine the house, return the first house
    console.warn(`Could not determine house for degree ${degree}`);
    return 1;
}
/**
 * Scores sign emphasis with detailed logging
 * @param {Object} birthChart1 - First person's birth chart
 * @param {Object} birthChart2 - Second person's birth chart
 * @param {Array} relevantSigns - Array of signs to check
 * @returns {Object} Score and max possible score with details
 */
function scoreSignEmphasis(birthChart1, birthChart2, relevantSigns) {
    let score = 0;
    const details = {
        chart1: {},
        chart2: {}
    };
    if (!birthChart1 || !birthChart2 || !birthChart1.planets || !birthChart2.planets) {
        return { score, details };
    }
    relevantSigns.forEach(sign => {
        // Count planets in the relevant sign for each chart
        const planetsInSign1 = birthChart1.planets.filter(p => p.sign === sign);
        const planetsInSign2 = birthChart2.planets.filter(p => p.sign === sign);
        details.chart1[sign] = planetsInSign1.map(p => p.name);
        details.chart2[sign] = planetsInSign2.map(p => p.name);
        // Add points for each planet in the relevant sign
        const signPoints1 = planetsInSign1.length * 5;
        const signPoints2 = planetsInSign2.length * 5;
        score += signPoints1 + signPoints2;
    });
    return { score, details };
}
// function normalizeToPercentile(score, mean, stdDev) {
//     if (!score || !mean || !stdDev) return 50; // Default to middle if missing data
//     // Calculate z-score
//     const zScore = (score - mean) / stdDev;
//     // Approximation of error function
//     function erf(x) {
//         // Constants
//         const a1 =  0.254829592;
//         const a2 = -0.284496736;
//         const a3 =  1.421413741;
//         const a4 = -1.453152027;
//         const a5 =  1.061405429;
//         const p  =  0.3275911;
//         // Save the sign of x
//         const sign = (x >= 0) ? 1 : -1;
//         x = Math.abs(x);
//         // Formula
//         const t = 1.0 / (1.0 + p * x);
//         const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
//         return sign * y;
//     }
//     // Convert to percentile (0-100 scale)
//     const percentile = Math.round(((erf(zScore / Math.sqrt(2)) + 1) / 2) * 100);
//     // Ensure result is between 0 and 100
//     return Math.max(0, Math.min(100, percentile));
// }
// In your API route handler
// async function handleRelationshipScoring(req, res) {
//   try {
//     console.log("Starting relationship scoring with input:", JSON.stringify(req.body).substring(0, 200) + "...");
//     // Your existing code here
//     const result = calculateRelationshipScores(birthChart1, birthChart2, synastryAspects, compositeAspects, true);
//     console.log("Relationship scoring completed successfully");
//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("ERROR in relationship scoring API:", error);
//     console.error("Error stack:", error.stack);
//     return res.status(500).json({ error: "Internal server error", message: error.message });
//   }
// }
