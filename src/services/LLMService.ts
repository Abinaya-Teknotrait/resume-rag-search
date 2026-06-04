import axios from 'axios';
import { config } from '../config';
import { getLogger } from './LoggingService';
import { LLMError } from '../utils/errors';
import { ICandidate, IRerankResponse, ISummarizeResponse, IResume } from '../types/API';

interface IGroqChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

type IRerankParseResult = {
  rankedIds: string[];
  scores: number[];
};

export class LLMService {
  constructor(private readonly logger = getLogger()) {}

  async rerankCandidates(
    query: string,
    candidates: ICandidate[],
    topK = config.rerankTopK
  ): Promise<IRerankResponse> {
    const startTime = Date.now();

    if (!config.groqApiKey) {
      throw new LLMError('GROQ_API_KEY is not configured');
    }

    const normalizedCandidates = candidates.map((candidate) => ({
      _id: candidate.resumeId || candidate._id,
      snippet: candidate.snippet || candidate.text || '',
      score: candidate.score,
      originalCandidate: candidate,
    }));

    const safeCandidates = normalizedCandidates.filter((candidate) => Boolean(candidate._id));

    if (safeCandidates.length === 0) {
      throw new LLMError('At least one candidate must include a valid _id or resumeId');
    }

    const effectiveTopK = Math.min(
      Math.max(1, topK),
      safeCandidates.length,
      config.maxCandidatesToRerank
    );

    const prompt = this.buildRerankPrompt(query, safeCandidates.slice(0, effectiveTopK));

    try {
      this.logger.debug('LLMService.rerankCandidates called', {
        queryLength: query.length,
        candidateCount: safeCandidates.length,
        effectiveTopK,
        model: config.groqLlmModel,
      });

      const response = await axios.post<IGroqChatCompletionResponse>(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: config.groqLlmModel,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert resume reranker. Return only valid JSON in the shape {"rankedIds": [...], "scores": [...]} using the candidate ids provided. Do not include markdown fences.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${config.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: config.llmApiTimeout,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new LLMError('Groq rerank response did not include message content');
      }

      const parsed = this.parseRerankResponse(content);
      const rankedIds = parsed.rankedIds.slice(0, effectiveTopK);
      const scores = parsed.scores.slice(0, effectiveTopK);

      // Map ranked IDs back to their original candidates
      const candidateMap = new Map<string, ICandidate>(
        safeCandidates.map((c) => [c._id, c.originalCandidate])
      );
      const results = rankedIds
        .map((id) => {
          const candidate = candidateMap.get(id);
          return candidate ? { candidate, score: scores[rankedIds.indexOf(id)] } : undefined;
        })
        .filter((item): item is { candidate: ICandidate; score: number } => Boolean(item))
        .map((item) => ({
          ...item.candidate,
          score: item.score,
        }));

      this.logger.debug('LLMService.rerankCandidates succeeded', {
        durationMs: Date.now() - startTime,
        rankedCount: results.length,
        model: config.groqLlmModel,
      });

      return {
        results,
        scores,
      };
    } catch (error) {
      this.logger.error('LLMService.rerankCandidates failed', {
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
        model: config.groqLlmModel,
      });

      throw new LLMError(
        error instanceof Error ? error.message : 'Failed to rerank candidates with Groq'
      );
    }
  }

  async summarizeCandidateFit(
    query: string,
    candidate: ICandidate | IResume,
    options?: { style?: 'short' | 'detailed'; maxTokens?: number }
  ): Promise<ISummarizeResponse> {
    const startTime = Date.now();

    if (!config.groqApiKey) {
      throw new LLMError('GROQ_API_KEY is not configured');
    }

    const safeCandidateId =
      typeof (candidate as ICandidate).resumeId === 'string' && (candidate as ICandidate).resumeId
        ? (candidate as ICandidate).resumeId
        : candidate._id;
    const safeSnippet =
      typeof (candidate as ICandidate).snippet === 'string' && (candidate as ICandidate).snippet
        ? (candidate as ICandidate).snippet
        : candidate.text || '';

    if (!safeCandidateId || !safeSnippet) {
      throw new LLMError('Candidate must include a valid _id or resumeId and snippet or text');
    }

    const style = options?.style || config.defaultSummarizationStyle;
    const maxTokens = Math.max(10, Math.min(options?.maxTokens ?? config.summarizationDefaultMaxTokens, 2000));
    const prompt = this.buildSummarizePrompt(query, safeCandidateId, safeSnippet, style, maxTokens);

    try {
      this.logger.debug('LLMService.summarizeCandidateFit called', {
        queryLength: query.length,
        candidateId: safeCandidateId,
        style,
        maxTokens,
        model: config.groqLlmModel,
      });

      const response = await axios.post<IGroqChatCompletionResponse>(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: config.groqLlmModel,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert resume summarizer. Return only the summary text, without markdown fences or extra commentary.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${config.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: config.llmApiTimeout,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new LLMError('Groq summarization response did not include message content');
      }

      const summary = content.replace(/```/g, '').trim();
      const tokensUsed =
        response.data?.usage?.total_tokens ??
        Math.max(1, Math.ceil(summary.length / 4));

      this.logger.debug('LLMService.summarizeCandidateFit succeeded', {
        durationMs: Date.now() - startTime,
        tokensUsed,
        model: config.groqLlmModel,
      });

      return {
        summary,
        tokensUsed,
      };
    } catch (error) {
      this.logger.error('LLMService.summarizeCandidateFit failed', {
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
        model: config.groqLlmModel,
      });

      throw new LLMError(
        error instanceof Error ? error.message : 'Failed to summarize candidate with Groq'
      );
    }
  }

  private buildRerankPrompt(query: string, candidates: Array<{ _id: string; snippet: string }>): string {
    const candidateLines = candidates
      .map((candidate, index) => `${index + 1}. ${candidate._id}: ${candidate.snippet}`)
      .join('\n');

    return `Query: ${query}\n\nCandidates:\n${candidateLines}\n\nReturn rankedIds and scores ordered by relevance. Highest score should be the most relevant candidate.`;
  }

  private buildSummarizePrompt(
    query: string,
    candidateId: string,
    snippet: string,
    style: 'short' | 'detailed',
    maxTokens: number
  ): string {
    return `Query: ${query}\n\nCandidate ID: ${candidateId}\nCandidate snippet: ${snippet}\n\nStyle: ${style}\nMax tokens: ${maxTokens}\n\nSummarize how well this candidate fits the query, focusing on relevant experience and skills.`;
  }

  private parseRerankResponse(content: string): IRerankParseResult {
    const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsed: unknown;

    try {
      parsed = JSON.parse(cleaned);
    } catch (error) {
      throw new LLMError(
        `Failed to parse rerank response JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray((parsed as { rankedIds?: unknown }).rankedIds) ||
      !Array.isArray((parsed as { scores?: unknown }).scores)
    ) {
      throw new LLMError('Groq rerank response JSON did not contain rankedIds and scores arrays');
    }

    const rankedIds = (parsed as { rankedIds: unknown[] }).rankedIds.map((id) => String(id));
    const scores = (parsed as { scores: unknown[] }).scores.map((score) => Number(score));

    if (rankedIds.length === 0 || scores.length === 0) {
      throw new LLMError('Groq rerank response was empty');
    }

    if (rankedIds.length !== scores.length) {
      throw new LLMError('Groq rerank response rankedIds and scores length mismatch');
    }

    return {
      rankedIds,
      scores,
    };
  }
}

let llmService: LLMService | null = null;

export function getLLMService(): LLMService {
  if (!llmService) {
    llmService = new LLMService();
  }
  return llmService;
}
