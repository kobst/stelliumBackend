# Support for Users Without Birth Times

This document describes the changes made to support users who don't have birth times in the Stellium Backend system.

## Overview

When users don't have birth times, certain astrological calculations cannot be performed accurately:
- House placements cannot be determined
- Ascendant and Midheaven are unavailable
- House-based aspects and placements must be handled differently

## Changes Made

### 1. Ephemeris Data Service (`services/ephemerisDataService.ts`)

#### `generateCompositeChart` Function
- Added detection for missing birth time data (missing ascendant/midheaven)
- When either user lacks birth time, the system uses an equal house system starting at 0° Aries
- Added metadata properties to composite charts:
  - `houseSystem`: 'equal' or 'placidus'
  - `hasAccurateBirthTimes`: boolean flag

```typescript
// If either user is missing birth time data, use equal house system starting at 0° Aries
if (!ascendant1 || !ascendant2 || !mc1 || !mc2) {
    console.log("One or both users missing birth time - using equal house system starting at 0° Aries");
    ascendantMidpoint = 0; // 0° Aries
    mcMidpoint = 270; // 0° Capricorn (270° from Aries)
    useEqualHouses = true;
}
```

### 2. Birth Chart Scoring (`utilities/birthChartScoring.ts`)

#### `generateNatalPromptsShortOverview` Function
- Added check to skip planets that don't exist (e.g., Ascendant for users without birth time)
- House codes default to '00' when no house data is available

#### `addAspectDescription` Function
- Houses default to 0 when not available
- Descriptions omit house references when houses are '00'

#### `getPlanetDescription` Function
- Added null check for planet data
- Returns empty string for missing planets (e.g., Ascendant)
- Formats descriptions without house information when houses aren't available

### 3. Relationship Scoring (`utilities/relationshipScoring.ts`)

#### House Placement Scoring
- Added checks for birth time availability before scoring house placements
- Synastry house placements are only scored if at least one user has birth time
- Composite house placements are skipped when using equal house system

#### `scoreSynastryHousePlacements` Function
- Added birth time checks for both users
- Only processes A's planets in B's houses if B has birth time
- Only processes B's planets in A's houses if A has birth time

## Testing

The end-to-end test script (`scripts/testNoBirthTimeUsers.ts`) validates:
1. Birth chart generation for users without birth time
2. Relationship compatibility between:
   - User with birth time + User without birth time
   - User without birth time + User with birth time  
   - User without birth time + User without birth time
3. Proper skipping of house-based calculations
4. Generation of relationship analyses and scores

## Usage

When creating a user without birth time:
- Set `birthTimeUnknown: true` in the user data
- Omit or set `time` field to `null` or `undefined`
- The system will automatically handle the limitations

Example:
```typescript
const userWithoutTime = {
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  gender: 'male',
  dateOfBirth: '1990-01-15',
  placeOfBirth: 'New York, NY',
  birthTimeUnknown: true,
  // time field omitted or null
};
```

## Limitations

For users without birth times:
- No house placements in birth charts
- No Ascendant or Midheaven
- Relationship house placement scores are reduced or skipped
- Composite charts use equal house system (30° per house starting at 0° Aries)