/**
 * Summarizes long natal chart context to a specified word limit
 * focusing on the most relevant aspects for relationship analysis
 * @param context The full natal chart context text
 * @param wordLimit Maximum number of words (default 120)
 * @param category Optional category to focus the summary (e.g., "SEX_AND_INTIMACY")
 * @returns Summarized context string
 */
export function summarizeNatalContext(
  context: string, 
  wordLimit: number = 120, 
  category?: string
): string {
  if (!context || context.trim().length === 0) {
    return "No specific context available.";
  }

  // First, remove any section separators like "---" or "..."
  const cleanedContext = context
    .replace(/---+/g, '. ') // Replace dashes with period
    .replace(/\.{3,}/g, '. ') // Replace ellipsis with period
    .trim();
  
  // Split into sentences for better preservation of meaning
  // More precise regex that doesn't split on ellipsis within sentences
  const sentences = cleanedContext
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .filter(s => s.trim().length > 0);
  
  if (sentences.length === 0) {
    return context.slice(0, wordLimit * 6); // Rough estimate: 6 chars per word
  }

  // If already under word limit, return as-is
  const wordCount = context.split(/\s+/).length;
  if (wordCount <= wordLimit) {
    return context;
  }

  // Priority keywords for different relationship categories
  const categoryKeywords: Record<string, string[]> = {
    'OVERALL_ATTRACTION_CHEMISTRY': ['venus', 'mars', 'sun', 'moon', 'attraction', 'chemistry', 'magnetic', 'charisma'],
    'EMOTIONAL_SECURITY_CONNECTION': ['moon', 'cancer', 'security', 'emotional', 'nurturing', 'care', 'comfort', 'stability'],
    'SEX_AND_INTIMACY': ['mars', 'venus', 'scorpio', 'pluto', '8th house', 'sexual', 'intimate', 'passion', 'desire'],
    'COMMUNICATION_AND_MENTAL_CONNECTION': ['mercury', 'gemini', '3rd house', 'communication', 'mental', 'intellectual', 'conversation'],
    'COMMITMENT_LONG_TERM_POTENTIAL': ['saturn', 'capricorn', '7th house', '10th house', 'commitment', 'stability', 'long-term', 'partnership'],
    'KARMIC_LESSONS_GROWTH': ['pluto', 'scorpio', 'karmic', 'transformation', 'growth', 'lesson', 'evolution', 'healing'],
    'PRACTICAL_GROWTH_SHARED_GOALS': ['saturn', 'capricorn', 'virgo', 'earth', 'practical', 'goals', 'achievement', 'responsibility']
  };

  // Get relevant keywords for scoring sentence importance
  const relevantKeywords = category ? categoryKeywords[category] || [] : [];
  
  // Score sentences based on relevance and position
  const scoredSentences = sentences.map((sentence, index) => {
    let score = 0;
    
    // Position bonus (earlier sentences often more important)
    if (index < 2) score += 2;
    else if (index < 4) score += 1;
    
    // Keyword matching bonus
    const lowerSentence = sentence.toLowerCase();
    relevantKeywords.forEach(keyword => {
      if (lowerSentence.includes(keyword)) {
        score += 3;
      }
    });
    
    // General astrological importance indicators
    const importantTerms = ['aspects', 'placement', 'house', 'sign', 'conjunction', 'opposition', 'trine', 'square'];
    importantTerms.forEach(term => {
      if (lowerSentence.includes(term)) {
        score += 1;
      }
    });
    
    // Length bonus for substantial sentences
    if (sentence.split(/\s+/).length > 8) {
      score += 1;
    }
    
    return { sentence: sentence.trim(), score, index };
  });

  // Sort by score (highest first) and take the best sentences
  scoredSentences.sort((a, b) => b.score - a.score);
  
  let selectedSentences: string[] = [];
  let currentWordCount = 0;
  
  // Add sentences until we approach the word limit
  for (const item of scoredSentences) {
    const sentenceWords = item.sentence.split(/\s+/).length;
    if (currentWordCount + sentenceWords <= wordLimit) {
      selectedSentences.push(item.sentence);
      currentWordCount += sentenceWords;
    } else {
      // Try to fit a partial sentence if there's room
      const remainingWords = wordLimit - currentWordCount;
      if (remainingWords > 5) {
        const words = item.sentence.split(/\s+/);
        const partialSentence = words.slice(0, remainingWords).join(' ') + '...';
        selectedSentences.push(partialSentence);
      }
      break;
    }
  }
  
  // If no sentences selected, take the first part of the original
  if (selectedSentences.length === 0) {
    const words = context.split(/\s+/);
    return words.slice(0, wordLimit).join(' ') + (words.length > wordLimit ? '...' : '');
  }
  
  // Sort selected sentences back to their original order for coherence
  const originalOrder = selectedSentences.sort((a, b) => {
    const indexA = sentences.findIndex(s => s.trim() === a.replace('...', '').trim());
    const indexB = sentences.findIndex(s => s.trim() === b.replace('...', '').trim());
    return indexA - indexB;
  });
  
  // Join sentences and clean up punctuation
  let result = originalOrder.join(' ');
  
  // Ensure proper sentence ending
  if (!result.match(/[.!?]$/)) {
    result += '.';
  }
  
  // Clean up any double periods or spaces
  result = result
    .replace(/\.\s*\./g, '.')
    .replace(/\s+/g, ' ')
    .trim();
  
  return result;
}

/**
 * Creates a focused summary specifically for relationship analysis
 * @param context The full natal chart context
 * @param partnerName The partner's name for context
 * @param category The relationship category being analyzed
 * @returns Relationship-focused summary
 */
export function createRelationshipFocusedSummary(
  context: string,
  partnerName: string,
  category: string
): string {
  const summary = summarizeNatalContext(context, 100, category);
  
  // Add a brief intro to contextualize this person's traits in the relationship
  const categoryDescriptions: Record<string, string> = {
    'OVERALL_ATTRACTION_CHEMISTRY': 'brings to attraction and chemistry',
    'EMOTIONAL_SECURITY_CONNECTION': 'approaches emotional connection',
    'SEX_AND_INTIMACY': 'expresses intimacy and passion',
    'COMMUNICATION_AND_MENTAL_CONNECTION': 'communicates and connects mentally',
    'COMMITMENT_LONG_TERM_POTENTIAL': 'approaches commitment and partnership',
    'KARMIC_LESSONS_GROWTH': 'approaches growth and transformation',
    'PRACTICAL_GROWTH_SHARED_GOALS': 'handles practical matters and goals'
  };
  
  const description = categoryDescriptions[category] || 'contributes to this relationship area';
  
  return `How this person ${description}: ${summary}`;
}