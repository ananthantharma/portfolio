import {MongoClient, MongoClientOptions} from 'mongodb';

// Cache at module scope (not initialized at import time)
let _clientPromise: Promise<MongoClient> | null = null;

const clientOptions: MongoClientOptions = {
  authMechanism: 'PLAIN',
  authSource: '$external',
  tls: true,
  tlsAllowInvalidCertificates: true,
  maxPoolSize: 1,
  maxIdleTimeMS: 5000,
};

function buildClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return Promise.reject(new Error('Invalid/Missing environment variable: "MONGODB_URI"'));

  // Sanitize URI: remove empty query parameters
  let connectionUri = uri;
  try {
    const urlParams = new URL(uri);
    const params = Array.from(urlParams.searchParams.entries());
    let changed = false;
    params.forEach(([key, value]) => {
      if (value === '') {
        urlParams.searchParams.delete(key);
        changed = true;
      }
    });
    if (changed) connectionUri = urlParams.toString();
  } catch {
    connectionUri = uri.replace(/[?&][^=&]+=(?:&|$)/g, match =>
      match.startsWith('&') ? '' : match.charAt(0),
    );
  }
  connectionUri = connectionUri.replace(/[?&]$/, '');

  if (process.env.NODE_ENV === 'development') {
    const g = global as typeof globalThis & {_mongoClientPromise?: Promise<MongoClient>};
    if (!g._mongoClientPromise) {
      g._mongoClientPromise = new MongoClient(connectionUri, clientOptions).connect();
    }
    return g._mongoClientPromise;
  }

  return new MongoClient(connectionUri, clientOptions).connect();
}

// getClientPromise() is lazy — safe to import without MONGODB_URI at build time.
export function getClientPromise(): Promise<MongoClient> {
  if (!_clientPromise) _clientPromise = buildClientPromise();
  return _clientPromise;
}

// Default export keeps backward compatibility with existing `await clientPromise` callers.
// This is a thenable that defers evaluation until awaited.
const clientPromise = {
  then<T1, T2>(
    onfulfilled?: ((value: MongoClient) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ) {
    return getClientPromise().then(onfulfilled, onrejected);
  },
  catch<T>(onrejected?: ((reason: unknown) => T | PromiseLike<T>) | null) {
    return getClientPromise().catch(onrejected);
  },
  finally(onfinally?: (() => void) | null) {
    return getClientPromise().finally(onfinally);
  },
  [Symbol.toStringTag]: 'Promise',
} as unknown as Promise<MongoClient>;

export default clientPromise;
