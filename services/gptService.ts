// @ts-nocheck
import OpenAI from "openai";
import { decodePlanetHouseCode, decodeAspectCode, decodeAspectCodeMap, decodeRulerCode } from "../utilities/archive/decoder.js"
import { BroadTopicsEnum } from "../utilities/constants.js"



const apiKey = process.env.OPENAI_API_KEY
const client = new OpenAI({ apiKey: apiKey})



export async function getCompletionShortOverview(description) {
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

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
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

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    console.log("GPT response:", response.choices[0].message.content);
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
    throw error;
  }
}




export async function getCompletionPlanets(planetName, description) {
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

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
    throw error;
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

export async function getCompletionGptResponseForSynastryAspects(heading, promptDescription) {
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

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
  }
}


export async function getCompletionGptResponseForCompositeChart(heading, promptDescription) {
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

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
  }
}


export async function getCompletionGptResponseForCompositeChartPlanet(planet, promptDescription) {
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

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching response:', error);
  }
}


export async function getCompletionGptResponseForRelationshipAnalysis(relationshipAnalysisPrompts) {
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

export async function getCompletionForNatalPlanet(planet, context, description) {
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
1️⃣ Write 2 to 3 paragraphs that describe how ${planet}'s placement and aspects shape the native's expression of ${planet}'s energies.
2️⃣ Note talents, advantages, strengths as welll  potential challenges and opportunities for growth, maintaining an encouraging tone.
Weave in specific aspects and house placements to illustrate key points BUT
Avoid bullet lists or any other formatting and Avoid simply just describing each aspect or position in isolation; 
create a flowing narrative, offering balance and pointing out sources of tension or emphasis
Use ID codes in parentheses when available.
`;

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


export async function getCompletionForDominancePattern(category, context, description) {
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
2️) Explore potential tensions, lessons, or paths toward balance.
3) Incorporate any of the themes from the birth chart overview if they are relevant.

Use supportive, intuitive language, and highlight the most meaningful patterns holistically.`;

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

function formatCategoryName(category) {
  return category.split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
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
      content: "You are an expert astrological guide and counselor. You provide insightful, personalized astrological guidance based on birth chart data, relationship analysis, and astrological context. Your responses are thoughtful, supportive, and grounded in astrological knowledge while being accessible to users of all experience levels. Please adhere to these guidelines: 1) When you answer, assume you are already in a conversation and the user has some context about their birth chart. Do not preface your answer with any unnecessary filler or preamble. Be direct and avoid overly elaborate phrasing. 2) Also, avoid just listing off positions and explaining them in a laundry list manner. Instead, provide a more holistic summary, showing how these aspects and positions may balance or accentuate one another. 3) When you reference the birth chart, please use the id of the aspect or position in parenthesis. 4) Do not add any headings or markdown or other formatting aside from occasional paragraph breaks. 5) Focus on answering the user's specific question using the provided astrological context as supporting information. Do not expand beyond the original scope of the question unless the extra context is relevant or neessary to answer the question"
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



export async function getCompletionGptResponseRelationshipChatThread(
  query,
  contextFromRelationship,
  contextFromUserA,
  contextFromUserB,
  chatHistory,
  userAName = 'User A',
  userBName = 'User B'
) {
  console.log("getCompletionGptResponseRelationshipChatThread");
  console.log("query: ", query);
  console.log("contextFromRelationship: ", contextFromRelationship);
  console.log("contextFromUserA: ", contextFromUserA);
  console.log("contextFromUserB: ", contextFromUserB);
  console.log("chatHistory: ", chatHistory);
  
  try {
    // Start with the system message
    const messages = [{
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


export async function getCompletionShortOverviewForTopic(topic, relevantNatalPositions, RAGResponse) {
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

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    console.log("GPT response:", response.choices[0].message.content);
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in getCompletionShortOverviewForTopic:", error);
    throw error;
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



export async function getCompletionForRelationshipCategory(
  userAName,
  userBName,
  categoryDisplayName,
  relationshipScores,
  formattedAstrology,
  contextA,
  contextB
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

Every interpretation should reflect how the unique energies between the two people blend or contrast in this relationship area. Avoid vague spiritual generalities and use the provided astrology to make your points grounded and helpful.
`;

    const userPrompt = `
Relationship Analysis for "${categoryDisplayName}" between ${userAName} (User A) and ${userBName} (User B)

I. SCORES:
- Overall Score: ${relationshipScores.overall ?? "N/A"}
- Synastry Score: ${relationshipScores.synastry ?? "N/A"}
- Composite Score: ${relationshipScores.composite ?? "N/A"}
- Synastry House Placements: ${relationshipScores.synastryHousePlacements ?? "N/A"}
- Composite House Placements: ${relationshipScores.compositeHousePlacements ?? "N/A"}

II. ASTROLOGICAL FACTORS FOR "${categoryDisplayName}":
${formattedAstrology}

III. CONTEXT FOR ${userAName.toUpperCase()} (User A):
${contextA}

IV. CONTEXT FOR ${userBName.toUpperCase()} (User B):
${contextB}

TASK:
Please write 3–5 paragraphs addressing the following:
1. How does User A’s nature interact with the dynamics of "${categoryDisplayName}" in this relationship?
2. How does User B’s nature interact with these same dynamics?
3. What are the core strengths in this area?
4. What are the potential growth edges or friction points?
5. What advice would help them support or evolve this aspect of their connection?

Write a synthesis, not a list. Use astrological data and psychological insight to offer grounded, helpful guidance.
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in getCompletionForRelationshipCategory:", error);
    throw error;
  }
}




export async function expandPrompt(prompt) {
  console.log("expandPrompt")
  console.log("prompt: ", prompt)
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

export async function expandPromptRelationship(prompt) {
  console.log("expandPromptRelationship")
  console.log("prompt: ", prompt)
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
        content: `Expand this query for astrology vector search that will be executed over an analysis of the relationship between ${userAName} and ${userBName}:\n\n"${prompt}"`
      }
    ],
    temperature: 0.5,
    max_tokens: 150
  });

  return completion.choices[0].message.content.trim();
}


export async function expandPromptRelationshipUserA(prompt) {
  console.log("expandPromptRelationshipUserA")
  console.log("prompt: ", prompt)
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

export async function expandPromptRelationshipUserB(prompt) {
  console.log("expandPromptRelationshipUserA")
  console.log("prompt: ", prompt)
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

