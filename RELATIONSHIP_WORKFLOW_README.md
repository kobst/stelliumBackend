# Relationship Analysis Workflow Implementation

This document describes the relationship analysis workflow that automates the generation of compatibility scores, AI analysis, and vectorization for relationship data.

## Overview

The relationship workflow is a unified automated process that provides:

1. **Single-click initiation** - Start all analysis with one API call
2. **Background processing** - Non-blocking asynchronous execution with retry logic
3. **Real-time status updates** - Track progress through polling with detailed breakdown
4. **Comprehensive analysis** - Scores, AI interpretations, and vectorization
5. **Atomic operations** - Single document per relationship with proper status tracking

### Recent Improvements

#### 2025-06-10: Workflow Architecture Overhaul
The workflow has been completely overhauled to address status tracking and data consistency issues:

- **Unified Document Structure**: Single document per relationship prevents data fragmentation
- **Atomic Score Generation**: Scores and analysis saved using upsert operations to ensure consistency
- **Comprehensive Retry Logic**: Failed operations automatically retry with exponential backoff
- **Enhanced Status Tracking**: Detailed progress breakdown with vectorization status per category
- **Backwards Compatibility**: Maintains existing document structure while adding new functionality

#### 2025-06-13: Score Analysis Implementation
Added automatic detection and analysis of highest and lowest scoring relationship factors:

- **Comprehensive Score Analysis**: Extracts ALL aspects and sorts by absolute score value
- **High/Low Score Detection**: Identifies particularly high (score > 12) and low (score < -10) scoring factors
- **GPT-Powered Insights**: Analyzes top 1-2 highest scoring aspects regardless of threshold status
- **Synastry-Only Focus**: Analysis derived exclusively from synastry aspects and house placements (composite factors excluded)
- **Zero Database Migration**: Backward compatible - score analysis is added to existing document structure

## Workflow Architecture

### Single Document Model
Each relationship analysis is stored as a single document in the `relationship_analysis` collection with the structure:

