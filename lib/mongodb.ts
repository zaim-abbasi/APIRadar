import { MongoClient } from "mongodb";

const options = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
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

export default new Promise<MongoClient>((resolve, reject) => {
  Promise.resolve().then(() => {
    try {
      resolve(getClientPromise());
    } catch (error) {
      reject(error);
    }
  });
}); 