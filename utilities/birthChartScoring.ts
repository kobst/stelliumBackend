// @ts-nocheck
import { 
    elements, 
    elementPoints,
    orbCodes,
    planetCodes,
    signCodes, 
    relevantPromptAspects, 
    relevantPromptAspectsV2,
    rulers, 
    transitCodes,
    BroadTopicsEnum,
    retroCodes,
    quadrants, 
    ignorePlanets, 
    ignorePoints } from "./constants.js";

import { getSign } from "../services/ephemerisDataService.js";

function formatHouseNum(h) {
  return h && h > 0 ? h : 'unknown';
}
 
  
  export const orbDescription = (orb) => {
      console.log("orbDescription")
      if (orb < 1) {
        return "exact";
      } else if (orb >= 1 && orb < 3) {
        return "close";
      } else if (orb >= 7 && orb < 10) {
        return "loose";
      } else {
        return "";
      }
    }
    
    
    function findAspectsWithinOrb(planetName, birthData, orbAllowed = 5, k = null) {
        const ignorePoints = ["Chiron", "Part of Fortune"]
      let aspectList = [];
      console.log("findAspectsWithinOrb for planet: ", planetName)
      const aspectsSorted = birthData.aspects
        .filter(aspect => 
            (aspect.aspectingPlanet.toLowerCase() === planetName.toLowerCase() || 
            aspect.aspectedPlanet.toLowerCase() === planetName.toLowerCase()) &&
            aspect.orb < orbAllowed &&
            !ignorePoints.includes(aspect.aspectingPlanet) &&
            !ignorePoints.includes(aspect.aspectedPlanet)
        )
        .sort((a, b) => a.orb - b.orb)
        .slice(0, k || undefined);  // Only slice if k is provided
      
      console.log("aspectsSorted: ", aspectsSorted.length)
      aspectsSorted.forEach(aspect => {
          const aspectPhrase = addAspectDescription(aspect, birthData);
          aspectList.push(aspectPhrase);
      });
    //   console.log("aspectList: ", aspectList)
      return aspectList;
    }
  
  function findAspects(planetName, birthData, closeOnly = false) {
    const ignorePoints = ["Chiron", "Part of Fortune"];
    let aspectList = [];
    console.log("findAspects");
    
    // Fix the filter and sort chain syntax
    let aspectsSorted = birthData.aspects
        .filter(aspect => 
            (aspect.aspectingPlanet === planetName || 
            aspect.aspectedPlanet === planetName) &&
            !ignorePoints.includes(aspect.aspectingPlanet) && 
            !ignorePoints.includes(aspect.aspectedPlanet)
        )
        .sort((a, b) => a.orb - b.orb);

    // Apply close aspects filter if requested
    if (closeOnly) {
        aspectsSorted = aspectsSorted.filter(aspect => aspect.orb < 3);
    }

    console.log("aspectsSorted: ", aspectsSorted.length);
    
    // Simplified forEach since filtering is already done
    aspectsSorted.forEach(aspect => {
        const aspectPhrase = addAspectDescription(aspect, birthData, planetName);
        aspectList.push(aspectPhrase);
    });

    return aspectList;
  }
  
    // function addAspectDescription(aspect, birthData) {
    // //   console.log("addAspectDescription:", JSON.stringify(aspect))
    //   const aspectType = aspect.aspectType.toLowerCase();
    //   const planetName1 = aspect.aspectingPlanet
    //   const planetName2 = aspect.aspectedPlanet
    // //   console.log("planetName1: ", planetName1)
    // //   console.log("planetName2: ", planetName2)
    //   const orbDesc = orbDescription(aspect.orb); // Assuming orbDescription is defined elsewhere
    //   const sign1 = getSign(aspect.aspectingPlanetDegree)
    //   const sign2 = getSign(aspect.aspectedPlanetDegree)
    // //   console.log("sign1: ", sign1)
    // //   console.log("sign2: ", sign2)
    //   const house1 = (getHouse(birthData.planets, planetName1) || 0).toString().padStart(2, '0')
    //   const house2 = (getHouse(birthData.planets, planetName2) || 0).toString().padStart(2, '0')
    // //   console.log("house1: ", house1)
    // //   console.log("house2: ", house2)
    //   const code = "A-" + planetCodes[planetName1] + signCodes[sign1] + house1 + orbCodes[orbDesc] + transitCodes[aspectType] + planetCodes[planetName2] + signCodes[sign2] + house2
      
    //   // If no houses available (birth time unknown), omit house references
    //   if (house1 === '00' || house2 === '00') {
    //       // return `${planetName1} in ${sign1} is ${orbDesc} ${aspectType} to ${planetName2} in ${sign2} (${code})`
    //       return `...is ${orbDesc} ${aspectType} to ${planetName2} in ${sign2} (${code})`

    //   }
    //   return `...is ${orbDesc} ${aspectType} to ${planetName2} in ${sign2} and the ${house2} house (${code})`

    //   // return `${planetName1} in ${sign1} and the ${house1} house is ${orbDesc} ${aspectType} to ${planetName2} in ${sign2} and the ${house2} house (${code})`
    // }
    


  function addAspectDescription(aspect, birthData, planetName) {
    //   console.log("addAspectDescription:", JSON.stringify(aspect))
      const aspectType = aspect.aspectType.toLowerCase();
      const planetName1 = aspect.aspectingPlanet
      const planetName2 = aspect.aspectedPlanet
      const orbDesc = orbDescription(aspect.orb); // Assuming orbDescription is defined elsewhere
      const sign1 = getSign(aspect.aspectingPlanetDegree)
      const sign2 = getSign(aspect.aspectedPlanetDegree)
      const house1 = (getHouse(birthData.planets, planetName1) || 0).toString().padStart(2, '0')
      const house2 = (getHouse(birthData.planets, planetName2) || 0).toString().padStart(2, '0')
  

    if (planetName === planetName1) {
      const code = "A-" + planetCodes[planetName1] + signCodes[sign1] + house1 + orbCodes[orbDesc] + transitCodes[aspectType] + planetCodes[planetName2] + signCodes[sign2] + house2
      // If no houses available (birth time unknown), omit house references
      if (house1 === '00' || house2 === '00') {
          // return `${planetName1} in ${sign1} is ${orbDesc} ${aspectType} to ${planetName2} in ${sign2} (${code})`
          return `...is ${orbDesc} ${aspectType} to ${planetName2} in ${sign2} (${code})`

      }
      return `...is ${orbDesc} ${aspectType} to ${planetName2} in ${sign2} and the ${house2} house (${code})`
    } else {
      const code = "A-" + planetCodes[planetName2] + signCodes[sign2] + house2 + orbCodes[orbDesc] + transitCodes[aspectType] + planetCodes[planetName1] + signCodes[sign1] + house1
      if (house1 === '00' || house2 === '00') {
        return `...is ${orbDesc} ${aspectType} to ${planetName1} in ${sign1} (${code})`
      }
      return `...is ${orbDesc} ${aspectType} to ${planetName1} in ${sign1} and the ${house1} house (${code})`
    }
      // return `${planetName1} in ${sign1} and the ${house1} house is ${orbDesc} ${aspectType} to ${planetName2} in ${sign2} and the ${house2} house (${code})`
    }
  


