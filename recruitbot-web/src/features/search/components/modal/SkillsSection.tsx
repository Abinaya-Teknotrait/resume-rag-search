interface SkillsSectionProps {
  skills?: string[];
}

export function SkillsSection({ skills }: SkillsSectionProps) {
  if (!skills || skills.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Skills</h3>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <span
            key={index}
            className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}
