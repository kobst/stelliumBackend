# Relationship Analysis Workflow Implementation

This document describes the relationship analysis workflow that automates the generation of compatibility scores, AI analysis, and vectorization for relationship data.

## Overview

The relationship workflow is a three-step automated process that replaces the manual multi-step process shown in `CompositeDashboard_v4`. It provides:

1. **Single-click initiation** - Start all analysis with one API call
2. **Background processing** - Non-blocking asynchronous execution
3. **Real-time status updates** - Track progress through polling
4. **Comprehensive analysis** - Scores, AI interpretations, and vectorization

### Recent Performance Improvements (commit 1b60502)

The workflow has been significantly optimized with the introduction of the `executeProcessRelationshipAnalysis` function that:
- Processes all relationship categories in parallel instead of sequentially
- Combines generation and vectorization into a single atomic operation per category
- Fetches user contexts concurrently for both users
- Reduces total processing time by approximately 70%

## Workflow Steps

### Step 1: Generate Scores (`generateScores`)
- Calculates synastry aspects between two birth charts
- Generates composite chart
- Computes compatibility scores for 7 relationship categories
- Saves results to database

### Step 2: Generate Analysis (`generateAnalysis`)
- Uses GPT to generate detailed interpretations for each category:
  - Overall Attraction & Chemistry
  - Emotional Security & Connection
  - Sex & Intimacy
  - Communication & Mental Connection
  - Commitment & Long-Term Potential
  - Karmic Lessons & Growth
  - Practical Growth & Shared Goals
- Incorporates astrological data and user context
- **Performance Update (commit 1b60502)**: All categories are now processed in parallel

### Step 3: Vectorize Analysis (`vectorizeAnalysis`)
- Processes analysis text for semantic search
- Stores embeddings in vector database
- Enables chat functionality for relationship insights
- **Performance Update (commit 1b60502)**: Vectorization now happens immediately after each category is generated

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
  "workflowId": "compositeChartId",
  "status": {
    "compositeChartId": "string",
    "status": "running",
    "currentStep": "generateScores",
    "progress": {
      "generateScores": { "status": "pending" },
      "generateAnalysis": { "status": "pending" },
      "vectorizeAnalysis": { "status": "pending" }
    }
  }
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
  "status": {
    "compositeChartId": "string",
    "status": "running|completed|error",
    "currentStep": "generateScores|generateAnalysis|vectorizeAnalysis|null",
    "progress": {
      "generateScores": {
        "status": "pending|running|completed|error",
        "startedAt": "ISO date",
        "completedAt": "ISO date"
      },
      "generateAnalysis": { ... },
      "vectorizeAnalysis": { ... }
    },
    "error": "string or null",
    "startedAt": "ISO date",
    "completedAt": "ISO date"
  },
  "analysisData": {
    "scores": { ... },
    "normalizedScores": { ... },
    "categoryAnalysis": { ... },
    "isVectorized": true/false
  }
}
```


## Database Schema

### relationship_workflow_status Collection
```javascript
{
  _id: ObjectId,
  compositeChartId: String,
  userIdA: String,
  userIdB: String,
  status: "running" | "completed" | "error",
  currentStep: String | null,
  progress: {
    generateScores: {
      status: String,
      startedAt: Date | null,
      completedAt: Date | null
    },
    generateAnalysis: {
      status: String,
      startedAt: Date | null,
      completedAt: Date | null
    },
    vectorizeAnalysis: {
      status: String,
      startedAt: Date | null,
      completedAt: Date | null
    }
  },
  error: String | null,
  startedAt: Date,
  completedAt: Date | null,
  lastUpdated: Date
}
```

## Frontend Integration

### Import Required Functions
```javascript
import {
  startRelationshipWorkflow,
  getRelationshipWorkflowStatus
} from '../Utilities/api';
```

### Basic Implementation
```javascript
// Start workflow
const startWorkflow = async () => {
  try {
    const response = await startRelationshipWorkflow(
      userA._id,
      userB._id,
      compositeChart._id
    );
    if (response.success) {
      // Start polling for status
      startPolling();
    }
  } catch (error) {
    console.error('Failed to start workflow:', error);
  }
};

