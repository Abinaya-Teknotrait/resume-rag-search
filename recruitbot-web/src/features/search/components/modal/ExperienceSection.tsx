import type { Experience } from '@/types/candidate.types';

interface ExperienceSectionProps {
  experience?: Experience[];
  experienceSummary?: string;
}

export function ExperienceSection({ experience, experienceSummary }: ExperienceSectionProps) {
  if ((!experience || experience.length === 0) && !experienceSummary) return null;

  if (!experience || experience.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Experience</h3>
        <div className="rounded-lg border-l-2 border-slate-700 bg-slate-900/50 p-4">
          <p className="font-semibold text-white">Summary</p>
          <p className="mt-2 text-sm text-slate-300 whitespace-pre-line">{experienceSummary}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Experience</h3>
      <div className="space-y-4">
        {experience.map((exp, index) => (
          <div key={index} className="border-l-2 border-slate-700 pl-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-white">{exp.title}</p>
                <p className="text-sm text-slate-400">{exp.company}</p>
              </div>
              {exp.duration && <span className="text-xs text-slate-500">{exp.duration}</span>}
            </div>
            {exp.description && <p className="mt-2 text-sm text-slate-300">{exp.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
