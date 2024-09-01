
import { 
    elements, 
    elementPoints,
    orbCodes,
    planetCodes,
    signCodes, 
    relevantPromptAspects, 
    rulers, 
    transitCodes,
    retroCodes,
    quadrants, 
    ignorePlanets, 
    ignorePoints,
    sortOrder } from "./constants.js";

import { parse, differenceInDays } from 'date-fns';


// import { decodeHouseTransitCode, decodeTransitNatalAspectCode } from "./decoder.js";
function getProperty(object, camelCase, snake_case) {
    return object[camelCase] !== undefined ? object[camelCase] : object[snake_case];
  }


export const findDailyTransitAspects = (dailyTransits) => {
    // const updatedTransits = updateObjectKeys(transits);
    // console.log(updatedTransits)
        // Sort the houses by degree for proper comparison
    // const typeDescriptor = 'Tr'

    dailyTransits.sort((a, b) => sortOrder[a.name] - sortOrder[b.name]);


    const aspects = [];

    // dailyTransits.forEach(transit => {
    for (let i = 0; i < dailyTransits.length; i++) {

        const transit = dailyTransits[i]
        if (["South Node", "Chiron", "Part of Fortune", "Ascendant"].includes(transit.name)) continue

        // console.log(transit)
        let retroCode = transit.is_retro === 'true' ? 'r' : 'p'
        let retroDescription = transit.is_retro === 'true' ? 'retrograde' : ''
        const signTransitDegree = transit.full_degree % 30
        let signTransit = 'T'
        if (signTransitDegree < 3) {
            signTransit = 'E'
        } else if (signTransitDegree > 27) {
            signTransit = 'L'
        }

        const code = "Ht-" + retroCode + planetCodes[transit.name] + signTransit + signCodes[transit.sign]
        const houseDescription = `${retroDescription} ${transit.name} transiting ${transit.sign} ${code}`
        // const houseDescriptionDecoded = decodeHouseTransitCode(code)
        // aspects.push(houseDescriptionDecoded)
        aspects.push(houseDescription)
        // dailyTransits.forEach(anotherPlanet => {

        for (let j = i + 1; j < dailyTransits.length; j++) {
            const anotherPlanet = dailyTransits[j]
            if (["South Node", "Chiron", "Part of Fortune"].includes(anotherPlanet.name)) continue
            // var transitAspects = []
            const aspectObject = calculateAspect(transit.full_degree, anotherPlanet.full_degree, transit.is_retro, transit.name);
            if (aspectObject) {
                const retroCodeAspecting = anotherPlanet.is_retro == "true" ? 'r' : 'p'
                const retroDescriptoinAspecting = anotherPlanet.is_retro == "true" ? 'retrograde' : ''

                const code = "At-" + retroCode + planetCodes[transit.name] + aspectObject.code + retroCodeAspecting + planetCodes[anotherPlanet.name] + signCodes[anotherPlanet.sign]
                // const decodedDesciption = decodeTransitNatalAspectCode(code)
                // aspects.push(decodedDesciption)
                // console.log(aspectObject.aspectType)
                const transitDescription = `${retroDescription} ${transit.name} transiting ${transit.sign} ${aspectObject.aspectType} to ${retroDescriptoinAspecting} ${anotherPlanet.name} ${anotherPlanet.sign} - ${code}`
                // aspects.push(transitDescription)
            } 
        };
    };

    // console.log("daily transits....")
    // console.log(aspects)
    return aspects;
}




export const findDailyTransitAspectsForBirthChart = (groupedTransits, birthChart)  => {
    const aspects = [];
    console.log(groupedTransits.length)

    for (const date in groupedTransits) {
        if (groupedTransits.hasOwnProperty(date)) {
            const dailyTransits = groupedTransits[date].transits;
            try {
                const dailyAspects = findDailyTransitAspectsForBirthChartSnapshot(dailyTransits, birthChart);
                aspects.push(...dailyAspects);
            } catch (error) {
                console.error(`Error processing data for ${date}: ${error}`);
            }
        }
    }
    return aspects;
}

