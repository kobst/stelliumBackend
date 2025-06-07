// Test script for custom transit horoscope endpoint

import { TransitEvent } from '../utilities/transitPrioritization.js';

// Sample transit events for testing
const sampleTransitEvents: TransitEvent[] = [
  {
    type: 'transit-to-natal',
    transitingPlanet: 'Jupiter',
    targetPlanet: 'Sun',
    aspect: 'trine',
    exact: new Date('2025-01-10T12:00:00Z'),
    start: new Date('2025-01-08T00:00:00Z'),
    end: new Date('2025-01-12T23:59:59Z'),
    priority: 8,
    description: 'Jupiter trine natal Sun - expansion and opportunity',
    transitingSign: 'Gemini',
    targetSign: 'Aquarius'
  },
  {
    type: 'transit-to-natal',
    transitingPlanet: 'Mars',
    targetPlanet: 'Moon',
    aspect: 'square',
    exact: new Date('2025-01-10T18:00:00Z'),
    start: new Date('2025-01-09T00:00:00Z'),
    end: new Date('2025-01-11T23:59:59Z'),
    priority: 6,
    description: 'Mars square natal Moon - emotional tension',
    transitingSign: 'Cancer',
    targetSign: 'Libra'
  },
  {
    type: 'moon-phase',
    transitingPlanet: 'Moon',
    exact: new Date('2025-01-10T15:30:00Z'),
    start: new Date('2025-01-10T00:00:00Z'),
    end: new Date('2025-01-10T23:59:59Z'),
    priority: 5,
    description: 'First Quarter Moon',
    moonPhaseData: {
      phase: 'First Quarter',
      illumination: 50
    }
  }
];

// Test function
async function testCustomHoroscope() {
  try {
    // Replace with an actual userId from your database
    const userId = '6739b30f5f4db5c7f26e9737'; // Example user ID
    
    const response = await fetch(`http://localhost:3001/users/${userId}/horoscope/custom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transitEvents: sampleTransitEvents
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Error response:', error);
      return;
    }
    
    const result = await response.json();
    console.log('Success! Custom horoscope generated:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Failed to test custom horoscope:', error);
  }
}

// Run the test
console.log('Testing custom transit horoscope endpoint...');
testCustomHoroscope();