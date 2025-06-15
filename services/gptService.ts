import OpenAI from "openai";
import type {
  ChatMessage,
  NatalPlanetCompletionParams,
  RelationshipCategoryParams,
  TopicAnalysisParams,
  HoroscopeGenerationParams,
  ChatThreadParams,
  RelationshipChatThreadParams,
  TopicClassificationResult,
  HoroscopeResponse,
  RelationshipPanelsResponse
} from '../types/gpt.js';
import type { RelationshipFlag } from '../types/relationshipFlags.js';
import { formatAspectsForGPT } from '../utilities/relationshipFlags.js';
import { decodePlanetHouseCode, decodeAspectCode, decodeAspectCodeMap, decodeRulerCode } from "../utilities/archive/decoder.js"
import { BroadTopicsEnum } from "../utilities/constants.js"
import { processUserQueryForHoroscopeAnalysis } from "./vectorize.js"
import { getBirthChart } from "./dbService.js"
import { getOpenAIApiKey } from "./secretsService.js"

// Lazy initialization of OpenAI client
let client: OpenAI;

async function getOpenAIClient(): Promise<OpenAI> {
  if (!client) {
    const apiKey = await getOpenAIApiKey();
    client = new OpenAI({ 
      apiKey: apiKey,
      timeout: 30000, // 30 second timeout
      maxRetries: 2   // Limit retries to prevent connection buildup
    });
  }
  return client;
}



export async function getCompletionShortOverview(description: string): Promise<string> {
  try {
    console.log("getCompletionShortOverview");
    console.log("description:", description);

    const systemPrompt = `
You are StelliumAI, an insightful and supportive astrology interpreter.

You are writing a brief overview of a user's core identity based on their Sun, Moon, Ascendant, and key aspects involving those placements.

Write a holistic interpretation — do NOT list positions one by one. Instead, synthesize how these placements and aspects interact to shape the user's personality, emotional dynamics, and outward presence.

Use warm, direct, and clear language. Avoid poetic or abstract phrases. Focus on clarity and insight.

Any time you reference a specific planetary position or aspect, include the associated ID code from the input (in parentheses).

Example: "With the Sun in Taurus (Pp-SusTa01) and a quincunx to Neptune (A-SusTa01CaQuNesSa08)..."
`;

    const userPrompt = `
Here are some of the core positions and aspects from a birth chart:

${description}

Please write 2–3 paragraphs interpreting these placements holistically.`;

    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    console.log("GPT response:", response.choices[0].message.content);
    return response.choices[0].message.content;
  } catch (error: unknown) {
    console.error('Error fetching response:', error);
    throw error;
  }
}


export async function getCompletionShortOverviewRelationships(description: string): Promise<string> {
  try {
    console.log("getCompletionShortOverviewRelationships");
    console.log("description:", description);

    const systemPrompt = `
You are StelliumAI, an intuitive astrology interpreter focused on relationships and intimacy.

Your task is to write a short interpretation of how a person's birth chart influences their romantic, sexual, and emotional relationship patterns.

You are working from core positions and aspects related to Venus, Mars, the Moon, the 5th, 7th, and 8th houses, or other relevant relationship indicators.

Do NOT list each placement separately. Instead, write a holistic 2–3 paragraph summary that explores:
- How this person gives and receives love
- Emotional intimacy style
- Romantic or sexual themes and growth areas

Use clear, warm, supportive language. Avoid poetic or overly abstract language. Reference all planetary positions or aspects using the ID codes in parentheses exactly as they appear in the input.
`;

    const userPrompt = `
Below are key aspects and planet positions related to relationships and intimacy:

${description}

Please write 2–3 paragraphs interpreting this in a relational context. Focus on connection, desire, vulnerability, and growth.`;

    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    console.log("GPT response:", response.choices[0].message.content);
    return response.choices[0].message.content;
  } catch (error: unknown) {
    console.error('Error fetching response:', error);
    throw error;
  }
}




