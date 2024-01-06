import express from 'express';
const router = express.Router();

import { handleBirthData } from '../controllers/astroDataController.js';
import { handleBigFour, handlePlanets, handlePlanetsVer2 } from '../controllers/gptController.js';

// astroData
router.post('/birthData', handleBirthData);

// gpt
router.post('/getBigFour', handleBigFour);
router.post('/getPlanets', handlePlanets);
router.post('/getPlanetsVer2', handlePlanetsVer2);

export default router;
