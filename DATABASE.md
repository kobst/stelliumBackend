# Stellium Backend Database Documentation

## Overview

The Stellium Backend uses MongoDB as its primary database with the database name `stellium`. The application employs a document-oriented database structure to store astrological data, user information, celebrity data, chart analyses, and related interpretations. All collections support connection pooling with a maximum pool size of 10 connections and retry mechanisms for both reads and writes.

## Unified Subjects Architecture

As of the latest version, the system uses a unified `subjects` collection that consolidates user, celebrity, and guest subject data with ownership and provenance tracking. This replaces the separate `users` and `celebs` collections for better scalability and multi-user support.

## Database Connection Configuration

- **Database Name**: `stellium`
- **Total Collections**: 19 (including 1 unified subjects collection)
- **Connection Pool**: 
  - Max Pool Size: 10
  - Min Pool Size: 2
  - Server Selection Timeout: 5000ms
  - Socket Timeout: 45000ms
  - Max Idle Time: 30000ms
- **Features**: Retry Writes, Retry Reads enabled

## Collections Architecture

### Core Subject Data Collections

#### 1. `subjects` (Unified Collection)
**Purpose**: Stores all birth chart subjects with ownership and provenance tracking

**Schema**:
```typescript
{
  _id: ObjectId,
  // Core birth chart data
  firstName: string,
  lastName: string,
  email?: string,              // Optional - only for accountSelf
  dateOfBirth: Date,
  timeOfBirth?: string,        // Optional birth time
  placeOfBirth: string,
  latitude: number,
  longitude: number,
  timezone: string,
  birthChart?: BirthChart,     // Embedded birth chart data
  isTimeKnown?: boolean,
  birthTimeUnknown?: boolean,
  totalOffsetHours: number,
  
  // Ownership and provenance fields
  kind: "celebrity" | "accountSelf" | "guest",
  ownerUserId: ObjectId | null,  // null for celebrities, ObjectId for guest subjects
  
  // Convenience flags
  isCelebrity: boolean,          // true for celebrity kind
  isReadOnly: boolean,           // true for celebrity
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ _id: 1 }` - Primary key index
- `{ email: 1 }` - Unique index on email (for accountSelf)
- `{ kind: 1 }` - Index for filtering by subject type
- `{ ownerUserId: 1 }` - Index for user-owned subjects
- `{ isCelebrity: 1 }` - Index for celebrity filtering
- `{ firstName: 1, lastName: 1 }` - Compound index for name searches

**Subject Types**:
- `"accountSelf"`: User's own birth chart (email required, ownerUserId: null)
- `"celebrity"`: Public celebrity charts (no email, ownerUserId: null, isReadOnly: true)
- `"guest"`: User-created subjects for friends/family (ownerUserId required)

#### 2. `users` (Legacy - Being Phased Out)
**Purpose**: Stores user profile information and birth chart data

**Schema**:
```typescript
{
  _id: ObjectId,
  email: string,              // Unique user email
  firstName: string,
  lastName: string,
  dateOfBirth: Date,
  timeOfBirth?: string,       // Optional birth time
  placeOfBirth: string,
  latitude: number,
  longitude: number,
  timezone: string,
  birthChart?: BirthChart,    // Embedded birth chart data
  isTimeKnown?: boolean,
  createdAt?: Date,
  updatedAt?: Date
}
```

**Indexes**:
- `{ email: 1 }` - Unique index on email
- `{ _id: 1, email: 1 }` - Compound index for efficient lookups

**Key Notes**:
- Email field is unique across the collection
- Birth chart data is embedded within the user document
- Supports users with unknown birth times

#### 3. `celebs` (Legacy - Being Phased Out)
**Purpose**: Legacy celebrity storage - data migrated to subjects collection

**Migration Note**: Celebrity data has been migrated to the unified `subjects` collection with `kind: "celebrity"` and will be accessed through the subjects collection going forward.

### Chart and Relationship Collections

#### 4. `composite_charts`
**Purpose**: Stores composite charts for relationship analysis between two users

