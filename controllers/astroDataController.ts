// @ts-nocheck
// import { getRawChartData, getPlanetsData } from '../services/astroDataService.js';
import { saveUser, saveCompositeChart, getPreGeneratedTransitSeries } from '../services/dbService.js';
import {
  getRawChartDataEphemeris,
  getRawChartDataEphemerisNoTime,
  findSynastryAspects,
  generateCompositeChart,
  scanTransitSeries,
  mergeTransitWindows
} from '../services/ephemerisDataService.js';
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

    const chartData = await getRawChartDataEphemerisNoTime({
      year,
      month,
      day,
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

    const natal = natalPlanets.map(p => ({
      name: p.name,
      lon: p.lon ?? p.full_degree ?? p.fullDegree
    }));

    const rawEvents = Array.from(scanTransitSeries(series, natal));
    const windows = mergeTransitWindows(rawEvents);

    res.json({ rawEvents, windows });
  } catch (error) {
    console.error('Error generating transit windows:', error);
    res.status(500).json({ error: 'Server error' });
  }
}



