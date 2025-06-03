#!/usr/bin/env node
import { generateHoroscope } from '../utilities/horoscopeGeneration.js';
import { initializeEphemeris } from '../services/ephemerisDataService.js';
import { getUserSingle } from '../services/dbService.js';

async function testHoroscopeGeneration(userId: string, horoscopeType: 'weekly' | 'monthly' = 'weekly') {
    try {
        console.log('Initializing ephemeris...');
        await initializeEphemeris();
        
        // Verify user exists
        console.log(`\nVerifying user ${userId} exists...`);
        const user = await getUserSingle(userId);
        if (!user) {
            throw new Error(`User with ID ${userId} not found`);
        }
        console.log(`User found: ${user.firstName} ${user.lastName}`);
        
        // Set up date range
        const startDate = new Date();
        let endDate = new Date();
        
        if (horoscopeType === 'weekly') {
            // Weekly: 7 days from start
            endDate.setDate(endDate.getDate() + 6);
            console.log(`\nGenerating weekly horoscope from ${startDate.toDateString()} to ${endDate.toDateString()}`);
        } else {
            // Monthly: last day of the month
            endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
            console.log(`\nGenerating monthly horoscope from ${startDate.toDateString()} to ${endDate.toDateString()}`);
        }
        
        // Generate horoscope
        console.log('\nGenerating horoscope...');
        const horoscope: any = await generateHoroscope(userId, startDate, endDate, horoscopeType);
        
        // Display results
        console.log('\n=== HOROSCOPE GENERATED SUCCESSFULLY ===');
        console.log(`Horoscope ID: ${horoscope._id}`);
        console.log(`User: ${horoscope.userId}`);
        console.log(`Period: ${horoscope.period}`);
        console.log(`Date Range: ${new Date(horoscope.startDate).toDateString()} - ${new Date(horoscope.endDate).toDateString()}`);
        console.log(`Generated At: ${new Date(horoscope.generatedAt).toLocaleString()}`);
        console.log(`User Prompt: ${horoscope.userPrompt}`);
        console.log('\n=== TRANSIT SUMMARY ===');
        console.log(`Total Transits Analyzed: ${horoscope.transitData.transits.length}`);
        console.log(`Active Retrogrades: ${horoscope.transitData.retrogrades.length}`);
        if (horoscope.transitData.retrogrades.length > 0) {
            horoscope.transitData.retrogrades.forEach((retro: any) => {
                console.log(`  - ${retro.planet} retrograde`);
            });
        }
        
        console.log('\n=== KEY THEMES ===');
        horoscope.analysis.keyThemes.forEach((theme: string, index: number) => {
            console.log(`${index + 1}. ${theme}`);
        });
        
        console.log('\n=== MAIN INTERPRETATION ===');
        console.log(horoscope.interpretation);
        
        // Save to file for detailed review
        const filename = `horoscope_${userId}_${horoscopeType}_${new Date().toISOString().split('T')[0]}.json`;
        const fs = await import('fs');
        fs.writeFileSync(
            `./logs/${filename}`,
            JSON.stringify(horoscope, null, 2)
        );
        console.log(`\nFull horoscope saved to: ./logs/${filename}`);
        
        return horoscope;
        
    } catch (error) {
        console.error('Error testing horoscope generation:', error);
        throw error;
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: npx ts-node --esm scripts/testHoroscopeGeneration.ts <userId> [weekly|monthly]');
        console.log('Example: npx ts-node --esm scripts/testHoroscopeGeneration.ts 6405b8e23b6e3a65eb2e0248 weekly');
        process.exit(1);
    }
    
    const userId = args[0];
    const horoscopeType = (args[1] as 'weekly' | 'monthly') || 'weekly';
    
    if (!['weekly', 'monthly'].includes(horoscopeType)) {
        console.error('Invalid horoscope type. Must be "weekly" or "monthly"');
        process.exit(1);
    }
    
    try {
        await testHoroscopeGeneration(userId, horoscopeType);
        console.log('\nTest completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\nTest failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { testHoroscopeGeneration };