**Schema**:
```typescript
{
  _id: ObjectId,
  userAId: ObjectId,          // Reference to first user
  userBId: ObjectId,          // Reference to second user
  compositeChart: CompositeChart,  // Full composite chart data
  synastryAspects?: Array,    // Synastry aspect data
  relationshipType?: string,
  createdAt?: Date,
  updatedAt?: Date
}
```

**Indexes**:
- `{ userAId: 1, userBId: 1 }` - Compound index for user pair lookups
- `{ _id: 1 }` - Primary key index

**Relationships**:
- References `users` collection via `userAId` and `userBId`
- Related to `composite_chart_interpretations` via `_id`
- Related to `relationship_analysis` via `_id`

#### 5. `composite_chart_interpretations`
**Purpose**: Stores interpretations for composite and synastry charts

**Schema**:
```typescript
{
  _id: ObjectId,              // Same as composite chart ID
  compositeChartInterpretation?: {
    [heading: string]: {
      promptDescription: string,
      interpretation: string
    }
  },
  synastryInterpretation?: {
    [heading: string]: {
      promptDescription: string,
      interpretation: string
    }
  }
}
```

**Key Notes**:
- Uses the same `_id` as the corresponding composite chart
- Can store both composite and synastry interpretations
- Each interpretation is keyed by heading/topic

### Analysis Collections

#### 6. `birth_chart_analysis`
**Purpose**: Comprehensive birth chart analysis including basic and topic-based interpretations

