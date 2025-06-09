# Analysis Generation Flow

This document describes how Stellium Backend generates astrological analyses from raw ephemeris data, covering both individual birth charts and relationship analyses.

## Overview

The system transforms Swiss Ephemeris calculations into personalized astrological interpretations through a **unified generate→vectorize→update** pipeline:

1. **Raw Calculation** → Swiss Ephemeris computes planetary positions
2. **Pattern Recognition** → Identifies astrological patterns and configurations
3. **Incremental Processing** → Each content piece is generated→vectorized→progress updated immediately
4. **Vector Storage** → Embeddings enable semantic search
5. **Interactive Chat** → Users explore their charts through conversation

## **NEW: Unified Workflow Architecture**

Both birth chart and relationship analyses now use a **single-step workflow** with incremental processing for better user experience and resource management.

## Birth Chart Analysis Pipeline

### **NEW: Single-Step Workflow (processAllContent)**

**API Endpoint:** `POST /workflow/start`

**Workflow Structure:**
```json
{
  "currentStep": "processAllContent",
  "progress": {
    "processAllContent": {
      "status": "running",
      "completed": 15,
      "total": 48,
      "startedAt": "2025-01-08T10:00:00Z"
    }
  }
}
```

**Total Content Pieces:** ~48 items
- Overview (1)
- Dominance patterns (4): elements, modalities, quadrants, patterns  
- Planets (13): Sun through Midheaven
- Topic analysis (~30): Various life areas and subtopics

### **Processing Flow: Generate → Vectorize → Update**

Each content piece follows this pattern:

1. **Generate Content**
   - Call appropriate GPT function
   - Create interpretation text

2. **Vectorize Immediately**
   - Split into semantic chunks
   - Generate embeddings
   - Store in Pinecone

3. **Update Progress**
   - Increment completed count
   - Update database status
   - Log completion

4. **Resource Management**
   - 2-second delay between items
   - Memory monitoring and cleanup
   - Garbage collection when needed

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

### 2. Content Generation Details

#### Overview Section (Item 1/48)
- Extracts Sun, Moon, and Ascendant positions
- Identifies tight aspects (orb < 2°)
- Generates coded references (e.g., `Pp-SusTa01` = Sun in Taurus, 1st house)
- GPT creates holistic personality synthesis
- **Immediately vectorized and progress updated**

#### Dominance Patterns (Items 2-5/48)
- **Elements (2/48)**: Fire, Earth, Air, Water distribution
- **Modalities (3/48)**: Cardinal, Fixed, Mutable qualities
- **Quadrants (4/48)**: Spatial emphasis in chart
- **Patterns (5/48)**: Chart configurations and aspects
- Each pattern: generate→vectorize→update progress

#### Planet-by-Planet Analysis (Items 6-18/48)
For each of 13 celestial bodies:
1. Gather position data (sign, house, retrograde)
2. List all aspects within orb
3. Generate coded descriptions
4. GPT interprets within birth chart context
5. **Immediately vectorize and update progress**

#### Topic Analysis (Items 19-48/48)
Each subtopic is processed individually:

Maps 7 life areas to relevant chart factors:
- **Self-Expression** → Sun, Moon, Ascendant, 1st house
- **Relationships** → Venus, Mars, 5th/7th houses
- **Career** → Saturn, Jupiter, MC, 10th house
- **Communication** → Mercury, 3rd house
- **Resources** → 2nd/8th houses, Venus
- **Growth** → Jupiter, 9th house, North Node
- **Challenges** → Saturn, Pluto, 12th house

**Processing Flow per Subtopic:**
1. Generate subtopic interpretation via GPT
2. **Immediately vectorize** the content
3. **Update progress** (completed++)
4. **2-second delay** before next subtopic
5. Save to database

## Relationship Analysis Pipeline

### **NEW: Single-Step Workflow (processRelationshipAnalysis)**

