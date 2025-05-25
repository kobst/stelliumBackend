import OpenAI from "openai";
import { decodePlanetHouseCode, decodeAspectCode, decodeAspectCodeMap, decodeRulerCode } from "../utilities/archive/decoder.js"
import { BroadTopicsEnum } from "../utilities/constants.js"



const apiKey = process.env.OPENAI_API_KEY
const client = new OpenAI({ apiKey: apiKey})


export async function getCompletionPrompts(heading, description) {

  try 
  {
    console.log("get prompts")
    console.log("heading: ", heading)
    console.log("description: ", description)

    const additionalText = "\n Please review and score each of the above astrological aspects and planetary positions in terms of its relevance to the following personality or life area: "
    const postAdditionalText = "\n Please list out the transits and aspects you've selected from most to least relevant. Please include at least one aspect between planets. Please remember to include the code included next to the description of the transit or aspect in parenthesis when you reference it.";
    const modifiedInput = description + additionalText + heading + postAdditionalText;
    console.log("Modified input: ", modifiedInput);


    

    const response = await client.chat.completions.create({
      // model: "ft:gpt-4o-mini-2024-07-18:personal::AF6CJ3rs",
      model: "ft:gpt-3.5-turbo-0125:personal::9OZnaAYI",
      messages: [{
        role: "system",
        content: "StelliumAI is an astrological guide bot."
      }, {
        role: "user",
        content: modifiedInput
      }]
    });
    // console.log("message content " + response.choices[0].message.content);
    const responseString = response.choices[0].message.content;
    console.log("responseString: ", responseString)
    return responseString
  } catch (error) {
    console.error('Error fetching response:', error);
  }
}



export async function getCompletionDominance(heading, everythingData, description) {
  try {
    console.log("getCompletionBigFour");
    console.log("heading: ", heading)
    console.log("description: ", description)

    // Construct the new modified input
    const modifiedInput = `Here are some aspects and planet positions of a birth chart relevant:

    ${everythingData}

    And here is the breakdown of how the planets are distributed in the chart in terms of ${heading} dominance:

    ${description}
    
    Please write me a couple of paragraphs interpreting the chart in the context of ${heading} and its influence on the rest of the chart.
    
    Please draw on the aspects and positions to make your points only if necessary but otherwise focus on the topic of ${heading} and how that generally manifests in the chart.
    
    Do not simply go through the description and interpret each point a la carte or individually but rather generate a holistic and balanced interpretation of the chart's ${heading} dominance.`;
    
    console.log("Modified input: ", modifiedInput);
    

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Make sure this is the correct model ID
      messages: [{
        role: "system",
        content: "StelliumAI is an astrological guide bot."
      }, {
        role: "user",
        content: modifiedInput
      }]
    });

    console.log("GPT response:", response.choices[0].message.content);
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
    throw error;
  }
}


export async function getCompletionBigFour(heading, description) {
  try {
    console.log("getCompletionBigFour");
    console.log("heading: ", heading)
    console.log("description: ", description)

    // Construct the new modified input
    const modifiedInput = `Here are some aspects and planet positions of a birth chart relevant to ${heading}:

    ${description}
    
    Please write me a couple of paragraphs interpreting these aspects and positions focusing on the topic of ${heading}.
    
    Instead of writing an interpretation for each aspect or position a la carte, please provide a more holistic summary, showing how these aspects and positions may balance or accentuate one another. 
    
    For every reference to a particular position, please also include the reference to the id of that position included in the parenthesis for each aspect or position.`;
    
    console.log("Modified input: ", modifiedInput);
    

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Make sure this is the correct model ID
      messages: [{
        role: "system",
        content: "StelliumAI is an astrological guide bot."
      }, {
        role: "user",
        content: modifiedInput
      }]
    });

    console.log("GPT response:", response.choices[0].message.content);
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
    throw error;
  }
}



