export type UploadStage =
  | 'Resume Upload'
  | 'PDF Processing'
  | 'Resume Parsing'
  | 'Embedding Generation'
  | 'MongoDB Ingestion'
  | 'Completed';

export interface ResumeUploadState {
  fileName?: string;
  isUploading: boolean;
  progress: number;
  stage: UploadStage;
  success: boolean;
  error?: string;
  responseMessage?: string;
}

export interface ResumeUploadResponse {
  statusCode: number;
  requestId: string;
  timestamp: string;
  message: string;
  data?: unknown;
  errors?: null | unknown;
}
