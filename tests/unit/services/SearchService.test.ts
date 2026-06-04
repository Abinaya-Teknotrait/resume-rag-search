import { SearchService } from '../../../src/services/SearchService';
import { IResume } from '../../../src/types/API';

describe('SearchService', () => {
  const resumeA: IResume = {
    _id: 'resume-1',
    name: 'Alice Johnson',
    text: 'QA Engineer with Selenium and Java experience',
    location: 'Chennai, India',
    company: 'TCS',
    role: 'QA Engineer',
    skills: ['Java', 'Selenium'],
    totalExperience: 3,
    relevantExperience: 3,
  };

  const resumeB: IResume = {
    _id: 'resume-2',
    name: 'Bob Smith',
    text: 'Backend engineer focusing on Node.js and MongoDB',
    location: 'Bangalore, India',
    company: 'Acme Labs',
    role: 'Software Engineer',
    skills: ['Node.js', 'MongoDB'],
    totalExperience: 5,
    relevantExperience: 4,
  };

  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns BM25 results and preserves scores for bm25Search', async () => {
    const repository = {
      bm25Search: jest.fn().mockResolvedValue([
        { resume: resumeA, score: 0.91 },
        { resume: resumeB, score: 0.74 },
      ]),
      vectorSearch: jest.fn(),
    };

    const embeddingService = {
      generateEmbedding: jest.fn(),
    };

    const service = new SearchService(
      repository as never,
      embeddingService as never,
      logger as never
    );

    const response = await service.bm25Search('QA Engineer', { locations: 'Chennai, India' }, 2);

    expect(repository.bm25Search).toHaveBeenCalledWith(
      'QA Engineer',
      { locations: 'Chennai, India' },
      2
    );
    expect(embeddingService.generateEmbedding).not.toHaveBeenCalled();
    const { text: bm25TextA, ...resumeAWithoutText } = resumeA;
    const { text: bm25TextB, ...resumeBWithoutText } = resumeB;

    expect(response).toEqual({
      results: [
        {
          ...resumeAWithoutText,
          snippet: bm25TextA,
        },
        {
          ...resumeBWithoutText,
          snippet: bm25TextB,
        },
      ],
      count: 2,
      scores: [0.91, 0.74],
      componentTimings: {
        bm25Ms: expect.any(Number),
      },
    });
  });

  it('generates an embedding and returns vector search results for vectorSearch', async () => {
    const repository = {
      bm25Search: jest.fn(),
      vectorSearch: jest.fn().mockResolvedValue([
        { resume: resumeA, score: 0.88 },
      ]),
    };

    const embeddingService = {
      generateEmbedding: jest.fn().mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
      }),
    };

    const service = new SearchService(
      repository as never,
      embeddingService as never,
      logger as never
    );

    const response = await service.vectorSearch('QA Engineer', { locations: 'Chennai, India' }, 1);

    expect(embeddingService.generateEmbedding).toHaveBeenCalledWith('QA Engineer');
    expect(repository.vectorSearch).toHaveBeenCalledWith([0.1, 0.2, 0.3], {
      locations: 'Chennai, India',
    }, 1);
    const { text: vectorTextA, ...resumeAWithoutText } = resumeA;

    expect(response).toEqual({
      results: [
        {
          ...resumeAWithoutText,
          snippet: vectorTextA,
        },
      ],
      count: 1,
      scores: [0.88],
      componentTimings: {
        embeddingMs: expect.any(Number),
        vectorMs: expect.any(Number),
      },
    });
  });

  it('runs BM25 and vector searches in parallel and returns a balanced hybrid ranking', async () => {
    const bm25Resume = {
      ...resumeA,
      score: 0.91,
    };

    const vectorResume = {
      ...resumeB,
      score: 0.88,
    };

    const repository = {
      bm25Search: jest.fn().mockResolvedValue([
        { resume: bm25Resume, score: 0.91 },
      ]),
      vectorSearch: jest.fn().mockResolvedValue([
        { resume: vectorResume, score: 0.88 },
      ]),
    };

    const embeddingService = {
      generateEmbedding: jest.fn().mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
      }),
    };

    const service = new SearchService(
      repository as never,
      embeddingService as never,
      logger as never
    );

    const response = await service.hybridSearch('backend engineer', { locations: 'Bangalore, India' }, 1);

    expect(embeddingService.generateEmbedding).toHaveBeenCalledWith('backend engineer');
    expect(repository.bm25Search).toHaveBeenCalledWith('backend engineer', {
      locations: 'Bangalore, India',
    }, 1);
    expect(repository.vectorSearch).toHaveBeenCalledWith([0.1, 0.2, 0.3], {
      locations: 'Bangalore, India',
    }, 1);
    const { text: bm25Text, ...bm25ResumeWithoutText } = bm25Resume;
    const { text: vectorText, ...vectorResumeWithoutText } = vectorResume;

    expect(response.bm25Results).toEqual([
      {
        ...bm25ResumeWithoutText,
        snippet: bm25Text,
      },
    ]);
    expect(response.vectorResults).toEqual([
      {
        ...vectorResumeWithoutText,
        snippet: vectorText,
      },
    ]);
    expect(response.bm25Count).toBe(1);
    expect(response.vectorCount).toBe(1);
    expect(response.componentTimings).toEqual({
      bm25Ms: expect.any(Number),
      vectorMs: expect.any(Number),
    });
    expect(response.fallbacks).toEqual({
      bm25Fallback: false,
      vectorFallback: false,
    });
  });

  it('falls back to vector-only when BM25 fails in end-to-end search', async () => {
    const vectorResume = {
      ...resumeB,
      score: 0.86,
    };

    const repository = {
      bm25Search: jest.fn().mockRejectedValue(new Error('BM25 failure')),
      vectorSearch: jest.fn().mockResolvedValue([
        { resume: vectorResume, score: 0.86 },
      ]),
    };

    const embeddingService = {
      generateEmbedding: jest.fn().mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
      }),
    };

    const llmService = {
      rerankCandidates: jest.fn().mockResolvedValue({
        results: [
          { ...vectorResume, _id: 'resume-2', score: 0.99 },
        ],
        scores: [0.99],
      }),
      summarizeCandidateFit: jest.fn().mockResolvedValue({
        summary: 'Vector-only fallback candidate summary.',
        tokensUsed: 32,
      }),
    };

    const service = new SearchService(
      repository as never,
      embeddingService as never,
      logger as never,
      llmService as never
    );

    const response = await service.endToEndSearch('backend engineer', {}, {
      topK: 1,
      summarize: true,
      summarizeTopK: 1,
    });

    expect(repository.bm25Search).toHaveBeenCalled();
    expect(repository.vectorSearch).toHaveBeenCalled();
    const { text: vectorText, ...vectorResumeWithoutText } = vectorResume;

    expect(response.results).toEqual([
      {
        ...vectorResumeWithoutText,
        snippet: vectorText,
      },
    ]);
    expect(response.fallbacks).toEqual({
      bm25Fallback: true,
      vectorFallback: false,
      rerankFallback: false,
      summarizeFallback: false,
    });
    expect(response.summaries).toEqual(['Vector-only fallback candidate summary.']);
  });

  it('reranks and summarizes the end-to-end search results', async () => {
    const hybridBm25 = {
      ...resumeA,
      score: 0.92,
    };

    const hybridVector = {
      ...resumeB,
      score: 0.86,
    };

    const repository = {
      bm25Search: jest.fn().mockResolvedValue([
        { resume: hybridBm25, score: 0.92 },
      ]),
      vectorSearch: jest.fn().mockResolvedValue([
        { resume: hybridVector, score: 0.86 },
      ]),
    };

    const embeddingService = {
      generateEmbedding: jest.fn().mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
      }),
    };

    const llmService = {
      rerankCandidates: jest.fn().mockResolvedValue({
        results: [
          { ...resumeB, _id: 'resume-2', score: 0.99 },
          { ...resumeA, _id: 'resume-1', score: 0.97 },
        ],
        scores: [0.99, 0.97],
      }),
      summarizeCandidateFit: jest.fn().mockResolvedValue({
        summary: 'Strong fit for backend engineering roles.',
        tokensUsed: 42,
      }),
    };

    const service = new SearchService(
      repository as never,
      embeddingService as never,
      logger as never,
      llmService as never
    );

    const response = await service.endToEndSearch('backend engineer', {}, {
      topK: 2,
      summarize: true,
      summarizeTopK: 1,
    });

    expect(llmService.rerankCandidates).toHaveBeenCalledWith(
      'backend engineer',
      expect.arrayContaining([
        expect.objectContaining({ _id: 'resume-1' }),
        expect.objectContaining({ _id: 'resume-2' }),
      ]),
      2
    );
    expect(llmService.summarizeCandidateFit).toHaveBeenCalledWith(
      'backend engineer',
      expect.objectContaining({ _id: 'resume-2' }),
      expect.objectContaining({ style: 'short' })
    );
    expect(response.results[0]._id).toBe('resume-2');
    expect(response.summaries).toEqual(['Strong fit for backend engineering roles.']);
    expect(response.fallbacks).toEqual({
      bm25Fallback: false,
      vectorFallback: false,
      rerankFallback: false,
      summarizeFallback: false,
    });
  });
});
