// @ts-nocheck
export const RELATIONSHIP_CATEGORIES = {
    OVERALL_ATTRACTION_CHEMISTRY: 'OVERALL_ATTRACTION_CHEMISTRY',
    EMOTIONAL_SECURITY_CONNECTION: 'EMOTIONAL_SECURITY_CONNECTION',
    SEX_AND_INTIMACY: 'SEX_AND_INTIMACY',
    COMMUNICATION_AND_MENTAL_CONNECTION: 'COMMUNICATION_AND_MENTAL_CONNECTION',
    COMMITMENT_LONG_TERM_POTENTIAL: 'COMMITMENT_LONG_TERM_POTENTIAL',
    KARMIC_LESSONS_GROWTH: 'KARMIC_LESSONS_GROWTH',
    PRACTICAL_GROWTH_SHARED_GOALS: 'PRACTICAL_GROWTH_SHARED_GOALS'
}

export const RELATIONSHIP_CATEGORY_PROMPTS = {
    [RELATIONSHIP_CATEGORIES.OVERALL_ATTRACTION_CHEMISTRY]: "Retrieve birth chart analysis related to how this person attracts and is attracted to others. Focus on charm, charisma, magnetism, physical expression, and initial romantic chemistry. Include references to Venus, Mars, the Ascendant, and 1st or 5th house if relevant.",
    [RELATIONSHIP_CATEGORIES.EMOTIONAL_SECURITY_CONNECTION]: "Retrieve birth chart analysis that describes this person’s emotional needs, capacity for intimacy, and how they give and receive emotional care. Include references to the Moon, 4th or 8th house, or aspects involving Saturn and Chiron.",
    [RELATIONSHIP_CATEGORIES.SEX_AND_INTIMACY]: "Retrieve birth chart analysis detailing this person's sexual nature, desires, and approach to physical intimacy. Include references to Mars, Venus, Pluto, the 5th or 8th house, or aspects involving Lilith.",
    [RELATIONSHIP_CATEGORIES.COMMUNICATION_AND_MENTAL_CONNECTION]: "Retrieve birth chart analysis focusing on this person's communication style, intellectual compatibility needs, and how they exchange ideas. Include references to Mercury, the 3rd or 9th house, or aspects involving Uranus.",
    [RELATIONSHIP_CATEGORIES.COMMITMENT_LONG_TERM_POTENTIAL]: "Retrieve birth chart analysis related to this person's views on commitment, loyalty, and their potential for long-term partnerships. Include references to Saturn, Juno, the 7th house, or aspects to the Sun or Moon.",
    [RELATIONSHIP_CATEGORIES.KARMIC_LESSONS_GROWTH]: "Retrieve birth chart analysis that highlights karmic patterns, soul lessons, and areas for personal growth within relationships. Include references to Saturn, Pluto, Chiron, the Nodes of the Moon, or the 12th house.",
    [RELATIONSHIP_CATEGORIES.PRACTICAL_GROWTH_SHARED_GOALS]: "Retrieve birth chart analysis concerning this person's approach to daily life, shared responsibilities, material security, and ambitions within a partnership. Include references to Saturn, the 2nd, 6th, or 10th house, or aspects involving Jupiter."
};