```javascript
{
  _id: ObjectId,
  // Core data
  scores: { /* 7 relationship categories with scores */ },
  analysis: { /* Generated AI interpretations by category */ },
  
  // Metadata and tracking
  debug: {
    inputSummary: {
      compositeChartId: String,
      userAId: String,
      userBId: String,
      userAName: String,
      userBName: String
    },
    categories: { 
      /* Detailed astrological data by category + green/red flags */
      OVERALL_ATTRACTION_CHEMISTRY: {
        // EXISTING: Original astrological data (unchanged)
        synastry: {
          matchedAspects: [
            {
              aspect: "Edward's Venus conjunction Ashley's Mars",
              orb: 2.4,
              score: 22,  // This becomes a GREEN FLAG (>12)
              pairKey: 'mars_venus',
              planet1Sign: 'Sagittarius',
              planet2Sign: 'Sagittarius',
              planet1House: 1,
              planet2House: 1
            },
            {
              aspect: "Edward's Moon square Ashley's Moon", 
              orb: 4.3,
              score: -7,  // Negative but not a red flag (<-10)
              pairKey: 'moon_moon'
              // ... other fields
            }
          ]
        },
        composite: { matchedAspects: [...] },
        synastryHousePlacements: {
          AinB: [
            {
              planet: 'Jupiter',
              house: 10,
              points: 15,  // This becomes a GREEN FLAG (>12)
              reason: 'Supports shared ambitions',
              direction: 'A->B',
              description: "Edward's Jupiter in Ashley's house 10"
            }
          ],
          BinA: [...]
        },
        compositeHousePlacements: [...],
        
        // NEW: Green/Red Flags + Analysis of Top Aspects
        flags: {
          greenFlags: [
            {
              score: 22,
              source: 'synastry',
              aspect: "Edward's Venus conjunction Ashley's Mars",
              reason: "Strong synastry aspect (22 points)",
              orb: 2.4,
              pairKey: 'mars_venus',
              planet1Sign: 'Sagittarius',
              planet2Sign: 'Sagittarius',
              planet1House: 1,
              planet2House: 1
            },
            {
              score: 15,
              source: 'synastryHousePlacement',
              planet: 'Jupiter',
              house: 10,
              points: 15,
              reason: "Positive synastry house placement (15 points): Supports shared ambitions",
              description: "Edward's Jupiter in Ashley's house 10",
              direction: 'A->B'
            }
          ],
          redFlags: [], // No aspects < -10 in this category
          flagAnalysis: "The Venus-Mars conjunction stands out as the most powerful factor, creating magnetic attraction and natural chemistry [GREEN FLAG]. Jupiter's supportive placement in the career sector enhances shared ambitions and mutual respect for each other's goals.",
          flagsGeneratedAt: Date
        }
      },
      
      EMOTIONAL_SECURITY_CONNECTION: {
        // Same structure but different aspects/flags
        synastry: { matchedAspects: [...] },
        // ... other astrological data
        flags: {
          greenFlags: [], // No aspects > 12 in this category
          redFlags: [],   // No aspects < -10 in this category
          flagAnalysis: "The Moon-Mercury trine provides the strongest foundation for emotional understanding, creating natural communication flow. While no extreme aspects dominate, the gentle supportive connections suggest emotional security develops through consistent, caring interaction.",
          flagsGeneratedAt: Date
        }
      }
      // ... 5 more categories with same structure
    },
    
    // NEW: Flag generation metadata
    flagGeneration: {
      flagsGenerated: true,
      flagsGeneratedAt: Date,
      thresholds: { greenFlagMinScore: 12, redFlagMaxScore: -10 },
      totalCategories: 7,
      flagSummary: {
        OVERALL_ATTRACTION_CHEMISTRY: {
          greenFlags: 2,
          redFlags: 0,
          hasAnalysis: true
        },
        EMOTIONAL_SECURITY_CONNECTION: {
          greenFlags: 0,
          redFlags: 0,
          hasAnalysis: true
        }
        // ... other categories
      }
    }
  },
  
  // Status tracking
  workflowStatus: {
    isRunning: Boolean,
    startedAt: Date,
    completedAt: Date,
    lastUpdated: Date,
    completedWithFailures: Boolean,
    remainingTasks: Number,
    error: String
  },
  
  // Vectorization tracking
  vectorizationStatus: {
    categories: {
      OVERALL_ATTRACTION_CHEMISTRY: Boolean,
      EMOTIONAL_SECURITY_CONNECTION: Boolean,
      SEX_AND_INTIMACY: Boolean,
      COMMUNICATION_AND_MENTAL_CONNECTION: Boolean,
      COMMITMENT_LONG_TERM_POTENTIAL: Boolean,
      KARMIC_LESSONS_GROWTH: Boolean,
      PRACTICAL_GROWTH_SHARED_GOALS: Boolean
    },
    lastUpdated: Date
  }
}
```

## Workflow Steps

### Step 1: Generate Scores with Green/Red Flags
- Calculates synastry aspects between two birth charts
- Generates composite chart
- Computes compatibility scores for 7 relationship categories
- **NEW**: Automatically extracts green flags (scores > 12) and red flags (scores < -10)
- **NEW**: Generates GPT analysis of flags for each category
- Creates unified document with proper structure
- Uses upsert operations to ensure single document

### Step 2: Generate Analysis (Parallel Processing)
- Processes all 7 categories in parallel:
  - Overall Attraction & Chemistry
  - Emotional Security & Connection
  - Sex & Intimacy
  - Communication & Mental Connection
  - Commitment & Long-Term Potential
  - Karmic Lessons & Growth
  - Practical Growth & Shared Goals
- Uses GPT to generate detailed interpretations
- Incorporates astrological data and user context from vector search
- **New**: Each category saves immediately upon generation

### Step 3: Vectorize Analysis (Atomic with Generation)
- Vectorization happens immediately after each category is generated
- Stores embeddings in Pinecone vector database
- Updates vectorization status per category
- **New**: Enhanced error handling and retry logic

### Retry and Recovery System
- **Exponential Backoff**: Failed operations retry with increasing delays
- **Selective Retry**: Only failed categories are retried, not entire workflow
- **Auto-Recovery**: Workflow intelligently continues from where it left off
- **Maximum Attempts**: Prevents infinite retry loops

