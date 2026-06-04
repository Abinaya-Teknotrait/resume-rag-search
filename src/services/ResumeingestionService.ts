import fs from 'fs';
import path from 'path';
import { AlgorithmResumeParser } from './AlgorithmResumeParser';
import { LLMResumeParser } from './LLMResumeParser';
import { ResumeParserService } from './ResumeParserService';
import { resumeIngestionRepository } from '../repositories/ResumeingestionRepository';
import { getLogger } from './LoggingService';
import { getEmbeddingService } from './EmbeddingService';
import { cleanText as normalizeText } from '../utils/textCleaner';
import { config } from '../config';

const logger = getLogger();

export class ResumeingestionService {
  private parser: any;
  private resumeParserService: ResumeParserService;

  constructor() {
    const useLlm = String(process.env.USE_LLM_PARSER || '').toLowerCase() === 'true';
    this.parser = useLlm ? new LLMResumeParser() : new AlgorithmResumeParser();
    this.resumeParserService = new ResumeParserService();
  }

  async saveUploadedFile(file: Express.Multer.File | any) {
    return {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path || file.filename || null,
    };
  }

  async buildDocumentFromFilePath(filePath: string, requestId = 'unknown') {
    const fileStats = await fs.promises.stat(filePath);
    const fileName = path.basename(filePath);
    const file = {
      originalname: fileName,
      mimetype: 'application/pdf',
      size: fileStats.size,
      path: filePath,
    } as any;

    logger.logServiceMethodEntry(requestId, 'ResumeingestionService', 'buildDocumentFromFilePath', {
      fileName,
      filePath,
    });

    const extractStart = Date.now();
    const rawExtractedText = await this.resumeParserService.extractTextFromPdf(filePath);
    const extractMs = Date.now() - extractStart;

    const cleanedText = normalizeText(rawExtractedText);

    const parseStart = Date.now();
    const parsed = await this.parse(cleanedText);
    const parseMs = Date.now() - parseStart;

    const embeddingInput = this.getEmbeddingInput(parsed || {}, cleanedText);
    const truncatedInput = this.truncateInput(embeddingInput);
    if (truncatedInput.length < embeddingInput.length) {
      logger.warn('Embedding text truncated for ingestion flow', {
        requestId,
        fileName,
        originalLength: embeddingInput.length,
        usedLength: truncatedInput.length,
      });
    }

    const embeddingStart = Date.now();
    const embeddingService = getEmbeddingService();
    const embeddingResult = await embeddingService.generateEmbedding(truncatedInput);
    const embeddingMs = Date.now() - embeddingStart;

    const doc: Record<string, unknown> = {
      fileName,
      rawText: cleanedText,
      name: parsed?.name,
      email: parsed?.email,
      phone: parsed?.phone,
      location: parsed?.location,
      company: parsed?.company,
      role: parsed?.role,
      education: parsed?.education,
      totalExperience: parsed?.totalExperience,
      skills: parsed?.skills,
      embedding: embeddingResult.embedding,
      embeddingModel: embeddingResult.model,
      embeddingDimension: embeddingResult.dimensions,
      ingestedAt: new Date().toISOString(),
    };

    const totalMs = extractMs + parseMs + embeddingMs;
    logger.logServiceMethodSuccess(requestId, 'ResumeingestionService', 'buildDocumentFromFilePath', totalMs, {
      fileName,
      extractMs,
      parseMs,
      embeddingMs,
    });

    return {
      doc,
      parsed,
      file,
      componentTimings: {
        extractMs,
        parseMs,
        embeddingMs,
      },
    };
  }

  async storeResumeDocument(doc: Record<string, unknown>, requestId = 'unknown') {
    try {
      const result = await resumeIngestionRepository.saveDocument(doc, requestId);
      return result;
    } catch (error) {
      logger.error('ResumeingestionService.storeResumeDocument failed', { requestId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  parse(text: string) {
    return Promise.resolve(this.parser.parseResume(text || ''));
  }

  private getEmbeddingInput(parsed: Record<string, unknown>, cleanedText: string): string {
    const name = parsed.name ? String(parsed.name) : '';
    const role = parsed.role ? String(parsed.role) : '';
    const skills = Array.isArray(parsed.skills) ? parsed.skills.join(', ') : String(parsed.skills || '');
    const company = parsed.company ? String(parsed.company) : '';

    return `${name}
${role}
${skills}
${company}
${cleanedText}`.trim();
  }

  private truncateInput(input: string): string {
    const maxLen = config.maxQueryLength || 2000;
    if (input.length <= maxLen) return input;
    return input.slice(0, maxLen);
  }

  async injectResume(file: Express.Multer.File | any, requestId = 'unknown') {
    // Final ingestion pipeline:
    // 1) PDF resume upload
    // 2) Extract text from PDF
    // 3) Clean/normalize text
    // 4) Parse structured fields via algorithm or optional LLM parser
    // 5) Generate embedding for the parsed + cleaned text
    // 6) Store the full document in MongoDB
    logger.logServiceMethodEntry(requestId, 'ResumeingestionService', 'injectResume', {
      fileName: file?.originalname || file?.filename,
    });

    const overallStart = Date.now();
    try {
      if (!file) {
        throw new Error('No file uploaded');
      }

      const filePath = file.path || file.filename || file.originalname;
      const buildResult = await this.buildDocumentFromFilePath(filePath, requestId);

      const storeStart = Date.now();
      const storeResult = await this.storeResumeDocument(buildResult.doc, requestId);
      const mongoInsertMs = Date.now() - storeStart;
      const totalMs = Date.now() - overallStart;

      logger.logServiceMethodSuccess(requestId, 'ResumeingestionService', 'injectResume', totalMs, {
        fileName: file.originalname || file.filename || path.basename(String(filePath)),
        ...buildResult.componentTimings,
        mongoInsertMs,
        totalMs,
      });

      return {
        parsed: buildResult.parsed,
        file: {
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path || file.filename || null,
        },
        embedding: {
          dimensions: buildResult.doc.embedding && Array.isArray(buildResult.doc.embedding) ? buildResult.doc.embedding.length : undefined,
          model: buildResult.doc.embeddingModel,
        },
        storeResult,
        componentTimings: {
          ...buildResult.componentTimings,
          mongoInsertMs,
          totalMs,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - overallStart;
      logger.logServiceMethodError(requestId, 'ResumeingestionService', 'injectResume', durationMs, error as Error, {
        fileName: file?.originalname || file?.filename,
      });
      throw error;
    }
  }
}
