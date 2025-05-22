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

This will expose the API endpoints defined in `serverless.yml`.

## Repository Layout

- `controllers/` – request handlers for each route
- `services/` – database access, GPT helpers, ephemeris utilities and vectorization logic
- `utilities/` – scoring functions and prompt generation helpers
- `scripts/` – maintenance and data generation scripts

## License

This project is licensed under the ISC license. See [`package.json`](package.json) for details.

