import type { SearchMode } from '@/features/search/types/search.types';

const modeLabels: Record<SearchMode, string> = {
  endToEnd: 'End-to-End',
  bm25: 'BM25',
  vector: 'Vector',
  hybrid: 'Hybrid',
};

interface ResultSummaryProps {
  query: string;
  resultCount: number;
  mode: SearchMode;
  durationMs?: number;
  topK: number;
  hybridBalance?: number;
}

export function ResultSummary({ query, resultCount, mode, durationMs, topK, hybridBalance }: ResultSummaryProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm shadow-black/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Search summary</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            {resultCount} candidate{resultCount === 1 ? '' : 's'} found
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Showing top {topK} results for <span className="text-white">{query}</span>
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Mode</p>
            <p className="mt-1 text-white">{modeLabels[mode]}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Latency</p>
            <p className="mt-1 text-white">{durationMs != null ? `${durationMs} ms` : 'N/A'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Search size</p>
            <p className="mt-1 text-white">Top {topK}</p>
          </div>
          {mode === 'hybrid' ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Hybrid balance</p>
              <p className="mt-1 text-white">{hybridBalance ?? 50}% BM25 / {100 - (hybridBalance ?? 50)}% Vector</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