export async function getCompletionShortOverview(description) {
  try {
    console.log("getCompletionBigFour");
    console.log("description: ", description)

    // Construct the new modified input
    const modifiedInput = `Below are some of the core positions and aspects of a birth chart, focusing on the Sun, Moon, Ascendant, and close aspects to these positions.

    Please write me a couple of paragraphs interpreting these aspects and positions, focusing on the core themes of these aspects and positions.
    
    Instead of writing an interpretation for each aspect or position a la carte, please provide a more holistic summary, showing how these aspects and positions may balance or accentuate one another. 

    Please use supportive, friendly and direct language but avoid overly ornate phrasing.
    
    For every reference to a particular position, please also include the reference to the id of that position included in the parenthesis for each aspect or position.
    
     ${description}
    `;
    
    // console.log("Modified input: ", modifiedInput);
    

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Make sure this is the correct model ID
      messages: [{
        role: "system",
        content: "StelliumAI is an astrological guide bot."
      }, {
        role: "user",
        content: modifiedInput
      }]
    });

    console.log("GPT response:", response.choices[0].message.content);
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
    throw error;
  }
}



export async function getCompletionShortOverviewRelationships(description) {
  try {
    console.log("getCompletionShortOverviewRelationships");
    console.log("description: ", description)

    // Construct the new modified input
    const modifiedInput = `Below are some of the core aspects and planet positions of a birth chart.

    Please write me a couple of paragraphs interpreting these aspects and positions, focusing on the theme of relationship and romance.
    
    Instead of writing an interpretation for each aspect or position a la carte, please provide a more holistic summary, showing how these aspects and positions may balance or accentuate one another as they may affect this individual's romantic life. 

    Please use supportive, friendly and direct language but avoid overly ornate phrasing.
    
    For every reference to a particular position, please also include the reference to the id of that position included in the parenthesis for each aspect or position.
    
     ${description}
    `;
    
    console.log("Modified input: ", modifiedInput);
    

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Make sure this is the correct model ID
      messages: [{
        role: "system",
        content: "StelliumAI is an astrological guide bot."
      }, {
        role: "user",
        content: modifiedInput
      }]
    });

    console.log("GPT response:", response.choices[0].message.content);
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
    throw error;
  }
}

// export async function getCompletionShortOverviewPlanet(description) {
//   try {
//     console.log("getCompletionShortOverviewPlanet");
//     console.log("description: ", description)

//     // Construct the new modified input
//     const modifiedInput = `Below are some of the core aspects and planet positions of a birth chart.

//     Please write me a couple of paragraphs interpreting these aspects and positions, focusing on the theme of relationship and romance.
    
//     Instead of writing an interpretation for each aspect or position a la carte, please provide a more holistic summary, showing how these aspects and positions may balance or accentuate one another as they may affect this individual's romantic life. 

//     Please use supportive, friendly and direct language but avoid overly ornate phrasing.
    
//     For every reference to a particular position, please also include the reference to the id of that position included in the parenthesis for each aspect or position.
    
//      ${description}
//     `;
    
//     console.log("Modified input: ", modifiedInput);
    

//     const response = await client.chat.completions.create({
//       model: "gpt-4o-mini", // Make sure this is the correct model ID
//       messages: [{
//         role: "system",
//         content: "StelliumAI is an astrological guide bot."
//       }, {
//         role: "user",
//         content: modifiedInput
//       }]
//     });

//     console.log("GPT response:", response.choices[0].message.content);
//     return response.choices[0].message.content;
//   } catch (error) {
//     console.error('Error fetching response:', error);
//     throw error;
//   }
// }



export async function getCompletionDailyTransit(prompt) {
  try {
    console.log("getCompletionDailyTransit");
    console.log("prompt: ", prompt)

    const promptHelper = 
    "Above are today's transits. Please provide me a short description of this transit that is occurring today. Please use supportive, optimististic, friendly and direct language. Please make it applicable generally to all signs and people:  "

    const modifiedInput = `${promptHelper} ${prompt}`; 
    
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "StelliumAI is an astrological guide bot."
      }, {
        role: "user",
        content: modifiedInput
      }]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
  }
}


