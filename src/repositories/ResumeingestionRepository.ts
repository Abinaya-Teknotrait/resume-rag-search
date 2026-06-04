import { getDatabase } from '../config/database';
import { config } from '../config';
import { getLogger } from '../services/LoggingService';
import { DatabaseError } from '../utils/errors';
import { ObjectId } from 'mongodb';

const logger = getLogger();

export class ResumeingestionRepository {
  constructor() {}

  async saveDocument(doc: Record<string, unknown>, requestId = 'unknown') {
    try {
      const db = await getDatabase();
      const collection = db.collection(config.mongoCollectionName || 'resumes');

      const now = new Date();
      const documentToInsert = {
        ...doc,
        createdAt: doc.createdAt || now.toISOString(),
        updatedAt: now.toISOString(),
      } as Record<string, unknown>;

      const result = await collection.insertOne(documentToInsert as any);

      logger.info('Inserted resume document into MongoDB', {
        requestId,
        insertedId: result.insertedId?.toString?.(),
        collection: config.mongoCollectionName,
      });

      return { insertedId: result.insertedId ? (result.insertedId as ObjectId).toString() : null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to insert resume document', { requestId, error: message });
      throw new DatabaseError('MongoDB ingestion failed', error);
    }
  }

  async saveDocuments(docs: Record<string, unknown>[], requestId = 'unknown') {
    if (docs.length === 0) {
      return { insertedCount: 0, insertedIds: [] };
    }

    try {
      const db = await getDatabase();
      const collection = db.collection(config.mongoCollectionName || 'resumes');

      const now = new Date();
      const documentsToInsert = docs.map((doc) => ({
        ...doc,
        createdAt: doc.createdAt || now.toISOString(),
        updatedAt: now.toISOString(),
      })) as Record<string, unknown>[];

      const result = await collection.insertMany(documentsToInsert as any, { ordered: false });
      const insertedIds = Object.values(result.insertedIds || {}).map((id) => id?.toString?.()).filter(Boolean) as string[];

      logger.info('Inserted resume documents batch into MongoDB', {
        requestId,
        insertedCount: result.insertedCount,
        collection: config.mongoCollectionName,
      });

      return {
        insertedCount: result.insertedCount,
        insertedIds,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const insertedCount = (error as any)?.result?.insertedCount ?? 0;
      const insertedIds = Object.values((error as any)?.result?.insertedIds || {}).map((id: any) => id?.toString?.()).filter(Boolean) as string[];

      logger.warn('Partial or failed batch insert to MongoDB', {
        requestId,
        error: message,
        insertedCount,
        collection: config.mongoCollectionName,
      });

      return {
        insertedCount,
        insertedIds,
        error: message,
      };
    }
  }
}

export const resumeIngestionRepository = new ResumeingestionRepository();
