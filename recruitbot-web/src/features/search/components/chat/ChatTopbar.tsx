import { useSearchStore } from '@/lib/stores/search.store';

export function ChatTopbar() {
  const searchType = useSearchStore((state) => state.searchType);

  const modeConfig: Record<
    string,
    {
      label: string;
      subLabel: string;
      bgClass: string;
      textClass: string;
    }
  > = {
    vector: {
      label: 'Vector Search',
      subLabel: 'Semantic similarity matching',
      bgClass: 'bg-score-vector/20',
      textClass: 'text-score-vector',
    },
    bm25: {
      label: 'BM25 Keyword',
      subLabel: 'Full-text keyword ranking',
      bgClass: 'bg-score-bm25/20',
      textClass: 'text-score-bm25',
    },
    hybrid: {
      label: 'Hybrid Search',
      subLabel: 'Combined signal relevance',
      bgClass: 'bg-score-hybrid/20',
      textClass: 'text-score-hybrid',
    },
    endToEnd: {
      label: 'End-to-End',
      subLabel: 'Full search pipeline',
      bgClass: 'bg-sky-500/20',
      textClass: 'text-sky-300',
    },
  };

  const config = modeConfig[searchType] || modeConfig.endToEnd;

  return (
    <div className="flex items-center justify-between gap-4 rounded-t-3xl border-b border-white/10 bg-slate-950/80 px-8 py-5 shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 text-sm font-semibold text-white">
          R
        </div>
        <div>
          <p className="font-semibold text-white">RecruitBot</p>
          <p className="text-xs text-slate-400">{config.subLabel}</p>
        </div>
      </div>

      <div className={`rounded-full ${config.bgClass} px-4 py-2 text-sm font-medium ${config.textClass}`}>
        {config.label}
      </div>
    </div>
  );
}
