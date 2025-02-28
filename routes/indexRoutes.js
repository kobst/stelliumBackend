import express from 'express';
const router = express.Router();

import { handleBirthData, handleProgressedChart, handleinstantTransits, handleGeneralPeriodTransits, handlePromptGeneration,
} from '../controllers/astroDataController.js';
import { 
    handleDominance,
    handleBigFour, 
    handlePlanets, 
    handlePlanetsVer2, 
    handlePromptGenerationGPT, 
    handleDailyTransitInterpretation,
    handleGptResponseForFormattedUserTransits,
    handleGptResponseForWeeklyUserTransits,
    handleGptPromptsForWeeklyCategoryTransits,
    handlePromptGenerationCompositeChart,
    handlePromptGenerationSynastryChart,
    handleGptResponseForCompositeChart,
    handleGptResponseForCompositeChartPlanet,
    handleGptResponseForSynastryAspects,
    handleUserQuery
} from '../controllers/gptController.js';
import { handleDailyTransits, 
    handlePeriodTransits,
    handleDailyAspects, 
    generateSummaryTransitSignsForPeriod,
    generateSummaryTransitHousesforBirthChart,
    generatePeriodAspectsForChart, 
    handleFindSynastryAspects,
    handleGenerateCompositeChart,
    handleSingleTransitAspectsForChart, 
    handlePeriodAspects, 
    handleRetrogrades, 
    handleRetrogradesForDateRange,
    handleSaveUserProfile, 
    handleSaveCompositeChartProfile,
    handleGetCompositeChartInterpretation,
    handleGetUsers,
    handleGetUserSingle,
    handleGetCompositeCharts,
    handleGetSynastryChartInterpretation,
    handleSaveBirthChartInterpretation,
    handleGetBirthChartInterpretation,
    handleSaveCompositeChartInterpretation,
    handleSaveDailyTransitInterpretationData,
    handleGetDailyTransitInterpretationData,
    handleSaveWeeklyTransitInterpretationData,
    handleGetWeeklyTransitInterpretationData,
    generateSummaryTransitsForUser } from '../controllers/dbDataController.js';

// astroData: get fresh astrological data from the astrological API
router.post('/birthData', handleBirthData);
router.post('/progressedChart', handleProgressedChart);
router.post('/instantTransits', handleinstantTransits);


// dbData: get all aspects/transits from the general transit collection for a given date or period of dates
router.post('/dailyTransits', handleDailyTransits);
router.post('/dailyAspects', handleDailyAspects);


// router.post('/periodTransits', handlePeriodTransits);
router.post('/periodTransits', generateSummaryTransitSignsForPeriod);
router.post('/generateSummaryTransitSignsForPeriod', generateSummaryTransitSignsForPeriod);
router.post('/periodAspects', handlePeriodAspects);


// save daily/weeklytransit interpretation data
router.post('/saveDailyTransitInterpretationData', handleSaveDailyTransitInterpretationData);
router.post('/getDailyTransitInterpretationData', handleGetDailyTransitInterpretationData);
router.post('/saveWeeklyTransitInterpretationData', handleSaveWeeklyTransitInterpretationData);
router.post('/getWeeklyTransitInterpretationData', handleGetWeeklyTransitInterpretationData);

router.post('/dailyRetrogrades', handleRetrogrades);
router.post('/retrogradesForDateRange', handleRetrogradesForDateRange);
// dbData: get all aspects/transits for a birthchart for a given date or period of dates
router.post('/periodTransitsForChart', handleSingleTransitAspectsForChart);

// user specific
router.post('/getUser', handleGetUserSingle);
router.post('/getUsers', handleGetUsers);
router.post('/saveUserProfile', handleSaveUserProfile);

// generate summaries of transits and aspects for user
router.post('/generatePeriodAspectsForChart', generatePeriodAspectsForChart);
router.post('/generateSummaryTransitsForUser', generateSummaryTransitsForUser);
router.post('/generateSummaryTransitHousesForBirthChart', generateSummaryTransitHousesforBirthChart);

router.post('/saveBirthChartInterpretation', handleSaveBirthChartInterpretation);
router.post('/getBirthChartInterpretation', handleGetBirthChartInterpretation);


// router.post('/getPeriodAspectsForUser', generateSummaryTransitsForUser);

// prompt generation
router.post('/promptGenerationCompositeChart', handlePromptGenerationCompositeChart);
router.post('/promptGenerationSynastryChart', handlePromptGenerationSynastryChart);
router.post('/promptGeneration', handlePromptGeneration);

// gpt
router.post('/getPrompts', handlePromptGenerationGPT);
router.post('/getDailyTransitInterpretation', handleDailyTransitInterpretation);
router.post('/getBigFour', handleBigFour);
router.post('/getDominance', handleDominance);
router.post('/getPlanets', handlePlanets);
router.post('/getPlanetsVer2', handlePlanetsVer2);
router.post('/getGptResponseForFormattedUserTransits', handleGptResponseForFormattedUserTransits);
router.post('/getGptResponseForWeeklyUserTransits', handleGptResponseForWeeklyUserTransits);
router.post('/getGptPromptsForWeeklyCategoryTransits', handleGptPromptsForWeeklyCategoryTransits);
router.post('/getGptResponseForSynastryAspects', handleGptResponseForSynastryAspects);
router.post('/getGptResponseForCompositeChart', handleGptResponseForCompositeChart);
router.post('/getGptResponseForCompositeChartPlanet', handleGptResponseForCompositeChartPlanet);
router.post('/getGptResponseForSynastryAspects', handleGptResponseForSynastryAspects);

// synastry
router.post('/findSynastryAspects', handleFindSynastryAspects);
router.post('/generateCompositeChart', handleGenerateCompositeChart);
router.post('/getCompositeCharts', handleGetCompositeCharts);
router.post('/saveCompositeChartProfile', handleSaveCompositeChartProfile);
router.post('/getCompositeChartInterpretation', handleGetCompositeChartInterpretation);
router.post('/getSynastryChartInterpretation', handleGetSynastryChartInterpretation);
router.post('/saveCompositeChartInterpretation', handleSaveCompositeChartInterpretation);
// user chat
router.post('/handleUserQuery', handleUserQuery);

export default router;
