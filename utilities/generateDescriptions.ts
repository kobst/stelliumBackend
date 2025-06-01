// @ts-nocheck
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
    modalities,
    ignorePlanets, 
    ignorePointsForDominance,
    ignorePointsForModalities,
    ignorePointsForElements,
    ignorePoints } from "./constants.js";

  import { decodePlanetHouseCode, decodeAspectCode, decodeAspectCodeMap, decodeRulerCode } from "./archive/decoder.js";

  function formatHouseNum(h) {
    return h && h > 0 ? h : 'unknown';
  }

  // Utility function to get the difference between degrees considering circular nature
export function degreeDifference(deg1, deg2) {
    let diff = Math.abs(deg1 - deg2);
    return diff > 180 ? 360 - diff : diff;
}



  export const orbDescription = (orb) => {
    if (orb < 1) {
      return "nearly exact";
    } else if (orb >= 1 && orb < 3) {
      return "tight";
    } else if (orb >= 7 && orb < 10) {
      return "loose";
    } else {
      return "";
    }
  }

//   export const ignorePoints = ["Chiron", "Part of Fortune", "South Node"]
  


  export function findPlanetsInElements(planets) {
    console.log("planets", planets)
    const planetsInElements = { 'Fire': [], 'Earth': [], 'Air': [], 'Water': [] };
    const elementPercentiles = {};
    planets.forEach(planetData => {
      if (ignorePoints.includes(planetData.name)) {
        return;
      }
      for (const [element, signs] of Object.entries(elements)) {
        if (signs.includes(planetData.sign)) {
          planetsInElements[element].push(planetData.name);
        }
      }
    });
  
    const result = [];
    for (const [element, list] of Object.entries(planetsInElements)) {
      let points = 0;
      list.forEach(planet => {
        if (elementPoints.hasOwnProperty(planet)) {
          points += elementPoints[planet];
        }
      });
  
      const percentage = points / 21;
      elementPercentiles[element] = percentage;
      const formattedValue = (percentage * 100).toFixed(1);
      const category = getDescriptionElementDominance(percentage * 100);
      result.push(`${element} is ${category} with dominance percentage: ${formattedValue}% planets: ${list}`);
    }
    console.log("result", result)
    return result.join("\n");
  }
   

  export function findPlanetsInElementsObjects(planets) {
    const planetsInElements = { 'Fire': [], 'Earth': [], 'Air': [], 'Water': [] };
    
    // Calculate planets in each element
    planets.forEach(planetData => {
        if (ignorePointsForElements.includes(planetData.name)) {
            return;
        }
        for (const [element, signs] of Object.entries(elements)) {
            if (signs.includes(planetData.sign)) {
                planetsInElements[element].push(planetData.name);
            }
        }
    });
    
    // Calculate points and create result object
    const result = {
        elements: Object.entries(planetsInElements).map(([element, planetList]) => {
            // Calculate total points for this element
            const points = planetList.reduce((total, planet) => {
                return total + (elementPoints[planet] || 0);
            }, 0);
            
            const percentage = parseFloat(((points / 21) * 100).toFixed(1));
            
            return {
                name: element,
                planets: planetList,
                count: planetList.length,
                points: points,
                percentage: percentage,
                dominance: getDescriptionElementDominance(percentage)
            };
        })
    };
    
    console.log("result", result);
    return result;
  }


  function getDescriptionElementDominance(percent) {
    let category = "";
    if (percent > 40.0) {
      category = "extremely dominant";
    } else if (percent >= 33.5 && percent <= 40.0) {
      category = "very dominant";
    } else if (percent >= 27.0 && percent <= 33.5) {
      category = "very influential";
    } else if (percent >= 18 && percent <= 27) {
      category = "influential";
    } else if (percent >= 10 && percent <= 18) {
      category = "weakly influential";
    } else {
      category = "a negligible influence";
    }
    return category;
  }

//   export function findPlanetsInElements(chartData) {
//     const planetsInElements = { 'Fire': [], 'Earth': [], 'Air': [], 'Water': [] };
//     const elementPercentiles = {};
//     chartData.planets.forEach(planetData => {
//       if (ignorePoints.includes(planetData.name)) {
//         return;
//       }
//       for (const [element, signs] of Object.entries(elements)) {
//         if (signs.includes(planetData.sign)) {
//           planetsInElements[element].push(planetData.name);
//         }
//       }
//     });
  
