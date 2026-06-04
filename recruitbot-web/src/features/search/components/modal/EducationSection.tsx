import type { Education } from '@/types/candidate.types';

interface EducationSectionProps {
  education?: Education[];
}

export function EducationSection({ education }: EducationSectionProps) {
  if (!education || education.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Education</h3>
      <div className="space-y-3">
        {education.map((edu, index) => (
          <div key={index} className="rounded-lg bg-slate-800/30 p-3">
            <p className="font-semibold text-white">{edu.degree}</p>
            <p className="text-sm text-slate-400">{edu.institution}</p>
            {edu.year && <p className="text-xs text-slate-500">{edu.year}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