export async function getCompletionPlanets(planetName: string, description: string): Promise<string> {
  try {
    console.log("getCompletionPlanets");
    console.log("planet:", planetName);
    console.log("description:", description);

    const systemPrompt = `
You are StelliumAI, a skilled and supportive astrological guide.

You are writing an interpretation of a planet's role in a person's birth chart.

Focus on the planet's sign, house, and aspects — but do not interpret each one individually. Instead, write a **holistic narrative** that explores how the energy of this planet influences the person's life, psychology, and development.

Reference positions using the ID codes (in parentheses) provided in the input.

Your tone should be warm, clear, and direct — avoid mystical jargon or overly poetic phrasing. You are here to empower the user with practical insight and emotional resonance.
`;

    const userPrompt = `
Here are aspects and placements related to the person's ${planetName}:

${description}

Please write 2–3 paragraphs interpreting the role of ${planetName} in their life, weaving together the influences holistically. If you reference a particular aspect or placement, please use the ID code in parentheses.`;

    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    return response.choices[0].message.content;
  } catch (error: unknown) {
    console.error('Error fetching response:', error);
    throw error;
  }
}



  function processStrings(strings: any[], subHeading: string): string {
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

export async function getCompletionGptResponseForSynastryAspects(heading: string, promptDescription: string): Promise<string | undefined> {
  try {
    console.log("getCompletionGptResponseForSynastryAspects");
    console.log("heading: ", heading);
    console.log("promptDescription: ", promptDescription);

    const systemPrompt = `
You are StelliumAI, a compassionate and insightful astrological guide.

You are interpreting **synastry charts**, which compare the natal charts of two individuals to explore their romantic and relational compatibility.

Your job is to help users understand how the planetary aspects between their charts influence attraction, emotional connection, communication, intimacy, long-term potential, and karmic dynamics.

Do not interpret aspects one by one — instead, provide a **holistic narrative** focused on the selected relationship topic.

Keep your tone warm, wise, and accessible. Avoid mystic jargon or overly poetic phrasing. Help the reader understand *how they relate*, not just what the planets mean.

Always remember: this is a synastry chart — the aspects and positions describe how **two different people** affect each other through their chart interplay.
`;

    const userPrompt = `
Here are some planetary aspects and placements from a synastry chart related to the topic: **${heading}**.

${promptDescription}

Please write 2–3 paragraphs interpreting these dynamics in the context of the topic "${heading}". Synthesize how the aspects influence the connection, and highlight both strengths and potential growth areas.
`;

    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    return response.choices[0].message.content;
  } catch (error: unknown) {
    console.error('Error fetching response:', error);
    return undefined;
  }
}


export async function getCompletionGptResponseForCompositeChart(heading: string, promptDescription: string): Promise<string | undefined> {
  try {
    console.log("getCompletionGptResponseForCompositeChart");
    console.log("heading: ", heading);
    console.log("promptDescription: ", promptDescription);

    const systemPrompt = `
You are StelliumAI, a thoughtful, friendly astrological guide.

Your job is to interpret composite charts — describing the energetic dynamic between two people in a relationship.

Write in a holistic, emotionally intelligent way. Avoid listing aspects or placements one by one. Instead, explain how the combined energies work together or present tension.

Keep your tone warm, direct, supportive, and insightful — avoid overly poetic or mystic language.

Always remember: this is a composite chart, so the positions and aspects describe *the relationship itself*, not either individual.`;

    const userPrompt = `
Here are some planetary positions and aspects from a composite chart related to the topic: **${heading}**.

${promptDescription}

Please write 2–3 paragraphs interpreting these placements, focusing on how they reflect dynamics in the area of "${heading}" in the relationship. Use a holistic summary rather than analyzing each aspect individually.`;

    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    return response.choices[0].message.content;
  } catch (error: unknown) {
    console.error('Error fetching response:', error);
    return undefined;
  }
}


export async function getCompletionGptResponseForCompositeChartPlanet(planet: string, promptDescription: string): Promise<string | undefined> {
  try {
    console.log("getCompletionGptResponseForCompositeChartPlanet");
    console.log("planet: ", planet);
    console.log("promptDescription: ", promptDescription);

    const systemPrompt = `
You are StelliumAI, an astrological guide who interprets composite charts to offer relationship insight.

Your tone is friendly, supportive, and direct — never overly ornate or flowery.

You do not interpret planetary placements or aspects individually or in list form. Instead, provide a holistic narrative that shows how these dynamics blend, balance, or create tension in the relationship.

Always remember: a composite chart reflects the dynamic between two people, not an individual.

Write clearly and accessibly, like a thoughtful guide rather than a mystic.`;

    const userPrompt = `
Here are the position and aspects of the planet ${planet} in a composite chart:

${promptDescription}

Please write 2–3 paragraphs interpreting this planet in the relationship context, using a holistic perspective.`;

    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    return response.choices[0].message.content;
  } catch (error: unknown) {
    console.error('Error fetching response:', error);
    return undefined;
  }
}


export async function getCompletionGptResponseForRelationshipAnalysis(relationshipAnalysisPrompts: string) {
  const client = await getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a StelliumAi, an expert astrology assistant. Your primary task is to take a user's question about astrology in the context of their relationship`
      },
    {
      role: "user",
      content: relationshipAnalysisPrompts
    }]
  });
  return response.choices[0].message.content;
}


export async function getTopicsForChunk(chunkText: string, retries: number = 3) {
  console.log(`Getting topics for chunk (${chunkText.length} chars)`);
  
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

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Topic classification attempt ${attempt}/${retries}`);
      
      // Add timeout to the API call
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Topic classification timeout after 30 seconds')), 30000)
      );
      
      const client = await getOpenAIClient();
      const completionPromise = client.chat.completions.create({
        model: "gpt-4o-mini", // Changed from gpt-4 to gpt-4o-mini for speed
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 100 // Limit response size
      });
      
      const completion = await Promise.race([completionPromise, timeoutPromise]) as any;
      const response = JSON.parse(completion.choices[0].message.content);
      
      console.log(`Topics identified: ${response.topics}`);
      return response.topics;
      
    } catch (error) {
      console.error(`Topic classification attempt ${attempt}/${retries} failed:`, error.message);
      
      if (attempt === retries) {
        console.error(`All topic classification attempts failed, using fallback`);
        // Fallback to default topics if all retries fail
        return ["Personal Growth"]; // Safe default topic
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function getCompletionForNatalPlanet(planet: string, context: string, description: string) {
  try {
    console.log("getCompletionForNatalPlanet");
    console.log("planet:", planet);
    console.log("context:", context);
    console.log("description:", description);

    const systemPrompt = `
You are StelliumAI, an expert in natal chart astrology.

You are interpreting the influence of a specific planet in a person's birth chart. 
Use warm, empowering, and clear language. 
Avoid bullet points, mystic language, or breaking down each aspect separately.

Instead, write a flowing, holistic interpretation that explores:
- How this planet expresses itself through its sign, house, and aspects
- Emotional, psychological, or behavioral themes related to this planet
- Strengths and talents as well as potential challenges
- Opportunities for growth, integration, or self-awareness

If an ID (e.g., Pp-SusTa01 or A-MosCa04EaTrVesPi12) is given for a placement or aspect, include it in parentheses when referencing that feature.
`;

    const userPrompt = `
CONTEXT:
• Planet: ${planet}
• Birth Chart Overview:
${context}

PLANETARY PATTERNS:
${description}

TASK:
1) Write 2 to 3 paragraphs that describe how ${planet}'s placement and aspects shape the native's expression of ${planet}'s energies.
2) Note talents, advantages, strengths as well as potential challenges and opportunities for growth, maintaining an encouraging tone.
Weave in specific aspects and house placements to illustrate key points BUT
Avoid bullet lists or any other formatting and Avoid simply just describing each aspect or position in isolation; 
create a flowing narrative, offering balance and pointing out sources of tension or emphasis
Use ID codes in parentheses when available.
`;

    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in getCompletionForNatalPlanet:", error);
    throw error;
  }
}


export async function getCompletionForDominancePattern(category: string, context: string, description: string) {
  try {
    console.log("getCompletionForDominancePattern");
    console.log("category:", category);
    console.log("context:", context);
    console.log("description:", description);

    const systemPrompt = `
You are StelliumAI, an expert astrological interpreter specializing in birth chart patterns.

You are interpreting **dominance patterns** such as element distribution, modality balance, or quadrant concentration.

Your tone is warm, empowering, and clear. Avoid bullet points or listing features one-by-one. Instead, write a fluid narrative that shows how dominant patterns influence personality and behavior.

Use specific planet placements and aspects to illustrate your points, and always provide insight into both strengths and growth opportunities.
`;

    const userPrompt = `
CONTEXT:
• Dominance Type: ${formatCategoryName(category)} Distribution
• Birth Chart Overview:
${context}

DOMINANCE PATTERNS:
${description}

TASK:
Write 2 to 3 paragraphs:
1) Describe how the ${category.toLowerCase()} distribution shapes this person's personality and expression.
2) Explore potential tensions, lessons, or paths toward balance.
3) Incorporate any of the themes from the birth chart overview if they are relevant.

