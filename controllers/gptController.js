import { getCompletionBigFour, getCompletionPlanets, getCompletionPlanetsVer2 } from '../services/gptService.js';

export async function handleBigFour(req, res) {
  try {
    console.log("input xxx")

    const { prompt } = req.body;
    console.log("input xxx")
    console.log(req.body)
    const response = await getCompletionBigFour(prompt);
    console.log(response)
    res.json({ response });
  } catch (error) {
    res.status(500).send('Server error');
  }
};

export async function handlePlanets(req, res) {
  try {
    const { input } = req.body;
    const response = await getCompletionPlanets(input);
    res.json({ response });
  } catch (error) {
    res.status(500).send('Server error');
  }
};

export async function handlePlanetsVer2(req, res){
  try {
    console.log(req.body)
    const { prompt } = req.body;
    const response = await getCompletionPlanetsVer2(prompt);
    console.log(response)
    res.json({ response });
  } catch (error) {
    res.status(500).send('Server error');
  }
};