export const ALL_RELATIONSHIP_CATEGORIES = Object.values(RELATIONSHIP_CATEGORIES);

    // Define category weights
    export const categoryWeights = {
        [RELATIONSHIP_CATEGORIES.OVERALL_ATTRACTION_CHEMISTRY]: { synastry: 0.7, composite: 0.3 },
        [RELATIONSHIP_CATEGORIES.EMOTIONAL_SECURITY_CONNECTION]: { synastry: 0.6, composite: 0.4 },
        [RELATIONSHIP_CATEGORIES.SEX_AND_INTIMACY]: { synastry: 0.8, composite: 0.2 },
        [RELATIONSHIP_CATEGORIES.COMMUNICATION_AND_MENTAL_CONNECTION]: { synastry: 0.5, composite: 0.5 },
        [RELATIONSHIP_CATEGORIES.COMMITMENT_LONG_TERM_POTENTIAL]: { synastry: 0.4, composite: 0.6 },
        [RELATIONSHIP_CATEGORIES.KARMIC_LESSONS_GROWTH]: { synastry: 0.5, composite: 0.5 },
        [RELATIONSHIP_CATEGORIES.PRACTICAL_GROWTH_SHARED_GOALS]: { synastry: 0.4, composite: 0.6 }
    };

    export const aspectScoringProfiles = {
        // 🔹 Strong romantic and physical chemistry
        STRONG_POSITIVE_BALANCE: { conjunction: 20, trine: 15, sextile: 10, square: 5, opposition: 5, quincunx: 2 },
      
        // 🔹 Powerful resonance, emotionally deep
        DEEP_EMOTIONAL_BOND: { conjunction: 20, trine: 15, sextile: 10, square: -10, opposition: -5, quincunx: -3 },
      
        // 🔹 Gentle, supportive but not fiery
        WARM_SOFT_HARMONY: { conjunction: 15, trine: 15, sextile: 10, square: 5, opposition: 3, quincunx: 2 },
      
        // 🔹 Growth-oriented but emotionally risky
        KARMIC_HEALING_POLARITY: { conjunction: 10, trine: 8, sextile: 6, square: -8, opposition: -5, quincunx: -2 },
      
        // 🔹 Exciting and possibly volatile
        VOLATILE_SEXUAL_SPARK: { conjunction: 15, trine: 10, sextile: 8, square: 10, opposition: 5, quincunx: 3 },
      
        // 🔹 Slightly confusing but dreamy
        LOW_KEY_ATTRACTION_WITH_EDGE: { conjunction: 9, trine: 6, sextile: 3, square: -2, opposition: -2, quincunx: 1 },
      
        // 🔹 Supportive and educational or directional
        GROWTH_MENTORSHIP_VIBE: { conjunction: 15, trine: 10, sextile: 8, square: 3, opposition: 0, quincunx: 2 },
      
        // 🔹 Harsh Saturn pattern, emotional restraint
        EMOTIONAL_WEIGHT_WITH_POTENTIAL: { conjunction: 0, trine: 10, sextile: 8, square: -15, opposition: -10, quincunx: -5 },
      
        // 🔹 Mild affinity or cerebral sync
        MENTAL_HARMONY: { conjunction: 15, trine: 10, sextile: 8, square: -5, opposition: -3, quincunx: 1 },
      
        // 🔹 Thoughtful blend of challenge and warmth
        BALANCED_MILDLY_POSITIVE: { conjunction: 12, trine: 8, sextile: 6, square: 0, opposition: -1, quincunx: 1 },
      
        // 🔥 High sexual intensity
        HIGH_SEXUAL_CHARGE: { conjunction: 25, trine: 15, sextile: 10, square: 15, opposition: 10, quincunx: 5 },
      
        // 🧿 Karmic themes
        VULNERABILITY_HEALING: { conjunction: 10, trine: 8, sextile: 5, square: -8, opposition: -5, quincunx: -3 },
        SOFT_EXPANSION: { conjunction: 5, trine: 2, sextile: 2, square: 2, opposition: 2, quincunx: 1 },
        KARMIC_IDENTITY_PATH: { conjunction: 15, trine: 10, sextile: 8, square: -5, opposition: -3, quincunx: -2 },
        IDENTITY_HEALING: { conjunction: 10, trine: 8, sextile: 5, square: -8, opposition: -5, quincunx: -2 },
        FATED_SHADOW_WORK: { conjunction: 15, trine: 10, sextile: 8, square: -10, opposition: -8, quincunx: -5 },
        KARMIC_RESPONSIBILITY: { conjunction: 20, trine: 15, sextile: 10, square: -10, opposition: -8, quincunx: -5 },
        MUTUAL_SOUL_DIRECTION: { conjunction: 20, trine: 15, sextile: 10, square: 0, opposition: 0, quincunx: 3 },
        FATED_AWAKENING: { conjunction: 10, trine: 8, sextile: 6, square: -5, opposition: -3, quincunx: 1 },
        TRANSFORMATIVE_IDENTITY: { conjunction: 12, trine: 10, sextile: 8, square: -5, opposition: -3, quincunx: -2 },
        DEEP_KARMIC_STRUCTURE: { conjunction: 8, trine: 5, sextile: 5, square: -10, opposition: -5, quincunx: -3 },
      
        // 🧠 Emotional and mental resonance
        HEALING_WOUNDING_BALANCE: { conjunction: 10, trine: 8, sextile: 6, square: -8, opposition: -5, quincunx: -2 },
        MUTUAL_KARMIC_INSIGHT: { conjunction: 10, trine: 10, sextile: 8, square: -5, opposition: -5, quincunx: -2 },
        DEEP_EMOTIONAL_HEALING: { conjunction: 10, trine: 10, sextile: 8, square: -10, opposition: -5, quincunx: -3 },
        EMOTIONAL_SOFTENING_SUPPORT: { conjunction: 12, trine: 10, sextile: 6, square: 0, opposition: -5, quincunx: 1 },
        HIGH_EMOTIONAL_BONDING: { conjunction: 20, trine: 15, sextile: 10, square: -10, opposition: -5, quincunx: -3 },
        STRUCTURE_EMOTIONAL_CONFLICT: { conjunction: 0, trine: 10, sextile: 8, square: -15, opposition: -10, quincunx: -5 },
      
        // 🔥 Sexual + Romantic nuance
        HEALING_TENSION_SEXUAL: { conjunction: 12, trine: 10, sextile: 6, square: -10, opposition: -8, quincunx: -3 },
        ENERGETIC_COMPETITIVE_SEXUAL: { conjunction: 15, trine: 10, sextile: 8, square: 0, opposition: 0, quincunx: 2 },
        SENSUAL_MYSTICAL_MARS: { conjunction: 15, trine: 12, sextile: 8, square: -5, opposition: 0, quincunx: 3 },
        UNPREDICTABLE_ELECTRIC_SEXUAL: { conjunction: 15, trine: 10, sextile: 8, square: 10, opposition: 5, quincunx: 4 },
        EMOTIONAL_SEXUAL_HARMONY: { conjunction: 20, trine: 15, sextile: 10, square: 0, opposition: 0, quincunx: 2 },
        SENSUAL_LOVING_CHEMISTRY: { conjunction: 20, trine: 15, sextile: 10, square: 5, opposition: 3, quincunx: 2 },
        ROMANTIC_ENCHANTED_BOND: { conjunction: 20, trine: 15, sextile: 12, square: -5, opposition: -5, quincunx: 3 },
        SEXUAL_INTENSITY_CONSCIOUSNESS: { conjunction: 15, trine: 10, sextile: 8, square: 5, opposition: 3, quincunx: 2 },


        // 🧠 Communication Profiles
        INSIGHTFUL_MENTAL_CHEMISTRY:   { conjunction: 18, trine: 12, sextile: 8, square: -8, opposition: -5, quincunx: 1 },
        LIGHT_EXCITEMENT:              { conjunction: 9, trine: 6, sextile: 3, square: 2, opposition: 2, quincunx: 1 },
        HEALING_MIND_CHIRON:           { conjunction: 12, trine: 8, sextile: 6, square: -8, opposition: -5, quincunx: -2 },
        MENTAL_ASSERTIVENESS:          { conjunction: 15, trine: 10, sextile: 8, square: -5, opposition: -3, quincunx: 1 },
        MENTAL_SYNC:                   { conjunction: 20, trine: 15, sextile: 10, square: -5, opposition: -5, quincunx: 2 },
        MENTAL_EMOTIONAL_EXCHANGE:     { conjunction: 15, trine: 15, sextile: 10, square: -10, opposition: -5, quincunx: -3 },
        DREAMY_OR_CONFUSING:           { conjunction: 10, trine: 10, sextile: 8, square: -10, opposition: -8, quincunx: -2 },
        DESTINED_MENTAL_PATH:          { conjunction: 12, trine: 10, sextile: 8, square: 0, opposition: 0, quincunx: 2 },
        DEEP_TRANSFORMATIVE_THOUGHT:   { conjunction: 12, trine: 10, sextile: 8, square: -8, opposition: -6, quincunx: -1 },
        SERIOUS_MIND_BLOCKS:           { conjunction: 10, trine: 5, sextile: 5, square: -10, opposition: -8, quincunx: -3 },
        UNCONVENTIONAL_IDEAS:          { conjunction: 15, trine: 12, sextile: 10, square: -5, opposition: -3, quincunx: 2 },
        EMOTIONAL_HARMONY_MIND:        { conjunction: 15, trine: 15, sextile: 10, square: -5, opposition: -3, quincunx: 1 },

        // 🧱 Commitment & Structure
        SERIOUS_BUT_INHIBITING:        { conjunction: 5, trine: 12, sextile: 10, square: -5, opposition: -8, quincunx: -3 },
        KARMIC_STRUCTURE_HEALING:      { conjunction: 10, trine: 8, sextile: 6, square: -5, opposition: -8, quincunx: -2 },
        STABLE_PASSIONATE_BOND:        { conjunction: 10, trine: 15, sextile: 10, square: -5, opposition: -3, quincunx: 2 },
        DISCIPLINED_ACTION_TENSION:    { conjunction: 15, trine: 10, sextile: 8, square: -10, opposition: -8, quincunx: -3 },
        HEAVY_EMOTIONAL_SECURITY:      { conjunction: 0, trine: 10, sextile: 8, square: -15, opposition: -10, quincunx: -5 },
        EMOTIONAL_VITAL_HARMONY:       { conjunction: 20, trine: 15, sextile: 10, square: 0, opposition: 0, quincunx: 2 },
        EXPANSION_FATED_PATH:          { conjunction: 10, trine: 10, sextile: 8, square: 0, opposition: 0, quincunx: 2 },
        GROWTH_BALANCES_REALITY:       { conjunction: 15, trine: 15, sextile: 10, square: 0, opposition: 0, quincunx: 2 },
        PURPOSEFUL_ENCOURAGEMENT:      { conjunction: 10, trine: 10, sextile: 8, square: 0, opposition: 0, quincunx: 1 },
        LUCKY_ROMANTIC_STABILITY:      { conjunction: 15, trine: 15, sextile: 10, square: 5, opposition: 3, quincunx: 2 },
        RELIABLE_IDENTITY_ANCHOR:      { conjunction: 20, trine: 15, sextile: 10, square: -10, opposition: -8, quincunx: -3 },
        STRUCTURED_LOVE_KARMA:         { conjunction: 10, trine: 15, sextile: 10, square: -15, opposition: -10, quincunx: -5 },
        MUTUAL_RESPONSIBILITY:         { conjunction: 5, trine: 10, sextile: 8, square: -10, opposition: -5, quincunx: -2 },
        HARMONIOUS_VALUES:             { conjunction: 10, trine: 15, sextile: 10, square: 5, opposition: 5, quincunx: 2 },

        // 🚀 Practical Growth / Shared Purpose
        GROWTH_EXPANSION:              { conjunction: 15, trine: 10, sextile: 8, square: 5, opposition: 3, quincunx: 2 },
        IDENTITY_HEALING_PRACTICAL:    { conjunction: 10, trine: 8, sextile: 5, square: -5, opposition: -3, quincunx: 1 },
        CHIRON_JUPITER_GROWTH:         { conjunction: 10, trine: 8, sextile: 6, square: -4, opposition: -3, quincunx: 2 },
        FATEFUL_EXPANSION:             { conjunction: 15, trine: 10, sextile: 8, square: 3, opposition: 0, quincunx: 2 },
        MUTUAL_EXPANSION:              { conjunction: 20, trine: 15, sextile: 10, square: 5, opposition: 3, quincunx: 3 },
        SOLAR_EXPANSION:               { conjunction: 15, trine: 15, sextile: 10, square: 5, opposition: 3, quincunx: 2 },
        BALANCED_GROWTH_STRUCTURE:     { conjunction: 15, trine: 15, sextile: 10, square: 5, opposition: 3, quincunx: 2 },
        KARMIC_IDENTITY_PATH_GROWTH:  { conjunction: 15, trine: 10, sextile: 8, square: 5, opposition: 3, quincunx: 2 },
        TEAMWORK_CHALLENGE_GROWTH:     { conjunction: 10, trine: 10, sextile: 5, square: -8, opposition: 0, quincunx: 2 },
        PLUTO_SOLAR_GROWTH:            { conjunction: 10, trine: 15, sextile: 10, square: -5, opposition: -3, quincunx: 1 },
        TRANSFORMATION_GOVERNANCE:     { conjunction: 10, trine: 5, sextile: 5, square: -5, opposition: -3, quincunx: -1 },
        INNOVATIVE_AUTHENTICITY:       { conjunction: 10, trine: 15, sextile: 10, square: 0, opposition: 0, quincunx: 2 }
      };
      


