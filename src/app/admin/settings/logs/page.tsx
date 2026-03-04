import SectionHeader from "@/app/admin/_components/SectionHeader";

export default function Page() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="日志审计"
        description="操作记录与安全审计。"
        actions={
          <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 shadow-sm">
            新建
          </button>
        }
      />
      <div className="rounded-3xl border border-slate-100 bg-white p-6 text-sm text-slate-600">
        这里是「日志审计」管理页面骨架，后续可在此加入列表、筛选、批量操作等功能。
      </div>
    </div>
  );
}
