import SectionHeader from "@/app/admin/_components/SectionHeader";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        title="工作台总览"
        description="欢迎回来，首席档案官。这是今日档案库的运行简报。"
        actions={
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>导出日报</span>
          </button>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { 
            label: "本周新增表情", 
            value: "128", 
            trend: "+12%", 
            positive: true,
            icon: (
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15V6"/><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/></svg>
              </div>
            )
          },
          { 
            label: "待审核条目", 
            value: "19", 
            trend: "-5%", 
            positive: true,
            icon: (
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
            )
          },
          { 
            label: "活跃主题", 
            value: "24", 
            trend: "+3", 
            positive: true,
            icon: (
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
              </div>
            )
          },
        ].map((item) => (
          <div
            key={item.label}
            className="group flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50"
          >
            <div className="flex items-start justify-between">
              {item.icon}
              <div className={`flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold ${
                item.positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              }`}>
                {item.trend}
              </div>
            </div>
            <div className="mt-6">
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {item.label}
              </div>
              <div className="mt-1 text-4xl font-black tracking-tight text-slate-900">
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Popular Collections */}
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">热门合集 TOP 5</h3>
            <button className="text-xs font-bold text-emerald-600 hover:underline">查看全部</button>
          </div>
          <div className="mt-6 space-y-4">
            {["猫猫表情包", "办公摸鱼", "贴纸合集", "情侣日常", "梗图精选"].map(
              (name, index) => (
                <div
                  key={name}
                  className="group flex items-center justify-between rounded-3xl bg-slate-50 px-5 py-4 transition-all hover:bg-white hover:shadow-md hover:ring-1 hover:ring-slate-100"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200 text-xs font-black text-slate-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      {index + 1}
                    </span>
                    <span className="font-bold text-slate-700">{name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-1.5 w-24 rounded-xl bg-slate-200 overflow-hidden">
                      <div 
                        className="h-full bg-emerald-400 rounded-xl" 
                        style={{ width: `${100 - index * 15}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-emerald-600">+{10 + index * 4}%</span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Audit Queue */}
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">审核队列</h3>
            <span className="rounded-xl bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-500">
              需要处理
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {[
              { title: "动态表情待审核", count: 12, color: "bg-amber-500" },
              { title: "版权标记待确认", count: 4, color: "bg-emerald-500" },
              { title: "用户举报处理", count: 3, color: "bg-rose-500" },
            ].map((item) => (
              <div
                key={item.title}
                className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 transition-all hover:border-slate-200 hover:shadow-sm"
              >
                <div className={`absolute left-0 top-0 h-full w-1 ${item.color}`} />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-800">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      最后更新: {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{item.count}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-6 w-full rounded-3xl bg-slate-50 py-4 text-sm font-bold text-slate-600 transition-all hover:bg-slate-100">
            进入审核工作台
          </button>
        </div>
      </div>
    </div>
  );
}