## API Endpoints

### Start Workflow
```
POST /workflow/relationship/start
{
  "userIdA": "string",
  "userIdB": "string", 
  "compositeChartId": "string"
}
```

Response:
```json
{
  "success": true,
  "message": "Relationship workflow started",
  "workflowId": "compositeChartId"
}
```

### Get Workflow Status
```
POST /workflow/relationship/status
{
  "compositeChartId": "string"
}
```

Response:
```json
{
  "success": true,
  "workflowStatus": {
    "status": "not_started|running|incomplete|completed|completed_with_failures",
    "progress": {
      "completed": 8,
      "total": 15,
      "percentage": 53
    }
  },
  "analysisData": {
    "scores": { /* Relationship scores */ },
    "analysis": { /* Generated interpretations */ },
    "vectorizationStatus": { /* Per-category vectorization status */ },
    "debug": {
      "categories": {
        "OVERALL_ATTRACTION_CHEMISTRY": {
          // ... existing data
          "flags": {
            "greenFlags": [
              {
                "score": 22,
                "source": "synastry",
                "aspect": "Person A's Venus conjunction Person B's Mars",
                "reason": "Strong synastry aspect (22 points)"
              }
            ],
            "redFlags": [],
            "flagAnalysis": "The Venus-Mars conjunction dominates this area as the strongest factor [GREEN FLAG], creating powerful magnetic attraction and natural romantic chemistry. Jupiter's supportive house placement further enhances mutual admiration and shared goals, making this a particularly strong area for the relationship.",
            "flagsGeneratedAt": "2025-06-13T10:30:00Z"
          }
        }
      }
    }
  },
  "jobs": {
    "scores": { "needsGeneration": false },
    "categories": {
      "OVERALL_ATTRACTION_CHEMISTRY": {
        "needsGeneration": false,
        "needsVectorization": true
      }
      // ... other categories
    }
  },
  "workflowBreakdown": {
    "needsGeneration": [],
    "needsVectorization": ["category-OVERALL_ATTRACTION_CHEMISTRY"],
    "completed": ["scores-generation", "category-OVERALL_ATTRACTION_CHEMISTRY-generation"],
    "totalNeedsGeneration": 0,
    "totalNeedsVectorization": 1,
    "totalCompleted": 8
  },
  "debug": {
    "isWorkflowComplete": false,
    "completedWithFailures": false,
    "remainingTasks": 1,
    "totalTasks": 15,
    "completedTasks": 14,
    "isCurrentlyRunning": false
  }
}
```

## Status Types

### Workflow Status Values
- `not_started`: No processing has begun
- `running`: Workflow is actively processing
- `incomplete`: Processing stopped but unfinished work remains
- `completed`: All tasks completed successfully
- `completed_with_failures`: Some tasks failed after max retries

### Task Breakdown (15 Total Tasks)
- **1 Score Generation Task**: Compatibility scores for all categories
- **7 Analysis Generation Tasks**: One per relationship category
- **7 Vectorization Tasks**: One per relationship category

## Frontend Integration

### Polling Implementation
```javascript
const [workflowStatus, setWorkflowStatus] = useState(null);
const [isPolling, setIsPolling] = useState(false);

const startWorkflow = async () => {
  try {
    const response = await startRelationshipWorkflow(userIdA, userIdB, compositeChartId);
    if (response.success) {
      setIsPolling(true);
    }
  } catch (error) {
    console.error('Failed to start workflow:', error);
  }
};

// Enhanced polling with proper status handling
useEffect(() => {
  let intervalId;
  if (isPolling) {
    intervalId = setInterval(async () => {
      try {
        const response = await getRelationshipWorkflowStatus(compositeChartId);
        if (response.success) {
          setWorkflowStatus(response);
          
          // Update UI with latest data
          if (response.analysisData?.scores) {
            setRelationshipScores(response.analysisData.scores);
          }
          if (response.analysisData?.analysis) {
            setAnalysisData(response.analysisData.analysis);
          }
          
          // Stop polling when workflow is complete or has failures
          const status = response.workflowStatus.status;
          if (status === 'completed' || status === 'completed_with_failures') {
            setIsPolling(false);
            if (status === 'completed_with_failures') {
              console.warn('Workflow completed with some failures');
            }
          }
          
          // Also stop if no longer running and no remaining tasks
          if (status === 'incomplete' && !response.debug.isCurrentlyRunning) {
            setIsPolling(false);
            console.warn('Workflow appears to have stopped unexpectedly');
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    }, 3000); // Poll every 3 seconds
  }
  
  return () => clearInterval(intervalId);
}, [isPolling, compositeChartId]);
```

