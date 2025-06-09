// @ts-nocheck
// Import necessary libraries
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { encoding_for_model } from '@dqbd/tiktoken';
import OpenAI from "openai";
import { Pinecone } from '@pinecone-database/pinecone';  
import pkg from '@pinecone-database/pinecone';
import { BroadTopicsEnum,  subTopicSearchPrompts } from '../utilities/constants.js';
import { RELATIONSHIP_CATEGORY_PROMPTS } from '../utilities/relationshipScoringConstants.js';
// const { PineconeClient } = pkg;
// import { PineconeClient } from '@pinecone-database/pinecone';

  // Initialize OpenAI
const apiKey = process.env.OPENAI_API_KEY
const openAiClient = new OpenAI({ 
    apiKey: apiKey,
    timeout: 30000, // 30 second timeout
    maxRetries: 2   // Limit retries to prevent connection buildup
});

// Initialize Pinecone with connection limits
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});
const index = pinecone.index('stellium-test-index');


// Define the splitText function using RecursiveCharacterTextSplitter
export async function splitText(text, maxChunkSize = 900) {  // Increased from 300 to 600
  try {
      console.log(`splitText called with text length: ${text?.length}, text preview: "${text?.substring(0, 100)}..."`);
      
      // Split into sentences
      const sentences = text.split(/(?<=[.!?])\s+/);
      console.log(`Split into ${sentences.length} sentences`);
      
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
              // Save current chunk if it's substantial (reduced minimum from 200 to 50)
              if (currentChunk.length >= 50) {  
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

      // Add the final chunk if it's substantial (reduced minimum from 200 to 50)
      if (currentChunk.length >= 50) {
          chunks.push(currentChunk.trim());
      }

      console.log(`splitText returning ${chunks.length} chunks`);
      return chunks;

  } catch (error) {
      console.error("Error splitting text:", error);
      throw error;
  }
}

// Function to get embeddings with retry logic and timeout
async function getEmbedding(text, model = 'text-embedding-ada-002', retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Getting embedding for text (${text.length} chars), attempt ${attempt}/${retries}`);
            
            // Add timeout to embedding request
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Embedding timeout after 20 seconds')), 20000)
            );
            
            const embeddingPromise = openAiClient.embeddings.create({
                model: model,
                input: text
            });
            
            const response = await Promise.race([embeddingPromise, timeoutPromise]);
            const embedding = response.data[0].embedding;
            console.log(`Successfully generated embedding with ${embedding.length} dimensions`);
            return embedding;
        } catch (error) {
            console.error(`Embedding attempt ${attempt}/${retries} failed:`, error.message);
            if (attempt === retries) {
                throw new Error(`Failed to generate embedding after ${retries} attempts: ${error.message}`);
            }
            // Exponential backoff with longer delays for rate limiting
            const delay = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s
            console.log(`Waiting ${delay}ms before embedding retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
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
            tagged_sections: [heading],
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
    const records = [];
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

    await index.upsert(records, { namespace: userId });

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
  console.log("Processing user query for relationship:", query);
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
        console.log(`processTextSection called for userId: ${userId}, text length: ${text?.length}`);
        
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            console.log("Empty or invalid text provided to processTextSection, returning empty array");
            return [];
        }

        const chunks = await splitText(text);
        
        if (!chunks || chunks.length === 0) {
            console.log("No chunks generated from text, returning empty array");
            return [];
        }

        console.log(`Processing ${chunks.length} chunks for userId: ${userId}`);
        const records = [];

        for (let idx = 0; idx < chunks.length; idx++) {
            try {
                const chunkText = chunks[idx];
                console.log(`Processing chunk ${idx + 1}/${chunks.length} (${chunkText.length} chars)`);
                
                const embedding = await getEmbedding(chunkText);
                
                records.push({
                    id: `${userId}-${Date.now()}-${idx}`,
                    values: embedding,
                    metadata: {
                        userId: userId,
                        description: description,
                        chunk_index: idx,
                        text: chunkText,
                    }
                });
                
                console.log(`Successfully processed chunk ${idx + 1}/${chunks.length}`);
            } catch (chunkError) {
                console.error(`Error processing chunk ${idx + 1}/${chunks.length}:`, {
                    error: chunkError.message,
                    chunkLength: chunks[idx]?.length,
                    userId: userId
                });
                throw new Error(`Failed to process chunk ${idx + 1}: ${chunkError.message}`);
            }
        }

        console.log(`Successfully processed all ${records.length} chunks for userId: ${userId}`);
        
        // Clear variables to help with memory management
        chunks.length = 0;
        
        return records;
    } catch (error) {
        console.error("Error in processTextSection:", {
            error: error.message,
            userId: userId,
            textLength: text?.length,
            description: description
        });
        throw error;
    }
}


