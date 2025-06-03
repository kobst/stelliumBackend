#!/usr/bin/env node
import { initializeEphemeris } from '../services/ephemerisDataService.js';
import { getUserSingle, getBirthChart, getPreGeneratedTransitSeries } from '../services/dbService.js';

async function debugHoroscopeAspects(userId: string) {
    try {
        console.log('Debugging horoscope aspect calculations...\n');
        
        // Initialize ephemeris
        await initializeEphemeris();
        
        // Get user data
        const user = await getUserSingle(userId);
        console.log(`User: ${user.firstName} ${user.lastName}`);
        
        // Get birth chart
        const birthChart = await getBirthChart(userId);
        
        // Debug: Show birth chart structure
        console.log('\n=== BIRTH CHART STRUCTURE ===');
        console.log('Planets:', birthChart.planets?.length || 0);
        console.log('Houses:', birthChart.houses?.length || 0);
        
        // Check house data structure
        if (birthChart.houses && birthChart.houses.length > 0) {
            console.log('\n=== HOUSE DATA SAMPLE ===');
            console.log('First house (Ascendant):', JSON.stringify(birthChart.houses[0], null, 2));
            console.log('Tenth house (Midheaven):', JSON.stringify(birthChart.houses[9], null, 2));
        }
        
        // Check planet data structure
        if (birthChart.planets && birthChart.planets.length > 0) {
            console.log('\n=== PLANET DATA SAMPLE ===');
            console.log('First planet:', JSON.stringify(birthChart.planets[0], null, 2));
        }
        
        // Extract natal points and show what we're getting
        console.log('\n=== EXTRACTED NATAL POINTS ===');
        const natalPoints = extractNatalPoints(birthChart);
        natalPoints.forEach(point => {
            console.log(`${point.name}: ${point.lon}° (${point.sign} ${point.degree}°)`);
        });
        
        // Get current transit data
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Convert to ISO strings
        const todayISO = today.toISOString().split('T')[0];
        const tomorrowISO = tomorrow.toISOString().split('T')[0];
        
        console.log(`\n=== FETCHING TRANSITS FOR ${todayISO} to ${tomorrowISO} ===`);
        const transitData = await getPreGeneratedTransitSeries(todayISO, tomorrowISO);
        if (transitData && transitData.length > 0) {
            console.log('\n=== CURRENT TRANSITS ===');
            const currentTransits = (transitData[0] as any).planets;
            currentTransits.forEach(planet => {
                console.log(`${planet.name}: ${planet.lon}° (${planet.sign})`);
            });
            
            // Check specifically for Saturn
            const saturn = currentTransits.find(p => p.name === 'Saturn');
            if (saturn) {
                console.log(`\n=== SATURN POSITION ===`);
                console.log(`Saturn is at ${saturn.lon}° (${saturn.sign})`);
                
                // Check distances to Ascendant and Midheaven
                const ascendant = natalPoints.find(p => p.name === 'Ascendant');
                const midheaven = natalPoints.find(p => p.name === 'Midheaven');
                
                if (ascendant) {
                    const distance = Math.abs(saturn.lon - ascendant.lon);
                    const normalizedDistance = distance > 180 ? 360 - distance : distance;
                    console.log(`Distance to Ascendant: ${normalizedDistance.toFixed(2)}°`);
                    console.log(`Is conjunction (within 8°)? ${normalizedDistance <= 8}`);
                }
                
                if (midheaven) {
                    const distance = Math.abs(saturn.lon - midheaven.lon);
                    const normalizedDistance = distance > 180 ? 360 - distance : distance;
                    console.log(`Distance to Midheaven: ${normalizedDistance.toFixed(2)}°`);
                    console.log(`Is conjunction (within 8°)? ${normalizedDistance <= 8}`);
                }
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Helper function (copy from horoscopeGeneration.ts)
function extractNatalPoints(birthChart: any) {
    const points: any[] = [];
    
    // Add planets
    if (birthChart.planets) {
        for (const planet of birthChart.planets) {
            // Skip if it's Ascendant or Midheaven (they'll be added from houses)
            if (planet.name === 'Ascendant' || planet.name === 'Midheaven') {
                continue;
            }
            points.push({
                name: planet.name,
                lon: planet.full_degree || 0,
                sign: planet.sign,
                degree: planet.norm_degree || planet.degree
            });
        }
    }
    
    // Add angles if available
    if (birthChart.houses && birthChart.houses.length > 0) {
        // Ascendant is the cusp of the 1st house
        const ascendant = birthChart.houses[0];
        if (ascendant) {
            points.push({
                name: 'Ascendant',
                lon: ascendant.degree, // In houses, 'degree' is the full zodiac degree
                sign: ascendant.sign,
                degree: ascendant.degree % 30 // Calculate degree within sign
            });
        }
        
        // Midheaven is the cusp of the 10th house
        const midheaven = birthChart.houses[9];
        if (midheaven) {
            points.push({
                name: 'Midheaven',
                lon: midheaven.degree, // In houses, 'degree' is the full zodiac degree
                sign: midheaven.sign,
                degree: midheaven.degree % 30 // Calculate degree within sign
            });
        }
    }
    
    return points;
}

// Main execution
async function main() {
    const userId = process.argv[2];
    
    if (!userId) {
        console.log('Usage: npx ts-node --esm scripts/debugHoroscopeAspects.ts <userId>');
        process.exit(1);
    }
    
    try {
        await debugHoroscopeAspects(userId);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { debugHoroscopeAspects };