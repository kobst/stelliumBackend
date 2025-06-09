// @ts-nocheck
let sweph = null;
let swephLoadError = null;

// Async function to load sweph
async function loadSweph() {
  console.log('Attempting to load sweph module...');
  console.log('NODE_PATH:', process.env.NODE_PATH);
  console.log('Process cwd:', process.cwd());
  console.log('LAMBDA_TASK_ROOT:', process.env.LAMBDA_TASK_ROOT);
  
  // Check filesystem first
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    console.log('Checking filesystem for sweph...');
    const layerPath = '/opt/nodejs/node_modules/sweph';
    const taskPath = '/var/task/node_modules/sweph';
    
    console.log('Layer path exists:', fs.existsSync(layerPath));
    console.log('Task path exists:', fs.existsSync(taskPath));
    
    if (fs.existsSync(layerPath)) {
      console.log('Layer contents:', fs.readdirSync(layerPath));
      const binaryPath = path.join(layerPath, 'build/Release/sweph.node');
      console.log('Binary exists:', fs.existsSync(binaryPath));
      if (fs.existsSync(binaryPath)) {
        console.log('Binary size:', fs.statSync(binaryPath).size);
      }
    }
  } catch (err) {
    console.warn('Filesystem check failed:', err.message);
  }
  
  // Try multiple paths for layer loading
  const pathsToTry = [
    'sweph', // Standard import
    '/opt/nodejs/node_modules/sweph', // Layer path
    'file:///opt/nodejs/node_modules/sweph/index.mjs', // Direct layer ESM path
    '/var/task/node_modules/sweph' // Local path
  ];
  
  for (const path of pathsToTry) {
    try {
      console.log(`Trying to load sweph from: ${path}`);
      const swephModule = await import(path);
      sweph = swephModule.default || swephModule;
      console.log('Successfully loaded sweph module from:', path);
      console.log('Sweph constants available:', sweph?.constants ? 'Yes' : 'No');
      if (sweph?.constants) {
        console.log('Available constants:', Object.keys(sweph.constants));
      }
      return true;
    } catch (error) {
      console.warn(`Failed to load sweph from ${path}:`, error.message);
      console.warn('Error stack:', error.stack);
    }
  }
  
  console.warn('All sweph loading attempts failed');
  console.warn('Astronomical calculations will not be available');
  return false;
}
import { sortOrder, orbDegreesNatal, orbDegreesTransit } from '../utilities/constants.js';
import { 
  findPlanetsInElementsObjects, 
  findPlanetsInModalitiesObjects, 
  findPlanetsInQuadrantObjects,
  findBirthChartPatternsObject
} from '../utilities/generateDescriptions.js';

// Add initialization tracking
let ephemerisInitialized = false;

export async function initializeEphemeris() {
  if (!ephemerisInitialized) {
    // Try to load sweph if not already loaded
    if (!sweph && !swephLoadError) {
      await loadSweph();
    }
    
    if (sweph) {
      // Use absolute path for Lambda environment
      const ephePath = process.env.LAMBDA_TASK_ROOT ? '/var/task/data' : './data';
      sweph.set_ephe_path(ephePath);
      ephemerisInitialized = true;
    } else {
      console.warn('Sweph module not available, skipping ephemeris initialization');
    }
  }
}

export async function getPlanetsData(data) {
    await initializeEphemeris();
    
    if (!sweph) {
      throw new Error('Swiss Ephemeris module not available. Astronomical calculations cannot be performed.');
    }
  
    const { year, month, day, hour, min, lat, lon, tzone } = data;
    console.log("data:", JSON.stringify(data, null, 2));
    // Convert local time to UTC
    const decimalHours = hour + min / 60;
    const utcDecimalHours = decimalHours - tzone;
    console.log("utcDecimalHours:", utcDecimalHours);
    const houseSystem = 'P'; // Placidus; you can use 'W' for Whole Sign, etc.
    const jdUT = sweph.julday(year, month, day, utcDecimalHours, 1);
    console.log("jdUT:", jdUT);
    // Use numeric flag values as the constants are undefined in this sweph version
    // 2 = SWIEPH, 256 = SPEED
    const flags = 2 | 256; // = 258
  
    const result = await sweph.houses(jdUT, lat, lon, houseSystem);
    console.log("result:", JSON.stringify(result, null, 2));


  
    const planetIds = [
      sweph.constants.SE_SUN, sweph.constants.SE_MOON, sweph.constants.SE_MERCURY, sweph.constants.SE_VENUS, sweph.constants.SE_MARS,
      sweph.constants.SE_JUPITER, sweph.constants.SE_SATURN, sweph.constants.SE_URANUS, sweph.constants.SE_NEPTUNE, sweph.constants.SE_PLUTO,
      sweph.constants.SE_CHIRON, sweph.constants.SE_TRUE_NODE
    ];
  
    let planets = planetIds.map(pid => {
      const pos = sweph.calc_ut(jdUT, pid, flags);
  
      const [lon, , , speedLong] = pos.data;  // safely destructure what you need
  
  
      let planetName = sweph.get_planet_name(pid)
      console.log("planetName: ", planetName)
      if (planetName === 'true Node') {
        planetName = 'Node'
      }
      if (planetName === 'true Node') {
        planetName = 'Node'
      }
      return {
        name: planetName,
        full_degree: lon,
        norm_degree: lon % 30,
        speed: speedLong,
        is_retro: speedLong < 0,
        sign: getSign(lon),
        house: getHouse(lon, houses)
      };
    });
  
    return planets;
  }
  

