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

- Node.js 20+ (required for AWS Lambda deployment with sweph module)
- MongoDB instance
- Docker (for building sweph Lambda layer)
- Environment variables for external services

## Architecture

This application uses a **Lambda Layer** architecture for the Swiss Ephemeris module:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Lambda Layer  │    │  Main Function   │    │  Ephemeris Data │
│                 │    │                  │    │                 │
│ sweph binary    │◄───┤ ephemerisData    │◄───┤ data/*.se1      │
│ (ARM64, GLIBC   │    │ Service.ts       │    │ files           │
│  2.34+)         │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

- **Main Function**: Business logic, API routes, database operations
- **sweph Layer**: Native Swiss Ephemeris binary optimized for AWS Lambda
- **Ephemeris Data**: Astronomical data files (.se1) for planetary calculations

### Environment Variables

**For Local Development**: Create an `.env` file with the following keys:

```
OPENAI_API_KEY=<your-openai-key>
MONGO_CONNECTION_STRING=<mongodb-connection-string>
PINECONE_API_KEY=<pinecone-key>
PINECONE_ENVIRONMENT=us-east-1-aws
REACT_APP_GOOGLE_API_KEY=<google-api-key>
```

**For Production Deployment**: Environment variables are currently configured directly in `serverless.yml`. For enhanced security, consider using AWS Systems Manager Parameter Store in the future.

## Installation

```bash
npm install
```

## Build and Deployment

### Development Build
```bash
# Build TypeScript
npm run build

# Run locally with serverless-offline
npm run dev

# Run Express server directly (for simple testing)
npm start
```

### Production Deployment

The application uses a two-stage deployment process:

#### 1. Deploy sweph Lambda Layer (when needed)
```bash
# Build Lambda-compatible sweph binary
docker build -f Dockerfile.lambda -t sweph-lambda-builder .

# Extract binary to layer directory
rm -rf layer/nodejs
docker create --name sweph-lambda-extract sweph-lambda-builder /bin/bash
docker cp sweph-lambda-extract:/nodejs layer/
docker rm sweph-lambda-extract

# Deploy layer
npx serverless deploy --config layer-deploy.yml
# Note the layer ARN (e.g., arn:aws:lambda:us-east-1:547054413317:layer:stellium-sweph-layer:4)
```

#### 2. Deploy Main Function
```bash
# Update serverless.yml with new layer ARN if needed
# Build and deploy
npm run build
npx serverless deploy
```

### Runtime Configuration

**Important**: The application requires specific runtime settings for sweph compatibility:

```yaml
# serverless.yml
provider:
  runtime: nodejs20.x    # Required for GLIBC 2.34+ (Amazon Linux 2023)
  architecture: arm64    # Required for binary compatibility

functions:
  app:
    layers:
      - arn:aws:lambda:us-east-1:547054413317:layer:stellium-sweph-layer:4  # Update version as needed
```

## Running Locally

For local development, sweph loads from node_modules:

```bash
# Install dependencies (includes sweph)
npm install

# Start development server
npm run dev
# or
npx serverless offline
```

For simple testing without serverless:
```bash
npm start
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
- `data/` – Swiss Ephemeris data files (*.se1)
- `layer/` – Lambda layer content (sweph binary and dependencies)
- `Dockerfile.lambda` – Docker configuration for building Lambda-compatible sweph binary
- `layer-deploy.yml` – Serverless configuration for sweph layer deployment
- `SWEPH_GUIDE.md` – Comprehensive guide for sweph module management

## Swiss Ephemeris Integration

This application uses the Swiss Ephemeris (sweph) library for high-precision astronomical calculations. The sweph module requires special handling in AWS Lambda due to its native binary dependencies.

### Key Points:
- **Layer-based deployment**: sweph runs as a Lambda Layer to handle native dependencies
- **GLIBC compatibility**: Requires Node.js 20.x runtime (Amazon Linux 2023) for GLIBC 2.34+
- **ARM64 architecture**: Binary compiled specifically for Lambda's ARM64 environment
- **Comprehensive documentation**: See `SWEPH_GUIDE.md` for detailed setup, troubleshooting, and modification instructions

### Quick sweph Commands:
```bash
# Test sweph functionality
curl -X POST https://your-api-url/dev/createUser -H "Content-Type: application/json" -d '{"email":"test@example.com","firstName":"Test","lastName":"User","dateOfBirth":"1990-06-08","timeOfBirth":"15:30","placeOfBirth":"San Francisco, CA","lat":37.7749,"lon":-122.4194,"tzone":-7}'

# Check sweph logs
npx serverless logs -f app

# Rebuild sweph layer (when needed)
docker build -f Dockerfile.lambda -t sweph-lambda-builder . && \
rm -rf layer/nodejs && \
docker create --name extract sweph-lambda-builder /bin/bash && \
docker cp extract:/nodejs layer/ && \
docker rm extract && \
npx serverless deploy --config layer-deploy.yml
```

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
