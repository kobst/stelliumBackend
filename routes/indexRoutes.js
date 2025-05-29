import express from 'express';
const router = express.Router();

import {
    handleUserCreation, 
    handleCreateRelationship
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
    handleGetTransitWindows
} from '../controllers/transitController.js';
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


router.post('/getUser', handleGetUserSingle);
router.post('/getUsers', handleGetUsers);

router.post('/getCompositeCharts', handleGetCompositeCharts);
router.post('/saveCompositeChartProfile', handleSaveCompositeChartProfile);
router.post('/saveSynastryChartInterpretation', handleSaveSynastryChartInterpretation);

// user chat



// using sweph/ephemeris
router.post('/createUser', handleUserCreation);
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

export default router;
