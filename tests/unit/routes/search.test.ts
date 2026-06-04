import axios from 'axios';
import request from 'supertest';
import { createExpressApp } from '../../../src/app';

describe('Search routes', () => {
  beforeAll(() => {
    process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'test-key';
    process.env.GROQ_LLM_MODEL = process.env.GROQ_LLM_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
    process.env.LLM_API_TIMEOUT = process.env.LLM_API_TIMEOUT || '30000';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should expose POST /v1/search/rerank', async () => {
    jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        choices: [
          {
            message: {
              content:
                '{"rankedIds":["candidate-2","candidate-1"],"scores":[0.99,0.87]}',
            },
          },
        ],
      },
    } as never);

    const app = createExpressApp();

    const response = await request(app)
      .post('/v1/search/rerank')
      .send({
        query: 'banking',
        candidates: [
          {
            _id: 'candidate-1',
            snippet: 'Java backend engineer',
            _score: 78,
            _explanation: 'Matches Java and backend requirements.',
          },
          {
            _id: 'candidate-2',
            snippet: 'Banking operations analyst',
            _score: 91,
            _explanation: 'Strong banking domain match.',
          },
        ],
        topK: 2,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.results).toHaveLength(2);
    expect(response.body.data.results[0]._id).toEqual('candidate-2');
    expect(response.body.data.results[0]._score).toEqual(91);
    expect(response.body.data.results[0]._explanation).toEqual('Strong banking domain match.');
    expect(response.body.data.results[1]._id).toEqual('candidate-1');
    expect(response.body.data.results[1]._score).toEqual(78);
    expect(response.body.data.results[1]._explanation).toEqual('Matches Java and backend requirements.');
    expect(response.body.data.scores).toEqual([0.99, 0.87]);
  });

  it('should clamp topK to the number of provided candidates', async () => {
    jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        choices: [
          {
            message: {
              content:
                '{"rankedIds":["candidate-2","candidate-1"],"scores":[0.9,0.1]}',
            },
          },
        ],
      },
    } as never);

    const app = createExpressApp();

    const response = await request(app)
      .post('/v1/search/rerank')
      .send({
        query: 'banking',
        candidates: [
          { resumeId: 'candidate-1', snippet: 'Java backend engineer' },
          { resumeId: 'candidate-2', snippet: 'Banking operations analyst' },
        ],
        topK: 10,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.results).toHaveLength(2);
    expect(response.body.data.results[0]._id).toEqual('candidate-2');
    expect(response.body.data.results[1]._id).toEqual('candidate-1');
    expect(response.body.data.scores).toEqual([0.9, 0.1]);
  });

  it('should expose POST /v1/search/summarize', async () => {
    jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        choices: [
          {
            message: {
              content: 'Strong fit for backend engineering roles.',
            },
          },
        ],
      },
    } as never);

    const app = createExpressApp();

    const response = await request(app)
      .post('/v1/search/summarize')
      .send({
        query: 'senior node.js backend engineer',
        candidate: {
          resumeId: 'candidate-1',
          snippet: 'Node.js developer with MongoDB and Express experience',
        },
        style: 'short',
        maxTokens: 80,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.summary).toBe('Strong fit for backend engineering roles.');
    expect(response.body.data.tokensUsed).toBeGreaterThan(0);
  });

  it('should expose POST /v1/search and return reranked results with summaries', async () => {
    jest.spyOn(axios, 'post')
      .mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content:
                  '{"rankedIds":["resume-2","resume-1"],"scores":[0.98,0.91]}',
              },
            },
          ],
        },
      } as never)
      .mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: 'Strong backend fit for the requested role.',
              },
            },
          ],
          usage: {
            total_tokens: 50,
          },
        },
      } as never);

    const serviceSpy = jest
      .spyOn(require('../../../src/services/SearchService').SearchService.prototype, 'endToEndSearch')
      .mockResolvedValue({
        results: [
          {
            _id: 'resume-2',
            name: 'Backend Candidate',
            text: 'Backend engineering specialist with Node.js and MongoDB experience',
            company: 'Acme',
            role: 'Software Engineer',
            location: 'Remote',
            score: 0.98,
          },
        ],
        summaries: ['Strong backend fit for the requested role.'],
        count: 1,
        componentTimings: {
          rerankMs: 25,
          summarizeMs: 30,
        },
        fallbacks: {
          bm25Fallback: false,
          vectorFallback: false,
          rerankFallback: false,
          summarizeFallback: false,
        },
      } as never);

    const app = createExpressApp();

    const response = await request(app)
      .post('/v1/search')
      .send({
        query: 'backend engineer',
        topK: 2,
        summarize: true,
        summarizeTopK: 1,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.results[0]._id).toBe('resume-2');
    expect(response.body.data.summaries).toEqual(['Strong backend fit for the requested role.']);
    expect(serviceSpy).toHaveBeenCalledWith(
      'backend engineer',
      {},
      expect.objectContaining({
        topK: 2,
        summarize: true,
        summarizeTopK: 1,
      })
    );
  });
});
