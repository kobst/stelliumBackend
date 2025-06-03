# Analysis Generation Flow

This document describes how Stellium Backend generates astrological analyses from raw ephemeris data, covering both individual birth charts and relationship analyses.

## Overview

The system transforms Swiss Ephemeris calculations into personalized astrological interpretations through a multi-stage pipeline:

1. **Raw Calculation** → Swiss Ephemeris computes planetary positions
2. **Pattern Recognition** → Identifies astrological patterns and configurations
3. **AI Interpretation** → GPT-4 generates contextual analyses
4. **Vector Storage** → Embeddings enable semantic search
5. **Interactive Chat** → Users explore their charts through conversation

## Birth Chart Analysis Pipeline

### 1. Data Generation

The ephemeris service (`ephemerisDataService.ts`) calculates:
- Planetary positions (longitude, sign, house)
- Aspects between planets (with orbs)
- House cusps (12 houses or equal houses if no birth time)

Output structure:
```typescript
{
  planets: [
    { name: "Sun", sign: "Taurus", degree: 15.5, house: 10, is_retro: "false" }
  ],
  aspects: [
    { aspectingPlanet: "Sun", aspectedPlanet: "Moon", aspectType: "trine", orb: 2.3 }
  ],
  houses: [
    { house: 1, sign: "Aries", degree: 0 }
  ]
}
```

### 2. Basic Analysis Generation

The `handleBirthChartAnalysis` function creates:

#### Overview Section
- Extracts Sun, Moon, and Ascendant positions
- Identifies tight aspects (orb < 2°)
- Generates coded references (e.g., `Pp-SusTa01` = Sun in Taurus, 1st house)
- GPT creates holistic personality synthesis

#### Dominance Patterns
- **Elemental Balance**: Fire, Earth, Air, Water distribution
- **Modal Balance**: Cardinal, Fixed, Mutable qualities
- **Spatial Balance**: Quadrant emphasis in chart
- Each pattern receives descriptive text + GPT interpretation

#### Planet-by-Planet Analysis
For each of 12 celestial bodies:
1. Gather position data (sign, house, retrograde)
2. List all aspects within orb
3. Generate coded descriptions
4. GPT interprets within birth chart context

### 3. Topic Analysis Generation

The `handleBirthChartTopicAnalysis` function provides focused insights:

#### Topic Mapping
Maps 7 life areas to relevant chart factors:
- **Self-Expression** → Sun, Moon, Ascendant, 1st house
- **Relationships** → Venus, Mars, 5th/7th houses
- **Career** → Saturn, Jupiter, MC, 10th house
- **Communication** → Mercury, 3rd house
- **Resources** → 2nd/8th houses, Venus
- **Growth** → Jupiter, 9th house, North Node
- **Challenges** → Saturn, Pluto, 12th house

#### Processing Flow
1. Each topic has 4-5 subtopics
2. Vector search retrieves relevant context
3. GPT generates focused interpretation
4. Results stored for future queries

## Relationship Analysis Pipeline

### 1. Data Preparation

#### Synastry Calculation
- Cross-references planets between two charts
- Identifies inter-chart aspects
- Calculates house overlays

#### Composite Chart
- Calculates midpoints between same planets
- Creates unified "relationship chart"
- Handles missing birth times appropriately

### 2. Compatibility Scoring

The scoring system (`relationshipScoring.ts`) evaluates:

#### Seven Categories
1. **Overall Attraction & Chemistry**
2. **Emotional Security & Connection**
3. **Sex & Intimacy**
4. **Communication & Mental Connection**
5. **Commitment & Long-Term Potential**
6. **Karmic Lessons & Growth**
7. **Practical Growth & Shared Goals**

#### Scoring Methodology
- Each category has specific aspect patterns
- Multiple scoring profiles (e.g., `STRONG_POSITIVE_BALANCE`, `DEEP_EMOTIONAL_BOND`)
- Combines synastry (70-80%) + composite (20-30%)
- Normalizes against statistical distribution

