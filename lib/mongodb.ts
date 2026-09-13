import { MongoClient } from "mongodb";
import { resolve } from "path";
import { config as loadEnv } from "dotenv";
import dns from "node:dns";

// Fix for Node.js 18+ DNS resolution issues on some networks
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

if (!process.env.MONGODB_URI) {
  loadEnv({ path: resolve(process.cwd(), "backend", ".env") });
}

const options = {
  serverSelectionTimeoutMS: 30000, // 30s timeout for better DNS resilience
  socketTimeoutMS: 60000,          // 60s socket timeout
  connectTimeoutMS: 30000,         // 30s connection timeout
  maxPoolSize: 10,                 // Optimized connection pooling
  minPoolSize: 2,                  // Keep connections warm
  retryWrites: true,
  w: 'majority' as const,
};

let client: MongoClient | undefined;
let clientPromise: Promise<MongoClient> | undefined;

function getClientPromise(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }

  const uri = process.env.MONGODB_URI;

  if (process.env.NODE_ENV === "development") {
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

const clientInitPromise = new Promise<MongoClient>((resolve, reject) => {
  Promise.resolve().then(() => {
    try {
      resolve(getClientPromise());
    } catch (error) {
      reject(error);
    }
  });
});

export default clientInitPromise; 