// revisited aspectScoringRules
export const aspectScoringRules = {
    // --------------------------------------
  // OVERALL ATTRACTION CHEMISTRY
  // --------------------------------------
    [RELATIONSHIP_CATEGORIES.OVERALL_ATTRACTION_CHEMISTRY]: {
        // Ascendant–Ascendant (rising sign compatibility)
        'ascendant_ascendant': { conjunction: 10, trine: 10, sextile: 10, square: 0, opposition: 5 },
        'ascendant_midheaven': aspectScoringProfiles.BALANCED_MILDLY_POSITIVE,
        'ascendant_jupiter': aspectScoringProfiles.WARM_SOFT_HARMONY,
        'ascendant_mars': aspectScoringProfiles.STRONG_POSITIVE_BALANCE,
        'ascendant_mercury': aspectScoringProfiles.BALANCED_MILDLY_POSITIVE,
        'ascendant_neptune': aspectScoringProfiles.LOW_KEY_ATTRACTION_WITH_EDGE,
        'ascendant_pluto': aspectScoringProfiles.LOW_KEY_ATTRACTION_WITH_EDGE,
        'ascendant_uranus': aspectScoringProfiles.LOW_KEY_ATTRACTION_WITH_EDGE,
        'ascendant_sun': aspectScoringProfiles.STRONG_POSITIVE_BALANCE,
        'ascendant_venus': aspectScoringProfiles.STRONG_POSITIVE_BALANCE,
        'mars_sun': aspectScoringProfiles.STRONG_POSITIVE_BALANCE,
        'mars_venus': {
            conjunction: 20, trine: 15, sextile: 10, square: 10, opposition: 5
        }, // square is more strongly positive here
        'moon_sun': aspectScoringProfiles.STRONG_POSITIVE_BALANCE,
        'moon_venus': aspectScoringProfiles.WARM_SOFT_HARMONY,
        'midheaven_sun': aspectScoringProfiles.STRONG_POSITIVE_BALANCE,
        'midheaven_venus': aspectScoringProfiles.STRONG_POSITIVE_BALANCE,
        'pluto_venus': aspectScoringProfiles.VOLATILE_SEXUAL_SPARK,
        'sun_venus': aspectScoringProfiles.STRONG_POSITIVE_BALANCE
    },
    // --------------------------------------
    // EMOTIONAL SECURITY & CONNECTION
    [RELATIONSHIP_CATEGORIES.EMOTIONAL_SECURITY_CONNECTION]: {
        'ascendant_chiron': aspectScoringProfiles.HEALING_WOUNDING_BALANCE,
        'chiron_chiron': aspectScoringProfiles.MUTUAL_KARMIC_INSIGHT,
        'chiron_moon': aspectScoringProfiles.DEEP_EMOTIONAL_HEALING,
        'chiron_venus': aspectScoringProfiles.EMOTIONAL_SOFTENING_SUPPORT,
        'chiron_sun': aspectScoringProfiles.HEALING_WOUNDING_BALANCE,
        'moon_moon': aspectScoringProfiles.HIGH_EMOTIONAL_BONDING,
        'moon_venus': aspectScoringProfiles.WARM_SOFT_HARMONY,
        'moon_saturn': aspectScoringProfiles.STRUCTURE_EMOTIONAL_CONFLICT,
        'moon_pluto': aspectScoringProfiles.DEEP_EMOTIONAL_HEALING,
        'midheaven_moon': aspectScoringProfiles.WARM_SOFT_HARMONY,
        'midheaven_saturn': aspectScoringProfiles.STRUCTURE_EMOTIONAL_CONFLICT,
        'jupiter_moon': aspectScoringProfiles.WARM_SOFT_HARMONY,
    },

    // --------------------------------------
    // SEX & INTIMACY

    [RELATIONSHIP_CATEGORIES.SEX_AND_INTIMACY]: {
        // Keys are in alphabetical order:
        'ascendant_mars': aspectScoringProfiles.HIGH_SEXUAL_CHARGE,
        'ascendant_sun': aspectScoringProfiles.HIGH_SEXUAL_CHARGE,
        'ascendant_venus': aspectScoringProfiles.HIGH_SEXUAL_CHARGE,
        'chiron_mars': aspectScoringProfiles.HEALING_TENSION_SEXUAL,
        'mars_mars': aspectScoringProfiles.ENERGETIC_COMPETITIVE_SEXUAL,
        'mars_neptune': aspectScoringProfiles.SENSUAL_MYSTICAL_MARS,
        'mars_pluto': aspectScoringProfiles.INTENSE_SEXUAL_POWER,
        'mars_sun': aspectScoringProfiles.HIGH_SEXUAL_CHARGE,
        'mars_uranus': aspectScoringProfiles.UNPREDICTABLE_ELECTRIC_SEXUAL,
        'mars_midheaven': aspectScoringProfiles.VOLATILE_SEXUAL_SPARK,
        'mars_venus': aspectScoringProfiles.HIGH_SEXUAL_CHARGE,
        'midheaven_venus': aspectScoringProfiles.ROMANTIC_ENCHANTED_BOND,
        'midheaven_pluto': aspectScoringProfiles.INTENSE_SEXUAL_POWER,
        'moon_sun': aspectScoringProfiles.EMOTIONAL_SEXUAL_HARMONY,
        'moon_venus': aspectScoringProfiles.SENSUAL_LOVING_CHEMISTRY,
        'neptune_venus': aspectScoringProfiles.ROMANTIC_ENCHANTED_BOND,
        'pluto_sun': aspectScoringProfiles.SEXUAL_INTENSITY_CONSCIOUSNESS,
        'pluto_venus': aspectScoringProfiles.INTENSE_SEXUAL_POWER,
        'sun_venus': aspectScoringProfiles.HIGH_SEXUAL_CHARGE,
        'uranus_venus': aspectScoringProfiles.UNPREDICTABLE_ELECTRIC_SEXUAL
    },

    // --------------------------------------
    // COMMUNICATION & MENTAL CONNECTION
    [RELATIONSHIP_CATEGORIES.COMMUNICATION_AND_MENTAL_CONNECTION]: {
        'ascendant_mercury': aspectScoringProfiles.INSIGHTFUL_MENTAL_CHEMISTRY,
        'ascendant_uranus': aspectScoringProfiles.LIGHT_EXCITEMENT,
        'chiron_mercury': aspectScoringProfiles.HEALING_MIND_CHIRON,
        'mars_mercury': aspectScoringProfiles.MENTAL_ASSERTIVENESS,
        'mercury_mercury': aspectScoringProfiles.MENTAL_SYNC,
        'mercury_midheaven': aspectScoringProfiles.INSIGHTFUL_MENTAL_CHEMISTRY,
        'mercury_moon': aspectScoringProfiles.MENTAL_EMOTIONAL_EXCHANGE,
        'mercury_neptune': aspectScoringProfiles.DREAMY_OR_CONFUSING,
        'mercury_node': aspectScoringProfiles.DESTINED_MENTAL_PATH,
        'mercury_pluto': aspectScoringProfiles.DEEP_TRANSFORMATIVE_THOUGHT,
        'mercury_sun': aspectScoringProfiles.MENTAL_ASSERTIVENESS,
        'mercury_saturn': aspectScoringProfiles.SERIOUS_MIND_BLOCKS,
        'mercury_uranus': aspectScoringProfiles.UNCONVENTIONAL_IDEAS,
        'moon_moon': aspectScoringProfiles.EMOTIONAL_HARMONY_MIND,
        'moon_uranus': aspectScoringProfiles.UNCONVENTIONAL_IDEAS,
        'mercury_venus': aspectScoringProfiles.MENTAL_ASSERTIVENESS,
        'midheaven_jupiter': aspectScoringProfiles.EXPANSIVE_MIND_GROWTH,
        'jupiter_mercury': aspectScoringProfiles.MENTAL_ASSERTIVENESS
      },

    // --------------------------------------
  // COMMITMENT & LONG-TERM POTENTIAL
    [RELATIONSHIP_CATEGORIES.COMMITMENT_LONG_TERM_POTENTIAL]: {
        'ascendant_saturn': aspectScoringProfiles.SERIOUS_BUT_INHIBITING,
        'chiron_saturn': aspectScoringProfiles.KARMIC_STRUCTURE_HEALING,
        'mars_venus': aspectScoringProfiles.STABLE_PASSIONATE_BOND,
        'mars_saturn': aspectScoringProfiles.DISCIPLINED_ACTION_TENSION,
        'moon_saturn': aspectScoringProfiles.HEAVY_EMOTIONAL_SECURITY,
        'moon_sun': aspectScoringProfiles.EMOTIONAL_VITAL_HARMONY,
        'midheaven_saturn': aspectScoringProfiles.RELIABLE_IDENTITY_ANCHOR,
        'midheaven_sun': aspectScoringProfiles.PURPOSEFUL_ENCOURAGEMENT,
        'midheaven_venus': aspectScoringProfiles.LUCKY_ROMANTIC_STABILITY,
        'midheaven_node': aspectScoringProfiles.KARMIC_RESPONSIBILITY,
        'node_saturn': aspectScoringProfiles.KARMIC_RESPONSIBILITY,
        'jupiter_node': aspectScoringProfiles.EXPANSION_FATED_PATH,
        'jupiter_saturn': aspectScoringProfiles.GROWTH_BALANCES_REALITY,
        'jupiter_sun': aspectScoringProfiles.PURPOSEFUL_ENCOURAGEMENT,
        'jupiter_venus': aspectScoringProfiles.LUCKY_ROMANTIC_STABILITY,
        'saturn_sun': aspectScoringProfiles.RELIABLE_IDENTITY_ANCHOR,
        'saturn_venus': aspectScoringProfiles.STRUCTURED_LOVE_KARMA,
        'saturn_saturn': aspectScoringProfiles.MUTUAL_RESPONSIBILITY,
        'venus_venus': aspectScoringProfiles.HARMONIOUS_VALUES
    },
  

  // --------------------------------------
  [RELATIONSHIP_CATEGORIES.KARMIC_LESSONS_GROWTH]: {
        'ascendant_chiron': aspectScoringProfiles.VULNERABILITY_HEALING,
        'ascendant_jupiter': aspectScoringProfiles.SOFT_EXPANSION,
        'ascendant_node': aspectScoringProfiles.KARMIC_IDENTITY_PATH,
        'chiron_moon': aspectScoringProfiles.VULNERABILITY_HEALING,
        'chiron_node': aspectScoringProfiles.IDENTITY_HEALING,
        'chiron_sun': aspectScoringProfiles.IDENTITY_HEALING,
        'mars_node': aspectScoringProfiles.KARMIC_IDENTITY_PATH,
        'moon_node': aspectScoringProfiles.KARMIC_IDENTITY_PATH,
        'moon_pluto': aspectScoringProfiles.VULNERABILITY_HEALING,
        'midheaven_pluto': aspectScoringProfiles.FATED_SHADOW_WORK,
        'midheaven_node': aspectScoringProfiles.KARMIC_IDENTITY_PATH,   
        'midheaven_saturn': aspectScoringProfiles.KARMIC_RESPONSIBILITY,
        'node_sun': aspectScoringProfiles.KARMIC_IDENTITY_PATH,
        'node_venus': aspectScoringProfiles.KARMIC_IDENTITY_PATH,
        'node_pluto': aspectScoringProfiles.FATED_SHADOW_WORK,
        'node_saturn': aspectScoringProfiles.KARMIC_RESPONSIBILITY,
        'node_node': aspectScoringProfiles.MUTUAL_SOUL_DIRECTION,
        'node_uranus': aspectScoringProfiles.FATED_AWAKENING,
        'pluto_sun': aspectScoringProfiles.TRANSFORMATIVE_IDENTITY,
        'pluto_saturn': aspectScoringProfiles.DEEP_KARMIC_STRUCTURE
  },
  
    // --------------------------------------
    // GROWTH & SHARED GOALS
    // --------------------------------------
    [RELATIONSHIP_CATEGORIES.PRACTICAL_GROWTH_SHARED_GOALS]: {
        'ascendant_jupiter': aspectScoringProfiles.GROWTH_EXPANSION,
        'ascendant_node': aspectScoringProfiles.GROWTH_EXPANSION,
        'chiron_sun': aspectScoringProfiles.IDENTITY_HEALING_PRACTICAL,
        'chiron_moon': aspectScoringProfiles.IDENTITY_HEALING_PRACTICAL,
        'chiron_jupiter': aspectScoringProfiles.CHIRON_JUPITER_GROWTH,
        'jupiter_mars': aspectScoringProfiles.GROWTH_EXPANSION,
        'jupiter_node': aspectScoringProfiles.FATEFUL_EXPANSION,
        'jupiter_jupiter': aspectScoringProfiles.MUTUAL_EXPANSION,
        'jupiter_sun': aspectScoringProfiles.SOLAR_EXPANSION,
        'jupiter_saturn': aspectScoringProfiles.BALANCED_GROWTH_STRUCTURE,
        'moon_node': aspectScoringProfiles.KARMIC_IDENTITY_PATH_GROWTH,
        'mars_mars': aspectScoringProfiles.TEAMWORK_CHALLENGE_GROWTH,
        'mars_midheaven': aspectScoringProfiles.TEAMWORK_CHALLENGE_GROWTH,
        'mars_node': aspectScoringProfiles.KARMIC_IDENTITY_PATH_GROWTH,
        'midheaven_jupiter': aspectScoringProfiles.GROWTH_EXPANSION,
        'midheaven_sun': aspectScoringProfiles.SOLAR_EXPANSION,
'midheaven_saturn': aspectScoringProfiles.BALANCED_GROWTH_STRUCTURE,
'midheaven_node': aspectScoringProfiles.KARMIC_IDENTITY_PATH_GROWTH,
        'node_sun': aspectScoringProfiles.KARMIC_IDENTITY_PATH_GROWTH,
        'node_venus': aspectScoringProfiles.KARMIC_IDENTITY_PATH_GROWTH,
        'pluto_sun': aspectScoringProfiles.PLUTO_SOLAR_GROWTH,
        'pluto_saturn': aspectScoringProfiles.TRANSFORMATION_GOVERNANCE,
        'sun_uranus': aspectScoringProfiles.INNOVATIVE_AUTHENTICITY
      }      
  };
  

