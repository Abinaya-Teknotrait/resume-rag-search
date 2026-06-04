import { useNavigate } from 'react-router-dom';
import { UploadCard } from '@/features/ingestion/components/UploadCard';

export default function UploadPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-5xl">
        <div className="mb-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">RecruitBot Ingestion</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Phase 6: Resume ingestion result</h1>
          <p className="mt-3 text-slate-400">
            The upload page now shows structured ingestion progress, completion status, and a final result summary.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Skip upload and search resumes
            </button>
            <p className="text-sm text-slate-400">
              Already have resumes ingested? Go directly to the search/chat experience.
            </p>
          </div>
        </div>
        <UploadCard />
      </div>
    </main>
  );
}
