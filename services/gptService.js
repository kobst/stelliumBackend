
import OpenAI from "openai";
import { decodePlanetHouseCode, decodeAspectCode, decodeAspectCodeMap, decodeRulerCode } from "../utilities/decoder.js"


const apiKey = process.env.OPENAI_API_KEY
const client = new OpenAI({ apiKey: apiKey})



export async function getCompletionPrompts(heading, description) {

  try 
  {
    console.log("get prompts")
    console.log("heading: ", heading)
    console.log("description: ", description)

    const additionalText = "\n Please review and score each of the above astrological aspects and planetary positions in terms of its relevance to the following personality or life area: "
    const postAdditionalText = "\n Please list out the transits and aspects you’ve selected from most to least relevant. Please include at least one aspect between planets. Please remember to include the code included next to the description of the transit or aspect in parenthesis when you reference it.";
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


export async function getCompletionPlanets(heading, description) {
    try {
      console.log("getCompletionPlanets");
      console.log("planet: ", heading)
      console.log("description: ", description)


          // Construct the new modified input
    const modifiedInput = `Here are some aspects and planet positions of a birth chart relevant to the person's ${heading}:

    ${description}
    
    Please write me a couple of paragraphs interpreting these aspects and positions focusing on the role of the planet ${heading} in the person's life.
    
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