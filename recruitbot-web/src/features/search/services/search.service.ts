import apiClient from '@/lib/api/client';
import type {
  IApiResponse,
  IHybridSearchResponse,
  IHybridSearchWeights,
  ISearchResponse,
  IResumeSearchResult,
} from '@/features/search/types/search.types';

function getScoreValue(score?: number | string): number {
  if (typeof score === 'number') return score;
  if (typeof score === 'string') {
    const parsed = Number(score);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function mergeHybridResults(
  bm25Results: IResumeSearchResult[],
  vectorResults: IResumeSearchResult[],
  weights?: IHybridSearchWeights
) {
  const bm25Weight = weights?.bm25 ?? 1;
  const vectorWeight = weights?.vector ?? 1;
  const totalWeight = bm25Weight + vectorWeight || 2;
  const resultsById = new Map<string, { item: IResumeSearchResult; bm25Score: number; vectorScore: number }>();

  for (const result of bm25Results) {
    resultsById.set(result._id, {
      item: result,
      bm25Score: getScoreValue(result.score),
      vectorScore: 0,
    });
  }

  for (const result of vectorResults) {
    const existing = resultsById.get(result._id);
    if (existing) {
      existing.vectorScore = getScoreValue(result.score);
      existing.item = {
        ...existing.item,
        ...result,
      };
    } else {
      resultsById.set(result._id, {
        item: result,
        bm25Score: 0,
        vectorScore: getScoreValue(result.score),
      });
    }
  }

  return Array.from(resultsById.values())
    .map(({ item, bm25Score, vectorScore }) => ({
      ...item,
      score: (bm25Score * bm25Weight + vectorScore * vectorWeight) / totalWeight,
    }))
    .sort((left, right) => getScoreValue(right.score) - getScoreValue(left.score));
}

export async function searchResumes(
  query: string,
  mode: string,
  topK = 10,
  hybridWeights?: IHybridSearchWeights
): Promise<ISearchResponse> {
  const endpoint = mode === 'endToEnd' ? '/search' : `/search/${mode}`;

  if (mode === 'hybrid') {
    const response = await apiClient.post<IApiResponse<IHybridSearchResponse>>(endpoint, {
      query,
      topK,
    });

    const payload = response.data.data;
    const results = mergeHybridResults(payload.bm25Results, payload.vectorResults, hybridWeights);

    return {
      results,
      count: results.length,
      componentTimings: payload.componentTimings,
      fallbacks: payload.fallbacks,
      warning: payload.warning,
      durationMs: response.data.durationMs,
    };
  }

  const response = await apiClient.post<IApiResponse<ISearchResponse>>(endpoint, {
    query,
    topK,
  });

  return {
    ...response.data.data,
    durationMs: response.data.durationMs ?? response.data.data.durationMs,
  };
}
