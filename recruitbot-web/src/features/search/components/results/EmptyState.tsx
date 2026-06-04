export function EmptyState() {
  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/40 p-6 text-center">
      <p className="text-2xl">🔍</p>
      <h3 className="font-semibold text-slate-300">No candidates found</h3>
      <p className="text-sm text-slate-500">Try adjusting your search query or changing the search mode.</p>
    </div>
  );
}
