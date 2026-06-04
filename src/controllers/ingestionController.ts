import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { ResumeParserService } from '../services/ResumeParserService';
import { ResumeingestionService } from '../services/ResumeingestionService';
import { BatchUploadService } from '../services/BatchUploadService';
import { getBatchUploadQueueService } from '../services/BatchUploadQueueService';
import { cleanText as normalizeText } from '../utils/textCleaner';
import { getEmbeddingService } from '../services/EmbeddingService';
import { validateEmbeddingInput } from '../utils/validators';
import { config } from '../config';
import { getLogger } from '../services/LoggingService';

const logger = getLogger();

const parser = new ResumeParserService();
const ingestionService = new ResumeingestionService();
const batchUploadService = new BatchUploadService();
const batchUploadQueueService = getBatchUploadQueueService();

export async function injectResume(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as any).file;
    const requestId = (req as any).id || 'unknown';

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await ingestionService.injectResume(file, requestId);
    return res.status(200).json({
      statusCode: 200,
      requestId,
      timestamp: new Date().toISOString(),
      message: 'Resume uploaded and processed successfully.',
      data: result,
      errors: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function batchUploadResumes(req: Request, res: Response, next: NextFunction) {
  try {
    const requestId = (req as any).id || 'unknown';
    const { sourceFolder, batchSize, workers, retryAttempts } = req.body || {};

    const result = await batchUploadService.uploadFolder(
      {
        sourceFolder,
        batchSize,
        workers,
        retryAttempts,
      },
      requestId
    );

    return res.status(200).json({
      statusCode: 200,
      requestId,
      timestamp: new Date().toISOString(),
      message: 'Batch resume upload completed successfully',
      data: result,
      errors: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function enqueueBatchUpload(req: Request, res: Response, next: NextFunction) {
  try {
    const requestId = (req as any).id || 'unknown';
    const { sourceFolder, batchSize, workers, retryAttempts } = req.body || {};

    const job = batchUploadQueueService.enqueueBatchUpload(
      {
        sourceFolder,
        batchSize,
        workers,
        retryAttempts,
      },
      requestId
    );

    return res.status(202).json({
      statusCode: 202,
      requestId,
      timestamp: new Date().toISOString(),
      message: 'Batch upload job enqueued successfully',
      data: job,
      errors: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getBatchUploadQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const requestId = (req as any).id || 'unknown';
    const jobs = batchUploadQueueService.getJobs();
    return res.status(200).json({
      statusCode: 200,
      requestId,
      timestamp: new Date().toISOString(),
      message: 'Batch upload queue jobs retrieved successfully',
      data: jobs,
      errors: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getBatchUploadQueueJob(req: Request, res: Response, next: NextFunction) {
  try {
    const requestId = (req as any).id || 'unknown';
    const { jobId } = req.params;
    const job = batchUploadQueueService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        statusCode: 404,
        requestId,
        timestamp: new Date().toISOString(),
        message: `Batch upload job ${jobId} not found`,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Job not found' },
      });
    }

    return res.status(200).json({
      statusCode: 200,
      requestId,
      timestamp: new Date().toISOString(),
      message: 'Batch upload queue job retrieved successfully',
      data: job,
      errors: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function uploadResume(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await ingestionService.saveUploadedFile(file);
    const storedName = result.path || (result as any).filename || '';
    const filename = storedName ? path.basename(storedName) : '';
    const response = {
      statusCode: 200,
      message: 'Resume uploaded successfully (Phase 2)',
      data: {
        filename,
        originalName: result.originalname || file.originalname,
        size: result.size || file.size,
        mimetype: result.mimetype || file.mimetype,
        uploadedAt: new Date().toISOString(),
        nextStep: 'Use /v1/resume/extract to extract text from the uploaded file',
      },
      errors: null,
    };

    return res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
}

export async function extractText(req: Request, res: Response, next: NextFunction) {
  try {
    const { filePath } = req.body || {};
    if (!filePath) return res.status(400).json({ message: 'filePath is required' });

    const text = await parser.extractTextFromPdf(filePath);
    return res.status(200).json({ status: 'ok', text });
  } catch (err) {
    return next(err);
  }
}

export async function cleanText(req: Request, res: Response, next: NextFunction) {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ message: 'text is required' });

    const cleaned = normalizeText(text);
    return res.status(200).json({ status: 'ok', cleaned });
  } catch (err) {
    return next(err);
  }
}

export async function detectSkills(req: Request, res: Response, next: NextFunction) {
  try {
    const bodyText = (req.body as any)?.text;
    const queryText = (req.query as any)?.text;
    const text = bodyText || queryText;

    if (!text) return res.status(400).json({ message: 'text is required' });

    const parsed = (ingestionService as any).parse ? await (ingestionService as any).parse(text) : {};
    const skills = parsed?.skills || [];
    return res.status(200).json({
      statusCode: 200,
      message: 'Skills detected successfully (Phase 7)',
      data: { skills },
      errors: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function llmParseResume(req: Request, res: Response, next: NextFunction) {
  try {
    const useLlm = String(process.env.USE_LLM_PARSER || '').toLowerCase() === 'true';
    if (!useLlm) {
      return res.status(503).json({ statusCode: 503, message: 'LLM parser is disabled', data: null });
    }

    const { text } = req.body || {};
    if (!text) return res.status(400).json({ message: 'text is required' });

    const parsed = (ingestionService as any).parse ? await (ingestionService as any).parse(text) : {};

    const response = {
      statusCode: 200,
      message: 'Resume parsed by LLM (Phase 8) - placeholder',
      data: parsed,
      errors: null,
    };
    return res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
}

export async function parseResume(req: Request, res: Response, next: NextFunction) {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ message: 'text is required' });

    const parsed = (ingestionService as any).parse ? await (ingestionService as any).parse(text) : {};
    // Remove rawText before returning to avoid leaking full resume content
    if (parsed && typeof parsed === 'object' && 'rawText' in parsed) {
      // create a shallow copy without rawText
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { rawText, ...rest } = parsed as any;
      const response = {
        statusCode: 200,
        message: 'Resume parsed successfully (Phase 5)',
        data: rest,
        errors: null,
      };
      return res.status(200).json(response);
    }

    const response = {
      statusCode: 200,
      message: 'Resume parsed successfully (Phase 5)',
      data: parsed,
      errors: null,
    };
    return res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
}

export async function embedResume(req: Request, res: Response, next: NextFunction) {
  try {
    const { text, model } = req.body || {};
    if (!text) return res.status(400).json({ message: 'text is required' });

    // Truncate input if it exceeds configured max length to avoid provider errors
    const maxLen = config.maxQueryLength || 2000;
    let usedText = text as string;
    let truncated = false;
    let originalLength: number | undefined = undefined;

    if (typeof usedText === 'string' && usedText.length > maxLen) {
      originalLength = usedText.length;
      usedText = usedText.slice(0, maxLen);
      truncated = true;
      logger.warn('Embedding input truncated to max length', { originalLength, maxLen });
    }

    validateEmbeddingInput(usedText);

    const embeddingService = getEmbeddingService();
    const result = await embeddingService.generateEmbedding(usedText, model);

    const response = {
      statusCode: 200,
      message: 'Embedding generated successfully (Phase 9)',
      data: {
        embedding: result.embedding,
        dimensions: result.dimensions,
        model: result.model,
        tokensUsed: result.tokensUsed,
        truncated,
        originalLength,
        usedLength: (result.embedding || []).length ? usedText.length : undefined,
      },
      errors: null,
    };

    return res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
}

export async function storeResume(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body || {};
    if (!body || typeof body !== 'object') return res.status(400).json({ message: 'Request body must be a JSON object' });

    // Minimal validation: require fileName and rawText
    const fileName = (body as any).fileName || (body as any).filename || (body as any).fileName;
    const rawText = (body as any).rawText || (body as any).raw_text || (body as any).text;

    if (!fileName || !rawText) return res.status(400).json({ message: 'fileName and rawText are required' });

    // Build document with metadata
    const doc: Record<string, unknown> = {
      ...body,
      fileName,
      rawText,
      ingestedAt: new Date().toISOString(),
    };

    const result = await (ingestionService as any).storeResumeDocument(doc);

    return res.status(200).json({ statusCode: 200, message: 'Resume stored successfully (Phase 10)', data: result, errors: null });
  } catch (err) {
    return next(err);
  }
}
