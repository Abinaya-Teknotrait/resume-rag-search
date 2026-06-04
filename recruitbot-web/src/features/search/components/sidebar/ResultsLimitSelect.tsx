import { useSearchStore } from '@/lib/stores/search.store';

export function ResultsLimitSelect() {
  const topK = useSearchStore((state) => state.topK);
  const setTopK = useSearchStore((state) => state.setTopK);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
      <label htmlFor="resultsLimit" className="block text-sm font-medium text-slate-300">
        Show top
      </label>
      <select
        id="resultsLimit"
        value={topK}
        onChange={(event) => setTopK(Number(event.target.value))}
        className="mt-3 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
      >
        {[3, 5, 10, 20].map((value) => (
          <option key={value} value={value}>
            {value} results
          </option>
        ))}
      </select>
    </div>
  );
}
