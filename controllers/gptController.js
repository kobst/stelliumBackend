import { getCompletionBigFour, 
  getCompletionDailyTransit,
  getCompletionPlanets, 
  getCompletionPrompts, 
  getCompletionDominance,
  getCompletionGptResponseForFormattedUserTransits,
  getCompletionWithRagResponse,
  getCompletionGptResponseForWeeklyUserTransits,
  getCompletionGptResponseForSynastryAspects,
  getCompletionGptResponseForCompositeChart,
  getCompletionGptResponseForCompositeChartPlanet,
  getGptPromptsForWeeklyTransits,
  getPromptGenerationCompositeChart,
  getPromptGenerationSynastryChart
} from '../services/gptService.js';
import { processUserQuery } from '../utilities/vectorize.js';

export async function handleDominance(req, res) {
  try {

    const { heading, everythingData, description } = req.body;

    // console.log(req.body)
    const response = await getCompletionDominance(heading, everythingData, description);
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

export async function handleBigFour(req, res) {
  try {

    const { heading, description } = req.body;

    // console.log(req.body)
    const response = await getCompletionBigFour(heading, description);
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

export async function handleDailyTransitInterpretation(req, res) {
  console.log("req.body: ", req.body)
  try {
    console.log("handleDailyTransitInterpretation")
    const { input } = req.body;

    // console.log(req.body)
    const response = await getCompletionDailyTransit(input);
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
    const { heading, description } = req.body;
    console.log("heading planetsVer2: ", heading)
    console.log("description planetsVer2: ", description)
    const response = await getCompletionPlanets(heading, description);
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
    const { heading, description } = req.body;
    // console.log(req.body)
    const response = await getCompletionPrompts(heading, description);
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


export async function handleGptResponseForFormattedUserTransits(req, res) {
  console.log("handleGptResponseForFormattedUserTransits")
  try {
    const { heading, formattedUserTransits } = req.body;
    console.log("formattedUserTransits: " + formattedUserTransits)
    const response = await getCompletionGptResponseForFormattedUserTransits(heading,formattedUserTransits);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.json({ response });
  } catch (error) {
    console.log("error: ", error)
    res.status(500).send('Server error');
  }
}

export async function handleGptResponseForWeeklyUserTransits(req, res) {
  console.log("handleGptResponseForWeeklyUserTransits")
  try {
    const { transitsWithinNextSevenDays, transitsWithinCurrentDateRange } = req.body;
    console.log("everythingData: " + everythingData)
    console.log("formattedUserTransits: " + formattedUserTransits)
    const response = await getCompletionGptResponseForWeeklyUserTransits(transitsWithinNextSevenDays, transitsWithinCurrentDateRange);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.json({ response });
  } catch (error) {
    res.status(500).send('Server error');
  }
}

export async function handleGptPromptsForWeeklyCategoryTransits(req, res) {
  console.log("handleGptPromptsForWeeklyCategoryTransits")
  try {
    const { heading, transitDescriptions } = req.body;
    const response = await getGptPromptsForWeeklyTransits(heading, transitDescriptions);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.json({ response });
  } catch (error) {
    res.status(500).send('Server error');
  }
}



export async function handlePromptGenerationCompositeChart(req, res) {
  console.log("handlePromptGenerationCompositeChart")
  try {
    const { heading, descriptions } = req.body;
    console.log("heading: ", heading)
    console.log("descriptions: ", descriptions)
    const response = await getPromptGenerationCompositeChart(heading, descriptions);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.json({ response });
  } catch (error) {
    res.status(500).send('Server error');
  }
}


export async function handlePromptGenerationSynastryChart(req, res) {
  console.log("handlePromptGenerationSynastryChart")
  try {
    const { heading, descriptions } = req.body;
    const response = await getPromptGenerationSynastryChart(heading, descriptions);
    res.json({ response });
  } catch (error) {
    res.status(500).send('Server error');
  }
}

export async function handleUserQuery(req, res) {
  try {
    const { userId, query } = req.body;
    const ragResponse = await processUserQuery(userId, query);
    const gptResponse = await getCompletionWithRagResponse(ragResponse, query);

    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to match your front-end URL in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.json({ gptResponse });
  } catch (error) {
    res.status(500).send('Server error');
  }
}

export async function handleGptResponseForSynastryAspects(req, res) {
  console.log("handleGptResponseForSynastryAspects")
  console.log("req.body handle gpt response for synastry aspects: ", req.body)
  try {
    const { heading, promptDescription } = req.body;
    const response = await getCompletionGptResponseForSynastryAspects(heading, promptDescription);
    res.json({ response });
  } catch (error) {
    res.status(500).send('Server error');
  }
}

export async function handleGptResponseForCompositeChart(req, res) {
  console.log("handleGptResponseForCompositeChart")
  try {
    const { heading, promptDescription } = req.body;
    const response = await getCompletionGptResponseForCompositeChart(heading, promptDescription);
    res.json({ response });
  } catch (error) {
    res.status(500).send('Server error');
  }
}

export async function handleGptResponseForCompositeChartPlanet(req, res) {
  console.log("handleGptResponseForCompositeChartPlanet")
  try {
    const { planet, promptDescription } = req.body;
    const response = await getCompletionGptResponseForCompositeChartPlanet(planet, promptDescription);
    res.json({ response });
  } catch (error) {
    res.status(500).send('Server error');
  }
}

// export async function handleGptResponseForSynastryChart(req, res) {
//   console.log("handleGptResponseForSynastryChart")
//   try {
//     const { heading, synastryChart } = req.body;
//     const response = await getCompletionGptResponseForSynastryChart(heading, synastryChart);
//     res.json({ response });
//   } catch (error) {
//     res.status(500).send('Server error');
//   }
// }
