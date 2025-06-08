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


export const findBirthChartPatterns = (planets) => {
    console.log("identify birth chart pattern")
    let sortedPlanets = sortPlanetsByDegree(planets);

    // Marc Edmund Jones pattern classification
    const chartShapePattern = classifyChartShape(sortedPlanets);

    // Aspect patterns
    const grandTrinePatterns = findGrandTrines(sortedPlanets);
    const tSquarePatterns = findTSquares(sortedPlanets);
    const grandCrossPatterns = findGrandCross(sortedPlanets);
    const kitePatterns = findKitePattern(sortedPlanets);
    const mysticRectanglePatterns = findMysticRectangle(sortedPlanets);
    const yodPatterns = findYodPatterns(sortedPlanets);

    // Stellium patterns
    const stelliumPatterns = findStelliums(sortedPlanets);

    const patterns = [
        chartShapePattern,
        ...stelliumPatterns,
        ...grandTrinePatterns,
        ...tSquarePatterns,
        ...grandCrossPatterns,
        ...kitePatterns,
        ...mysticRectanglePatterns,
        ...yodPatterns
    ].filter(p => p && p.length > 0);

    console.log("responses", patterns)
    return patterns.join("\n\n");
}

// Object-based version for consistency with other functions
export const findBirthChartPatternsObject = (planets) => {
    console.log("identify birth chart pattern - object version")
    let sortedPlanets = sortPlanetsByDegree(planets);

    // Marc Edmund Jones pattern classification
    const chartShapePattern = classifyChartShape(sortedPlanets);

    // Collect all patterns in structured format
    const result = {
        patterns: {
            chartShape: chartShapePattern || null,
            stelliums: findStelliums(sortedPlanets),
            grandTrines: findGrandTrines(sortedPlanets),
            tSquares: findTSquares(sortedPlanets),
            grandCrosses: findGrandCross(sortedPlanets),
            kites: findKitePattern(sortedPlanets),
            mysticRectangles: findMysticRectangle(sortedPlanets),
            yods: findYodPatterns(sortedPlanets)
        }
    };

    console.log("result", result);
    return result;
}

    

// Core planets for chart shape analysis
const CORE_PLANETS = new Set([
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
]);

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

// Helper to get normalized degrees
function toDegrees(planets) {
    return planets.map(p => {
        const deg = p.full_degree !== undefined ? p.full_degree : p.fullDegree;
        return (deg % 360 + 360) % 360; // Normalize to 0-359.999
    });
}

// Calculate angular gaps between consecutive planets
function angularGaps(sortedPlanets) {
    if (sortedPlanets.length === 0) return [];
    
    const degrees = toDegrees(sortedPlanets);
    const n = degrees.length;
    const gaps = [];
    
    for (let i = 0; i < n; i++) {
        const from = degrees[i];
        const to = degrees[(i + 1) % n];
        const gap = (to - from + 360) % 360;
        gaps.push({ 
            gap, 
            from, 
            to,
            fromPlanet: sortedPlanets[i],
            toPlanet: sortedPlanets[(i + 1) % n]
        });
    }
    
    return gaps.sort((g1, g2) => g2.gap - g1.gap); // Largest gap first
}

// Calculate the span occupied by all planets
function spanOccupied(sortedPlanets) {
    if (sortedPlanets.length === 0) return 0;
    
    const gaps = angularGaps(sortedPlanets);
    if (gaps.length === 0) return 0;
    
    const maxGap = gaps[0].gap;
    return 360 - maxGap;
}

// Count distinct clusters based on separation threshold
function clusterCount(sortedPlanets, threshold = 30) {
    const degrees = toDegrees(sortedPlanets);
    let count = 1;
    
    for (let i = 1; i < degrees.length; i++) {
        const gap = (degrees[i] - degrees[i-1] + 360) % 360;
        if (gap > threshold) count++;
    }
    
    // Check wrap-around gap
    const wrapGap = (degrees[0] + 360 - degrees[degrees.length - 1]) % 360;
    if (wrapGap > threshold) count++;
    
    return count;
}


