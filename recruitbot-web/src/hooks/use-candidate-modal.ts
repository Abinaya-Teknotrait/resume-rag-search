import { useState } from 'react';
import { candidateApi } from '@/lib/api/candidate.api';
import type { CandidateProfile } from '@/types/candidate.types';

export function useCandidateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openCandidateModal(id: string) {
    setIsOpen(true);
    setLoading(true);
    setError(null);
    try {
      const data = await candidateApi.getCandidate(id);
      setCandidate(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load candidate profile';
      setError(errorMsg);
      setCandidate(null);
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setIsOpen(false);
    setCandidate(null);
    setError(null);
  }

  return { isOpen, candidate, loading, error, openCandidateModal, closeModal };
}
