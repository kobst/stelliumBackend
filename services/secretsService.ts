import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface SecretCache {
  [key: string]: {
    value: string;
    expiry: number;
  };
}

const secretCache: SecretCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getSecret(secretName: string, secretKey?: string): Promise<string> {
  // First try environment variable (for local development)
  const envKey = secretKey || secretName.replace('stellium/', '').replace(/-/g, '_').toUpperCase();
  const envValue = process.env[envKey];
  
  if (envValue) {
    console.log(`Using environment variable ${envKey} for ${secretName}`);
    return envValue;
  }

  // Check cache first
  const cacheKey = secretKey ? `${secretName}:${secretKey}` : secretName;
  const cached = secretCache[cacheKey];
  if (cached && Date.now() < cached.expiry) {
    return cached.value;
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: secretName
    });
    
    const response = await secretsClient.send(command);
    
    if (!response.SecretString) {
      throw new Error(`Secret not found: ${secretName}`);
    }

    let secretValue: string;
    
    if (secretKey) {
      // Parse JSON and extract specific key
      const secrets = JSON.parse(response.SecretString);
      secretValue = secrets[secretKey];
      if (!secretValue) {
        throw new Error(`Secret key '${secretKey}' not found in secret '${secretName}'`);
      }
    } else {
      // Use the entire secret string
      secretValue = response.SecretString;
    }

    // Cache the secret
    secretCache[cacheKey] = {
      value: secretValue,
      expiry: Date.now() + CACHE_TTL
    };

    return secretValue;
  } catch (error) {
    console.error(`Failed to retrieve secret ${secretName}${secretKey ? `:${secretKey}` : ''} and no environment variable ${envKey} found:`, error);
    throw new Error(`Missing required secret: ${secretName}${secretKey ? `:${secretKey}` : ''} (env: ${envKey})`);
  }
}

// Pre-defined secret getters for commonly used secrets
export async function getMongoConnectionString(): Promise<string> {
  return getSecret('stellium/api-keys', 'MONGO_CONNECTION_STRING');
}

export async function getOpenAIApiKey(): Promise<string> {
  return getSecret('stellium/api-keys', 'OPENAI_API_KEY');
}

export async function getPineconeApiKey(): Promise<string> {
  return getSecret('stellium/api-keys', 'PINECONE_API_KEY');
}

export async function getGoogleApiKey(): Promise<string> {
  return getSecret('stellium/api-keys', 'REACT_APP_GOOGLE_API_KEY');
}