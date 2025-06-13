// OpenAI and GPT Service Types

export interface OpenAIConfig {
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
  model?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Astrological GPT function parameters
export interface NatalPlanetCompletionParams {
  planet: string;
  context: string;
  description: string;
}

export interface RelationshipCategoryParams {
  userAName: string;
  userBName: string;
  categoryDisplayName: string;
  relationshipScores: Record<string, number>;
  formattedAstrology: string;
  contextA: string;
  contextB: string;
}

export interface TopicAnalysisParams {
  topic: string;
  relevantNatalPositions: string;
  RAGResponse: string;
}

export interface HoroscopeGenerationParams {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  hasKnownBirthTime: boolean;
  mainThemes?: string[];
  immediateEvents?: any[];
  transitPriorities?: any[];
  moonPhases?: any[];
  skyPatterns?: any[];
}

export interface CustomTransitNarrativeParams {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  hasKnownBirthTime: boolean;
  customTransitEvents: any[];
}

export interface ChatThreadParams {
  query: string;
  contextFromBirthChart: string;
  chatHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
}

export interface RelationshipChatThreadParams {
  query: string;
  contextFromRelationship: string;
  contextFromUserA: string;
  contextFromUserB: string;
  chatHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  userAName?: string;
  userBName?: string;
}

// Topic classification types
export interface TopicClassificationResult {
  topics: string[];
  confidence?: number;
}

// GPT Response types
export interface HoroscopeResponse {
  horoscopeText: string;
  themes?: string[];
  generatedAt: Date;
}

export interface RelationshipPanelsResponse {
  shortSynopsis: string;
  composite: string;
  fullAnalysis: string;
}

// Prompt expansion types
export interface PromptExpansionParams {
  prompt: string;
  context?: 'birth_chart' | 'relationship';
  userAName?: string;
  userBName?: string;
}

// Error types for GPT operations
export interface GPTError extends Error {
  code?: string;
  type?: 'rate_limit' | 'token_limit' | 'api_error' | 'timeout';
  retryAfter?: number;
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
}

// Vector search integration types
export interface VectorSearchContext {
  query: string;
  userId?: string;
  compositeChartId?: string;
  category?: string;
  topK?: number;
}

export interface VectorSearchResult {
  content: string;
  similarity: number;
  metadata: Record<string, any>;
}

// Function type definitions for all GPT service functions
export type GPTCompletionFunction<TParams = any, TResult = string> = (
  params: TParams
) => Promise<TResult>;

// Specific function type definitions
export type GetCompletionShortOverview = GPTCompletionFunction<string, string>;
export type GetCompletionPlanets = GPTCompletionFunction<NatalPlanetCompletionParams, string>;
export type GetCompletionForRelationshipCategory = GPTCompletionFunction<RelationshipCategoryParams, string>;
export type GetTopicsForChunk = GPTCompletionFunction<string, TopicClassificationResult>;
export type GenerateHoroscopeNarrative = GPTCompletionFunction<HoroscopeGenerationParams, HoroscopeResponse>;

// Model configuration
export interface ModelConfig {
  name: string;
  maxTokens: number;
  temperature: number;
  costPerToken?: {
    input: number;
    output: number;
  };
}

export const GPT_MODELS: Record<string, ModelConfig> = {
  'gpt-4o-mini': {
    name: 'gpt-4o-mini',
    maxTokens: 128000,
    temperature: 0.7,
    costPerToken: {
      input: 0.00015,
      output: 0.0006
    }
  },
  'gpt-4o': {
    name: 'gpt-4o',
    maxTokens: 128000,
    temperature: 0.7,
    costPerToken: {
      input: 0.005,
      output: 0.015
    }
  }
};