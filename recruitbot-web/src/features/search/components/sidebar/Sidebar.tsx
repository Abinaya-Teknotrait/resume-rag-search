import { AnimatePresence, motion } from 'framer-motion';
import { BrandAvatar } from './BrandAvatar';
import { SearchModeNav } from './SearchModeNav';
import { HybridWeightPanel } from './HybridWeightPanel';
import { ResultsLimitSelect } from './ResultsLimitSelect';
import { ClearChatButton } from './ClearSearchButton';
import { useSearchStore } from '@/lib/stores/search.store';

interface SidebarProps {
  onClear?: () => void;
}

function SectionLabel({ children }: { children: string }) {
  return <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{children}</p>;
}

export function Sidebar({ onClear }: SidebarProps) {
  const searchType = useSearchStore((state) => state.searchType);
  const setSearchType = useSearchStore((state) => state.setSearchType);

  return (
    <aside className="w-full max-w-[260px] shrink-0 overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-black/40 lg:w-[260px]">
      <BrandAvatar />

      <div className="mt-6 space-y-5">
        <SectionLabel>Search mode</SectionLabel>
        <SearchModeNav activeMode={searchType} onChange={setSearchType} />

        <AnimatePresence mode="wait">
          {searchType === 'hybrid' ? (
            <motion.div
              key="hybrid-panel"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
            >
              <HybridWeightPanel />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="space-y-3">
          <SectionLabel>Results limit</SectionLabel>
          <ResultsLimitSelect />
        </div>

        <ClearChatButton onClear={onClear} />

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Quick tips</p>
          <ul className="mt-4 space-y-3">
            <li>Switch to hybrid for a balanced relevance signal.</li>
            <li>Raise the top results count to scan more candidates.</li>
            <li>Use the BM25 mode for exact phrase matching.</li>
          </ul>
        </div>
      </div>

      <footer className="mt-6 text-xs text-slate-500">RecruitBot v2.0</footer>
    </aside>
  );
}
