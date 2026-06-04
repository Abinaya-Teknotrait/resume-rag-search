import { useCallback } from 'react';
import axios from 'axios';
import { uploadResumeFile } from '@/features/ingestion/services/ingestion.service';
import { useIngestionStore } from '@/features/ingestion/stores/ingestion.store';

const getStageFromProgress = (progress: number) => {
  if (progress < 20) return 'Resume Upload' as const;
  if (progress < 40) return 'PDF Processing' as const;
  if (progress < 60) return 'Resume Parsing' as const;
  if (progress < 80) return 'Embedding Generation' as const;
  if (progress < 100) return 'MongoDB Ingestion' as const;
  return 'Completed' as const;
};

export function useUpload() {
  const {
    setFileName,
    setUploading,
    setProgress,
    setStage,
    setSuccess,
    setError,
    setResponseMessage,
    reset,
  } = useIngestionStore();

  const upload = useCallback(async (file: File) => {
    reset();
    setFileName(file.name);
    setStage('Resume Upload');
    setUploading(true);
    setError(undefined);
    setResponseMessage(undefined);

    try {
      const result = await uploadResumeFile(file, (progress) => {
        setProgress(progress);
        setStage(getStageFromProgress(progress));
      });
      setProgress(100);
      setStage('Completed');
      setSuccess(true);
      setResponseMessage(result.message);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const serverMessage =
          (error.response?.data as any)?.message ?? error.message;
        setError(serverMessage || 'Upload failed. Please try again.');
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  }, [reset, setError, setFileName, setProgress, setResponseMessage, setStage, setSuccess, setUploading]);

  return { upload };
}
