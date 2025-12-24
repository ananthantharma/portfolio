import { MongoClient, MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient> | null = null;

// Only initialize MongoDB if URI is provided
if (!uri) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

// Use the URI exactly as provided (pointing to ADMIN for authentication)
// The Oracle endpoint explicitly REQUIRES loadBalanced=true.
const updatedUri = uri;

// Debug Password Parsing (Masked)
const passwordMatch = uri.match(/:([^:@]+)@/);
console.log('MongoDB Connection Init:', {
  originalUriPresent: !!uri,
  sanitizedUri: updatedUri.replace(/:([^:@]+)@/, ':***@'), // Log the sanitized URI masked
  passwordDebug: passwordMatch ? {
    length: passwordMatch[1].length,
    isEncoded: passwordMatch[1].includes('%'),
    firstChar: passwordMatch[1][0],
    lastChar: passwordMatch[1].slice(-1)
  } : 'Not Found',
  options: {
    authMechanism: 'PLAIN',
    authSource: '$external',
    tls: true
  }
});

const clientOptions: MongoClientOptions = {
  ...options,
  authMechanism: 'PLAIN', // Force PLAIN auth for Oracle
  authSource: '$external', // Force $external source
  tls: true, // Force TLS
};

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(updatedUri, clientOptions);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(updatedUri, clientOptions);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise as Promise<MongoClient>;
