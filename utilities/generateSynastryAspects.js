import { calculateAspectObject, findAspectsForBirthChartV2 } from './generateTransitAspects.js';
import { sortOrder } from './constants.js';

function getProperty(object, camelCase, snake_case) {
    // console.log("getProperty: ", object.name)
    return object[camelCase] !== undefined ? object[camelCase] : object[snake_case];
  }


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

        // console.log("planet1: ", planet1)
        // console.log("planet2: ", planet2)
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
    // Calculate midpoint for Ascendant and MC
    // const ascendant1 = planets1.find((p) => p.name === 'Ascendant');
    // const ascendant2 = planets2.find((p) => p.name === 'Ascendant');
    // const mc1 = planets1.find((p) => p.name === 'Midheaven' || p.name === 'MC');
    // const mc2 = planets2.find((p) => p.name === 'Midheaven' || p.name === 'MC');
    const ascendant1 = planets1.find((p) => p.name === 'ascendant');
    const ascendant2 = planets2.find((p) => p.name === 'ascendant');
    const mc1 = planets1.find((p) => p.name === 'midheaven' || p.name === 'MC');
    const mc2 = planets2.find((p) => p.name === 'midheaven' || p.name === 'MC');

    const ascendantMidpoint = calculateMidpoint(
        getProperty(ascendant1, 'fullDegree', 'full_degree'),
        getProperty(ascendant2, 'fullDegree', 'full_degree')
    );
    const mcMidpoint = calculateMidpoint(
        getProperty(mc1, 'fullDegree', 'full_degree'),
        getProperty(mc2, 'fullDegree', 'full_degree')
    );

    // compositeChart.houses.push({ name: 'Ascendant', fullDegree: ascendantMidpoint });
    // compositeChart.houses.push({ name: 'Midheaven', fullDegree: mcMidpoint });

    // Calculate house cusps based on Ascendant midpoint
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

            if (
                (planet.full_degree >= currentHouse.degree && planet.full_degree < nextHouse.degree) ||
                (i === compositeChart.houses.length - 2 && planet.full_degree >= currentHouse.degree)
            ) {
                planet.house = i + 1;
                break;
            }
        }
    });

    const aspectsComputed = findAspectsForBirthChartV2(compositeChart.planets);
    compositeChart.aspects = aspectsComputed;

    return compositeChart;
};

// Helper function to calculate the midpoint between two degrees
const calculateMidpoint = (degree1, degree2) => {
    const shortestDistance = Math.abs(degree1 - degree2) > 180 ? 360 - Math.abs(degree1 - degree2) : Math.abs(degree1 - degree2);
    const midpoint = (degree1 + degree2) / 2;
    return shortestDistance > 180 ? (midpoint + 180) % 360 : midpoint;
};

const getSign = (degree) => {
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const signIndex = Math.floor(degree / 30);
    return signs[signIndex];
  };