export async function getCompletionPlanets(planetName, description) {
    try {
      console.log("getCompletionPlanets");
      console.log("planet: ", planetName)
      console.log("description: ", description)


          // Construct the new modified input
    const modifiedInput = `Here are some aspects and planet positions of a birth chart relevant to the person's ${planetName}:

    ${description}
    
    Please write me a couple of paragraphs interpreting these aspects and positions focusing on the role of the planet ${planetName} in the person's life.
    
    Instead of writing an interpretation for each aspect or position a la carte, please provide a more holistic summary, showing how these aspects and positions may balance or accentuate one another. 

    Please use supportive, friendly and direct language but avoid overly ornate phrasing.
    
    For every reference to a particular position, please also include the reference to the id of that position included in the parenthesis for each aspect or position.`;
    
    console.log("Modified input: ", modifiedInput);
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "StelliumAI is an astrological guide bot."
      }, {
        role: "user",
        content: modifiedInput
      }]
    });
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error fetching response:', error);
    }
  }
  


  function processStrings(strings, subHeading) {
    let resultStrings = strings.map(string => {
        // Remove 'ref:' and any spaces
        let cleanedString = string.replace('ref:', '').trim();

        // Get the first character of the cleaned string
        let firstChar = cleanedString.charAt(0);
        let processedString = '';

        // Determine which method to use based on the first character
        switch (firstChar) {
            case 'R':
                processedString = decodeRulerCode(cleanedString);
                break;
            case 'P':
                processedString = decodePlanetHouseCode(cleanedString);
                break;
            case 'A':
                processedString = decodeAspectCodeMap(cleanedString);
                break;
            default:
                console.log("No processing needed for:", cleanedString);
                return string; // Return original if no processing is needed
        }

        // Append the original string and return the new string
        // console.log(processedString)
        // return processedString + ' ' + string;
        return processedString

    });

    resultStrings.push(subHeading)
    // Join all the processed strings with newline characters
    return resultStrings.join('\n');
}

export async function getCompletionGptResponseForFormattedUserTransits(heading,formattedUserTransits) {
  try {
    console.log("getCompletionGptResponseForFormattedUserTransits")
    const modifiedInput = `Here are some selected transits occurring in this birth chart

    ${formattedUserTransits}
    
    Please generate a short interpretation of the transits focusing on the topic of ${heading}.

    Instead of analyzing each transit or position individually, aim for a more holistic balanced interpretation, using relevant
    aspects and positions to incorporate broader themes from the birth chart in your discussion of the transits.
    
    For every reference to a particular position, please also include the reference to the id of that position included in the parenthesis for each aspect or position.`;
    
    console.log("Modified input: ", modifiedInput);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "StelliumAI is an astrological guide bot."
      }, {
        role: "user",
        content: modifiedInput
      }]
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
  }
}


export async function getCompletionGptResponseForWeeklyUserTransits(transitsWithinNextSevenDays, transitsWithinCurrentDateRange) {
  try {
    console.log("getCompletionGptResponseForFormattedUserTransits")
    const modifiedInput = `Here are the aspects and planet positions of a person's birth chart:

    ${transitsWithinCurrentDateRange}
    
    And the following are transits occurring in this birth chart

    ${transitsWithinNextSevenDays}
    
    Please generate a short interpretation of the transits given above using the birth chart as context.

    Instead of analyzing each transit or position individually, aim for a more holistic balanced interpretation, using relevant
    aspects and positions to incorporate broader themes from the birth chart in your discussion of the transits.
    
    For every reference to a particular position, please also include the reference to the id of that position included in the parenthesis for each aspect or position.`;
    
    console.log("Modified input: ", modifiedInput);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "StelliumAI is an astrological guide bot."
      }, {
        role: "user",
        content: modifiedInput
      }]
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
  }
}

export async function getGptPromptsForWeeklyTransits(heading, transitDescriptions) {
  try {
    console.log("getCompletionGptResponseForFormattedUserTransits")
    const modifiedInput = `Here are a few transits occurring in the next week

    ${transitDescriptions}
    
    Please select the most relevant transits from the list above focusing on the topic of ${heading}.
    
    Do not offer any interpretations of the transits, just select the most relevant ones.
    
    For every reference to a particular position, please also include the reference to the id of that position included in the parenthesis for each aspect or position.`;
    
    console.log("Modified input: ", modifiedInput);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "StelliumAI is an astrological guide bot."
      }, {
        role: "user",
        content: modifiedInput
      }]
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
  }
}

