import apiClient from '@/lib/api/client';
import type { ResumeUploadResponse } from '@/features/ingestion/types/ingestion.types';

export async function uploadResumeFile(file: File, onUploadProgress?: (progress: number) => void): Promise<ResumeUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ResumeUploadResponse>('/resume/inject', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (event) => {
      if (!event.lengthComputable || !onUploadProgress) return;
      const total = event.total ?? 1;
      onUploadProgress(Math.round((event.loaded * 100) / total));
    },
  });

  return response.data;
}
