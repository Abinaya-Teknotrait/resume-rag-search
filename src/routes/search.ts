import { Router, Request, Response, NextFunction } from 'express';
import {
  validateCandidates,
  validateFilters,
  validateMaxTokens,
  validateQuery,
  validateSummarizationStyle,
  validateTopK,
} from '../utils/validators';
import { SearchService } from '../services/SearchService';
import { getLLMService } from '../services/LLMService';
import {
  IApiResponse,
  ICandidate,
  IEndToEndSearchRequest,
  IEndToEndSearchResponse,
  IHybridSearchResponse,
  IRerankRequest,
  IRerankResponse,
  ISearchFilters,
  ISearchRequest,
  ISearchResponse,
  ISummarizeRequest,
  ISummarizeResponse,
} from '../types/API';
import { getLogger } from '../services/LoggingService';
import { config } from '../config';
import { ServiceUnavailableError, ValidationError } from '../utils/errors';

const router = Router();
const logger = getLogger();
const searchService = new SearchService();
const llmService = getLLMService();

function buildSearchResponse(
  requestId: string,
  startTime: number,
  data: ISearchResponse
): IApiResponse<ISearchResponse> {
  return {
    statusCode: 200,
    requestId,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    data,
  };
}

function buildHybridSearchResponse(
  requestId: string,
  startTime: number,
  data: IHybridSearchResponse
): IApiResponse<IHybridSearchResponse> {
  return {
    statusCode: 200,
    requestId,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    data,
  };
}

function buildEndToEndSearchResponse(
  requestId: string,
  startTime: number,
  data: IEndToEndSearchResponse
): IApiResponse<IEndToEndSearchResponse> {
  return {
    statusCode: 200,
    requestId,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    data,
  };
}

function buildRerankResponse(
  requestId: string,
  startTime: number,
  data: IRerankResponse
): IApiResponse<IRerankResponse> {
  return {
    statusCode: 200,
    requestId,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    data,
  };
}

function buildSummarizeResponse(
  requestId: string,
  startTime: number,
  data: ISummarizeResponse
): IApiResponse<ISummarizeResponse> {
  return {
    statusCode: 200,
    requestId,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    data,
  };
}

function normalizeCandidate(candidate: unknown): ICandidate {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new ValidationError('Each candidate must be a valid object');
  }

  const raw = candidate as Record<string, unknown>;
  const id = typeof raw._id === 'string' ? raw._id : typeof raw.resumeId === 'string' ? raw.resumeId : undefined;
  const snippet = typeof raw.snippet === 'string' ? raw.snippet : typeof raw.text === 'string' ? raw.text : undefined;

  if (!id || !snippet) {
    throw new ValidationError('Each candidate must include _id or resumeId and snippet or text');
  }

  return {
    ...raw,
    _id: id,
    resumeId: id,
    snippet,
    text: snippet,
    score: typeof raw.score === 'number' ? raw.score : undefined,
  } as ICandidate;
}

