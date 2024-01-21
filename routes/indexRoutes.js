import express from 'express';
const router = express.Router();

import { handleBirthData, handleProgressedChart, handleDayTransits } from '../controllers/astroDataController.js';
import { handleBigFour, handlePlanets, handlePlanetsVer2 } from '../controllers/gptController.js';

// astroData
router.post('/birthData', handleBirthData);
router.post('/progressedChart', handleProgressedChart);
router.post('/dayTransits', handleDayTransits);
// gpt
router.post('/getBigFour', handleBigFour);
router.post('/getPlanets', handlePlanets);
router.post('/getPlanetsVer2', handlePlanetsVer2);

export default router;
