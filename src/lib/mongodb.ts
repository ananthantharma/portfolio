import { MongoClient, MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient> | null = null;

// Only initialize MongoDB if URI is provided
if (!uri) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

// SIMPLIFIED DEBUGGING STRATEGY:
// 1. Use the URI exactly as provided by the user (preserving all params like loadBalanced=true)
// 2. Relax TLS/SSL validation to ensure certificate chain issues don't mask as auth failures.
// 3. Log diagnostic info about the password format.

// Sanitize URI: Remove empty query parameters which cause "URI cannot contain options with no value"
let connectionUri = uri;
try {
  // Hack to parse mongodb URI with URL interface if protocol is supported or generic
  // If it fails, fallback to original.
  const urlParams = new URL(uri);
  const params = Array.from(urlParams.searchParams.entries());
  let changed = false;
  params.forEach(([key, value]) => {
    if (value === '') {
      urlParams.searchParams.delete(key);
      changed = true;
    }
  });
  if (changed) {
    connectionUri = urlParams.toString();
    // URL.toString() might encode characters differently, check if mongodb protocol remains
    // Usually fine.
    // But 'mongodb+srv' might not be recognized by URL class in all envs.
    // If it fails, we catch.
  }
  // Remove "test" logic or specific overrides if needed.
} catch (e) {
  // Parsing failed (maybe custom schemes?), attempt manual cleanup of empty params
  connectionUri = uri.replace(/[?&][^=&]+=(?:&|$)/g, (match) => {
    // e.g. "?foo=&" -> "?"
    // e.g. "&foo=&" -> "&"
    // e.g. "&foo=" -> ""
    return match.startsWith('&') ? '' : match.charAt(0);
  });
  console.warn("Manual URI cleanup applied due to URL parse error", e);
}

// Remove trailing ? or & if any (regex might leave them)
connectionUri = connectionUri.replace(/[?&]$/, '');

// Debug Password Parsing (Masked) - Helps user verify if Env Var is correct
const passwordMatch = uri.match(/:([^:@]+)@/);
console.log('MongoDB Connection Init:', {
  length: uri.length,
  passwordDebug: passwordMatch
    ? {
      length: passwordMatch[1].length,
      startsWith: passwordMatch[1].substring(0, 2),
      endsWith: passwordMatch[1].slice(-2),
      isEncoded: passwordMatch[1].includes('%'),
    }
    : 'Not Found',
  options: {
    tls: true,
    tlsAllowInvalidCertificates: true,
  },
});

const clientOptions: MongoClientOptions = {
  ...options,
  // FORCE parameters required for Oracle Cloud
  authMechanism: 'PLAIN',
  authSource: '$external',
  tls: true,
  tlsAllowInvalidCertificates: true, // Bypass potential chain validation errors on Oracle
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