Use supportive, intuitive language, and highlight the most meaningful patterns holistically.`;

    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in getCompletionForDominancePattern:", error);
    throw error;
  }
}


export async function getCompletionForChartPattern(category: string, context: string, description: string) {
  try {
    console.log("getCompletionForDominancePatternPatterns");
    console.log("category:", category);
    console.log("context:", context);
    console.log("description:", description);

    const systemPrompt = `
You are StelliumAI, an expert astrological interpreter specializing in birth chart patterns and planetary configurations.

You are interpreting **chart patterns** such as stelliums, grand trines, T-squares, and other significant planetary configurations.

Your tone is warm, empowering, and clear. Focus on how these patterns create unique dynamics in the birth chart and influence the person's life path.

Use specific planet placements, aspects, and house positions to illustrate your points. Explain both the challenges and opportunities these patterns present.
`;

    const userPrompt = `
CONTEXT:
• Chart Pattern Type: ${formatCategoryName(category)}
• Birth Chart Overview:
${context}

CHART PATTERNS:
${description}

TASK:
Write 2 to 3 paragraphs:
1) Describe how these chart patterns create unique dynamics in the birth chart and influence the person's life path.
2) Explain the challenges and opportunities these patterns present, including any tension points or harmonious aspects.
3) Connect these patterns to the broader themes in the birth chart overview if relevant.

Use supportive, intuitive language, and highlight how these patterns work together to create a unique astrological signature.`;

    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in getCompletionForDominancePatternPatterns:", error);
    throw error;
  }
}

function formatCategoryName(category: string) {
  return category.split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
}

export async function getCompletionGptResponseChatThread(query: string, contextFromAnalysis: string, chatHistory: any[]) {
  console.log("getCompletionGptResponseChatThread");
  console.log("query: ", query);
  console.log("contextFromAnalysis: ", contextFromAnalysis);
  console.log("chatHistory: ", chatHistory);
  
  try {
    // Start with the system message
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [{
      role: "system",
      content: "You are an expert astrological guide and counselor. You provide insightful, personalized astrological guidance based on birth chart data, relationship analysis, and astrological context. Your responses are thoughtful, supportive, and grounded in astrological knowledge while being accessible to users of all experience levels. Please adhere to these guidelines: 1) When you answer, assume you are already in a conversation and the user has some context about their birth chart. Do not preface your answer with any unnecessary filler or preamble. Be direct and avoid overly elaborate phrasing. 2) Also, avoid just listing off positions and explaining them in a laundry list manner. Instead, provide a more holistic summary, showing how these aspects and positions may balance or accentuate one another. 3) When you reference the birth chart, please use the id of the aspect or position in parenthesis. 4) Do not add any headings or markdown or other formatting aside from occasional paragraph breaks. 5) Focus on answering the user's specific question using the provided astrological context as supporting information. Do not expand beyond the original scope of the question unless the extra context is relevant or neessary to answer the question"
    }];

    // Add chat history messages if provided
    if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
      chatHistory.forEach(message => {
        if (message.role && message.content) {
          // Validate that role is acceptable for OpenAI API
          if (['assistant', 'user'].includes(message.role)) {
            messages.push({
              role: message.role as 'assistant' | 'user',
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

    const client = await getOpenAIClient();
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



export async function getCompletionGptResponseRelationshipChatThread(
  query: string,
  contextFromRelationship: string,
  contextFromUserA: string,
  contextFromUserB: string,
  chatHistory: any[],
  userAName: string = 'User A',
  userBName: string = 'User B'
) {
  console.log("getCompletionGptResponseRelationshipChatThread");
  console.log("query: ", query);
  console.log("contextFromRelationship: ", contextFromRelationship);
  console.log("contextFromUserA: ", contextFromUserA);
  console.log("contextFromUserB: ", contextFromUserB);
  console.log("chatHistory: ", chatHistory);
  
  try {
    // Start with the system message
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [{
      role: "system",
      content: "You are an expert astrological guide and counselor. You provide insightful, personalized astrological guidance based on birth chart data, relationship analysis, and astrological context. Your responses are thoughtful, supportive, and grounded in astrological knowledge while being accessible to users of all experience levels. Please adhere to these guidelines: 1) When you answer, assume you are already in a conversation and the user has some context about their birth chart. Do not preface your answer with any unnecessary filler or preamble. Be direct and avoid overly elaborate phrasing. 2) Also, avoid just listing off positions and explaining them in a laundry list manner. Instead, provide a more holistic summary, showing how these aspects and positions may balance or accentuate one another. 3) When you reference the birth chart, please use the id of the aspect or position in parenthesis. 4) Do not add any headings or markdown or other formatting aside from occasional paragraph breaks. 5) Focus on answering the user's specific question using the provided astrological context as supporting information. Do not expand beyond the original scope of the question unless the extra context is relevant or neessary to answer the question."
    }];

    // Add chat history messages if provided
    if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
      chatHistory.forEach(message => {
        if (message.role && message.content) {
          // Validate that role is acceptable for OpenAI API
          if (['assistant', 'user'].includes(message.role)) {
            messages.push({
              role: message.role as 'assistant' | 'user',
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

--- Relationship Analysis Context ---
${contextFromRelationship}

--- ${userAName}'s Birth Chart Context ---
${contextFromUserA}

--- ${userBName}'s Birth Chart Context ---
${contextFromUserB}

Please answer my question about my relationship using the relevant astrological information provided above.`;

    // Add the constructed user message
    messages.push({
      role: "user",
      content: userMessage
    });

    console.log(`Sending ${messages.length} messages to GPT (1 system + ${chatHistory?.length || 0} history + 1 current)`);

    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in getCompletionGptResponseRelationshipChatThread:", error);
    throw error;
  }
}


