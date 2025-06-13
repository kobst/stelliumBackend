import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { BirthChart, CompositeChart, RelationshipScores } from './astrology.js';

// Extended Express Request types with common parameters
export interface TypedRequestWithParams<T = any> extends Request {
  params: T;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: ObjectId;
    email: string;
  };
}

// User API types
export interface CreateUserRequest extends Request {
  body: {
    email: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string; // ISO date string
    timeOfBirth?: string;
    placeOfBirth: string;
    latitude: number;
    longitude: number;
    timezone: string;
    isTimeKnown?: boolean;
  };
}

export interface UserParamsRequest extends Request {
  params: {
    userId: string;
  };
}

// Birth Chart API types
export interface BirthChartRequest extends UserParamsRequest {
  query: {
    includeInterpretation?: string;
    topics?: string[];
  };
}

export interface BirthChartAnalysisRequest extends UserParamsRequest {
  body: {
    topics?: string[];
    regenerate?: boolean;
  };
}

// Relationship API types
export interface RelationshipRequest extends Request {
  params: {
    userAId: string;
    userBId: string;
  };
  query: {
    category?: string;
    includeAnalysis?: string;
  };
}

export interface CompositeChartRequest extends Request {
  params: {
    compositeChartId: string;
  };
  body: {
    categories?: string[];
    regenerate?: boolean;
  };
}

// Horoscope API types
export interface GenerateHoroscopeRequest extends UserParamsRequest {
  query: {
    period: 'daily' | 'weekly' | 'monthly';
    date?: string;
    regenerate?: string;
  };
}

export interface GenerateHoroscopeParams {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  date?: Date;
  regenerate?: boolean;
}

export interface HoroscopeRequest extends UserParamsRequest {
  query: {
    period: 'daily' | 'weekly' | 'monthly';
    date?: string; // ISO date string
    regenerate?: string;
  };
}

// Chat API types
export interface ChatRequest extends Request {
  body: {
    message: string;
    context?: 'birth_chart' | 'relationship';
    contextId: string; // userId for birth chart, compositeChartId for relationship
  };
}

export interface ChatHistoryRequest extends Request {
  params: {
    contextType: 'birth_chart' | 'relationship';
    contextId: string;
  };
  query: {
    limit?: string;
    offset?: string;
  };
}

// Transit API types
export interface TransitRequest extends UserParamsRequest {
  query: {
    startDate: string; // ISO date string
    endDate: string; // ISO date string
    planetFilter?: string[]; // Array of planet names
  };
}

// Workflow API types
export interface WorkflowRequest extends Request {
  params: {
    userId: string;
  };
  body: {
    forceRegenerate?: boolean;
    topics?: string[];
  };
}

export interface RelationshipWorkflowRequest extends Request {
  params: {
    userAId: string;
    userBId: string;
  };
  body: {
    forceRegenerate?: boolean;
    categories?: string[];
  };
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Specific API response data types
export interface UserResponse {
  _id: ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  timeOfBirth?: string;
  placeOfBirth: string;
  isTimeKnown: boolean;
  birthChart?: BirthChart;
}

export interface BirthChartResponse {
  birthChart: BirthChart;
  analysis?: {
    topics: Record<string, {
      interpretation: string;
      generatedAt: Date;
    }>;
    generatedAt: Date;
  };
}

export interface RelationshipResponse {
  compositeChart: CompositeChart;
  scores: RelationshipScores;
  analysis?: {
    categories: Record<string, {
      interpretation: string;
      astrologyData: string;
      generatedAt: Date;
    }>;
    generatedAt: Date;
  };
}

export interface HoroscopeResponse {
  horoscope: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
  themes: string[];
  generatedAt: Date;
}

export interface ChatResponse {
  response: string;
  context: {
    type: 'birth_chart' | 'relationship';
    id: string;
  };
  timestamp: Date;
}

export interface TransitResponse {
  aspects: Array<{
    planet1: string;
    planet2: string;
    aspectType: string;
    exactDate: Date;
    orb: number;
    significance: number;
  }>;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

// Error response types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface APIError extends Error {
  statusCode: number;
  errors?: ValidationError[];
}

// Middleware types
export type AsyncRequestHandler<T extends Request = Request> = (
  req: T,
  res: Response,
  next: (error?: any) => void
) => Promise<void>;

export type RequestHandler<T extends Request = Request> = (
  req: T,
  res: Response,
  next: (error?: any) => void
) => void;

// Query parameter helper types
export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  offset?: string;
}

export interface FilterQuery {
  filter?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}