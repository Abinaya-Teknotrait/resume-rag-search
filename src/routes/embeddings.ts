import { Router, Request, Response, NextFunction } from 'express';
import { getLogger } from '../services/LoggingService';
import { getEmbeddingService } from '../services/EmbeddingService';
import { IEmbeddingRequest, IEmbeddingResponse, IApiResponse } from '../types/API';
import { validateEmbeddingInput, validateModel } from '../utils/validators';

const router = Router();
const logger = getLogger();

/**
 * POST /v1/embeddings
 * Generate vector embedding for input text using Mistral API
 *
 * Request body:
 * {
 *   "input": "text to embed",
 *   "model": "mistral-embed" (optional)
 * }
 *
 * Response:
 * {
 *   "statusCode": 200,
 *   "requestId": "uuid",
 *   "timestamp": "ISO-8601",
 *   "data": {
 *     "embedding": [0.123, -0.456, ...],
 *     "dimensions": 1024,
 *     "model": "mistral-embed",
 *     "tokensUsed": 42
 *   }
 * }
 */
router.post('/v1/embeddings', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).id || 'unknown';
  const startTime = Date.now();

  try {
    // ========================================================================
    // 1. Extract and validate request body
    // ========================================================================

    const { input, model } = req.body as IEmbeddingRequest;

    // Validate required field
    validateEmbeddingInput(input);

    // Validate optional field
    const validatedModel = validateModel(model);

    // ========================================================================
    // 2. Log request entry
    // ========================================================================

    logger.debug('POST /v1/embeddings called', {
      requestId,
      method: 'POST',
      endpoint: '/v1/embeddings',
      inputLength: input.length,
      model: validatedModel,
    });

    // ========================================================================
    // 3. Call EmbeddingService
    // ========================================================================

    const embeddingService = getEmbeddingService();
    const result = await embeddingService.generateEmbedding(input, validatedModel);

    // ========================================================================
    // 4. Build response
    // ========================================================================

    const data: IEmbeddingResponse = {
      embedding: result.embedding,
      dimensions: result.dimensions,
      model: result.model,
      tokensUsed: result.tokensUsed,
    };

    const response: IApiResponse<IEmbeddingResponse> = {
      statusCode: 200,
      requestId,
      timestamp: new Date().toISOString(),
      data,
    };

    // ========================================================================
    // 5. Log success
    // ========================================================================

    const durationMs = Date.now() - startTime;
    logger.info('POST /v1/embeddings succeeded', {
      requestId,
      method: 'POST',
      endpoint: '/v1/embeddings',
      durationMs,
      statusCode: 200,
      dimensions: result.dimensions,
      tokensUsed: result.tokensUsed,
      model: result.model,
    });

    res.status(200).json(response);
  } catch (error) {
    // Error handling delegated to middleware
    next(error);
  }
});

export default router;