export async function getRawChartDataEphemeris(data) {
  await initializeEphemeris();
  
  const { year, month, day, hour, min, lat, lon, tzone } = data;
  console.log("data:", JSON.stringify(data, null, 2));
  // Convert local time to UTC
  const decimalHours = hour + min / 60;
  const utcDecimalHours = decimalHours - tzone;
  console.log("utcDecimalHours:", utcDecimalHours);
  const houseSystem = 'P'; // Placidus; you can use 'W' for Whole Sign, etc.
  const jdUT = sweph.julday(year, month, day, utcDecimalHours, 1);
  console.log("jdUT:", jdUT);
  // Use numeric flag values as the constants are undefined in this sweph version
  // 2 = SWIEPH, 256 = SPEED
  const flags = 2 | 256; // = 258

  const result = await sweph.houses(jdUT, lat, lon, houseSystem);
  console.log("result:", JSON.stringify(result, null, 2));
  const cusps = result.data.houses;
  const points = result.data.points;

  const houses = cusps.map((deg, i) => ({
    house: i + 1,
    degree: deg,
    sign: getSign(deg)
  }));

  const planetIds = [
    sweph.constants.SE_SUN, sweph.constants.SE_MOON, sweph.constants.SE_MERCURY, sweph.constants.SE_VENUS, sweph.constants.SE_MARS,
    sweph.constants.SE_JUPITER, sweph.constants.SE_SATURN, sweph.constants.SE_URANUS, sweph.constants.SE_NEPTUNE, sweph.constants.SE_PLUTO,
    sweph.constants.SE_CHIRON, sweph.constants.SE_TRUE_NODE
  ];

  let planets = planetIds.map(pid => {
    const pos = sweph.calc_ut(jdUT, pid, flags);

    const [lon, , , speedLong] = pos.data;  // safely destructure what you need


    let planetName = sweph.get_planet_name(pid)
    console.log("planetName: ", planetName)
    if (planetName === 'true Node') {
      planetName = 'Node'
    }
    return {
      name: planetName,
      full_degree: lon,
      norm_degree: lon % 30,
      speed: speedLong,
      is_retro: speedLong < 0,
      sign: getSign(lon),
      house: getHouse(lon, houses)
    };
  });



 // points
//   ascendant,           // 0
//   midheaven,           // 1
//   armc,                // 2
//   vertex,              // 3
//   equatorialAsc,       // 4
//   coAscWittaker,       // 5
//   coAscMunkasey,       // 6
//   polarAscendant       // 7
// ] = result.data.points;

  const asc = points[0]; // Ascendant
  const mc = points[1];  // Midheaven

  const ascendantObject = generatePlanetObjectSweph("Ascendant", asc, 1);
  const midheavenObject = generatePlanetObjectSweph("Midheaven", mc, 10);

  planets.splice(10, 0, ascendantObject);
  planets.splice(11, 0, midheavenObject);

  const aspects = findAspectsForBirthChart(planets);
  const modalities = findPlanetsInModalitiesObjects(planets);
  const elements = findPlanetsInElementsObjects(planets);
  const quadrants = findPlanetsInQuadrantObjects(planets);
  const patterns = findBirthChartPatternsObject(planets);

  const rawResponse = {
    date: `${year}-${month}-${day}`,
    lat,
    lon,
    tzone,
    jdUT,
    planets,
    aspects,
    ascendant: asc,
    midheaven: mc,
    houses,
    modalities,
    elements,
    quadrants,
    patterns
  };

  return rawResponse;
}

export function getRawChartDataEphemerisNoTime(base) {
  if (!base || !Array.isArray(base.planets)) {
    return base;
  }

  // Filter out time-dependent points and set house to 0 for all planets
  const planets = base.planets
    .filter(p => {
      const name = p.name?.toLowerCase();
      return name !== 'ascendant' && name !== 'midheaven';
    })
    .map(p => ({ ...p, house: 0 }));

  // Return chart without house and angle data
  return { 
    ...base, 
    planets,
    houses: [], // No house data for unknown time
    ascendant: null, // No ascendant for unknown time
    midheaven: null // No midheaven for unknown time
  };
}


