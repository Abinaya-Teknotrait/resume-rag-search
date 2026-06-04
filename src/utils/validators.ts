import { config, constants } from '../config';
import { ValidationError } from './errors';

/**
 * Validation utilities for API inputs
 */

/**
 * Validate query string: not empty, within length limits
 * @throws ValidationError if invalid
 */
export function validateQuery(query: unknown): asserts query is string {
  if (typeof query !== 'string') {
    throw new ValidationError('Field "query" must be a string');
  }

  if (query.trim().length === 0) {
    throw new ValidationError('Field "query" is required and must not be empty');
  }

  if (query.length > config.maxQueryLength) {
    throw new ValidationError(
      `Field "query" exceeds maximum length of ${config.maxQueryLength} characters`
    );
  }
}

/**
 * Validate topK parameter: must be positive integer within bounds
 * @throws ValidationError if invalid
 */
export function validateTopK(topK: unknown, defaultValue = constants.DEFAULT_TOP_K): number {
  if (topK === undefined || topK === null) {
    return defaultValue;
  }

  const topKNum =
    typeof topK === 'string'
      ? parseInt(topK, 10)
      : typeof topK === 'number'
        ? topK
        : Number.NaN;

  if (!Number.isInteger(topKNum) || Number.isNaN(topKNum)) {
    throw new ValidationError('Field "topK" must be an integer');
  }

  if (topKNum < constants.MIN_TOP_K || topKNum > constants.MAX_TOP_K) {
    throw new ValidationError(
      `Field "topK" must be between ${constants.MIN_TOP_K} and ${constants.MAX_TOP_K}`
    );
  }

  return topKNum;
}

/**
 * Validate filter object (optional, flexible structure)
 * @throws ValidationError if filter is not an object
 */
export function validateFilters(filters: unknown): Record<string, unknown> {
  if (filters === undefined || filters === null) {
    return {};
  }

  if (typeof filters !== 'object' || Array.isArray(filters)) {
    throw new ValidationError('Field "filters" must be an object');
  }

  return filters as Record<string, unknown>;
}

/**
 * Validate candidates array: not empty, within batch size limits
 * @throws ValidationError if invalid
 */
export function validateCandidates(candidates: unknown): unknown[] {
  if (!Array.isArray(candidates)) {
    throw new ValidationError('Field "candidates" must be an array');
  }

  if (candidates.length === 0) {
    throw new ValidationError('Field "candidates" cannot be empty');
  }

  if (candidates.length > constants.MAX_CANDIDATES_BATCH) {
    throw new ValidationError(
      `Field "candidates" exceeds maximum batch size of ${constants.MAX_CANDIDATES_BATCH}`
    );
  }

  return candidates;
}

/**
 * Validate input text for embedding
 * @throws ValidationError if invalid
 */
export function validateEmbeddingInput(input: unknown): asserts input is string {
  if (typeof input !== 'string') {
    throw new ValidationError('Field "input" must be a string');
  }

  if (input.trim().length === 0) {
    throw new ValidationError('Field "input" is required and must not be empty');
  }

  if (input.length > config.maxQueryLength) {
    throw new ValidationError(
      `Field "input" exceeds maximum length of ${config.maxQueryLength} characters`
    );
  }
}

/**
 * Validate model name (optional)
 */
export function validateModel(model: unknown): string | undefined {
  if (model === undefined || model === null) {
    return undefined;
  }

  if (typeof model !== 'string') {
    throw new ValidationError('Field "model" must be a string');
  }

  if (model.trim().length === 0) {
    throw new ValidationError('Field "model" cannot be empty');
  }

  return model;
}

/**
 * Validate summarization style
 * @throws ValidationError if invalid
 */
export function validateSummarizationStyle(
  style: unknown,
  defaultValue: 'short' | 'detailed' = 'short'
): 'short' | 'detailed' {
  if (style === undefined || style === null) {
    return defaultValue;
  }

  if (typeof style !== 'string') {
    throw new ValidationError('Field "style" must be a string ("short" or "detailed")');
  }

  if (style !== 'short' && style !== 'detailed') {
    throw new ValidationError('Field "style" must be either "short" or "detailed"');
  }

  return style;
}

/**
 * Validate maxTokens parameter
 * @throws ValidationError if invalid
 */
export function validateMaxTokens(maxTokens: unknown, defaultValue = 300): number {
  if (maxTokens === undefined || maxTokens === null) {
    return defaultValue;
  }

  const maxTokensNum =
    typeof maxTokens === 'string'
      ? parseInt(maxTokens, 10)
      : typeof maxTokens === 'number'
        ? maxTokens
        : Number.NaN;

  if (!Number.isInteger(maxTokensNum) || Number.isNaN(maxTokensNum)) {
    throw new ValidationError('Field "maxTokens" must be an integer');
  }

  if (maxTokensNum < 10 || maxTokensNum > 2000) {
    throw new ValidationError('Field "maxTokens" must be between 10 and 2000');
  }

  return maxTokensNum;
}

/**
 * Validate request body is JSON object
 * @throws ValidationError if not an object
 */
export function validateRequestBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a valid JSON object');
  }

  return body as Record<string, unknown>;
}
