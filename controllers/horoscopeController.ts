// Horoscope generation controller

import { Request, Response } from 'express';
import { generateHoroscope } from '../utilities/horoscopeGeneration.js';
import { 
  getHoroscopesByUserId, 
  getLatestHoroscope,
  deleteHoroscope,
  getExistingHoroscope 
} from '../services/dbService.js';
import { normalizeHoroscopeDateRange } from '../utilities/horoscopeDateUtils.js';

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
    const inputDate = new Date(startDate);
    if (isNaN(inputDate.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid startDate format' 
      });
    }
    
    // Normalize to Monday-Sunday week
    const { startDate: normalizedStart, endDate: normalizedEnd } = normalizeHoroscopeDateRange(inputDate, 'weekly');
    
    console.log(`Checking for existing weekly horoscope for user ${userId} from ${normalizedStart.toDateString()} to ${normalizedEnd.toDateString()}`);
    
    // Check for existing horoscope in this period
    const existingHoroscope = await getExistingHoroscope(userId, normalizedStart, normalizedEnd, 'weekly');
    
    if (existingHoroscope) {
      console.log(`Found existing weekly horoscope for user ${userId}, returning cached version`);
      return res.status(200).json({
        success: true,
        horoscope: existingHoroscope,
        cached: true
      });
    }
    
    console.log(`Generating new weekly horoscope for user ${userId}`);
    
    // Generate the horoscope with normalized dates
    const horoscope = await generateHoroscope(userId, normalizedStart, normalizedEnd, 'weekly');
    
    return res.status(200).json({
      success: true,
      horoscope,
      cached: false
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
    const inputDate = new Date(startDate);
    if (isNaN(inputDate.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid startDate format' 
      });
    }
    
    // Normalize to full month period
    const { startDate: normalizedStart, endDate: normalizedEnd } = normalizeHoroscopeDateRange(inputDate, 'monthly');
    
    console.log(`Checking for existing monthly horoscope for user ${userId} from ${normalizedStart.toDateString()} to ${normalizedEnd.toDateString()}`);
    
    // Check for existing horoscope in this period
    const existingHoroscope = await getExistingHoroscope(userId, normalizedStart, normalizedEnd, 'monthly');
    
    if (existingHoroscope) {
      console.log(`Found existing monthly horoscope for user ${userId}, returning cached version`);
      return res.status(200).json({
        success: true,
        horoscope: existingHoroscope,
        cached: true
      });
    }
    
    console.log(`Generating new monthly horoscope for user ${userId}`);
    
    // Generate the horoscope with normalized dates
    const horoscope = await generateHoroscope(userId, normalizedStart, normalizedEnd, 'monthly');
    
    return res.status(200).json({
      success: true,
      horoscope,
      cached: false
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