interface ProjectsSectionProps {
  projects?: { title: string; description: string }[];
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  if (!projects || projects.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Projects</h3>
      <div className="space-y-3">
        {projects.map((project, index) => (
          <div key={index} className="rounded-lg bg-slate-800/30 p-3">
            <p className="font-semibold text-white">{project.title}</p>
            <p className="mt-1 text-sm text-slate-300">{project.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