export async function getPromptGenerationCompositeChart(heading, descriptions) {

  const samplePrompt = "I will provide you a list of composite chart aspects and planetary positions, each followed by a code in parentheses. From this list, please return only those aspects and planetary positions that are relevant to the following area of the relationship: "

  const additionalPrompt = "For each matching aspect, include the full original text and the code in parentheses exactly as it appears. Do not provide any interpretation or additional commentary." 

  const modifiedInput = samplePrompt + heading + additionalPrompt + "here is the list: " + descriptions


  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "system",
      content: "StelliumAI is an astrological guide bot."
    }, {
      role: "user",
      content: modifiedInput
    }]
  });
  return response.choices[0].message.content;

}

export async function getPromptGenerationSynastryChart(heading, descriptions) {
  const modifiedInput = `Here are some aspects and planet positions of a synastry chart relevant to the topic of ${heading}:

  ${descriptions}
  
  Please select the most relevant aspects and positions from the list above focusing on the topic of ${heading}.
  
  Do not offer any interpretations of the aspects and positions, just select the most relevant ones.
  
  For every reference to a particular position, please also include the reference to the id of that position included in the parenthesis for each aspect or position.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "system",
      content: "StelliumAI is an astrological guide bot."
    }, {
      role: "user",
      content: modifiedInput
    }]
  });
  return response.choices[0].message.content;
}

export async function getCompletionWithRagResponse(ragResponse, query) {
  try {
    const input = `Here are some existing information and interpretations about the user's birth chart:

    ${ragResponse}
    
    And here is the user's query about their current life situation:

    ${query}
    
    Please provide a response to the user's query based on the existing information and interpretations about the user's birth chart.
    
    Anytime you reference the birth chart, please use the id of the aspect or position in parenthesis.
    
    Please use supportive, friendly and direct language but avoid overly ornate phrasing.
    
    Aim to provide a holistic balanced interpretation of the user's query in the context of the birth chart, rather than list out or analyze each aspect or position individually.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "StelliumAI is an astrological guide bot."
      }, {
        role: "user",
        content: input
      }]
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
  }
}

export async function getCompletionGptResponseForSynastryAspects(heading, promptDescription) {
  try {
    console.log("getCompletionGptResponseForSynastryAspects")
    console.log("heading: ", heading)
    console.log("promptDescription: ", promptDescription)

    const modifiedInput = `Here are some aspects and planet positions of a synastry chart relevant to the topic of ${heading}:

    ${promptDescription}
    
    Please write me a few paragraphs interpreting these aspects and positions focusing on the topic of ${heading}.
    
    Remember, this is a synastry chart, so the aspects and positions are not of the same person but rather the relationship between the two people.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "StelliumAI is an astrological guide bot."
      }, {
        role: "user",
        content: modifiedInput
      }]
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
  }
} 

export async function getCompletionGptResponseForCompositeChart(heading, promptDescription) {
  try {
    console.log("getCompletionGptResponseForCompositeChart")
    console.log("heading: ", heading)
    console.log("promptDescription: ", promptDescription)

    const modifiedInput = `Here are some aspects and planet positions of a composite chart relevant to the topic of ${heading}:

    ${promptDescription}
    
    Please write me a few paragraphs interpreting these aspects and positions focusing on the topic of ${heading}.
    
    Instead of writing an interpretation for each aspect or position a la carte, please provide a more holistic summary, showing how these aspects and positions may balance or accentuate one another. 
    
    Please use supportive, friendly and direct language but avoid overly ornate phrasing.
    
    Remember, this is a composite chart, so the aspects and positions are not of the same person but rather the relationship between the two people.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "StelliumAI is an astrological guide bot."
      }, {
        role: "user",
        content: modifiedInput
      }]
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
  }
} 