// this is the function that is used to generate the aspects for the birth chart for any single transit
// todo: refactor this to get natal aspects as well by passing in the same object for both params
const findDailyTransitAspectsForBirthChartSnapshot = (dailyTransits, birthChart) => {
    // console.log("daily transits....")
    // console.log(birthChart)
    dailyTransits.sort((a, b) => sortOrder[a.name] - sortOrder[b.name]);
    const aspects = [];
    // console.log(dailyTransits[0])
    // console.log(birthChart)

    for (let i = 0; i < dailyTransits.length; i++) {
        const transit = dailyTransits[i]
        // console.log(transit.name)
        for (let j = 0; j < birthChart.length; j++) {
            // console.log(birthChart[j])
            const anotherPlanet = birthChart[j]
            // console.log("another planet")
            // console.log(birthChart.length)

            // console.log(transit.name)
            // console.log(anotherPlanet)
            if (!anotherPlanet) {
                console.log(j)
                console.log(birthChart)
            }
            if (["South Node", "Chiron", "Part of Fortune"].includes(anotherPlanet.name)) continue

            const transitFullDegree = getProperty(transit, 'fullDegree', 'full_degree');
            const anotherPlanetFullDegree = getProperty(anotherPlanet, 'fullDegree', 'full_degree');
            const transitIsRetro = getProperty(transit, 'isRetro', 'is_retro');

            const aspectObject = calculateAspectObject(transitFullDegree, anotherPlanetFullDegree, transitIsRetro, transit.name);
            if (aspectObject) {
                const transit_object = {
                    'transitingPlanet': transit['name'],
                    'transitingPlanetDegree': transit['fullDegree'],
                    'aspectingPlanet': anotherPlanet['name'],
                    'aspectingPlanetDegree': anotherPlanet['full_degree'],
                    'aspectType': aspectObject['aspectType'],
                    'orb': aspectObject['orb'],
                    'date': transit['date']
                  }
                // console.log(transit_object)
                aspects.push(transit_object)
            } 
        };
    };
    // console.log(aspects)
    return aspects;
}




export const findAspectsForBirthChart = (birthChart) => {
    console.log("findAspectsForBirthChart")
    birthChart.sort((a, b) => sortOrder[a.name] - sortOrder[b.name]);
    const aspects = [];

    for (let i = 0; i < birthChart.length; i++) {
        const transitingPlanet = birthChart[i]
        for (let j = i + 1; j < birthChart.length; j++) {
            const anotherPlanet = birthChart[j]
            if (!anotherPlanet) {
                console.log(j)
                console.log(birthChart)
            }

            const transitFullDegree = getProperty(transitingPlanet, 'fullDegree', 'full_degree');
            const anotherPlanetFullDegree = getProperty(anotherPlanet, 'fullDegree', 'full_degree');
            const transitIsRetro = getProperty(transitingPlanet, 'isRetro', 'is_retro');

            const aspectObject = calculateAspectObject(transitFullDegree, anotherPlanetFullDegree, transitIsRetro, transitingPlanet.name);
            if (aspectObject) {
                const transit_object = {
                    'transitingPlanet': transitingPlanet['name'],
                    'transitingPlanetDegree': transitFullDegree,
                    'aspectingPlanet': anotherPlanet['name'],
                    'aspectingPlanetDegree': anotherPlanetFullDegree,
                    'aspectType': aspectObject['aspectType'],
                    'orb': aspectObject['orb'],
                  }
                aspects.push(transit_object)
            } 
        };
    };
    return aspects;
}



export const createGroupedTransitObjects = (transits) => {
        const groupedTransits = {};
        // Group transits by key
        transits.forEach(transit => {
          const key = `${transit.transitingPlanet}-${transit.aspectingPlanet}-${transit.aspectType}`;
          if (!groupedTransits[key]) {
            groupedTransits[key] = [];
            console.log("key: " + key)

          }
          groupedTransits[key].push(transit);
        });
      
        const summaryTransits = [];
        // Process each group
        for (const key in groupedTransits) {
            console.log("key grouped Transits: " + key)

          if (groupedTransits.hasOwnProperty(key)) {
            const group = groupedTransits[key];
            // Sort the group by date
            group.sort((a, b) => new Date(a.date) - new Date(b.date));
      
            // Split the group into continuous periods
            let currentGroup = [group[0]];
            for (let i = 1; i < group.length; i++) {
                console.log(" into groups ")
              const dateDiff = differenceInDays(parse(group[i].date, 'yyyy-MM-dd HH:mm:ss', new Date()), 
                                                parse(group[i - 1].date, 'yyyy-MM-dd HH:mm:ss', new Date()));


              if (dateDiff > 1) {
                summaryTransits.push(createSummaryTransit(key, currentGroup));
                currentGroup = [];
              }
              currentGroup.push(group[i]);
            }
            if (currentGroup.length) {
              summaryTransits.push(createSummaryTransit(key, currentGroup));
            }
          }
        }
      
        return summaryTransits;
}

