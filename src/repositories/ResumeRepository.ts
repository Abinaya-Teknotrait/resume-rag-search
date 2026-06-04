import { ObjectId } from 'mongodb';
import { config } from '../config';
import { getDatabase } from '../config/database';
import { getLogger } from '../services/LoggingService';
import { IResume, ISearchFilters } from '../types/API';

const logger = getLogger();

interface IVectorMatch {
  resume: IResume;
  score: number;
}

function normalizeEmbedding(embedding: unknown): number[] | null {
  if (!Array.isArray(embedding)) {
    return null;
  }

  return embedding.every((value) => typeof value === 'number') ? embedding : null;
}

function mapResumeDocument(doc: Record<string, unknown>): IResume {
  const skillsValue = doc.skills;
  const jobTitlesValue = doc.jobTitles;

  const skills = Array.isArray(skillsValue)
    ? skillsValue.map((skill) => String(skill))
    : typeof skillsValue === 'string'
      ? skillsValue.split(',').map((skill) => skill.trim()).filter(Boolean)
      : [];

  const jobTitles = Array.isArray(jobTitlesValue)
    ? jobTitlesValue.map((jobTitle) => String(jobTitle))
    : [];

  const location =
    typeof doc.location === 'string'
      ? doc.location
      : typeof doc.locations === 'string'
        ? doc.locations
        : undefined;

  const company =
    typeof doc.company === 'string'
      ? doc.company
      : typeof doc.currentOrganisation === 'string'
        ? doc.currentOrganisation
        : undefined;

  const role =
    typeof doc.role === 'string'
      ? doc.role
      : typeof doc.currentTitle === 'string'
        ? doc.currentTitle
        : undefined;

  return {
    _id: String(doc._id ?? ''),
    text: typeof doc.text === 'string' ? doc.text : '',
    name: typeof doc.name === 'string' ? doc.name : 'Unknown Candidate',
    email: typeof doc.email === 'string' ? doc.email : undefined,
    phone: typeof doc.phone === 'string' ? doc.phone : undefined,
    location,
    company,
    role,
    jobTitles,
    education: typeof doc.education === 'string' ? doc.education : undefined,
    skills,
    totalExperience: typeof doc.totalExperience === 'number' ? doc.totalExperience : undefined,
    relevantExperience:
      typeof doc.relevantExperience === 'number' ? doc.relevantExperience : undefined,
    experienceSummary:
      typeof doc.experienceSummary === 'string' ? doc.experienceSummary : undefined,
    score: typeof doc.score === 'number' ? doc.score : undefined,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt : undefined,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt : undefined,
  };
}

function buildResumeIdQuery(id: string): Record<string, unknown> {
  if (ObjectId.isValid(id)) {
    return { _id: new ObjectId(id) };
  }

  return { _id: id };
}

function normalizeFilterAliases(filters: ISearchFilters = {}): ISearchFilters {
  const normalizedFilters: ISearchFilters = { ...filters };

  const normalizedLocation =
    typeof normalizedFilters.location === 'string' && normalizedFilters.location.trim().length > 0
      ? normalizedFilters.location
      : typeof normalizedFilters.locations === 'string' && normalizedFilters.locations.trim().length > 0
        ? normalizedFilters.locations
        : undefined;

  if (normalizedLocation) {
    normalizedFilters.location = normalizedLocation;
    delete normalizedFilters.locations;
  }

  if (
    typeof normalizedFilters.company === 'string' &&
    normalizedFilters.company.trim().length > 0 &&
    normalizedFilters.currentOrganisation === undefined
  ) {
    normalizedFilters.currentOrganisation = normalizedFilters.company;
  }

  if (
    typeof normalizedFilters.role === 'string' &&
    normalizedFilters.role.trim().length > 0 &&
    normalizedFilters.currentTitle === undefined
  ) {
    normalizedFilters.currentTitle = normalizedFilters.role;
  }

  return normalizedFilters;
}

