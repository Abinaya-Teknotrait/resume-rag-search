import type { SearchMode, IResumeSearchResult } from '@/features/search/types/search.types';
import { ResultSummary } from './ResultSummary';
import { ResultCard } from './ResultCard';
import { EmptyState } from './EmptyState';

interface ResultsListProps {
  results: IResumeSearchResult[];
  searchType: SearchMode;
  duration: number;
  query?: string;
  onCandidateClick?: (candidateId: string, candidate: IResumeSearchResult) => void;
}

export function ResultsList({ results, searchType, duration, query, onCandidateClick }: ResultsListProps) {
  if (!results || results.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <ResultSummary resultCount={results.length} searchType={searchType} duration={duration} />

      <div className="space-y-3">
        {results.map((result, index) => (
          <ResultCard
            key={result._id}
            result={result}
            rank={index + 1}
            searchType={searchType}
            onClick={() => onCandidateClick?.(result._id, result)}
          />
        ))}
      </div>
    </div>
  );
}
