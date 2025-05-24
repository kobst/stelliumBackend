// Import necessary libraries
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { encoding_for_model } from '@dqbd/tiktoken';
import OpenAI from "openai";
import { Pinecone } from '@pinecone-database/pinecone';  
import pkg from '@pinecone-database/pinecone';
import { getTopicsForChunk } from './gptService.js';
import { BroadTopicsEnum,  subTopicSearchPrompts } from '../utilities/constants.js';
import { RELATIONSHIP_CATEGORY_PROMPTS } from '../utilities/relationshipScoringConstants.js';
// const { PineconeClient } = pkg;
// import { PineconeClient } from '@pinecone-database/pinecone';

  // Initialize OpenAI
const apiKey = process.env.OPENAI_API_KEY
const openAiClient = new OpenAI({ apiKey: apiKey})

// Initialize Pinecone
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});
const index = pinecone.index('stellium-test-index');

// Define the splitText function using RecursiveCharacterTextSplitter
export async function splitText(text, maxChunkSize = 900) {  // Increased from 300 to 600
  try {
      // Split into sentences
      const sentences = text.split(/(?<=[.!?])\s+/);
      const chunks = [];
      let currentChunk = '';
      let relatedSentences = [];

      for (const sentence of sentences) {
          // If we're starting a new chunk, add the sentence
          if (currentChunk.length === 0) {
              currentChunk = sentence;
              relatedSentences = [sentence];
              continue;
          }

          // Check if adding this sentence would exceed maxChunkSize
          if ((currentChunk + ' ' + sentence).length > maxChunkSize) {
              // Save current chunk if it's substantial
              if (currentChunk.length >= 200) {  // Minimum chunk size
                  chunks.push(currentChunk.trim());
              }
              currentChunk = sentence;
              relatedSentences = [sentence];
          } else {
              // Add sentence to current chunk
              currentChunk += ' ' + sentence;
              relatedSentences.push(sentence);
          }
      }

      // Add the final chunk if it's substantial
      if (currentChunk.length >= 200) {
          chunks.push(currentChunk.trim());
      }

      return chunks;

  } catch (error) {
      console.error("Error splitting text:", error);
      throw error;
  }
}

// Function to get embeddings
async function getEmbedding(text, model = 'text-embedding-ada-002') {
    const response = await openAiClient.embeddings.create({
        model: model,
        input: text
    });
    const embedding = response.data[0].embedding;
    return embedding;
}



  // Process each section and interpretation


export async function processInterpretationSection(userId, heading, promptDescription, interpretation) {
    try {
      const chunks = await splitText(interpretation);
      const records = [];
  
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunkText = chunks[idx];
        const embedding = await getEmbedding(chunkText);
        const id = `${userId}-${heading}-${idx}`.replace(/\s+/g, '-').toLowerCase();
        
        records.push({
          id: id,
          values: embedding,
          metadata: {
            userId: userId,
            tagged_sections: [topic_headings],
            relevantAspects: promptDescription,
            chunk_index: idx,
            text: chunkText,
          }
        });
      }
  
      // Upsert all records at once
      await index.upsert(records, { namespace: userId });
  
      console.log(`Successfully processed and upserted ${chunks.length} chunks for user ${userId}, heading ${heading}`);
    } catch (error) {
      console.error("Error in processInterpretationSection:", error);
      throw error;
    }
  }


  // export async function processTransitInterpretations(userId, date, promptDescription, interpretation) {
  //   try {
  //     const chunks = await splitText(interpretation);
  //     const records = [];
  
  //     for (let idx = 0; idx < chunks.length; idx++) {
  //       const chunkText = chunks[idx];
  //       const embedding = await getEmbedding(chunkText);
  //       const id = `${userId}-${date}-${idx}`.replace(/\s+/g, '-').toLowerCase();
        
  //       records.push({
  //         id: id,
  //         values: embedding,
  //         metadata: {
  //           userId: userId,
  //           date: date,
  //           relevantAspects: promptDescription,
  //           chunk_index: idx,
  //           text: chunkText,
  //         }
  //       });
  //     }
  
  //     // Upsert all records at once
  //     await index.upsert(records, { namespace: userId });
  
  //     console.log(`Successfully processed and upserted ${chunks.length} chunks for user ${userId}, heading ${heading}`);
  //   } catch (error) {
  //     console.error("Error in processInterpretationSection:", error);
  //     throw error;
  //   }
  // } 




