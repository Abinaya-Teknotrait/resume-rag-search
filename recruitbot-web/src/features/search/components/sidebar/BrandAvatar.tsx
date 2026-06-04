import { ReactNode } from 'react';

const StatusDot = ({ children }: { children?: ReactNode }) => (
  <span className="inline-flex items-center gap-2 text-sm text-slate-300">
    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_8px_rgba(16,185,129,0.18)] animate-pulse"></span>
    {children}
  </span>
);

export function BrandAvatar() {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 text-white shadow-xl shadow-fuchsia-500/20">
          <span className="text-lg font-semibold">R</span>
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.32em] text-slate-500">RecruitBot</p>
          <p className="mt-1 text-lg font-semibold text-white">Search workspace</p>
        </div>
      </div>
      <div className="mt-4">
        <StatusDot>Online</StatusDot>
      </div>
    </div>
  );
}