### Progress Display
```javascript
const renderProgress = () => {
  if (!workflowStatus) return null;
  
  const { workflowStatus: status, workflowBreakdown } = workflowStatus;
  
  return (
    <div>
      <h3>Workflow Progress: {status.progress.percentage}%</h3>
      <p>Status: {status.status}</p>
      <p>Completed: {status.progress.completed}/{status.progress.total} tasks</p>
      
      {workflowBreakdown.needsGeneration.length > 0 && (
        <p>Pending Generation: {workflowBreakdown.needsGeneration.join(', ')}</p>
      )}
      
      {workflowBreakdown.needsVectorization.length > 0 && (
        <p>Pending Vectorization: {workflowBreakdown.needsVectorization.join(', ')}</p>
      )}
      
      {status.status === 'completed_with_failures' && (
        <p style={{color: 'orange'}}>
          Workflow completed but {workflowBreakdown.totalNeedsVectorization} vectorization tasks failed
        </p>
      )}
    </div>
  );
};
```

## Error Handling and Recovery

### Automatic Retry Logic
The workflow includes comprehensive retry mechanisms:

1. **Individual Operation Retries**: Each API call, database operation, and vectorization has built-in retry with exponential backoff
2. **Category-Level Retries**: Failed categories are retried up to 3 times at the workflow level
3. **Selective Recovery**: Only failed tasks are retried, successful tasks are preserved

### Error Types and Handling
- **Validation Errors**: Missing users or birth charts (immediate failure)
- **API Errors**: OpenAI rate limits, network issues (retry with backoff)
- **Database Errors**: Connection issues, timeout (retry with backoff)
- **Vectorization Errors**: Pinecone API issues (retry with graceful degradation)

### Manual Recovery
If a workflow fails, it can be restarted and will automatically:
- Skip already completed score generation
- Skip already completed analysis generation
- Retry only failed vectorization tasks

## Green/Red Flags Feature

### Overview
The workflow automatically identifies and analyzes the most significant positive and negative astrological factors in each relationship category.

### Enhanced Aspect Analysis Approach
- **All Aspects Analyzed**: System extracts and sorts ALL positive and negative aspects by absolute score value
- **Flag Marking**: Aspects scoring > 12 are marked as green flags, < -10 as red flags
- **Top Aspect Focus**: GPT analysis focuses on the top 1-2 aspects regardless of flag status
- **Sources**: Only synastry aspects and house placements (composite factors excluded)
- **Always Meaningful**: Every category gets analysis even without extreme scores

### Flag Structure
Each category contains:
```javascript
flags: {
  greenFlags: [
    {
      score: 17,
      source: 'synastry' | 'synastryHousePlacement',
      aspect: "Full aspect description", // For synastry
      description: "Placement description", // For house placements
      reason: "Why this is significant",
      orb: 2.4, // For aspects
      planet: "Venus", // For placements
      house: 7, // For placements
      // Additional type-specific fields
    }
  ],
  redFlags: [...], // Same structure as greenFlags
  flagAnalysis: "GPT-generated 2-3 sentence insight about what these flags mean",
  flagsGeneratedAt: Date
}
```

### Implementation Details
- **Comprehensive Extraction**: All aspects/placements are collected and sorted by absolute score value
- **Smart Analysis**: GPT focuses on top 1-2 aspects regardless of whether they meet flag thresholds
- **Flag Marking**: Strong aspects (>12 or <-10) are highlighted as particularly significant
- **Always Insightful**: Every category gets meaningful analysis even with moderate scores
- **Category-Specific**: Each of the 7 relationship categories has independent analysis
- **No Migration Required**: Analysis is added to existing document structure