export async function getCompletionShortOverviewForTopic(topic: string, relevantNatalPositions: string, RAGResponse: string) {
  try {
    console.log("getCompletionShortOverviewForTopic");
    console.log("topic:", topic);
    console.log("relevantNatalPositions:", relevantNatalPositions);
    console.log("RAGResponse:", RAGResponse);

    const systemPrompt = `
You are StelliumAI, a helpful and insightful astrology assistant.

You are writing a 2–3 paragraph interpretation focused on one specific life area and focus topic within one of several general themes such as romance, career, family, etc.

You are given:
- A list of relevant placements and aspects (with ID codes)
- Previously written interpretations or relevant context

Your goal is to synthesize this information into a **focused, accessible, and emotionally intelligent narrative** for the given topic.

Do not interpret each feature one-by-one. Instead, write a holistic synthesis.

Be clear, encouraging, and avoid mystical jargon or overly ornate phrasing. Emphasize psychological themes, patterns, and practical manifestations. Always maintain astrological accuracy.
`;

    const userPrompt = `
Topic: **${topic}**

RELEVANT NATAL POSITIONS:
${relevantNatalPositions}

PREVIOUS RELEVANT ANALYSIS:
${RAGResponse}

TASK:
Write 2–3 paragraphs:
1. Focus specifically on "${topic}" using the provided placements and RAG-based analysis.
2. Create a holistic, flowing narrative — not a list of placements.
3. Include ID codes (e.g., Pp-SusTa01) when referencing chart positions.
4. Build upon previous analysis rather than repeating it.
5. Offer practical insights and growth perspectives.
`;

    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    console.log("Complete Prompt for Short Overview For Topic: ", userPrompt);
    console.log("GPT response:", response.choices[0].message.content);
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in getCompletionShortOverviewForTopic:", error);
    throw error;
  }
}


export async function generateRelationshipPrompt(
  userAName: string,
  userBName: string,
  categoryDisplayName: string,
  relationshipScores: any,
  formattedAstrology: string,
  contextA: string,
  contextB: string
) {
  return `
You are an expert astrologer providing a relationship analysis.
The relationship is between ${userAName} and ${userBName}.
This specific analysis focuses on the category: "${categoryDisplayName}".

I. RELATIONSHIP DATA FOR "${categoryDisplayName.toUpperCase()}":
Overall Score for this category: ${relationshipScores.overall !== undefined ? relationshipScores.overall : 'N/A'}
- Synastry Score: ${relationshipScores.synastry !== undefined ? relationshipScores.synastry : 'N/A'}
- Composite Score: ${relationshipScores.composite !== undefined ? relationshipScores.composite : 'N/A'}
- Synastry House Placements Score: ${relationshipScores.synastryHousePlacements !== undefined ? relationshipScores.synastryHousePlacements : 'N/A'}
- Composite House Placements Score: ${relationshipScores.compositeHousePlacements !== undefined ? relationshipScores.compositeHousePlacements : 'N/A'}

Key Astrological Factors from their combined charts influencing "${categoryDisplayName}":
${formattedAstrology}

II. INDIVIDUAL CONTEXT FOR ${userAName.toUpperCase()} RELEVANT TO "${categoryDisplayName.toUpperCase()}":
(The following is derived from ${userAName}'s individual birth chart analysis)
---
${contextA}
---

III. INDIVIDUAL CONTEXT FOR ${userBName.toUpperCase()} RELEVANT TO "${categoryDisplayName.toUpperCase()}":
(The following is derived from ${userBName}'s individual birth chart analysis)
---
${contextB}
---

IV. ANALYSIS TASK:
Based on ALL the information above (the relationship scores, specific astrological interactions between ${userAName} and ${userBName}, and the individual contexts of ${userAName} and ${userBName} related to "${categoryDisplayName}"), provide a comprehensive astrological analysis for this facet of their relationship.

Please address the following:
1. How do the individual tendencies and needs of ${userAName}, as suggested by their context, interact with the relationship dynamics for "${categoryDisplayName}"?
2. How do the individual tendencies and needs of ${userBName}, as suggested by their context, interact with the relationship dynamics for "${categoryDisplayName}"?
3. What are the key strengths in this area of their relationship, considering both their individual charts and their combined astrology?
4. What are potential challenges or friction points in this area, and how might their individual natures contribute to or mitigate these?
5. Offer insights or advice for ${userAName} and ${userBName} to navigate and enhance the "${categoryDisplayName}" aspect of their connection.

Provide a thoughtful, balanced, and insightful analysis. Do not just list facts; synthesize them into a coherent narrative.
Be specific and use the provided astrological details and individual contexts to support your points.
Aim for a response of at least 300-500 words for this category.
`;
}



export async function getCompletionForRelationshipCategory(
  userAName: string,
  userBName: string,
  categoryDisplayName: string,
  relationshipScores: any,
  formattedAstrology: string,
  contextA: string,
  contextB: string
) {
  try {
    console.log("getCompletionForRelationshipCategory");
    console.log("category:", categoryDisplayName);

    const systemPrompt = `
You are StelliumAI, an expert in astrological relationship interpretation.

You interpret synastry and composite chart data to help couples understand their relational dynamics.

Your tone is warm, direct, emotionally intelligent, and empowering.

You do not list placements or aspects a la carte — instead, weave a holistic story that integrates:
- The relationship chart dynamics (synastry, composite, house overlays)
- The individual birth chart traits of both people
- Strengths, tension points, and advice for navigating them

- Do not preface your response with any unnecessary filler or preamble. 
- Do not restate the specific category name in your response.
- Be direct and avoid overly elaborate phrasing. 
- Do not add any headings or markdown or other formatting aside from occasional paragraph breaks. 

Every interpretation should reflect how the unique energies between the two people blend or contrast in this relationship area. Avoid vague spiritual generalities and use the provided astrology to make your points grounded and helpful.
`;

    const userPrompt = `
Relationship Analysis for "${categoryDisplayName}" between ${userAName} and ${userBName}

I. SCORES:
- Overall Score: ${relationshipScores.overall ?? "N/A"}
- Synastry Score: ${relationshipScores.synastry ?? "N/A"}
- Composite Score: ${relationshipScores.composite ?? "N/A"}
- Synastry House Placements: ${relationshipScores.synastryHousePlacements ?? "N/A"}
- Composite House Placements: ${relationshipScores.compositeHousePlacements ?? "N/A"}

II. ASTROLOGICAL FACTORS FOR "${categoryDisplayName}":
${formattedAstrology}

III. CONTEXT FOR ${userAName.toUpperCase()}:
${contextA}

IV. CONTEXT FOR ${userBName.toUpperCase()}:
${contextB}

TASK:
Please write 3–5 paragraphs addressing the following:
1. How does ${userAName}'s nature interact with the dynamics of "${categoryDisplayName}" in this relationship?
2. How does ${userBName}'s nature interact with these same dynamics?
3. What are the core strengths in this area?
4. What are the potential growth edges or friction points?
5. What advice would help them support or evolve this aspect of their connection?

Write a synthesis, not a list. Use astrological data and psychological insight to offer grounded, helpful guidance.
`;

    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    console.log("Complete Prompt for Relationship Category: ", userPrompt);
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in getCompletionForRelationshipCategory:", error);
    throw error;
  }
}