**Schema**:
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  interpretation: {
    timestamp: Date,
    metadata: object,
    basicAnalysis?: {
      overview: string,
      dominance: {
        [type: string]: object
      },
      planets: {
        [planet: string]: object
      },
      userId: string,
      createdAt: Date
    },
    SubtopicAnalysis?: {
      [broadTopic: string]: {
        label: string,
        relevantPositions: Array,
        subtopics: {
          [subtopicKey: string]: object
        }
      }
    }
  },
  vectorizationStatus?: {
    overview: boolean,
    planets: object,
    dominance: object,
    basicAnalysis: boolean,
    topicAnalysis: {
      isComplete: boolean,
      topics?: object
    },
    lastUpdated: Date
  },
  workflowStatus?: {
    isRunning: boolean,
    startedAt: Date,
    completedAt: Date,
    lastUpdated: Date
  },
  debug?: {
    inputSummary: {
      userId: ObjectId
    }
  }
}
```

**Indexes**:
- `{ userId: 1 }` - Index on user ID
- `{ "debug.inputSummary.userId": 1 }` - Index for debug lookups

**Key Notes**:
- Tracks vectorization status for AI-powered search
- Monitors workflow processing status
- Supports incremental updates to analysis sections

#### 7. `relationship_analysis`
**Purpose**: Stores relationship compatibility scores and analysis

**Schema**:
```typescript
{
  _id: ObjectId,
  compositeChartId: ObjectId,
  userIdA: ObjectId,
  userIdB: ObjectId,
  scores: {
    [category: string]: number
  },
  analysis?: {
    [category: string]: {
      interpretation: string,
      astrologyData: string,
      generatedAt: Date
    }
  },
  categoryAnalysis?: object,  // Alternative field name for analysis
  vectorizationStatus?: {
    categories: {
      OVERALL_ATTRACTION_CHEMISTRY: boolean,
      EMOTIONAL_SECURITY_CONNECTION: boolean,
      SEX_AND_INTIMACY: boolean,
      COMMUNICATION_AND_MENTAL_CONNECTION: boolean,
      COMMITMENT_LONG_TERM_POTENTIAL: boolean,
      KARMIC_LESSONS_GROWTH: boolean,
      PRACTICAL_GROWTH_SHARED_GOALS: boolean
    },
    lastUpdated: Date,
    relationshipAnalysis: boolean
  },
  workflowStatus?: {
    isRunning: boolean,
    startedAt: Date,
    completedAt: Date,
    lastUpdated: Date
  },
  debug: {
    inputSummary: {
      compositeChartId: ObjectId,
      userAId: ObjectId,
      userBId: ObjectId
    },
    categories: object
  },
  createdAt: Date,
  lastUpdated: Date
}
```

**Indexes**:
- `{ "debug.inputSummary.compositeChartId": 1 }` - Index on composite chart ID
- `{ "debug.inputSummary.userAId": 1, "debug.inputSummary.userBId": 1 }` - Compound index on user IDs

**Relationships**:
- References `composite_charts` via `compositeChartId`
- References `users` via `userIdA` and `userIdB`

### Transit and Ephemeris Collections

#### 8. `daily_transits`
**Purpose**: Pre-calculated daily planetary positions

**Schema**:
```typescript
{
  _id: ObjectId,
  date: Date,
  transits: [{
    name: string,             // Planet name
    fullDegree: number,       // Absolute degree (0-360)
    normDegree: number,       // Normalized degree within sign
    speed: number,
    isRetro: boolean,
    sign: string
  }]
}
```

**Indexes**:
- `{ date: 1 }` - Index on date for efficient time-based queries

#### 9. `daily_aspects`
**Purpose**: Pre-calculated planetary aspects for each day

**Schema**:
```typescript
{
  _id: ObjectId,
  planet1: string,
  planet2: string,
  aspectType: string,
  date_range: [Date, Date],   // [start, end] of aspect
  exactDate: Date,
  orb: number,
  birthChartId?: string       // Optional reference to specific chart
}
```

**Indexes**:
- `{ "date_range.0": 1, "date_range.1": 1 }` - Compound index on date range

#### 10. `retrogrades`
**Purpose**: Planetary retrograde periods

**Schema**:
```typescript
{
  _id: ObjectId,
  planet: string,
  date_range: [Date, Date],   // [retrograde start, retrograde end]
  stationaryDates: {
    retrograde: Date,         // Station retrograde date
    direct: Date              // Station direct date
  }
}
```

**Indexes**:
- `{ "date_range.0": 1, "date_range.1": 1 }` - Compound index on date range

#### 11. `transit_ephemeris`
**Purpose**: Pre-generated transit series data for efficient lookups

**Schema**:
```typescript
{
  _id: ObjectId,
  date: string,               // ISO date string
  planetPositions: {
    [planet: string]: {
      degree: number,
      sign: string,
      isRetrograde: boolean
    }
  }
}
```

**Indexes**:
- `{ date: 1 }` - Index on date

### Interpretation Collections

#### 12. `user_birth_chart_interpretation`
**Purpose**: Stores individual birth chart interpretations by topic

**Schema**:
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  birthChartInterpretation: {
    [heading: string]: {
      promptDescription: string,
      interpretation: string
    }
  }
}
```

**Relationships**:
- References `users` via `userId`

#### 13. `user_transit_aspects`
**Purpose**: User-specific transit aspects

**Schema**:
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  date_range?: [Date, Date],
  transitAspects?: Array,
  // Additional aspect data fields
}
```

**Relationships**:
- References `users` via `userId`

#### 14. `daily_transit_interpretations`
**Purpose**: AI-generated interpretations for daily transits

**Schema**:
```typescript
{
  _id: ObjectId,
  date: Date,
  combinedDescription: Array,
  dailyTransitInterpretation: string
}
```

#### 15. `weekly_transit_interpretations`
**Purpose**: AI-generated weekly horoscope interpretations by sign

**Schema**:
```typescript
{
  _id: ObjectId,
  date: Date,
  weeklyInterpretations: [{
    sign: string,
    combinedDescription: Array,
    weeklyTransitInterpretation: string
  }]
}
```

#### 16. `horoscopes`
**Purpose**: Generated horoscopes for users

**Schema**:
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  period: 'daily' | 'weekly' | 'monthly',
  date: Date,
  startDate?: Date,           // For weekly/monthly
  endDate?: Date,             // For weekly/monthly
  horoscopeText: string,
  themes: string[],
  generatedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ userId: 1, date: 1 }` - Compound index for user horoscope lookups

**Relationships**:
- References `users` via `userId`

