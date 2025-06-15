import { getOpenAIApiKey } from '../services/secretsService.js';
import OpenAI from 'openai';

// Lazy initialization of OpenAI client
let openAiClient: OpenAI;

async function getOpenAIClient(): Promise<OpenAI> {
  if (!openAiClient) {
    const apiKey = await getOpenAIApiKey();
    openAiClient = new OpenAI({ 
      apiKey: apiKey,
      timeout: 30000,
      maxRetries: 2
    });
  }
  return openAiClient;
}

/**
 * Summarizes long natal chart context using GPT to create flowing prose
 * @param context The full natal chart context text
 * @param wordLimit Maximum number of words (default 120)
 * @param category Optional category to focus the summary (e.g., "SEX_AND_INTIMACY")
 * @returns Summarized context string
 */
export async function summarizeNatalContext(
  context: string, 
  wordLimit: number = 120, 
  category?: string
): Promise<string> {
  if (!context || context.trim().length === 0) {
    return "No specific context available.";
  }

  // If already under word limit, return as-is
  const wordCount = context.split(/\s+/).length;
  if (wordCount <= wordLimit) {
    return context;
  }

  try {
    const client = await getOpenAIClient();
    
    const categoryFocus = category ? ` focused on ${category.replace(/_/g, ' ').toLowerCase()}` : '';
    const prompt = `Summarise the composite meaning of these notes in ≤${wordLimit} words, using flowing prose${categoryFocus}.`;
    
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert astrology interpreter. Create flowing prose summaries that maintain astrological accuracy while being readable and coherent."
        },
        {
          role: "user",
          content: `${prompt}\n\nContext to summarize:\n${context}`
        }
      ],
      temperature: 0.3,
      max_tokens: Math.ceil(wordLimit * 1.5) // Allow some buffer for token estimation
    });
    
    let summary = response.choices[0].message.content?.trim() || context.slice(0, wordLimit * 6);
    
    // Clean up the summary
    summary = await cleanupSummary(summary);
    
    return summary;
  } catch (error) {
    console.error('Error in GPT summarization, falling back to truncation:', error);
    // Fallback to simple truncation
    const words = context.split(/\s+/);
    return words.slice(0, wordLimit).join(' ') + (words.length > wordLimit ? '...' : '');
  }
}

/**
 * Cleans up summary text using GPT for grammar and repetition fixes
 * @param text The text to clean up
 * @returns Cleaned text
 */
export async function cleanupSummary(text: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    return text;
  }

  try {
    const client = await getOpenAIClient();
    
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `Fix grammar & merge repetitive phrases. Return only the corrected text.\n\n${text}`
        }
      ],
      temperature: 0.1,
      max_tokens: Math.ceil(text.split(/\s+/).length * 1.2)
    });
    
    return response.choices[0].message.content?.trim() || text;
  } catch (error) {
    console.error('Error in cleanup, returning original text:', error);
    return text;
  }
}

/**
 * Creates a focused summary specifically for relationship analysis
 * @param context The full natal chart context
 * @param partnerName The partner's name for context
 * @param category The relationship category being analyzed
 * @returns Relationship-focused summary
 */
export async function createRelationshipFocusedSummary(
  context: string,
  partnerName: string,
  category: string
): Promise<string> {
  const summary = await summarizeNatalContext(context, 100, category);
  
  // Add a brief intro to contextualize this person's traits in the relationship
  const categoryDescriptions: Record<string, string> = {
    'OVERALL_ATTRACTION_CHEMISTRY': 'brings to attraction and chemistry',
    'EMOTIONAL_SECURITY_CONNECTION': 'approaches emotional connection',
    'SEX_AND_INTIMACY': 'expresses intimacy and passion',
    'COMMUNICATION_AND_MENTAL_CONNECTION': 'communicates and connects mentally',
    'COMMITMENT_LONG_TERM_POTENTIAL': 'approaches commitment and partnership',
    'KARMIC_LESSONS_GROWTH': 'approaches growth and transformation',
    'PRACTICAL_GROWTH_SHARED_GOALS': 'handles practical matters and goals'
  };
  
  const description = categoryDescriptions[category] || 'contributes to this relationship area';
  
  return `How this person ${description}: ${summary}`;
}