//     const result = [];
//     for (const [element, list] of Object.entries(planetsInElements)) {
//       let points = 0;
//       list.forEach(planet => {
//         if (elementPoints.hasOwnProperty(planet)) {
//           points += elementPoints[planet];
//         }
//       });
  
//       const percentage = points / 21;
//       elementPercentiles[element] = percentage;
//       const formattedValue = (percentage * 100).toFixed(1);
//       const category = getDescriptionElementDominance(percentage * 100);
//       result.push(`${element} is ${category} with dominance percentage: ${formattedValue}% planets: ${list}`);
//     }
  
//     return result.join("\n");
//   }
   

  const ignoreModalityPoints = [
    "Chiron", "Part of Fortune", "South Node", "Midheaven", "Node", "true Node"
    ]
    
    export function findPlanetsInModalities(planets) {
        console.log("planets", planets)
        const planetsInModalities = { 'Cardinal': [], 'Fixed': [], 'Mutable': [] };
        const modalityPercentiles = {};
      
        planets.forEach(planetData => {
          if (ignoreModalityPoints.includes(planetData.name)) {
            return;
          }
          for (const [modality, signs] of Object.entries(modalities)) {
            if (signs.includes(planetData.sign)) {
              planetsInModalities[modality].push(planetData.name);
            }
          }
        });
      
        const result = [];
        for (const [modality, list] of Object.entries(planetsInModalities)) {
          const num = list.length;
          const percentage = num / 11; // Assuming there are 11 planets
          modalityPercentiles[modality] = percentage;
          const formattedValue = (percentage * 100).toFixed(1);
          result.push(`${modality} Percentage: ${formattedValue}% planets: ${list}`);
        }
        console.log("result", result)
        return result.join("\n");
      }


      export function findPlanetsInModalitiesObjects(planets) {
        // console.log("planets", planets);
        const planetsInModalities = { 'Cardinal': [], 'Fixed': [], 'Mutable': [] };
        
        // Calculate planets in each modality
        planets.forEach(planetData => {
            if (ignoreModalityPoints.includes(planetData.name)) {
                return;
            }
            for (const [modality, signs] of Object.entries(modalities)) {
                if (signs.includes(planetData.sign)) {
                    planetsInModalities[modality].push(planetData.name);
                }
            }
        });
        
        // Calculate percentages and create result object
        const totalPlanets = 11; // Assuming there are 11 planets
        const result = {
            modalities: Object.entries(planetsInModalities).map(([modality, planetList]) => ({
                name: modality,
                planets: planetList,
                count: planetList.length,
                percentage: parseFloat(((planetList.length / totalPlanets) * 100).toFixed(1))
            }))
        };
        
        console.log("result", result);
        return result;
    }


      export const identifyBirthChartPattern = (planets) => {
        console.log("identify birth chart pattern")
        let sortedPlanets = sortPlanetsByDegree(planets);

        const concentratedPatternName = getConcentratedPattern(sortedPlanets)
        const splayPatternDescription = isSplayPattern(sortedPlanets)
        const seesawPatternDescription = isSeesawPattern(sortedPlanets)
        const grandTrineDescription = isGrandTrine(sortedPlanets)
        const tSquareDescription = findGrandCrossOrTSquare(sortedPlanets)
        const stelliumBySignDescription = findStellium(sortedPlanets)
        const stelliumByDegreeDescription = findStelliumByDegrees(sortedPlanets)
        const yodPatternDescription = findYodPattern(sortedPlanets)
    
        const patterns = [concentratedPatternName, splayPatternDescription, 
            seesawPatternDescription, grandTrineDescription, tSquareDescription, stelliumBySignDescription,
            stelliumByDegreeDescription, yodPatternDescription]
        let responses = []
    
    
         
        for (let pattern of patterns) {
            if (pattern !== '') {
                responses.push(pattern)
                // responses = response.concat(pattern + ' '); // Concatenate non-empty patterns
            }
        }
    
        console.log("responses", responses)
        // console.log("response pattern description " + response)
        return responses.join("\n\n");
    
    }

    

function sortPlanetsByDegree(planets) {
    return planets
        .filter(planet => !ignorePlanets.includes(planet.name))
        .sort((a, b) => {
            // Get degree value, checking both possible field names
            const degreeA = a.full_degree !== undefined ? a.full_degree : a.fullDegree;
            const degreeB = b.full_degree !== undefined ? b.full_degree : b.fullDegree;
            
            // Add null check for debugging
            if (degreeA === undefined && degreeB === undefined) {
                console.error('Missing degree for planets:', 
                    { planetA: a.name, planetB: b.name, 
                      planetAFull: a, planetBFull: b });
                return 0;
            }
            
            return degreeA - degreeB;
        });
}


