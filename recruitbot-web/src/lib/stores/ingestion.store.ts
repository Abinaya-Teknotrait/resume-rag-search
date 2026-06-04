import { create } from 'zustand';
import { ResumeUploadState } from '@/features/ingestion/types/ingestion.types';

interface IngestionStore extends ResumeUploadState {
  setFileName: (fileName?: string) => void;
  setUploading: (isUploading: boolean) => void;
  setProgress: (progress: number) => void;
  setSuccess: (success: boolean) => void;
  setError: (error?: string) => void;
  setResponseMessage: (message?: string) => void;
  reset: () => void;
}

export const useIngestionStore = create<IngestionStore>((set) => ({
  fileName: undefined,
  isUploading: false,
  progress: 0,
  stage: 'Resume Upload',
  success: false,
  error: undefined,
  responseMessage: undefined,
  setFileName: (fileName) => set({ fileName }),
  setUploading: (isUploading) => set({ isUploading }),
  setProgress: (progress) => set({ progress }),
  setSuccess: (success) => set({ success }),
  setError: (error) => set({ error }),
  setResponseMessage: (message) => set({ responseMessage: message }),
  reset: () =>
    set({
      fileName: undefined,
      isUploading: false,
      progress: 0,
      success: false,
      error: undefined,
      responseMessage: undefined,
    }),
}));
