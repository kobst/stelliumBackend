import { updateObjectKeys, degreeDifference } from "./helpers";
import { decodeHouseTransitCode, decodeTransitNatalAspectCode } from "./decoder";
import { planetCodes, signCodes, transitCodes } from "./constants";


const orbDescription = (orb) => {
    if (orb < 1) {
      return "exact";
    } else if (orb >= 1 && orb < 3) {
      return "close";
    } else if (orb >= 3 && orb < 5) {
        return "loose";
    } else if (orb >= 7 && orb < 10) {
      return "loose";
    } else {
      return "-";
    }
  }

function calculateAspect(degree1, degree2, isRetro) {
    let diff = Math.abs(degree1 - degree2);
    diff = diff > 180 ? 360 - diff : diff;
  
    // Define the aspects in an array to simplify the checks
    const aspects = [
      { name: 'conjunction', min: 0, max: 3, orb: 0 },
      { name: 'sextile', min: 57, max: 63, orb: 60 },
      { name: 'square', min: 87, max: 93, orb: 90 },
      { name: 'trine', min: 117, max: 123, orb: 120 },
      { name: 'quincunx', min: 147, max: 150, orb: 150 },
      { name: 'opposition', min: 177, max: 183, orb: 180 },
    ];
  
    for (let aspect of aspects) {
      if (diff >= aspect.min && diff <= aspect.max) {
        let orbDiff = Math.abs(diff - aspect.orb);
        let aspectType = aspect.name;
        let code = transitCodes[aspect.name];
  
        aspectType = orbDiff < 1 ? 'exact ' + aspectType : aspectType;
        code = orbDiff < 1 ? 'e' + code : 'g' + code;


        let perfectOrbDegree = degree1 + aspect.orb
        perfectOrbDegree = perfectOrbDegree > 360 ? perfectOrbDegree - 360 : perfectOrbDegree
  
        if (perfectOrbDegree < degree2 || (degree2 < 3 && perfectOrbDegree > 360 - degree2)) {
            if (!isRetro) {
                aspectType = '(applying) ' + aspectType;
                code = 'ap' + code;
            } else{
                aspectType = '(seperating) ' + aspectType;
                code = 'sp' + code
            }
        } else {
            if (isRetro) {
                aspectType = '(applying) ' + aspectType;
                code = 'ap' + code;
            } else{
                aspectType = '(separating) ' + aspectType;
                code = 'sp' + code
            }
        }
  
        return code;
      }
    }
  
    return "";
  }


function findTransitingHouse(transit, sortedHouses) {
    // Find the house the transit is currently in
    for (let i = 0; i < sortedHouses.length - 1; i++) {
        // Check if the transit is between the current house cusp and the next one
        if (sortedHouses[i].degree <= transit.full_degree && transit.full_degree < sortedHouses[i + 1].degree) {
            var houseCode = (sortedHouses[i].house).toString().padStart(2, '0'); // Pad the house number to ensure it's 2 digits
            if (degreeDifference(sortedHouses[i].degree, transit.full_degree) < 2) {
                return `E${houseCode}`
            } else if (sortedHouses[i+1] && degreeDifference(sortedHouses[i+1], transit.full_degree) < 2) {
                return `L${houseCode}`
            }
            return `T${houseCode}`
        }
    }
    const lastHouseCode = 12
    if (degreeDifference(sortedHouses[11].degree, transit.full_degree) < 2) {
        return `E${lastHouseCode}`
    } else if (degreeDifference(sortedHouses[1], transit.full_degree) < 2) {
        return `L${lastHouseCode}`
    }
    return `T${lastHouseCode}`

}

export const findTransitAspects = (updatedTransits, birthChart, type) => {
    // const updatedTransits = updateObjectKeys(transits);
    // console.log(updatedTransits)
        // Sort the houses by degree for proper comparison
    const typeDescriptor = type === 'progressed' ? 'G' : 'T'
    const sortedHouses = birthChart.houses.slice().sort((a, b) => a.degree - b.degree);
    sortedHouses.push({ house: 1, sign: sortedHouses[0].sign, degree: sortedHouses[0].degree + 360 });
    const aspects = [];


    updatedTransits.forEach(transit => {
        if (transit.name === 'Ascendant') return
        // console.log(transit)
        let retroCode = transit.is_retro === 'true' ? 'r' : 't'
        let houseTransit= findTransitingHouse(transit, sortedHouses)

        const signTransitDegree = transit.full_degree % 30
        let signTransit = 'T'
        if (signTransitDegree < 3) {
            signTransit = 'E'
        } else if (signTransitDegree > 27) {
            signTransit = 'L'
        }

    
        const code = "H" + typeDescriptor + "-" + retroCode + planetCodes[transit.name] + signTransit + signCodes[transit.sign] + houseTransit
        // const houseDescription = `${retro} ${transit.name} transiting ${transit.sign} ${houseTransit[0]} ${code}`
        const houseDescriptionDecoded = decodeHouseTransitCode(code)
        // aspects.push(houseDescription)
        aspects.push(houseDescriptionDecoded)
        birthChart.planets.forEach(birthPlanet => {
            if (["South Node", "Chiron", "Part of Fortune"].includes(birthPlanet.name)) return
            // var transitAspects = []
            const aspect = calculateAspect(transit.full_degree, birthPlanet.full_degree, transit.is_retro);
            if (aspect !== '') {
                const birthPlanetHouseCode = birthPlanet.house.toString().padStart(2, '0'); // Pad the house number to ensure it's 2 digits
                const code = typeDescriptor + "N-" + retroCode + planetCodes[transit.name] + aspect + planetCodes[birthPlanet.name] + signCodes[birthPlanet.sign] + birthPlanetHouseCode
                const decodedDesciption = decodeTransitNatalAspectCode(code)
                aspects.push(decodedDesciption)
            } 
        });
    });

    return aspects;
}
