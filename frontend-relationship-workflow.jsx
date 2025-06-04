import React, { useState, useEffect, useCallback } from 'react';
import {
  startRelationshipWorkflow,
  getRelationshipWorkflowStatus,
  fetchRelationshipAnalysis
} from '../Utilities/api';

const RelationshipWorkflowComponent = ({ userA, userB, compositeChart }) => {
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState(null);
  const [relationshipData, setRelationshipData] = useState(null);

  // Poll for workflow status
  const pollWorkflowStatus = useCallback(async () => {
    if (!compositeChart?._id) return;

    try {
      const response = await getRelationshipWorkflowStatus(compositeChart._id);
      
      if (response.success) {
        setWorkflowStatus(response.status);
        
        // Update relationship data if available
        if (response.analysisData) {
          setRelationshipData(response.analysisData);
        }
        
        // Stop polling if workflow is complete or errored
        if (response.status.status === 'completed' || response.status.status === 'error') {
          setIsPolling(false);
        }
      }
    } catch (err) {
      console.error('Error polling workflow status:', err);
      setError('Failed to get workflow status');
      setIsPolling(false);
    }
  }, [compositeChart?._id]);

  // Set up polling interval
  useEffect(() => {
    let intervalId;
    
    if (isPolling && compositeChart?._id) {
      // Poll immediately
      pollWorkflowStatus();
      
      // Then poll every 3 seconds
      intervalId = setInterval(pollWorkflowStatus, 3000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPolling, pollWorkflowStatus]);

  // Start the workflow
  const handleStartWorkflow = async () => {
    if (!userA?._id || !userB?._id || !compositeChart?._id) {
      setError('Missing required data to start workflow');
      return;
    }

    setError(null);
    
    try {
      const response = await startRelationshipWorkflow(
        userA._id,
        userB._id,
        compositeChart._id
      );
      
      if (response.success) {
        setWorkflowStatus(response.status);
        setIsPolling(true);
      } else {
        setError(response.error || 'Failed to start workflow');
      }
    } catch (err) {
      console.error('Error starting workflow:', err);
      setError('Failed to start workflow');
    }
  };

  // Get step status
  const getStepStatus = (stepKey) => {
    return workflowStatus?.progress?.[stepKey]?.status || 'pending';
  };

  // Get step class for styling
  const getStepClass = (stepKey) => {
    const status = getStepStatus(stepKey);
    return `workflow-step ${status}`;
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleTimeString();
  };

  // Calculate overall progress
  const calculateProgress = () => {
    if (!workflowStatus?.progress) return 0;
    
    const steps = Object.values(workflowStatus.progress);
    const completed = steps.filter(step => step.status === 'completed').length;
    return Math.round((completed / steps.length) * 100);
  };

  return (
    <div className="relationship-workflow-container">
      <h2>Relationship Analysis Workflow</h2>
      
      {/* User Information */}
      <div className="workflow-users">
        <p>User A: {userA?.firstName} {userA?.lastName}</p>
        <p>User B: {userB?.firstName} {userB?.lastName}</p>
        <p>Composite Chart ID: {compositeChart?._id}</p>
      </div>

      {/* Start Button */}
      {!workflowStatus && (
        <button 
          onClick={handleStartWorkflow}
          className="workflow-start-button"
          disabled={!userA || !userB || !compositeChart}
        >
          Start Relationship Analysis Workflow
        </button>
      )}

      {/* Error Display */}
      {error && (
        <div className="workflow-error">
          <p>Error: {error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Workflow Status */}
      {workflowStatus && (
        <div className="workflow-status">
          <div className="workflow-header">
            <h3>Workflow Status: {workflowStatus.status}</h3>
            <p>Progress: {calculateProgress()}%</p>
            {workflowStatus.status === 'running' && (
              <div className="loading-spinner">Processing...</div>
            )}
          </div>

          {/* Progress Steps */}
          <div className="workflow-steps">
            {/* Generate Scores Step */}
            <div className={getStepClass('generateScores')}>
              <h4>1. Generate Compatibility Scores</h4>
              <p>Status: {getStepStatus('generateScores')}</p>
              {workflowStatus.progress?.generateScores?.startedAt && (
                <p>Started: {formatTime(workflowStatus.progress.generateScores.startedAt)}</p>
              )}
              {workflowStatus.progress?.generateScores?.completedAt && (
                <p>Completed: {formatTime(workflowStatus.progress.generateScores.completedAt)}</p>
              )}
              {relationshipData?.scores && (
                <div className="step-results">
                  <p>Overall Score: {relationshipData.scores.overall?.toFixed(1)}/100</p>
                </div>
              )}
            </div>

            {/* Generate Analysis Step */}
            <div className={getStepClass('generateAnalysis')}>
              <h4>2. Generate AI Analysis</h4>
              <p>Status: {getStepStatus('generateAnalysis')}</p>
              {workflowStatus.progress?.generateAnalysis?.startedAt && (
                <p>Started: {formatTime(workflowStatus.progress.generateAnalysis.startedAt)}</p>
              )}
              {workflowStatus.progress?.generateAnalysis?.completedAt && (
                <p>Completed: {formatTime(workflowStatus.progress.generateAnalysis.completedAt)}</p>
              )}
              {relationshipData?.categoryAnalysis && (
                <div className="step-results">
                  <p>Categories analyzed: {Object.keys(relationshipData.categoryAnalysis).length}/7</p>
                </div>
              )}
            </div>

            {/* Vectorize Analysis Step */}
            <div className={getStepClass('vectorizeAnalysis')}>
              <h4>3. Enable Semantic Search</h4>
              <p>Status: {getStepStatus('vectorizeAnalysis')}</p>
              {workflowStatus.progress?.vectorizeAnalysis?.startedAt && (
                <p>Started: {formatTime(workflowStatus.progress.vectorizeAnalysis.startedAt)}</p>
              )}
              {workflowStatus.progress?.vectorizeAnalysis?.completedAt && (
                <p>Completed: {formatTime(workflowStatus.progress.vectorizeAnalysis.completedAt)}</p>
              )}
              {relationshipData?.isVectorized && (
                <div className="step-results">
                  <p>✓ Analysis vectorized and searchable</p>
                </div>
              )}
            </div>
          </div>

          {/* Completion Status */}
          {workflowStatus.status === 'completed' && (
            <div className="workflow-complete">
              <h3>✓ Workflow Complete!</h3>
              <p>All relationship analysis steps have been completed successfully.</p>
              <button onClick={() => window.location.reload()}>
                View Full Analysis
              </button>
            </div>
          )}

          {/* Error Status */}
          {workflowStatus.status === 'error' && (
            <div className="workflow-error-status">
              <h3>⚠ Workflow Error</h3>
              <p>{workflowStatus.error}</p>
              <button onClick={handleStartWorkflow}>Retry Workflow</button>
            </div>
          )}
        </div>
      )}

      {/* Relationship Data Preview */}
      {relationshipData && (
        <div className="relationship-data-preview">
          <h3>Analysis Preview</h3>
          
          {/* Scores */}
          {relationshipData.scores && (
            <div className="scores-preview">
              <h4>Compatibility Scores</h4>
              <ul>
                <li>Overall: {relationshipData.scores.overall?.toFixed(1)}/100</li>
                <li>Attraction: {relationshipData.normalizedScores?.OVERALL_ATTRACTION_CHEMISTRY?.overallNormalized?.toFixed(1)}/100</li>
                <li>Emotional: {relationshipData.normalizedScores?.EMOTIONAL_SECURITY_CONNECTION?.overallNormalized?.toFixed(1)}/100</li>
                <li>Communication: {relationshipData.normalizedScores?.COMMUNICATION_AND_MENTAL_CONNECTION?.overallNormalized?.toFixed(1)}/100</li>
              </ul>
            </div>
          )}
          
          {/* Analysis Categories */}
          {relationshipData.categoryAnalysis && (
            <div className="analysis-preview">
              <h4>Analysis Categories</h4>
              <ul>
                {Object.entries(relationshipData.categoryAnalysis).map(([category, data]) => (
                  <li key={category}>
                    {category.replace(/_/g, ' ')}: 
                    {data.interpretation ? ' ✓' : ' Pending...'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RelationshipWorkflowComponent;