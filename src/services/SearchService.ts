import { config } from '../config';
import { getLogger } from './LoggingService';
import { getEmbeddingService } from './EmbeddingService';
import { ResumeRepository } from '../repositories/ResumeRepository';
import { getLLMService } from './LLMService';
import {
  IComponentTimings,
  IEndToEndSearchResponse,
  IHybridSearchResponse,
  IResume,
  IResumeSearchResult,
  ISearchFilters,
  ISearchResponse,
} from '../types/API';

type SearchExecutionResult = {
  results: Array<{ resume: IResume; score: number }>;
  componentTimings: IComponentTimings;
};

export class SearchService {
  constructor(
    private readonly repository: ResumeRepository = new ResumeRepository(),
    private readonly embeddingService = getEmbeddingService(),
    private readonly logger = getLogger(),
    private readonly llmService = getLLMService()
  ) {}

  private mergeUniqueCandidates(bm25Results: IResume[], vectorResults: IResume[]): IResume[] {
    const combined = new Map<string, IResume>();

    for (const resume of bm25Results) {
      combined.set(resume._id, {
        ...resume,
        score: resume.score ?? 0,
      });
    }

    for (const resume of vectorResults) {
      const existing = combined.get(resume._id);
      if (existing) {
        combined.set(resume._id, {
          ...resume,
          score: Math.max(existing.score ?? 0, resume.score ?? 0),
        });
        continue;
      }

      combined.set(resume._id, {
        ...resume,
        score: resume.score ?? 0,
      });
    }

    return Array.from(combined.values()).sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
  }

  private buildSearchResult(resume: IResume): IResumeSearchResult {
    const { text, ...rest } = resume;
    return {
      ...rest,
      snippet: text,
    } as IResumeSearchResult;
  }

  private async executeBm25Search(
    query: string,
    filters: ISearchFilters,
    topK: number
  ): Promise<{ results: Array<{ resume: IResume; score: number }>; componentTimings: IComponentTimings }> {
    const startTime = Date.now();
    const results = await this.repository.bm25Search(query, filters, topK);
    return {
      results,
      componentTimings: {
        bm25Ms: Date.now() - startTime,
      },
    };
  }

  private async executeVectorSearch(
    query: string,
    filters: ISearchFilters,
    topK: number
  ): Promise<{ results: Array<{ resume: IResume; score: number }>; componentTimings: IComponentTimings }> {
    const startTime = Date.now();
    const embeddingStart = Date.now();
    const embeddingResult = await this.embeddingService.generateEmbedding(query);
    const results = await this.repository.vectorSearch(
      embeddingResult.embedding,
      filters,
      topK
    );
    return {
      results,
      componentTimings: {
        embeddingMs: Date.now() - embeddingStart,
        vectorMs: Date.now() - startTime,
      },
    };
  }

