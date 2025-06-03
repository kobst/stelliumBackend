// @ts-nocheck
// import { getRawChartData, getPlanetsData } from '../services/astroDataService.js';
import { saveUser, saveCompositeChart, getPreGeneratedTransitSeries } from '../services/dbService.js';
import {
  getRawChartDataEphemeris,
  getRawChartDataEphemerisNoTime,
  findSynastryAspects,
  generateCompositeChart,
  scanTransitSeries,
  mergeTransitWindows,
  scanTransitToTransitAspects,
  mergeTransitToTransitWindows
} from '../services/ephemerisDataService.js';
import { calculateTransitPriority, TransitWindow, TransitEvent, PLANET_SPEEDS } from '../utilities/transitPrioritization.js';
// import { findSynastryAspects, generateCompositeChart } from '../utilities/generateSynastryAspects.js';


export async function handleUserCreation(req, res) {

  try {
    const { firstName, lastName, gender, placeOfBirth, dateOfBirth, email, time, lat, lon, tzone } = req.body;
    // Parse date and time
    const date = new Date(dateOfBirth); // handles ISO format correctly

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();     // local time
    const minute = date.getMinutes(); // local time
    console.log("firstName: ", firstName)
    console.log("lastName: ", lastName)
    console.log("placeOfBirth: ", placeOfBirth)
    console.log("dateOfBirth: ", dateOfBirth)
    console.log('raw dateOfBirth:', dateOfBirth);  // should be 'YYYY-MM-DD'

    console.log("email: ", email)
  
     // Create the data object expected by getRawChartDataEphemeris
     const chartData = await getRawChartDataEphemeris({
      year: year,
      month: month,
      day: day,
      hour: hour,
      min: minute,  // Note: parameter is 'min' not 'minute'
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      tzone: parseFloat(tzone)
  });
  
  

    const user = { 
        email, 
        firstName, 
        lastName, 
        gender,
        dateOfBirth, 
        placeOfBirth, 
        time, 
        totalOffsetHours: tzone, 
        birthChart: chartData
    };


    const saveUserResponse = await saveUser(user)
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    
    res.json({ user, saveUserResponse});
  } catch (error) {
    console.error('Error in handleBirthData:', error);
    res.status(500).send('Server error');
  }
};



export const handleCreateRelationship = async (req, res) => {
  const { userA, userB } = req.body;
  const birthChartA = userA.birthChart
  const birthChartB = userB.birthChart

  console.log('UserA:', JSON.stringify(userA._id, null, 2));


  const synastryAspects = await findSynastryAspects(birthChartA.planets, birthChartB.planets);
  console.log("synastryAspects: ", synastryAspects.length)
  const compositeChart = await generateCompositeChart(birthChartA, birthChartB);
  const relationshipProfile = {
      userA_id: userA._id,
      userB_id: userB._id,
      userA_dateOfBirth: userA.dateOfBirth,
      userB_dateOfBirth: userB.dateOfBirth,
      userA_name: userA.firstName,
      userB_name: userB.firstName,
      synastryAspects,
      compositeChart
  };

  // console.log("saveCompositeChart", relationshipProfile);

  const result = await saveCompositeChart(relationshipProfile);
  console.log("insertedId: ", result.insertedId);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.status(200).json({ relationshipProfile });
}

export async function handleUserCreationUnknownTime(req, res) {
  try {
    const { firstName, lastName, gender, placeOfBirth, dateOfBirth, email, lat, lon, tzone } = req.body;

    const date = new Date(dateOfBirth);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Generate chart with 12:00 noon time
    const baseChartData = await getRawChartDataEphemeris({
      year,
      month,
      day,
      hour: 12,  // 12 noon
      min: 0,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      tzone: parseFloat(tzone)
    });

    // Remove house-dependent data for unknown time
    const chartData = getRawChartDataEphemerisNoTime(baseChartData);

    const user = {
      email,
      firstName,
      lastName,
      gender,
      dateOfBirth,
      placeOfBirth,
      totalOffsetHours: tzone,
      birthTimeUnknown: true,
      birthChart: chartData
    };

    const saveUserResponse = await saveUser(user);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);

    res.json({ user, saveUserResponse });
  } catch (error) {
    console.error('Error in handleUserCreationUnknownTime:', error);
    res.status(500).send('Server error');
  }
};





