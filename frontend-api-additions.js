// Add these functions to your frontend API file

export const startWorkflow = async (userId) => {
  console.log("Starting workflow for userId:", userId);
  try {
    const response = await fetch(`${SERVER_URL}/startWorkflow`, {
      method: HTTP_POST,
      headers: { [CONTENT_TYPE_HEADER]: APPLICATION_JSON },
      body: JSON.stringify({ userId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log("Workflow started:", responseData);
    return responseData;
  } catch (error) {
    console.error('Error starting workflow:', error);
    throw error;
  }
};

export const getWorkflowStatus = async (userId) => {
  console.log("Getting workflow status for userId:", userId);
  try {
    const response = await fetch(`${SERVER_URL}/getWorkflowStatus`, {
      method: HTTP_POST,
      headers: { [CONTENT_TYPE_HEADER]: APPLICATION_JSON },
      body: JSON.stringify({ userId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log("Workflow status:", responseData);
    return responseData;
  } catch (error) {
    console.error('Error getting workflow status:', error);
    throw error;
  }
};

// Relationship Workflow API Functions

export const startRelationshipWorkflow = async (userIdA, userIdB, compositeChartId) => {
  console.log("Starting relationship workflow:", { userIdA, userIdB, compositeChartId });
  try {
    const response = await fetch(`${SERVER_URL}/workflow/relationship/start`, {
      method: HTTP_POST,
      headers: { [CONTENT_TYPE_HEADER]: APPLICATION_JSON },
      body: JSON.stringify({ userIdA, userIdB, compositeChartId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log("Relationship workflow started:", responseData);
    return responseData;
  } catch (error) {
    console.error('Error starting relationship workflow:', error);
    throw error;
  }
};

export const getRelationshipWorkflowStatus = async (compositeChartId) => {
  console.log("Getting relationship workflow status for compositeChartId:", compositeChartId);
  try {
    const response = await fetch(`${SERVER_URL}/workflow/relationship/status`, {
      method: HTTP_POST,
      headers: { [CONTENT_TYPE_HEADER]: APPLICATION_JSON },
      body: JSON.stringify({ compositeChartId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log("Relationship workflow status:", responseData);
    return responseData;
  } catch (error) {
    console.error('Error getting relationship workflow status:', error);
    throw error;
  }
};

