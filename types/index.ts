// Central export for all type definitions

// Re-export astrology types
export * from './astrology.js';

// Re-export database types (selective to avoid conflicts)
export type {
  BaseDocument,
  User,
  BirthChartAnalysisDocument,
  RelationshipAnalysisDocument,
  CompositeChartDocument,
  BirthChartChatThread,
  RelationshipChatThread,
  DailyTransitDocument,
  DailyAspectDocument,
  HoroscopeDocument,
  InsertResult,
  UpdateResult,
  DeleteResult
} from './database.js';

// Re-export API types (selective to avoid conflicts)
export type {
  AuthenticatedRequest,
  CreateUserRequest,
  UserParamsRequest,
  BirthChartRequest,
  RelationshipRequest,
  WorkflowRequest,
  APIResponse,
  PaginatedResponse,
  UserResponse,
  BirthChartResponse,
  RelationshipResponse,
  AsyncRequestHandler,
  RequestHandler
} from './api.js';

// Re-export GPT service types
export * from './gpt.js';

// Common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type NonEmptyArray<T> = [T, ...T[]];

// MongoDB utility types
export type DocumentId = string;
export type ObjectIdString = string;

// Date utility types
export type DateString = string; // ISO 8601 date string
export type TimestampMs = number;

// Generic API types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  filters?: Record<string, any>;
}

// Error handling types
export interface ErrorResponse {
  error: string;
  message?: string;
  code?: string;
  details?: any;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface FailureResponse {
  success: false;
  error: string;
  message?: string;
  code?: string;
}

export type ApiResponse<T = any> = SuccessResponse<T> | FailureResponse;

// Type guards
export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

export function isFailureResponse(response: ApiResponse): response is FailureResponse {
  return response.success === false;
}

// Async operation types
export type AsyncOperation<T> = () => Promise<T>;
export type AsyncOperationWithRetry<T> = (attempt: number) => Promise<T>;

// Configuration types
export interface AppConfig {
  port: number;
  environment: 'development' | 'staging' | 'production';
  database: {
    url: string;
    name: string;
  };
  apis: {
    openai: {
      apiKey: string;
      model: string;
    };
    pinecone: {
      apiKey: string;
      environment: string;
      indexName: string;
    };
  };
}

// Middleware types
export interface MiddlewareError extends Error {
  statusCode?: number;
  code?: string;
}

// Validation types
export interface ValidationRule<T = any> {
  field: keyof T;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

// Cache types
export interface CacheEntry<T = any> {
  value: T;
  expiry: number;
  createdAt: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number;
  onExpire?: (key: string, value: any) => void;
}

// Logging types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error;
}

// Rate limiting types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Environment variable types
export interface EnvironmentVariables {
  NODE_ENV: string;
  PORT: string;
  MONGO_CONNECTION_STRING: string;
  OPENAI_API_KEY: string;
  PINECONE_API_KEY: string;
  REACT_APP_GOOGLE_API_KEY: string;
}

// Feature flag types
export interface FeatureFlags {
  enableNewRelationshipAnalysis: boolean;
  enableAdvancedTransitCalculations: boolean;
  enableChatHistory: boolean;
  enableVectorSearch: boolean;
}

// Metrics and monitoring types
export interface PerformanceMetrics {
  requestDuration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: Date;
  endpoint?: string;
  statusCode?: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    database: boolean;
    openai: boolean;
    pinecone: boolean;
  };
  timestamp: Date;
  uptime: number;
}

// Constants
export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const;

export const CACHE_KEYS = {
  USER_BIRTH_CHART: 'user:birth_chart',
  RELATIONSHIP_ANALYSIS: 'relationship:analysis',
  DAILY_TRANSITS: 'transits:daily',
  HOROSCOPE: 'horoscope'
} as const;