function generatePlanetObjectSweph(name, full_degree, house_number) {
  return {
    name,
    full_degree: full_degree,
    norm_degree: full_degree % 30,
    speed: 0,
    is_retro: false,
    sign: getSign(full_degree),
    house: house_number
  }
}

export const getSign = (degree) => {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const signIndex = Math.floor(degree / 30);
  return signs[signIndex];
};


/**
 * Determines which house a degree falls into
 * @param {number} degree - The degree to check (0-360)
 * @param {Array|Object} houses - Array of house objects or object with house data
 * @returns {number} - The house number (1-12)
 */
export const getHouse = (degree, houses) => {
  // Check if houses is valid
  if (!houses) {
    console.error("Houses data is undefined or null");
    return 0; // Unknown house
  }
  
  // Convert houses to array if it's not already
  let housesArray = [];
  
  if (Array.isArray(houses)) {
    housesArray = houses;
  } else if (typeof houses === 'object') {
    // If houses is an object with cusps property (like what sweph.houses returns)
    if (Array.isArray(houses.cusps)) {
      housesArray = houses.cusps.map((degree, index) => ({
        house: index + 1,
        degree: degree
      }));
    } else {
      // Try to convert object to array if it has numeric keys
      const keys = Object.keys(houses).filter(key => !isNaN(parseInt(key)));
      if (keys.length > 0) {
        housesArray = keys.map(key => ({
          house: parseInt(key),
          degree: houses[key]
        }));
      } else {
        console.error("Could not convert houses object to array:", houses);
        return 0; // Unknown house
      }
    }
  } else {
    console.error("Houses is not an array or object:", typeof houses);
    return 0; // Unknown house
  }
  
  // Check if we have any houses
  if (housesArray.length === 0) {
    console.error("No houses found in data");
    return 0; // Unknown house
  }
  
  
  // Make sure houses are sorted by degree
  const sortedHouses = [...housesArray].sort((a, b) => a.degree - b.degree);
  
  // Check each house
  for (let i = 0; i < sortedHouses.length; i++) {
    const currentHouse = sortedHouses[i];
    const nextHouse = sortedHouses[(i + 1) % sortedHouses.length];
    
    // Handle the case where we wrap around from house 12 back to house 1
    if (i === sortedHouses.length - 1) {
      // If this is the last house, check if degree is between this house and 360 or between 0 and the first house
      if (degree >= currentHouse.degree || degree < nextHouse.degree) {
        return currentHouse.house;
      }
    } else {
      // Normal case: check if degree is between current house and next house
      if (degree >= currentHouse.degree && degree < nextHouse.degree) {
        return currentHouse.house;
      }
    }
  }
  
  // Fallback (should not reach here if houses are properly defined)
  console.error(`Could not determine house for degree ${degree}. Houses:`, JSON.stringify(sortedHouses, null, 2));
  return 0; // Unknown house
};

// findAspectsForBirthChart


export const findAspectsForBirthChart = (planets) => {
  console.log("findAspectsForBirthChart")
  planets.sort((a, b) => sortOrder[a.name] - sortOrder[b.name]);
  const aspects = [];

  for (let i = 0; i < planets.length; i++) {
      const aspectingPlanet = planets[i]
      for (let j = i + 1; j < planets.length; j++) {
          const aspectedPlanet = planets[j]
          if (!aspectedPlanet) {
              console.log(j)
              console.log(planets)
          }

          const aspectingPlanetFullDegree = getProperty(aspectingPlanet, 'fullDegree', 'full_degree');
          const aspectedPlanetFullDegree = getProperty(aspectedPlanet, 'fullDegree', 'full_degree');
          const aspectingPlanetIsRetro = getProperty(aspectingPlanet, 'isRetro', 'is_retro');

          const aspectObject = calculateAspectObject(aspectingPlanetFullDegree, aspectedPlanetFullDegree, aspectingPlanetIsRetro, aspectingPlanet.name, true);
          if (aspectObject) {
              const aspect_object = {
                  'aspectingPlanet': aspectingPlanet['name'],
                  'aspectingPlanetDegree': aspectingPlanetFullDegree,
                  'aspectedPlanet': aspectedPlanet['name'],
                  'aspectedPlanetDegree': aspectedPlanetFullDegree,
                  'aspectType': aspectObject['aspectType'],
                  'orb': aspectObject['orb'],
                }
              aspects.push(aspect_object)
          } 
      };
  };
  return aspects;
}

function getProperty(object, camelCase, snake_case) {
    // console.log("getProperty: ", object.name)
    return object[camelCase] !== undefined ? object[camelCase] : object[snake_case];
  }


