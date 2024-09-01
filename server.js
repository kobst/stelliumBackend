import dotenv from 'dotenv';
import express from 'express';
import serverless from 'serverless-http'
import bodyParser from 'body-parser';
import cors from 'cors';
import indexRoutes from './routes/indexRoutes.js'; 
import { initializeDatabase } from './services/dbService.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS middleware
app.use(cors({
  origin: '*', // For development, in production set to your frontend's URL
  methods: 'GET,PUT,POST,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  credentials: true
}));

// Your routes
app.use('/', indexRoutes);

// Initialize database connection
let dbInitialized = false;

app.use(async (req, res, next) => {
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
});

export const handler = serverless(app);