### Communication Collections

#### 17. `chat_threads_birth_chart_analysis`
**Purpose**: Chat conversation history for birth chart analysis

**Schema**:
```typescript
{
  _id: ObjectId,
  userId: string,             // Stored as string, not ObjectId
  birthChartAnalysisId: string,  // Stored as string
  messages: [{
    role: 'user' | 'assistant',
    content: string,
    timestamp: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ userId: 1 }` - Index on user ID

**Relationships**:
- References `users` via `userId`
- References `birth_chart_analysis` via `birthChartAnalysisId`

#### 18. `chat_threads_relationship_analysis`
**Purpose**: Chat conversation history for relationship analysis

**Schema**:
```typescript
{
  _id: ObjectId,
  userId: string,
  compositeChartId: string,
  messages: [{
    role: 'user' | 'assistant',
    content: string,
    timestamp: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ compositeChartId: 1 }` - Index on composite chart ID

**Relationships**:
- References `users` via `userId`
- References `composite_charts` via `compositeChartId`

### Logging Collections

#### 19. `relationship_logs`
**Purpose**: Audit log for relationship-related actions

**Schema**:
```typescript
{
  _id: ObjectId,
  userAId: ObjectId,
  userBId: ObjectId,
  compositeChartId: ObjectId,
  action: string,
  details: any,               // Flexible object for action details
  timestamp: Date
}
```

**Relationships**:
- References `users` via `userAId` and `userBId`
- References `composite_charts` via `compositeChartId`

## Data Relationships Diagram

```
subjects (unified collection)
  ├── birth_chart_analysis (1:1)
  │   └── user_birth_chart_interpretation (1:1)
  ├── composite_charts (M:N with other subjects)
  │   ├── composite_chart_interpretations (1:1)
  │   ├── relationship_analysis (1:1)
  │   └── relationship_logs (1:M)
  ├── user_transit_aspects (1:M)
  ├── horoscopes (1:M)
  ├── chat_threads_birth_chart_analysis (1:M)
  └── chat_threads_relationship_analysis (1:M)

-- Legacy collections (being phased out) --
users → migrated to subjects with kind="accountSelf"
celebs → migrated to subjects with kind="celebrity"

daily_transits ←→ daily_aspects ←→ retrogrades
                        │
                        └→ user_transit_aspects

transit_ephemeris (standalone pre-calculated data)

daily_transit_interpretations (standalone)
weekly_transit_interpretations (standalone)
```

## Key Design Patterns

1. **Embedded Documents**: Birth charts are embedded within user documents for atomic operations and better read performance.

2. **Reference Pattern**: Composite charts reference users by ObjectId, maintaining data normalization for relationship data.

3. **Vectorization Status Tracking**: Analysis collections track which content has been vectorized for semantic search capabilities.

4. **Workflow Status Management**: Long-running processes track their state to prevent duplicate operations and enable resumption.

5. **Flexible Interpretation Storage**: Interpretations use dynamic keys to support various topics and categories without schema changes.

## Migration Notes and Future Considerations

1. **Index Optimization**: The system handles duplicate key errors gracefully, falling back to non-unique indexes when unique constraints fail.

2. **Field Name Flexibility**: Some collections support multiple field names (e.g., `analysis` and `categoryAnalysis`) for backward compatibility.

3. **String vs ObjectId**: Chat thread collections store user and chart IDs as strings rather than ObjectIds for flexibility.

4. **Incremental Updates**: Analysis collections support atomic field updates to prevent race conditions during parallel processing.

5. **Pre-calculated Data**: Transit and aspect data is pre-calculated and stored for performance optimization.

## Performance Considerations

- Connection pooling is configured for high-throughput operations
- Indexes are created on all foreign key references and frequently queried fields
- Date-based indexes support efficient time-range queries for transit data
- Compound indexes optimize complex query patterns

## Data Integrity

- Unique constraints on user emails prevent duplicates
- Upsert operations ensure idempotent data creation
- Retry mechanisms handle transient connection issues
- Atomic updates prevent data corruption during concurrent operations