**API Endpoint:** `POST /relationship-workflow/start`

**Workflow Structure:**
```json
{
  "currentStep": "processRelationshipAnalysis",
  "progress": {
    "processRelationshipAnalysis": {
      "status": "running", 
      "completed": 3,
      "total": 8,
      "startedAt": "2025-01-08T10:00:00Z"
    }
  }
}
```

**Total Items:** 8 pieces
- Relationship scoring (1)
- Seven relationship categories (7): each generated→vectorized→updated

### **Processing Flow: Score → Generate → Vectorize → Update**

Each relationship analysis follows this pattern:

1. **Generate Scores First**
   - Calculate synastry aspects
   - Generate composite chart
   - Score compatibility across 7 categories
   - Update progress (1/8)

2. **For Each Category:**
   - Generate interpretation via GPT
   - **Immediately vectorize** content
   - **Update progress** (completed++)
   - **2-second delay** + memory cleanup

### 1. Data Preparation

#### Synastry Calculation
- Cross-references planets between two charts
- Identifies inter-chart aspects
- Calculates house overlays

#### Composite Chart
- Calculates midpoints between same planets
- Creates unified "relationship chart"
- Handles missing birth times appropriately

### 2. Compatibility Scoring (Item 1/8)

The scoring system (`relationshipScoring.ts`) evaluates:

#### Seven Categories
1. **Overall Attraction & Chemistry** (Item 2/8)
2. **Emotional Security & Connection** (Item 3/8)
3. **Sex & Intimacy** (Item 4/8)
4. **Communication & Mental Connection** (Item 5/8)
5. **Commitment & Long-Term Potential** (Item 6/8)
6. **Karmic Lessons & Growth** (Item 7/8)
7. **Practical Growth & Shared Goals** (Item 8/8)

#### Scoring Methodology
- Each category has specific aspect patterns
- Multiple scoring profiles (e.g., `STRONG_POSITIVE_BALANCE`, `DEEP_EMOTIONAL_BOND`)
- Combines synastry (70-80%) + composite (20-30%)
- Normalizes against statistical distribution

### 3. Category Analysis Generation (Items 2-8/8)

**Per Category Processing:**
1. Retrieve individual birth chart contexts for both users
2. Filter contexts by category relevance
3. Format astrological details for the category
4. **Generate interpretation** via GPT
5. **Immediately vectorize** the content
6. **Update progress** and save to database
7. **2-second delay** + memory management

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

### **UPDATED: Simplified Text Processing Pipeline**

1. **Chunking**
   - Splits at sentence boundaries
   - Target size: 900 characters
   - Minimum size: 50 characters (reduced)
   - Preserves semantic coherence

2. **~~Tagging~~ (REMOVED)**
   - ~~GPT-4 generates topic tags~~ **Removed for performance**
   - ~~Maintains astrological context~~
   - ~~Creates hierarchical references~~

3. **Embedding**
   - OpenAI's text-embedding-ada-002
   - 1536-dimensional vectors
   - Stored in Pinecone with retry logic and timeouts

### **UPDATED: Storage Structure**
```typescript
{
  namespace: userId || compositeChartId,
  metadata: {
    text: "original content",
    description: "contextual description",
    // topics: REMOVED for performance
    category: "birthChartAnalysis",
    section: "planets",
    chunk_index: 0
  }
}
```

### **Performance Improvements**
- **Removed topic classification** to eliminate GPT bottleneck
- **Added timeouts**: 20s for embeddings, 60s for upserts
- **Retry logic**: 3 attempts with exponential backoff
- **Memory management**: Garbage collection after operations

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

## **UPDATED: Data Flow Summary**

### Birth Chart Analysis
```
Swiss Ephemeris Calculation
         ↓
    Chart Data Structure
         ↓
    Pattern Recognition
         ↓
┌────────────────────────────────────┐
│  FOR EACH CONTENT PIECE (1-48):   │
│  1. GPT Interpretation             │
│  2. Vector Embedding               │
│  3. Pinecone Storage               │
│  4. Progress Update                │
│  5. 2s Delay + Memory Cleanup      │
└────────────────────────────────────┘
         ↓
    Semantic Search Ready
         ↓
    Interactive Chat
```

