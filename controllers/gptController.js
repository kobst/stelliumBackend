import { getCompletionBigFour, getCompletionPlanets, getCompletionPlanetsVer2, getCompletionPrompts } from '../services/gptService.js';

export async function handleBigFour(req, res) {
  try {

    const { prompt } = req.body;
    // console.log(req.body)
    const response = await getCompletionBigFour(prompt);
    // console.log(response)
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.json({ response });
  } catch (error) {
    res.status(500).send('Server error');
  }
};

export async function handlePlanets(req, res) {
  try {
    const { input } = req.body;
    const response = await getCompletionPlanets(input);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.json({ response });
  } catch (error) {
    res.status(500).send('Server error');
  }
};

export async function handlePlanetsVer2(req, res){
  try {
    // console.log(req.body)
    const { prompt } = req.body;
    const response = await getCompletionPlanetsVer2(prompt);
    // console.log(response)
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.json({ response });
  } catch (error) {
    res.status(500).send('Server error');
  }
};


export async function handlePromptGenerationGPT(req, res) {
  console.log('get promopts')
  try {
    // console.log(req.body)
    const { input } = req.body;
    // console.log(req.body)
    const response = await getCompletionPrompts(input);
    // console.log(response)
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.json({ response });
  } catch (error) {
    res.status(500).send('Server error');
  }
};