// Poll for status
const pollStatus = async () => {
  const response = await getRelationshipWorkflowStatus(compositeChart._id);
  if (response.success) {
    updateUI(response.status, response.analysisData);
    
    // Stop polling when complete
    if (response.status.status === 'completed' || 
        response.status.status === 'error') {
      stopPolling();
    }
  }
};
```

### Replacing Manual Process in CompositeDashboard_v4

The workflow replaces this manual process:
```javascript
// OLD: Manual multi-step process
await generateCompatabilityScore();
await generateRelationshipAnalysisForCompositeChart();
await processRelationshipAnalysis();

// NEW: Single workflow initiation
await startRelationshipWorkflow(userA._id, userB._id, compositeChart._id);
```

## Migration Guide

### Before (Manual Process)
1. User clicks button to generate scores
2. Wait for completion
3. User clicks button to generate analysis
4. Wait for completion
5. User clicks button to vectorize
6. Wait for completion

### After (Automated Workflow)
1. User clicks "Start Workflow" button
2. All steps execute automatically
3. UI polls for status updates
4. Complete notification when done

### UI Changes Required

Replace the manual workflow logic in `CompositeDashboard_v4` with:

```javascript
const [workflowStatus, setWorkflowStatus] = useState(null);
const [isPollingWorkflow, setIsPollingWorkflow] = useState(false);

// Replace startWorkflow function
const startWorkflow = async () => {
  setWorkflowStarted(true);
  try {
    const response = await startRelationshipWorkflow(
      userA._id,
      userB._id,
      compositeChart._id
    );
    if (response.success) {
      setWorkflowStatus(response.status);
      setIsPollingWorkflow(true);
    }
  } catch (error) {
    console.error('Workflow start error:', error);
  }
};

// Add polling effect
useEffect(() => {
  let intervalId;
  if (isPollingWorkflow) {
    intervalId = setInterval(async () => {
      const response = await getRelationshipWorkflowStatus(compositeChart._id);
      if (response.success) {
        setWorkflowStatus(response.status);
        // Update existing state with new data
        if (response.analysisData) {
          setRelationshipScores(response.analysisData.scores);
          setDetailedRelationshipAnalysis(response.analysisData.categoryAnalysis);
          setVectorizationStatus(response.analysisData.vectorizationStatus);
        }
        // Stop polling when done
        if (response.status.status !== 'running') {
          setIsPollingWorkflow(false);
        }
      }
    }, 3000); // Poll every 3 seconds
  }
  return () => clearInterval(intervalId);
}, [isPollingWorkflow, compositeChart._id]);
```

## Error Handling

The workflow includes comprehensive error handling:

1. **Validation Errors** - Missing users or composite chart
2. **Processing Errors** - Failures during any step
3. **Timeout Protection** - Long-running operations
4. **Retry Capability** - Can restart failed workflows

### Error Response Example
```json
{
  "success": false,
  "status": {
    "status": "error",
    "error": "Failed to generate analysis: OpenAI rate limit exceeded",
    "currentStep": "generateAnalysis",
    "progress": {
      "generateScores": { "status": "completed" },
      "generateAnalysis": { "status": "error" },
      "vectorizeAnalysis": { "status": "pending" }
    }
  }
}
```

## Performance Considerations

- Workflow executes asynchronously in background
- Each step updates database immediately upon completion
- Polling interval of 3 seconds balances responsiveness and server load
- Partial results available during processing
- **Parallel Processing (commit 1b60502)**:
  - All 7 relationship categories are analyzed concurrently
  - User context fetching happens in parallel for both users
  - Generation and vectorization are unified into a single step per category
  - Significantly reduced total processing time from sequential to parallel execution

## Security

- Validates user ownership before starting workflow
- Ensures both users have birth charts
- Sanitizes all inputs
- Rate limiting should be implemented at API gateway level

## Future Enhancements

1. **Webhook Support** - Push notifications instead of polling
2. **Batch Processing** - Multiple relationships at once
3. **Priority Queue** - Handle high-priority analyses first
4. **Progress Percentage** - More granular progress tracking
5. **Pause/Resume** - Allow workflow interruption