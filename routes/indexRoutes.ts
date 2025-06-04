// @ts-nocheck
import express from 'express';
const router = express.Router();

import {
    handleUserCreation,
    handleUserCreationUnknownTime,
    handleCreateRelationship,
    handleGetTransitWindows
} from '../controllers/astroDataController.js';
import { 
    // gpt
    handleShortOverviewResponse,
    handleShortOverviewRomanticResponse,
    handleShortOverviewPlanetResponse,
    handleShortOverviewAllPlanetsResponse,
    handleBirthChartAnalysis,
    handleBirthChartTopicAnalysis,
    handleSubtopicAnalysis,
    handleVectorizeBirthChartAnalysisLog,
    handleVectorizeTopicAnalysis,
    handleFetchAnalysis,
    handleVectorizeRelationshipAnalysis,
    handleProcessUserQueryForBirthChartAnalysis,
    handleFetchUserChatBirthChartAnalysis,
    handleProcessUserQueryForRelationshipAnalysis,
    handleFetchUserChatRelationshipAnalysis
} from '../controllers/gptController.js';

import { 
    handleSaveCompositeChartProfile,
    handleSaveSynastryChartInterpretation,
    handleGetUsers,
    handleGetUserSingle,
    handleGetCompositeCharts,
    handleGetRelationshipScore,
    handleFetchRelationshipAnalysis,
    handleGenerateRelationshipAnalysis
} from '../controllers/dbDataController.js';

import {
    generateWeeklyHoroscope,
    generateMonthlyHoroscope,
    getUserHoroscopes,
    getLatestUserHoroscope,
    deleteUserHoroscope
} from '../controllers/horoscopeController.js';

import {
    startWorkflow,
    getWorkflowStatusHandler
} from '../controllers/workflowController.js';

import {
    startRelationshipWorkflow,
    getRelationshipWorkflowStatusHandler
} from '../controllers/relationshipWorkflowController.js';


router.post('/getUser', handleGetUserSingle);
router.post('/getUsers', handleGetUsers);

router.post('/getCompositeCharts', handleGetCompositeCharts);
router.post('/saveCompositeChartProfile', handleSaveCompositeChartProfile);
router.post('/saveSynastryChartInterpretation', handleSaveSynastryChartInterpretation);

// user chat



// using sweph/ephemeris
router.post('/createUser', handleUserCreation);
router.post('/createUserUnknownTime', handleUserCreationUnknownTime);
router.post('/createRelationship', handleCreateRelationship);
router.post('/getRelationshipScore', handleGetRelationshipScore);
router.post('/fetchRelationshipAnalysis', handleFetchRelationshipAnalysis);
router.post('/generateRelationshipAnalysis', handleGenerateRelationshipAnalysis);
router.post('/getShortOverview', handleShortOverviewResponse);
router.post('/getShortOverviewRomantic', handleShortOverviewRomanticResponse);
router.post('/getShortOverviewPlanet', handleShortOverviewPlanetResponse);
router.post('/getShortOverviewAllPlanets', handleShortOverviewAllPlanetsResponse);
// initial overiew, dominance, and plane

router.post('/fetchAnalysis', handleFetchAnalysis);
router.post('/getBirthChartAnalysis', handleBirthChartAnalysis);

// process, vectorize the initial overview, dominance, and planets
// maybe we make this into a cron job
router.post('/processBasicAnalysis', handleVectorizeBirthChartAnalysisLog);

// get user topic analysis all at once
// router.post('/getTopicAnalysis', handleBirthChartTopicAnalysis);

// get user subtopic analysis one at a time
router.post('/getSubtopicAnalysis', handleSubtopicAnalysis);

// proceess and vectorize topic analysis
router.post('/processTopicAnalysis', handleVectorizeTopicAnalysis);

router.post('/processRelationshipAnalysis', handleVectorizeRelationshipAnalysis);

router.post('/userChatBirthChartAnalysis', handleProcessUserQueryForBirthChartAnalysis);
router.post('/fetchUserChatBirthChartAnalysis', handleFetchUserChatBirthChartAnalysis);


router.post('/userChatRelationshipAnalysis', handleProcessUserQueryForRelationshipAnalysis);

router.post('/fetchUserChatRelationshipAnalysis',  handleFetchUserChatRelationshipAnalysis);

router.post('/getTransitWindows', handleGetTransitWindows);

// Workflow routes
router.post('/startWorkflow', startWorkflow);
router.post('/getWorkflowStatus', getWorkflowStatusHandler);

// Relationship Workflow routes
router.post('/workflow/relationship/start', startRelationshipWorkflow);
router.post('/workflow/relationship/status', getRelationshipWorkflowStatusHandler);

// Horoscope routes
router.post('/users/:userId/horoscope/weekly', generateWeeklyHoroscope);
router.post('/users/:userId/horoscope/monthly', generateMonthlyHoroscope);
router.get('/users/:userId/horoscopes', getUserHoroscopes);
router.get('/users/:userId/horoscope/latest', getLatestUserHoroscope);
router.delete('/users/:userId/horoscopes/:horoscopeId', deleteUserHoroscope);

export default router;
