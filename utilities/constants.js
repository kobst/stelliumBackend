const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

const relevant_prompt_aspects = {
    "personality": {
        "planets": ["Sun", "Moon", "Ascendant"],
        "houses": [1]
    },
    "relationships": {
        "planets": [
        "Sun",
        "Moon",
        "Venus",
        "Mars",
        "Ascendant",
        ],
        "houses": [5, 7]
    },
    "career": {
        "planets": ["Sun", "Saturn", "Jupiter", "Midheaven"],
        "houses": [2, 6, 10]
    },
    "home": {
        "planets": ["Moon", "Saturn"],
        "houses": [4]
    },
    "everything": {
        "planets": [
        "Sun", "Moon", "Ascendant", "Mercury", "Venus", "Mars", "Saturn",
        "Jupiter", "Uranus", "Neptune", "Pluto", "Part of Fortune", "Node",
        "South Node"
        ],
        "houses": [1, 4, 7, 10]
    }
    }
    

    
const rulers = {  
    "Aries": "Mars",
    "Taurus": "Venus",
    "Gemini": "Mercury",
    "Cancer": "Moon",
    "Leo": "Sun",
    "Virgo": "Mercury",
    "Libra": "Venus",
    "Scorpio": "Mars",
    "Sagittarius": "Jupiter",
    "Capricorn": "Saturn",
    "Aquarius": "Uranus",
    "Pisces": "Neptune"
}

module.exports = {
    relevantPromptAspects,
    signs,
    rulers
  };