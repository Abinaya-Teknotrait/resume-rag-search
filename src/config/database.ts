// import * as dns from 'dns';
import { MongoClient, Db } from 'mongodb';
import { config } from './index';
import { getLogger } from '../services/LoggingService';

const logger = getLogger();

// const DNS_SERVERS = ['40.53.1.11', '192.168.1.1'];

// function configureDnsServers(): void {
//   try {
//     dns.setServers(DNS_SERVERS);
//     logger.info('Configured Node DNS servers for MongoDB resolution', {
//       servers: DNS_SERVERS,
//     });
//   } catch (error) {
//     logger.warn('Failed to configure Node DNS servers', {
//       error: error instanceof Error ? error.message : String(error),
//       servers: DNS_SERVERS,
//     });
//   }
// }

// configureDnsServers();

/**
 * MongoDB client with connection pooling
 * Configured for production-grade reliability
 */
let mongoClient: MongoClient | null = null;
let database: Db | null = null;

/**
 * Initialize MongoDB connection with pooling
 * Should be called during server startup
 */
export async function initializeDatabase(): Promise<Db> {
  if (database) {
    return database;
  }

  try {
    const mongoUri = config.mongoUri;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    mongoClient = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: config.databaseTimeout,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      retryReads: true,
      maxIdleTimeMS: 60000,
      waitQueueTimeoutMS: 10000,
    });

    await mongoClient.connect();

    database = mongoClient.db(config.mongoDbName);

    logger.info('MongoDB connected successfully', {
      uri: mongoUri.replace(/:[^:]*@/, ':***@'),
      database: config.mongoDbName,
      poolSize: { min: 5, max: 10 },
    });

    return database;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', {
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Get the database instance
 * Initializes connection if not already connected
 */
export async function getDatabase(): Promise<Db> {
  if (!database) {
    return await initializeDatabase();
  }
  return database;
}

/**
 * Check database health and connectivity
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  error?: string;
  mode?: string;
}> {
  try {
    const startTime = Date.now();

    if (!mongoClient || !database) {
      await initializeDatabase();
    }

    if (mongoClient) {
      await mongoClient.db('admin').admin().ping();
    }

    const latencyMs = Date.now() - startTime;

    return {
      status: 'healthy',
      latencyMs,
      mode: 'mongodb',
    };
  } catch (error) {
    const latencyMs = Date.now() - Date.now();
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.warn('Database health check failed', {
      error: errorMessage,
      latencyMs,
    });

    return {
      status: 'unhealthy',
      latencyMs,
      error: errorMessage,
      mode: 'mongodb',
    };
  }
}

/**
 * Close database connection gracefully
 * Should be called during server shutdown
 */
export async function closeDatabase(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    database = null;
    logger.info('MongoDB connection closed');
  }
}

/**
 * Get MongoDB client instance
 */
export function getMongoClient(): MongoClient | null {
  return mongoClient;
}
