interface CertificationsSectionProps {
  certifications?: string[];
}

export function CertificationsSection({ certifications }: CertificationsSectionProps) {
  if (!certifications || certifications.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Certifications</h3>
      <div className="space-y-2">
        {certifications.map((cert, index) => (
          <div key={index} className="rounded-full bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            {cert}
          </div>
        ))}
      </div>
    </div>
  );
}
