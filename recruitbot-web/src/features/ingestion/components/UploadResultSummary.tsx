import { useNavigate } from 'react-router-dom';

export function UploadResultSummary() {
  const navigate = useNavigate();
  const steps = [
    { label: 'Resume uploaded successfully', detail: 'File received and validated by the ingestion service.' },
    { label: 'Embedding generated successfully', detail: 'Resume content converted into semantic vectors.' },
    { label: 'MongoDB ingestion completed', detail: 'Resume document stored and indexed in MongoDB.' },
    { label: 'Vector search ready', detail: 'Resume is now available for retrieval and hybrid search.' },
  ];

  return (
    <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-950/10 p-5 text-slate-200 shadow-inner shadow-emerald-500/5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">Ingestion completed</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Resume ingestion result</h3>
        </div>
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-slate-800 transition hover:bg-slate-800"
        >
          Search resumes
        </button>
      </div>
      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.label} className="rounded-2xl border border-emerald-500/10 bg-slate-950/80 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
                ✓
              </span>
              <div>
                <p className="font-semibold text-white">{step.label}</p>
                <p className="mt-1 text-sm text-slate-400">{step.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