function getConcentratedPatternName(angle) {
    switch (angle) {
        case 120:
            return "Bundle";
        case 180:
            return "Bowl";
        case 240:
            return "Locomotive";
        default:
            return "";
    }
}

function getConcentratedPattern(planets) {
    console.log("getConcentratedPattern")

    function getName(index, angle) {
        let patternName = getConcentratedPatternName(angle);
        let lastIndex = index - 1 >=0 ? index - 1 : planets.length - 1
        // console.log(planets[index])
        // console.log(index + " index " + lastIndex + " lastIndex")
        return `${patternName} with all planets within a ${angle} between your ${planets[index].name} in ${planets[index].sign} ` +
        `in your ${formatHouseNum(planets[index].house)} house and your ${planets[lastIndex].name} in ${planets[lastIndex].sign} in your ${formatHouseNum(planets[lastIndex].house)} house`
    }

    const angles = [120, 180, 240];
    for (let angle of angles) {
        for (var i = 0; i < planets.length; i++ ){ //for (var i = 0; i < myArray.length; i++
            let startDegree = planets[i].full_degree;
            let endDegree = startDegree + angle;
            if (endDegree < 360) {
                // Check if all planets are within startDegree and endDegree
                if (planets.every(planet => planet.full_degree >= startDegree && planet.full_degree <= endDegree)) {
                    return getName(i, angle)
                }
            } else {
                // Adjust endDegree for circular comparison
                endDegree %= 360;
                // Check if each planet's degree is either greater than startDegree or less than endDegree
                if (planets.every(planet => planet.full_degree >= startDegree || planet.full_degree <= endDegree)) {
                    return getName(i, angle)
                }
            }
        }
    }
    return "";
}


function checkClusters(cluster1, cluster2, degree) {

    if (degreeDifference(cluster1[0].full_degree, cluster2[cluster2.length - 1].full_degree) <= degree) {
        return false
    } 
    if (degreeDifference(cluster1[cluster1.length - 1].full_degree, cluster2[0].full_degree) <= degree) {
        return false
    } 
    return true
}

function clusterIsContained(cluster) {
    if (cluster.length > 0) {
        return degreeDifference(cluster[0].full_degree, cluster[cluster.length - 1].full_degree) < 60
    } else {return false}
}

function isSplayPattern(sortedPlanets) {
    console.log("isSplayPattern")
    // Function to create a descriptive string of the clusters
    function createDescription(clusters) {
        return clusters.map((cluster, index) => {
            const planetDescriptions = cluster.map(planet => `${planet.name} in ${planet.sign} (house ${formatHouseNum(planet.house)})`).join(',');
            return `${index + 1}) ${planetDescriptions}`;
        }).join(' in one cluster \n ');
    }    

    for (let i = 0; i < sortedPlanets.length; i++) {
        for (let j = i + 1; j !== i; j = (j + 1) % sortedPlanets.length) {
            for (let k = j + 1; k !== i; k = (k + 1) % sortedPlanets.length) {
                if (j === k) continue;
                let cluster1 = sortedPlanets.slice(i, j);
                let cluster2 = sortedPlanets.slice(j, k);
                let cluster3 = sortedPlanets.slice(k, sortedPlanets.length).concat(sortedPlanets.slice(0, i));

                if (!clusterIsContained(cluster1) ||
                !clusterIsContained(cluster2) || 
                !clusterIsContained(cluster3)) {
                    continue;
                }

                if (cluster1.length > 2 && cluster2.length > 2 && cluster3.length > 2 && 
                    checkClusters(cluster1, cluster2, 30) && 
                    checkClusters(cluster2, cluster3, 30) && 
                    checkClusters(cluster3, cluster1, 30)) {
                    let clusters = [cluster1, cluster2, cluster3];
                    return `Splay pattern with ${clusters.length} clusters of planets: \n  ${createDescription(clusters)}`;
                }
            }
        }
    }

    return ''; // Return an empty string if no splay pattern is found
}

