import type { IResumeSearchResult } from '@/features/search/types/search.types';

interface SearchResultCardProps {
  result: IResumeSearchResult;
  onSelect?: (result: IResumeSearchResult) => void;
  rank?: number;
}

export function SearchResultCard({ result, onSelect, rank }: SearchResultCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(result)}
      className="w-full rounded-3xl border border-slate-800 bg-slate-950 p-6 text-left shadow-sm shadow-black/20 transition hover:border-sky-400"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">
          #{rank ?? '-'}
        </span>
        {result.score != null ? (
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">
            Score: {typeof result.score === 'number' ? result.score.toFixed(2) : result.score}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{result.role ?? 'Candidate'}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{result.name}</h3>
          <p className="mt-1 text-sm text-slate-400">{result.company ?? 'Unknown company'} · {result.location ?? 'Location unavailable'}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
          {result.totalExperience ? `${result.totalExperience} yrs experience` : 'Experience N/A'}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-slate-300">Skills</p>
          <p className="mt-2 text-sm text-slate-400">{result.skills?.join(', ') ?? 'Not available'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-300">Education</p>
          <p className="mt-2 text-sm text-slate-400">{result.education ?? 'Not available'}</p>
        </div>
      </div>

      <div className="mt-5 rounded-3xl bg-slate-900/80 p-4 text-slate-300">
        <p className="text-sm font-medium text-slate-200">Search result snippet</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">{result.snippet}</p>
      </div>
    </button>
  );
}
