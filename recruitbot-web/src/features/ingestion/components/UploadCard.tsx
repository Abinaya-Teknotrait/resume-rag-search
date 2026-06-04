import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIngestionStore } from '@/features/ingestion/stores/ingestion.store';
import { useUpload } from '@/features/ingestion/hooks/useUpload';
import { UploadButton } from '@/features/ingestion/components/UploadButton';
import { UploadDropzone } from '@/features/ingestion/components/UploadDropzone';
import { UploadProgress } from '@/features/ingestion/components/UploadProgress';
import { UploadStageProgress } from '@/features/ingestion/components/UploadStageProgress';
import { UploadResultSummary } from '@/features/ingestion/components/UploadResultSummary';
import { UploadErrorSummary } from '@/features/ingestion/components/UploadErrorSummary';

const MAX_FILE_SIZE_MB = 5;

export function UploadCard() {
  const navigate = useNavigate();
  const { fileName, isUploading, progress, stage, success, error, responseMessage, setError, reset } = useIngestionStore();
  const { upload } = useUpload();
  const [isDropActive, setIsDropActive] = useState(false);

  const description = useMemo(() => {
    if (success) return 'Resume uploaded successfully and processing has begun.';
    if (error && stage !== 'Resume Upload') return `Ingestion failed during ${stage}. ${error}`;
    if (error) return error;
    if (isUploading) return `Uploading ${fileName ?? 'resume'}... ${progress}%`;
    return 'Drag and drop a PDF or choose a file to begin resume ingestion.';
  }, [error, fileName, isUploading, progress, success, stage]);

  const handleFileSelected = async (file: File | null) => {
    if (!file) {
      setError('Please select a PDF file to upload.');
      return;
    }

    const isPdfFile =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPdfFile) {
      setError('Invalid file. Only PDF files are allowed.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError('File too large. Maximum 5MB allowed.');
      return;
    }

    setError(undefined);
    await upload(file);
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/40">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Resume ingestion</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Upload a candidate resume</h2>
        </div>
        <UploadButton onFileSelected={handleFileSelected} disabled={isUploading} />
      </div>

      <UploadDropzone
        onFileSelected={handleFileSelected}
        disabled={isUploading}
        isActive={isDropActive}
        setIsActive={setIsDropActive}
      />

      <div className="mt-6 rounded-2xl bg-slate-950 p-4 text-left text-sm text-slate-300">
        <p className={error ? 'text-rose-300' : success ? 'text-emerald-300' : 'text-slate-300'}>{description}</p>
        {responseMessage && !error ? (
          <p className="mt-3 text-emerald-200">{responseMessage}</p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500 sm:grid-cols-3">
          <span>Allowed type: PDF</span>
          <span>Max file size: {MAX_FILE_SIZE_MB}MB</span>
          <span>{fileName ? `Selected: ${fileName}` : 'No file selected'}</span>
        </div>
      </div>

      {(isUploading || success || error) && (
        <>
          <UploadStageProgress activeStage={stage} hasError={!!error} />
          {isUploading && (
            <UploadProgress
              progress={progress}
              status="Uploading resume to ingestion endpoint..."
            />
          )}
          {success && (
            <UploadProgress
              progress={progress}
              status="Upload completed. Processing has begun."
            />
          )}
        </>
      )}

      {success && <UploadResultSummary />}
      {error && <UploadErrorSummary errorMessage={error} failedStage={stage} />}

      {(success || error) && (
        <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => {
              reset();
              setIsDropActive(false);
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Upload another resume
          </button>
          {success ? (
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Go to Resume Search
            </button>
          ) : null}
          {error ? (
            <p className="text-sm text-slate-400">
              Fix the issue and upload again, or try a different resume file.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
