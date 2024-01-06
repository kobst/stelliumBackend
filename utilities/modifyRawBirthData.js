
const { signs } = require('./constants');


function generatePlanetObject(name, rawResponse, house, signs) {
    let ascendantDegree = rawResponse[name];
    let normalDegree = ascendantDegree;
    let signId = 1;
    while (normalDegree > 30) {
      signId += 1;
      normalDegree -= 30;
    }
  
    name = name.charAt(0).toUpperCase() + name.slice(1);
  
    return {
      name: name,
      fullDegree: ascendantDegree,
      normDegree: normalDegree,
      speed: 0.4995,
      isRetro: false,
      signId: signId,
      sign: signs[signId - 1],
      house: house
    };
}
  
function addSouthNode(rawResponse) {
    for (let planetObject of rawResponse.planets) {
        if (planetObject.name === "Node") {
            let fullDegree = planetObject.fullDegree + 180;
            let house = planetObject.house + 6;

            if (fullDegree > 360) {
                fullDegree -= 360;
            }
            if (house > 12) {
                house -= 12;
            }

            let signId = 1;
            let normalDegree = fullDegree;
            while (normalDegree > 30) {
                signId += 1;
                normalDegree -= 30;
            }
            return {
                name: "South Node",
                fullDegree: fullDegree,
                normDegree: normalDegree,
                speed: 0.4995,
                isRetro: false,
                signId: signId,
                sign: signs[signId - 1],
                house: house
            };
        }
    }
}


function modifyRawResponse(rawResponse) {
    const ascendantObject = generatePlanetObject("ascendant", rawResponse, 1, signs);
    const midheavenObject = generatePlanetObject("midheaven", rawResponse, 10, signs);
    const southNodeObject = addSouthNode(rawResponse);
  
    rawResponse.planets.splice(10, 0, ascendantObject);
    rawResponse.planets.splice(11, 0, midheavenObject);
    rawResponse.planets.splice(13, 0, southNodeObject);
  
    return rawResponse;
  }
  
  module.exports = {
    modifyRawResponse
  };
  