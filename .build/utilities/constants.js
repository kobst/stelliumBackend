// @ts-nocheck
export const relevantPromptAspects = {
    "shortOverall": {
        "planets": ["Sun", "Moon", "Ascendant"],
        "houses": []
    },
    "shortRomantic": {
        "planets": ["Sun", "Moon", "Ascendant", "Venus", "Mars"],
        "houses": [1, 5, 7]
    },
    "personality": {
        "planets": ["Sun", "Moon", "Ascendant"],
        "houses": [1]
    },
    "relationships": {
        "planets": [
            "Venus",
            "Mars",
        ],
        "houses": [1, 5, 7, 11]
    },
    "career": {
        "planets": ["Saturn", "Jupiter", "Midheaven", "Part of Fortune"],
        "houses": [2, 6, 10]
    },
    "home": {
        "planets": ["Saturn"],
        "houses": [4]
    },
    "unconscious": {
        "planets": ["Pluto", "Neptune", "Node", "Chiron"],
        "houses": [8, 12]
    },
    "communication": {
        "planets": ["Mercury", "Jupiter"],
        "houses": [3, 9]
    },
    "everything": {
        "planets": [
            "Sun", "Moon", "Ascendant", "Mercury", "Venus", "Mars", "Saturn",
            "Jupiter", "Uranus", "Neptune", "Pluto", "Part of Fortune", "Node",
            "South Node"
        ],
        "houses": [1, 4, 7, 10]
    }
};
export const BroadTopicsEnum = {
    PERSONALITY_IDENTITY: {
        label: "Self-Expression and Identity",
        subtopics: {
            PERSONAL_IDENTITY: "Personal_Identity_and_Self-Image",
            OUTWARD_EXPRESSION: "Outward_Expression_and_Appearance",
            INNER_EMOTIONAL_SELF: "Inner_Self_and_Emotional_Dynamics",
            CHALLENGES_SELF_EXPRESSION: "Challenges_and_Growth_of_Self-Expression",
            // PATH_INTEGRATION: "Path_of_Integration_of_Self",
        }
    },
    EMOTIONAL_FOUNDATIONS_HOME: {
        label: "Emotional Foundations and Home Life",
        subtopics: {
            EMOTIONAL_FOUNDATIONS: "Emotional_Foundations_and_Security_Needs",
            FAMILY_DYNAMICS: "Family_Dynamics_and_Past_Influences",
            HOME_ENVIRONMENT: "Home_Environment_and_Preferences",
            FAMILY_CHALLENGES: "Challenges_and_Growth_in_Family_Life",
        }
    },
    RELATIONSHIPS_SOCIAL: {
        label: "Relationships and Social Connections",
        subtopics: {
            RELATIONSHIP_DESIRES: "Core_Relationship_Desires_and_Boundaries",
            LOVE_STYLE: "Love_Style_and_Expression",
            SEXUAL_NATURE: "Sexual_Nature_and_Intimacy",
            COMMITMENT_APPROACH: "Commitment_Approach_and_Long-Term_Vision",
            RELATIONSHIP_CHALLENGES: "Challenges_and_Growth_in_Relationships",
            // ROMANTIC_SUMMARY: "Romantic_Summary_and_Synthesis",
        }
    },
    CAREER_PURPOSE_PUBLIC_IMAGE: {
        label: "Career, Purpose, and Public Image",
        subtopics: {
            CAREER_MOTIVATIONS: "Career_Motivations_and_Aspirations",
            PUBLIC_IMAGE: "Public_Image,_Reputation,_and_Leadership_Style",
            CAREER_CHALLENGES: "Career_Challenges_and_Opportunities",
            SKILLS_TALENTS: "Skills,_Talents,_and_Strengths",
            // CAREER_SUMMARY: "Summary_of_Career_Path_and_Success",
        }
    },
    UNCONSCIOUS_SPIRITUALITY: {
        label: "Unconscious Drives and Spiritual Growth",
        subtopics: {
            PSYCHOLOGICAL_PATTERNS: "Deep_Psychological_Patterns_and_Shadow_Self",
            SPIRITUAL_GROWTH: "Spiritual_Growth_and_Higher_Purpose",
            KARMIC_LESSONS: "Karmic_Lessons_and_Past_Life_Themes",
            TRANSFORMATIVE_EVENTS: "Transformative_Events_and_Rebirths",
        }
    },
    COMMUNICATION_BELIEFS: {
        label: "Communication, Learning, and Belief Systems",
        subtopics: {
            COMMUNICATION_STYLES: "Communication_and_Learning_Styles",
            PHILOSOPHICAL_BELIEFS: "Philosophical_Beliefs_and_Personal_Worldview",
            TRAVEL_EXPERIENCES: "Travel_and_Cross-Cultural_Experiences",
            MENTAL_GROWTH_CHALLENGES: "Challenges_to_Mental_Growth_and_Adaptability",
        }
    },
};
export const relevantPromptAspectsV2 = {
    [BroadTopicsEnum.PERSONALITY_IDENTITY.label]: {
        planets: ["Sun", "Ascendant", "Moon", "ChartRuler", "Mars"],
        houses: [1]
    },
    [BroadTopicsEnum.EMOTIONAL_FOUNDATIONS_HOME.label]: {
        planets: ["Moon", "Saturn", "ICRuler", "Venus"],
        houses: [4]
    },
    [BroadTopicsEnum.RELATIONSHIPS_SOCIAL.label]: {
        planets: ["Venus", "Mars", "Moon", "DescendantRuler"],
        houses: [5, 7, 11]
    },
    [BroadTopicsEnum.CAREER_PURPOSE_PUBLIC_IMAGE.label]: {
        planets: ["Saturn", "Midheaven", "Jupiter"],
        houses: [2, 6, 10]
    },
    [BroadTopicsEnum.UNCONSCIOUS_SPIRITUALITY.label]: {
        planets: ["Pluto", "Neptune", "Chiron", "Node"],
        houses: [8, 12]
    },
    [BroadTopicsEnum.COMMUNICATION_BELIEFS.label]: {
        planets: ["Mercury", "Jupiter", "Uranus"],
        houses: [3, 9]
    }
};
export const subTopicSearchPrompts = {
    // Personality & Identity
    'Personal_Identity_and_Self-Image': "The formation of personal identity, self-image, sense of individuality, and the inner essence that drives self-expression.",
    'Outward_Expression_and_Appearance': "How one's image and energy are projected to others, appearance, and first impressions.",
    'Inner_Self_and_Emotional_Dynamics': "Emotional dynamics, unconscious emotional habits, how emotions are processed internally, and vulnerabilities in emotional identity.",
    'Challenges_and_Growth_of_Self-Expression': "Struggles with self-confidence, personal authenticity, identity crises, or challenges in expressing oneself authentically.",
    // 'Path_of_Integration_of_Self': "Synthesizing different aspects of self into a cohesive path, personal growth journeys, and the evolution of authentic self-expression.",
    // Emotional Foundations & Home
    'Emotional_Foundations_and_Security_Needs': "Emotional security needs, nurturing tendencies, emotional grounding, and how comfort and safety are established.",
    'Family_Dynamics_and_Past_Influences': "Family upbringing, parental influences, ancestral patterns, and early emotional conditioning from the home.",
    'Home_Environment_and_Preferences': "The emotional atmosphere of the home, preferred living conditions, and how personal spaces reflect inner emotional needs.",
    'Challenges_and_Growth_in_Family_Life': "Emotional wounds from family, family conflict, challenges from upbringing, and healing past familial patterns.",
    // 'Synthesizing_a_Harmonious_Physical_and_Emotional_Home': "Creating a harmonious home environment, balancing physical comfort with emotional security, and cultivating a nurturing space.",
    // Relationships & Social
    'Core_Relationship_Desires_and_Boundaries': "Core relationship desires, boundaries in relationships, romantic needs, and how one seeks connection and partnership.",
    'Love_Style_and_Expression': "How love is given and received, styles of affection, romance, attraction, and emotional openness in intimate bonds.",
    'Sexual_Nature_and_Intimacy': "Sexual preferences, intimacy needs, sensual expression, and emotional depth through physical connection.",
    'Commitment_Approach_and_Long-Term_Vision': "Text about views toward long-term commitment, partnership building, trust over time, and visions of loyalty and marriage.",
    'Challenges_and_Growth_in_Relationships': "Difficulties in relationships, emotional blockages in intimacy, recurring partnership patterns, and lessons in love.",
    // 'Romantic_Summary_and_Synthesis': "Major romantic themes, combining relationship patterns, desires, intimacy styles, and partnership growth potential.",
    // Career, Purpose, and Public Image
    'Career_Motivations_and_Aspirations': "Career aspirations, internal drives for success, vocational interests, and motivating ambitions in professional life.",
    'Public_Image_Reputation_and_Leadership_Style': "Reputation, public perception, leadership abilities, professional image, and how one is seen by the larger world.",
    'Career_Challenges_and_Opportunities': "Professional obstacles, setbacks in career paths, difficulties achieving success, and lessons learned through work experience.",
    'Skills_Talents_and_Strengths': "Natural skills, talents, strengths, innate abilities, and resources that support vocational or professional achievement.",
    // 'Career_Summary_and_Evolution': "Synthesizes career potential, vocational ambitions, reputation development, and the evolution of professional purpose.",
    // Unconscious Drives and Spiritual Growth
    'Deep_Psychological_Patterns_and_Shadow_Self': "Text about hidden psychological dynamics, subconscious drives, deep-seated habits, emotional complexes, and inner fears.",
    'Spiritual_Growth_and_Higher_Purpose': "Text about spiritual evolution, inner awakening, mystical tendencies, personal connection to higher purposes, and transcendent experiences.",
    'Karmic_Lessons_and_Past_Life_Themes': "Text about karmic themes, unresolved lessons from past lives, life contracts, soul growth paths, and karmic balancing.",
    'Transformative_Events_and_Rebirths': "Text about major life transformations, rebirth cycles, profound changes in identity, and phoenix-like reinventions of self.",
    // Communication, Learning, and Beliefs
    'Communication_and_Learning_Styles': "How communication is expressed and received, learning styles, intellectual habits, and ways of exchanging ideas.",
    'Philosophical_Beliefs_and_Personal_Worldview': "Belief systems, philosophy of life, personal worldviews, quest for truth, and how meaning is constructed.",
    'Travel_and_Cross-Cultural_Experiences': "Cross-cultural experiences, traveling for growth, expanding horizons through new cultures, and personal exploration through movement.",
    'Challenges_to_Mental_Growth_and_Adaptability': "Intellectual blockages, difficulties expanding mental frameworks, struggles with adaptability, and learning from challenges."
};
export const topicSummaryPrompts = {
    'Path_of_Integration_of_Self': "Synthesizing different aspects of self into a cohesive path, personal growth journeys, and the evolution of authentic self-expression.",
    'Synthesizing_a_Harmonious_Physical_and_Emotional_Home': "Creating a harmonious home environment, balancing physical comfort with emotional security, and cultivating a nurturing space.",
    'Romantic_Summary_and_Synthesis': "Major romantic themes, combining relationship patterns, desires, intimacy styles, and partnership growth potential.",
    'Career_Summary_and_Evolution': "Synthesizes career potential, vocational ambitions, reputation development, and the evolution of professional purpose.",
    'Spiritual_Growth_and_Higher_Purpose': "Spiritual evolution, inner awakening, mystical tendencies, personal connection to higher purposes, and transcendent experiences.",
};
export const relationshipCategoryPrompts = {
    'Relationship_Summary_and_Synthesis': "Major relationship themes, combining relationship patterns, desires, intimacy styles, and partnership growth potential.",
};
export const signEnum = {
    ARIES: 'Aries',
    TAURUS: 'Taurus',
    GEMINI: 'Gemini',
    CANCER: 'Cancer',
    LEO: 'Leo',
    VIRGO: 'Virgo',
    LIBRA: 'Libra',
    SCORPIO: 'Scorpio',
    SAGITTARIUS: 'Sagittarius',
    CAPRICORN: 'Capricorn',
    AQUARIUS: 'Aquarius',
    PISCES: 'Pisces'
};
export const signs = [
    signEnum.ARIES, signEnum.TAURUS, signEnum.GEMINI, signEnum.CANCER, signEnum.LEO, signEnum.VIRGO, signEnum.LIBRA, signEnum.SCORPIO,
    signEnum.SAGITTARIUS, signEnum.CAPRICORN, signEnum.AQUARIUS, signEnum.PISCES
];
export const planetEnum = {
    SUN: "Sun",
    MOON: "Moon",
    ASCENDANT: "Ascendant",
    MERCURY: "Mercury",
    VENUS: "Venus",
    MARS: "Mars",
    SATURN: "Saturn",
    JUPITER: "Jupiter",
    URANUS: "Uranus",
    NEPTUNE: "Neptune",
    PLUTO: "Pluto"
};
export const rulers = {
    [signEnum.ARIES]: "Mars",
    [signEnum.TAURUS]: "Venus",
    [signEnum.GEMINI]: "Mercury",
    [signEnum.CANCER]: "Moon",
    [signEnum.LEO]: "Sun",
    [signEnum.VIRGO]: "Mercury",
    [signEnum.LIBRA]: "Venus",
    [signEnum.SCORPIO]: "Mars",
    [signEnum.SAGITTARIUS]: "Jupiter",
    [signEnum.CAPRICORN]: "Saturn",
    [signEnum.AQUARIUS]: "Uranus",
    [signEnum.PISCES]: "Neptune"
};
export const dominanceTopics = ['Quadrants', 'Elements', 'Modalities', 'Pattern'];
export const planets = [
    planetEnum.SUN,
    planetEnum.MOON,
    planetEnum.ASCENDANT,
    planetEnum.MERCURY,
    planetEnum.VENUS,
    planetEnum.MARS,
    planetEnum.SATURN,
    planetEnum.JUPITER,
    planetEnum.URANUS,
    planetEnum.NEPTUNE,
    planetEnum.PLUTO
];
export const pointEnum = {
    NODE: "Node",
    MIDHEAVEN: "Midheaven",
    CHIRON: "Chiron",
    PART_OF_FORTUNE: "Part of Fortune",
    SOUTH_NODE: "South Node",
    ASCENDANT: "Ascendant",
    VERTEX: "Vertex",
    TRUE_NODE: "true Node"
};
export const transitTopics = ['Progressed', 'Transits'];
export const elements = {
    'Fire': [signEnum.LEO, signEnum.ARIES, signEnum.SAGITTARIUS],
    'Earth': [signEnum.TAURUS, signEnum.VIRGO, signEnum.CAPRICORN],
    'Air': [signEnum.GEMINI, signEnum.LIBRA, signEnum.AQUARIUS],
    'Water': [signEnum.CANCER, signEnum.SCORPIO, signEnum.PISCES]
};
export const elementPoints = {
    [planetEnum.SUN]: 3,
    [planetEnum.MOON]: 3,
    [planetEnum.ASCENDANT]: 3,
    [planetEnum.MERCURY]: 2,
    [planetEnum.VENUS]: 2,
    [planetEnum.MARS]: 2,
    [planetEnum.SATURN]: 2,
    [planetEnum.JUPITER]: 2,
    [planetEnum.URANUS]: 1,
    [planetEnum.NEPTUNE]: 1,
    [planetEnum.PLUTO]: 1,
    [planetEnum.NODE]: 1,
    [planetEnum.MIDHEAVEN]: 1
};
export const quadrants = {
    'SouthEast': [10, 11, 12],
    "NorthEast": [1, 2, 3],
    "NorthWest": [4, 5, 6],
    "SouthWest": [7, 8, 9]
};
export const modalities = {
    'Cardinal': [signEnum.ARIES, signEnum.CANCER, signEnum.LIBRA, signEnum.CAPRICORN],
    'Fixed': [signEnum.TAURUS, signEnum.LEO, signEnum.SCORPIO, signEnum.AQUARIUS],
    'Mutable': [signEnum.GEMINI, signEnum.VIRGO, signEnum.SAGITTARIUS, signEnum.PISCES]
};
export const ignorePlanets = [
    pointEnum.ASCENDANT, pointEnum.MIDHEAVEN, pointEnum.CHIRON, pointEnum.PART_OF_FORTUNE, pointEnum.SOUTH_NODE, pointEnum.NODE, pointEnum.TRUE_NODE
];
export const ignorePoints = [pointEnum.CHIRON, pointEnum.PART_OF_FORTUNE, pointEnum.SOUTH_NODE, pointEnum.NODE, pointEnum.TRUE_NODE];
export const ignorePointsForDominance = [pointEnum.CHIRON, pointEnum.PART_OF_FORTUNE, pointEnum.SOUTH_NODE, pointEnum.NODE];
export const ignorePointsForModalities = [pointEnum.CHIRON, pointEnum.PART_OF_FORTUNE, pointEnum.SOUTH_NODE, pointEnum.NODE, pointEnum.ASCENDANT, pointEnum.MIDHEAVEN];
export const ignorePointsForElements = [pointEnum.CHIRON, pointEnum.PART_OF_FORTUNE, pointEnum.SOUTH_NODE, pointEnum.NODE, pointEnum.MIDHEAVEN, pointEnum.TRUE_NODE];
export const retroCodes = {
    "retrograde": "r",
    "": "p"
};
export const planetCodes = {
    [planetEnum.SUN]: "Su",
    [planetEnum.MOON]: "Mo",
    [planetEnum.MERCURY]: "Me",
    [planetEnum.VENUS]: "Ve",
    [planetEnum.MARS]: "Ma",
    [planetEnum.JUPITER]: "Ju",
    [planetEnum.SATURN]: "Sa",
    [planetEnum.URANUS]: "Ur",
    [planetEnum.NEPTUNE]: "Ne",
    [planetEnum.PLUTO]: "Pl",
    [planetEnum.ASCENDANT]: "As",
    [planetEnum.MIDHEAVEN]: "Mi",
    [pointEnum.NODE]: "No",
    [pointEnum.SOUTH_NODE]: "So",
    [pointEnum.CHIRON]: "Ch",
    [pointEnum.PART_OF_FORTUNE]: "Pa",
};
export const signCodes = {
    [signEnum.ARIES]: "sAr",
    [signEnum.TAURUS]: "sTa",
    [signEnum.GEMINI]: "sGe",
    [signEnum.CANCER]: "sCa",
    [signEnum.LEO]: "sLe",
    [signEnum.VIRGO]: "sVi",
    [signEnum.LIBRA]: "sLi",
    [signEnum.SCORPIO]: "sSc",
    [signEnum.SAGITTARIUS]: "sSa",
    [signEnum.CAPRICORN]: "sCp",
    [signEnum.AQUARIUS]: "sAq",
    [signEnum.PISCES]: "sPi"
};
export const transitCodes = {
    "conjunction": "aCo",
    "sextile": "aSe",
    "square": "aSq",
    "trine": "aTr",
    "opposition": "aOp",
    "quincunx": "aQu"
};
export const orbCodes = {
    "loose": "L",
    "close": "C",
    "exact": "E",
    "": "G",
};
export const chart = {
    "natal": "Na-",
    "progressed": "Pg-",
    "transiting": "Tr-"
};
export const sortOrder = {
    [planetEnum.MOON]: 1,
    [planetEnum.MERCURY]: 2,
    [planetEnum.VENUS]: 3,
    [planetEnum.SUN]: 4,
    [planetEnum.MARS]: 5,
    [planetEnum.JUPITER]: 6,
    [planetEnum.SATURN]: 7,
    [planetEnum.URANUS]: 8,
    [planetEnum.NEPTUNE]: 9,
    [planetEnum.PLUTO]: 10,
    [pointEnum.ASCENDANT]: 11,
    [pointEnum.MIDHEAVEN]: 12,
    [pointEnum.NODE]: 13,
};
export const orbDegreesTransit = {
    [planetEnum.MOON]: 8,
    [planetEnum.MERCURY]: 5,
    [planetEnum.VENUS]: 5,
    [planetEnum.SUN]: 5,
    [planetEnum.MARS]: 3,
    [planetEnum.JUPITER]: 3,
    [planetEnum.SATURN]: 3,
    [planetEnum.URANUS]: 3,
    [planetEnum.NEPTUNE]: 3,
    [planetEnum.PLUTO]: 3
};
export const orbDegreesNatal = {
    [planetEnum.MOON]: 7,
    [planetEnum.MERCURY]: 7,
    [planetEnum.VENUS]: 7,
    [planetEnum.SUN]: 7,
    [planetEnum.MARS]: 5,
    [planetEnum.JUPITER]: 5,
    [planetEnum.SATURN]: 5,
    [planetEnum.URANUS]: 5,
    [planetEnum.NEPTUNE]: 5,
    [planetEnum.PLUTO]: 5
};
export const signRulers = {
    [signEnum.ARIES]: "Mars",
    [signEnum.TAURUS]: "Venus",
    [signEnum.GEMINI]: "Mercury",
    [signEnum.CANCER]: "Moon",
    [signEnum.LEO]: "Sun",
    [signEnum.VIRGO]: "Mercury",
    [signEnum.LIBRA]: "Venus",
    [signEnum.SCORPIO]: "Mars",
    [signEnum.SAGITTARIUS]: "Jupiter",
    [signEnum.CAPRICORN]: "Saturn",
    [signEnum.AQUARIUS]: "Uranus",
    [signEnum.PISCES]: "Neptune"
};
export const HeadingEnum = {
    // Personality
    PERSONAL_IDENTITY: "Personal_Identity_and_Self-Image",
    OUTWARD_EXPRESSION: "Outward_Expression_and_Appearance",
    INNER_SELF: "Inner_Self_and_Emotional_Dynamics",
    CHALLENGES_TENSION: "Challenges_and_Tension_of_Self_Expression",
    PATH_INTEGRATION: "Path_of_Integration_Self_Expression",
    // Home
    EMOTIONAL_FOUNDATIONS: "Emotional_Foundations_and_Security_Needs",
    FAMILY_DYNAMICS: "Family_Dynamics_and_Past_Influences",
    HOME_ENVIRONMENT: "Home_Environment_and_Preferences",
    FAMILY_CHALLENGES: "Challenges_and_Growth_in_Home_Or_Family_Life",
    HARMONIOUS_HOME: "Synthesizing_a_Harmonious_Physical_and_Emotional_Home",
    // Relationships
    RELATIONSHIP_DESIRES: "Core_Relationship_Desires_and_Boundaries",
    LOVE_STYLE: "Love_Style:_Expression_and_Attraction",
    SEXUAL_NATURE: "Sexual_Nature_and_Intimacy",
    COMMITMENT_APPROACH: "Commitment_Approach_and_Long-term_Vision",
    RELATIONSHIP_CHALLENGES: "Challenges_and_Growth_in_Relationships",
    ROMANTIC_SUMMARY: "Romantic_Summary",
    // Social Life
    SOCIAL_NETWORKS: "Social_Networks_and_Community",
    // Career
    CAREER_MOTIVATIONS: "Career_Motivations_and_Ambitions",
    PUBLIC_IMAGE: "Public_Image,_Reputation,_and_Leadership_Style",
    CAREER_CHALLENGES: "Challenges_and_Growth_Opportunities_in_Profession",
    SKILLS_TALENTS: "Skills,_Talents,_and_Strengths",
    CAREER_SUMMARY: "Summary_and_Path_To_Success",
    // Unconscious
    PSYCHOLOGICAL_PATTERNS: "Deep_Psychological_Patterns",
    SPIRITUAL_GROWTH: "Spiritual_Growth_and_Hidden_Strengths",
    KARMIC_LESSONS: "Karmic_Lessons_and_Past_Life_Influences",
    TRANSFORMATIVE_EVENTS: "Transformative_Events_and_Personal_Metamorphosis",
    // Communication
    COMMUNICATION_STYLES: "Communication_and_Learning_Styles",
    PHILOSOPHICAL_BELIEFS: "Philosophical_Beliefs_and_Higher_Learning",
    TRAVEL_EXPERIENCES: "Travel_and_Cross-Cultural_Experiences",
    // Dominance
    QUADRANTS: "Quadrants",
    ELEMENTS: "Elements",
    MODALITIES: "Modalities",
    PATTERN: "Pattern",
    // Planets
    SUN: "Sun",
    MOON: "Moon",
    ASCENDANT: "Ascendant",
    MERCURY: "Mercury",
    VENUS: "Venus",
    MARS: "Mars",
    SATURN: "Saturn",
    JUPITER: "Jupiter",
    URANUS: "Uranus",
    NEPTUNE: "Neptune",
    PLUTO: "Pluto",
    // Composite Chart
};
const personality_headings = [
    HeadingEnum.PERSONAL_IDENTITY,
    HeadingEnum.OUTWARD_EXPRESSION,
    HeadingEnum.INNER_SELF,
    HeadingEnum.CHALLENGES_TENSION,
    HeadingEnum.PATH_INTEGRATION
];
const home_headings = [
    HeadingEnum.EMOTIONAL_FOUNDATIONS,
    HeadingEnum.FAMILY_DYNAMICS,
    HeadingEnum.HOME_ENVIRONMENT,
    HeadingEnum.FAMILY_CHALLENGES,
    HeadingEnum.HARMONIOUS_HOME
];
const relationship_headings = [
    HeadingEnum.RELATIONSHIP_DESIRES,
    HeadingEnum.LOVE_STYLE,
    HeadingEnum.SEXUAL_NATURE,
    HeadingEnum.COMMITMENT_APPROACH,
    HeadingEnum.RELATIONSHIP_CHALLENGES,
    HeadingEnum.ROMANTIC_SUMMARY,
    HeadingEnum.SOCIAL_NETWORKS
];
const career_headings = [
    HeadingEnum.CAREER_MOTIVATIONS,
    HeadingEnum.PUBLIC_IMAGE,
    HeadingEnum.CAREER_CHALLENGES,
    HeadingEnum.SKILLS_TALENTS,
    HeadingEnum.CAREER_SUMMARY
];
const unconscious_headings = [
    HeadingEnum.PSYCHOLOGICAL_PATTERNS,
    HeadingEnum.SPIRITUAL_GROWTH,
    HeadingEnum.KARMIC_LESSONS,
    HeadingEnum.TRANSFORMATIVE_EVENTS
];
const communication_headings = [
    HeadingEnum.COMMUNICATION_STYLES,
    HeadingEnum.PHILOSOPHICAL_BELIEFS,
    HeadingEnum.TRAVEL_EXPERIENCES
];
export const dominance_headings = [
    HeadingEnum.QUADRANTS,
    HeadingEnum.ELEMENTS,
    HeadingEnum.MODALITIES,
    HeadingEnum.PATTERN
];
export const planet_headings = [
    HeadingEnum.SUN,
    HeadingEnum.MOON,
    HeadingEnum.ASCENDANT,
    HeadingEnum.MERCURY,
    HeadingEnum.VENUS,
    HeadingEnum.MARS,
    HeadingEnum.SATURN,
    HeadingEnum.JUPITER,
    HeadingEnum.URANUS,
    HeadingEnum.NEPTUNE,
    HeadingEnum.PLUTO
];
export const CATEGORY_WEIGHTS = {
    /* ───────────────────────────── Personality ───────────────────────────── */
    [HeadingEnum.PERSONAL_IDENTITY]: {
        planets: { Sun: 5, Ascendant: 5, Moon: 3 },
        houses: { 1: 4, 10: 2 },
        aspects: { 'Sun-Ascendant': 4, 'Sun-Moon': 3, 'Sun-Midheaven': 3 }
    },
    [HeadingEnum.OUTWARD_EXPRESSION]: {
        planets: { Ascendant: 5, Sun: 4, Mars: 3, Mercury: 2 },
        houses: { 1: 5, 11: 2 },
        aspects: { 'Ascendant-planet': 3, 'Mars-Ascendant': 2 }
    },
    [HeadingEnum.INNER_SELF]: {
        planets: { Moon: 5, Neptune: 3, Pluto: 2 },
        houses: { 4: 4, 8: 2, 12: 2 },
        aspects: { 'Moon-Neptune': 3, 'Moon-Pluto': 3, 'Moon-Saturn': 2 }
    },
    [HeadingEnum.CHALLENGES_TENSION]: {
        planets: { Saturn: 4, Pluto: 4, Mars: 3, Uranus: 3 },
        houses: { 12: 3, 8: 2 },
        aspects: { 'Saturn-Sun': 4, 'Mars-Saturn': 3, 'Sun-Pluto': 3, 'Uranus-Moon': 2 }
    },
    [HeadingEnum.PATH_INTEGRATION]: {
        planets: { trueNode: 5, Jupiter: 3, Saturn: 2, Chiron: 2 },
        houses: { 9: 3, 12: 2 },
        aspects: { 'Sun-trueNode': 4, 'Moon-trueNode': 3, 'Chiron-Sun': 2 }
    },
    /* ───────────────────────────── Home & Family ─────────────────────────── */
    [HeadingEnum.EMOTIONAL_FOUNDATIONS]: {
        planets: { Moon: 5, Venus: 2, Saturn: 2 },
        houses: { 4: 5, 2: 2 },
        aspects: { 'Moon-Saturn': 3, 'Moon-Venus': 2 }
    },
    [HeadingEnum.FAMILY_DYNAMICS]: {
        planets: { Moon: 4, Pluto: 3, Saturn: 3 },
        houses: { 4: 4, 5: 2, 8: 2 },
        aspects: { 'Pluto-Moon': 3, 'Saturn-Moon': 3 }
    },
    [HeadingEnum.HOME_ENVIRONMENT]: {
        planets: { Venus: 4, Moon: 3 },
        houses: { 4: 4, 6: 2 },
        aspects: { 'Venus-Moon': 2 }
    },
    [HeadingEnum.FAMILY_CHALLENGES]: {
        planets: { Saturn: 4, Pluto: 3 },
        houses: { 4: 3, 12: 2 },
        aspects: { 'Saturn-Moon': 4, 'Pluto-Moon': 3 }
    },
    [HeadingEnum.HARMONIOUS_HOME]: {
        planets: { Moon: 5, Venus: 4 },
        houses: { 4: 4, 1: 1 },
        aspects: { 'Moon-Venus': 4, 'Venus-trine-Jupiter': 2 }
    },
    /* ───────────────────────────── Relationships ─────────────────────────── */
    [HeadingEnum.RELATIONSHIP_DESIRES]: {
        planets: { Venus: 4, Mars: 3, Moon: 2, Desc: 3 },
        houses: { 5: 2, 7: 5, 8: 2 },
        aspects: { 'Venus-Mars': 4, 'Sun-Moon': 3, 'Venus-Pluto': 3 }
    },
    [HeadingEnum.LOVE_STYLE]: {
        planets: { Venus: 5, Moon: 3, Neptune: 2 },
        houses: { 5: 4, 7: 2 },
        aspects: { 'Venus-Neptune': 3, 'Venus-Mars': 2 }
    },
    [HeadingEnum.SEXUAL_NATURE]: {
        planets: { Mars: 5, Venus: 4, Pluto: 3 },
        houses: { 8: 4, 5: 2 },
        aspects: { 'Mars-Venus': 4, 'Mars-Pluto': 3, 'Mars-Uranus': 2 }
    },
    [HeadingEnum.COMMITMENT_APPROACH]: {
        planets: { Saturn: 5, Jupiter: 3, Venus: 2 },
        houses: { 7: 5, 10: 2 },
        aspects: { 'Saturn-Venus': 4, 'Saturn-Sun': 3 }
    },
    [HeadingEnum.RELATIONSHIP_CHALLENGES]: {
        planets: { Uranus: 4, Saturn: 3, Pluto: 3 },
        houses: { 7: 4, 12: 2 },
        aspects: { 'Uranus-Venus': 4, 'Saturn-Moon': 3, 'Pluto-Venus': 3 }
    },
    [HeadingEnum.ROMANTIC_SUMMARY]: {
        planets: { Venus: 5, Mars: 4, Moon: 3 },
        houses: { 5: 3, 7: 3 },
        aspects: { 'Venus-Mars': 4, 'Sun-Moon': 3, 'Venus-Neptune': 2 }
    },
    [HeadingEnum.SOCIAL_NETWORKS]: {
        planets: { Jupiter: 4, Uranus: 3, Mercury: 2 },
        houses: { 11: 5, 3: 2 },
        aspects: { 'Jupiter-Mercury': 3, 'Uranus-Mercury': 2 }
    },
    /* ───────────────────────────── Career ─────────────────────────────────── */
    [HeadingEnum.CAREER_MOTIVATIONS]: {
        planets: { Sun: 4, Mars: 3, Saturn: 3, Jupiter: 2 },
        houses: { 10: 5, 6: 2 },
        aspects: { 'Sun-Saturn': 3, 'Sun-Jupiter': 2, 'MC-planet': 4 }
    },
    [HeadingEnum.PUBLIC_IMAGE]: {
        planets: { Sun: 5, Saturn: 2 },
        houses: { 10: 5 },
        aspects: { 'Sun-MC': 5, 'MC-planet': 3 }
    },
    [HeadingEnum.CAREER_CHALLENGES]: {
        planets: { Saturn: 5, Uranus: 3, Neptune: 2 },
        houses: { 10: 4, 6: 2, 12: 2 },
        aspects: { 'Saturn-Sun': 4, 'Uranus-Sun': 3, 'Neptune-Sun': 2 }
    },
    [HeadingEnum.SKILLS_TALENTS]: {
        planets: { Mercury: 4, Mars: 3, Jupiter: 3 },
        houses: { 3: 4, 6: 3 },
        aspects: { 'Mercury-Mars': 3, 'Mercury-Jupiter': 3 }
    },
    [HeadingEnum.CAREER_SUMMARY]: {
        planets: { Sun: 5, Saturn: 4 },
        houses: { 10: 5 },
        aspects: { 'Sun-MC': 4, 'Sun-Saturn': 3 }
    },
    /* ───────────────────────────── Unconscious / Growth ───────────────────── */
    [HeadingEnum.PSYCHOLOGICAL_PATTERNS]: {
        planets: { Pluto: 5, Moon: 3, Saturn: 2 },
        houses: { 8: 4, 12: 3 },
        aspects: { 'Pluto-Moon': 3, 'Saturn-Moon': 2 }
    },
    [HeadingEnum.SPIRITUAL_GROWTH]: {
        planets: { Neptune: 5, Jupiter: 3, Moon: 2 },
        houses: { 12: 5, 9: 3 },
        aspects: { 'Neptune-Sun': 3, 'Jupiter-Neptune': 2 }
    },
    [HeadingEnum.KARMIC_LESSONS]: {
        planets: { trueNode: 5, Saturn: 3, Pluto: 3 },
        houses: { 12: 4, 8: 2 },
        aspects: { 'Sun-trueNode': 3, 'Saturn-trueNode': 3 }
    },
    [HeadingEnum.TRANSFORMATIVE_EVENTS]: {
        planets: { Pluto: 5, Uranus: 4, Chiron: 3 },
        houses: { 8: 5, 12: 3 },
        aspects: { 'Pluto-Uranus': 3, 'Pluto-Sun': 3, 'Chiron-Sun': 2 }
    },
    /* ───────────────────────────── Communication / Philosophy ─────────────── */
    [HeadingEnum.COMMUNICATION_STYLES]: {
        planets: { Mercury: 5, Moon: 2 },
        houses: { 3: 5 },
        aspects: { 'Mercury-Moon': 3, 'Mercury-Mars': 2 }
    },
    [HeadingEnum.PHILOSOPHICAL_BELIEFS]: {
        planets: { Jupiter: 5, Sun: 3, Neptune: 2 },
        houses: { 9: 5 },
        aspects: { 'Jupiter-Sun': 3, 'Jupiter-Neptune': 2 }
    },
    [HeadingEnum.TRAVEL_EXPERIENCES]: {
        planets: { Jupiter: 4, Uranus: 3 },
        houses: { 9: 5 },
        aspects: { 'Jupiter-Uranus': 3 }
    }
};
