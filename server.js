import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import indexRoutes from './routes/indexRoutes.js'; 


dotenv.config();

const app = express();
const port = 3001;


// Body parsing middleware for JSON payloads
app.use(express.json());

// Body parsing middleware for URL-encoded form data
app.use(bodyParser.urlencoded({ extended: true }));

// CORS middleware
app.use(cors());

// Your routes
app.use('/', indexRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
