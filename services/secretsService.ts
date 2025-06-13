import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface SecretCache {
  [key: string]: {
    value: string;
    expiry: number;
  };
}

const secretCache: SecretCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getSecret(parameterName: string): Promise<string> {
  // Check cache first
  const cached = secretCache[parameterName];
  if (cached && Date.now() < cached.expiry) {
    return cached.value;
  }

  try {
    const command = new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true
    });
    
    const response = await ssmClient.send(command);
    
    if (!response.Parameter?.Value) {
      throw new Error(`Secret not found: ${parameterName}`);
    }

    // Cache the secret
    secretCache[parameterName] = {
      value: response.Parameter.Value,
      expiry: Date.now() + CACHE_TTL
    };

    return response.Parameter.Value;
  } catch (error) {
    console.error(`Failed to retrieve secret ${parameterName}:`, error);
    
    // Fallback to environment variable for local development
    const envValue = process.env[parameterName.replace('/stellium/', '').toUpperCase()];
    if (envValue) {
      console.warn(`Using fallback environment variable for ${parameterName}`);
      return envValue;
    }
    
    throw error;
  }
}

// Pre-defined secret getters for commonly used secrets
export async function getMongoConnectionString(): Promise<string> {
  return getSecret('/stellium/mongo-connection-string');
}

export async function getOpenAIApiKey(): Promise<string> {
  return getSecret('/stellium/openai-api-key');
}

export async function getPineconeApiKey(): Promise<string> {
  return getSecret('/stellium/pinecone-api-key');
}

export async function getGoogleApiKey(): Promise<string> {
  return getSecret('/stellium/google-api-key');
}