// Helper function to convert windows to TransitEvents
function convertWindowsToTransitEvents(
  windows: TransitWindow[],
  period: { start: Date; end: Date },
  natalPlanets: any[]
): TransitEvent[] {

  // Create a map of natal planets for quick lookup
  const natalPlanetMap = {};
  natalPlanets.forEach(planet => {
    natalPlanetMap[planet.name] = {
      sign: planet.sign,
      house: planet.house
    };
  });
  
  return windows
    .filter(window => {
      // Filter out regular Moon transits (handled separately via moon phases)
      if (window.transiting === 'Moon') {
        return false;
      }
      
      // Filter out house-based transits if not available
      if (!natalPlanetMap[window.natal] && 
          ['Ascendant', 'Midheaven'].includes(window.natal)) {
        return false;
      }
      
      // Include if any part of window overlaps with period
      return window.start <= period.end && 
             (!window.end || window.end >= period.start);
    })
    .map(window => {
      // Calculate priority based on multiple factors
      const priority = calculateTransitPriority(window, period);
      
      // Collect all unique signs during the transit window
      const transitingSigns: string[] = [];
      if (window.transitingSignAtStart) transitingSigns.push(window.transitingSignAtStart);
      if (window.transitingSignAtExact && !transitingSigns.includes(window.transitingSignAtExact)) {
        transitingSigns.push(window.transitingSignAtExact);
      }
      if (window.transitingSignAtEnd && !transitingSigns.includes(window.transitingSignAtEnd)) {
        transitingSigns.push(window.transitingSignAtEnd);
      }
      
      // Get natal planet information
      const natalInfo = natalPlanetMap[window.natal] || {};
      
      return {
        type: 'transit-to-natal' as const,
        start: window.start,
        exact: window.exact,
        end: window.end,
        priority,
        transitingPlanet: window.transiting,
        targetPlanet: window.natal,
        aspect: window.aspect,
        transitingSign: window.transitingSignAtExact || window.transitingSignAtStart,
        transitingSigns: transitingSigns.length > 0 ? transitingSigns : undefined,
        targetSign: natalInfo.sign,
        targetHouse: natalInfo.house > 0 ? natalInfo.house : undefined
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

// Helper function to transform DB transit data to TransitSeriesEntry format
function transformDbTransitData(dbData: any[]): any[] {
  return dbData.map(entry => ({
    date: entry.date instanceof Date ? entry.date : new Date(entry.date),
    planets: entry.planets.map(planet => ({
      name: planet.name,
      lon: planet.lon || planet.full_degree || planet.fullDegree,
      speed: planet.speed,
      sign: planet.sign
    })),
    moonPhase: entry.moonPhase
  }));
}

// Convert transit-to-transit windows to events
function convertTransitToTransitToEvents(
  windows: any[],
  period: { start: Date; end: Date }
): TransitEvent[] {
  
  // Debugging: Log the windows data to inspect available fields
  // console.log('Transit-to-Transit Windows:', JSON.stringify(windows, null, 2));
  
  return windows
    .filter(w => {
      // Include if exact during period or if ongoing
      return (w.exact >= period.start && w.exact <= period.end) ||
             (w.start <= period.end && (!w.end || w.end >= period.start));
    })
    .map(w => {
      // Calculate priority based on planets involved
      let priority = 5;
      
      // Both slow planets = higher priority
      const planet1Speed = PLANET_SPEEDS[w.planet1] || 1;
      const planet2Speed = PLANET_SPEEDS[w.planet2] || 1;
      
      if (planet1Speed < 0.1 && planet2Speed < 0.1) {
        priority += 2;
      } else if (planet1Speed < 0.5 || planet2Speed < 0.5) {
        priority += 1;
      }
      
      // Major aspects get boost
      if (['conjunction', 'opposition', 'square'].includes(w.aspect)) {
        priority += 1;
      }
      
      // Create description with signs if available
      let description = w.planet1;
      if (w.sign1) {
        description += ` in ${w.sign1}`;
      }
      description += ` ${w.aspect} ${w.planet2}`;
      if (w.sign2) {
        description += ` in ${w.sign2}`;
      }
      description += ` in the sky`;
      
      return {
        type: 'transit-to-transit' as const,
        start: w.start,
        exact: w.exact,
        end: w.end,
        priority,
        transitingPlanet: w.planet1,
        targetPlanet: w.planet2,
        aspect: w.aspect,
        transitingSign: w.sign1,
        targetSign: w.sign2,
        description
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

export async function handleGetTransitWindows(req, res) {
  try {
    const { natalPlanets, from, to } = req.body;
    if (!Array.isArray(natalPlanets) || !from || !to) {
      return res.status(400).json({ error: 'natalPlanets, from and to are required' });
    }
    const series = await getPreGeneratedTransitSeries(from, to);
    // const series = await generateTransitSeries(from, to);

    if (!series || series.length === 0) {
        console.warn(`No pre-generated transit data found for range: ${from} to ${to}. Proceeding with empty series.`);
    }

    // Transform the transit data to the expected format
    const transitSeries = transformDbTransitData(series);

    const natal = natalPlanets.map(p => ({
      name: p.name,
      lon: p.lon ?? p.full_degree ?? p.fullDegree,
      sign: p.sign,
      house: p.house
    }));

    // Calculate transit-to-natal events
    const rawEvents = Array.from(scanTransitSeries(transitSeries, natal));
    const windows = mergeTransitWindows(rawEvents);
    
    // Convert windows to TransitEvents
    const transitEvents = convertWindowsToTransitEvents(
      windows, 
      { start: new Date(from), end: new Date(to) },
      natalPlanets
    );

    // Calculate transit-to-transit events
    const transitAspects = Array.from(scanTransitToTransitAspects(transitSeries));
    const mergedTransitWindows = mergeTransitToTransitWindows(transitAspects);
    
    // Convert transit-to-transit windows to events
    const transitToTransitEvents = convertTransitToTransitToEvents(
      mergedTransitWindows,
      { start: new Date(from), end: new Date(to) }
    );

    res.json({ 
      transitEvents, 
      transitToTransitEvents 
    });
  } catch (error) {
    console.error('Error generating transit windows:', error);
    res.status(500).json({ error: 'Server error' });
  }
}