export async function getCompletionGptResponseForCompositeChartPlanet(planet, promptDescription) {
  try {
    console.log("getCompletionGptResponseForCompositeChartPlanet")
    console.log("planet: ", planet)
    console.log("promptDescription: ", promptDescription)
    const modifiedInput = `Here are the position and aspects of the planet ${planet} in a composite chart:

    ${promptDescription}
    
    Please write me a few paragraphs interpreting this planet and its aspects in the context of the relationship.
    
    Instead of writing an interpretation for each aspect or position a la carte, please provide a more holistic summary, showing how these aspects and positions may balance or accentuate one another. 
    
    Please use supportive, friendly and direct language but avoid overly ornate phrasing.
    
    Remember, this is a composite chart, so the aspects and positions are not of the same person but rather the relationship between the two people.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "StelliumAI is an astrological guide bot."
      }, {
        role: "user",
        content: modifiedInput
      }]
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
  }
}


export async function getCompletionGptResponseForRelationshipAnalysis(relationshipAnalysisPrompts) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "system",
      content: "StelliumAI is an astrological guide bot."
    }, {
      role: "user",
      content: relationshipAnalysisPrompts
    }]
  });
  return response.choices[0].message.content;
}


export async function getTopicsForChunk(chunkText) {
  // Dynamically extract the labels
  const broadTopicLabels = Object.values(BroadTopicsEnum).map(topic => `"${topic.label}"`).join("\n");

  const prompt = `Given the following astrological text segment, identify which topics are most relevant (return at least one but no more than 3 topics). Use only from this list:

${broadTopicLabels}

Text segment:
${chunkText}

Return format:
{
  "topics": ["topic1", "topic2"] // return at least one but no more than 3 topics
}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const response = JSON.parse(completion.choices[0].message.content);
    return response.topics;
  } catch (error) {
    console.error("Error getting topics for chunk:", error);
    throw error;
  }
}



export async function getCompletionGptResponseGeneral(prompt) {
  console.log("getCompletionGptResponseGeneral")
  // console.log("prompt: ", prompt)
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "system",
      content: "You are an astrological guide bot."
    }, {
      role: "user",
      content: prompt
    }]
  });
  return response.choices[0].message.content;
}

export async function getCompletionGptResponseChatThread(query, contextFromAnalysis, chatHistory) {
  console.log("getCompletionGptResponseChatThread");
  console.log("query: ", query);
  console.log("contextFromAnalysis: ", contextFromAnalysis);
  console.log("chatHistory: ", chatHistory);
  
  try {
    // Start with the system message
    const messages = [{
      role: "system",
      content: "You are an expert astrological guide and counselor. You provide insightful, personalized astrological guidance based on birth chart data, relationship analysis, and astrological context. Your responses are thoughtful, supportive, and grounded in astrological knowledge while being accessible to users of all experience levels. Please adhere to these guidelines: 1) When you answer, assume you are already in a conversation and the user has some context about their birth chart. Do not preface your answer with any unnecessary filler or preamble. Be direct and avoid overly elaborate phrasing. 2) Also, avoid just listing off positions and explaining them in a laundry list manner. Instead, provide a more holistic summary, showing how these aspects and positions may balance or accentuate one another. 3) When you reference the birth chart, please use the id of the aspect or position in parenthesis. 4) Do not add any headings or markdown or other formatting aside from occasional paragraph breaks. 5) Focus on answering the user's specific question using the provided astrological context as supporting information."
    }];

    // Add chat history messages if provided
    if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
      chatHistory.forEach(message => {
        if (message.role && message.content) {
          // Validate that role is acceptable for OpenAI API
          if (['assistant', 'user'].includes(message.role)) {
            messages.push({
              role: message.role,
              content: message.content
            });
          } else {
            console.warn(`Skipping message with invalid role: ${message.role}`);
          }
        }
      });
    }

    // Construct the user message with the original query and context
    const userMessage = `${query}

--- Relevant Astrological Context ---
${contextFromAnalysis}

Please answer my question using the relevant astrological information provided above.`;

    // Add the constructed user message
    messages.push({
      role: "user",
      content: userMessage
    });

    console.log(`Sending ${messages.length} messages to GPT (1 system + ${chatHistory?.length || 0} history + 1 current)`);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in getCompletionGptResponseChatThread:", error);
    throw error;
  }
}



export async function getCompletionShortOverviewForTopic(topic, relevantNatalPositions, RAGResponse) {
    console.log("getCompletionShortOverviewForTopic");
    console.log("topic: ", topic);
    console.log("relevantNatalPositions: ", relevantNatalPositions);
    console.log("RAGResponse: ", RAGResponse);

    const prompt = `Based on the following astrological placements and previous analysis, provide a focused, concise (2 to 3 paragraphs), and holistic interpretation for the topic: "${topic}"

RELEVANT NATAL POSITIONS:
${relevantNatalPositions}

PREVIOUS RELEVANT ANALYSIS:
${RAGResponse}

Please provide a cohesive interpretation that:
1. Focuses specifically on ${topic}
2. Instead of writing an interpretation for each aspect or position a la carte, please provide a more holistic summary, showing how these aspects and positions may balance or accentuate one another. 
3. Please use supportive, friendly and direct language.
4. Avoid overly ornate phrasing.
4. Integrates the natal positions with their corresponding codes
5. Builds upon and references the previous analysis where relevant
6. Provides practical insights and potential manifestations
7. Maintains astrological accuracy while being accessible

Response:`;

    // use prompt to call gpt and get a response
    try {
     const response = await getCompletionGptResponseGeneral(prompt);
     console.log("response: ", response)
     return response;
    } catch (error) {
      console.error('Error fetching response:', error);
    }
}