// Helper to format planet with sign and house
function formatPlanet(planet) {
    const house = planet.house && planet.house !== 0 ? `house ${formatHouseNum(planet.house)}` : '';
    return house ? `${planet.name} (${planet.sign}, ${house})` : `${planet.name} (${planet.sign})`;
}

// Marc Edmund Jones Chart Shape Classification
function classifyChartShape(planets) {
    // Filter to core planets only for shape analysis
    const corePlanets = planets.filter(p => CORE_PLANETS.has(p.name));
    console.log(`classifyChartShape: Found ${corePlanets.length} core planets`);
    if (corePlanets.length < 7) return ''; // Need enough planets for meaningful pattern
    
    const gaps = angularGaps(corePlanets);
    const maxGap = gaps[0]?.gap || 0;
    const span = spanOccupied(corePlanets);
    const clusters = clusterCount(corePlanets, 30);
    
    console.log(`Chart shape analysis:
        - Core planets: ${corePlanets.length}
        - Max gap: ${maxGap}°
        - Span occupied: ${span}°
        - Number of clusters: ${clusters}
        - All gaps: ${gaps.map(g => `${Math.round(g.gap)}°`).join(', ')}
        - Planet positions: ${corePlanets.map(p => `${p.name}:${Math.round(p.full_degree || p.fullDegree)}°`).join(', ')}`);
    
    // Bundle - all planets within 120° (some use 130°)
    if (span <= 130) {
        const leadPlanet = gaps[0].toPlanet;
        const tailPlanet = gaps[0].fromPlanet;
        console.log(`Bundle pattern detected: span=${span}`);
        return `Bundle pattern - all planets concentrated within ${Math.round(span)}° from ${formatPlanet(leadPlanet)} to ${formatPlanet(tailPlanet)}`;
    }
    
    // Bowl - all planets within exactly one half of chart
    // Adjusted thresholds: span can be up to 185° and maxGap should be at least 160°
    if (span <= 185 && maxGap >= 160) {
        const leadPlanet = gaps[0].toPlanet;
        const tailPlanet = gaps[0].fromPlanet;
        console.log(`Bowl pattern detected: span=${span}, maxGap=${maxGap}`);
        return `Bowl pattern - all planets within one hemisphere (${Math.round(span)}°) from ${formatPlanet(leadPlanet)} to ${formatPlanet(tailPlanet)}`;
    }
    
    // Bucket - bowl with a single handle planet opposite
    if (span <= 200 && maxGap >= 140) {
        // Check for singleton planet in the gap
        const gapStart = gaps[0].from;
        const gapEnd = gaps[0].to;
        
        const singletons = corePlanets.filter(p => {
            const deg = toDegrees([p])[0];
            // Handle wrap-around case
            if (gapStart > gapEnd) {
                return deg > gapStart || deg < gapEnd;
            } else {
                return deg > gapStart && deg < gapEnd;
            }
        });
        
        console.log(`Bucket check: found ${singletons.length} singletons in gap`);
        if (singletons.length === 1) {
            return `Bucket pattern - ${formatPlanet(singletons[0])} forms the handle opposite the bowl`;
        }
    }
    
    // Locomotive - planets occupy ~240° with ~120° empty
    if (span >= 220 && span <= 250 && maxGap >= 110) {
        const innerGaps = gaps.slice(1).filter(g => g.gap < maxGap);
        const largestInner = innerGaps.length > 0 ? Math.max(...innerGaps.map(g => g.gap)) : 0;
        
        console.log(`Locomotive check: largestInner=${largestInner}`);
        if (largestInner <= 90) {
            const leadPlanet = gaps[0].toPlanet;
            return `Locomotive pattern - planets occupy ${Math.round(span)}° with ${formatPlanet(leadPlanet)} leading`;
        }
    }
    
    // Seesaw - two groups with significant gaps
    if (clusters === 2 && maxGap >= 60 && gaps.length > 1 && gaps[1].gap >= 60) {
        return `Seesaw pattern - planets form two opposing groups`;
    }
    
    // Splash - widely dispersed, no gap > 60-70°
    if (maxGap < 70 && clusters >= 8) {
        return `Splash pattern - planets evenly distributed around the chart`;
    }
    
    // Splay (Tripod) - 3 distinct clusters
    if (clusters === 3 && maxGap >= 90 && maxGap <= 150) {
        // Verify we have 3 significant gaps
        const significantGaps = gaps.filter(g => g.gap > 40).length;
        if (significantGaps >= 3) {
            return `Splay pattern - planets form three distinct groups`;
        }
    }
    
    // Fallback patterns with relaxed criteria
    
    // Relaxed Bowl - planets occupy less than 240° (2/3 of chart)
    if (span <= 240 && maxGap >= 120) {
        console.log(`Relaxed Bowl pattern detected: span=${span}, maxGap=${maxGap}`);
        return `Bowl-like pattern - planets concentrated in ${Math.round(span)}° with ${Math.round(maxGap)}° empty space`;
    }
    
    // Relaxed Bundle - planets within 150°
    if (span <= 150) {
        console.log(`Relaxed Bundle pattern detected: span=${span}`);
        return `Bundle-like pattern - planets concentrated within ${Math.round(span)}°`;
    }
    
    // Wide distribution
    if (maxGap < 90) {
        console.log(`Wide distribution detected: maxGap=${maxGap}`);
        return `Wide distribution - planets evenly spread (largest gap: ${Math.round(maxGap)}°)`;
    }
    
    console.log('No clear pattern detected');
    return '';
}


