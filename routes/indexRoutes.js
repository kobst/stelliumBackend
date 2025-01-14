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
    handleUserQuery
} from '../controllers/gptController.js';
import { handleDailyTransits, 
    handlePeriodTransits,
    handleDailyAspects, 
    generateSummaryTransitSignsForPeriod,
    generateSummaryTransitHousesforBirthChart,
    generatePeriodAspectsForChart, 
    handleSingleTransitAspectsForChart, 
    handlePeriodAspects, 
    handleRetrogrades, 
    handleSaveUserProfile, 
    handleGetUsers,
    handleSaveBirthChartInterpretation,
    handleGetBirthChartInterpretation,
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

// dbData: get all aspects/transits for a birthchart for a given date or period of dates
router.post('/periodTransitsForChart', handleSingleTransitAspectsForChart);

// user specific
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

router.post('/handleUserQuery', handleUserQuery);

export default router;