export async function getRelationshipCategoryPanels(
  userAName: string,
  userBName: string,
  categoryDisplayName: string,
  relationshipScores: any,
  astrologicalDetails: any,
  contextA: string,
  contextB: string,
  category?: string, // Added category parameter for context summarization
  scoreSynopsisData?: any // Added synopsis data for inline context
) {
  // Import the new utilities
  const { createRelationshipFocusedSummary } = await import('../utilities/contextSummarization.js');
  const { createScoreContextLine, formatScoreForPrompt } = await import('../utilities/scoreInterpretation.js');
  const { createInlineScoreSynopsis } = await import('../utilities/inlineScoreSynopsis.js');
  
  const client = await getOpenAIClient();
  
  // Create summarized contexts (max 100 words each instead of full contexts)
  const summarizedContextA = await createRelationshipFocusedSummary(contextA, userBName, category || 'OVERALL_ATTRACTION_CHEMISTRY');
  const summarizedContextB = await createRelationshipFocusedSummary(contextB, userAName, category || 'OVERALL_ATTRACTION_CHEMISTRY');
  
  // Create score context line for prompts
  const scoreContext = createScoreContextLine(relationshipScores, category || 'OVERALL_ATTRACTION_CHEMISTRY');
  
  // Create inline synopsis if data is available
  let inlineSynopsis = '';
  if (scoreSynopsisData) {
    console.log('Score synopsis data structure:', JSON.stringify(scoreSynopsisData, null, 2));
    try {
      inlineSynopsis = createInlineScoreSynopsis({
        ...scoreSynopsisData,
        categoryScore: relationshipScores.overall || 0,
        category: category || 'OVERALL_ATTRACTION_CHEMISTRY'
      }, userAName, userBName);
    } catch (error) {
      console.error('Error creating inline synopsis:', error);
      inlineSynopsis = ''; // Fallback to empty string on error
    }
  }
  
  // Synastry Panel - Enhanced with word limits and narrative structure
  const synastry = await (async () => {
    const systemPrompt = `You are StelliumAI, an expert in astrological relationship interpretation.

You interpret synastry data to help couples understand their inter-chart dynamics. Focus specifically on how the two birth charts interact with each other through aspects and house overlays.

Your tone is warm, direct, emotionally intelligent, and empowering.

You weave one through-line: hook → key spark → core challenge → take-home tip.
Mention scores only once. 160-word limit.

You do not list placements or aspects a la carte — instead, weave a holistic story that integrates:
- The inter-chart synastry dynamics between each person's birth chart (synastry aspects and house overlays)
- How these interactions create chemistry, challenges, or growth opportunities
- One actionable tip echoing the score synopsis

- Do not preface your response with any unnecessary filler or preamble. 
- Do not restate the specific category name in your response.
- Be direct and avoid overly elaborate phrasing. 
- Do not add any headings or markdown or other formatting aside from occasional paragraph breaks.
- End each analysis with one actionable tip the couple can try

Every interpretation should reflect how the unique energies between the two people interact in this relationship area. Avoid vague spiritual generalities and use the provided astrology to make your points grounded and helpful.`;
    
    const userPrompt = `${inlineSynopsis}Synastry Analysis for "${categoryDisplayName}" between ${userAName} and ${userBName}

SCORE CONTEXT: ${scoreContext}

SYNASTRY ASPECTS:
${astrologicalDetails.synastryAspects}

SYNASTRY HOUSE PLACEMENTS:
${astrologicalDetails.synastryHousePlacements}

TASK: Write 2 short paragraphs (160 words total) focusing exclusively on synastry dynamics. Structure your response as follows:
1. First paragraph: Identify the strongest synastry connections that create the main dynamic in this relationship area
2. Second paragraph: Explain the core challenge or tension and end with one specific actionable tip

Focus only on synastry - how their charts interact with each other, not on composite chart dynamics or individual birth chart traits.`;

    console.log("Enhanced Synastry Panel Prompt: ", userPrompt);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });
    return response.choices[0].message.content.trim();
  })();

  // Composite Chart Interpretation - Enhanced with word limits
  const composite = await (async () => {
    const systemPrompt = `You are StelliumAI, an expert in composite chart interpretation. Focus on the relationship as its own entity - the "third being" created when two people come together.

Contrast how the composite energy supports or complicates the synastry story. 140-word limit.

Your tone is warm, direct, and insightful. Treat the composite chart as revealing the relationship's inherent personality and potential.`;
    
    const userPrompt = `Composite Chart Analysis for "${categoryDisplayName}" between ${userAName} and ${userBName}

SCORE CONTEXT: ${scoreContext}

COMPOSITE ASPECTS:
${astrologicalDetails.compositeAspects}

COMPOSITE HOUSE PLACEMENTS:
${astrologicalDetails.compositeHousePlacements}

SYNASTRY CONTEXT (for contrast): The synastry shows ${formatScoreForPrompt(relationshipScores.synastry || 0, category || 'OVERALL_ATTRACTION_CHEMISTRY', 'synastry')} inter-chart dynamics.

TASK: In 1-2 paragraphs (140 words total), analyze how the composite chart reveals the relationship's inherent nature. How does this composite energy support or complicate the synastry dynamics? What is the relationship's "personality" regarding ${categoryDisplayName}?`;

    console.log("Enhanced Composite Prompt: ", userPrompt);
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });
    return response.choices[0].message.content.trim();
  })();

  // Full Analysis - Sequential processing using previous panels + revised deep-dive structure
  const fullAnalysis = await (async () => {
    const systemPrompt = `You are StelliumAI, an expert in astrological relationship interpretation.

You create deep-dive analyses that synthesize synastry, composite, and individual traits into actionable relationship guidance.

Your tone is warm, direct, emotionally intelligent, and empowering.

Don't re-explain the facts from the synastry and composite panels above; use them as ingredients to create a comprehensive relationship story.

Structure your response following this 300-350 word outline:
1. Opening hook (scores + headline)
2. Chemistry paragraph (use green-flag aspects)
3. Growth edge paragraph (use red-flag aspects + composite dynamics)
4. ${userAName} POV (70 words) → how to lean into strength
5. ${userBName} POV (70 words) → how to buffer challenge
6. Action paragraph (specific weekly ritual)

- Do not preface your response with any unnecessary filler or preamble.
- Do not restate the specific category name in your response.
- Be direct and avoid overly elaborate phrasing.
- Do not add any headings or markdown or other formatting aside from occasional paragraph breaks.

Every interpretation should reflect how the unique energies between the two people blend or contrast in this relationship area. Focus on actionable guidance over astrological theory.`;

    const userPrompt = `${inlineSynopsis}Deep-Dive Relationship Analysis for "${categoryDisplayName}" between ${userAName} and ${userBName}

SCORE CONTEXT: ${scoreContext}

SYNASTRY PANEL INSIGHTS:
${synastry}

COMPOSITE PANEL INSIGHTS:
${composite}

SUMMARIZED INDIVIDUAL CONTEXTS:
${userAName}: ${summarizedContextA}
${userBName}: ${summarizedContextB}

TASK: Write a comprehensive 300-350 word analysis that follows this structure:
1. Opening hook combining the scores and main relationship theme
2. Chemistry dynamics paragraph highlighting the strongest positive connections
3. Growth edge paragraph addressing the main challenges and how composite energy affects them
4. ${userAName}'s perspective: How they can best contribute to this area (70 words)
5. ${userBName}'s perspective: How they can best contribute to this area (70 words)
6. Actionable guidance: One specific weekly practice or ritual they can implement together

Synthesize the panel insights above with the individual contexts to create a cohesive story. Don't repeat the synastry/composite analysis—build on it.`;

    console.log("Enhanced Full Analysis Prompt: ", userPrompt);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });
    return response.choices[0].message.content;
  })();

  return { synastry, composite, fullAnalysis };
}

