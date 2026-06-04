import type { SearchMode } from '@/features/search/types/search.types';

interface ScorePillProps {
  score: number;
  searchType: SearchMode;
}

const scoreConfig: Record<SearchMode, { label: string; textClass: string }> = {
  vector: { label: 'Similarity', textClass: 'text-indigo-300' },
  bm25: { label: 'BM25 Score', textClass: 'text-pink-300' },
  hybrid: { label: 'Hybrid', textClass: 'text-emerald-300' },
  endToEnd: { label: 'Relevance', textClass: 'text-sky-300' },
};

export function ScorePill({ score, searchType }: ScorePillProps) {
  const config = scoreConfig[searchType];
  const percentScore = (score * 100).toFixed(1);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-slate-800/50 px-2 py-1 text-xs font-medium ${config.textClass}`}>
      <span>{percentScore}%</span>
      <span className="text-slate-500">·</span>
      <span>{config.label}</span>
    </span>
  );
}