// Improved stellium detection
function findStelliums(planets) {
    const stelliums = [];
    
    // 1. Find stelliums by sign
    const signGroups = {};
    planets.forEach(planet => {
        if (!signGroups[planet.sign]) {
            signGroups[planet.sign] = [];
        }
        signGroups[planet.sign].push(planet);
    });
    
    for (const [sign, planetsInSign] of Object.entries(signGroups)) {
        if (planetsInSign.length >= 3) {
            const planetNames = planetsInSign.map(p => p.name).join(', ');
            stelliums.push(`Stellium in ${sign}: ${planetNames}`);
        }
    }
    
    // 2. Find stelliums by degree clustering (within orb)
    const stelliumOrb = 10; // degrees
    const usedPlanets = new Set();
    
    for (let i = 0; i < planets.length; i++) {
        if (usedPlanets.has(i)) continue;
        
        const cluster = [planets[i]];
        const clusterIndices = [i];
        
        // Find all planets within stellium orb
        for (let j = 0; j < planets.length; j++) {
            if (i === j || usedPlanets.has(j)) continue;
            
            // Check if planet j is within orb of any planet in current cluster
            let withinOrb = false;
            for (const clusterPlanet of cluster) {
                if (degreeDifference(planets[j].full_degree || planets[j].fullDegree, 
                                   clusterPlanet.full_degree || clusterPlanet.fullDegree) <= stelliumOrb) {
                    withinOrb = true;
                    break;
                }
            }
            
            if (withinOrb) {
                cluster.push(planets[j]);
                clusterIndices.push(j);
            }
        }
        
        // If we found 3+ planets in tight orb
        if (cluster.length >= 3) {
            clusterIndices.forEach(idx => usedPlanets.add(idx));
            const planetInfo = cluster.map(p => `${p.name} (${Math.round(p.full_degree || p.fullDegree)}°)`).join(', ');
            stelliums.push(`Stellium by degree: ${planetInfo}`);
        }
    }
    
    return stelliums;
}

// Helper function to check if two planets are in aspect
function isAspect(planet1, planet2, aspectAngle, orb) {
    const deg1 = planet1.full_degree || planet1.fullDegree;
    const deg2 = planet2.full_degree || planet2.fullDegree;
    const diff = degreeDifference(deg1, deg2);
    return Math.abs(diff - aspectAngle) <= orb;
}