export const fetchTimeZone = async (lat, lon, epochTimeSeconds) => {
    const apiKey = process.env.REACT_APP_GOOGLE_API_KEY; 
    const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lon}&timestamp=${epochTimeSeconds}&key=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.status !== 'OK') {
        throw new Error(`Error from TimeZone API: ${data.status}`);
        }

        // Convert offsets to hours
        const totalOffsetHours = (data.rawOffset + data.dstOffset) / 3600;
        console.log(`Total Offset in Hours: ${totalOffsetHours}`);
        
        return totalOffsetHours; // Return the total offset in hours
    } catch (error) {
        console.error('Error fetching time zone:', error);
        throw error; // Propagate the error
    }
}
  

//   export const handleCreateRelationship = async (req, res) => {
//     const { userA, userB } = req.body;
//     const birthChartA = userA.birthChart
//     const birthChartB = userB.birthChart
  
//     console.log('UserA:', JSON.stringify(userA.userA_id, null, 2));
  
  
//     const synastryAspects = await findSynastryAspects(birthChartA.planets, birthChartB.planets);
//     console.log("synastryAspects: ", synastryAspects.length)
//     const compositeChart = await generateCompositeChart(birthChartA, birthChartB);
//     const relationshipProfile = {
//         userA_id: userA._id,
//         userB_id: userB._id,
//         userA_dateOfBirth: userA.dateOfBirth,
//         userB_dateOfBirth: userB.dateOfBirth,
//         userA_name: userA.firstName,
//         userB_name: userB.firstName,
//         synastryAspects,
//         compositeChart
//     };
  
//     // console.log("saveCompositeChart", relationshipProfile);
  
//     const result = await saveCompositeChart(relationshipProfile);
//     console.log("insertedId: ", result.insertedId);
  
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
//     res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
//     res.setHeader('Access-Control-Allow-Credentials', true);
//     res.status(200).json({ relationshipProfile });
//   }
  

