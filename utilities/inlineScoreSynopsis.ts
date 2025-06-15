import { formatAspectFlag } from './scoreInterpretation.js';
import { RelationshipScoredItem } from '../types/relationshipFlags.js';

interface SynopsisData {
  greenFlags: RelationshipScoredItem[];
  redFlags: RelationshipScoredItem[];
  allPositiveAspects: RelationshipScoredItem[];
  allNegativeAspects: RelationshipScoredItem[];
  categoryScore: number;
  category: string;
}

/**
 * Creates a concise inline score synopsis for prompt headers
 * This is the "FAST CONTEXT" section mentioned in the requirements
 * @param synopsisData Object containing flags and scoring data
 * @param userAName First person's name
 * @param userBName Second person's name
 * @returns Formatted synopsis string for prompt header
 */
export function createInlineScoreSynopsis(
  synopsisData: SynopsisData,
  userAName: string,
  userBName: string
): string {
  // Handle case where synopsisData is null or missing required fields
  if (!synopsisData) {
    console.log('No synopsis data provided');
    return ''; // Return empty string if no synopsis data
  }
  
  console.log('Synopsis data received:', JSON.stringify(synopsisData, null, 2));
  
  const { 
    greenFlags = [], 
    redFlags = [], 
    allPositiveAspects = [], 
    allNegativeAspects = [], 
    categoryScore = 0, 
    category = '' 
  } = synopsisData;
  
  // Ensure arrays are actually arrays
  const safeGreenFlags = Array.isArray(greenFlags) ? greenFlags : [];
  const safeRedFlags = Array.isArray(redFlags) ? redFlags : [];
  const safePositiveAspects = Array.isArray(allPositiveAspects) ? allPositiveAspects : [];
  const safeNegativeAspects = Array.isArray(allNegativeAspects) ? allNegativeAspects : [];
  
  console.log(`Array lengths - Positive: ${safePositiveAspects.length}, Negative: ${safeNegativeAspects.length}, Green flags: ${safeGreenFlags.length}, Red flags: ${safeRedFlags.length}`);
  
  // Use ALL positive scoring elements (already sorted by score)
  const allPositiveElements = safePositiveAspects;
  
  let synopsis = `FAST CONTEXT for ${userAName} & ${userBName}:\n`;
  
  // Add all positive elements with emphasis on strongest
  if (allPositiveElements.length > 0) {
    synopsis += "Positive elements (by strength):\n";
    
    allPositiveElements.forEach((item, index) => {
      const flag = formatAspectFlag(item?.score || 0);
      const shortDesc = item.description || 'Unknown aspect';
      
      // Emphasize top 3 elements as primary anchors
      if (index < 3) {
        synopsis += `⭐ ${shortDesc} (${flag}) [PRIMARY]\n`;
      } else {
        synopsis += `• ${shortDesc} (${flag})\n`;
      }
    });
  } else {
    // Fallback: use green flags if no allPositiveAspects
    if (safeGreenFlags.length > 0) {
      synopsis += "Positive elements (from green flags):\n";
      safeGreenFlags.forEach((item, index) => {
        const flag = formatAspectFlag(item?.score || 0);
        const shortDesc = item.description || 'Unknown aspect';
        
        if (index < 3) {
          synopsis += `⭐ ${shortDesc} (${flag}) [PRIMARY]\n`;
        } else {
          synopsis += `• ${shortDesc} (${flag})\n`;
        }
      });
    } else {
      console.log('No positive elements found in either allPositiveAspects or greenFlags');
    }
  }
  
  // Add all negative elements if any exist
  if (safeNegativeAspects.length > 0) {
    synopsis += "\nChallenging elements:\n";
    
    safeNegativeAspects.forEach(item => {
      const flag = formatAspectFlag(item?.score || 0);
      const shortDesc = item.description || 'Unknown aspect';
      synopsis += `• ${shortDesc} (${flag})\n`;
    });
  } else if (safeRedFlags.length > 0) {
    // Fallback: use red flags if no allNegativeAspects
    synopsis += "\nChallenging elements (from red flags):\n";
    safeRedFlags.forEach(item => {
      const flag = formatAspectFlag(item?.score || 0);
      const shortDesc = item.description || 'Unknown aspect';
      synopsis += `• ${shortDesc} (${flag})\n`;
    });
  }
  
  synopsis += `\nUse the strongest elements as primary anchors while incorporating all scored elements as needed to create a complete picture.\n`;
  
  return synopsis;
}

