import {
  validateQuery,
  validateTopK,
  validateFilters,
  validateCandidates,
  validateEmbeddingInput,
} from '../../../src/utils/validators';
import { ValidationError } from '../../../src/utils/errors';

describe('Validators', () => {
  describe('validateQuery', () => {
    it('should pass for valid query', () => {
      const validQuery = 'senior backend engineer';
      expect(() => validateQuery(validQuery)).not.toThrow();
    });

    it('should throw error for non-string query', () => {
      expect(() => validateQuery(123)).toThrow(ValidationError);
      expect(() => validateQuery(null)).toThrow(ValidationError);
      expect(() => validateQuery(undefined)).toThrow(ValidationError);
      expect(() => validateQuery({ query: 'test' })).toThrow(ValidationError);
    });

    it('should throw error for empty query', () => {
      expect(() => validateQuery('')).toThrow(ValidationError);
      expect(() => validateQuery('   ')).toThrow(ValidationError);
    });

    it('should throw error for query exceeding max length', () => {
      const longQuery = 'a'.repeat(2001); // MAX_REQUEST_SIZE = 2000
      expect(() => validateQuery(longQuery)).toThrow(ValidationError);
    });
  });

  describe('validateTopK', () => {
    it('should return default value if topK is undefined', () => {
      const result = validateTopK(undefined);
      expect(result).toBe(20); // DEFAULT_TOP_K
    });

    it('should return provided topK if valid', () => {
      expect(validateTopK(10)).toBe(10);
      expect(validateTopK('50')).toBe(50);
    });

    it('should throw error for invalid topK', () => {
      expect(() => validateTopK('abc')).toThrow(ValidationError);
      expect(() => validateTopK(0)).toThrow(ValidationError); // Min is 1
      expect(() => validateTopK(101)).toThrow(ValidationError); // Max is 100
      expect(() => validateTopK(3.14)).toThrow(ValidationError); // Must be integer
    });
  });

  describe('validateFilters', () => {
    it('should return empty object if filters undefined', () => {
      expect(validateFilters(undefined)).toEqual({});
      expect(validateFilters(null)).toEqual({});
    });

    it('should return filters object if valid', () => {
      const filters = { minYearsExperience: 5, location: 'New York' };
      expect(validateFilters(filters)).toEqual(filters);
    });

    it('should throw error if filters is not an object', () => {
      expect(() => validateFilters('string')).toThrow(ValidationError);
      expect(() => validateFilters([1, 2, 3])).toThrow(ValidationError);
      expect(() => validateFilters(123)).toThrow(ValidationError);
    });
  });

  describe('validateCandidates', () => {
    it('should pass for valid candidates array', () => {
      const candidates = [
        { _id: '1', text: 'resume 1' },
        { _id: '2', text: 'resume 2' },
      ];
      expect(validateCandidates(candidates)).toEqual(candidates);
    });

    it('should throw error if not an array', () => {
      expect(() => validateCandidates('string')).toThrow(ValidationError);
      expect(() => validateCandidates({ _id: '1' })).toThrow(ValidationError);
      expect(() => validateCandidates(null)).toThrow(ValidationError);
    });

    it('should throw error for empty array', () => {
      expect(() => validateCandidates([])).toThrow(ValidationError);
    });

    it('should throw error if exceeding batch size', () => {
      const oversizedArray = Array(101).fill({ _id: '1', text: 'test' });
      expect(() => validateCandidates(oversizedArray)).toThrow(ValidationError);
    });
  });

  describe('validateEmbeddingInput', () => {
    it('should pass for valid input', () => {
      const validInput = 'This is a resume text';
      expect(() => validateEmbeddingInput(validInput)).not.toThrow();
    });

    it('should throw error for non-string input', () => {
      expect(() => validateEmbeddingInput(123)).toThrow(ValidationError);
      expect(() => validateEmbeddingInput(null)).toThrow(ValidationError);
      expect(() => validateEmbeddingInput([])).toThrow(ValidationError);
    });

    it('should throw error for empty input', () => {
      expect(() => validateEmbeddingInput('')).toThrow(ValidationError);
      expect(() => validateEmbeddingInput('   ')).toThrow(ValidationError);
    });

    it('should throw error for input exceeding max length', () => {
      const longInput = 'a'.repeat(2001);
      expect(() => validateEmbeddingInput(longInput)).toThrow(ValidationError);
    });
  });
});
