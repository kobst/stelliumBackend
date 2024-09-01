import { getRawChartData, getPlanetsData } from '../services/astroDataService.js';
import { differenceInYears, addDays, parseISO } from 'date-fns';
import { updateObjectKeys } from '../utilities/helpers.js';
import { generateNatalPrompts, generateNatalPositions } from '../utilities/generateNatalPrompts.js';
import { findDailyTransitAspects } from '../utilities/generateTransitAspects.js';
import { generateGroupedTransits, findGeneralTransitAspectObjects, findNatalTransitAspectObjects} from '../utilities/generateTransitDescriptions.js';


import { findPlanetsInQuadrant, findPlanetsInElements, findPlanetsInModalities } from '../utilities/generateModalities.js'
import { identifyBirthChartPattern } from '../utilities/patternSummarizer.js';


Date.prototype.addHours= function(h){
  this.setHours(this.getHours()+h);
  return this;
}


export async function handleBirthData(req, res) {

  try {
    const { date, time, lat, lon, tzone } = req.body;
    // Parse date and time
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);

    const data = {
        'day': day,
        'month': month,
        'year': year,
        'hour': hour,
        'min': minute,
        'lat': lat,
        'lon': lon,
        'tzone': tzone,
      }

    // console.log(data)
  
    const chartData = await getRawChartData(data);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    
    res.json({ chartData});
  } catch (error) {
    console.error('Error in handleBirthData:', error);
    res.status(500).send('Server error');
  }
};



export async function handleProgressedChart(req, res) {
  try {
    const { date, time, lat, lon, tzone } = req.body;

    // Parse date and time
    const birthDate = parseISO(date);
    const [hour, minute] = time.split(':').map(Number);

    // Calculate the number of years from the birth date to the current date
    const yearsDifference = differenceInYears(new Date(), birthDate);

    // Add this number of years as days to the birth date
    const modifiedDate = addDays(birthDate, yearsDifference);

    // Extract day, month, year from the modified date
    const day = modifiedDate.getDate();
    const month = modifiedDate.getMonth() + 1; // Months are 0-indexed
    const year = modifiedDate.getFullYear();

    const data = {
      'day': day,
      'month': month,
      'year': year,
      'hour': hour,
      'min': minute,
      'lat': lat,
      'lon': lon,
      'tzone': tzone,
    }

    // console.log(data)

    const rawResponse = await getPlanetsData(data);

    const cleaneedResponse = updateObjectKeys(rawResponse) 
    const chartData = cleaneedResponse
    console.log("handleProgressedChart")
    // console.log(chartData)

    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.json({ chartData });
  } catch (error) {
    console.error('Error in handleModifiedBirthData:', error);
    res.status(500).send('Server error');
  }
};

// do I need this anymore?
// I have the daily transits and aspects saved in the db already
export async function handleinstantTransits(req, res) {
  try {
    console.log("handleDayTransit")
    // console.log(req)
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1; // Months are 0-indexed
    const year = now.getFullYear();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const { date, time, lat, lon, tzone } = req.body;


    const data = {
      'day': day,
      'month': month,
      'year': year,
      'hour': hour,
      'min': minute,
      'lat': lat,
      'lon': lon,
      'tzone': tzone,
    }
    const rawResponse = await getPlanetsData(data);
    const cleanedResponse = updateObjectKeys(rawResponse) 
    const chartData = cleanedResponse

    const transitAspects = findDailyTransitAspects(chartData)


    console.log("handleDayTransit")
    // console.log(chartData)
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.json({ chartData, transitAspects });
  } catch (error) {
    console.error('Error in handleDayTransit:', error);
    res.status(500).send('Server error');
  }
};


function removeAscendant(planets) {
  return planets.filter(planet => planet.name !== 'Ascendant');
}