/**
 * Detailed scoring rules for specific planet pairs in different relationship categories.
 * Each object key (like "mars_venus") represents a planet pair, and each aspect type 
 * (conjunction, trine, sextile, square, opposition) is assigned a base point value 
 * before orb adjustments.
 *
 * - Squares typically carry more tension than oppositions. 
 * - In categories where tension can be exciting (e.g., Sex & Intimacy), a square may score higher than an opposition. 
 * - In categories emphasizing harmony (e.g., Commitment, Emotional Security), squares may be more negative.
 * - If a pair does not appear here, the system uses your default fallback scoring.
 */

  

export const planetHouseScores = {
    [RELATIONSHIP_CATEGORIES.OVERALL_ATTRACTION_CHEMISTRY]: {
        relevantHouses: [1, 5, 7], // Houses relevant to this category
        // Positive combinations
        positive: [
            { planet: 'Sun', house: 1, points: 15, reason: "Energizes and recognizes the house person" },
            { planet: 'Sun', house: 5, points: 20, reason: "Creates romantic spark and vitality" },
            { planet: 'Venus', house: 5, points: 20, reason: "Intensifies pleasure and attraction" },
            { planet: 'Venus', house: 7, points: 15, reason: "Amplifies affection and harmony" },
            { planet: 'Mars', house: 5, points: 15, reason: "Adds sexual chemistry and excitement" },
            { planet: 'Jupiter', house: 1, points: 15, reason: "Boosts optimism and confidence" },
            { planet: 'Jupiter', house: 5, points: 15, reason: "Brings joy and creative exploration" },
            { planet: 'Jupiter', house: 7, points: 15, reason: "Supports generosity in partnership" },
            { planet: 'Moon', house: 7, points: 10, reason: "Creates emotional desire to support" },
            { planet: 'Ascendant', house: 1, points: 15, reason: "Strong physical attraction" },
            { planet: 'Ascendant', house: 5, points: 15, reason: "Natural romantic compatibility" },
            { planet: 'Ascendant', house: 7, points: 15, reason: "Natural partnership compatibility" }
        ],
        // Challenging combinations
        negative: [
            { planet: 'Saturn', house: 5, points: -10, reason: "Dampens fun and spontaneity" },
            { planet: 'Saturn', house: 1, points: -5, reason: "Creates self-consciousness" },
            { planet: 'Pluto', house: 7, points: -5, reason: "Can create power struggles" },
            { planet: 'Uranus', house: 7, points: -5, reason: "Introduces restlessness" }
        ]
    },
    
    [RELATIONSHIP_CATEGORIES.EMOTIONAL_SECURITY_CONNECTION]: {
        relevantHouses: [4, 7],
        positive: [
            { planet: 'Moon', house: 4, points: 20, reason: "Creates intuitive, nurturing bond" },
            { planet: 'Moon', house: 7, points: 15, reason: "Deep empathy and emotional support" },
            { planet: 'Venus', house: 4, points: 15, reason: "Brings harmony to home life" },
            { planet: 'Jupiter', house: 4, points: 15, reason: "Expands emotional generosity" },
            { planet: 'Sun', house: 4, points: 10, reason: "Brings warmth to emotional foundation" }
        ],
        negative: [
            { planet: 'Mars', house: 4, points: -10, reason: "Can stir tension in emotional sphere" },
            { planet: 'Pluto', house: 4, points: -10, reason: "May trigger deep emotional wounds" },
            { planet: 'Uranus', house: 4, points: -10, reason: "Destabilizes emotional security" },
            { planet: 'Saturn', house: 4, points: -5, reason: "Can feel emotionally restrictive" }
        ]
    },
    
    [RELATIONSHIP_CATEGORIES.SEX_AND_INTIMACY]: {
        relevantHouses: [5, 8],
        positive: [
            { planet: 'Mars', house: 5, points: 20, reason: "Strong sexual chemistry" },
            { planet: 'Mars', house: 8, points: 20, reason: "Intense passion and desire" },
            { planet: 'Pluto', house: 8, points: 15, reason: "Deep transformation through intimacy" },
            { planet: 'Venus', house: 8, points: 15, reason: "Sensual connection and pleasure" },
            { planet: 'Uranus', house: 5, points: 10, reason: "Exciting, unpredictable attraction" },
            { planet: 'Neptune', house: 8, points: 10, reason: "Spiritual, transcendent connection" }
        ],
        negative: [
            { planet: 'Saturn', house: 5, points: -10, reason: "Inhibits sexual expression" },
            { planet: 'Saturn', house: 8, points: -10, reason: "Creates fear around vulnerability" },
            { planet: 'Neptune', house: 7, points: -5, reason: "Can create confusion about boundaries" }
        ]
    },
    
    [RELATIONSHIP_CATEGORIES.COMMUNICATION_AND_MENTAL_CONNECTION]: {
        relevantHouses: [3, 9],
        positive: [
            { planet: 'Mercury', house: 3, points: 20, reason: "Supports easy, lively conversations" },
            { planet: 'Mercury', house: 9, points: 15, reason: "Sparks philosophical discussions" },
            { planet: 'Jupiter', house: 3, points: 15, reason: "Expands daily communication" },
            { planet: 'Jupiter', house: 9, points: 15, reason: "Broadens intellectual horizons" },
            { planet: 'Uranus', house: 3, points: 10, reason: "Brings innovative thinking" },
            { planet: 'Uranus', house: 9, points: 10, reason: "Inspires unconventional ideas" }
        ],
        negative: [
            { planet: 'Saturn', house: 3, points: -10, reason: "Can restrict communication" },
            { planet: 'Neptune', house: 3, points: -5, reason: "May cause misunderstandings" }
        ]
    },
    
    [RELATIONSHIP_CATEGORIES.COMMITMENT_LONG_TERM_POTENTIAL]: {
        relevantHouses: [2, 7, 10],
        positive: [
            { planet: 'Saturn', house: 7, points: 15, reason: "Brings stability to partnership" },
            { planet: 'Saturn', house: 10, points: 15, reason: "Supports long-term goals" },
            { planet: 'Saturn', house: 2, points: 10, reason: "Promotes financial responsibility" },
            { planet: 'Jupiter', house: 7, points: 15, reason: "Expands partnership potential" },
            { planet: 'Jupiter', house: 10, points: 15, reason: "Supports shared ambitions" },
            { planet: 'Sun', house: 7, points: 10, reason: "Vitalizes the partnership" },
            { planet: 'Venus', house: 7, points: 10, reason: "Brings harmony to partnership" }
        ],
        negative: [
            { planet: 'Uranus', house: 7, points: -15, reason: "Creates instability in commitment" },
            { planet: 'Neptune', house: 7, points: -10, reason: "Can lead to disillusionment" },
            { planet: 'Pluto', house: 7, points: -5, reason: "May create power struggles" }
        ]
    },
    
    [RELATIONSHIP_CATEGORIES.KARMIC_LESSONS_GROWTH]: {
        relevantHouses: [1, 7, 12],
        positive: [
            { planet: 'North Node', house: 1, points: 15, reason: "Supports personal growth" },
            { planet: 'North Node', house: 7, points: 15, reason: "Karmic partnership lessons" },
            { planet: 'South Node', house: 12, points: 15, reason: "Past life connection" },
            { planet: 'Pluto', house: 12, points: 15, reason: "Deep unconscious transformation" },
            { planet: 'Neptune', house: 12, points: 15, reason: "Spiritual connection" },
            { planet: 'Saturn', house: 12, points: 10, reason: "Working through past karma" },
            { planet: 'Chiron', house: 12, points: 10, reason: "Healing past wounds" }
        ],
        negative: [
            { planet: 'South Node', house: 7, points: -5, reason: "Repeating past relationship patterns" },
            { planet: 'Pluto', house: 1, points: -5, reason: "Power struggles over identity" }
        ]
    },

    [RELATIONSHIP_CATEGORIES.PRACTICAL_GROWTH_SHARED_GOALS]: {
        relevantHouses: [1, 5, 7, 10],
        positive: [
            { planet: 'Jupiter', house: 1, points: 15, reason: "Supports shared ambitions" },
            { planet: 'Jupiter', house: 5, points: 15, reason: "Expands partnership potential" },
            { planet: 'Jupiter', house: 7, points: 15, reason: "Expands partnership potential" },
            { planet: 'Jupiter', house: 10, points: 15, reason: "Supports shared ambitions" }
        ],
        negative: [
            { planet: 'Saturn', house: 1, points: -10, reason: "Creates self-consciousness" },
            { planet: 'Saturn', house: 5, points: -10, reason: "Creates self-consciousness" },
            { planet: 'Saturn', house: 7, points: -10, reason: "Creates self-consciousness" },
            { planet: 'Saturn', house: 10, points: -10, reason: "Creates self-consciousness" }
        ]
    }
};