export async function processTextSectionRelationship(text, compositeChartId, description = null, category = null, relevantPositionData = null) {
  try {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
          console.log("Empty or invalid text provided to processTextSectionRelationship, returning empty array");
          return [];
      }

      const chunks = await splitText(text);
      
      if (!chunks || chunks.length === 0) {
          console.log("No chunks generated from relationship text, returning empty array");
          return [];
      }

      const records = [];

      for (let idx = 0; idx < chunks.length; idx++) {
          const chunkText = chunks[idx];
          console.log("chunkText: ", chunkText)
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


export async function upsertRecords(records, nameSpaceId, retries = 3) {
  if (!records || records.length === 0) {
    console.log("No records to upsert, skipping");
    return { success: true, count: 0 };
  }
  
  console.log(`Upserting ${records.length} records to namespace: ${nameSpaceId}`);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Pinecone upsert attempt ${attempt}/${retries} for ${records.length} records`);
      
      // Add timeout to the upsert operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Pinecone upsert timeout after 60 seconds')), 60000)
      );
      
      const upsertPromise = index.upsert(records, { namespace: nameSpaceId });
      
      await Promise.race([upsertPromise, timeoutPromise]);
      
      console.log(`Successfully upserted ${records.length} records to Pinecone namespace: ${nameSpaceId}`);
      
      // Force garbage collection to free memory
      if (global.gc) {
        console.log('Running garbage collection after upsert');
        global.gc();
      }
      
      return { success: true, count: records.length };
      
    } catch (error) {
      console.error(`Pinecone upsert attempt ${attempt}/${retries} failed:`, {
        error: error.message,
        namespace: nameSpaceId,
        recordCount: records.length,
        recordIds: records.slice(0, 3).map(r => r.id) // Log first 3 IDs for debugging
      });
      
      if (attempt === retries) {
        throw new Error(`Pinecone upsert failed after ${retries} attempts: ${error.message}`);
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
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
      
      // TODO: implement persistence layer
      // const result = await vectorCollection.bulkWrite(operations);
      // console.log(`Upserted ${result.upsertedCount + result.modifiedCount} relationship vector records`);

      return {
          success: true,
          count: operations.length
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
        
        // Query by vector similarity only (topics removed)
        const vectorResults = await index.query({
            vector: promptEmbedding,
            topK: 5, // Increased since we're not using topic filtering
            includeMetadata: true,
            filter: {
                userId: userId
            }
        });

        // Process results (topics removed)
        const results = vectorResults.matches.map(match => ({
            text: match.metadata.text,
            description: match.metadata.description,
            score: match.score
        }));

        return {
            matches: results
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


export async function processUserQueryForBirthChartAnalysis(userId, query, numResults = 3) {
  console.log("Processing user query for birth chart analysis:", query);
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


export async function processUserQueryForHoroscopeAnalysis(userId, query, numResults = 2) {
  console.log("Processing user query for horoscope analysis:", query);
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

    // Extract only the text from each match
    const extractedText = results.matches.map((match, index) => {
      // console.log(`Match ${index + 1} metadata:`, match.metadata);
      // Return only the text content
      return match.metadata?.text || "";
    });

    console.log("Extracted text:", extractedText);
    return extractedText;
  } catch (error) {
    console.error("Error in processUserQuery:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

export async function processUserQueryForRelationshipAnalysis(compositeChartId, query, numResults = 5) {
  console.log("Processing user query for relationship analysis:", query);
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
      const description = match.metadata?.relevantPositionData || ""; // Optionally include description

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