export const generateCompositeChart = (birthChart1, birthChart2) => {
    console.log("generateCompositeChart");
    const compositeChart = {
        planets: [],
        houses: [],
        aspects: [],
    };

    const planets1 = birthChart1.planets
    const planets2 = birthChart2.planets

    // Calculate midpoints for planets
    for (let i = 0; i < planets1.length; i++) {
        const planet1 = planets1[i];
        const planet2 = planets2.find((p) => p.name === planet1.name);

        console.log("planet1: ", planet1)
        console.log("planet2: ", planet2)
        if (planet2) {
            const planet1FullDegree = getProperty(planet1, 'fullDegree', 'full_degree');
            const planet2FullDegree = getProperty(planet2, 'fullDegree', 'full_degree');

            const midpoint = calculateMidpoint(planet1FullDegree, planet2FullDegree);
            const sign = getSign(midpoint);

            // calculate norm degree which is the degree in the sign
            const normDegree = midpoint % 30;

            compositeChart.planets.push({
                name: planet1.name,
                full_degree: midpoint,
                norm_degree: normDegree,
                sign: sign,
            });
        }
    }

    console.log("compositeChart.planets: ", compositeChart.planets)
    
    // Check if both users have birth times (ascendant/midheaven data)
    const ascendant1 = planets1.find((p) => p.name === 'ascendant' || p.name === 'Ascendant');
    const ascendant2 = planets2.find((p) => p.name === 'ascendant' || p.name === 'Ascendant');
    const mc1 = planets1.find((p) => p.name === 'midheaven' || p.name === 'MC' || p.name === 'Midheaven');
    const mc2 = planets2.find((p) => p.name === 'midheaven' || p.name === 'MC' || p.name === 'Midheaven');

    let ascendantMidpoint;
    let mcMidpoint;
    let useEqualHouses = false;

    // If either user is missing birth time data, use equal house system starting at 0° Aries
    if (!ascendant1 || !ascendant2 || !mc1 || !mc2) {
        console.log("One or both users missing birth time - using equal house system starting at 0° Aries");
        ascendantMidpoint = 0; // 0° Aries
        mcMidpoint = 270; // 0° Capricorn (270° from Aries)
        useEqualHouses = true;
    } else {
        // Both users have birth times - calculate actual midpoints
        ascendantMidpoint = calculateMidpoint(
            getProperty(ascendant1, 'fullDegree', 'full_degree'),
            getProperty(ascendant2, 'fullDegree', 'full_degree')
        );
        mcMidpoint = calculateMidpoint(
            getProperty(mc1, 'fullDegree', 'full_degree'),
            getProperty(mc2, 'fullDegree', 'full_degree')
        );
    }

    // Store metadata about house system used
    compositeChart.houseSystem = useEqualHouses ? 'equal' : 'placidus';
    compositeChart.hasAccurateBirthTimes = !useEqualHouses;

    // Calculate house cusps - always using equal houses (30° each)
    for (let i = 1; i <= 12; i++) {
        const cusp = (ascendantMidpoint + (i - 1) * 30) % 360;
        const sign = getSign(cusp);
        compositeChart.houses.push({ house: `${i}`, degree: cusp, sign: sign });
    }

    // Calculate house position for each planet
    compositeChart.planets.forEach((planet) => {
        for (let i = 0; i < compositeChart.houses.length - 1; i++) {
            const currentHouse = compositeChart.houses[i];
            const nextHouse = compositeChart.houses[i + 1];
            
            // Handle wrap-around case (when current house degree is greater than next house degree)
            if (currentHouse.degree > nextHouse.degree) {
                // If planet degree is >= current house degree OR < next house degree
                if (planet.full_degree >= currentHouse.degree || planet.full_degree < nextHouse.degree) {
                    planet.house = i + 1;
                    break;
                }
            } else {
                // Normal case (no wrap-around)
                if (planet.full_degree >= currentHouse.degree && planet.full_degree < nextHouse.degree) {
                    planet.house = i + 1;
                    break;
                }
            }
        }
        
        // Handle last house (from last house degree to first house degree)
        if (!planet.house) {
            const lastHouse = compositeChart.houses[compositeChart.houses.length - 1];
            const firstHouse = compositeChart.houses[0];
            
            if (planet.full_degree >= lastHouse.degree || planet.full_degree < firstHouse.degree) {
                planet.house = compositeChart.houses.length;
            }
        }
        
        // Add error logging if no house was found
        if (!planet.house) {
            console.error(`Could not determine house for planet ${planet.name} at ${planet.full_degree}°`);
            console.log('Houses:', compositeChart.houses);
        }
    });

    const aspectsComputed = findAspectsForBirthChart(compositeChart.planets);
    compositeChart.aspects = aspectsComputed;

    

    return compositeChart;
};
  
  export const findSynastryAspects = (birthChart1, birthChart2) => {
    console.log("findSynastryAspects");
    birthChart1.sort((a, b) => sortOrder[a.name] - sortOrder[b.name]);
    birthChart2.sort((a, b) => sortOrder[a.name] - sortOrder[b.name]);
    // console.log("birthChart1: ", birthChart1[0])
    // console.log("birthChart2: ", birthChart2[0])
    const synastryAspects = [];

    for (let i = 0; i < birthChart1.length; i++) {
        const planet1 = birthChart1[i];
        for (let j = 0; j < birthChart2.length; j++) {
            const planet2 = birthChart2[j];

            const planet1FullDegree = getProperty(planet1, 'fullDegree', 'full_degree');
            const planet2FullDegree = getProperty(planet2, 'fullDegree', 'full_degree');
            const planet1IsRetro = getProperty(planet1, 'isRetro', 'is_retro');
            const planet2IsRetro = getProperty(planet2, 'isRetro', 'is_retro');
            const aspectObject = calculateAspectObject(planet1FullDegree, planet2FullDegree, planet1IsRetro, planet1.name, true);
            // console.log("aspectObject: ", aspectObject)
            if (aspectObject) {
                const synastryAspect = {
                    'planet1': planet1['name'],
                    'planet1Degree': planet1FullDegree,
                    'planet2': planet2['name'],
                    'planet2Degree': planet2FullDegree,
                    'aspectType': aspectObject['aspectType'],
                    'planet1IsRetro': planet1IsRetro,
                    'planet2IsRetro': planet2IsRetro,
                    'orb': aspectObject['orb'],
                };
                synastryAspects.push(synastryAspect);
            }
        }
    }
    // console.log("synastryAspects: ", synastryAspects)
    return synastryAspects;
};

function calculateAspectObject(degree1, degree2, isRetro, transitName, isNatal) {
    // console.log("calculateAspectObject")
    let diff = Math.abs(degree1 - degree2);
    diff = diff > 180 ? 360 - diff : diff;

    let maxOrb = orbDegreesTransit[transitName];
    if (isNatal) {
        maxOrb = orbDegreesNatal[transitName];
    }


    const aspects = [
        { name: 'conjunction', orb: 0 },
        { name: 'sextile', orb: 60 },
        { name: 'square', orb: 90 },
        { name: 'trine', orb: 120 },
        { name: 'quincunx', orb: 150 },
        { name: 'opposition', orb: 180 }
    ];

    for (let aspect of aspects) {
        
        const orbDiff = Math.abs(diff - aspect.orb);
        var applying = true;
  

        if (orbDiff <= maxOrb) {
            const roundedOrb = Math.round(orbDiff * 10) / 10; // Round to 1 decimal place
            if (isRetro) {
                applying = !applying;
            }
            return {
                aspectType: aspect.name,
                orb: roundedOrb,
                applying: applying
            };
        }
    }
    return null;
}