/**
 * Generates a concise analysis of the top positive and negative aspects for a relationship category
 * @param categoryDisplayName - Name of the relationship category (e.g. "Overall Attraction Chemistry")
 * @param extractionResult - Full extraction result with all sorted aspects and identified flags
 * @param userAName - First person's name
 * @param userBName - Second person's name
 * @returns GPT-generated analysis of the top aspects
 */
export async function generateScoreAnalysis(
  categoryDisplayName: string,
  extractionResult: any, // ScoreExtractionResult & { allPositiveAspects: RelationshipScoredItem[], allNegativeAspects: RelationshipScoredItem[] }
  userAName: string,
  userBName: string,
  categoryScore?: number // Optional overall category score for context
): Promise<string> {
  try {
    console.log(`Generating score analysis for ${categoryDisplayName}`);
    console.log(`Positive aspects: ${extractionResult.allPositiveAspects.length}, Negative aspects: ${extractionResult.allNegativeAspects.length}`);
    console.log(`High scoring items: ${extractionResult.greenFlagCount}, Low scoring items: ${extractionResult.redFlagCount}`);

    // Handle case where there are no aspects at all
    if (extractionResult.allPositiveAspects.length === 0 && extractionResult.allNegativeAspects.length === 0) {
      return `This area shows minimal astrological activity between ${userAName} and ${userBName}, suggesting a neutral dynamic where other factors in their charts may be more influential. The relationship in this area will likely develop based on conscious choices rather than strong astrological drivers.`;
    }

    const systemPrompt = `You are StelliumAI, a whip-smart astro-match commentator.

      Job: deliver a **punchy micro-forecast (2-3 sentences)** for one
      relationship category.

      Style rules
      1. Hook the reader in the first clause; use vivid verbs (“ignites…”, “anchors…”).
      2. Mention the #1 green-flag aspect *and*, if present, the #1 red-flag aspect.
      3. End with a quick “so what” tip the couple can try tonight or this week.
      4. No headings, lists, or colons. Flowing prose only.
      5. Keep jargon light—translate ‘quincunx’ into everyday language if used.

      If all top aspects are positive, lean optimistic but remind them to keep nurturing the vibe.
      If mixed, show how tension can be growth fuel. If mostly challenging, reassure and
      offer one constructive action.`;


    // Format the top aspects using the utility function
    const { positiveSummary, negativeSummary } = formatAspectsForGPT(extractionResult, 3);

    // Add score color context if category score is provided
    let scoreLine = "";
    if (categoryScore !== undefined) {
      const scoreTone = 
        categoryScore >= 75 ? "high" :
        categoryScore >= 45 ? "moderate" :
        "low";
      scoreLine = `Overall ${categoryDisplayName} score: ${categoryScore}/100 – a ${scoreTone}-vibe zone.\n`;
    }

    const userPrompt = `${scoreLine}Top astro drivers for ${userAName} × ${userBName}:

${positiveSummary}

${negativeSummary}

TASK: Using the rules above, write the 2-3-sentence micro-forecast.${extractionResult.greenFlagCount > 0 || extractionResult.redFlagCount > 0 ? ' Note which aspects are marked as high or low scores, as these are especially significant.' : ''}`;

    console.log("Score Analysis Prompt v2: ", userPrompt);

    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ],
      temperature: 0.7,
      max_tokens: 120
    });

    const analysis = response.choices[0].message.content?.trim() || 
      "Unable to generate aspect analysis at this time.";
    
    console.log(`Aspect analysis generated for ${categoryDisplayName}: ${analysis.length} characters`);
    return analysis;

  } catch (error) {
    console.error(`Error generating aspect analysis for ${categoryDisplayName}:`, error);
    // Return a fallback analysis based on what we have
    const hasPositive = extractionResult.allPositiveAspects.length > 0;
    const hasNegative = extractionResult.allNegativeAspects.length > 0;
    
    if (hasPositive && hasNegative) {
      return `This area shows both supportive and challenging astrological factors for ${userAName} and ${userBName}, creating a dynamic that requires conscious navigation and mutual understanding.`;
    } else if (hasPositive) {
      return `This area shows supportive astrological factors that naturally enhance ${userAName} and ${userBName}'s connection and compatibility.`;
    } else if (hasNegative) {
      return `This area presents some astrological challenges that ${userAName} and ${userBName} can work through with awareness and open communication.`;
    } else {
      return `This area of ${userAName} and ${userBName}'s relationship shows moderate astrological influence, allowing them to shape this dynamic through their choices and actions.`;
    }
  }
}

// Legacy function name for backward compatibility
export async function generateFlagAnalysis(
  categoryDisplayName: string,
  extractionResult: any,
  userAName: string,
  userBName: string
): Promise<string> {
  return generateScoreAnalysis(categoryDisplayName, extractionResult, userAName, userBName);
}

