import { useEffect } from 'react';
import type { IResumeSearchResult } from '@/features/search/types/search.types';

interface CandidateProfileModalProps {
  candidate: IResumeSearchResult | null;
  onClose: () => void;
}

export function CandidateProfileModal({ candidate, onClose }: CandidateProfileModalProps) {
  if (!candidate) return null;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-3xl rounded-3xl bg-slate-950 p-6 shadow-2xl shadow-black/80"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.26em] text-slate-500">Candidate profile</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">{candidate.name}</h2>
            <p className="mt-2 text-sm text-slate-400">
              {candidate.role ?? 'Role unavailable'} • {candidate.company ?? 'Company unavailable'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Contact</p>
              <p className="mt-2 text-sm text-slate-300">{candidate.email ?? 'Email not available'}</p>
              <p className="mt-1 text-sm text-slate-300">{candidate.phone ?? 'Phone not available'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Location</p>
              <p className="mt-2 text-sm text-slate-300">{candidate.location ?? 'Unknown'}</p>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Experience</p>
              <p className="mt-2 text-sm text-slate-300">{candidate.totalExperience ? `${candidate.totalExperience} years` : 'Unavailable'}</p>
              {candidate.relevantExperience ? (
                <p className="mt-1 text-sm text-slate-300">Relevant: {candidate.relevantExperience} years</p>
              ) : null}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Education</p>
              <p className="mt-2 text-sm text-slate-300">{candidate.education ?? 'Not listed'}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Skills</p>
            <p className="mt-2 text-sm text-slate-300">{candidate.skills?.join(', ') ?? 'No skills listed'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Summary</p>
            <p className="mt-2 text-sm leading-7 text-slate-400">{candidate.experienceSummary ?? 'No summary available.'}</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 text-slate-400">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Search snippet</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">{candidate.snippet}</p>
        </div>
      </div>
    </div>
  );
}
