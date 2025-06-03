// Horoscope generation controller

import { Request, Response } from 'express';
import { generateHoroscope } from '../utilities/horoscopeGeneration.js';
import { 
  getHoroscopesByUserId, 
  getLatestHoroscope,
  deleteHoroscope 
} from '../services/dbService.js';

// Generate weekly horoscope
export async function generateWeeklyHoroscope(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { startDate } = req.body;
    
    if (!startDate) {
      return res.status(400).json({ 
        error: 'startDate is required in request body' 
      });
    }
    
    // Parse and validate date
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid startDate format' 
      });
    }
    
    // Calculate end date (7 days later)
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // 6 days after start = 7 day period
    
    console.log(`Generating weekly horoscope for user ${userId} from ${start.toDateString()} to ${end.toDateString()}`);
    
    // Generate the horoscope
    const horoscope = await generateHoroscope(userId, start, end, 'weekly');
    
    return res.status(200).json({
      success: true,
      horoscope
    });
    
  } catch (error) {
    console.error('Error generating weekly horoscope:', error);
    return res.status(500).json({ 
      error: 'Failed to generate weekly horoscope',
      message: error.message 
    });
  }
}

// Generate monthly horoscope
export async function generateMonthlyHoroscope(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { startDate } = req.body;
    
    if (!startDate) {
      return res.status(400).json({ 
        error: 'startDate is required in request body' 
      });
    }
    
    // Parse and validate date
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid startDate format' 
      });
    }
    
    // Calculate end date (last day of the month)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    
    console.log(`Generating monthly horoscope for user ${userId} from ${start.toDateString()} to ${end.toDateString()}`);
    
    // Generate the horoscope
    const horoscope = await generateHoroscope(userId, start, end, 'monthly');
    
    return res.status(200).json({
      success: true,
      horoscope
    });
    
  } catch (error) {
    console.error('Error generating monthly horoscope:', error);
    return res.status(500).json({ 
      error: 'Failed to generate monthly horoscope',
      message: error.message 
    });
  }
}

// Get user's horoscope history
export async function getUserHoroscopes(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { type, limit = 10 } = req.query;
    
    // Validate type if provided
    if (type && !['weekly', 'monthly'].includes(type as string)) {
      return res.status(400).json({ 
        error: 'Invalid type parameter. Must be "weekly" or "monthly"' 
      });
    }
    
    const parsedLimit = parseInt(limit as string, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json({ 
        error: 'Invalid limit parameter. Must be a positive number' 
      });
    }
    
    console.log(`Fetching horoscopes for user ${userId}, type: ${type || 'all'}, limit: ${parsedLimit}`);
    
    // Fetch horoscopes from database
    const horoscopes = await getHoroscopesByUserId(
      userId, 
      type as 'weekly' | 'monthly' | undefined,
      parsedLimit
    );
    
    return res.status(200).json({
      success: true,
      horoscopes,
      count: horoscopes.length
    });
    
  } catch (error) {
    console.error('Error fetching user horoscopes:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch horoscopes',
      message: error.message 
    });
  }
}

// Get latest horoscope
export async function getLatestUserHoroscope(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { type } = req.query;
    
    // Validate type if provided
    if (type && !['weekly', 'monthly'].includes(type as string)) {
      return res.status(400).json({ 
        error: 'Invalid type parameter. Must be "weekly" or "monthly"' 
      });
    }
    
    console.log(`Fetching latest ${type || 'any'} horoscope for user ${userId}`);
    
    // Fetch latest horoscope
    const horoscope = await getLatestHoroscope(
      userId, 
      type as 'weekly' | 'monthly' | undefined
    );
    
    if (!horoscope) {
      return res.status(404).json({
        success: false,
        message: 'No horoscope found for this user'
      });
    }
    
    return res.status(200).json({
      success: true,
      horoscope
    });
    
  } catch (error) {
    console.error('Error fetching latest horoscope:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch latest horoscope',
      message: error.message 
    });
  }
}

// Delete a horoscope
export async function deleteUserHoroscope(req: Request, res: Response) {
  try {
    const { userId, horoscopeId } = req.params;
    
    console.log(`Deleting horoscope ${horoscopeId} for user ${userId}`);
    
    // Delete the horoscope
    const result = await deleteHoroscope(horoscopeId, userId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Horoscope not found or does not belong to this user'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Horoscope deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting horoscope:', error);
    return res.status(500).json({ 
      error: 'Failed to delete horoscope',
      message: error.message 
    });
  }
}