export const compositeAspectScoringRules = {
    // --------------------------------------
    // OVERALL_ATTRACTION_CHEMISTRY
    // --------------------------------------

    [RELATIONSHIP_CATEGORIES.OVERALL_ATTRACTION_CHEMISTRY]: {
        'mars_venus': aspectScoringProfiles.STRONG_POSITIVE_BALANCE,
        'mars_sun': aspectScoringProfiles.STRONG_POSITIVE_BALANCE,
        'moon_sun': aspectScoringProfiles.STRONG_POSITIVE_BALANCE,
        'moon_venus': aspectScoringProfiles.STRONG_POSITIVE_BALANCE,
        'pluto_venus': aspectScoringProfiles.VOLATILE_SEXUAL_SPARK,
        'sun_venus': aspectScoringProfiles.STRONG_POSITIVE_BALANCE,
        'ascendant_mars': aspectScoringProfiles.STRONG_POSITIVE_BALANCE,
        'ascendant_sun': aspectScoringProfiles.STRONG_POSITIVE_BALANCE,
        'ascendant_venus': aspectScoringProfiles.STRONG_POSITIVE_BALANCE,
        'ascendant_node': aspectScoringProfiles.GROWTH_MENTORSHIP_VIBE
      },
      
  
    // --------------------------------------
    // EMOTIONAL_SECURITY_CONNECTION
    // --------------------------------------
    [RELATIONSHIP_CATEGORIES.EMOTIONAL_SECURITY_CONNECTION]: {
        'moon_venus': aspectScoringProfiles.WARM_SOFT_HARMONY,
        'moon_jupiter': aspectScoringProfiles.WARM_SOFT_HARMONY,
        'moon_pluto': aspectScoringProfiles.DEEP_EMOTIONAL_BOND,
        'moon_saturn': aspectScoringProfiles.EMOTIONAL_WEIGHT_WITH_POTENTIAL,
        'chiron_moon': aspectScoringProfiles.DEEP_EMOTIONAL_BOND,
        'chiron_sun': aspectScoringProfiles.KARMIC_HEALING_POLARITY,
      },
      
    // --------------------------------------
    // SEX & INTIMACY
    // --------------------------------------
    [RELATIONSHIP_CATEGORIES.SEX_AND_INTIMACY]: {
        'mars_venus': aspectScoringProfiles.HIGH_SEXUAL_CHARGE,
        'mars_pluto': aspectScoringProfiles.INTENSE_SEXUAL_POWER,
        'venus_pluto': aspectScoringProfiles.INTENSE_SEXUAL_POWER,
        'mars_uranus': aspectScoringProfiles.UNPREDICTABLE_ELECTRIC_SEXUAL,
        'pluto_sun': aspectScoringProfiles.SEXUAL_INTENSITY_CONSCIOUSNESS
      },
      
  
    // --------------------------------------
    // COMMUNICATION & MENTAL CONNECTION
    // --------------------------------------
    [RELATIONSHIP_CATEGORIES.COMMUNICATION_AND_MENTAL_CONNECTION]: {
      'mercury_sun': { conjunction: 15, trine: 10, sextile: 8, square: -5, opposition: -3 },
      'mercury_moon': { conjunction: 15, trine: 15, sextile: 10, square: -10, opposition: -5 },
      'mercury_venus': { conjunction: 15, trine: 10, sextile: 8, square: -5, opposition: -3 },
      'mercury_mars': { conjunction: 15, trine: 10, sextile: 8, square: -5, opposition: -3 },
      'mercury_jupiter': { conjunction: 15, trine: 10, sextile: 8, square: -5, opposition: -3 },
      'mercury_saturn': { conjunction: 10, trine: 5, sextile: 5, square: -10, opposition: -8 }
    },
  
    // --------------------------------------
    // COMMITMENT & LONG-TERM POTENTIAL
    // --------------------------------------
    [RELATIONSHIP_CATEGORIES.COMMUNICATION_AND_MENTAL_CONNECTION]: {
        'mercury_sun': aspectScoringProfiles.SELF_EXPRESSIVE_MENTAL,
        'mercury_moon': aspectScoringProfiles.MENTAL_EMOTIONAL_EXCHANGE,
        'mercury_venus': aspectScoringProfiles.MENTAL_AFFECTION,
        'mercury_mars': aspectScoringProfiles.MENTAL_ASSERTIVENESS,
        'mercury_jupiter': aspectScoringProfiles.EXPANSIVE_MIND_GROWTH,
        'mercury_saturn': aspectScoringProfiles.SERIOUS_MIND_BLOCKS,
        'mercury_uranus': aspectScoringProfiles.UNCONVENTIONAL_IDEAS,
        'mercury_node': aspectScoringProfiles.MENTAL_PATH_ALIGNMENT,
        'mercury_pluto': aspectScoringProfiles.DEEP_TRANSFORMATIVE_THOUGHT,
        'mercury_neptune': aspectScoringProfiles.DREAMY_OR_CONFUSING,
      },

        // --------------------------------------
      // COMMITMENT & LONG-TERM POTENTIAL
      // --------------------------------------
      [RELATIONSHIP_CATEGORIES.COMMITMENT_LONG_TERM_POTENTIAL]: {
        'saturn_venus': aspectScoringProfiles.STRUCTURED_LOVE_KARMA,
        'saturn_moon': aspectScoringProfiles.HEAVY_EMOTIONAL_SECURITY,
        'sun_moon': aspectScoringProfiles.EMOTIONAL_VITAL_HARMONY,
        'mars_venus': aspectScoringProfiles.STABLE_PASSIONATE_BOND,
        'jupiter_saturn': aspectScoringProfiles.GROWTH_BALANCES_REALITY,
        'saturn_sun': aspectScoringProfiles.RELIABLE_IDENTITY_ANCHOR,

      },
      
      // --------------------------------------
      // KARMIC LESSONS & GROWTH
      // --------------------------------------
      [RELATIONSHIP_CATEGORIES.KARMIC_LESSONS_GROWTH]: {
        'node_sun': aspectScoringProfiles.KARMIC_IDENTITY_PATH,
        'node_moon': aspectScoringProfiles.KARMIC_EMOTIONAL_PATH,
        'node_venus': aspectScoringProfiles.KARMIC_LOVE_PATH,
        'node_mars': aspectScoringProfiles.KARMIC_DRIVE_PATH,
        'pluto_sun': aspectScoringProfiles.TRANSFORMATIVE_IDENTITY,
        'pluto_moon': aspectScoringProfiles.EMOTIONAL_REBIRTH,
        'pluto_venus': aspectScoringProfiles.FATED_SHADOW_WORK,
        'pluto_node': aspectScoringProfiles.FATED_SHADOW_WORK,
        'chiron_sun': aspectScoringProfiles.IDENTITY_HEALING,
        'chiron_moon': aspectScoringProfiles.DEEP_EMOTIONAL_WOUNDS,
        'chiron_venus': aspectScoringProfiles.KARMIC_IDENTITY_PATH,
        'saturn_pluto': aspectScoringProfiles.DEEP_KARMIC_STRUCTURE
      },
      
  
    // --------------------------------------
    // GROWTH & SHARED GOALS
    // --------------------------------------
    [RELATIONSHIP_CATEGORIES.PRACTICAL_GROWTH_SHARED_GOALS]: {
        'chiron_sun': aspectScoringProfiles.IDENTITY_HEALING,
        'chiron_moon': aspectScoringProfiles.DEEP_EMOTIONAL_WOUNDS,
        'node_sun': aspectScoringProfiles.KARMIC_IDENTITY_PATH,
        'node_moon': aspectScoringProfiles.KARMIC_EMOTIONAL_PATH,
        'node_venus': aspectScoringProfiles.KARMIC_LOVE_PATH,
        'node_mars': aspectScoringProfiles.KARMIC_DRIVE_PATH,
        'jupiter_sun': aspectScoringProfiles.PURPOSEFUL_ENCOURAGEMENT,
        'jupiter_venus': aspectScoringProfiles.LUCKY_ROMANTIC_STABILITY,
        'jupiter_saturn': aspectScoringProfiles.GROWTH_BALANCES_REALITY,
        'saturn_jupiter': aspectScoringProfiles.GROWTH_BALANCES_REALITY,
        'uranus_sun': aspectScoringProfiles.INNOVATIVE_AUTHENTICITY,
        'pluto_sun': aspectScoringProfiles.TRANSFORMATIVE_IDENTITY,
        'saturn_pluto': aspectScoringProfiles.DEEP_KARMIC_STRUCTURE,
      }
};
  