function createSummaryTransit(key, group) {
    // Sort the group by date to find the earliest and latest dates
    console.log("key: " + key)
    console.log("group: " + group.length)
    group.sort((a, b) => new Date(a.date) - new Date(b.date));
    const earliestDate = group[0].date;
    const latestDate = group[group.length - 1].date;
  
    // Orb values at the earliest and latest dates
    const earliestOrb = group[0].orb;
    const latestOrb = group[group.length - 1].orb;
  
    // Find the date with the lowest orb
    const closestOrbTransit = group.reduce((min, transit) => 
      Math.abs(transit.orb) < Math.abs(min.orb) ? transit : min
    , group[0]);
    const closestOrbDate = closestOrbTransit.date;
    const closestOrbValue = closestOrbTransit.orb;
  
    const [transitingPlanet, aspectingPlanet, aspectType] = key.split('-');
    const summaryTransit = {
      transitingPlanet: transitingPlanet,
      aspectingPlanet: aspectingPlanet,
      aspectType: aspectType,
      dateRange: [earliestDate, latestDate],
      earliestOrb: earliestOrb,
      latestOrb: latestOrb,
      closestOrbDate: closestOrbDate,
      closestOrbValue: closestOrbValue
    };
  
    return summaryTransit;
  }
  



function calculateAspect(degree1, degree2, isRetro, transitName) {
    let diff = Math.abs(degree1 - degree2);
    diff = diff > 180 ? 360 - diff : diff;

    // Define the aspects in an array to simplify the checks
    const aspects = [
      { name: 'conjunction', orb: 0 },
      { name: 'sextile', orb: 60 },
      { name: 'square', orb: 90 },
      { name: 'trine', orb: 120 },
      { name: 'quincunx', orb: 150 },
      { name: 'opposition', orb: 180 },
    ];

    // Orb degrees based on the planet's speed
    const orbDegrees = {
      'Moon': 8,
      'Mercury': 5,
      'Venus': 5,
      'Sun': 5,
      'Mars': 3,
      'Jupiter': 3,
      'Saturn': 3,
      'Uranus': 3,
      'Neptune': 3,
      'Pluto': 3
    };

    const maxOrb = orbDegrees[transitName];

    for (let aspect of aspects) {
      if (diff >= aspect.orb - maxOrb && diff <= aspect.orb + maxOrb) {
        let orbDiff = Math.abs(diff - aspect.orb);
        let aspectType = aspect.name;
        let code = transitCodes[aspect.name];

        aspectType = orbDiff < 1 ? 'exact ' + aspectType : aspectType;
        code = orbDiff < 1 ? 'e' + code : 'g' + code;

        let perfectOrbDegree = degree1 + aspect.orb;
        perfectOrbDegree = perfectOrbDegree > 360 ? perfectOrbDegree - 360 : perfectOrbDegree;

        if ((degree1 <= perfectOrbDegree && perfectOrbDegree < degree2) || (degree2 < 3 && perfectOrbDegree > 360 - degree2)) {
            if (!isRetro) {
                aspectType = '(applying) ' + aspectType + ` (by ${orbDiff.toFixed(1)} degrees)`;
                code = 'ap' + code;
            } else {
                aspectType = '(separating) ' + aspectType + ` (by ${orbDiff.toFixed(1)} degrees)`;
                code = 'sp' + code;
            }
        } else {
            if (isRetro) {
                aspectType = '(applying) ' + aspectType + ` (by ${orbDiff.toFixed(1)} degrees)`;
                code = 'ap' + code;
            } else {
                aspectType = '(separating) ' + aspectType + ` (by ${orbDiff.toFixed(1)} degrees)`;
                code = 'sp' + code;
            }
        }

        return { code: code, aspectType: aspectType };
      }
    }

    return null;
}