export function buildMongoFilters(filters: ISearchFilters = {}): Record<string, unknown> {
  const normalizedFilters = normalizeFilterAliases(filters);
  const query: Record<string, unknown> = {};
  const orClauses: Record<string, unknown>[] = [];

  if (typeof normalizedFilters.location === 'string' && normalizedFilters.location.trim().length > 0) {
    query.location = normalizedFilters.location;
  }

  if (
    typeof normalizedFilters.currentOrganisation === 'string' &&
    normalizedFilters.currentOrganisation.trim().length > 0
  ) {
    query.currentOrganisation = normalizedFilters.currentOrganisation;
  }

  if (typeof normalizedFilters.currentTitle === 'string' && normalizedFilters.currentTitle.trim().length > 0) {
    query.currentTitle = normalizedFilters.currentTitle;
  }

  if (Array.isArray(normalizedFilters.skills) && normalizedFilters.skills.length > 0) {
    query.skills = { $in: normalizedFilters.skills.map((skill) => String(skill)) };
  }

  if (
    typeof normalizedFilters.minYearsExperience === 'number' ||
    typeof normalizedFilters.maxYearsExperience === 'number'
  ) {
    const min =
      typeof normalizedFilters.minYearsExperience === 'number' ? normalizedFilters.minYearsExperience : 0;
    const max =
      typeof normalizedFilters.maxYearsExperience === 'number'
        ? normalizedFilters.maxYearsExperience
        : Number.MAX_SAFE_INTEGER;

    orClauses.push(
      { totalExperience: { $gte: min, $lte: max } },
      { relevantExperience: { $gte: min, $lte: max } }
    );
  }

  if (orClauses.length > 0) {
    query.$or = orClauses;
  }

  for (const [key, value] of Object.entries(normalizedFilters)) {
    if (
      [
        'location',
        'company',
        'role',
        'locations',
        'currentOrganisation',
        'currentTitle',
        'skills',
        'minYearsExperience',
        'maxYearsExperience',
      ].includes(key)
    ) {
      continue;
    }

    if (value !== undefined && value !== null) {
      query[key] = value;
    }
  }

  return query;
}

export class ResumeRepository {
  async getResumeById(id: string): Promise<IResume | null> {
    const database = await getDatabase();
    const collection = database.collection(config.mongoCollectionName);
    const resumeDocument = await collection.findOne(
      buildResumeIdQuery(id),
      {
        projection: {
          _id: 1,
          text: 1,
          name: 1,
          email: 1,
          phone: 1,
          location: 1,
          company: 1,
          role: 1,
          jobTitles: 1,
          education: 1,
          skills: 1,
          totalExperience: 1,
          relevantExperience: 1,
          experienceSummary: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      }
    );

    return resumeDocument ? mapResumeDocument(resumeDocument as Record<string, unknown>) : null;
  }

  async vectorSearch(
    queryEmbedding: number[],
    filters: ISearchFilters = {},
    topK = 10
  ): Promise<IVectorMatch[]> {
    const normalizedEmbedding = normalizeEmbedding(queryEmbedding);

    if (!normalizedEmbedding) {
      logger.warn('ResumeRepository.vectorSearch received invalid query embedding');
      return [];
    }

    return this.vectorSearchFromAtlas(normalizedEmbedding, filters, topK);
  }

  async bm25Search(
    query: string,
    filters: ISearchFilters = {},
    topK = 10
  ): Promise<IVectorMatch[]> {
    const database = await getDatabase();
    const collection = database.collection(config.mongoCollectionName);
    const filterQuery = buildMongoFilters(filters);

    const pipeline = [
      {
        $search: {
          index: config.mongoBm25Index || 'BM25_Index',
          text: {
            query,
            path: ['text', 'skills', 'experienceSummary', 'jobTitles', 'currentTitle', 'currentOrganisation', 'locations'],
          },
        },
      },
      ...(Object.keys(filterQuery).length > 0 ? [{ $match: filterQuery }] : []),
      {
        $project: {
          _id: 1,
          text: 1,
          name: 1,
          email: 1,
          phone: 1,
          location: 1,
          company: 1,
          role: 1,
          jobTitles: 1,
          education: 1,
          skills: 1,
          totalExperience: 1,
          relevantExperience: 1,
          experienceSummary: 1,
          embedding: 1,
          score: { $meta: 'searchScore' },
        },
      },
      { $limit: topK },
    ];

    const results = await collection.aggregate(pipeline).toArray();

    return results.map((doc: Record<string, unknown>) => ({
      resume: mapResumeDocument(doc),
      score: typeof doc.score === 'number' ? doc.score : 0,
    }));
  }

  private async vectorSearchFromAtlas(
    queryEmbedding: number[],
    filters: ISearchFilters,
    topK: number
  ): Promise<IVectorMatch[]> {
    const database = await getDatabase();
    const collection = database.collection(config.mongoCollectionName);
    const filterQuery = buildMongoFilters(filters);
    const numCandidates = Math.max(topK * 10, 30);

    const pipeline = [
      {
        $vectorSearch: {
          index: config.mongoVectorIndexName || 'resume_vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates,
          limit: topK,
          ...(Object.keys(filterQuery).length > 0 ? { filter: filterQuery } : {}),
        },
      },
      {
        $project: {
          _id: 1,
          text: 1,
          name: 1,
          email: 1,
          phone: 1,
          location: 1,
          company: 1,
          role: 1,
          jobTitles: 1,
          education: 1,
          skills: 1,
          totalExperience: 1,
          relevantExperience: 1,
          experienceSummary: 1,
          embedding: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();

    return results.map((doc: Record<string, unknown>) => ({
      resume: mapResumeDocument(doc),
      score: typeof doc.score === 'number' ? doc.score : 0,
    }));
  }
}
