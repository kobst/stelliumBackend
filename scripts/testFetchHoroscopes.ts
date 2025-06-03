#!/usr/bin/env node
import { 
    getHoroscopesByUserId, 
    getLatestHoroscope,
    getHoroscopeById 
} from '../services/dbService.js';

async function testFetchHoroscopes(userId: string, action: 'list' | 'latest' | 'byId' = 'list', horoscopeId?: string) {
    try {
        console.log('Testing horoscope fetch functionality...\n');
        
        switch (action) {
            case 'list':
                console.log(`Fetching horoscopes for user ${userId}...`);
                const horoscopes = await getHoroscopesByUserId(userId, null, 10);
                
                if (horoscopes.length === 0) {
                    console.log('No horoscopes found for this user.');
                    return;
                }
                
                console.log(`Found ${horoscopes.length} horoscope(s):\n`);
                horoscopes.forEach((horoscope, index) => {
                    console.log(`${index + 1}. ${horoscope.period.toUpperCase()} Horoscope`);
                    console.log(`   ID: ${horoscope._id}`);
                    console.log(`   Date Range: ${new Date(horoscope.startDate).toDateString()} - ${new Date(horoscope.endDate).toDateString()}`);
                    console.log(`   Generated: ${new Date(horoscope.generatedAt).toLocaleString()}`);
                    console.log(`   Key Themes: ${horoscope.analysis.keyThemes.join(', ')}`);
                    console.log('');
                });
                break;
                
            case 'latest':
                console.log(`Fetching latest horoscope for user ${userId}...`);
                const latest = await getLatestHoroscope(userId);
                
                if (!latest) {
                    console.log('No horoscopes found for this user.');
                    return;
                }
                
                console.log('=== LATEST HOROSCOPE ===');
                console.log(`Type: ${latest.period.toUpperCase()}`);
                console.log(`ID: ${latest._id}`);
                console.log(`Date Range: ${new Date(latest.startDate).toDateString()} - ${new Date(latest.endDate).toDateString()}`);
                console.log(`Generated: ${new Date(latest.generatedAt).toLocaleString()}`);
                console.log('\nKey Themes:');
                latest.analysis.keyThemes.forEach((theme, i) => {
                    console.log(`${i + 1}. ${theme}`);
                });
                console.log('\nInterpretation:');
                console.log(latest.interpretation);
                break;
                
            case 'byId':
                if (!horoscopeId) {
                    console.error('Horoscope ID is required for byId action');
                    return;
                }
                
                console.log(`Fetching horoscope ${horoscopeId}...`);
                const horoscope = await getHoroscopeById(horoscopeId);
                
                if (!horoscope) {
                    console.log('Horoscope not found.');
                    return;
                }
                
                console.log('=== HOROSCOPE DETAILS ===');
                console.log(`Type: ${horoscope.period.toUpperCase()}`);
                console.log(`User ID: ${horoscope.userId}`);
                console.log(`Date Range: ${new Date(horoscope.startDate).toDateString()} - ${new Date(horoscope.endDate).toDateString()}`);
                console.log(`Generated: ${new Date(horoscope.generatedAt).toLocaleString()}`);
                console.log('\nTransit Summary:');
                console.log(`- Total Transits: ${horoscope.transitData.transits.length}`);
                console.log(`- Active Retrogrades: ${horoscope.transitData.retrogrades.length}`);
                console.log('\nKey Themes:');
                horoscope.analysis.keyThemes.forEach((theme, i) => {
                    console.log(`${i + 1}. ${theme}`);
                });
                console.log('\nDetailed Analysis:');
                horoscope.analysis.detailedAnalysis.forEach(section => {
                    console.log(`\n${section.title}:`);
                    console.log(section.content);
                });
                console.log('\nMain Interpretation:');
                console.log(horoscope.interpretation);
                break;
        }
        
    } catch (error) {
        console.error('Error fetching horoscopes:', error);
        throw error;
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage:');
        console.log('  List horoscopes: npx ts-node --esm scripts/testFetchHoroscopes.ts <userId>');
        console.log('  Latest horoscope: npx ts-node --esm scripts/testFetchHoroscopes.ts <userId> latest');
        console.log('  Specific horoscope: npx ts-node --esm scripts/testFetchHoroscopes.ts <userId> byId <horoscopeId>');
        console.log('\nExample:');
        console.log('  npx ts-node --esm scripts/testFetchHoroscopes.ts 6405b8e23b6e3a65eb2e0248');
        console.log('  npx ts-node --esm scripts/testFetchHoroscopes.ts 6405b8e23b6e3a65eb2e0248 latest');
        process.exit(1);
    }
    
    const userId = args[0];
    const action = (args[1] as 'list' | 'latest' | 'byId') || 'list';
    const horoscopeId = args[2];
    
    try {
        await testFetchHoroscopes(userId, action, horoscopeId);
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

export { testFetchHoroscopes };