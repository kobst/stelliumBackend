// @ts-nocheck
// export function generateDominancePrompt(category, context, description) {
//     // Format the system prompt
//     const systemPrompt = "You are Astrologer GPT, an expert in interpreting birth chart patterns.";
export {};
//     // Format the context section
//     const contextSection = `CONTEXT:
// • Analysis Type: ${formatCategoryName(category)} Distribution
// • Birth Chart Context:
// ${context}`;
//     // Format the dominance patterns section  
//     const patternsSection = `DOMINANCE PATTERNS:
// ${description}`;
//     // Format the task section
//     const task = `TASK:
// Write 2 cohesive paragraphs:
// 1️⃣ Describe how the ${category} distribution shapes this person's core expression and natural tendencies.
// 2️⃣ Note potential growth edges and ways to find balance, while maintaining an encouraging tone.
// Weave in specific planet placements to illustrate key points.
// Avoid bullet lists: create a flowing narrative.`;
//     return `${systemPrompt}\n\n${contextSection}\n\n${patternsSection}\n\n${task}`;
// }
// // Helper function to format category name
// function formatCategoryName(category) {
//     return category.split('_')
//         .map(word => word.charAt(0) + word.slice(1).toLowerCase())
//         .join(' ');
// }
// export function generatePlanetPrompt(planet, context, description) {
//     // Format the system prompt
//     const systemPrompt = "You are Astrologer GPT, an expert in natal chart interpretation.";
//     // Format the context section
//     const contextSection = `CONTEXT:
// • Planet Analysis: ${planet}
// • Birth Chart Overview:
// ${context}`;
//     // Format the planetary patterns section  
//     const patternsSection = `PLANETARY PATTERNS:
// ${description}`;
//     // Format the task section
//     const task = `TASK:
// Write 2 cohesive paragraphs:
// 1️⃣ Describe how ${planet}'s placement and aspects shape the native's expression of ${planet}'s energies.
// 2️⃣ Note potential challenges and opportunities for growth, maintaining an encouraging tone.
// Weave in specific aspects and house placements to illustrate key points BUT
// Avoid bullet lists or any other formatting and Avoid simply just describing each aspect or position in isolation; 
// create a flowing narrative, offering balance and pointing out sources of tension or emphasis`;
//     return `${systemPrompt}\n\n${contextSection}\n\n${patternsSection}\n\n${task}`;
// }
// export function generateTopicPrompt(userName, topic, description) {
//     // Format the system prompt
//     const systemPrompt = "You are Astrologer GPT, an expert in natal chart interpretation.";
//     const task = `TASK:
//     You are analyzing the birth chart of ${userName}.
//     You are tasked with writing a 2–4 paragraph interpretation on the topic: "${topic}", which relates to [brief description of topic].
//     Here is a set of notes from the user's birth chart related to this topic:
//     ${description}
//     Please synthesize these notes holistically. Do not repeat the notes; instead, weave them into a flowing, integrated interpretation. 
//     If some notes seem contradictory, thoughtfully discuss the tension. 
//     Focus on the main psychological and life patterns implied by the placements.
//     `;
//     return `${systemPrompt}\n\n${task}`;
// }
