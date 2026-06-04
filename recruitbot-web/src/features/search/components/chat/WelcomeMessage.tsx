export function WelcomeMessage() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-3xl bg-slate-800/50 p-6">
      <p className="text-base font-semibold text-white">Welcome to RecruitBot search!</p>
      <p className="text-sm text-slate-300">
        I help you find the best candidates from the resume index using three search modes:
      </p>
      <ul className="space-y-2 text-sm text-slate-300">
        <li className="flex items-start gap-3">
          <span className="mt-0.5 text-indigo-400">🔍</span>
          <span>
            <strong>Vector Search</strong> — Semantic similarity matching across embeddings
          </span>
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-0.5 text-pink-400">📌</span>
          <span>
            <strong>BM25 Keyword</strong> — Exact phrase and keyword search with ranking
          </span>
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-0.5 text-emerald-400">✨</span>
          <span>
            <strong>Hybrid Search</strong> — Combines both signals for powerful relevance
          </span>
        </li>
      </ul>
      <p className="text-xs text-slate-400">Try a search or pick a suggestion below to get started.</p>
    </div>
  );
}