// Find Grand Trines
function findGrandTrines(planets) {
    const trineOrb = 8; // degrees
    const grandTrines = [];
    
    for (let i = 0; i < planets.length - 2; i++) {
        for (let j = i + 1; j < planets.length - 1; j++) {
            for (let k = j + 1; k < planets.length; k++) {
                if (isAspect(planets[i], planets[j], 120, trineOrb) &&
                    isAspect(planets[j], planets[k], 120, trineOrb) &&
                    isAspect(planets[k], planets[i], 120, trineOrb)) {
                    
                    const elements = [planets[i], planets[j], planets[k]]
                        .map(p => formatPlanet(p))
                        .join(', ');
                    grandTrines.push(`Grand Trine: ${elements}`);
                }
            }
        }
    }
    
    return grandTrines;
}

// Find T-Squares
function findTSquares(planets) {
    const squareOrb = 8; // degrees
    const oppositionOrb = 10; // degrees
    const tSquares = [];
    const usedPlanets = new Set();
    
    for (let i = 0; i < planets.length - 2; i++) {
        for (let j = i + 1; j < planets.length - 1; j++) {
            if (isAspect(planets[i], planets[j], 180, oppositionOrb)) {
                // Found opposition, look for planet square to both
                for (let k = 0; k < planets.length; k++) {
                    if (k !== i && k !== j &&
                        isAspect(planets[i], planets[k], 90, squareOrb) &&
                        isAspect(planets[j], planets[k], 90, squareOrb)) {
                        
                        const key = [i, j, k].sort().join('-');
                        if (!usedPlanets.has(key)) {
                            usedPlanets.add(key);
                            const elements = `${formatPlanet(planets[i])} opposite ${formatPlanet(planets[j])}, both square ${formatPlanet(planets[k])}`;
                            tSquares.push(`T-Square: ${elements}`);
                        }
                    }
                }
            }
        }
    }
    
    return tSquares;
}

// Find Grand Cross
function findGrandCross(planets) {
    const squareOrb = 8; // degrees
    const oppositionOrb = 10; // degrees
    const grandCrosses = [];
    const usedPlanets = new Set();
    
    for (let i = 0; i < planets.length - 3; i++) {
        for (let j = i + 1; j < planets.length - 2; j++) {
            for (let k = j + 1; k < planets.length - 1; k++) {
                for (let l = k + 1; l < planets.length; l++) {
                    // Check if we have two oppositions and four squares
                    if ((isAspect(planets[i], planets[k], 180, oppositionOrb) &&
                         isAspect(planets[j], planets[l], 180, oppositionOrb)) ||
                        (isAspect(planets[i], planets[l], 180, oppositionOrb) &&
                         isAspect(planets[j], planets[k], 180, oppositionOrb))) {
                        
                        // Check all squares
                        const indices = [i, j, k, l];
                        let squareCount = 0;
                        for (let a = 0; a < 4; a++) {
                            for (let b = a + 1; b < 4; b++) {
                                if (isAspect(planets[indices[a]], planets[indices[b]], 90, squareOrb)) {
                                    squareCount++;
                                }
                            }
                        }
                        
                        if (squareCount >= 4) {
                            const key = indices.sort().join('-');
                            if (!usedPlanets.has(key)) {
                                usedPlanets.add(key);
                                const elements = indices.map(idx => formatPlanet(planets[idx])).join(', ');
                                grandCrosses.push(`Grand Cross: ${elements}`);
                            }
                        }
                    }
                }
            }
        }
    }
    
    return grandCrosses;
}

