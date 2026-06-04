import { motion } from 'framer-motion';
import { useHybridWeights } from '@/hooks/use-hybrid-weights';

const presets = [
  { label: '50/50', bm25: 50, vector: 50 },
  { label: '70/30', bm25: 70, vector: 30 },
  { label: '30/70', bm25: 30, vector: 70 },
];

export function HybridWeightPanel() {
  const { bm25Weight, vectorWeight, handleBm25Change, handleVectorChange, applyPreset } = useHybridWeights();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm shadow-black/20"
    >
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Search weights</p>
      <div className="mt-4 space-y-6">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-white">BM25</p>
            <span className="text-sm text-slate-400">{bm25Weight}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={bm25Weight}
            onChange={(event) => handleBm25Change(Number(event.target.value))}
            className="mt-3 w-full accent-sky-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-white">Vector</p>
            <span className="text-sm text-slate-400">{vectorWeight}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={vectorWeight}
            onChange={(event) => handleVectorChange(Number(event.target.value))}
            className="mt-3 w-full accent-sky-500"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.bm25, preset.vector)}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