// need this because it is used to gen
export async function handleGeneralPeriodTransits(req, res) {
  const { date, lat, lon, tzone } = req.body;
  // const givenDate = parseISO(date);
  const givenDate = new Date();

  const monthlyPeriod = 30;
  const modifiedDate = addDays(givenDate, 1);
  const intervalHours = 3;
  let currentDate = givenDate;
  
  const transits = [];
  
  try {
    console.log("handlePeriodTransits");

    while (currentDate <= modifiedDate) {
      const day = currentDate.getDate();
      const month = currentDate.getMonth() + 1; // Months are 0-indexed
      const year = currentDate.getFullYear();
      const hour = currentDate.getHours();
      const minute = currentDate.getMinutes();

      const data = {
        'day': day,
        'month': month,
        'year': year,
        'hour': hour,
        'min': minute,
        'lat': lat,
        'lon': lon,
        'tzone': tzone,
      };

      try {
        const rawResponse = await getPlanetsData(data);
        // console.log("rawResponse")

        const cleanedResponse = updateObjectKeys(rawResponse);
        const chartData = removeAscendant(cleanedResponse); // Filter out Ascendant
        // console.log(chartData)

        const transitAspects = findGeneralTransitAspectObjects(chartData, currentDate);
        console.log("transitAspects")

        console.log(transitAspects)

        transits.push(...transitAspects); // Append the new aspects to the transits array
      } catch (error) {
        console.error(`Error fetching data for ${currentDate.toISOString()}:`, error);
      }

      // Increment date by the interval
      currentDate = currentDate.addHours(intervalHours)
    }

    const groupedTransits = generateGroupedTransits(transits);

    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.json({ chartData: [], transitAspect: groupedTransits });
  } catch (error) {
    console.error('Error in handlePeriodTransits:', error);
    res.status(500).send('Server error');
  }
}



export async function handlePersonalPeriodTransits(req, res) {
  const { date, lat, lon, tzone } = req.body;
  // const givenDate = parseISO(date);
  const givenDate = new Date();

  const monthlyPeriod = 30;
  const modifiedDate = addDays(givenDate, 1);
  const intervalHours = 3;
  let currentDate = givenDate;
  
  const transits = [];
  
  try {
    console.log("handlePeriodTransits");

    while (currentDate <= modifiedDate) {
      const day = currentDate.getDate();
      const month = currentDate.getMonth() + 1; // Months are 0-indexed
      const year = currentDate.getFullYear();
      const hour = currentDate.getHours();
      const minute = currentDate.getMinutes();

      const data = {
        'day': day,
        'month': month,
        'year': year,
        'hour': hour,
        'min': minute,
        'lat': lat,
        'lon': lon,
        'tzone': tzone,
      };

      try {
        const rawResponse = await getPlanetsData(data);
        // console.log("rawResponse")

        const cleanedResponse = updateObjectKeys(rawResponse);
        const chartData = removeAscendant(cleanedResponse); // Filter out Ascendant

        const personalTransitAspects = findNatalTransitAspectObjects(chartData, birthChart, currentDate);
  
        console.log(personalTransitAspects)

        transits.push(...transitAspects); // Append the new aspects to the transits array
      } catch (error) {
        console.error(`Error fetching data for ${currentDate.toISOString()}:`, error);
      }

      // Increment date by the interval
      currentDate = currentDate.addHours(intervalHours)
    }

    const groupedTransits = generateGroupedTransits(transits);

    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.json({ chartData: [], transitAspect: groupedTransits });
  } catch (error) {
    console.error('Error in handlePeriodTransits:', error);
    res.status(500).send('Server error');
  }
}





export async function handlePromptGeneration(req, res) {
  try {
    console.log("handle prompt Generation")
    // console.log(req)

    const birthData = req.body

    const everything = generateNatalPositions('everything', birthData)
    const personality = generateNatalPositions('personality', birthData)
    const home = generateNatalPositions('home', birthData)
    const relationships = generateNatalPositions('relationships', birthData)
    const career = generateNatalPositions('career', birthData)
    const unconscious = generateNatalPositions('unconscious', birthData)
    const communication = generateNatalPositions('communication', birthData)
    const quadrants = findPlanetsInQuadrant(birthData)
    const elements = findPlanetsInElements(birthData)
    const modalities = findPlanetsInModalities(birthData)
    const pattern = identifyBirthChartPattern(birthData)


    // const progressedTransitDescriptions = findTransitAspects(progressedBirthData, birthData, 'progressed' )
    // const progressedAspects = findAspectsInTransits(progressedBirthData, "progressed")


    const promptDescriptionsMap =  {
      'everything': everything,
      'personality': personality,
      'home': home,
      'career': career,
      'relationships': relationships,
      'communication': communication,
      'unconscious': unconscious,
      'quadrants': quadrants,
      'elements': elements,
      'modalities': modalities,
      'pattern': pattern
    };
    
    

    
    console.log("getPrompts")
    // console.log(promptDescriptionsMap)
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.json({ promptDescriptionsMap });
  } catch (error) {
    console.error('Error in handlePromptGeneration:', error);
    res.status(500).send('Server error');
  }
};




    // Prompt descriptions mapping
    const promptDescriptionsMap =  {
      'everything': '',
      'personality': '',
      'home': '',
      'career': '',
      'relationships': '',
      'communication': '',
      'unconscious': '',
      'quadrants': '',
      'elements': '',
      'modalities': '',
      'pattern': ''
      };