function getHouse(birthChartPlanets, planetName) {
    console.log("getHouse")
    // console.log("birthChartPlanets: ", birthChartPlanets)
    console.log("planetName: ", planetName)
    const house = birthChartPlanets.find(planet => planet.name === planetName)?.house;
    console.log("house: ", house)
    return house;
}

  
export const generateNatalPromptsShortOverview = (birthData) => {
    // const chartRulerPlanet = getRulerPlanet(birthData)
    const planets = ["Sun", "Moon", "Ascendant"]
    let responses = []
    planets.forEach(planet => {
        const planetData = birthData.planets.find(p => p.name.toLowerCase() === planet.toLowerCase());
        if (!planetData) {
            // Skip if planet not found (e.g., Ascendant for users without birth time)
            return;
        }
        let code
        const houseCode = (planetData.house || 0).toString().padStart(2, '0'); // Default to 0 if no house
        code = planetCodes[planet] + signCodes[planetData.sign] + houseCode
        console.log("code: ", code)
        // if (planet === chartRulerPlanet) {
        //   code = "Rr-" + code
        //   const ascendant = birthData.planets.find(p => p.name === "Ascendant" || p.name === "ascendant")
        //   responses.push(`${planet} is the ruler of the rising sign ${ascendant.sign} of the chart (${code})`);
        // }
  
        if (planetData.is_retro === "true") {
          code = "Pr-" + code
          responses.push(`${planet} is retrograde in ${planetData.sign} in the ${formatHouseNum(planetData.house)} house (${code})`);
        } else {
          code = "Pp-" + code
          responses.push(`${planet} in ${planetData.sign} in the ${formatHouseNum(planetData.house)} house (${code})`);
        }
  
        responses = responses.concat(findAspectsWithinOrb(planet, birthData, 2));
      });
      // co
    return responses.join("\n")
}


