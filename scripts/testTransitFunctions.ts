// @ts-nocheck
import { generateTransitSeries, scanTransitSeries, mergeTransitWindows } from '../services/ephemerisDataService.js';

// Simple demo of the transit utilities
async function runDemo() {
  // Sample natal positions (using full_degree values)
  const natal = [
    { name: 'Sun', lon: 99.7868 },
    { name: 'Moon', lon: 211.8591 },
    { name: 'Mercury', lon: 98.786 },
    { name: 'Venus', lon: 68.1813 },
    { name: 'Mars', lon: 22.6554 },
    { name: 'Jupiter', lon: 109.5046 },
    { name: 'Saturn', lon: 292.9566 },
    { name: 'Uranus', lon: 277.5072 },
    { name: 'Neptune', lon: 283.287 },
    { name: 'Pluto', lon: 225.1278 },
    { name: 'Ascendant', lon: 113.73956837697384 },
    { name: 'Midheaven', lon: 39.59626276044711 },
    { name: 'Chiron', lon: 107.7707 },
    { name: 'South Node', lon: 127.6551 }
  ];

  const from = new Date('2025-07-01T00:00:00Z');
  const to = new Date('2025-07-07T00:00:00Z');

  // Generate daily ephemeris data for the range
  const series = generateTransitSeries(from, to);

  // Scan the series for transit hits
  const rawEvents = Array.from(scanTransitSeries(series, natal));

  // Merge consecutive hits into windows
  const windows = mergeTransitWindows(rawEvents);

  console.log('Raw Events:');
  console.log(JSON.stringify(rawEvents, null, 2));

  console.log('\nMerged Windows:');
  console.log(JSON.stringify(windows, null, 2));
}

runDemo().catch(err => {
  console.error('Error running demo:', err);
});
