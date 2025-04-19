// Import necessary libraries
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { encoding_for_model } from '@dqbd/tiktoken';
import OpenAI from "openai";
import { Pinecone } from '@pinecone-database/pinecone';  
import pkg from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Check for required environment variables
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
}

if (!process.env.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY environment variable is not set');
}

// const { PineconeClient } = pkg;
// import { PineconeClient } from '@pinecone-database/pinecone';

  // Initialize OpenAI
const openAiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Initialize Pinecone
// const pinecone = new PineconeClient();
// await pinecone.init({
//     apiKey: 'eb2d55da-cbe1-4eff-af1b-6f1f59e238f1',
//     environment: 'us-east-1-aws',
// });

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws' // Optional default
});
const index = pinecone.index('stellium-test-index');

// Define the splitText function using RecursiveCharacterTextSplitter
async function splitText(text, maxTokens = 500, overlap = 50) {
const tokenizer = encoding_for_model('text-embedding-ada-002');

// Function to count tokens in a text
function tokenCount(text) {
    return tokenizer.encode(text).length;
}

// Initialize the text splitter
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: maxTokens,
    chunkOverlap: overlap,
    lengthFunction: tokenCount,
    separators: ['\n\n', '\n', '. ', '! ', '? ', ' ', ''],
});

    // Split the text
    const documents = await textSplitter.createDocuments([text]);
    return documents.map((doc) => doc.pageContent);
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
            section: heading,
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


  export async function processTransitInterpretations(userId, date, promptDescription, interpretation) {
    try {
      const chunks = await splitText(interpretation);
      const records = [];
  
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunkText = chunks[idx];
        const embedding = await getEmbedding(chunkText);
        const id = `${userId}-${date}-${idx}`.replace(/\s+/g, '-').toLowerCase();
        
        records.push({
          id: id,
          values: embedding,
          metadata: {
            userId: userId,
            date: date,
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


export async function processUserQuery(userId, query) {
  console.log("Processing user query:", query);
  console.log("User ID:", userId);
  try{
    const questionQueryEmbedding = await getEmbedding(query);
    const results = await index.query({
      vector: questionQueryEmbedding,
      topK: 5,
      includeMetadata: true,
      filter: {
        userId: userId
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
          relevantAspects: promptDescription,
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
          relevantAspects: promptDescription,
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


export async function processSynastryChartInterpretationSection(compositeChartId, heading, promptDescription, interpretation) {
  try {
    const chunks = await splitText(interpretation);
    const records = [];

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunkText = chunks[idx];
      const embedding = await getEmbedding(chunkText);
      const id = `${compositeChartId}-synastry-${heading}-${idx}`.replace(/\s+/g, '-').toLowerCase();
      
      records.push({
        id: id,
        values: embedding,
        metadata: {
          compositeChartId: compositeChartId,
          type: 'synastry',
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




  export async function processCompositeChartTransitInterpretations(compositeChartId, date, promptDescription, interpretation) {
  try {
    const chunks = await splitText(interpretation);
    const records = [];

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunkText = chunks[idx];
      const embedding = await getEmbedding(chunkText);
      const id = `${compositeChartId}-composite-transit-${date}-${idx}`.replace(/\s+/g, '-').toLowerCase();
      
      records.push({
        id: id,
        values: embedding,
        metadata: {
          compositeChartId: compositeChartId,
          type: 'composite',
          date: date,
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




export async function processUserQuerySynastry(compositeChartId, query) {
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
        type: 'synastry'
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

export async function processUserQueryComposite(compositeChartId, query) {
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