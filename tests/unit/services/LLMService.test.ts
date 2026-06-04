import axios from 'axios';
import { LLMService } from '../../../src/services/LLMService';

describe('LLMService', () => {
  beforeAll(() => {
    process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'test-key';
    process.env.GROQ_LLM_MODEL = process.env.GROQ_LLM_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
    process.env.LLM_API_TIMEOUT = process.env.LLM_API_TIMEOUT || '30000';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should rerank candidates using the configured Groq model', async () => {
    jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        choices: [
          {
            message: {
              content:
                '{"rankedIds":["candidate-2","candidate-1"],"scores":[0.96,0.84]}',
            },
          },
        ],
      },
    } as never);

    const service = new LLMService();
    const result = await service.rerankCandidates(
      'banking experience',
      [
        {
          _id: 'candidate-1',
          snippet: 'Java backend engineer',
          _score: 78,
          _explanation: 'Matches Java and backend requirements.',
        },
        {
          _id: 'candidate-2',
          snippet: 'Banking operations analyst with 5 years experience',
          _score: 91,
          _explanation: 'Strong banking domain match.',
        },
      ],
      2
    );

    expect(result.results).toHaveLength(2);
    expect(result.results[0]._id).toEqual('candidate-2');
    expect(result.results[0]._score).toEqual(91);
    expect(result.results[0]._explanation).toEqual('Strong banking domain match.');
    expect(result.results[1]._id).toEqual('candidate-1');
    expect(result.results[1]._score).toEqual(78);
    expect(result.results[1]._explanation).toEqual('Matches Java and backend requirements.');
    expect(result.scores).toEqual([0.96, 0.84]);
  });

  it('should summarize a candidate using the configured Groq model', async () => {
    jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        choices: [
          {
            message: {
              content: 'Candidate is a strong fit for backend engineering roles.',
            },
          },
        ],
      },
    } as never);

    const service = new LLMService();
    const result = await service.summarizeCandidateFit(
      'senior node.js backend engineer',
      {
        _id: 'candidate-1',
        snippet: 'Node.js developer with MongoDB and Express experience',
      },
      { style: 'short', maxTokens: 80 }
    );

    expect(result.summary).toBe('Candidate is a strong fit for backend engineering roles.');
    expect(result.tokensUsed).toBeGreaterThan(0);
  });
});