export async function expandPrompt(prompt: string) {
  console.log("expandPrompt")
  console.log("prompt: ", prompt)
  const client = await getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are StelliumAI, an expert astrology assistant. Your primary task is to take a user's question about astrology in context of a birthchart analysis, which might be brief or vague, and expand it into a more detailed and semantically rich description. This expanded description will be used by a vector search system to find the most relevant astrological information. Ensure your expansion clarifies the original query, incorporates relevant astrological keywords and concepts, and faithfully represents the user's original intent. The output should be a coherent piece of text suitable for semantic matching.`
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

export async function expandPromptRelationship(prompt: string, userAName: string, userBName: string) {
  console.log("expandPromptRelationship")
  console.log("prompt: ", prompt)
  const client = await getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a StelliumAi, an expert astrology assistant. Your primary task is to take a user's question about astrology in the context of their relationship, which might be brief or vague, and expand it into a more detailed and semantically rich description. 
        
        This expanded description will be used by a vector search system to find the most relevant astrological information from their partner's birth chart analysis. 
        
        Ensure your expansion clarifies the original query, incorporates relevant astrological keywords and concepts, and faithfully represents the user's original intent. The output should be a coherent piece of text suitable for semantic matching.`
      },
      {
        role: "user",
        content: `Expand this query asked by ${userAName} for astrology vector search that will be executed over an analysis of the relationship between ${userAName} and ${userBName}:\n\n"${prompt}"`
      }
    ],
    temperature: 0.5,
    max_tokens: 150
  });

  return completion.choices[0].message.content.trim();
}


export async function expandPromptRelationshipUserA(prompt: string) {
  console.log("expandPromptRelationshipUserA")
  console.log("prompt: ", prompt)
  const client = await getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a StelliumAi, an expert astrology assistant. Your primary task is to take a user's question about astrology in the context of their relationship, which might be brief or vague, and expand it into a more detailed and semantically rich description. 
        
        This expanded description will be used by a vector search system to find the most relevant astrological information from their partner's birth chart analysis. 
        
        Ensure your expansion clarifies the original query, incorporates relevant astrological keywords and concepts, and faithfully represents the user's original intent. The output should be a coherent piece of text suitable for semantic matching.`
      },
      {
        role: "user",
        content: `Expand this relationship query to find the person asking the question's own astrological traits that contribute to this relationship dynamic:\n\n"${prompt}"`
      }
    ],
    temperature: 0.5,
    max_tokens: 150
  });

  return completion.choices[0].message.content.trim();
}

export async function expandPromptRelationshipUserB(prompt: string) {
  console.log("expandPromptRelationshipUserA")
  console.log("prompt: ", prompt)
  const client = await getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a StelliumAi, an expert astrology assistant. Your primary task is to take a user's question about astrology in the context of their relationship, which might be brief or vague, and expand it into a more detailed and semantically rich description. 
        
        This expanded description will be used by a vector search system to find the most relevant astrological information from their partner's birth chart analysis. 
        
        Ensure your expansion clarifies the original query, incorporates relevant astrological keywords and concepts, and faithfully represents the user's original intent. The output should be a coherent piece of text suitable for semantic matching.`
      },
      {
        role: "user",
        content: `Expand this relationship query to find the question-asker's partner's astrological traits that might explain what the question-asker is experiencing::\n\n"${prompt}"`
      }
    ],
    temperature: 0.5,
    max_tokens: 150
  });

  return completion.choices[0].message.content.trim();
}



// Horoscope generation functions

export async function generateHoroscopeNarrative(data: any) {
  const { 
    userId, 
    period, 
    startDate, 
    endDate, 
    hasKnownBirthTime,
    mainThemes,
    immediateEvents,
    moonPhases,
    transitToTransitAspects
  } = data;
  
  // Get user context for personalization
  const contextChunks = await getRelevantContextForHoroscope(userId, mainThemes);
  
  const systemPrompt = `You are StelliumAI, generating a ${period} horoscope for a user. Create a flowing narrative that weaves together astrological transits into practical, empowering guidance.

Guidelines:
- Start with the overall energy/theme of the period
- Integrate immediate events as specific opportunities or challenges within the larger context
- ${hasKnownBirthTime ? 'Reference life areas (houses) when relevant' : 'Focus on psychological and behavioral themes only (no house references)'}
- Keep the tone warm, empowering, and practical
- For weekly horoscopes: 150-200 words
- For monthly horoscopes: 250-350 words
- Don't list transits mechanically; create a cohesive story
- Use accessible language while maintaining astrological accuracy`;

  const userPrompt = `Time Period: ${startDate.toDateString()} - ${endDate.toDateString()}

User Context from their birth chart analysis:
${contextChunks.join('\n')}

Main Themes (slower-moving transits providing backdrop):
${mainThemes.map((t: any) => formatTransitForPrompt(t)).join('\n')}

Immediate Events (faster transits, exact or prominent this period):
${immediateEvents.map((t: any) => formatTransitForPrompt(t)).join('\n')}

${moonPhases.length > 0 ? `
Significant Moon Phases:
${moonPhases.map((t: any) => formatMoonPhaseForPrompt(t)).join('\n')}
` : ''}

${transitToTransitAspects.length > 0 ? `
Notable Sky Patterns (affecting everyone):
${transitToTransitAspects.slice(0, 3).map((t: any) => formatSkyPatternForPrompt(t)).join('\n')}
` : ''}

Generate a ${period} horoscope that integrates these elements into a meaningful narrative.`;


console.log("userPrompt X X X: ", userPrompt)

  const client = await getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: period === 'weekly' ? 300 : 500
  });

  return {
    horoscopeText: completion.choices[0].message.content.trim(),
    userPrompt: userPrompt
  };
}

// Helper function to get relevant user context for horoscope
async function getRelevantContextForHoroscope(userId: string, mainThemes: any[]) {
  // Get user's birth chart to access house positions
  const birthChart = await getBirthChart(userId);
  
  // First, create rich contextual queries for each transit
  const transitQueries = await Promise.all(
    mainThemes.slice(0, 3).map((theme: any) => createTransitContextQuery(theme, birthChart))
  );
  
  // Perform vector searches for each transit query
  const searchPromises = transitQueries.map(query => 
    processUserQueryForHoroscopeAnalysis(userId, query, 2)
  );
  
  const searchResults = await Promise.all(searchPromises);
  
  // Filter out empty results and return
  return searchResults.filter(result => result && result.length > 0);
}

