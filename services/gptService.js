
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY})

export async function getCompletionBigFour(input) {
    console.log("input " + input)
    try {
      const response = await client.chat.completions.create({
        model: "ft:gpt-3.5-turbo-0613:personal::8WZqFE7Z",
        messages: [{
          role: "system",
          content: "StelliumAI is an astrological guide bot."
        }, {
          role: "user",
          content: input
        }]
      });
      console.log("message content " + response.choices[0].message.content);
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