export const getRulerPlanet = (birthData) => {
    const ascendant = birthData.planets?.find(p => p.name === "Ascendant" || p.name === "ascendant")
    if (!ascendant) return undefined;
    return rulers[ascendant.sign]
  }


export const getDescendantRuler = (birthData) => {
    const fourthHouse = birthData.houses?.find(h => h.house === 4)
    if (!fourthHouse) return undefined
    const fourthHouseRuler = rulers[fourthHouse.sign]
    return fourthHouseRuler
  }

  const getHouseRuler = (birthData, house) => {
    const houseData = birthData.houses?.find(h => h.house === house)
    if (!houseData) return undefined
    return rulers[houseData.sign]
  }


export const generateTopicMapping = (birthData) => {
    console.log("generateTopicMapping")
    const hasHouses = birthData.houses && birthData.houses.length > 0
    const chartRulerPlanet = hasHouses ? getHouseRuler(birthData, 1) : undefined
    const descendantRuler = hasHouses ? getHouseRuler(birthData, 7) : undefined
    const fourthHouseRuler = hasHouses ? getHouseRuler(birthData, 4) : undefined
  
    const rulerMapping = {
      "ChartRuler": chartRulerPlanet,
      "DescendantRuler": descendantRuler,
      "ICRuler": fourthHouseRuler
    };
    
    let relevantMappings = {}
    for (const topicKey of Object.keys(BroadTopicsEnum)) {
        const topicLabel = BroadTopicsEnum[topicKey].label;
        const natalPositions = generateRelevantNatalPositions(topicLabel, birthData, rulerMapping);
        // console.log("natalPositions for topic ", topicLabel)
        // console.log("natalPositions: ", natalPositions)
        relevantMappings[topicLabel] = natalPositions;
      }

    return relevantMappings;    
}

