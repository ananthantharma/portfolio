import { MongoClient, MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient> | null = null;

// Only initialize MongoDB if URI is provided
if (!uri) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

// 1. Manually parse credentials to ensure correct decoding (fixes %40 vs @ issues)
let connectionUri = uri;
let authOptions: any = {};

try {
  const match = uri.match(/mongodb:\/\/([^:]+):([^@]+)@/);
  if (match) {
    const rawUser = match[1];
    const rawPass = match[2];

    // Pass decoded credentials explicitly. 
    // This bypasses driver's internal URI parsing which might be buggy with special chars + loadBalanced.
    authOptions.auth = {
      username: decodeURIComponent(rawUser),
      password: decodeURIComponent(rawPass)
    };

    // Remove credentials from the URI string passed to MongoClient
    // so the driver relies ONLY on our explicit 'auth' object.
    connectionUri = uri.replace(`${rawUser}:${rawPass}@`, '');
  }
} catch (e) {
  console.error('Failed to parse URI for explicit auth, falling back to original', e);
}

// 2. Ensure loadBalanced=true is present (Oracle requirement)
// If we stripped creds, we might have stripped query params if they were attached weirdly, 
// but usually params are at the end. We double check just in case.
if (!connectionUri.includes('loadBalanced=true')) {
  const separator = connectionUri.includes('?') ? '&' : '?';
  connectionUri += `${separator}loadBalanced=true`;
}

console.log('MongoDB Connection Init:', {
  mode: 'Explicit Auth Object',
  hasAuth: !!authOptions.auth,
  sanitizedUri: connectionUri.replace(/\?.*/, '?[params hidden]'),
});

const clientOptions: MongoClientOptions = {
  ...options,
  ...authOptions, // Admin/Password passed here
  authMechanism: 'PLAIN',
  authSource: '$external',
  tls: true,
};

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(connectionUri, clientOptions);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(connectionUri, clientOptions);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise as Promise<MongoClient>;