// FULL LIST
// (ascendant, ascendant)
// (ascendant, chiron)
// (ascendant, jupiter)
// (ascendant, mars)
// (ascendant, mercury)
// (ascendant, neptune)
// (ascendant, node)
// (ascendant, pluto)
// (ascendant, saturn)
// (ascendant, uranus)
// (ascendant, venus)

// (chiron, chiron)
// (chiron, jupiter)
// (chiron, mars)
// (chiron, mercury)
// (chiron, neptune)
// (chiron, node)
// (chiron, pluto)
// (chiron, saturn)
// (chiron, uranus)
// (chiron, venus)

// (jupiter, jupiter)
// (jupiter, mars)
// (jupiter, mercury)
// (jupiter, neptune)
// (jupiter, node)
// (jupiter, pluto)
// (jupiter, saturn)
// (jupiter, uranus)
// (jupiter, venus)

// (mars, mars)
// (mars, mercury)
// (mars, neptune)
// (mars, node)
// (mars, pluto)
// (mars, saturn)
// (mars, uranus)
// (mars, venus)

// (mercury, mercury)
// (mercury, neptune)
// (mercury, node)
// (mercury, pluto)
// (mercury, saturn)
// (mercury, uranus)
// (mercury, venus)

// (neptune, neptune)
// (neptune, node)
// (neptune, pluto)
// (neptune, saturn)
// (neptune, uranus)
// (neptune, venus)

