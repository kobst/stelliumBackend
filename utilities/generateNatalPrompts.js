
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
  ignorePoints } from "./constants.js";

import { decodePlanetHouseCode, decodeAspectCode, decodeAspectCodeMap, decodeRulerCode } from "./decoder.js";

export const orbDescription = (orb) => {
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
  

function findAspects(planetName, birthData) {
    let aspectList = [];
    birthData.aspects.forEach(aspect => {
      if (aspect.aspecting_planet === planetName) {
        const aspectPhrase = addAspectDescription(aspect, birthData, true);
        aspectList.push(aspectPhrase);
      }
      if (aspect.aspected_planet === planetName) {
        const aspectPhrase = addAspectDescription(aspect, birthData, false);
        aspectList.push(aspectPhrase);
      }
    });
    return aspectList;
  }

  function addAspectDescription(aspect, birthData, aspecting) {
    const aspectType = aspect.type.toLowerCase();
    let otherPlanet = "";
    let otherPlanetId = "";
    let planetName = "";
  
    if (aspecting) {
      planetName = aspect.aspecting_planet;
      otherPlanet = 'aspected_planet';
      otherPlanetId = 'aspected_planet_id';
    } else {
      planetName = aspect.aspected_planet;
      otherPlanet = 'aspecting_planet';
      otherPlanetId = 'aspecting_planet_id';
    }
  
    const orbDesc = orbDescription(aspect.orb); // Assuming orbDescription is defined elsewhere
    const houseCode = birthData.planets[aspect[otherPlanetId]].house.toString().padStart(2, '0'); // Pad the house number to ensure it's 2 digits
    const code = "A-" + planetCodes[planetName] + orbCodes[orbDesc] + transitCodes[aspectType] + planetCodes[aspect[otherPlanet]] + signCodes[birthData.planets[aspect[otherPlanetId]].sign] + houseCode
    return decodeAspectCode(code)

  //  return `${description}  (${code})`
    // return `${planetName} ${orbDesc} ${aspectType} to ${aspect[otherPlanet]} in ${birthData.planets[aspect[otherPlanetId]].sign} in ${birthData.planets[aspect[otherPlanetId]].house} house (${code}) \n ${formattedDescription}`
  }
  

export const generateNatalPrompts = (promptKey, birthData) => {
    const prompt = relevantPromptAspects[promptKey];
    let responses = [];
    
    prompt.planets.forEach(planet => {
      const planetData = birthData.planets.find(p => p.name === planet);
      let code
      const houseCode = planetData.house.toString().padStart(2, '0'); // Pad the house number to ensure it's 2 digits
      code = planetCodes[planet] + signCodes[planetData.sign] + houseCode

      if (planetData.is_retro === "true") {
        code = "Pr-" + code
        // responses.push(`${planet} is retrograde in ${planetData.sign} in the ${planetData.house} house (${code})`);
      } else {
        code = "Pp-" + code
        // responses.push(`${planet} in ${planetData.sign} in the ${planetData.house} house (${code})`);
      }

      let description = decodePlanetHouseCode(code)
      responses.push(`${description}  (ref: ${code})`)
      // Assuming findAspects is a function defined elsewhere
      responses = responses.concat(findAspects(planet, birthData));
    });
    // console.log(responses)
  
    // Planets in specified houses and their aspects
    prompt.houses.forEach(houseNum => {
      const houseData = birthData.houses.find(h => h.house === houseNum);
      const sign = houseData.sign;
      const rulerPlanet = rulers[sign]; // Assuming rulers is an object defined elsewhere
      if (rulerPlanet) {
        const planetData = birthData.planets.find(p => p.name === rulerPlanet);
        const rulerRetroCode = planetData.is_retro === 'true' ? 'Rr-' : 'Rp-'
        const houseCode = houseNum.toString().padStart(2, '0'); // Pad the house number to ensure it's 2 digits
        const houseCodePlanet = planetData.house.toString().padStart(2, '0')
        const code =  rulerRetroCode + planetCodes[rulerPlanet] + signCodes[sign] + houseCode + signCodes[planetData.sign] + houseCodePlanet
        const descriptionFromCode = decodeRulerCode(code)
        // const description = `${rulerPlanet} ruler of ${sign} and the ${houseNum} house in ${planetData.sign} in ${planetData.house} house (${code})` 
        // responses.push(description);
        responses.push(`${descriptionFromCode}`)
        // responses = responses.concat(findAspects(rulerPlanet, birthData));
      }
      birthData.planets.forEach(planetData => {
        if (!prompt.planets.includes(planetData.name)) {
          if (planetData.house === houseNum) {
            let code
            const houseCode = houseNum.toString().padStart(2, '0'); // Pad the house number to ensure it's 2 digits
            code = planetCodes[planetData.name] + signCodes[planetData.sign] + houseCode
           
 
            if (planetData.is_retro === "true") {
              code = "Pr-" + code
              // responses.push(`${planetData.name} is retrograde in ${houseNum} house in ${planetData.sign} house (${code})`);
            } else {
                code = "Pp-" + code
                // responses.push(`${planetData.name} in ${planetData.sign} in the ${planetData.house} house (${code})`);
            }
            let description = decodePlanetHouseCode(code) 
            responses.push(`${description} (${code})`)
            responses = responses.concat(findAspects(planetData.name, birthData));
          }
        }
      });
    });
  
    return responses.join("\n");

  }


  export const generateNatalPositions = (promptKey, birthData) => {
    const prompt = relevantPromptAspects[promptKey];

    const allPlanets = [
        "Sun", "Moon", "Ascendant", "Mercury", "Venus", "Mars", "Saturn",
        "Jupiter", "Uranus", "Neptune", "Pluto", "Part of Fortune", "Node",
        "South Node"
      ]
    let responses = [];
    let map = {}

    allPlanets.forEach(planet => {
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

      let description = decodePlanetHouseCode(code)
      responses.push(`${description}  (ref: ${code})`)

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
          const descriptionFromCode = decodeRulerCode(code)
          // const description = `${rulerPlanet} ruler of ${sign} and the ${houseNum} house in ${planetData.sign} in ${planetData.house} house (${code})` 
          // responses.push(description);
          responses.push(`${descriptionFromCode}`)
          // responses = responses.concat(findAspects(rulerPlanet, birthData));
        }
    })

    Object.keys(map).forEach((key) => {
        // console.log(key)
        responses = responses.concat(findAspectsMap(key, birthData, map));
    })

    return responses.join("\n");

}


