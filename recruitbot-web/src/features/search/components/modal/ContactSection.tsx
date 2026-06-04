interface ContactSectionProps {
  email?: string;
  phone?: string;
  location?: string;
}

export function ContactSection({ email, phone, location }: ContactSectionProps) {
  if (!email && !phone && !location) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Contact</h3>
      <div className="space-y-2">
        {email && (
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="text-base">✉</span>
            <a href={`mailto:${email}`} className="hover:text-sky-400 transition">
              {email}
            </a>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="text-base">☎</span>
            <a href={`tel:${phone}`} className="hover:text-sky-400 transition">
              {phone}
            </a>
          </div>
        )}
        {location && (
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="text-base">📍</span>
            <span>{location}</span>
          </div>
        )}
      </div>
    </div>
  );
}
