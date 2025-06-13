import { ObjectId } from 'mongodb';
import { BirthChart, CompositeChart, RelationshipAnalysis, ChartAnalysis, TransitAspect } from './astrology.js';

// Base MongoDB document interface
export interface BaseDocument {
  _id?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

// User-related types
export interface UserDocument extends BaseDocument {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  timeOfBirth?: string;
  placeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: string;
  birthChart?: BirthChart;
  isTimeKnown?: boolean;
}

// Alias for backward compatibility
export interface User extends BaseDocument {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  timeOfBirth?: string;
  placeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: string;
  birthChart?: BirthChart;
  isTimeKnown?: boolean;
}

// Birth Chart Analysis Document
export interface BirthChartAnalysisDocument extends BaseDocument {
  userId: ObjectId;
  analysis: ChartAnalysis;
  topics: {
    [topicId: string]: {
      interpretation: string;
      generatedAt: Date;
      subtopics?: any;
    };
  };
  vectorizationStatus: {
    completed: boolean;
    topics: Record<string, boolean>;
  };
  debug: {
    inputSummary: {
      userId: ObjectId;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

// Relationship Analysis Document
export interface RelationshipAnalysisDocument extends BaseDocument {
  userAId: ObjectId;
  userBId: ObjectId;
  compositeChartId: ObjectId;
  scores: Record<string, number>;
  analysis: {
    [category: string]: {
      interpretation: string;
      astrologyData: string;
      generatedAt: Date;
    };
  };
  vectorizationStatus: {
    completed: boolean;
    categories: Record<string, boolean>;
  };
  debug: {
    inputSummary: {
      compositeChartId: ObjectId;
      userAId: ObjectId;
      userBId: ObjectId;
      [key: string]: any;
    };
    categories: Record<string, any>;
    [key: string]: any;
  };
}

// Composite Chart Document
export interface CompositeChartDocument extends BaseDocument {
  userAId: ObjectId;
  userBId: ObjectId;
  compositeChart: CompositeChart;
  relationshipType?: string;
}

// Chat Thread Documents
export interface ChatThreadDocument extends BaseDocument {
  userId: ObjectId;
  messages: ChatMessage[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface BirthChartChatThread extends BaseDocument {
  userId: ObjectId;
  birthChartAnalysisId: ObjectId;
  messages: ChatMessage[];
}

export interface RelationshipChatThread extends BaseDocument {
  userId: ObjectId;
  compositeChartId: ObjectId;
  messages: ChatMessage[];
}

// Transit and Aspect Documents
export interface DailyTransitDocument extends BaseDocument {
  date: Date;
  transits: Array<{
    name: string;
    fullDegree: number;
    normDegree: number;
    speed: number;
    isRetro: boolean;
    sign: string;
  }>;
}

export interface DailyAspectDocument extends BaseDocument {
  planet1: string;
  planet2: string;
  aspectType: string;
  date_range: [Date, Date];
  exactDate: Date;
  orb: number;
}

export interface UserTransitAspectDocument extends BaseDocument {
  userId: ObjectId;
  transitAspects: TransitAspect[];
  startDate: Date;
  endDate: Date;
}

// Horoscope Documents
export interface HoroscopeDocument extends BaseDocument {
  userId: ObjectId;
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
  horoscopeText: string;
  themes: string[];
  generatedAt: Date;
}

// Interpretation Documents
export interface BirthChartInterpretationDocument extends BaseDocument {
  userId: ObjectId;
  interpretation: string;
  topics: string[];
  generatedAt: Date;
}

export interface CompositeChartInterpretationDocument extends BaseDocument {
  compositeChartId: ObjectId;
  interpretation: string;
  category: string;
  generatedAt: Date;
}

// Relationship and Log Documents
export interface RelationshipLogDocument extends BaseDocument {
  userAId: ObjectId;
  userBId: ObjectId;
  compositeChartId: ObjectId;
  action: string;
  details: any;
  timestamp: Date;
}

// Transit Ephemeris Document
export interface TransitEphemerisDocument extends BaseDocument {
  date: Date;
  planetPositions: Record<string, {
    degree: number;
    sign: string;
    isRetrograde: boolean;
  }>;
}

// Retrogrades Document
export interface RetrogradeDocument extends BaseDocument {
  planet: string;
  date_range: [Date, Date];
  stationaryDates: {
    retrograde: Date;
    direct: Date;
  };
}

// Database operation result types
export interface InsertResult {
  acknowledged: boolean;
  insertedId: ObjectId;
}

export interface UpdateResult {
  acknowledged: boolean;
  modifiedCount: number;
  matchedCount: number;
}

export interface DeleteResult {
  acknowledged: boolean;
  deletedCount: number;
}

// Query filter types
export type FilterQuery<T> = {
  [P in keyof T]?: T[P] | { $in?: T[P][]; $ne?: T[P]; $exists?: boolean; $gte?: T[P]; $lte?: T[P]; };
} & {
  _id?: ObjectId | { $in?: ObjectId[] };
  $and?: FilterQuery<T>[];
  $or?: FilterQuery<T>[];
};