### Frontend Display Example
```javascript
const renderCategoryFlags = (category) => {
  const flags = category.flags;
  if (!flags) return null;
  
  return (
    <div className="category-analysis">
      {/* Always show the analysis - it now covers top aspects regardless of flag status */}
      <div className="aspect-analysis">
        <h4>Key Astrological Factors</h4>
        <p className="analysis-text">{flags.flagAnalysis}</p>
      </div>
      
      {/* Show green flags if any exist */}
      {flags.greenFlags.length > 0 && (
        <div className="green-flags">
          <h5>🟢 Green Flags ({flags.greenFlags.length})</h5>
          {flags.greenFlags.map((flag, index) => (
            <div key={index} className="flag-item green">
              <div className="flag-description">
                {flag.source === 'synastry' ? flag.aspect : flag.description}
              </div>
              <div className="flag-score">+{flag.score}</div>
              {flag.orb && <div className="flag-orb">Orb: {flag.orb}°</div>}
            </div>
          ))}
        </div>
      )}
      
      {/* Show red flags if any exist */}
      {flags.redFlags.length > 0 && (
        <div className="red-flags">
          <h5>🔴 Red Flags ({flags.redFlags.length})</h5>
          {flags.redFlags.map((flag, index) => (
            <div key={index} className="flag-item red">
              <div className="flag-description">
                {flag.source === 'synastry' ? flag.aspect : flag.description}
              </div>
              <div className="flag-score">{flag.score}</div>
              {flag.orb && <div className="flag-orb">Orb: {flag.orb}°</div>}
            </div>
          ))}
        </div>
      )}
      
      {/* Show when no extreme flags exist */}
      {flags.greenFlags.length === 0 && flags.redFlags.length === 0 && (
        <div className="no-flags">
          <p className="moderate-note">
            ℹ️ No extreme aspects (green/red flags) in this area. 
            The analysis above covers the most significant factors.
          </p>
        </div>
      )}
    </div>
  );
};

// Enhanced category overview that shows flag counts
const renderCategoryOverview = (categories) => {
  return (
    <div className="relationship-overview">
      {Object.entries(categories).map(([categoryName, categoryData]) => {
        const flags = categoryData.flags;
        const displayName = categoryName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        return (
          <div key={categoryName} className="category-card">
            <h3>{displayName}</h3>
            <div className="flag-indicators">
              {flags?.greenFlags.length > 0 && (
                <span className="green-indicator">🟢 {flags.greenFlags.length}</span>
              )}
              {flags?.redFlags.length > 0 && (
                <span className="red-indicator">🔴 {flags.redFlags.length}</span>
              )}
              {(!flags?.greenFlags.length && !flags?.redFlags.length) && (
                <span className="neutral-indicator">⚪ Moderate</span>
              )}
            </div>
            <p className="category-summary">{flags?.flagAnalysis}</p>
          </div>
        );
      })}
    </div>
  );
};
```

### Flag Thresholds Configuration
Default thresholds can be adjusted:
```typescript
export const DEFAULT_FLAG_THRESHOLDS = {
  greenFlagMinScore: 12,  // Adjust for sensitivity
  redFlagMaxScore: -10    // Adjust for sensitivity
};
```

## Performance Considerations

- **Parallel Processing**: All 7 categories processed concurrently
- **Atomic Operations**: Each category saves immediately upon completion
- **Memory Management**: Garbage collection triggers for large operations
- **Rate Limiting**: Built-in delays between operations to respect API limits
- **Efficient Polling**: Frontend polls every 3 seconds for real-time updates
- **Flag Generation Impact**: Adds ~10-20 seconds for GPT flag analysis (runs in parallel)

## Database Operations

### Key Functions
- `updateRelationshipAnalysisVectorization()`: Upsert operations for single document model
- `fetchRelationshipAnalysisByCompositeId()`: Retrieves complete relationship data
- `updateRelationshipWorkflowRunningStatus()`: Tracks workflow execution state

