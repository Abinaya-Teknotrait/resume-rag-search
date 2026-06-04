import apiClient from './client';
import type { CandidateProfile } from '@/types/candidate.types';

export const candidateApi = {
  async getCandidate(id: string): Promise<CandidateProfile> {
    const response = await apiClient.get(`/candidate/${id}`);
    return response.data.data;
  },
};
