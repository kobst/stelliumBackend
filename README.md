# Stellium Backend

Stellium Backend is a serverless Node.js application that provides astrology related services. It combines ephemeris calculations, GPT powered text generation, and vector search to build birth chart and relationship interpretations.

## Features

- **Express API** exposed through AWS Lambda using the Serverless Framework.
- **Ephemeris calculations** using `sweph` to build birth charts and synastry data.
- **OpenAI integration** for generating chart analyses and answering user questions.
- **MongoDB** for storing users, charts and generated interpretations.
- **Pinecone** vector database for semantic search over generated text.

The main entry point is [`server.js`](server.js) which registers all API routes found in [`routes/indexRoutes.js`](routes/indexRoutes.js).

## Requirements

- Node.js 18+
- MongoDB instance
- Environment variables for external services

Create an `.env` file with the following keys:

```
OPENAI_API_KEY=<your-openai-key>
MONGO_CONNECTION_STRING=<mongodb-connection-string>
PINECONE_API_KEY=<pinecone-key>
REACT_APP_GOOGLE_API_KEY=<google-api-key>
```

## Installation

```bash
npm install
```

## Running Locally

Start the Express server directly:

```bash
node server.js
```

Or run with the Serverless framework:

```bash
npx serverless offline
```

### Generating Relationship Scoring Statistics

The relationship compatibility scoring uses statistics stored in
`relationship_scoring_stats.json`. If you need to update or generate these
statistics (for normalization and grading), run:

```bash
# Use the ESM loader for TypeScript (project is ESM)
npx ts-node --esm scripts/logScoreAnalysis.ts
# or, alternatively:
npx ts-node-esm scripts/logScoreAnalysis.ts
```

This will analyze the logs and produce `relationship_scoring_stats.json` at
the project root, which will then be included in the build.

This will expose the API endpoints defined in `serverless.yml`.

## Repository Layout

- `controllers/` – request handlers for each route
- `services/` – database access, GPT helpers, ephemeris utilities and vectorization logic
- `utilities/` – scoring functions and prompt generation helpers
- `scripts/` – maintenance and data generation scripts

## License

This project is licensed under the ISC license. See [`package.json`](package.json) for details.


## Transit Tracking

The service now provides utilities for computing planetary transits to any birth chart.

1. **Generate an ephemeris series**

   ```javascript
   import { generateTransitSeries } from './services/ephemerisDataService.js';

   const from = new Date('2025-07-01T00:00:00Z');
   const to   = new Date('2025-07-31T00:00:00Z');
   const series = generateTransitSeries(from, to);
   ```

2. **Scan the series against natal positions**

   ```javascript
   import { scanTransitSeries, mergeTransitWindows } from './services/ephemerisDataService.js';

   const natal = user.birthChart.planets.map(p => ({ name: p.name, lon: p.full_degree }));
   const rawEvents = Array.from(scanTransitSeries(series, natal));
   const windows = mergeTransitWindows(rawEvents);
   ```

   `windows` contains objects with `start`, `exact` and `end` dates describing
   when a transiting planet forms a specific aspect to a natal point.

These helper functions work independently of any route handlers so you can use
them in scripts or new API endpoints as needed.