// Generate a rich, contextual query for a specific transit
async function createTransitContextQuery(transit: any, birthChart: any) {
  const { transitingPlanet, targetPlanet, aspect, description } = transit;
  
  // Define archetypal meanings for better context
  const planetArchetypes = {
    'Sun': 'identity, self-expression, vitality, life purpose',
    'Moon': 'emotions, instincts, home, family, security needs',
    'Mercury': 'communication, thinking, learning, daily routines',
    'Venus': 'relationships, love, beauty, values, pleasure',
    'Mars': 'action, desire, assertiveness, conflict, passion',
    'Jupiter': 'expansion, growth, optimism, opportunities, wisdom',
    'Saturn': 'responsibility, discipline, limitations, maturity, career',
    'Uranus': 'change, rebellion, innovation, freedom, awakening',
    'Neptune': 'spirituality, imagination, confusion, idealism, dissolution',
    'Pluto': 'transformation, power, death/rebirth, intensity, shadow',
    'Ascendant': 'self-image, appearance, first impressions, new beginnings',
    'Midheaven': 'career, reputation, public life, life direction'
  };
  
  const aspectMeanings = {
    'conjunction': 'merging and intensification',
    'opposition': 'awareness through tension and balance',
    'square': 'challenge requiring action and growth',
    'trine': 'flowing harmony and ease',
    'sextile': 'opportunity and cooperation'
  };
  
  const houseMeanings = {
    1: 'self, identity, physical body',
    2: 'resources, values, possessions',
    3: 'communication, siblings, learning',
    4: 'home, family, roots',
    5: 'creativity, romance, children',
    6: 'work, health, service',
    7: 'partnerships, relationships',
    8: 'transformation, shared resources',
    9: 'philosophy, higher learning, travel',
    10: 'career, reputation, public life',
    11: 'friends, groups, hopes',
    12: 'spirituality, unconscious, isolation'
  };
  
  // Find the house position and sign of the target planet in birth chart
  let targetHouse = null;
  let targetSign = null;
  if (targetPlanet && birthChart && birthChart.planets) {
    const planet = birthChart.planets.find((p: any) => p.name === targetPlanet);
    if (planet) {
      targetHouse = planet.house;
      targetSign = planet.sign;
    }
  }
  
  // Get the current sign of the transiting planet from the transit data
  const transitingSign = transit.transitingSign || null;
  
  // If multiple signs during the transit window, note them
  const transitingSigns = transit.transitingSigns || [];
  
  // Build query components
  const transitingArchetype = (planetArchetypes as Record<string, any>)[transitingPlanet] || transitingPlanet;
  const targetArchetype = targetPlanet ? ((planetArchetypes as Record<string, any>)[targetPlanet] || targetPlanet) : 'personal energy';
  const aspectMeaning = (aspectMeanings as Record<string, any>)[aspect] || aspect;
  const houseContext = targetHouse ? (houseMeanings as Record<string, any>)[targetHouse] : null;
  
  // Create a query that includes both technical terms and meanings
  let searchQuery = `${transitingPlanet}`;
  
  // Handle multiple signs if planet changes signs during transit
  if (transitingSigns.length > 1) {
    searchQuery += ` moving from ${transitingSigns[0]} to ${transitingSigns[transitingSigns.length - 1]}`;
  } else if (transitingSign) {
    searchQuery += ` in ${transitingSign}`;
  }
  
  searchQuery += ` ${aspect} ${targetPlanet}`;
  if (targetSign) searchQuery += ` in ${targetSign}`;
  if (targetHouse) searchQuery += ` in ${targetHouse}th house`;
  
  // Add descriptive context
  searchQuery += `. ${transitingPlanet}`;
  
  if (transitingSigns.length > 1) {
    searchQuery += ` (${transitingArchetype}) changing signs from ${transitingSigns[0]} to ${transitingSigns[transitingSigns.length - 1]}`;
  } else if (transitingSign) {
    searchQuery += ` in ${transitingSign} (${transitingArchetype})`;
  } else {
    searchQuery += ` (${transitingArchetype})`;
  }
  
  searchQuery += ` bringing ${aspectMeaning} to ${targetPlanet}`;
  if (targetSign) searchQuery += ` in ${targetSign}`;
  searchQuery += ` (${targetArchetype})`;
  
  if (targetHouse) {
    searchQuery += ` in ${targetHouse}th house matters of ${houseContext}`;
  }
  
  // Log for debugging
  console.log(`Transit context query: "${searchQuery}"`);
  
  return searchQuery;
}

// Import helper functions from other modules
import { formatTransitForPrompt } from '../utilities/transitPrioritization.js';
import { formatMoonPhaseForPrompt } from '../utilities/moonPhaseAnalysis.js';
import { formatSkyPatternForPrompt } from '../utilities/horoscopeGeneration.js';

// Generate horoscope narrative from custom transit events
export async function generateCustomTransitNarrative(data: any) {
  const { 
    userId, 
    period, 
    startDate, 
    endDate, 
    hasKnownBirthTime,
    customTransitEvents
  } = data;
  
  // Get user context for personalization
  const contextChunks = await getRelevantContextForHoroscope(userId, customTransitEvents.slice(0, 3));
  
  // Separate events by type for better organization
  const transitToNatal = customTransitEvents.filter((e: any) => e.type === 'transit-to-natal');
  const transitToTransit = customTransitEvents.filter((e: any) => e.type === 'transit-to-transit');
  const moonPhaseEvents = customTransitEvents.filter((e: any) => e.type === 'moon-phase');
  
  const systemPrompt = `You are StelliumAI, generating a custom horoscope based on specific transits selected by the user. Create a focused narrative that addresses these particular astrological events.

Guidelines:
- Focus specifically on the transits provided, as these were deliberately selected
- Create a cohesive interpretation that shows how these transits work together
- ${hasKnownBirthTime ? 'Reference life areas (houses) when relevant' : 'Focus on psychological and behavioral themes only (no house references)'}
- Keep the tone warm, empowering, and practical
- Length should match the scope: ${period === 'daily' ? '100-150 words' : period === 'weekly' ? '150-200 words' : '250-350 words'}
- Don't add extra transits or themes not mentioned in the input
- Use accessible language while maintaining astrological accuracy`;

  const userPrompt = `Time Period: ${startDate.toDateString()} - ${endDate.toDateString()}

User Context from their birth chart analysis:
${contextChunks.join('\n')}

Selected Transits for Interpretation:
${transitToNatal.map((t: any) => formatTransitForPrompt(t)).join('\n')}

${moonPhaseEvents.length > 0 ? `
Moon Phases:
${moonPhaseEvents.map((t: any) => formatMoonPhaseForPrompt(t)).join('\n')}
` : ''}

${transitToTransit.length > 0 ? `
Sky Patterns (affecting everyone):
${transitToTransit.map((t: any) => formatSkyPatternForPrompt(t)).join('\n')}
` : ''}

Generate a focused horoscope interpretation for these specific transits.`;

  console.log("Custom horoscope userPrompt: ", userPrompt);

  const client = await getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: period === 'daily' ? 200 : period === 'weekly' ? 300 : 500
  });

  return {
    horoscopeText: completion.choices[0].message.content.trim()
  };
}