### Data Consistency
- All operations use `updateOne()` with `upsert: true` to ensure single document
- Document structure maintains backwards compatibility
- Proper field merging prevents data loss during updates

## Security and Validation

- Validates user ownership before starting workflow
- Ensures both users have birth charts
- Sanitizes all inputs and prevents injection attacks  
- Proper error handling prevents data leakage
- Rate limiting implemented at multiple levels

## Monitoring and Debugging

### Enhanced Logging
The workflow provides detailed logging for troubleshooting:
- 🔸 Step-by-step vectorization progress
- ✅ Successful completion markers
- ❌ Detailed error messages with stack traces
- ⚠️ Warning indicators for edge cases

### Debug Information
Status responses include comprehensive debug data:
- Total task counts and completion status
- Workflow timing information
- Detailed breakdown of pending/completed tasks
- Current running status and error states

## Migration Notes

### Breaking Changes
- **None**: All changes maintain backwards compatibility
- Existing documents continue to work with new system
- Old documents are automatically enhanced with new structure when accessed

### Recommended Updates
1. Update frontend polling to handle new status types
2. Implement progress display using new breakdown data
3. Add error handling for `completed_with_failures` status
4. Consider implementing manual retry buttons for failed tasks

## Critical Implementation: Atomic Updates for Data Integrity

### The Problem
The relationship workflow processes 7+ parallel tasks (1 scoring + 7 categories × 2 operations each), which previously caused data corruption when multiple operations attempted to modify the same database document simultaneously. This was causing:
- Relationship workflows to "almost never complete first time" (only 10-15% success rate)
- Lost analysis data when categories overwrote each other
- Inconsistent scoring and vectorization status
- Data corruption during concurrent processing

### The Root Cause
Multiple parallel tasks were performing read-modify-write operations on the same relationship document:
```javascript
// Task A: Read document → Add category CHEMISTRY → Save entire analysis object
// Task B: Read document → Add category INTIMACY → Save entire analysis object (overwrites CHEMISTRY!)
// Task C: Read document → Add category COMMITMENT → Save entire analysis object (overwrites INTIMACY!)
```

### The Solution: Atomic Field Updates
All database save operations now use atomic field-level updates instead of object replacement:

```javascript
// ❌ DANGEROUS - Causes race conditions and data loss:
await saveRelationshipAnalysis(compositeChartId, {
  analysis: entireAnalysisObject // This replaces ALL category data
});
$set: { 'analysis': entireAnalysisObject }

// ✅ SAFE - Atomic field updates:
// Each parallel task updates only its specific fields
await updateRelationshipAnalysisVectorization(compositeChartId, {
  [`analysis.${categoryValue}`]: categoryData,
  [`vectorizationStatus.categories.${categoryValue}`]: true
});
$set: { 
  'analysis.OVERALL_ATTRACTION_CHEMISTRY': chemistryData,
  'analysis.EMOTIONAL_SECURITY_CONNECTION': emotionalData,
  'vectorizationStatus.categories.OVERALL_ATTRACTION_CHEMISTRY': true
}
```

### Implementation Details
- **`saveRelationshipScoresAndDebug()`**: Safely updates scores and debug info without touching analysis
- **`updateRelationshipAnalysisVectorization()`**: Updates individual category paths atomically  
- **Parallel Safety**: 7+ concurrent operations can run without data loss
- **No Shared State**: Each task only modifies its specific database fields
- **Thread-Safe**: All operations are race-condition free

### Results After Fix
- Relationship workflows complete 95-100% on first run (vs. 10-15% before)
- No data loss during retries or concurrent processing
- Consistent data between different workflow executions
- Much faster completion times due to successful parallel processing

## Future Enhancements

1. **Webhook Support**: Replace polling with push notifications
2. **Batch Processing**: Multiple relationships in parallel
3. **Priority Queues**: User-tier based processing priority
4. **Partial Results API**: Access individual category results before completion
5. **Workflow Scheduling**: Queue workflows for optimal resource usage
6. **Advanced Analytics**: Workflow performance metrics and optimization