function generateConversationId(userId) {
  const timestamp = Date.now();
  return `${userId}-${timestamp}`;
}


export async function processUserQueryAndAnswer(userId, query, answer, date, conversationId, exchangeIndex) {
  try {
    console.log("Processing user query and answer:", query, answer, );
    console.log("User ID:", userId);
    const queryChunk = await splitText(query);
    const answerChunk = await splitText(answer);

    for (let idx = 0; idx < queryChunk.length; idx++) {
      const chunkText = queryChunk[idx];
      const embedding = await getEmbedding(chunkText);
      const id = `${conversationId}-q${exchangeIndex}-${idx}`; // idx is the chunk index
      
      records.push({
        id: id,
        values: embedding,
        metadata: {
          userId: userId,
          date: date,
          chunk_index: idx,
          text: chunkText,
          conversationId: conversationId
        }
      });
    }


    for (let idx = 0; idx < answerChunk.length; idx++) {
      const chunkText = answerChunk[idx];
      const embedding = await getEmbedding(chunkText);
      const id = `${conversationId}-a${exchangeIndex}-${idx}`;
      
      records.push({
        id: id,
        values: embedding,
        metadata: {
          userId: userId,
          date: date,
          chunk_index: idx,
          text: chunkText,
          conversationId: conversationId
        }
      });
    }

  } catch (error) {
    console.error("Error in processUserQueryAndAnswer:", error);
    throw error;
  }
}





export async function processCompositeChartInterpretationSection(compositeChartId, heading, promptDescription, interpretation) {
  try {
    const chunks = await splitText(interpretation);
    const records = [];

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunkText = chunks[idx];
      const embedding = await getEmbedding(chunkText);
      const id = `${compositeChartId}-composite-${heading}-${idx}`.replace(/\s+/g, '-').toLowerCase();
      
      records.push({
        id: id,
        values: embedding,
        metadata: {
          compositeChartId: compositeChartId,
          type: 'composite',
          section: heading,
          relevantAspects: promptDescription,
          chunk_index: idx,
          text: chunkText,
        }
      });
    }

    // Upsert all records at once
    await index.upsert(records, { namespace: compositeChartId });

    console.log(`Successfully processed and upserted ${chunks.length} chunks for composite chart ${compositeChartId}, heading ${heading}`);
  } catch (error) {
    console.error("Error in processInterpretationSection:", error);
    throw error;
  }
}



// export async function processUserQuerySynastry(compositeChartId, query) {
//   console.log("Processing user query:", query);
//   console.log("User ID:", compositeChartId);
//   try{
//     const questionQueryEmbedding = await getEmbedding(query);
//     const results = await index.query({
//       vector: questionQueryEmbedding,
//       topK: 5,
//       includeMetadata: true,
//       filter: {
//         compositeChartId: compositeChartId,
//         type: 'synastry'
//       }
//     });
//     // Extract relevantAspects and text from each match
//     const extractedData = results.matches.map((match, index) => {
//       console.log(`Match ${index + 1} metadata:`, match.metadata);
//       return {
//         relevantAspects: match.metadata.relevantAspects,
//         text: match.metadata.text
//       };
//     });

//     console.log("Extracted data:", extractedData);

//     // If you want to return a single string with all the information
//     const combinedText = extractedData.map(data => 
//       `Relevant Aspects: ${data.relevantAspects}\nText: ${data.text}`
//     ).join('\n\n');
//     console.log("Combined text:", combinedText);
//     return combinedText;
//   } catch (error) {
//     console.error("Error in processUserQuery:", error);
//     throw error;
//   }
// }

export async function processUserQueryRelationship(compositeChartId, query) {
  console.log("Processing user query:", query);
  console.log("User ID:", compositeChartId);
  try{
    const questionQueryEmbedding = await getEmbedding(query);
    const results = await index.query({
      vector: questionQueryEmbedding,
      topK: 5,
      includeMetadata: true,
      filter: {
        compositeChartId: compositeChartId,
        type: 'composite'
      }
    });
    // Extract relevantAspects and text from each match
    const extractedData = results.matches.map((match, index) => {
      console.log(`Match ${index + 1} metadata:`, match.metadata);
      return {
        relevantAspects: match.metadata.relevantAspects,
        text: match.metadata.text
      };
    });

    console.log("Extracted data:", extractedData);

    // If you want to return a single string with all the information
    const combinedText = extractedData.map(data => 
      `Relevant Aspects: ${data.relevantAspects}\nText: ${data.text}`
    ).join('\n\n');
    console.log("Combined text:", combinedText);
    return combinedText;
  } catch (error) {
    console.error("Error in processUserQuery:", error);
    throw error;
  }
}

