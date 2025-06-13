#!/usr/bin/env node
// Simple test script that bypasses the full horoscope generation
import { initializeEphemeris } from '../services/ephemerisDataService.js';
import { getUserSingle, createHoroscope } from '../services/dbService.js';

async function testHoroscopeSimple(userId: string, horoscopeType: 'weekly' | 'monthly' = 'weekly') {
    try {
        console.log('Testing horoscope functionality...\n');
        
        // Initialize ephemeris
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
            endDate.setDate(endDate.getDate() + 6);
            console.log(`\nCreating weekly horoscope from ${startDate.toDateString()} to ${endDate.toDateString()}`);
        } else {
            endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
            console.log(`\nCreating monthly horoscope from ${startDate.toDateString()} to ${endDate.toDateString()}`);
        }
        
        // Create a test horoscope
        const testHoroscope = {
            userId,
            period: horoscopeType,
            startDate,
            endDate,
            transitData: {
                transits: [] as any[],
                retrogrades: [] as any[]
            },
            analysis: {
                keyThemes: [
                    'Test theme 1: Major transformations ahead',
                    'Test theme 2: Focus on relationships',
                    'Test theme 3: Career opportunities'
                ],
                detailedAnalysis: [
                    {
                        title: 'Overall Energy',
                        content: 'This is a test horoscope. The actual implementation would analyze real transit data.'
                    }
                ]
            },
            interpretation: `This is a test ${horoscopeType} horoscope for ${user.firstName}. In a real implementation, this would contain personalized astrological insights based on current transits to your natal chart.`,
            generatedAt: new Date()
        };
        
        console.log('\nSaving horoscope to database...');
        const savedHoroscope = await createHoroscope(testHoroscope);
        
        // Display results
        console.log('\n=== HOROSCOPE CREATED SUCCESSFULLY ===');
        console.log(`Horoscope ID: ${savedHoroscope._id}`);
        console.log(`User: ${savedHoroscope.userId}`);
        console.log(`Period: ${savedHoroscope.period}`);
        console.log(`Date Range: ${new Date(savedHoroscope.startDate).toDateString()} - ${new Date(savedHoroscope.endDate).toDateString()}`);
        console.log(`Generated At: ${new Date(savedHoroscope.generatedAt).toLocaleString()}`);
        
        console.log('\n=== KEY THEMES ===');
        savedHoroscope.analysis.keyThemes.forEach((theme: string, index: number) => {
            console.log(`${index + 1}. ${theme}`);
        });
        
        console.log('\n=== INTERPRETATION ===');
        console.log(savedHoroscope.interpretation);
        
        return savedHoroscope;
        
    } catch (error) {
        console.error('Error testing horoscope:', error);
        throw error;
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: npx ts-node --esm scripts/testHoroscopeSimple.ts <userId> [weekly|monthly]');
        console.log('Example: npx ts-node --esm scripts/testHoroscopeSimple.ts 67f8a0a54edb7d81f72c78da weekly');
        process.exit(1);
    }
    
    const userId = args[0];
    const horoscopeType = (args[1] as 'weekly' | 'monthly') || 'weekly';
    
    if (!['weekly', 'monthly'].includes(horoscopeType)) {
        console.error('Invalid horoscope type. Must be "weekly" or "monthly"');
        process.exit(1);
    }
    
    try {
        await testHoroscopeSimple(userId, horoscopeType);
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

export { testHoroscopeSimple };