// (node, node)
// (node, pluto)
// (node, saturn)
// (node, uranus)
// (node, venus)

// (pluto, pluto)
// (pluto, saturn)
// (pluto, uranus)
// (pluto, venus)

// (saturn, saturn)
// (saturn, uranus)
// (saturn, venus)

// (uranus, uranus)
// (uranus, venus)

// (venus, venus)


// MISSING LIST

// (ascendant, chiron)

// (ascendant, jupiter)

// (ascendant, mercury)

// (ascendant, neptune)

// (ascendant, node)

// (ascendant, pluto)

// (ascendant, saturn)

// (ascendant, uranus)

// (chiron, chiron)

// (chiron, jupiter)

// (chiron, mars)

// (chiron, mercury)

// (chiron, neptune)

// (chiron, node)

// (chiron, pluto)

// (chiron, saturn)

// (chiron, uranus)

// (chiron, venus)

// (jupiter, mars)

// (jupiter, neptune)

// (jupiter, node)

// (jupiter, pluto)

// (jupiter, uranus)

// (mars, neptune)

// (mars, saturn)

// (mercury, neptune)

// (mercury, node)

// (mercury, pluto)

// (mercury, uranus)

// (neptune, neptune)

// (neptune, node)

// (neptune, pluto)

// (neptune, saturn)

// (neptune, uranus)

// (neptune, venus)

// (node, pluto)

// (node, saturn)

// (node, uranus)

// (pluto, pluto)

// (pluto, uranus)

// (saturn, uranus)

// (uranus, uranus)

// (uranus, venus)