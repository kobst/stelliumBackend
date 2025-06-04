# Workflow Implementation Guide

## Overview

This implementation replaces the manual step-by-step workflow with a single API call that triggers an automated backend workflow, while the frontend polls for status updates.

**Note:** A similar workflow has been implemented for relationship analysis. See `RELATIONSHIP_WORKFLOW_README.md` for details on the relationship workflow that handles compatibility scores, AI analysis, and vectorization.

## Backend Changes

### 1. New Controller: `workflowController.ts`

**Key Functions:**
- `startWorkflow(req, res)` - Initiates the workflow
- `getWorkflowStatusHandler(req, res)` - Returns current status
- `processWorkflowStep(userId, step)` - Executes individual workflow steps
- `executeGenerateBasic(userId)` - Handles basic analysis generation
- `executeVectorizeBasic(userId)` - Handles basic analysis vectorization
- `executeGenerateTopic(userId)` - Handles topic analysis generation  
- `executeVectorizeTopic(userId)` - Handles topic analysis vectorization

**Workflow Steps:**
1. `generateBasic` - Generate overview, dominance patterns, and planet interpretations
2. `vectorizeBasic` - Process and vectorize basic analysis for search
3. `generateTopic` - Generate all subtopic analyses
4. `vectorizeTopic` - Process and vectorize topic analyses for search

### 2. New Database Functions in `dbService.ts`

**Collections:**
- `workflow_status` - Stores workflow progress and status

**Functions:**
- `createWorkflowStatus(userId, workflowStatus)` - Initialize workflow tracking
- `getWorkflowStatus(userId)` - Retrieve current workflow status
- `updateWorkflowStatus(userId, updates)` - Update workflow progress

### 3. New Routes in `indexRoutes.ts`

```javascript
router.post('/startWorkflow', startWorkflow);
router.post('/getWorkflowStatus', getWorkflowStatusHandler);
```

## Frontend Changes

### 1. New API Functions

```javascript
export const startWorkflow = async (userId) => { /* ... */ };
export const getWorkflowStatus = async (userId) => { /* ... */ };
```

### 2. Updated UserDashboard Component

**Key Features:**
- **Single Start Button**: Replaces the manual step progression
- **Automatic Polling**: Polls every 3 seconds for workflow status
- **Progress Visualization**: Shows progress bar and current step
- **Real-time Updates**: Updates analysis data as workflow progresses
- **Error Handling**: Displays errors and provides retry functionality

**State Management:**
- `workflowStatus` - Current workflow state from backend
- `isPolling` - Controls polling interval
- `pollInterval` - Stores interval reference for cleanup

**Polling Logic:**
```javascript
const pollWorkflowStatus = useCallback(async () => {
  const response = await getWorkflowStatus(userId);
  setWorkflowStatus(response.status);
  
  if (response.status.status === 'completed' || response.status.status === 'error') {
    stopPolling();
    await fetchAnalysisForUserAsync(); // Refresh data
  }
}, [userId]);
```

## Workflow Status Schema

```javascript
{
  userId: string,
  status: 'running' | 'completed' | 'error',
  currentStep: 'generateBasic' | 'vectorizeBasic' | 'generateTopic' | 'vectorizeTopic' | null,
  progress: {
    generateBasic: { status: 'pending' | 'running' | 'completed' | 'error', startedAt: Date, completedAt: Date },
    vectorizeBasic: { status: 'pending' | 'running' | 'completed' | 'error', startedAt: Date, completedAt: Date },
    generateTopic: { status: 'pending' | 'running' | 'completed' | 'error', startedAt: Date, completedAt: Date },
    vectorizeTopic: { status: 'pending' | 'running' | 'completed' | 'error', startedAt: Date, completedAt: Date }
  },
  error: string | null,
  startedAt: Date,
  completedAt: Date | null
}
```

## Usage Flow

### User Experience:
1. User clicks "Start Analysis Workflow" button
2. Backend immediately returns workflow started confirmation
3. Frontend shows progress bar and current step description
4. Frontend polls every 3 seconds for updates
5. Progress bar updates as steps complete
6. When complete, full analysis data is available
7. Chat becomes available once workflow finishes

### Backend Process:
1. `startWorkflow` API called
2. Workflow status created in database
3. `processWorkflowStep` executes asynchronously
4. Each step updates progress in database
5. Frontend polling receives updates
6. On completion, analysis data is fully available

## Benefits

### For Users:
- **Single Click**: No need to manually trigger each step
- **Real-time Feedback**: Clear progress indication
- **Hands-off**: Can navigate away and come back
- **Error Recovery**: Automatic retry capabilities

### For Development:
- **Cleaner UI**: Simpler interface without manual controls
- **Better UX**: Professional workflow experience
- **Scalable**: Easy to add new workflow steps
- **Reliable**: Built-in error handling and status tracking

### For Backend:
- **Asynchronous**: Non-blocking workflow execution
- **Trackable**: Full audit trail of workflow progress
- **Recoverable**: Can resume or retry failed workflows
- **Efficient**: Batched operations reduce API calls

## Error Handling

- **Frontend**: Displays errors with retry button
- **Backend**: Captures errors in workflow status
- **Database**: Stores error messages and timestamps
- **Recovery**: Users can restart failed workflows

## Performance Considerations

- **Polling Frequency**: 3-second intervals balance responsiveness with server load
- **Cleanup**: Intervals are properly cleared on component unmount
- **Caching**: Status responses can be cached briefly to reduce database load
- **Timeouts**: Long-running operations have appropriate timeout handling

## Migration Path

### From Current Implementation:
1. Add new API functions to frontend
2. Update UserDashboard component
3. Deploy backend changes
4. Test workflow integration
5. Remove old manual workflow code
6. Update CSS for new UI components

### Backward Compatibility:
- Old API endpoints remain functional during transition
- Existing analysis data structure unchanged
- Gradual migration possible for different users

## Testing

### Unit Tests:
- Workflow controller functions
- Database operations
- Frontend polling logic

### Integration Tests:
- Complete workflow execution
- Error scenarios
- Status polling accuracy

### User Acceptance Tests:
- Full user journey
- Performance under load
- Error recovery flows

## Relationship Workflow

### Overview
A similar workflow pattern has been implemented for relationship analysis, providing automated generation of:
- Relationship compatibility scores
- AI-generated analysis for 7 relationship categories
- Vectorization for semantic search

### Endpoints
- `POST /workflow/relationship/start` - Start relationship workflow
- `POST /workflow/relationship/status` - Check workflow status
- `POST /workflow/relationship/complete` - Mark workflow complete

### Workflow Steps
1. `generateScores` - Calculate synastry and composite charts, generate compatibility scores
2. `generateAnalysis` - Generate AI interpretations for each relationship category
3. `vectorizeAnalysis` - Process and vectorize relationship analysis

### Implementation Details
See `RELATIONSHIP_WORKFLOW_README.md` for complete documentation of the relationship workflow system.