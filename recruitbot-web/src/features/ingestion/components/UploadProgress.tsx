interface UploadProgressProps {
  progress: number;
  status: string;
}

export function UploadProgress({ progress, status }: UploadProgressProps) {
  return (
    <div className="mt-6 rounded-3xl bg-slate-900/90 p-4 text-sm text-slate-300">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-500">
        <span>Upload progress</span>
        <span>{progress}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-cyan-300 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-slate-400">{status}</p>
    </div>
  );
}
