import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient> | null = null;

// Only initialize MongoDB if URI is provided
if (!uri) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

// Use the URI exactly as provided (pointing to ADMIN for authentication)
const updatedUri = uri;

console.log('MongoDB Connection Init:', {
  originalUriPresent: !!uri,
  updatedUriMatches: updatedUri !== uri,
  debug_authSource: '$external',
  debug_authMech: 'PLAIN'
});

const clientOptions: any = {
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