export const generateRelevantNatalPositions = (promptKey, birthData, rulerMapping) => {
    console.log("generateRelevantNatalPositions");
    if (!birthData.houses || birthData.houses.length === 0) {
        return "";
    }
    const prompt = relevantPromptAspectsV2[promptKey];
    let responses = [];
    let usedCodes = new Set();  // Track used codes
    const hasHouses = birthData.houses && birthData.houses.length > 0;
    
    let planets = prompt.planets.map(planet => {
        // Find the matching key regardless of case
        const matchingKey = Object.keys(rulerMapping).find(
            key => key.toLowerCase() === planet.toLowerCase()
        );
        return matchingKey ? rulerMapping[matchingKey] : planet;
    });


    // Helper function to add response if code is unique
    const addUniqueResponse = (code, description) => {
        if (!usedCodes.has(code)) {
            usedCodes.add(code);
            responses.push(`${description} (${code})`);
            return true;
        }
        return false;
    };

    planets.forEach(planet => {
        console.log("planet: ", planet)
        const planetData = birthData.planets.find(p => p.name === planet);
        console.log("planetData: ", planetData)
        const houseCode = hasHouses && planetData.house !== undefined ? planetData.house.toString().padStart(2, '0') : '';
        let code = planetCodes[planet] + signCodes[planetData.sign] + (hasHouses ? houseCode : '');


        if (planetData.is_retro === "true") {
            code = "Pr-" + code;
            addUniqueResponse(code, `${planet} is retrograde in ${planetData.sign} in the ${formatHouseNum(planetData.house)} house`);
        } else {
            code = "Pp-" + code;
            addUniqueResponse(code, `${planet} in ${planetData.sign} in the ${formatHouseNum(planetData.house)} house`);

        }

        // Get aspects and filter out any that have already been used
        const aspects = findAspects(planet, birthData, false);
        aspects.forEach(aspect => {
            const aspectCode = aspect.match(/\(([^)]+)\)/)[1];  // Extract code from aspect string
            if (!usedCodes.has(aspectCode)) {
                usedCodes.add(aspectCode);
                responses.push(aspect);
            }
        });
    });

    // Process houses
    if (hasHouses) {
    prompt.houses.forEach(houseNum => {
        const houseData = birthData.houses.find(h => h.house === houseNum);
        if (!houseData) return;
        const sign = houseData.sign;
        const rulerPlanet = rulers[sign];

        if (rulerPlanet) {
            const planetData = birthData.planets.find(p => p.name === rulerPlanet);
            const rulerRetroCode = planetData.is_retro === 'true' ? 'Rr-' : 'Rp-';
            const houseCode = houseNum.toString().padStart(2, '0');
            const houseCodePlanet = planetData.house.toString().padStart(2, '0');
            const code = rulerRetroCode + planetCodes[rulerPlanet] + signCodes[sign] + houseCode + signCodes[planetData.sign] + houseCodePlanet;

            addUniqueResponse(code, `${rulerPlanet} ruler of ${sign} and the ${houseNum} house in ${planetData.sign} in ${formatHouseNum(planetData.house)} house`);
        }

        birthData.planets.forEach(planetData => {
            if (!prompt.planets.includes(planetData.name) && planetData.house === houseNum) {
                const houseCode = houseNum.toString().padStart(2, '0');
                let code = planetCodes[planetData.name] + signCodes[planetData.sign] + houseCode;

                if (planetData.is_retro === "true") {
                    code = "Pr-" + code;
                    addUniqueResponse(code, `${planetData.name} is retrograde in ${houseNum} house in ${planetData.sign} house`);
                } else {
                    code = "Pp-" + code;
                    addUniqueResponse(code, `${planetData.name} in ${planetData.sign} in the ${formatHouseNum(planetData.house)} house`);
                }

                // Get aspects and filter duplicates
                const aspects = findAspects(planetData.name, birthData, true);
                aspects.forEach(aspect => {
                    const aspectCode = aspect.match(/\(([^)]+)\)/)[1];
                    if (!usedCodes.has(aspectCode)) {
                        usedCodes.add(aspectCode);
                        responses.push(aspect);
                    }
                });
            }
        });
    });
    }

    return responses.join("\n");
};
  
  
    export const generateNatalPositions = (promptKey, birthData) => {
      const prompt = relevantPromptAspects[promptKey];
  
      let responses = [];
      let map = {}
  
  
      const matchingPlanetNames = birthData.planets
      .filter(planet => prompt.houses.includes(planet.house))
      .map(planet => planet.name);
  
      // add matchiingPlanetnames to prompt.planets
      const planetsToCheck = prompt.planets.concat(matchingPlanetNames)
  
      planetsToCheck.forEach(planet => {
        const planetData = birthData.planets.find(p => p.name === planet);
        const houseCode = planetData.house.toString().padStart(2, '0'); // Pad the house number to ensure it's 2 digits
      //   code = planetCodes[planet] + signCodes[planetData.sign] + houseCode
  
        let codeSimple
        let code
        if (planetData.is_retro === "true") {
          codeSimple = "r" + planetCodes[planet] + signCodes[planetData.sign] + houseCode
          code = "Pr-" + codeSimple
        } else {
          codeSimple = "p" + planetCodes[planet] + signCodes[planetData.sign] + houseCode
          code = "Pp-" + codeSimple
        } 
  
        map[planet] = codeSimple
        responses.push(`${description} `)
  
      });
  
      prompt.houses.forEach(houseNum => {
          const houseData = birthData.houses.find(h => h.house === houseNum);
          const sign = houseData.sign;
          const rulerPlanet = rulers[sign]; 
          if (rulerPlanet) {
            const planetData = birthData.planets.find(p => p.name === rulerPlanet);
            const rulerRetroCode = planetData.is_retro === 'true' ? 'Rr-' : 'Rp-'
            const houseCode = houseNum.toString().padStart(2, '0'); // Pad the house number to ensure it's 2 digits
            const houseCodePlanet = planetData.house.toString().padStart(2, '0')
     
            const code =  rulerRetroCode + rulerRetroCode.substring(1, 2) + planetCodes[rulerPlanet] + signCodes[sign] + houseCode + signCodes[planetData.sign] + houseCodePlanet
       
          }
      })
  
  
  
   
      planetsToCheck.forEach(planet => {
          responses = responses.concat(findAspectsMap(birthData, planet));
      })
  
      // return responses.join("\n"); this allows 
    return responses
  }
  
  
  function findAspectsMap(birthData, planetName) {
    const relevantAspects = birthData.aspects.filter(aspect => 
        aspect.transitingPlanet === planetName || aspect.aspectingPlanet === planetName
    );
    return relevantAspects.map(aspect => addAspectDescriptionMap(aspect));
  }
  
  
  function addAspectDescriptionMap(aspect) {
    const signs = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
  
    const transitingPlanetSign = signs[Math.floor(aspect.transitingPlanetDegree / 30)];
    const aspectingPlanetSign = signs[Math.floor(aspect.aspectingPlanetDegree / 30)];
    const orbDesc = orbDescription(aspect.orb); 
    const description = `${aspect.transitingPlanet} in ${transitingPlanetSign} is ${orbDesc} ${aspect.aspectType} ${aspect.aspectingPlanet} in ${aspectingPlanetSign}`;
  
    const code = "A-" + planetCodes[aspect.transitingPlanet] + orbCodes[orbDesc] + transitCodes[aspect.aspectType] + planetCodes[aspect.aspectingPlanet]
    return `${description} (ref: ${code})`
  
  }


  export function getPlanetDescription(planetName, birthData, rulerPlanet) {
    let responses = []
    const planetData = birthData.planets.find(p => {
        const normalizedPlanetName = p.name.toLowerCase().replace(/\s+/g, '');
        const normalizedSearchName = planetName.toLowerCase().replace(/\s+/g, '');
        
        return normalizedPlanetName === normalizedSearchName || 
               (normalizedSearchName === 'node' && normalizedPlanetName === 'truenode');
    });    
    console.log("planetName: ", planetName)
    console.log("planetData XXX: ", planetData)


    // If planet not found (e.g., Ascendant for users without birth time), return empty description
    if (!planetData) {
        console.log(`Planet ${planetName} not found in birth chart - likely no birth time available`);
        return '';
    }
    
    const houseCode = (planetData.house || 0).toString().padStart(2, '0'); // Default to 0 if no house
    const code = planetCodes[planetName] + signCodes[planetData.sign] + houseCode
    
    // Check if planet is retrograde
    const retrogradeText = planetData.is_retro ? ' retrograde' : '';
        // Add chart ruler text if applicable
    let rulerText = ""
    if (rulerPlanet && planetName === rulerPlanet) {
      rulerText = " (chart ruler)"
    }
        
    // Format description based on whether house data is available
    let description;
    if (planetData.house && planetData.house > 0) {
        description = `Natal ${planetName}${retrogradeText} in ${planetData.sign} in the ${formatHouseNum(planetData.house)} house${rulerText} (${code})`;
    } else {
        description = `Natal ${planetName}${retrogradeText} in ${planetData.sign}${rulerText} (${code})`;
    }
    
    responses.push(description)
    const aspects = findAspects(planetName, birthData)
    responses = responses.concat(aspects)
    return responses.join("\n");
  }
  

  export function generateDominanceDescriptions(birthData) {
    // Elements Description
    console.log("generateDominanceDescriptions")
    console.log("birthData: ", birthData)
    const elementDesc = birthData.elements.elements
        .filter(element => element.count > 0)
        .map(element => {
            const planetList = element.planets.join(', ');
            return `${element.name} is ${element.dominance} with ${planetList} (${element.percentage}% of the chart, ${element.points} points)`;
        });

    // Modalities Description  
    const modalityDesc = birthData.modalities.modalities
        .filter(modality => modality.count > 0)
        .map(modality => {
            const planetList = modality.planets.join(', ');
            return `${modality.name} energy is represented by ${planetList} (${modality.percentage}% of the chart)`;
        });

    // Quadrants Description
    const quadrantDesc = birthData.quadrants.quadrants
        .filter(quadrant => quadrant.count > 0)
        .map(quadrant => {
            const planetList = quadrant.planets.join(', ');
            return `The ${quadrant.name} quadrant is ${quadrant.dominance} with ${planetList} (${quadrant.percentage}% of planets)`;
        });

    // Hemispheres Description
    const hemispheres = birthData.quadrants.hemispheres;
    const hemisphereDesc = [
        `Eastern-Western axis is ${hemispheres.eastern.dominance} (${hemispheres.eastern.percentage}% east, ${hemispheres.western.percentage}% west)`,
        `Northern-Southern axis is ${hemispheres.northern.dominance} (${hemispheres.northern.percentage}% north, ${hemispheres.southern.percentage}% south)`
    ];

    return {
        elements: elementDesc,
        modalities: modalityDesc,
        quadrants: quadrantDesc,
        hemispheres: hemisphereDesc
    };
}

