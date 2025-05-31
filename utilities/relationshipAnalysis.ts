// @ts-nocheck


export function generatePromptForRelationshipCategory(relationshipLog, category, userA, userB) {
    const scores = relationshipLog.normalizedScores[category];
    const aspects = relationshipLog.categories[category];
    
    // Format the system prompt
    const systemPrompt = "You are Relationship-Astrologer GPT.";
    
    // Format the context section
    const context = `CONTEXT:
• Partners: ${userA.firstName} (${userA.gender === 'male' ? '♂' : '♀'}) + ${userB.firstName} (${userB.gender === 'male' ? '♂' : '♀'})
• Category: ${formatCategoryName(category)}
• Category scores → Synastry ${scores.synastry.normalized} Composite ${scores.composite.normalized} Houses ${scores.synastryHousePlacements.normalized} Overall ${scores.overallNormalized}/100`;

    // Get core themes from user snippets
    const coreThemes = `PARTNER CORE THEMES (from each birth-chart synthesis):
[${userA.snippet}]
[${userB.snippet}]`;

    // Format key connections
    const keyConnections = formatKeyConnections(aspects);

    // Format the task section
    const task = `TASK:
Write 2 cohesive paragraphs:  
1️⃣ Highlight strengths that create immediate chemistry.  
2️⃣ Note tensions/growth edges without doom.  
Weave in birth-chart themes if illuminating.  
Avoid bullet lists; do not restate raw data.`;

    return `${systemPrompt}\n\n${context}\n\n${coreThemes}\n\n${keyConnections}\n\n${task}`;
}

function formatKeyConnections(aspects) {
    let connections = [];
    
    // Add synastry aspects
    aspects.synastry.matchedAspects
        .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
        .slice(0, 3)  // Get top 3 aspects
        .forEach(aspect => {
            const symbol = aspect.score > 0 ? '+' : '±';
            connections.push(`${symbol} ${aspect.aspect} (syn) orb ${aspect.orb}° [${aspect.score > 0 ? '+' : ''}${aspect.score}]`);
        });

    // Add composite aspects
    aspects.composite.matchedAspects
        .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
        .slice(0, 2)  // Get top 2 aspects
        .forEach(aspect => {
            const symbol = aspect.score > 0 ? '+' : '±';
            connections.push(`${symbol} ${aspect.aspect} (comp) orb ${aspect.orb}° [${aspect.score > 0 ? '+' : ''}${aspect.score}]`);
        });

    // Add significant house placements
    const housePlacements = [...aspects.synastryHousePlacements.AinB, ...aspects.synastryHousePlacements.BinA]
        .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
        .slice(0, 1)  // Get top house placement
        .map(placement => {
            const symbol = placement.points > 0 ? '+' : '±';
            return `${symbol} ${placement.description} [${placement.points > 0 ? '+' : ''}${placement.points}]`;
        });

    connections.push(...housePlacements);

    return `KEY CONNECTIONS (ranked):\n${connections.join('\n')}`;
}

function formatCategoryName(category) {
    return category.split('_')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
}
    