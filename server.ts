// @ts-nocheck
import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import serverless from 'serverless-http';
import bodyParser from 'body-parser';
import cors from 'cors';
import indexRoutes from './routes/indexRoutes.js'; 
import { initializeDatabase } from './services/dbService.js';

dotenv.config();

const app = express();

// Initialize database connection
let dbInitialized = false;

const initDbMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  next();
};

// CORS configuration
const corsOptions = {
  origin: [
    'https://main.d36g3neun79jnt.amplifyapp.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'X-Amz-Date',
    'Authorization',
    'X-Api-Key',
    'X-Amz-Security-Token',
    'X-Requested-With'
  ]
};

// Apply CORS middleware first
app.use(cors(corsOptions));

// Add explicit CORS headers for Lambda compatibility
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://main.d36g3neun79jnt.amplifyapp.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  // Set CORS headers explicitly
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', 'https://main.d36g3neun79jnt.amplifyapp.com');
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request for:', req.url);
    res.status(200).end();
    return;
  }
  
  next();
});

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(initDbMiddleware);

// Your routes
app.use('/', indexRoutes);

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Create serverless handler with explicit CORS support
export const handler = serverless(app, {
  binary: false,
  request: (request: any, event: any, context: any) => {
    // Log for debugging
    console.log('Lambda event:', JSON.stringify(event, null, 2));
  },
  response: (response: any, event: any, context: any) => {
    // Ensure CORS headers are always present in Lambda response
    if (!response.headers) {
      response.headers = {};
    }
    
    const origin = event.headers?.origin || event.headers?.Origin;
    const allowedOrigins = [
      'https://main.d36g3neun79jnt.amplifyapp.com',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers['Access-Control-Allow-Origin'] = origin;
    } else {
      response.headers['Access-Control-Allow-Origin'] = 'https://main.d36g3neun79jnt.amplifyapp.com';
    }
    
    response.headers['Access-Control-Allow-Credentials'] = 'true';
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, X-Requested-With';
    response.headers['Access-Control-Max-Age'] = '86400';
    
    console.log('Lambda response headers:', response.headers);
    return response;
  }
});