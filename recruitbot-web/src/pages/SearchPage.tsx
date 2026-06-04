import { FormEvent, useMemo, useState } from 'react';
import { searchResumes } from '@/features/search/services/search.service';
import { ResultSummary } from '@/features/search/components/ResultSummary';
import { SearchResultCard } from '@/features/search/components/SearchResultCard';
import { CandidateModal } from '@/features/search/components/modal/CandidateModal';
import { Sidebar } from '@/features/search/components/sidebar/Sidebar';
import { useSearchStore } from '@/lib/stores/search.store';
import { useCandidateModal } from '@/hooks/use-candidate-modal';
import type { IResumeSearchResult, SearchMode } from '@/features/search/types/search.types';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const mode = useSearchStore((state) => state.searchType);
  const topK = useSearchStore((state) => state.topK);
  const bm25Weight = useSearchStore((state) => state.bm25Weight);
  const vectorWeight = useSearchStore((state) => state.vectorWeight);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<IResumeSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | undefined>(undefined);
  const [durationMs, setDurationMs] = useState<number | undefined>(undefined);
  const { isOpen, candidate, loading: candidateLoading, error: candidateError, openCandidateModal, closeModal } = useCandidateModal();

  const resultCount = useMemo(() => results.length, [results]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError('Please enter a search query.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setWarning(undefined);
    setDurationMs(undefined);

    try {
      const response = await searchResumes(
        trimmedQuery,
        mode,
        topK,
        mode === 'hybrid'
          ? { bm25: bm25Weight, vector: vectorWeight }
          : undefined
      );
      setResults(response.results ?? []);
      setWarning(response.warning);
      setDurationMs(response.durationMs);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-10 rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/40">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">RecruitBot Search</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Resume retrieval and relevance search</h1>
          <p className="mt-3 text-slate-400">Search the indexed resume collection with multiple retrieval modes and review ranked candidate cards.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
          <Sidebar
            onClear={() => {
              setQuery('');
              setResults([]);
              setError(null);
              setWarning(undefined);
              setDurationMs(undefined);
            }}
          />

          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/40">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="searchQuery" className="block text-sm font-medium text-slate-300">
                    Search query
                  </label>
                  <input
                    id="searchQuery"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="e.g. software engineer with Python and ML experience"
                    className="mt-3 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-4 text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                  />
                </div>

                {error ? <p className="text-sm text-rose-300">{error}</p> : null}
                {warning ? <p className="text-sm text-amber-300">{warning}</p> : null}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-4 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? 'Searching…' : 'Search resumes'}
                </button>
              </form>
            </section>
          </div>
        </div>

        <section className="mt-10">
          <div className="mb-6 flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Search results</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{resultCount} candidate{resultCount === 1 ? '' : 's'} found</h2>
            </div>
            {isLoading ? <p className="text-sm text-slate-400">Searching…</p> : null}
          </div>

          <ResultSummary
            query={query}
            resultCount={resultCount}
            mode={mode}
            durationMs={durationMs}
            topK={topK}
            hybridBalance={mode === 'hybrid' ? bm25Weight : undefined}
          />

          <div className="space-y-5">
            {results.map((result, index) => (
              <SearchResultCard
                key={result._id}
                result={result}
                rank={index + 1}
                onSelect={() => openCandidateModal(result._id)}
              />
            ))}

            {!isLoading && resultCount === 0 && !error ? (
              <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/90 p-8 text-center text-slate-400">
                {query.trim()
                  ? 'No candidates matched your query. Verify that resumes have been ingested and indexed.'
                  : 'Enter a query and press search to retrieve candidates from the resume index.'}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {candidateError ? (
        <div className="fixed bottom-6 left-1/2 z-40 w-full max-w-2xl -translate-x-1/2 rounded-3xl border border-rose-500/40 bg-rose-950/90 p-4 text-sm text-rose-100 shadow-lg shadow-rose-900/30">
          {candidateError}
        </div>
      ) : null}

      <CandidateModal isOpen={isOpen} candidate={candidate} loading={candidateLoading} error={candidateError} onClose={closeModal} />
    </main>
  );
}
