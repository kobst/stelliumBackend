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
    ignorePlanets, 
    ignorePoints,
    sortOrder } from "../constants.js";

import pkg from 'lodash';
const {groupBy} = pkg;


function calculateApplying(degree1, degree2, orb) {
    let perfectOrbDegree = degree1 + orb;
    perfectOrbDegree = perfectOrbDegree > 360 ? perfectOrbDegree - 360 : perfectOrbDegree;
    
    return perfectOrbDegree < degree2 || (degree2 < 3 && perfectOrbDegree > 357);
    }


function calculateAspect(degree1, degree2, isRetro, transitName) {
    let diff = Math.abs(degree1 - degree2);
    diff = diff > 180 ? 360 - diff : diff;
    // console.log("degree " + degree1 + " degree2 " + degree2 )
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
        { 'name': 'conjunction', 'orb': 0 },
        { 'name': 'sextile', 'orb': 60 },
        { 'name': 'square', 'orb': 90 },
        { 'name': 'trine', 'orb': 120 },
        { 'name': 'quincunx', 'orb': 150 },
        { 'name': 'opposition', 'orb': 180 },
    ];
    
    for (const aspect of aspects) {
        const orbDiff = Math.abs(diff - aspect['orb']);
        // console.log(orbDiff)
        // console.log("orbDiff")

        if (orbDiff <= maxOrb) {
            const roundedOrb = Math.round(orbDiff * 10) / 10;
            let applying = calculateApplying(degree1, degree2, roundedOrb);
            if (isRetro) {
                applying = !applying;
            } 
            // console.log("aspect" + aspect['name'])
            return { 'aspectType':  aspect['name'], 'orb': roundedOrb, 'applying': applying };
        }
    }
    return { 'aspectType': '', 'orb': 0, 'applying': false };
}
    
export const findGeneralTransitAspectObjects = (dailyTransits, date) => {
    console.log("find daily transit aspect objects")
    dailyTransits.sort((a, b) => sortOrder[a.name] - sortOrder[b.name]);
    const aspects = [];
    
    for (let i = 0; i < dailyTransits.length; i++) {
        const transit = dailyTransits[i];
        // console.log("transit name")
        // console.log(transit['name'])

        if (["South Node", "Chiron", "Part of Fortune", "Ascendant"].includes(transit['name'])) {
            continue;
        }
    
        for (let j = i + 1; j < dailyTransits.length; j++) {
            const anotherPlanet = dailyTransits[j];
            // console.log("another planet name")
            // console.log(anotherPlanet['name'])
            if (["South Node", "Chiron", "Part of Fortune", "Ascendant"].includes(anotherPlanet['name'])) {
                continue;
            }
    
            // console.log("transiot object " + transit)
            const aspectObject = calculateAspect(transit['full_degree'], anotherPlanet['full_degree'], transit['is_retro'], transit['name']);
    

            if (aspectObject.aspectType !== '') {
                const transitObject = {
                'transitingPlanet': transit.name,
                'aspectingPlanet': anotherPlanet.name,
                'aspectType': aspectObject.aspectType,
                'orb': aspectObject.orb,
                'date': date
                };
                aspects.push(transitObject);
            }
        }
    }
    
    return aspects;
}




export const findNatalTransitAspectObjects = (dailyTransits, birthChart, date) => {
    console.log("find daily transit aspect objects")
    dailyTransits.sort((a, b) => sortOrder[a.name] - sortOrder[b.name]);
    const aspects = [];
    
    for (let i = 0; i < dailyTransits.length; i++) {
        const transit = dailyTransits[i];
        if (["South Node", "Chiron", "Part of Fortune", "Ascendant"].includes(transit['name'])) {
            continue;
        }

        birthChart.planets.forEach(birthPlanet => {
            if (["South Node", "Chiron", "Part of Fortune"].includes(birthPlanet.name)) return
            // var transitAspects = []
            const aspect = calculateAspect(transit.full_degree, birthPlanet.full_degree, transit.is_retro, transit.name);
            if (aspectObject.aspectType !== '') {
                const transitObject = {
                    'transitingPlanet': transit.name,
                    'aspectingPlanet': anotherPlanet.name,
                    'aspectType': aspectObject.aspectType,
                    'orb': aspectObject.orb,
                    'date': date
                };
                aspects.push(transitObject);
            }
        });
    }
    
    return aspects;
}

      
function removeAscendant(planets) {
    return planets.filter(planet => planet.name !== 'Ascendant');
  }


export const generateGroupedTransits = (transits) => {
    console.log("GENERATE GROUPED TRANSITS")
    console.log(transits[0])
    const groupedTransits = groupBy(transits, t => `${t.transitingPlanet}-${t.aspectingPlanet}-${t.aspectType}`);
    const summaryTransits = [];

    for (const key in groupedTransits) {
        const group = groupedTransits[key];
        group.sort((a, b) => a.date - b.date);
        const earliestDate = group[0].date;
        const latestDate = group[group.length - 1].date;
        const closestOrbDate = group.reduce((min, t) => t.orb < min.orb ? t : min, group[0]).date;

        const [transitingPlanet, aspectingPlanet, aspectType] = key.split('-');
        const summaryTransit = {
        transitingPlanet,
        aspectingPlanet,
        aspectType,
        'date range': [earliestDate, latestDate],
        'closestOrbDate': closestOrbDate
        };

        // console.log(summaryTransit)
        summaryTransits.push(summaryTransit);
    }

    return summaryTransits;
}

      


