// Test script to verify normalized scores are calculated correctly
import { scoreRelationshipCompatibility } from '../utilities/relationshipScoring.js';
import { relationshipScoringStats } from '../utilities/relationshipScoringStats.js';

// Create mock data for testing
const mockSynastryAspects = [
    {
        planet1: 'sun',
        planet2: 'moon',
        aspectType: 'conjunction',
        orb: 2,
        exact: false,
        applying: true
    },
    {
        planet1: 'venus',
        planet2: 'mars',
        aspectType: 'trine',
        orb: 3,
        exact: false,
        applying: false
    }
];

const mockUserA = {
    _id: 'userA123',
    firstName: 'John',
    lastName: 'Doe',
    gender: 'male',
    birthChart: {
        planets: {
            sun: { degree: 45, sign: 'Taurus', house: 2 },
            moon: { degree: 120, sign: 'Leo', house: 5 },
            venus: { degree: 200, sign: 'Libra', house: 7 },
            mars: { degree: 280, sign: 'Capricorn', house: 10 }
        },
        houses: [
            { degree: 0 }, { degree: 30 }, { degree: 60 }, { degree: 90 },
            { degree: 120 }, { degree: 150 }, { degree: 180 }, { degree: 210 },
            { degree: 240 }, { degree: 270 }, { degree: 300 }, { degree: 330 }
        ]
    }
};

const mockUserB = {
    _id: 'userB456',
    firstName: 'Jane',
    lastName: 'Smith',
    gender: 'female',
    birthChart: {
        planets: {
            sun: { degree: 47, sign: 'Taurus', house: 2 },
            moon: { degree: 220, sign: 'Scorpio', house: 8 },
            venus: { degree: 80, sign: 'Gemini', house: 3 },
            mars: { degree: 320, sign: 'Aquarius', house: 11 }
        },
        houses: [
            { degree: 0 }, { degree: 30 }, { degree: 60 }, { degree: 90 },
            { degree: 120 }, { degree: 150 }, { degree: 180 }, { degree: 210 },
            { degree: 240 }, { degree: 270 }, { degree: 300 }, { degree: 330 }
        ]
    }
};

const mockCompositeChart = {
    planets: {
        sun: { degree: 46, sign: 'Taurus', house: 2 },
        moon: { degree: 170, sign: 'Virgo', house: 6 },
        venus: { degree: 140, sign: 'Leo', house: 5 },
        mars: { degree: 300, sign: 'Aquarius', house: 11 }
    },
    aspects: [
        {
            planet1: 'sun',
            planet2: 'moon',
            aspectType: 'trine',
            orb: 4
        }
    ],
    houses: [
        { degree: 0 }, { degree: 30 }, { degree: 60 }, { degree: 90 },
        { degree: 120 }, { degree: 150 }, { degree: 180 }, { degree: 210 },
        { degree: 240 }, { degree: 270 }, { degree: 300 }, { degree: 330 }
    ],
    hasAccurateBirthTimes: true,
    houseSystem: 'placidus'
};

// Run the scoring function
console.log('Testing normalized scores calculation...\n');

const result: any = scoreRelationshipCompatibility(
    mockSynastryAspects,
    mockCompositeChart,
    mockUserA,
    mockUserB,
    'composite123',
    true // debug enabled
);

console.log('Results:\n');
console.log('Scores (normalized 0-1):');
console.log(JSON.stringify(result.scores, null, 2));

console.log('\nRaw scores from debug:');
if (result.debug && result.debug.rawScores) {
    console.log(JSON.stringify(result.debug.rawScores, null, 2));
}

// Verify normalization
console.log('\nVerifying normalization:');
const categories = Object.keys(result.scores);
categories.forEach(category => {
    const scores = result.scores[category];
    console.log(`\n${category}:`);
    Object.keys(scores).forEach(component => {
        const value = scores[component];
        if (value < 0 || value > 1) {
            console.error(`  ❌ ${component}: ${value} (OUT OF RANGE!)`);
        } else {
            console.log(`  ✓ ${component}: ${value.toFixed(3)}`);
        }
    });
});

console.log('\nTest complete!');