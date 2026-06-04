import type { SearchMode } from '@/features/search/types/search.types';

interface ResultSummaryProps {
  resultCount: number;
  searchType: SearchMode;
  duration: number;
}

const modeLabels: Record<SearchMode, string> = {
  endToEnd: 'End-to-End',
  bm25: 'BM25 Keyword',
  vector: 'Vector',
  hybrid: 'Hybrid',
};

export function ResultSummary({ resultCount, searchType, duration }: ResultSummaryProps) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-300">
      <span>
        Found <strong className="text-white">{resultCount}</strong> candidate{resultCount !== 1 ? 's' : ''}
      </span>
      <span className="text-slate-500">·</span>
      <span>{modeLabels[searchType]}</span>
      <span className="text-slate-500">·</span>
      <span className="text-slate-400">{duration}ms</span>
    </div>
  );
}
