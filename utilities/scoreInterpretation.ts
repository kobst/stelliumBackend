import { relationshipScoringStats } from './relationshipScoringStats.js';

interface ScoreInterpretation {
  adjective: string;
  percentile: string;
  description: string;
}

/**
 * Interprets a raw relationship score into plain English with context
 * @param rawScore The numerical score to interpret
 * @param category The relationship category (e.g., "OVERALL_ATTRACTION_CHEMISTRY")
 * @param scoreType The score type ("overall", "synastry", "composite", etc.)
 * @returns Object with adjective, percentile, and description
 */
export function interpretRelationshipScore(
  rawScore: number, 
  category: string, 
  scoreType: string = "overall"
): ScoreInterpretation {
  const categoryStats = relationshipScoringStats.stats[category as keyof typeof relationshipScoringStats.stats];
  
  if (!categoryStats || !categoryStats[scoreType as keyof typeof categoryStats]) {
    return {
      adjective: "moderate",
      percentile: "unknown percentile",
      description: "This score shows moderate compatibility in this area."
    };
  }

  const stats = categoryStats[scoreType as keyof typeof categoryStats] as any;
  const { p25, p75, mean, median } = stats;

  let adjective: string;
  let percentile: string;
  let description: string;

  // Calculate percentile range based on quartiles
  if (rawScore >= p75) {
    adjective = "strong";
    percentile = "top 25%";
    description = "This is a notably strong area of compatibility between you.";
  } else if (rawScore >= median) {
    adjective = "above average";
    percentile = "above median";
    description = "This area shows good potential for connection and harmony.";
  } else if (rawScore >= p25) {
    adjective = "moderate";
    percentile = "middle range";
    description = "This area has mixed dynamics with both strengths and challenges.";
  } else {
    adjective = "challenging";
    percentile = "bottom 25%";
    description = "This area may require extra attention and conscious effort.";
  }

  return { adjective, percentile, description };
}

/**
 * Creates a brief score summary line for use in prompts
 * @param rawScore The numerical score
 * @param category The relationship category
 * @param scoreType The score type
 * @returns Formatted string like "Strong (78/100, top 25%)"
 */
export function formatScoreForPrompt(
  rawScore: number, 
  category: string, 
  scoreType: string = "overall"
): string {
  const interpretation = interpretRelationshipScore(rawScore, category, scoreType);
  return `${interpretation.adjective} (${rawScore}/100, ${interpretation.percentile})`.charAt(0).toUpperCase() + 
         `${interpretation.adjective} (${rawScore}/100, ${interpretation.percentile})`.slice(1);
}

/**
 * Creates green/red flag interpretation for aspect scores
 * @param score The aspect score (positive or negative)
 * @returns Formatted flag string
 */
export function formatAspectFlag(score: number): string {
  if (score >= 8) {
    return `💚 ${score}`;
  } else if (score >= 4) {
    return `🟢 ${score}`;
  } else if (score <= -4) {
    return `🟥 ${score}`;
  } else if (score <= -1) {
    return `🟡 ${score}`;
  } else {
    return `⚪ ${score}`;
  }
}

/**
 * Generates a concise context line with the most important scores
 * @param scores Object containing all relationship scores
 * @param category The relationship category
 * @returns Formatted context line for prompt headers
 */
export function createScoreContextLine(scores: any, category: string): string {
  const overall = scores.overall || 0;
  const synastry = scores.synastry || 0;
  const composite = scores.composite || 0;

  const overallInterp = interpretRelationshipScore(overall, category, "overall");
  const synastryInterp = interpretRelationshipScore(synastry, category, "synastry");
  
  return `${overallInterp.adjective.charAt(0).toUpperCase() + overallInterp.adjective.slice(1)} overall (${overall}/100, ${overallInterp.percentile}) • Synastry: ${synastryInterp.adjective} (${synastry}/100)`;
}