function isSeesawPattern(sortedPlanets) {
    console.log("isSeesawPattern")
    function createDescription(clusters) {
        return clusters.map((cluster, index) => {
            const planetDescriptions = cluster.map(planet => `${planet.name} in ${planet.sign} (house ${formatHouseNum(planet.house)})`).join(',');
            return `${index + 1}) ${planetDescriptions}`;
        }).join(' in one cluster \n \n ')
    }


    for (let i = 0; i < sortedPlanets.length - 1; i++) {
        for (let j = i + 1; j < sortedPlanets.length; j++) {
            let cluster1 = sortedPlanets.slice(i, j);
            let cluster2 = [...sortedPlanets.slice(j, sortedPlanets.length), ...sortedPlanets.slice(0, i)];


            if (cluster1.length > 3 && cluster2.length > 3 && checkClusters(cluster1, cluster2, 60)) {
                let clusters = [cluster1, cluster2]
                return `Seesaw pattern with two clusters: \n  ${createDescription(clusters)}`;
            }
        }
    }
    return ''; // Return an empty string if no seesaw pattern is found
}

function isGrandTrine(planets) {
    console.log("isGrandTrine")
    const degreeTolerance = 10; // Tolerance for deviation from exact 120 degrees
    const conjunctionTolerance = 10; // Tolerance for considering a planet is conjunct another


    function findConjunctions(mainPlanet, otherPlanets) {
        return otherPlanets.filter(planet => 
            planet !== mainPlanet &&
            degreeDifference(planet.full_degree, mainPlanet.full_degree) <= conjunctionTolerance
        );
    }

    function isTrine(degree1, degree2) {
        const diff = degreeDifference(degree1, degree2);
        return Math.abs(diff - 120) <= degreeTolerance;
    }

    function createVertexDescription(mainPlanet, conjunctions) {
        if (conjunctions.length === 0) {
            return `${mainPlanet.name} in ${mainPlanet.sign} in your ${formatHouseNum(mainPlanet.house)} house`;
        }
        const conjunctNames = conjunctions.map(p => p.name).join(' and ');
        return `${mainPlanet.name} and ${conjunctNames}`;
    }

    for (let i = 0; i < planets.length - 2; i++) {
        for (let j = i + 1; j < planets.length - 1; j++) {
            for (let k = j + 1; k < planets.length; k++) {
                if (isTrine(planets[i].full_degree, planets[j].full_degree) &&
                    isTrine(planets[j].full_degree, planets[k].full_degree) &&
                    isTrine(planets[k].full_degree, planets[i].full_degree)) {
                                            // Find conjunctions for each vertex planet
                    const conjunctsWithI = findConjunctions(planets[i], planets);
                    const conjunctsWithJ = findConjunctions(planets[j], planets);
                    const conjunctsWithK = findConjunctions(planets[k], planets);    

                    const vertexIDesc = createVertexDescription(planets[i], conjunctsWithI);
                    const vertexJDesc = createVertexDescription(planets[j], conjunctsWithJ);
                    const vertexKDesc = createVertexDescription(planets[k], conjunctsWithK);

                    return `Grand Trine formed between ${vertexIDesc} at one vertex, ${vertexJDesc} at another vertex, and ${vertexKDesc} at the third vertex.`;
                }
            }
        }
    }

    return ''; // No Grand Trine found
}

function findGrandCrossOrTSquare(planets) {
    console.log("findGrandCrossOrTSquare")
    const degreeTolerance = 8; // Tolerance for deviation from exact angles

    function isSquareOrOpposition(degree1, degree2) {
        const diff = degreeDifference(degree1, degree2);
        return Math.abs(diff - 90) <= degreeTolerance || Math.abs(diff - 180) <= degreeTolerance;
    }

    let descriptions = [];

    // Check for T-Square or Grand Cross
    for (let i = 0; i < planets.length - 1; i++) {
        for (let j = i + 1; j < planets.length; j++) {
            if (isSquareOrOpposition(planets[i].full_degree, planets[j].full_degree)) {
                for (let k = 0; k < planets.length; k++) {
                    if (k !== i && k !== j && isSquareOrOpposition(planets[i].full_degree, planets[k].full_degree) && 
                        isSquareOrOpposition(planets[j].full_degree, planets[k].full_degree)) {
                        descriptions.push(`T-Square formed by ${planets[i].name} in  ${planets[i].sign}, ${planets[j].name} in  ${planets[j].sign}, and ${planets[k].name} in  ${planets[k].sign}`);

                        // Check for a fourth planet to form a Grand Cross
                        for (let l = 0; l < planets.length; l++) {
                            if (l !== i && l !== j && l !== k && 
                                isSquareOrOpposition(planets[k].full_degree, planets[l].full_degree) &&
                                isSquareOrOpposition(planets[l].full_degree, planets[i].full_degree)) {
                                descriptions.push(`Grand Cross formed by ${planets[i].name} in  ${planets[i].sign}, ${planets[j].name} in ${planets[j].sign}, ${planets[k].name} in ${planets[k].sign}, and ${planets[l].name} in ${planets[l].sign}`);
                            }
                        }
                    }
                }
            }
        }
    }

    return descriptions.length > 0 ? descriptions.join('\n') : 'No Grand Cross or T-Square found';
}