// Helper function to calculate the midpoint between two degrees
const calculateMidpoint = (degree1, degree2) => {
    const shortestDistance = Math.abs(degree1 - degree2) > 180 ? 360 - Math.abs(degree1 - degree2) : Math.abs(degree1 - degree2);
    const midpoint = (degree1 + degree2) / 2;
    return shortestDistance > 180 ? (midpoint + 180) % 360 : midpoint;
};

// const getSign = (degree) => {
//     const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
//     const signIndex = Math.floor(degree / 30);
//     return signs[signIndex];
//   };



// export const generateModalities = (chartData) => {
//     const modalities = findPlanetsInModalities(chartData)
//     return modalities
// }

// export const generateElements = (chartData) => {
//     const elements = findPlanetsInElements(chartData)
//     return elements
// }

// export const generateBirthChartPattern = (chartData) => {
//     const pattern = identifyBirthChartPattern(chartData)
//     return pattern
// }
// ------------------------------------------------------------
// Transit utilities
// ------------------------------------------------------------
export function getTransitBodies() {
  if (!sweph) {
    throw new Error('Swiss Ephemeris module not available');
  }
  return [
    { id: sweph.constants.SE_SUN, name: 'Sun' },
    { id: sweph.constants.SE_MOON, name: 'Moon' },
    { id: sweph.constants.SE_MERCURY, name: 'Mercury' },
    { id: sweph.constants.SE_VENUS, name: 'Venus' },
    { id: sweph.constants.SE_MARS, name: 'Mars' },
    { id: sweph.constants.SE_JUPITER, name: 'Jupiter' },
    { id: sweph.constants.SE_SATURN, name: 'Saturn' },
    { id: sweph.constants.SE_URANUS, name: 'Uranus' },
    { id: sweph.constants.SE_NEPTUNE, name: 'Neptune' },
    { id: sweph.constants.SE_PLUTO, name: 'Pluto' }
  ];
}

const ASPECTS = [
  { angle: 0,   orb: 8, name: 'conjunction' },
  { angle: 60,  orb: 6, name: 'sextile' },
  { angle: 90,  orb: 6, name: 'square' },
  { angle: 120, orb: 6, name: 'trine' },
  { angle: 150, orb: 3, name: 'quincunx' },
  { angle: 180, orb: 8, name: 'opposition' }
];

/**
 * Generate a daily ephemeris series between two dates.
 * Dates should be JavaScript Date objects in UTC.
 */
export function generateTransitSeries(fromDate, toDate) {
  initializeEphemeris();
  const flags = sweph.FLG_SWIEPH | sweph.FLG_SPEED;
  const series = [];
  for (let d = new Date(fromDate); d <= toDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const jd = sweph.julday(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 0, 1);
    const planets = TRANSIT_BODIES.map(({ id, name }) => {
      const { data } = sweph.calc_ut(jd, id, flags);
      const [lon,, , speed] = data;
      return { name, lon, speed, sign: getSignFromLon(lon)};
    });
    const sun = planets.find(p => p.name === 'Sun');
    const moon = planets.find(p => p.name === 'Moon');  
    const moonPhase = getMoonPhaseInfo(sun.lon, moon.lon);
    series.push({ date: new Date(d), planets, moonPhase });
  }
  return series;
}

function angularDifference(a, b) {
  return Math.abs(((a - b + 180) % 360) - 180);
}

/**
 * Generator yielding every transit aspect hit for a series.
 */
export function* scanTransitSeries(transitSeries, natalPoints) {
  for (const { date, planets } of transitSeries) {
    for (const t of planets) {
      if (t.speed === undefined || t.lon === undefined) continue; // Skip if essential data is missing

      for (const n of natalPoints) {
        if (n.lon === undefined) continue;

        const relative_pos = (t.lon - n.lon + 360) % 360; // Angle from natal to transiting, CCW

        for (const a of ASPECTS) {
          const delta = angularDifference(relative_pos, a.angle);

          if (delta <= a.orb) {
            let approaching = false;
            if (t.speed !== 0) {
              // Normalized difference from transiting planet's relative position to the exact aspect angle
              // Positive if transiting planet is CCW past the aspect point, negative if CW before it.
              const norm_angle_diff_to_exact = (relative_pos - a.angle + 180 + 360) % 360 - 180;
              // Approaching if the product of this difference and speed is negative
              // (e.g., speed > 0 and diff < 0 => moving towards exact from behind)
              // (e.g., speed < 0 and diff > 0 => moving towards exact from ahead)
              approaching = (norm_angle_diff_to_exact * t.speed) < 0;
            }

            yield {
              date, // This is a Date object
              transitingPlanet: t.name,
              natalPlanet: n.name,
              aspect: a.name,
              orb: +(delta.toFixed(2)),
              approaching,
              transitingSign: t.sign, // Include the transiting planet's sign
              transitingDegree: t.lon, // Include the transiting planet's longitude
              isRetrograde: t.speed < 0 // Planet is retrograde if speed is negative
            };
          }
        }
      }
    }
  }
}