router.post('/v1/search/bm25', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).id || 'unknown';
  const startTime = Date.now();

  try {
    const payload = req.body as ISearchRequest;

    validateQuery(payload.query);

    const topK = validateTopK(payload.topK);
    const filters = validateFilters(payload.filters) as ISearchFilters;

    logger.debug('POST /v1/search/bm25 called', {
      requestId,
      query: payload.query,
      topK,
      filters,
    });

    const data = await searchService.bm25Search(payload.query, filters, topK);
    const response = buildSearchResponse(requestId, startTime, data);

    logger.info('POST /v1/search/bm25 succeeded', {
      requestId,
      statusCode: response.statusCode,
      durationMs: response.durationMs,
      resultCount: data.count,
    });

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/v1/search/vector', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).id || 'unknown';
  const startTime = Date.now();

  try {
    const payload = req.body as ISearchRequest;

    validateQuery(payload.query);

    const topK = validateTopK(payload.topK);
    const filters = validateFilters(payload.filters) as ISearchFilters;

    logger.debug('POST /v1/search/vector called', {
      requestId,
      query: payload.query,
      topK,
      filters,
    });

    const data = await searchService.vectorSearch(payload.query, filters, topK);
    const response = buildSearchResponse(requestId, startTime, data);

    logger.info('POST /v1/search/vector succeeded', {
      requestId,
      statusCode: response.statusCode,
      durationMs: response.durationMs,
      resultCount: data.count,
    });

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/v1/search/hybrid', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).id || 'unknown';
  const startTime = Date.now();

  try {
    const payload = req.body as ISearchRequest;

    validateQuery(payload.query);

    const topK = validateTopK(payload.topK);
    const filters = validateFilters(payload.filters) as ISearchFilters;

    logger.debug('POST /v1/search/hybrid called', {
      requestId,
      query: payload.query,
      topK,
      filters,
    });

    const data = await searchService.hybridSearch(payload.query, filters, topK);
    const response = buildHybridSearchResponse(requestId, startTime, data);

    logger.info('POST /v1/search/hybrid succeeded', {
      requestId,
      statusCode: response.statusCode,
      durationMs: response.durationMs,
      bm25Count: data.bm25Count,
      vectorCount: data.vectorCount,
    });

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/v1/search', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).id || 'unknown';
  const startTime = Date.now();

  try {
    const payload = req.body as IEndToEndSearchRequest;

    validateQuery(payload.query);

    const topK = validateTopK(payload.topK);
    const summarizeTopK = validateTopK(payload.summarizeTopK, 3);
    const filters = validateFilters(payload.filters) as ISearchFilters;
    const summarizeStyle = validateSummarizationStyle(
      payload.summarizeStyle,
      config.defaultSummarizationStyle
    );

    logger.debug('POST /v1/search called', {
      requestId,
      query: payload.query,
      topK,
      summarize: payload.summarize === true,
      summarizeTopK,
      summarizeStyle,
      filters,
    });

    const data = await searchService.endToEndSearch(payload.query, filters, {
      topK,
      summarize: payload.summarize === true,
      summarizeTopK,
      summarizeStyle,
    });

    const response = buildEndToEndSearchResponse(requestId, startTime, data);

    logger.info('POST /v1/search succeeded', {
      requestId,
      statusCode: response.statusCode,
      durationMs: response.durationMs,
      resultCount: data.count,
      summarizeCount: data.summaries?.length ?? 0,
    });

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/v1/search/rerank', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).id || 'unknown';
  const startTime = Date.now();

  try {
    const payload = req.body as IRerankRequest;

    validateQuery(payload.query);
    let candidates = validateCandidates(payload.candidates).map(normalizeCandidate);
    let clamped = false;
    if (candidates.length > config.maxCandidatesToRerank) {
      candidates = candidates.slice(0, config.maxCandidatesToRerank);
      clamped = true;
    }

    const topK = payload.topK === undefined ? config.rerankTopK : validateTopK(payload.topK, config.rerankTopK);
    const effectiveTopK = Math.min(topK, candidates.length);

    logger.debug('POST /v1/search/rerank called', {
      requestId,
      query: payload.query,
      requestedTopK: topK,
      effectiveTopK,
      candidateCount: candidates.length,
      clamped,
      model: config.groqLlmModel,
    });

    const data = await llmService.rerankCandidates(payload.query, candidates, effectiveTopK);
    const response = buildRerankResponse(requestId, startTime, data);

    logger.info('POST /v1/search/rerank succeeded', {
      requestId,
      statusCode: response.statusCode,
      durationMs: response.durationMs,
      rankedCount: data.results.length,
      model: config.groqLlmModel,
    });

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/v1/search/summarize', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).id || 'unknown';
  const startTime = Date.now();

  try {
    if (!config.enableSummarization) {
      throw new ServiceUnavailableError('Summarization is disabled');
    }

    const payload = req.body as ISummarizeRequest;

    validateQuery(payload.query);
    const candidate = normalizeCandidate(payload.candidate);
    const style = validateSummarizationStyle(payload.style, config.defaultSummarizationStyle);
    const maxTokens = validateMaxTokens(payload.maxTokens, config.summarizationDefaultMaxTokens);

    logger.debug('POST /v1/search/summarize called', {
      requestId,
      query: payload.query,
      candidateId: candidate.resumeId || candidate._id,
      style,
      maxTokens,
      model: config.groqLlmModel,
    });

    const data = await llmService.summarizeCandidateFit(payload.query, candidate, {
      style,
      maxTokens,
    });
    const response = buildSummarizeResponse(requestId, startTime, data);

    logger.info('POST /v1/search/summarize succeeded', {
      requestId,
      statusCode: response.statusCode,
      durationMs: response.durationMs,
      tokensUsed: data.tokensUsed,
      model: config.groqLlmModel,
    });

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