function findStellium(planets) {
    console.log("findStellium")
    let signGroups = {};

    // Group planets by their sign
    planets.forEach(planet => {
        if (!signGroups[planet.sign]) {
            signGroups[planet.sign] = [];
        }
        signGroups[planet.sign].push(planet.name);
    });

    // Find and describe stelliums
    let stelliumDescriptions = [];
    for (const sign in signGroups) {
        if (signGroups[sign].length >= 3) {
            stelliumDescriptions.push(`Stellium in ${sign} with planets: ${signGroups[sign].join(', ')}`);
        }
    }

    return stelliumDescriptions.length > 0 ? stelliumDescriptions.join('\n') : 'No stellium found';
}


function findYodPattern(planets) {
    console.log("findYodPattern")
    const sextileTolerance = 6; // Tolerance for sextile
    const quincunxTolerance = 6; // Tolerance for quincunx
    const conjunctionTolerance = 8; // Tolerance for conjunction

    function withinAngleRange(degree1, degree2, targetAngle, tolerance) {
        const diff = degreeDifference(degree1, degree2);
        return Math.abs(diff - targetAngle) <= tolerance;
    }

    function findConjunctions(apexPlanet, otherPlanets) {
        return otherPlanets.filter(planet => 
            planet !== apexPlanet &&
            degreeDifference(planet.full_degree, apexPlanet.full_degree) <= conjunctionTolerance
        );
    }

    for (let i = 0; i < planets.length - 2; i++) {
        for (let j = i + 1; j < planets.length - 1; j++) {
            for (let k = 0; k < planets.length; k++) {
                if (k !== i && k !== j &&
                    withinAngleRange(planets[i].full_degree, planets[j].full_degree, 60, sextileTolerance) &&
                    withinAngleRange(planets[i].full_degree, planets[k].full_degree, 150, quincunxTolerance) &&
                    withinAngleRange(planets[j].full_degree, planets[k].full_degree, 150, quincunxTolerance)) {
                    // Find conjunctions with the apex planet
                    const apexPlanet = planets[k];
                    const conjunctPlanets = findConjunctions(apexPlanet, planets);
                    const conjunctionDescription = conjunctPlanets.length > 0 ? 
                        ` and ${conjunctPlanets.map(p => p.name).join(', ')} conjunct to it` : '';
                    return `Yod pattern with ${planets[i].name} and ${planets[j].name} sextile to each other, both quincunx to ${apexPlanet.name}${conjunctionDescription} at the apex.`;
                    
                }
            }
        }        
    }
    return ''; // No Yod pattern found
}

function findStelliumByDegrees(planets) {
    console.log("findStelliumByDegrees")
    const stelliumThreshold = 30; // Degree threshold for a stellium
    let stelliums = [];

    for (let i = 0; i < planets.length - 2; i++) {
        let stelliumCandidates = [planets[i]];

        for (let j = i + 1; j < planets.length; j++) {
            if (degreeDifference(planets[i].full_degree, planets[j].full_degree) <= stelliumThreshold) {
                stelliumCandidates.push(planets[j]);
            }
        }

        if (stelliumCandidates.length >= 3) {
            stelliums.push(stelliumCandidates.map(p => p.name));
        }
    }

    // Remove duplicate stelliums
    let uniqueStelliums = stelliums.filter((stellium, _, array) => 
    !array.some(other => 
        other.length > stellium.length && other.includes(...stellium)));

    return uniqueStelliums.length > 0 ? uniqueStelliums.map(s => `Stellium with planets: ${s}`).join('\n') : 'No stellium found';
}


function getDominanceDescriptionQuadrant(percent) {
    let category = "";
    if (percent > 40.0) {
      category = "extremely concentrated";
    } else if (percent >= 33.5 && percent <= 40.0) {
      category = "very concentrated";
    } else if (percent >= 27.0 && percent <= 33.5) {
      category = "quite concentrated";
    } else if (percent >= 18 && percent <= 27) {
      category = "normally concentrated";
    } else if (percent >= 10 && percent <= 18) {
      category = "sparsely populated";
    } else {
      category = "hardly populated";
    }
    return category;
  }