/**
 * Collapse raw scan results into start/exact/end windows.
 * Assumes events are generated from a transit series that has varying time steps.
 */
export function mergeTransitWindows(events) {
  const byKey = {};
  for (const e of events) {
    // Ensure date is a Date object for proper sorting and comparison
    const eventDate = e.date instanceof Date ? e.date : new Date(e.date);
    const key = `${e.transitingPlanet}|${e.natalPlanet}|${e.aspect}`;
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push({ ...e, date: eventDate }); // Store with Date object
  }

  const windows = [];
  for (const key of Object.keys(byKey)) {
    // Sort events chronologically for this specific aspect combination
    const eventGroup = byKey[key].sort((a, b) => a.date.getTime() - b.date.getTime());

    if (eventGroup.length > 0) {
      // All events in eventGroup are considered part of the same continuous aspect occurrence
      windows.push(buildWindowFromEventGroup(eventGroup));
    }
  }
  return windows;
}

/**
 * Builds a single window object from a group of chronological events
 * representing one continuous aspect.
 * @param {Array<Object>} eventGroup - A sorted array of raw event objects.
 */
function buildWindowFromEventGroup(eventGroup) {
  const startEvent = eventGroup[0];
  const endEvent = eventGroup[eventGroup.length - 1];

  let exactEvent = startEvent;
  for (const currentEvent of eventGroup) {
    if (currentEvent.orb < exactEvent.orb) {
      exactEvent = currentEvent;
    }
    // If orbs are equal, prefer an approaching one if the current exact is not,
    // or if both are approaching, or both separating, keep the earlier one (already handled by sort + initial exactEvent).
    // This can be refined further if exactitude needs more precise rules for ties.
    else if (currentEvent.orb === exactEvent.orb && currentEvent.approaching && !exactEvent.approaching) {
        exactEvent = currentEvent;
    }
  }

  return {
    start: startEvent.date,
    exact: exactEvent.date,
    end: endEvent.date,
    transiting: exactEvent.transitingPlanet,
    natal: exactEvent.natalPlanet,
    aspect: exactEvent.aspect,
    minOrb: exactEvent.orb, // Orb at the point of exactitude
    exactEventApproaching: exactEvent.approaching, // Was it approaching at the exact point?
    transitingSignAtStart: startEvent.transitingSign,
    transitingSignAtExact: exactEvent.transitingSign,
    transitingSignAtEnd: endEvent.transitingSign,
    transitingDegreeAtStart: startEvent.transitingDegree,
    transitingDegreeAtExact: exactEvent.transitingDegree,
    transitingDegreeAtEnd: endEvent.transitingDegree,
    isRetrogradeAtStart: startEvent.isRetrograde,
    isRetrogradeAtExact: exactEvent.isRetrograde,
    isRetrogradeAtEnd: endEvent.isRetrograde
  };
}

export function getMoonPhaseInfo(sunLon, moonLon) {
    const SIGNS = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
  
    // Normalize angle difference to 0–360°
    const angle = (moonLon - sunLon + 360) % 360;
  
    // Get Moon sign (0–360° → 12 signs)
    const moonSign = SIGNS[Math.floor(moonLon / 30)];
  
    // Determine phase
    let phase = '', waxing = true, description = '';
  
    if (angle < 22.5) {
      phase = 'New Moon';
      description = 'New beginnings, seeding intentions';
    } else if (angle < 67.5) {
      phase = 'Waxing Crescent';
      description = 'Building momentum, setting plans in motion';
    } else if (angle < 112.5) {
      phase = 'First Quarter';
      description = 'Tension and action, breaking inertia';
    } else if (angle < 157.5) {
      phase = 'Waxing Gibbous';
      description = 'Refinement, anticipation, final growth';
    } else if (angle < 202.5) {
      phase = 'Full Moon';
      description = 'Clarity, culmination, emotional illumination';
      waxing = false;
    } else if (angle < 247.5) {
      phase = 'Waning Gibbous';
      description = 'Dissemination, sharing insights, teaching';
      waxing = false;
    } else if (angle < 292.5) {
      phase = 'Last Quarter';
      description = 'Letting go, making peace, integration';
      waxing = false;
    } else if (angle < 337.5) {
      phase = 'Waning Crescent';
      description = 'Rest, release, retreat, dream time';
      waxing = false;
    } else {
      phase = 'New Moon';
      description = 'New beginnings, seeding intentions';
    }
  
    return {
      phase,              // "First Quarter", "Full Moon", etc.
      angle: +angle.toFixed(2), // Angle in degrees
      waxing,
      moonSign,
      description
    };
  }
  
  
  export function extractSignWindows(transitSeries) {
    const windows = [];
    const active = new Map(); // planet → { sign, start }
  
    for (const { date, planets } of transitSeries) {
      for (const p of planets) {
        const prev = active.get(p.name);
  
        if (!prev) {
          active.set(p.name, { sign: p.sign, start: date });
        } else if (prev.sign !== p.sign) {
          windows.push({
            transiting: p.name,
            sign: prev.sign,
            start: prev.start,
            end: date
          });
          active.set(p.name, { sign: p.sign, start: date });
        }
      }
    }
  
    // flush active windows
    for (const [planet, { sign, start }] of active.entries()) {
      windows.push({ transiting: planet, sign, start, end: null }); // still active
    }
  
    return windows;
  }
  

  const SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  
  export function getSignFromLon(lon) {
    return SIGNS[Math.floor(lon / 30)];
  }