export async function generateRelationshipPrompt(
  userAName,
  userBName,
  categoryDisplayName,
  relationshipScores,
  formattedAstrology,
  contextA,
  contextB
) {
  return `
You are an expert astrologer providing a relationship analysis.
The relationship is between ${userAName} (referred to as User A) and ${userBName} (referred to as User B).
This specific analysis focuses on the category: "${categoryDisplayName}".

I. RELATIONSHIP DATA FOR "${categoryDisplayName.toUpperCase()}":
Overall Score for this category: ${relationshipScores.overall !== undefined ? relationshipScores.overall : 'N/A'}
- Synastry Score: ${relationshipScores.synastry !== undefined ? relationshipScores.synastry : 'N/A'}
- Composite Score: ${relationshipScores.composite !== undefined ? relationshipScores.composite : 'N/A'}
- Synastry House Placements Score: ${relationshipScores.synastryHousePlacements !== undefined ? relationshipScores.synastryHousePlacements : 'N/A'}
- Composite House Placements Score: ${relationshipScores.compositeHousePlacements !== undefined ? relationshipScores.compositeHousePlacements : 'N/A'}

Key Astrological Factors from their combined charts influencing "${categoryDisplayName}":
${formattedAstrology}

II. INDIVIDUAL CONTEXT FOR ${userAName.toUpperCase()} (USER A) RELEVANT TO "${categoryDisplayName.toUpperCase()}":
(The following is derived from ${userAName}'s individual birth chart analysis)
---
${contextA}
---

III. INDIVIDUAL CONTEXT FOR ${userBName.toUpperCase()} (USER B) RELEVANT TO "${categoryDisplayName.toUpperCase()}":
(The following is derived from ${userBName}'s individual birth chart analysis)
---
${contextB}
---

IV. ANALYSIS TASK:
Based on ALL the information above (the relationship scores, specific astrological interactions between User A and User B, and the individual contexts of User A and User B related to "${categoryDisplayName}"), provide a comprehensive astrological analysis for this facet of their relationship.

Please address the following:
1. How do the individual tendencies and needs of ${userAName} (User A), as suggested by their context, interact with the relationship dynamics for "${categoryDisplayName}"?
2. How do the individual tendencies and needs of ${userBName} (User B), as suggested by their context, interact with the relationship dynamics for "${categoryDisplayName}"?
3. What are the key strengths in this area of their relationship, considering both their individual charts and their combined astrology?
4. What are potential challenges or friction points in this area, and how might their individual natures contribute to or mitigate these?
5. Offer insights or advice for ${userAName} and ${userBName} to navigate and enhance the "${categoryDisplayName}" aspect of their connection.

Provide a thoughtful, balanced, and insightful analysis. Do not just list facts; synthesize them into a coherent narrative.
Be specific and use the provided astrological details and individual contexts to support your points.
Aim for a response of at least 300-500 words for this category.
`;
}





export async function expandPrompt(prompt) {
  console.log("expandPrompt")
  console.log("prompt: ", prompt)
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert astrology assistant. Your primary task is to take a user's question about astrology, which might be brief or vague, and expand it into a more detailed and semantically rich description. This expanded description will be used by a vector search system to find the most relevant astrological information. Ensure your expansion clarifies the original query, incorporates relevant astrological keywords and concepts, and faithfully represents the user's original intent. The output should be a coherent piece of text suitable for semantic matching.`
      },
      {
        role: "user",
        content: `Expand this query for astrology vector search:\n\n"${prompt}"`
      }
    ],
    temperature: 0.5,
    max_tokens: 150
  });

  return completion.choices[0].message.content.trim();
}


