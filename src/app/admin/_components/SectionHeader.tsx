export default function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/85 px-6 py-5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-700">
            Admin Workspace
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">{title}</h2>
          {description && (
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