/**
 * Generator yielding transit-to-transit aspects from a transit series.
 * Filters out aspects between two fast-moving planets.
 */
export function* scanTransitToTransitAspects(transitSeries) {
  const PLANET_SPEEDS = {
    Moon: 13.2,
    Sun: 1.0,
    Mercury: 1.6,
    Venus: 1.2,
    Mars: 0.7,
    Jupiter: 0.08,
    Saturn: 0.03,
    Uranus: 0.01,
    Neptune: 0.006,
    Pluto: 0.004
  };
  
  for (const { date, planets } of transitSeries) {
    // Check aspects between all transit planet pairs
    for (let i = 0; i < planets.length; i++) {
      for (let j = i + 1; j < planets.length; j++) {
        const p1 = planets[i];
        const p2 = planets[j];
        
        // Skip if both are fast-moving (> 2 degrees/day)
        const p1Speed = PLANET_SPEEDS[p1.name] || 1;
        const p2Speed = PLANET_SPEEDS[p2.name] || 1;
        
        if (p1Speed > 2 && p2Speed > 2) {
          continue;
        }
        
        const angle = angularDifference(p1.lon, p2.lon);
        
        for (const aspect of ASPECTS) {
          const delta = angularDifference(angle, aspect.angle);
          
          if (delta <= aspect.orb) {
            yield {
              date,
              planet1: p1.name,
              planet2: p2.name,
              aspect: aspect.name,
              orb: +(delta.toFixed(2)),
              sign1: p1.sign,
              sign2: p2.sign,
              degree1: p1.lon,
              degree2: p2.lon,
              isRetrograde1: p1.speed < 0,
              isRetrograde2: p2.speed < 0
            };
          }
        }
      }
    }
  }
}

/**
 * Merge transit-to-transit aspect events into windows.
 * Similar to mergeTransitWindows but for transit-to-transit aspects.
 */
export function mergeTransitToTransitWindows(events) {
  const byKey = {};
  
  for (const e of events) {
    const eventDate = e.date instanceof Date ? e.date : new Date(e.date);
    // Create a consistent key regardless of planet order
    const planets = [e.planet1, e.planet2].sort();
    const key = `${planets[0]}|${planets[1]}|${e.aspect}`;
    
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push({ ...e, date: eventDate });
  }
  
  const windows = [];
  
  for (const key of Object.keys(byKey)) {
    const eventGroup = byKey[key].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    if (eventGroup.length > 0) {
      const [planet1, planet2, aspect] = key.split('|');
      windows.push(buildTransitToTransitWindow(eventGroup, planet1, planet2, aspect));
    }
  }
  
  return windows;
}

/**
 * Builds a single window object for transit-to-transit aspects.
 */
function buildTransitToTransitWindow(eventGroup, planet1, planet2, aspect) {
  const startEvent = eventGroup[0];
  const endEvent = eventGroup[eventGroup.length - 1];
  
  let exactEvent = startEvent;
  for (const currentEvent of eventGroup) {
    if (currentEvent.orb < exactEvent.orb) {
      exactEvent = currentEvent;
    }
  }
  
  return {
    start: startEvent.date,
    exact: exactEvent.date,
    end: endEvent.date,
    planet1,
    planet2,
    aspect,
    minOrb: exactEvent.orb,
    sign1: exactEvent.sign1,
    sign2: exactEvent.sign2,
    degree1AtStart: startEvent.degree1,
    degree2AtStart: startEvent.degree2,
    degree1AtExact: exactEvent.degree1,
    degree2AtExact: exactEvent.degree2,
    degree1AtEnd: endEvent.degree1,
    degree2AtEnd: endEvent.degree2,
    isRetrograde1AtStart: startEvent.isRetrograde1,
    isRetrograde2AtStart: startEvent.isRetrograde2,
    isRetrograde1AtExact: exactEvent.isRetrograde1,
    isRetrograde2AtExact: exactEvent.isRetrograde2,
    isRetrograde1AtEnd: endEvent.isRetrograde1,
    isRetrograde2AtEnd: endEvent.isRetrograde2
  };
}