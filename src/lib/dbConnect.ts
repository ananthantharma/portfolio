import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached = (global as any).mongoose;

if (!cached) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: 'qt_portfolio',
      // FORCE parameters required for Oracle Cloud
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authMechanism: 'PLAIN' as any,
      authSource: '$external',
      tls: true,
      tlsAllowInvalidCertificates: true,
      maxPoolSize: 1, // Restrict to 1 connection per lambda to avoid Oracle limits
      maxIdleTimeMS: 5000, // Close idle connections quickly
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then(mongoose => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
