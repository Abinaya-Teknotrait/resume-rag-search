import { Check, Cpu, Hash, LucideIcon, SlidersHorizontal, Sparkles } from 'lucide-react';
import type { SearchMode } from '@/features/search/types/search.types';

interface SearchModeNavProps {
  activeMode: SearchMode;
  onChange: (mode: SearchMode) => void;
}

const modeOptions: Array<{
  value: SearchMode;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    value: 'endToEnd',
    title: 'End-to-End',
    description: 'Full pipeline search with combined ranking and scoring.',
    icon: Sparkles,
  },
  {
    value: 'vector',
    title: 'Vector Search',
    description: 'Semantic matching across resume embeddings.',
    icon: Cpu,
  },
  {
    value: 'bm25',
    title: 'BM25 Keyword',
    description: 'Exact phrase and keyword search with BM25 ranking.',
    icon: Hash,
  },
  {
    value: 'hybrid',
    title: 'Hybrid',
    description: 'Combine both signal strengths for relevance.',
    icon: SlidersHorizontal,
  },
];

export function SearchModeNav({ activeMode, onChange }: SearchModeNavProps) {
  return (
    <div className="space-y-3">
      {modeOptions.map((option) => {
        const isActive = option.value === activeMode;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`group w-full rounded-3xl border px-4 py-4 text-left transition ${
              isActive
                ? 'border-sky-400 bg-sky-500/10 text-white'
                : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-slate-200">
                  <option.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{option.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{option.description}</p>
                </div>
              </div>
              {isActive ? (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-300">
                  <Check className="h-4 w-4" />
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