// import { splitText } from './textProcessing.js';

// Helper to process a section of text with its description (if any)
export async function processTextSection(text, userId, description = null) {
    try {
        const chunks = await splitText(text);
        const records = [];

        for (let idx = 0; idx < chunks.length; idx++) {
            const chunkText = chunks[idx];
            const topics = await getTopicsForChunk(chunkText);
            console.log("chunkText: ", chunkText)
            console.log("topics: ", topics)
            const embedding = await getEmbedding(chunkText);
            
            records.push({
                id: `${userId}-${Date.now()}-${idx}`,
                values: embedding,
                metadata: {
                    userId: userId,
                    description: description,
                    topics: topics,
                    chunk_index: idx,
                    text: chunkText,
                }
            });
        }

        return records;
    } catch (error) {
        console.error("Error in processTextSection:", error);
        throw error;
    }
}


export async function processTextSectionRelationship(text, compositeChartId, description = null, category = null, relevantPositionData = null) {
  try {
      const chunks = await splitText(text);
      const records = [];

      for (let idx = 0; idx < chunks.length; idx++) {
          const chunkText = chunks[idx];
          // const topics = await getTopicsForChunk(chunkText);
          console.log("chunkText: ", chunkText)
          // console.log("topics: ", topics)
          const embedding = await getEmbedding(chunkText);
          
          records.push({
              id: `${compositeChartId}-${Date.now()}-${idx}`,
              values: embedding,
              metadata: {
                  compositeChartId: compositeChartId,
                  description: description,
                  relationshipCategory: category,
                  relevantPositionData: relevantPositionData,
                  chunk_index: idx,
                  text: chunkText,
              }
          });
      }

      return records;
  } catch (error) {
      console.error("Error in processTextSection:", error);
      throw error;
  }
}


export async function upsertRecords(records, nameSpaceId) {
  // console.log("upserting records: ", records)
  console.log("nameSpaceId: ", nameSpaceId)
  await index.upsert(records, { namespace: nameSpaceId });
}


export async function upsertRelationshipRecords(records, compositeChartId) {
  try {
      if (!records || records.length === 0) {
          console.log("No records to upsert");
          return { success: true, count: 0 };
      }
      
      const operations = records.map(record => ({
          updateOne: {
              filter: { 
                  compositeChartId: compositeChartId,
                  chunkId: record.chunkId 
              },
              update: { $set: record },
              upsert: true
          }
      }));
      
      const result = await vectorCollection.bulkWrite(operations);
      console.log(`Upserted ${result.upsertedCount + result.modifiedCount} relationship vector records`);
      
      return {
          success: true,
          count: result.upsertedCount + result.modifiedCount
      };
  } catch (error) {
      console.error("Error upserting relationship vector records:", error);
      throw error;
  }
}


export async function retrieveTopicContext(userId, topic) {
    console.log("retrieving topic context: ", topic);
    console.log("user ID: ", userId);
    
    try {

      const prompt = subTopicSearchPrompts[topic]
      console.log("prompt: ", prompt)
        // Get embedding for the prompt
      const promptEmbedding = await getEmbedding(prompt);
        
        // Query 1: Get results by metadata topic match
        const topicResults = await index.query({
            vector: promptEmbedding, // still needed even though we're not using it for ranking
            topK: 5,
            includeMetadata: true,
            filter: {
                $and: [
                    { userId: userId },
                    { topics: { $in: [topic] } }  // Changed from $contains to $in
                ]
            }
        });

        // Query 2: Get results by vector similarity
        const vectorResults = await index.query({
            vector: promptEmbedding,
            topK: 5,
            includeMetadata: true,
            filter: {
                userId: userId
            }
        });

        // Combine results and remove duplicates
        const seenIds = new Set();
        const combinedResults = [];

        // Helper function to add unique results
        const addUniqueResult = (match) => {
            if (!seenIds.has(match.id)) {
                seenIds.add(match.id);
                combinedResults.push({
                    text: match.metadata.text,
                    description: match.metadata.description,
                    score: match.score,
                    topics: match.metadata.topics,
                    matchType: match.matchType // indicates how this result was found
                });
            }
        };

        // Add topic matches first
        topicResults.matches.forEach(match => {
            match.matchType = 'topic';
            addUniqueResult(match);
        });

        // Add vector matches
        vectorResults.matches.forEach(match => {
            match.matchType = 'vector';
            addUniqueResult(match);
        });

        return {
            matches: combinedResults
        };

    } catch (error) {
        console.error("Error retrieving topic context:", error);
        throw error;
    }
} 