/**
 * Creates a short, readable description of an aspect or placement
 * @param item The scored relationship item
 * @returns Abbreviated description
 */
function createShortDescription(item: RelationshipScoredItem): string {
  // Handle null or undefined item
  if (!item || !item.description) {
    return 'Unknown aspect';
  }
  
  if (item.type === 'aspect') {
    // Try to match common aspect patterns
    // Pattern 1: "Planet1 aspect Planet2" (e.g., "Sun conjunction Venus")
    const simpleAspectMatch = item.description.match(/^(\w+)\s+(conjunction|sextile|square|trine|opposition|quincunx)\s+(\w+)$/i);
    if (simpleAspectMatch) {
      const [, planet1, aspectType, planet2] = simpleAspectMatch;
      return `${planet1}–${planet2} ${aspectType}`;
    }
    
    // Pattern 2: "Person's Planet aspect Person's Planet" (e.g., "EdwardT's Venus sextile Ashley's Venus")
    const namedAspectMatch = item.description.match(/(\w+)'s\s+(\w+)\s+(conjunction|sextile|square|trine|opposition|quincunx)\s+(\w+)'s\s+(\w+)/i);
    if (namedAspectMatch) {
      const [, person1, planet1, aspectType, person2, planet2] = namedAspectMatch;
      return `${person1}'s ${planet1}–${person2}'s ${planet2} ${aspectType}`;
    }
    
    // If no pattern matches, return the original description
    return item.description;
  } else if (item.type === 'housePlacement') {
    // Handle house placements more carefully
    // Pattern: "Person's Planet in Person's Nth house"
    const housePlacementMatch = item.description.match(/(\w+)'s\s+(\w+)\s+in\s+(\w+)'s\s+(\d+)\w*\s+house/i);
    if (housePlacementMatch) {
      const [, person1, planet, person2, houseNum] = housePlacementMatch;
      return `${person1}'s ${planet} in ${person2}'s ${houseNum}H`;
    }
    
    // Fallback: simple replacement
    return item.description.replace(/\s+house/gi, 'H');
  }
  return item.description || 'Unknown aspect';
}

/**
 * Creates a more detailed score synopsis for use in prompts
 * This includes context about what the scores mean
 * @param synopsisData Object containing flags and scoring data
 * @param userAName First person's name
 * @param userBName Second person's name
 * @returns Detailed synopsis with explanations
 */
export function createDetailedScoreSynopsis(
  synopsisData: SynopsisData,
  userAName: string,
  userBName: string
): string {
  // Handle case where synopsisData is null or missing required fields
  if (!synopsisData) {
    return '';
  }
  
  const { 
    greenFlags = [], 
    redFlags = [], 
    categoryScore = 0, 
    category = '' 
  } = synopsisData;
  
  // Ensure arrays are actually arrays
  const safeGreenFlags = Array.isArray(greenFlags) ? greenFlags : [];
  const safeRedFlags = Array.isArray(redFlags) ? redFlags : [];
  
  let synopsis = `RELATIONSHIP DYNAMICS OVERVIEW:\n`;
  synopsis += `${userAName} & ${userBName} compatibility score: ${categoryScore}/100\n\n`;
  
  // Add interpretation of what this score means
  if (categoryScore >= 75) {
    synopsis += `This is a stellar score indicating exceptional compatibility in this area.\n`;
  } else if (categoryScore >= 50) {
    synopsis += `This is a solid score with good potential for harmony and connection.\n`;
  } else if (categoryScore >= 25) {
    synopsis += `This is a mixed score with both opportunities and challenges to navigate.\n`;
  } else {
    synopsis += `This is a challenging score that will require conscious effort and understanding.\n`;
  }
  
  // Add key strengths
  if (safeGreenFlags.length > 0) {
    synopsis += `\nKEY STRENGTHS:\n`;
    safeGreenFlags.slice(0, 3).forEach(flag => {
      if (flag && flag.description) {
        synopsis += `• ${flag.description} (${formatAspectFlag(flag.score || 0)})\n`;
      }
    });
  }
  
  // Add key challenges
  if (safeRedFlags.length > 0) {
    synopsis += `\nKEY CHALLENGES:\n`;
    safeRedFlags.slice(0, 3).forEach(flag => {
      if (flag && flag.description) {
        synopsis += `• ${flag.description} (${formatAspectFlag(flag.score || 0)})\n`;
      }
    });
  }
  
  synopsis += `\nFocus on building from strengths while addressing challenges with patience and understanding.\n`;
  
  return synopsis;
}