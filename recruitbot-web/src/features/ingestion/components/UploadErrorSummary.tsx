import type { UploadStage } from '@/features/ingestion/types/ingestion.types';

interface UploadErrorSummaryProps {
  errorMessage: string;
  failedStage: UploadStage;
}

export function UploadErrorSummary({ errorMessage, failedStage }: UploadErrorSummaryProps) {
  return (
    <div className="mt-6 rounded-3xl border border-rose-500/20 bg-rose-950/10 p-5 text-slate-200 shadow-inner shadow-rose-500/5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-rose-300">Ingestion failed</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Action required</h3>
        </div>
      </div>
      <div className="rounded-2xl border border-rose-500/10 bg-slate-950/80 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-slate-950">
            !
          </span>
          <div>
            <p className="font-semibold text-white">Failed during {failedStage}</p>
            <p className="mt-1 text-sm text-slate-400">{errorMessage}</p>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-400">
        Please correct the issue and try uploading again. If the problem persists, contact your administrator.
      </p>
    </div>
  );
}