function calculateAspectObject(degree1, degree2, isRetro, transitName) {
    // console.log("calculateAspectObject")
    let diff = Math.abs(degree1 - degree2);
    diff = diff > 180 ? 360 - diff : diff;
    const orbDegrees = {
        'Moon': 8,
        'Mercury': 5,
        'Venus': 5,
        'Sun': 5,
        'Mars': 3,
        'Jupiter': 3,
        'Saturn': 3,
        'Uranus': 3,
        'Neptune': 3,
        'Pluto': 3
    };

    const maxOrb = orbDegrees[transitName];

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



async function generateAllTransitAspectsGroupForChart(groupedTransits, birthChart) {
    const aspects = [];

    for (const date in groupedTransits) {
        if (groupedTransits.hasOwnProperty(date)) {
            const dailyTransits = groupedTransits[date];
            try {
                const dailyAspects = await findDailyTransitAspectsForBirthChart(dailyTransits, birthChart);
                aspects.push(...dailyAspects);
            } catch (error) {
                console.error(`Error processing data for ${date}: ${error}`);
            }
        }
    }

    return aspects;
}


// takes in grouped transits and returns a list of planets with their transits
export function trackPlanetaryTransits(transitsData) {
    const planetaryTransits = {};

    // Sort transitsData by date
    transitsData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Initialize the structure for each planet
    transitsData[0].transits.forEach(transit => {
        planetaryTransits[transit.name] = {
            planet: transit.name,
            transitSigns: []
        };
    });

    // Track the transits
    transitsData.forEach(dailyTransit => {
        const date = new Date(dailyTransit.date).toISOString();
        dailyTransit.transits.forEach(transit => {
            const planetName = transit.name;
            const currentSign = transit.sign;
            const lastTransit = planetaryTransits[planetName].transitSigns[planetaryTransits[planetName].transitSigns.length - 1];

            if (lastTransit && lastTransit.transitingSign === currentSign) {
                // If the sign is the same and the date is consecutive, update the endDate
                const dayDiff = (new Date(date) - new Date(lastTransit.dateRange[1])) / (1000 * 60 * 60 * 24);
                if (dayDiff <= 1) {
                    lastTransit.dateRange[1] = date;
                } else {
                    // If there's a gap, create a new entry
                    planetaryTransits[planetName].transitSigns.push({
                        transitingSign: currentSign,
                        dateRange: [date, date]
                    });
                }
            } else {
                // If the sign changes or it's a new entry, start a new one
                planetaryTransits[planetName].transitSigns.push({
                    transitingSign: currentSign,
                    dateRange: [date, date]
                });
            }
        });
    });

    // Merge consecutive ranges with the same sign
    Object.values(planetaryTransits).forEach(planet => {
        const mergedTransits = [];
        let currentTransit = null;

        planet.transitSigns.forEach(transit => {
            if (currentTransit && currentTransit.transitingSign === transit.transitingSign) {
                currentTransit.dateRange[1] = transit.dateRange[1];
            } else {
                if (currentTransit) {
                    mergedTransits.push(currentTransit);
                }
                currentTransit = {
                    transitingSign: transit.transitingSign,
                    dateRange: [...transit.dateRange]
                };
            }
        });

        if (currentTransit) {
            mergedTransits.push(currentTransit);
        }

        planet.transitSigns = mergedTransits;
    });

    return planetaryTransits;
}

// takes in grouped transits and returns a list of planets with their transits through the given birth chart houses
export function trackPlanetaryHouses(transitsData, birthChartHouses) {
    const planetaryHouses = {};

    // Sort transitsData by date
    transitsData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Sort the birthChartHouses by degree
    birthChartHouses.sort((a, b) => a.degree - b.degree);

    // Initialize the structure for each planet
    transitsData[0].transits.forEach(transit => {
        planetaryHouses[transit.name] = {
            planet: transit.name,
            transitHouses: []
        };
    });

    // Track the houses
    transitsData.forEach(dailyTransit => {
        const date = new Date(dailyTransit.date).toISOString();
        dailyTransit.transits.forEach(transit => {
            const planetName = transit.name;
            const currentDegree = transit.fullDegree;
            
            // Determine the current house based on the fullDegree
            let currentHouse = null;
            for (let i = 0; i < birthChartHouses.length; i++) {
                const currentHouseDegree = birthChartHouses[i].degree;
                const nextHouseDegree = i < birthChartHouses.length - 1 
                    ? birthChartHouses[i + 1].degree 
                    : birthChartHouses[0].degree + 360; // Wrap-around case

                if (currentDegree >= currentHouseDegree && currentDegree < nextHouseDegree) {
                    currentHouse = birthChartHouses[i].house;
                    break;
                }
            }

            const lastHouseTransit = planetaryHouses[planetName].transitHouses[planetaryHouses[planetName].transitHouses.length - 1];

            if (lastHouseTransit && lastHouseTransit.transitingHouse === currentHouse) {
                // If the house is the same and the date is consecutive, update the endDate
                const dayDiff = (new Date(date) - new Date(lastHouseTransit.dateRange[1])) / (1000 * 60 * 60 * 24);
                if (dayDiff <= 1) {
                    lastHouseTransit.dateRange[1] = date;
                } else {
                    // If there's a gap, create a new entry
                    planetaryHouses[planetName].transitHouses.push({
                        transitingHouse: currentHouse,
                        dateRange: [date, date]
                    });
                }
            } else {
                // If the house changes or it's a new entry, start a new one
                planetaryHouses[planetName].transitHouses.push({
                    transitingHouse: currentHouse,
                    dateRange: [date, date]
                });
            }
        });
    });

    // Merge consecutive ranges with the same house
    Object.values(planetaryHouses).forEach(planet => {
        const mergedTransits = [];
        let currentTransit = null;

        planet.transitHouses.forEach(transit => {
            if (currentTransit && currentTransit.transitingHouse === transit.transitingHouse) {
                currentTransit.dateRange[1] = transit.dateRange[1];
            } else {
                if (currentTransit) {
                    mergedTransits.push(currentTransit);
                }
                currentTransit = {
                    transitingHouse: transit.transitingHouse,
                    dateRange: [...transit.dateRange]
                };
            }
        });

        if (currentTransit) {
            mergedTransits.push(currentTransit);
        }

        planet.transitHouses = mergedTransits;
    });

    return planetaryHouses;
}