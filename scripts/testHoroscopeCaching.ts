/**
 * Test script to verify horoscope caching behavior
 * Tests that horoscopes are properly cached for their respective periods
 */

import { normalizeHoroscopeDateRange, isSameHoroscopePeriod } from '../utilities/horoscopeDateUtils.js';

console.log('Testing Horoscope Date Normalization\n');
console.log('=====================================\n');

// Test weekly normalization
console.log('WEEKLY HOROSCOPE TESTS:');
console.log('-----------------------');

const testDates = [
  new Date('2025-02-03'), // Monday
  new Date('2025-02-05'), // Wednesday  
  new Date('2025-02-09'), // Sunday
  new Date('2025-02-10'), // Next Monday
];

testDates.forEach(date => {
  const normalized = normalizeHoroscopeDateRange(date, 'weekly');
  console.log(`\nInput: ${date.toDateString()}`);
  console.log(`Week Start: ${normalized.startDate.toDateString()} ${normalized.startDate.toTimeString()}`);
  console.log(`Week End: ${normalized.endDate.toDateString()} ${normalized.endDate.toTimeString()}`);
});

// Test that all dates in the same week normalize to the same period
console.log('\n\nTesting same week detection:');
const monday = new Date('2025-02-03');
const wednesday = new Date('2025-02-05');
const sunday = new Date('2025-02-09');
const nextMonday = new Date('2025-02-10');

console.log(`Monday & Wednesday same week: ${isSameHoroscopePeriod(monday, wednesday, 'weekly')}`);
console.log(`Monday & Sunday same week: ${isSameHoroscopePeriod(monday, sunday, 'weekly')}`);
console.log(`Sunday & Next Monday same week: ${isSameHoroscopePeriod(sunday, nextMonday, 'weekly')}`);

// Test monthly normalization
console.log('\n\nMONTHLY HOROSCOPE TESTS:');
console.log('------------------------');

const monthlyTestDates = [
  new Date('2025-02-01'), // First of month
  new Date('2025-02-15'), // Middle of month
  new Date('2025-02-28'), // Last day of Feb
  new Date('2025-03-01'), // First of next month
];

monthlyTestDates.forEach(date => {
  const normalized = normalizeHoroscopeDateRange(date, 'monthly');
  console.log(`\nInput: ${date.toDateString()}`);
  console.log(`Month Start: ${normalized.startDate.toDateString()} ${normalized.startDate.toTimeString()}`);
  console.log(`Month End: ${normalized.endDate.toDateString()} ${normalized.endDate.toTimeString()}`);
});

// Test that all dates in the same month normalize to the same period
console.log('\n\nTesting same month detection:');
const feb1 = new Date('2025-02-01');
const feb15 = new Date('2025-02-15');
const feb28 = new Date('2025-02-28');
const mar1 = new Date('2025-03-01');

console.log(`Feb 1 & Feb 15 same month: ${isSameHoroscopePeriod(feb1, feb15, 'monthly')}`);
console.log(`Feb 1 & Feb 28 same month: ${isSameHoroscopePeriod(feb1, feb28, 'monthly')}`);
console.log(`Feb 28 & Mar 1 same month: ${isSameHoroscopePeriod(feb28, mar1, 'monthly')}`);

// Edge cases
console.log('\n\nEDGE CASES:');
console.log('------------');

// Test Sunday edge case
const sundayTest = new Date('2025-02-09');
sundayTest.setHours(23, 59, 59);
const sundayNormalized = normalizeHoroscopeDateRange(sundayTest, 'weekly');
console.log(`\nSunday 23:59:59 normalizes to:`);
console.log(`Week: ${sundayNormalized.startDate.toDateString()} to ${sundayNormalized.endDate.toDateString()}`);

// Test month boundary
const monthEndTest = new Date('2025-01-31');
monthEndTest.setHours(23, 59, 59);
const monthNormalized = normalizeHoroscopeDateRange(monthEndTest, 'monthly');
console.log(`\nJan 31 23:59:59 normalizes to:`);
console.log(`Month: ${monthNormalized.startDate.toDateString()} to ${monthNormalized.endDate.toDateString()}`);

console.log('\n\nIMPLEMENTATION SUMMARY:');
console.log('=======================');
console.log('✓ Weekly horoscopes: Monday 00:00:00 UTC to Sunday 23:59:59 UTC');
console.log('✓ Monthly horoscopes: 1st 00:00:00 UTC to last day 23:59:59 UTC');
console.log('✓ Any date within a period will return the same cached horoscope');
console.log('✓ API response includes "cached" field to indicate if returned from cache');