export async function getRelationshipCategoryContextForUser(userId, relationshipCategory) {
    console.log("getRelationshipCategoryContextForUser: ", userId, relationshipCategory)
    const prompt = RELATIONSHIP_CATEGORY_PROMPTS[relationshipCategory];
    if (!prompt) {
        console.error(`No prompt found for category: ${relationshipCategory}`);
        return []; // Or throw an error
    }
    try {
        // Use your existing getEmbedding function
        const embedding = await getEmbedding(prompt);
        const results = await index.query({
            vector: embedding,
            topK: 5,
            includeMetadata: true,
            filter: { userId: userId }
        });

        if (results && results.matches) {
            return results.matches.map(match => ({
                text: match.metadata.text,
                description: match.metadata.description,
                topics: match.metadata.topics,
                score: match.score,
                id: match.id
            }));
        }
        return [];
    } catch (error) {
        console.error(`Error in getRelationshipCategoryContextForUser for category ${relationshipCategory}, user ${userId}:`, error);
        throw error;
    }
}




// CHAT QUERY


export async function processUserQueryForBirthChartAnalysis(userId, query, numResults = 5) {
  console.log("Processing user query:", query);
  console.log("User ID:", userId);
  try{
    const questionQueryEmbedding = await getEmbedding(query);
    const results = await index.query({
      vector: questionQueryEmbedding,
      topK: numResults, // Consider making this configurable or tuning it
      includeMetadata: true,
      filter: {
        userId: userId
      }
    });

    // Extract relevant data from each match
    const extractedData = results.matches.map((match, index) => {
      console.log(`Match ${index + 1} metadata:`, match.metadata);
      // Ensure metadata and its properties exist before accessing
      const text = match.metadata?.text || "";     // Default to empty string if text undefined
      const description = match.metadata?.description || ""; // Optionally include description

      return {
        text: text,
        description: description // You might want to include this as well
      };
    });

    console.log("Extracted data:", extractedData);

    // Combine the extracted data into a single string for context
    const combinedText = extractedData.map(data => {
      // Format topics nicely if it's an array
      let contextEntry = "";
      if (data.description) { // Optionally add the general description
        contextEntry += `Relevant Astrological Positions: ${data.description}\n`;
      }

      contextEntry += `Text: ${data.text}`;
      return contextEntry;
    }).join('\n\n---\n\n'); // Added a separator for clarity between chunks

    console.log("Combined text for RAG:", combinedText);
    return combinedText;
  } catch (error) {
    console.error("Error in processUserQuery:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

export async function processUserQueryForRelationshipAnalysis(compositeChartId, query, numResults = 5) {
  console.log("Processing user query:", query);
  console.log("Composite Chart ID:", compositeChartId);
  try{
    const questionQueryEmbedding = await getEmbedding(query);
    const results = await index.query({
      vector: questionQueryEmbedding,
      topK: numResults, // Consider making this configurable or tuning it
      includeMetadata: true,
      filter: {
        compositeChartId: compositeChartId
      }
    });

    // Extract relevant data from each match
    const extractedData = results.matches.map((match, index) => {
      console.log(`Match ${index + 1} metadata:`, match.metadata);
      // Ensure metadata and its properties exist before accessing
      const text = match.metadata?.text || "";     // Default to empty string if text undefined
      const description = match.metadata?.description || ""; // Optionally include description

      return {
        text: text,
        description: description // You might want to include this as well
      };
    });

    console.log("Extracted data:", extractedData);

    // Combine the extracted data into a single string for context
    const combinedText = extractedData.map(data => {
      // Format topics nicely if it's an array
      let contextEntry = "";
      if (data.description) { // Optionally add the general description
        contextEntry += `Relevant Astrological Positions: ${data.description}\n`;
      }

      contextEntry += `Text: ${data.text}`;
      return contextEntry;
    }).join('\n\n---\n\n'); // Added a separator for clarity between chunks

    console.log("Combined text for RAG:", combinedText);
    return combinedText;
  } catch (error) {
    console.error("Error in processUserQuery:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}