  async bm25Search(
    query: string,
    filters: ISearchFilters = {},
    topK = config.maxBatchSize
  ): Promise<ISearchResponse> {
    const startTime = Date.now();

    this.logger.debug('SearchService.bm25Search called', {
      queryLength: query.length,
      filters,
      topK,
    });

    try {
      const { results: bm25Results, componentTimings: timing } = await this.executeBm25Search(
        query,
        filters,
        topK
      );

      const response: ISearchResponse = {
        results: bm25Results.map((result) => this.buildSearchResult(result.resume)),
        count: bm25Results.length,
        scores: bm25Results.map((result) => result.score),
        componentTimings: timing,
      };

      this.logger.debug('SearchService.bm25Search succeeded', {
        durationMs: timing.bm25Ms,
        resultCount: response.count,
      });

      return response;
    } catch (error) {
      this.logger.error('SearchService.bm25Search failed', {
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  async vectorSearch(
    query: string,
    filters: ISearchFilters = {},
    topK = config.maxBatchSize
  ): Promise<ISearchResponse> {
    const startTime = Date.now();

    this.logger.debug('SearchService.vectorSearch called', {
      queryLength: query.length,
      filters,
      topK,
    });

    try {
      const { results: vectorResults, componentTimings: timing } = await this.executeVectorSearch(
        query,
        filters,
        topK
      );

      const response: ISearchResponse = {
        results: vectorResults.map((result) => this.buildSearchResult(result.resume)),
        count: vectorResults.length,
        scores: vectorResults.map((result) => result.score),
        componentTimings: timing,
      };

      this.logger.debug('SearchService.vectorSearch succeeded', {
        embeddingMs: timing.embeddingMs,
        durationMs: timing.vectorMs,
        resultCount: response.count,
      });

      return response;
    } catch (error) {
      this.logger.error('SearchService.vectorSearch failed', {
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  async hybridSearch(
    query: string,
    filters: ISearchFilters = {},
    topK = config.maxBatchSize
  ): Promise<IHybridSearchResponse> {
    const startTime = Date.now();

    this.logger.debug('SearchService.hybridSearch called', {
      queryLength: query.length,
      filters,
      topK,
    });

    try {
      const [bm25Result, vectorResult] = await Promise.allSettled([
        this.executeBm25Search(query, filters, topK),
        this.executeVectorSearch(query, filters, topK),
      ]);

      const bm25Search = bm25Result.status === 'fulfilled' ? bm25Result.value : null;
      const vectorSearch = vectorResult.status === 'fulfilled' ? vectorResult.value : null;

      if (!bm25Search && !vectorSearch) {
        const errors = [bm25Result, vectorResult]
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map((result) =>
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          );

        throw new Error(`Hybrid search failed: ${errors.join('; ')}`);
      }

      if (!bm25Search) {
        this.logger.warn('SearchService.hybridSearch falling back to vector results only', {
          queryLength: query.length,
          durationMs: Date.now() - startTime,
        });
      }

      if (!vectorSearch) {
        this.logger.warn('SearchService.hybridSearch falling back to BM25 results only', {
          queryLength: query.length,
          durationMs: Date.now() - startTime,
        });
      }

      const bm25Results = bm25Search?.results ?? [];
      const vectorResults = vectorSearch?.results ?? [];

      const response: IHybridSearchResponse = {
        bm25Results: bm25Results.map((result) => this.buildSearchResult(result.resume)),
        vectorResults: vectorResults.map((result) => this.buildSearchResult(result.resume)),
        bm25Count: bm25Results.length,
        vectorCount: vectorResults.length,
        componentTimings: {
          bm25Ms: bm25Search?.componentTimings?.bm25Ms ?? 0,
          vectorMs: vectorSearch?.componentTimings?.vectorMs ?? 0,
        },
        fallbacks: {
          bm25Fallback: !bm25Search,
          vectorFallback: !vectorSearch,
        },
      };

      this.logger.debug('SearchService.hybridSearch succeeded', {
        durationMs: Date.now() - startTime,
        bm25Count: response.bm25Count,
        vectorCount: response.vectorCount,
      });

      return response;
    } catch (error) {
      this.logger.error('SearchService.hybridSearch failed', {
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  async endToEndSearch(
    query: string,
    filters: ISearchFilters = {},
    options: {
      topK?: number;
      summarize?: boolean;
      summarizeTopK?: number;
      summarizeStyle?: 'short' | 'detailed';
    } = {}
  ): Promise<IEndToEndSearchResponse> {
    const startTime = Date.now();

    this.logger.debug('SearchService.endToEndSearch called', {
      queryLength: query.length,
      filters,
      options,
    });

    const requestedTopK = options.topK ?? config.maxBatchSize;
    let bm25Search: SearchExecutionResult | null = null;
    let vectorSearch: SearchExecutionResult | null = null;
    const fallbacks = {
      bm25Fallback: false,
      vectorFallback: false,
      rerankFallback: false,
      summarizeFallback: false,
    };

    try {
      try {
        const bm25Execution = await this.executeBm25Search(query, filters, requestedTopK);
        bm25Search = bm25Execution;
      } catch (error) {
        fallbacks.bm25Fallback = true;
        this.logger.warn('SearchService.endToEndSearch BM25 fallback activated', {
          queryLength: query.length,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      try {
        const vectorExecution = await this.executeVectorSearch(query, filters, requestedTopK);
        vectorSearch = vectorExecution;
      } catch (error) {
        fallbacks.vectorFallback = true;
        this.logger.warn('SearchService.endToEndSearch vector fallback activated', {
          queryLength: query.length,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      if (!bm25Search && !vectorSearch) {
        throw new Error('End-to-end search failed: both BM25 and vector search failed');
      }

      const bm25Results = bm25Search?.results ?? [];
      const vectorResults = vectorSearch?.results ?? [];
      const mergeStart = Date.now();
      const combinedResults = this.mergeUniqueCandidates(
        bm25Results.map((result) => result.resume),
        vectorResults.map((result) => result.resume)
      );
      const mergeMs = Date.now() - mergeStart;

      const effectiveTopK = Math.min(requestedTopK, combinedResults.length);
      const baseResults = combinedResults.slice(0, effectiveTopK);
      const rerankPool = baseResults.slice(0, Math.min(config.maxCandidatesToRerank, effectiveTopK));
      const rerankTopK = Math.min(config.rerankTopK, rerankPool.length);

      const componentTimings: IComponentTimings = {
        bm25Ms: bm25Search?.componentTimings?.bm25Ms ?? 0,
        vectorMs: vectorSearch?.componentTimings?.vectorMs ?? 0,
        mergeMs,
      };

      let rankedResults = baseResults;

      if (rerankPool.length > 0) {
        const rerankStart = Date.now();

        try {
          const rerankResponse = await this.llmService.rerankCandidates(
            query,
            rerankPool.map((resume) => ({
              _id: resume._id,
              resumeId: resume._id,
              snippet: resume.text,
              text: resume.text,
              score: resume.score,
            })),
            rerankTopK
          );

          const rerankedIds = new Set(rerankResponse.results.map((candidate) => candidate._id));
          const reranked = rerankResponse.results
            .map((candidate) => rankedResults.find((resume) => resume._id === candidate._id))
            .filter((resume): resume is IResume => Boolean(resume));
          const remaining = rankedResults.filter((resume) => !rerankedIds.has(resume._id));
          rankedResults = [...reranked, ...remaining];
          componentTimings.rerankMs = Date.now() - rerankStart;
        } catch (error) {
          componentTimings.rerankMs = Date.now() - rerankStart;
          fallbacks.rerankFallback = true;
          rankedResults = baseResults;
          this.logger.warn('SearchService.endToEndSearch falling back to hybrid ranking', {
            queryLength: query.length,
            durationMs: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      let summaries: string[] | undefined;

      if (options.summarize) {
        const summarizeStart = Date.now();

        try {
          if (!config.enableSummarization) {
            throw new Error('Summarization is disabled');
          }

          const summarizeCandidates = rankedResults.slice(0, Math.max(1, options.summarizeTopK ?? 3));
          summaries = (
            await Promise.all(
              summarizeCandidates.map((candidate) =>
                this.llmService.summarizeCandidateFit(query, candidate, {
                  style: options.summarizeStyle ?? config.defaultSummarizationStyle,
                  maxTokens: config.summarizationDefaultMaxTokens,
                })
              )
            )
          ).map((summary) => summary.summary);

          componentTimings.summarizeMs = Date.now() - summarizeStart;
        } catch (error) {
          componentTimings.summarizeMs = Date.now() - summarizeStart;
          fallbacks.summarizeFallback = true;
          summaries = undefined;
          this.logger.warn('SearchService.endToEndSearch summarization fallback activated', {
            queryLength: query.length,
            durationMs: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const response: IEndToEndSearchResponse = {
        results: rankedResults.slice(0, effectiveTopK).map((resume) => this.buildSearchResult(resume)),
        summaries,
        count: Math.min(effectiveTopK, rankedResults.length),
        componentTimings,
        fallbacks,
        warning:
          fallbacks.rerankFallback || fallbacks.summarizeFallback
            ? 'One or more optional pipeline steps fell back to degraded behavior'
            : undefined,
      };

      this.logger.debug('SearchService.endToEndSearch succeeded', {
        durationMs: Date.now() - startTime,
        resultCount: response.count,
        summarizeCount: summaries?.length ?? 0,
      });

      return response;
    } catch (error) {
      this.logger.error('SearchService.endToEndSearch failed', {
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }
}
