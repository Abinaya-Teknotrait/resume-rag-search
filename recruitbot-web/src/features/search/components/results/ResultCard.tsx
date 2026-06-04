import { motion } from 'framer-motion';
import type { SearchMode, IResumeSearchResult } from '@/features/search/types/search.types';
import { RankBadge } from './RankBadge';
import { ScorePill } from './ScorePill';

interface ResultCardProps {
  result: IResumeSearchResult;
  rank: number;
  searchType: SearchMode;
  onClick?: (candidateId: string) => void;
}

export function ResultCard({ result, rank, searchType, onClick }: ResultCardProps) {
  const score = typeof result.score === 'string' ? parseFloat(result.score) : result.score || 0;
  const experienceText =
    result.totalExperience || result.relevantExperience
      ? `${result.relevantExperience || result.totalExperience} yrs exp`
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.06 }}
      onClick={() => onClick?.(result._id)}
      className="group cursor-pointer rounded-xl border border-slate-700 bg-slate-800/40 p-4 transition hover:border-slate-600 hover:bg-slate-800/60 hover:shadow-lg"
    >
      {/* Top Row: Rank + Name + Score */}
      <div className="mb-3 flex items-start gap-3">
        <RankBadge rank={rank} />
        <div className="flex-1">
          <h4 className="font-semibold text-white">{result.name || 'Unnamed Candidate'}</h4>
          <ScorePill score={score} searchType={searchType} />
        </div>
      </div>

      {/* Second Row: Meta Info */}
      <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-400">
        {experienceText && <span className="rounded-full bg-slate-900/50 px-2 py-1">{experienceText}</span>}
        {result.email && <span className="text-slate-500">{result.email}</span>}
        {result.phone && <span className="text-slate-500">{result.phone}</span>}
      </div>

      {/* Bottom: Snippet */}
      {result.snippet && (
        <p className="line-clamp-2 text-xs text-slate-300">
          {result.snippet.substring(0, 200)}
          {result.snippet.length > 200 ? '...' : ''}
        </p>
      )}
    </motion.div>
  );
}
