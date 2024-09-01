
import OpenAI from "openai";
import { decodePlanetHouseCode, decodeAspectCode, decodeAspectCodeMap, decodeRulerCode } from "../utilities/decoder.js"


const apiKey = process.env.OPENAI_API_KEY


const client = new OpenAI({ apiKey: apiKey})



export async function getCompletionPrompts(input) {

  try 
  {
    console.log("get prompts")
    // console.log(input)

    // Extract the bigFourType-heading pattern
    const bigFourTypeHeadingPattern = /([A-Z]+:.+)$/;
    const match = input.match(bigFourTypeHeadingPattern);
    const bigFourTypeHeading = match ? match[0] : null;

    console.log("Extracted bigFourType-heading x x x:", bigFourTypeHeading);
    const response = await client.chat.completions.create({
      model: "ft:gpt-3.5-turbo-0125:personal::9OZnaAYI",
      messages: [{
        role: "system",
        content: "StelliumAI is an astrological guide bot."
      }, {
        role: "user",
        content: input
      }]
    });
    // console.log("message content " + response.choices[0].message.content);
    const responseString = response.choices[0].message.content;
    console.log("responseString: ", responseString)
    // const referenceValues = responseString.match(/\(ref: [^\)]+\)/g);
    // const extractedValues = referenceValues.map(ref => {
    //   const match = ref.match(/\(ref: ([^\)]+)\)/);
    //   return match ? match[1] : '';
    //  });

    // const decoded = processStrings(extractedValues, bigFourTypeHeading)
    // const joinedReferences = extractedValues.join(" ");
    // processStrings(extractedValues)

    // return decoded

    // const decodedWithPrompt = decoded + "\nEvery time you mention a particular aspect or position, please include its reference number provided"

    // const responses = getCompletionBigFour(decodedWithPrompt)

    return responseString
  } catch (error) {
    console.error('Error fetching response:', error);
  }
}

export async function getCompletionBigFour(input) {

    try 
    {
      const response = await client.chat.completions.create({
        model: "ft:gpt-3.5-turbo-0125:personal::97vpyWOG",
        messages: [{
          role: "system",
          content: "StelliumAI is an astrological guide bot."
        }, {
          role: "user",
          content: input
        }]
      });
      // console.log("message content " + response.choices[0].message.content);
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error fetching response:', error);
    }
  }
  
export async function getCompletionPlanets(input) {
    try {
      const response = await client.chat.completions.create({
        model: "ft:gpt-3.5-turbo-0613:personal::8Z7kM823",
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
  
export async function getCompletionPlanetsVer2(input) {

    try {
      // console.log("input getPlanetsV2")
      const response = await client.chat.completions.create({
        model: "ft:gpt-3.5-turbo-0613:personal::8ZOBwrOY",
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