export function findPlanetsInQuadrant(planets) {
    console.log("findPlanetsInQuadrant")
    const planetsInQuadrants = {
      'SouthEast': [],
      'SouthWest': [],
      'NorthWest': [],
      'NorthEast': []
    };
  
    const quadrantPercentiles = {};
    planets.forEach(planetData => {
      if (ignorePlanets.includes(planetData.name)) {
        return;
      }
      for (const [quadrant, houses] of Object.entries(quadrants)) {
        if (planetData.house && houses.includes(planetData.house)) {
          planetsInQuadrants[quadrant].push(planetData.name);
        }
      }
    });
  
    const result = [];
    for (const [quad, list] of Object.entries(planetsInQuadrants)) {
      const num = list.length;
      const percentage = num / 10;
      quadrantPercentiles[quad] = percentage;
      const formattedValue = (percentage * 100).toFixed(1);
      const category = getDominanceDescriptionQuadrant(percentage * 100);
      result.push(`${quad} is ${category} with a Percentage: ${formattedValue}% of planets: ${list}`);
    }
  
    const easternHemisphere = quadrantPercentiles['SouthEast'] + quadrantPercentiles['NorthEast'];
    const northernHemisphere = quadrantPercentiles['NorthWest'] + quadrantPercentiles['NorthEast'];
  
    if (easternHemisphere > 0.80) {
      result.push("Vast majority of planets are in the Eastern hemisphere");
    }
    if (easternHemisphere < 0.20) {
      result.push("Vast majority of planets are in the Western hemisphere");
    }
    if (northernHemisphere > 0.80) {
      result.push("Vast majority of planets are in the Northern hemisphere");
    }
    if (northernHemisphere < 0.20) {
      result.push("Vast majority of planets are in the Southern hemisphere");
    }
  
    console.log(result)
    return result.join("\n");
  }

export function findPlanetsInQuadrantObjects(planets) {
    console.log("findPlanetsInQuadrant");
    const planetsInQuadrants = {
        'SouthEast': [],
        'SouthWest': [],
        'NorthWest': [],
        'NorthEast': []
    };
    
    // Calculate planets in each quadrant
    planets.forEach(planetData => {
        if (ignorePlanets.includes(planetData.name)) {
            return;
        }
        for (const [quadrant, houses] of Object.entries(quadrants)) {
            if (planetData.house && houses.includes(planetData.house)) {
                planetsInQuadrants[quadrant].push(planetData.name);
            }
        }
    });
    
    // Calculate percentages for each quadrant
    const totalPlanets = 10; // Assuming 10 planets total
    const quadrantData = Object.entries(planetsInQuadrants).map(([quadrant, planetList]) => {
        const percentage = parseFloat(((planetList.length / totalPlanets) * 100).toFixed(1));
        return {
            name: quadrant,
            planets: planetList,
            count: planetList.length,
            percentage: percentage,
            dominance: getDominanceDescriptionQuadrant(percentage)
        };
    });
    
    // Calculate hemisphere distributions
    const easternHemisphere = (planetsInQuadrants['SouthEast'].length + 
        planetsInQuadrants['NorthEast'].length) / totalPlanets;
    const northernHemisphere = (planetsInQuadrants['NorthWest'].length + 
        planetsInQuadrants['NorthEast'].length) / totalPlanets;
    
    // Create hemisphere analysis
    const hemispheres = {
        eastern: {
            percentage: parseFloat((easternHemisphere * 100).toFixed(1)),
            dominance: easternHemisphere > 0.8 ? 'vast majority' :
                      easternHemisphere < 0.2 ? 'minimal presence' : 'balanced'
        },
        western: {
            percentage: parseFloat(((1 - easternHemisphere) * 100).toFixed(1)),
            dominance: easternHemisphere < 0.2 ? 'vast majority' :
                      easternHemisphere > 0.8 ? 'minimal presence' : 'balanced'
        },
        northern: {
            percentage: parseFloat((northernHemisphere * 100).toFixed(1)),
            dominance: northernHemisphere > 0.8 ? 'vast majority' :
                      northernHemisphere < 0.2 ? 'minimal presence' : 'balanced'
        },
        southern: {
            percentage: parseFloat(((1 - northernHemisphere) * 100).toFixed(1)),
            dominance: northernHemisphere < 0.2 ? 'vast majority' :
                      northernHemisphere > 0.8 ? 'minimal presence' : 'balanced'
        }
    };
    
    return {
        quadrants: quadrantData,
        hemispheres: hemispheres
    };
}