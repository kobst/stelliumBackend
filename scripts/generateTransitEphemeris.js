import sweph from 'sweph';
import { MongoClient } from 'mongodb'; // For MongoDB persistence example

// Assuming ephemerisDataService.js is in ../services/
// Make sure these functions and TRANSIT_BODIES are exported from ephemerisDataService.js
import {
//   initializeEphemeris,
  getSignFromLon,    // Needs to be exported: function getSignFromLon(lon) { ... }
  getMoonPhaseInfo,   // Needs to be exported: function getMoonPhaseInfo(sunLon, moonLon) { ... }
  TRANSIT_BODIES      // Needs to be exported: const TRANSIT_BODIES = [ ... ];
} from '../services/ephemerisDataService.js';



// Add initialization tracking
let ephemerisInitialized = false;

export function initializeEphemeris() {
  if (!ephemerisInitialized) {
    sweph.set_ephe_path('./data');
    ephemerisInitialized = true;
  }
}
/**
 * Generates a list of Date objects between a start and end date with a given step.
 * @param {string|Date} start - The start date (string or Date object).
 * @param {string|Date} end - The end date (string or Date object).
 * @param {number} stepMs - The step interval in milliseconds.
 * @returns {Date[]} An array of Date objects.
 */
function generateDates(start, end, stepMs) {
  const result = [];
  let currentDate = new Date(start);
  const endDate = new Date(end);
  while (currentDate <= endDate) {
    result.push(new Date(currentDate)); // Store a new Date object
    currentDate = new Date(currentDate.getTime() + stepMs);
  }
  return result;
}

/**
 * Generates an ephemeris series with a fixed sampling rate for all planets.
 * For each sampled timestamp, it calculates data for ALL planets in TRANSIT_BODIES.
 * @param {string} fromDateStr - Start date string (e.g., "YYYY-MM-DDTHH:mm:ss.sssZ").
 * @param {string} toDateStr - End date string (e.g., "YYYY-MM-DDTHH:mm:ss.sssZ").
 * @returns {Array<Object>} An array of ephemeris data points.
 */
export function generateSmartEphemeris(fromDateStr, toDateStr) {
  initializeEphemeris(); // Ensure Swiss Ephemeris is initialized
  const flags = sweph.FLG_SWIEPH | sweph.FLG_SPEED;
  const series = [];

  const fromDate = new Date(fromDateStr);
  const toDate = new Date(toDateStr);

  // Define a single fixed step interval
  const stepMs = 1000 * 60 * 60 * 6;  // 6 hours

  // Generate all timestamps at the fixed interval
  const allTimestamps = generateDates(fromDate, toDate, stepMs);

  console.log(`Generating ephemeris for ${allTimestamps.length} timestamps (every 6 hours) between ${fromDateStr} and ${toDateStr}`);

  for (const date of allTimestamps) {
    const jd = sweph.julday(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours() + (date.getUTCMinutes() / 60) + (date.getUTCSeconds() / 3600), // More precise time
      sweph.constants.SE_GREG_CAL // Use Gregorian calendar for julday conversion
    );

    const calculatedPlanets = TRANSIT_BODIES.map(({ id, name }) => {
      const planetData = sweph.calc_ut(jd, id, flags);
      const [lon, /*lat*/, /*dist*/, speedLong /*, speedLat, speedDist*/] = planetData.data;
      return {
        name,
        lon,
        speed: speedLong, // Ensure speed is captured
        sign: getSignFromLon(lon)
      };
    });

    const sun = calculatedPlanets.find(p => p.name === 'Sun' && typeof p.lon === 'number');
    const moon = calculatedPlanets.find(p => p.name === 'Moon' && typeof p.lon === 'number');

    let moonPhaseData = null;
    if (sun && moon) {
      moonPhaseData = getMoonPhaseInfo(sun.lon, moon.lon);
    } else {
      // console.warn(`Sun or Moon data missing or invalid for ${date.toISOString()}, cannot calculate moon phase.`);
    }

    series.push({
      date: date.toISOString(), // Store date as ISO string for MongoDB compatibility
      planets: calculatedPlanets,
      moonPhase: moonPhaseData
    });
  }

  return series;
}

// --- Example Usage ---
async function runGenerationAndStore() {
  // Generate for 3 months from today
  const today = new Date();
  const fromDate = new Date(today);
  const toDate = new Date(today);
  toDate.setMonth(toDate.getMonth() + 3);

  const fromDateString = fromDate.toISOString();
  const toDateString = toDate.toISOString();

  console.log(`Generating ephemeris from ${fromDateString} to ${toDateString}`);
  const ephemerisData = generateSmartEphemeris(fromDateString, toDateString);

  if (ephemerisData.length > 0) {
    console.log(`Successfully generated ${ephemerisData.length} ephemeris entries.`);
    // console.log("Sample entry:", JSON.stringify(ephemerisData[0], null, 2));

    // --- Persist to MongoDB (Example) ---
    // Ensure you have MONGODB_URI in your environment variables or defined here
    const uri = process.env.MONGODB_URI || 'mongodb+srv://kobst:AUG2013@version1.obfam.mongodb.net/stellium?retryWrites=true&w=majority'
    const client = new MongoClient(uri);

    try {
      await client.connect();
      console.log("Connected to MongoDB.");
      const database = client.db("stellium"); // Replace with your DB name
      const collection = database.collection("transit_ephemeris"); // Replace with your collection name

      // Optional: Create an index on the date for faster queries
      await collection.createIndex({ date: 1 });
      console.log("Index on 'date' ensured.");

      // Insert the data
      // For large datasets, consider inserting in batches
      const result = await collection.insertMany(ephemerisData);
      console.log(`${result.insertedCount} documents were inserted into transit_ephemeris.`);

    } catch (err) {
      console.error("Error during MongoDB operation:", err);
    } finally {
      await client.close();
      console.log("MongoDB connection closed.");
    }
  } else {
    console.log("No ephemeris data generated.");
  }
}

// To run this script: node scripts/generateTransitEphemeris.js
// Make sure to handle ES Module syntax (e.g., by setting "type": "module" in package.json or using .mjs extension)
// And ensure sweph and mongodb drivers are installed.

// Uncomment to run when executing the script directly
runGenerationAndStore().catch(console.error);
  