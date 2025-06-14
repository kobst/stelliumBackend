# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript to dist/
npm run build

# Local development with serverless framework
npm run dev

# Direct Express server (for simple testing)
npm start

# Lint code
npm run lint

# Run scripts with ESM loader (required for TypeScript scripts)
npx ts-node --esm scripts/scriptName.ts
```

## Architecture Overview

Stellium Backend is a serverless astrology service built with Express.js, deployed via AWS Lambda using the Serverless Framework. The application combines Swiss Ephemeris calculations, OpenAI GPT integration, and vector search for astrological chart interpretations.

### Core Data Flow
1. **Ephemeris Calculations**: `sweph` library provides planetary position data from Swiss Ephemeris files in `data/`
2. **Chart Generation**: Birth charts, synastry, composite charts, and transit calculations
3. **AI Interpretation**: OpenAI GPT generates astrological analyses based on chart data
4. **Vector Search**: Pinecone stores and searches generated interpretations for semantic similarity
5. **Persistence**: MongoDB stores users, celebrities, charts, relationships, and generated content

### Key Services
- **ephemerisDataService.ts**: Swiss Ephemeris wrapper for planetary calculations and transit tracking
- **gptService.ts**: OpenAI integration for generating astrological interpretations
- **dbService.ts**: MongoDB operations for all data persistence
- **vectorize.ts**: Pinecone vector database operations

### Relationship Scoring System
The application includes a sophisticated relationship compatibility scoring system that produces normalized scores (0-1 scale):

**Core Components:**
- **relationshipScoring.ts**: Core scoring algorithms with statistical normalization
- **relationshipScoringStats.ts**: Statistical data (mean, stdDev) from 28 relationships
- **relationshipScoringConstants.ts**: Category weights and scoring profiles
- **scripts/dbScoreAnalysis.ts**: Generates statistics from database records

**Scoring Methodology:**
1. **Raw Scores** calculated from:
   - Synastry aspects (planetary interactions between charts)
   - Synastry house placements (partner's planets in houses)
   - Composite aspects (combined chart aspects)
   - Composite house placements (combined chart positions)

2. **Statistical Normalization**:
   - Each raw score converted to percentile using z-score and normal CDF
   - Based on mean/stdDev from historical relationship data
   - Results in 0-1 scale (0.5 = average/50th percentile)

3. **Component Blending**:
   - Synastry blend: 80% aspects + 20% house placements
   - Composite blend: 80% aspects + 20% house placements

4. **Category-Specific Weights** (synastry/composite):
   - OVERALL_ATTRACTION_CHEMISTRY: 85%/15%
   - EMOTIONAL_SECURITY_CONNECTION: 80%/20%
   - SEX_AND_INTIMACY: 85%/15%
   - COMMUNICATION_AND_MENTAL_CONNECTION: 80%/25%
   - COMMITMENT_LONG_TERM_POTENTIAL: 70%/30%
   - KARMIC_LESSONS_GROWTH: 65%/35%
   - PRACTICAL_GROWTH_SHARED_GOALS: 70%/30%

**Database Storage**: Scores are saved as normalized percentiles (0-1) in the `scores` field of relationship_analysis documents

### Swiss Ephemeris Integration
- Ephemeris data files (`.se1`) must be present in `data/` directory
- `initializeEphemeris()` must be called before any calculations
- Supports natal charts, progressions, transits, and composite charts
- **Platform Compatibility**: The `sweph` native module requires platform-specific compilation:
  - Production (AWS Lambda): Compiled for Linux ARM64
  - Local Development (macOS): Automatically rebuilds via `postinstall` script
  - The `postinstall` script in `package.json` handles macOS rebuilding automatically

### Transit Tracking
Advanced transit calculation utilities:
- `generateTransitSeries()`: Creates ephemeris time series for date ranges
- `scanTransitSeries()`: Finds exact aspects between transiting and natal planets
- `mergeTransitWindows()`: Groups aspect events into time windows with start/exact/end dates

### Environment Requirements
Required `.env` variables:
- `OPENAI_API_KEY`: OpenAI API access
- `MONGO_CONNECTION_STRING`: MongoDB connection
- `PINECONE_API_KEY`: Vector database access
- `REACT_APP_GOOGLE_API_KEY`: Google services

### ESM Configuration
Project uses ES modules with TypeScript:
- All imports use `.js` extensions (TypeScript compiler requirement)
- Scripts must run with `--esm` flag: `npx ts-node --esm`
- `"type": "module"` in package.json

### Serverless Deployment
- Single Lambda function handles all routes via `serverless-http`
- Routes defined in `routes/indexRoutes.ts`, controllers in `controllers/`
- Development server runs on port 3001 via `serverless offline`

### Utility Scripts
Scripts in `scripts/` directory handle data generation and maintenance:
- Relationship analysis and scoring
- Birth chart bulk processing
- LLM prompt generation
- Statistical analysis for scoring normalization

### Performance Optimizations (as of commit 1b60502)
The codebase now includes significant performance improvements for workflow processing:
- **Parallel Processing**: Both user and relationship workflows now process multiple analyses concurrently
- **Unified Operations**: Generation and vectorization steps are combined to reduce redundant operations
- **RAG Integration**: Topic analysis incorporates previously vectorized content for enhanced coherence
- **Memory Management**: Strategic garbage collection prevents memory leaks during long operations

### Relationship Analysis Token Optimization (Latest)
The relationship analysis system has been enhanced to address token allocation issues and improve LLM focus:

#### **Token Rebalancing**
- **Context Summarization**: Natal chart contexts now limited to ~100 words per user (down from 1000+ tokens)
- **Smart Prioritization**: Score synopsis and relationship dynamics now receive 60-70% of token allocation
- **Coherent Summaries**: GPT-based summarization replaces sentence extraction for flowing prose

#### **Enhanced Prompt Engineering**
- **Synastry Panel**: 160-word limit with structured narrative flow (hook → spark → challenge → tip)
- **Composite Panel**: 140-word limit contrasting with synastry dynamics
- **Deep-Dive Analysis**: 300-350 word structured analysis using sequential processing
- **Complete Synopsis**: All positive-scoring elements included with visual emphasis on strongest

#### **Sequential Processing Pipeline**
- **Layered Analysis**: Synastry → Composite → Deep-dive (each builds on previous)
- **Comprehensive Context**: All scored aspects and positions included in synopsis
- **Weighted Guidance**: Top 3 elements marked as [PRIMARY] anchors for LLM focus
- **Actionable Integration**: Every panel includes specific tips and "so-what" guidance

#### **RAG Context Improvements**
- **Reduced Retrieval**: TopK reduced from 5 to 3 most relevant chunks
- **Better Joining**: Context chunks connected with "In addition, " instead of "---"
- **GPT Summarization**: Flowing prose generation replaces fragmented sentence extraction
- **Grammar Cleanup**: Post-processing ensures professional, readable output

### RAG (Retrieval-Augmented Generation) Improvements

The system includes a comprehensive set of improvements for RAG-based content generation, organized by implementation effort and impact:

#### Low-Effort Fixes (Hours)

**1. Chunking Improvements**
- Implement sliding window chunking that ends at sentence boundaries for better context preservation
- Store source-section metadata (e.g., "Career", "Shadow Work") in Pinecone vectors
- Enable section-specific retrieval: `vector.metadata.section == category`

**2. Retrieval Optimization**
- Reduce topK from 5 to 2-3 results for better relevance (relevance typically decays sharply after first few hits)
- Focus on high-quality, highly relevant matches rather than quantity

**3. Aggregation Enhancement**
- Replace simple "---" separators with contextual joining
- Use transitional phrases: `contextArray.join("\n\nIn addition, ")`
- Improve flow between retrieved chunks

**4. Summarization Refinement**
- Replace extractive scoring with single GPT call for better coherence
- Prompt: "Summarise the composite meaning of these notes in ≤100 words, using flowing prose."
- Generate natural, readable summaries instead of fragmented extracts

**5. Post-processing Polish**
- Add grammar and style pass using gpt-3.5-turbo (cost-effective)
- Simple prompt: "Fix grammar & merge repetitive phrases."
- Final quality check before output delivery

#### Medium-Effort Improvements (½-2 days)

**1. Section Summaries at Ingestion**
- Generate section summaries during content ingestion phase
- Convert every document to 1-2 cohesive paragraphs per category
- Index processed summaries instead of raw text for better retrieval

**2. Round-Robin Query Strategy**
- Implement topic-specific queries: separate queries for "practical matters" and "goals"
- Concatenate results from multiple focused queries
- Prevents mixing of unrelated content in single retrieval

**3. Micro-Fusion Prompt Processing**
- Wrap retrieved chunks in fusion prompt before summarization
- "Rewrite the following pieces into a single cohesive paragraph:"
- Let GPT handle micro-level fusion before final summarization

**4. Two-Pass Chain Processing**
- Implement map-reduce pattern: summarize each chunk individually (map)
- Then summarize the collection of summaries (reduce)
- Maintains context while producing smooth, coherent text

**5. Coherence Quality Scoring**
- Add automated coherence evaluation using small model
- Return 0-1 coherence score for generated content
- If score < 0.5, regenerate with higher temperature for better variety

#### High-Leverage Ideas (Future Refactoring)

**1. Cross-Encoder Re-Ranker**
- Maintain raw text index but add sophisticated re-ranking
- Train cross-encoder re-ranker or use off-the-shelf solutions (Cohere/TEI)
- Score for both topical relevance and content cohesion

**2. Dynamic K Selection**
- Implement adaptive retrieval: continue grabbing results until similarity drops below threshold
- Example: keep retrieving while similarity > 0.78
- Prevents inclusion of low-quality, irrelevant content

**3. Array-Based Storage**
- Store chunks as arrays rather than concatenated strings
- Pass individual chunks to summarizer in separate messages
- Preserve source boundaries for better processing

**4. Exemplar-Based Learning**
- Provide few-shot examples of desired summary style and tone
- Train LLM to automatically supply appropriate connective tissue
- Improve consistency across generated content

**5. TextRank with Co-Reference Resolution**
- Implement TextRank algorithm with co-reference resolution
- Ensure pronouns and references resolve correctly before extraction
- Maintain semantic coherence across chunk boundaries

#### Implementation Priority

1. **Immediate (Low-Effort)**: Focus on chunking, topK reduction, and better aggregation
2. **Short-term (Medium-Effort)**: Section summaries and two-pass processing
3. **Long-term (High-Leverage)**: Cross-encoder re-ranking and dynamic retrieval

These improvements target the core challenges in RAG systems: maintaining context, ensuring relevance, and producing coherent, flowing text that reads naturally while preserving the semantic richness of the source material.

### Database Architecture
- **MongoDB Database**: Named `stellium` with 19 collections (including unified subjects collection)
- **Complete Documentation**: See `DATABASE.md` for detailed collection schemas and relationships
- **Unified Subjects Collection**: All birth chart subjects (users, celebrities, guest subjects) stored in single `subjects` collection with ownership tracking
  - **Subject Types**:
    - `"accountSelf"`: User's own birth chart (email required, ownerUserId: null)
    - `"celebrity"`: Public celebrity charts (no email, ownerUserId: null, isReadOnly: true)
    - `"guest"`: User-created subjects for friends/family (ownerUserId required)
  - **Ownership Model**: `ownerUserId` field enables user-specific subject access
  - **Convenience Flags**: `isCelebrity` and `isReadOnly` for efficient filtering
- **Legacy Collections**: `users` and `celebs` collections are being phased out in favor of unified `subjects`
- **Index Management**: Graceful handling of duplicate key errors with fallback strategies

### API Endpoints

#### Subject Management (Unified API)
- `POST /getUsers` - Retrieve subjects with kind="accountSelf" or isCelebrity=false (limit 50)
- `POST /getCelebs` - Retrieve subjects with kind="celebrity" or isCelebrity=true (limit 50)
- `POST /getUserSubjects` - Retrieve subjects owned by specific user (kind="guest")
- `POST /createUser` - Create accountSelf subject with birth time
- `POST /createUserUnknownTime` - Create accountSelf subject without birth time
- `POST /createCeleb` - Create celebrity subject with birth time
- `POST /createCelebUnknownTime` - Create celebrity subject without birth time
- `POST /createGuestSubject` - Create user-owned subject with birth time
- `POST /createGuestSubjectUnknownTime` - Create user-owned subject without birth time

**Unified Subjects API Notes**:
- All endpoints use the unified `subjects` collection with ownership and provenance tracking
- `getUserSingle()` function works seamlessly across all subject types
- Celebrity subjects have `isReadOnly: true` and `ownerUserId: null`
- Guest subjects require `ownerUserId` for ownership tracking
- **Workflow Compatibility**: All existing analysis and vectorization workflows support all subject types seamlessly
- **Multi-User Support**: Users can create and manage their own custom subjects (friends, family) via guest subject endpoints