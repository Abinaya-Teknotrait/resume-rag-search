import type { UploadStage } from '@/features/ingestion/types/ingestion.types';

const stageOrder: UploadStage[] = [
  'Resume Upload',
  'PDF Processing',
  'Resume Parsing',
  'Embedding Generation',
  'MongoDB Ingestion',
  'Completed',
];

const stageLabels: Record<UploadStage, string> = {
  'Resume Upload': 'Resume Upload',
  'PDF Processing': 'PDF Processing',
  'Resume Parsing': 'Resume Parsing',
  'Embedding Generation': 'Embedding Generation',
  'MongoDB Ingestion': 'MongoDB Ingestion',
  Completed: 'Completed',
};

interface UploadStageProgressProps {
  activeStage: UploadStage;
  hasError?: boolean;
}

export function UploadStageProgress({ activeStage, hasError }: UploadStageProgressProps) {
  const activeIndex = stageOrder.indexOf(activeStage);

  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/90 p-4 text-sm text-slate-300">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs uppercase tracking-[0.28em] text-slate-500">Ingestion progress</span>
        <span className="text-xs text-slate-400">Current stage: {stageLabels[activeStage]}</span>
      </div>
      <div className="flex flex-col gap-3">
        {stageOrder.map((stage, index) => {
          const isComplete = activeStage === 'Completed' ? index <= activeIndex : index < activeIndex;
          const isActive = stage === activeStage && activeStage !== 'Completed';
          const isErrorActive = stage === activeStage && hasError;
          return (
            <div key={stage} className="flex items-center gap-3">
              <div
                className={`h-8 w-8 shrink-0 rounded-full border text-center leading-8 text-xs font-semibold ${
                  isComplete
                    ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                    : isErrorActive
                    ? 'border-rose-400 bg-rose-400 text-slate-950'
                    : isActive
                    ? 'border-sky-400 bg-sky-400 text-slate-950'
                    : 'border-slate-700 bg-slate-900 text-slate-500'
                }`}
              >
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate font-medium ${isActive || isComplete ? 'text-white' : 'text-slate-300'}`}>
                  {stageLabels[stage]}
                </p>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isComplete
                        ? 'bg-emerald-400 w-full'
                        : isErrorActive
                        ? 'bg-rose-400 w-1/2'
                        : isActive
                        ? 'bg-sky-400 w-1/2'
                        : 'bg-slate-700 w-0'
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