// Find Kite patterns (Grand Trine with one planet opposite to one corner)
function findKitePattern(planets) {
    const trineOrb = 8;
    const oppositionOrb = 10;
    const sextileOrb = 6;
    const kites = [];
    
    // First find grand trines
    for (let i = 0; i < planets.length - 2; i++) {
        for (let j = i + 1; j < planets.length - 1; j++) {
            for (let k = j + 1; k < planets.length; k++) {
                if (isAspect(planets[i], planets[j], 120, trineOrb) &&
                    isAspect(planets[j], planets[k], 120, trineOrb) &&
                    isAspect(planets[k], planets[i], 120, trineOrb)) {
                    
                    // Found grand trine, look for kite apex
                    for (let l = 0; l < planets.length; l++) {
                        if (l !== i && l !== j && l !== k) {
                            // Check if planet l is opposite one corner and sextile the other two
                            if ((isAspect(planets[l], planets[i], 180, oppositionOrb) &&
                                 isAspect(planets[l], planets[j], 60, sextileOrb) &&
                                 isAspect(planets[l], planets[k], 60, sextileOrb)) ||
                                (isAspect(planets[l], planets[j], 180, oppositionOrb) &&
                                 isAspect(planets[l], planets[i], 60, sextileOrb) &&
                                 isAspect(planets[l], planets[k], 60, sextileOrb)) ||
                                (isAspect(planets[l], planets[k], 180, oppositionOrb) &&
                                 isAspect(planets[l], planets[i], 60, sextileOrb) &&
                                 isAspect(planets[l], planets[j], 60, sextileOrb))) {
                                
                                const trineElements = [planets[i], planets[j], planets[k]]
                                    .map(p => formatPlanet(p)).join(', ');
                                kites.push(`Kite: Grand Trine (${trineElements}) with ${formatPlanet(planets[l])} as apex`);
                            }
                        }
                    }
                }
            }
        }
    }
    
    return kites;
}

// Find Mystic Rectangle (two oppositions connected by sextiles and trines)
function findMysticRectangle(planets) {
    const oppositionOrb = 10;
    const trineOrb = 8;
    const sextileOrb = 6;
    const rectangles = [];
    const usedPlanets = new Set();
    
    for (let i = 0; i < planets.length - 3; i++) {
        for (let j = i + 1; j < planets.length - 2; j++) {
            for (let k = j + 1; k < planets.length - 1; k++) {
                for (let l = k + 1; l < planets.length; l++) {
                    // Check for two oppositions
                    if ((isAspect(planets[i], planets[k], 180, oppositionOrb) &&
                         isAspect(planets[j], planets[l], 180, oppositionOrb)) ||
                        (isAspect(planets[i], planets[l], 180, oppositionOrb) &&
                         isAspect(planets[j], planets[k], 180, oppositionOrb))) {
                        
                        // Check for sextiles and trines connecting them
                        const indices = [i, j, k, l];
                        let sextileCount = 0;
                        let trineCount = 0;
                        
                        for (let a = 0; a < 4; a++) {
                            for (let b = a + 1; b < 4; b++) {
                                if (isAspect(planets[indices[a]], planets[indices[b]], 60, sextileOrb)) {
                                    sextileCount++;
                                } else if (isAspect(planets[indices[a]], planets[indices[b]], 120, trineOrb)) {
                                    trineCount++;
                                }
                            }
                        }
                        
                        if (sextileCount >= 2 && trineCount >= 2) {
                            const key = indices.sort().join('-');
                            if (!usedPlanets.has(key)) {
                                usedPlanets.add(key);
                                const elements = indices.map(idx => formatPlanet(planets[idx])).join(', ');
                                rectangles.push(`Mystic Rectangle: ${elements}`);
                            }
                        }
                    }
                }
            }
        }
    }
    
    return rectangles;
}

// Find Yod patterns (Finger of God)
function findYodPatterns(planets) {
    const sextileOrb = 6;
    const quincunxOrb = 6;
    const yods = [];
    const usedPlanets = new Set();
    
    for (let i = 0; i < planets.length - 2; i++) {
        for (let j = i + 1; j < planets.length - 1; j++) {
            if (isAspect(planets[i], planets[j], 60, sextileOrb)) {
                // Found sextile base, look for apex planet
                for (let k = 0; k < planets.length; k++) {
                    if (k !== i && k !== j &&
                        isAspect(planets[i], planets[k], 150, quincunxOrb) &&
                        isAspect(planets[j], planets[k], 150, quincunxOrb)) {
                        
                        const key = [i, j, k].sort().join('-');
                        if (!usedPlanets.has(key)) {
                            usedPlanets.add(key);
                            yods.push(`Yod: ${formatPlanet(planets[i])} sextile ${formatPlanet(planets[j])}, both quincunx ${formatPlanet(planets[k])} (apex)`);
                        }
                    }
                }
            }
        }
    }
    
    return yods;
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