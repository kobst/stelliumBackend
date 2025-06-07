// Horoscope generation controller

import { Request, Response } from 'express';
import { generateHoroscope } from '../utilities/horoscopeGeneration.js';
import { 
  getHoroscopesByUserId, 
  getLatestHoroscope,
  deleteHoroscope,
  getExistingHoroscope,
  getUserSingle,
  getBirthChart
} from '../services/dbService.js';
import { normalizeHoroscopeDateRange } from '../utilities/horoscopeDateUtils.js';
import { generateCustomTransitNarrative } from '../services/gptService.js';

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

// Generate horoscope from custom transit events
export async function generateCustomTransitHoroscope(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { transitEvents } = req.body;
    
    if (!transitEvents || !Array.isArray(transitEvents) || transitEvents.length === 0) {
      return res.status(400).json({ 
        error: 'transitEvents array is required in request body' 
      });
    }
    
    // Validate transit events structure
    for (const event of transitEvents) {
      if (!event.type || !event.transitingPlanet || !event.exact) {
        return res.status(400).json({ 
          error: 'Each transit event must have type, transitingPlanet, and exact date' 
        });
      }

      // Validate and parse dates
      try {
        const exactDate = new Date(event.exact);
        if (isNaN(exactDate.getTime())) {
          return res.status(400).json({
            error: `Invalid exact date format for event: ${event.transitingPlanet}`
          });
        }
        event.exact = exactDate;

        if (event.start) {
          const startDate = new Date(event.start);
          if (isNaN(startDate.getTime())) {
            return res.status(400).json({
              error: `Invalid start date format for event: ${event.transitingPlanet}`
            });
          }
          event.start = startDate;
        }

        if (event.end) {
          const endDate = new Date(event.end);
          if (isNaN(endDate.getTime())) {
            return res.status(400).json({
              error: `Invalid end date format for event: ${event.transitingPlanet}`
            });
          }
          event.end = endDate;
        }
      } catch (error) {
        return res.status(400).json({
          error: `Error parsing dates for event: ${event.transitingPlanet}`,
          message: error.message
        });
      }
    }
    
    console.log(`Generating custom transit horoscope for user ${userId} with ${transitEvents.length} events`);
    
 
    
    // Get user and birth chart data
    const user = await getUserSingle(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }
    
    const birthChart = await getBirthChart(userId);
    if (!birthChart) {
      return res.status(404).json({ 
        error: 'Birth chart not found for user' 
      });
    }
    
    // Determine date range from transit events
    const dates = transitEvents.map(e => new Date(e.exact));
    const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Determine period type based on date range
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    let period: 'daily' | 'weekly' | 'monthly';
    if (daysDiff <= 1) {
      period = 'daily';
    } else if (daysDiff <= 7) {
      period = 'weekly';
    } else {
      period = 'monthly';
    }
    
    // Prepare horoscope data
    const horoscopeData = {
      userId,
      period,
      startDate,
      endDate,
      hasKnownBirthTime: user.knownBirthTime || false,
      customTransitEvents: transitEvents,
      isCustom: true
    };
    
    // Generate narrative with GPT
    const { horoscopeText } = await generateCustomTransitNarrative(horoscopeData);
    
    // Return the generated horoscope
    return res.status(200).json({
      success: true,
      horoscope: {
        userId,
        period,
        startDate,
        endDate,
        text: horoscopeText,
        transitEvents,
        generatedAt: new Date(),
        isCustom: true,
        metadata: {
          hasKnownBirthTime: user.knownBirthTime || false,
          transitEventCount: transitEvents.length
        }
      }
    });
    
  } catch (error) {
    console.error('Error generating custom transit horoscope:', error);
    return res.status(500).json({ 
      error: 'Failed to generate custom transit horoscope',
      message: error.message 
    });
  }
}