### Relationship Analysis
```
User A + User B Birth Charts
         ↓
  Synastry + Composite Calculation
         ↓
    Compatibility Scoring
         ↓
┌────────────────────────────────────┐
│  FOR EACH CATEGORY (1-8):         │
│  1. Context Retrieval              │
│  2. GPT Category Analysis          │
│  3. Vector Embedding               │
│  4. Pinecone Storage               │
│  5. Progress Update                │
│  6. 2s Delay + Memory Cleanup      │
└────────────────────────────────────┘
         ↓
    Interactive Relationship Chat
```

## **UPDATED: Design Principles**

1. **Incremental Processing**: Generate→vectorize→update for each piece
2. **Real-time Feedback**: Continuous progress updates for better UX
3. **Resource Management**: Memory cleanup and rate limiting between operations
4. **Error Isolation**: Individual pieces can fail without affecting others
5. **Holistic Synthesis**: Avoids mechanical listing in interpretations
6. **Contextual Awareness**: Maintains element relationships
7. **Flexible Retrieval**: Supports structured and open queries
8. **Traceable References**: ID codes link to source data

## **UPDATED: Usage Examples**

### Start Birth Chart Workflow
```typescript
// NEW: Single unified workflow
POST /workflow/start
{
  "userId": "67f8a0a54edb7d81f72c78da"
}

// Response: immediate workflow start
{
  "success": true,
  "workflowId": "67f8a0a54edb7d81f72c78da",
  "status": {
    "currentStep": "processAllContent",
    "progress": {
      "processAllContent": {
        "status": "running",
        "completed": 0,
        "total": 48
      }
    }
  }
}
```

### Poll Progress
```typescript
// Check workflow status
POST /workflow/status
{
  "userId": "67f8a0a54edb7d81f72c78da"  
}

// Response: real-time progress
{
  "success": true,
  "status": {
    "currentStep": "processAllContent", 
    "progress": {
      "processAllContent": {
        "status": "running",
        "completed": 23,
        "total": 48
      }
    }
  }
}
```

### Start Relationship Workflow
```typescript
// NEW: Single unified relationship workflow
POST /relationship-workflow/start
{
  "userIdA": "userId1",
  "userIdB": "userId2", 
  "compositeChartId": "composite123"
}

// Response: immediate start with progress tracking
{
  "success": true,
  "workflowId": "composite123",
  "status": {
    "currentStep": "processRelationshipAnalysis",
    "progress": {
      "processRelationshipAnalysis": {
        "status": "running",
        "completed": 0,
        "total": 8
      }
    }
  }
}
```

## **Frontend Integration Guide**

### Polling Strategy
```typescript
// Poll every 3 seconds for progress updates
const pollInterval = setInterval(async () => {
  const response = await fetch('/workflow/status', {
    method: 'POST',
    body: JSON.stringify({ userId })
  });
  
  const { status } = await response.json();
  
  // Update progress bar
  const progress = status.progress.processAllContent;
  updateProgressBar(progress.completed, progress.total);
  
  // Check completion
  if (status.status === 'completed') {
    clearInterval(pollInterval);
    onWorkflowComplete();
  }
}, 3000);
```

### Progress Display
```typescript
// Show granular progress with descriptive text
const getProgressText = (completed, total) => {
  if (completed <= 5) return "Analyzing chart patterns...";
  if (completed <= 18) return "Interpreting planetary influences...";
  if (completed <= 48) return "Generating life area insights...";
  return "Finalizing analysis...";
};
```

This **unified workflow architecture** provides better user experience through continuous feedback while maintaining technical accuracy and improving resource management in serverless environments.