### 3. Analysis Generation

The `generateRelationshipPrompt` function:
1. Retrieves individual analyses for both users
2. Filters by relationship category relevance
3. Constructs comprehensive prompt with:
   - Relationship scores
   - Key astrological factors
   - Individual context
4. GPT generates integrated analysis

## GPT Integration Layer

### Prompt Strategy

#### Birth Chart Prompts
- System role: "You are StelliumAI, an expert in natal chart interpretation"
- Emphasizes synthesis over mechanical listing
- Requires warm, empowering tone
- Includes ID codes for traceability

#### Relationship Prompts
- Focuses on chart interaction dynamics
- Addresses individual needs within relationship
- Provides practical guidance

### Key Functions
- `getCompletionShortOverview()` - Core identity synthesis
- `getCompletionForNatalPlanet()` - Planet-specific analysis
- `getCompletionForDominancePattern()` - Pattern interpretation
- `getCompletionForRelationshipCategory()` - Relationship insights

## Vector Storage System

### Text Processing Pipeline

1. **Chunking**
   - Splits at sentence boundaries
   - Target size: 900 characters
   - Minimum size: 200 characters
   - Preserves semantic coherence

2. **Tagging**
   - GPT-4 generates topic tags
   - Maintains astrological context
   - Creates hierarchical references

3. **Embedding**
   - OpenAI's text-embedding-ada-002
   - 1536-dimensional vectors
   - Stored in Pinecone

### Storage Structure
```typescript
{
  namespace: userId || compositeChartId,
  metadata: {
    text: "original content",
    description: "contextual description",
    topics: ["Self-Expression", "Career"],
    category: "birthChartAnalysis",
    section: "planets"
  }
}
```

## Interactive Chat System

### Birth Chart Chat
1. Query expansion via GPT
2. Vector similarity search (top 2-5 results)
3. Context assembly from matches
4. GPT response generation
5. Conversation persistence

### Relationship Chat
1. Triple-context query expansion:
   - Relationship dynamics
   - User A traits
   - User B traits
2. Parallel vector searches
3. Integrated response generation

## Configuration Architecture

### Astrological Mappings (`constants.ts`)
- Planet codes: `Sun → 'Su'`, `Moon → 'Mo'`
- Sign codes: `Aries → 'Ar'`, `Taurus → 'Ta'`
- Aspect classifications by orb
- House/ruler relationships

### Scoring Configuration
- Aspect weights by category
- Synastry/composite ratios
- Statistical normalization parameters

## Data Flow Summary

```
Swiss Ephemeris Calculation
         ↓
    Chart Data Structure
         ↓
    Pattern Recognition
         ↓
     GPT Interpretation
         ↓
    Text Chunking & Tagging
         ↓
     Vector Embedding
         ↓
    Semantic Search
         ↓
    Interactive Chat
```

## Design Principles

1. **Layered Abstraction**: Each stage adds interpretive depth
2. **Holistic Synthesis**: Avoids mechanical listing
3. **Contextual Awareness**: Maintains element relationships
4. **Flexible Retrieval**: Supports structured and open queries
5. **Traceable References**: ID codes link to source data

## Usage Examples

### Generate Birth Chart Analysis
```typescript
// Full analysis with all sections
await handleBirthChartAnalysis(userId, birthData);

// Topic-focused analysis
await handleBirthChartTopicAnalysis(userId);
```

### Generate Relationship Analysis
```typescript
// Complete relationship analysis
await generateRelationshipLLMPrompts(userId1, userId2);

// Query specific relationship aspect
await handleProcessUserQueryForRelationshipAnalysis(
  userId1, 
  userId2, 
  "How do we communicate?"
);
```

This architecture enables transformation of complex astronomical calculations into accessible, personalized astrological insights while maintaining technical accuracy and interpretive depth.