function findAspectsMap(planetName, birthData, map) {
    let aspectList = [];
    birthData.aspects.forEach(aspect => {
      if (aspect.aspecting_planet === planetName) {
        const aspectPhrase = addAspectDescriptionMap(aspect, birthData, true, map);
        aspectList.push(aspectPhrase);
      }
      if (aspect.aspected_planet === planetName) {
        const aspectPhrase = addAspectDescriptionMap(aspect, birthData, false, map);
        aspectList.push(aspectPhrase);
      }
    });
    return aspectList;
  }

  function addAspectDescriptionMap(aspect, birthData, aspecting, map) {
    const aspectType = aspect.type.toLowerCase();
    let otherPlanet = "";
    let otherPlanetId = "";
    let planetName = "";
  
    if (aspecting) {
      planetName = aspect.aspecting_planet;
      otherPlanet = 'aspected_planet';
      otherPlanetId = 'aspected_planet_id';
    } else {
      planetName = aspect.aspected_planet;
      otherPlanet = 'aspecting_planet';
      otherPlanetId = 'aspecting_planet_id';
    }
  
    const orbDesc = orbDescription(aspect.orb); // Assuming orbDescription is defined elsewhere

    var code = ''
    if (!map[aspect[otherPlanet]]) {
        console.log(aspect[otherPlanet] + " not in map")
        code = "A-" + map[planetName] + orbCodes[orbDesc] + transitCodes[aspectType] + 'p' + planetCodes[aspect[otherPlanet]] + signCodes[birthData.planets[aspect[otherPlanetId]].sign]

        // return (aspect[otherPlanet] + " not in map")
    } else {
        code = "A-" + map[planetName] + orbCodes[orbDesc] + transitCodes[aspectType] + map[aspect[otherPlanet]]
        // return(decodeAspectCodeMap(code))

    }
    // const code = "A-" + map[planetName] + orbCodes[orbDesc] + transitCodes[aspectType] + map[aspect[otherPlanet]]

    // return code
    return decodeAspectCodeMap(code) 
  }
  

