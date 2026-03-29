"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { clearTokens, ensureValidSession, getAdminProfile } from "@/lib/admin-auth";

const NAV = [
  {
    title: "概览",
    items: [
      { label: "仪表盘", href: "/admin/dashboard" },
      { label: "数据看板", href: "/admin/analytics" },
    ],
  },
  {
    title: "档案库",
    items: [
      { label: "表情包合集", href: "/admin/archive/collections" },
      { label: "单表情", href: "/admin/archive/emojis" },
      { label: "素材文件", href: "/admin/archive/assets" },
      { label: "资源目录", href: "/admin/archive/telegram" },
      { label: "回收站", href: "/admin/archive/trash" },
    ],
  },
  {
    title: "用户创作",
    items: [
      { label: "创作任务总览", href: "/admin/users/video-jobs" },
      { label: "反馈链路完整性", href: "/admin/users/feedback-integrity?format=all" },
      { label: "样本基线对比", href: "/admin/users/gif-baselines" },
      { label: "SQL巡检(GIF)", href: "/admin/users/gif-sql-health" },
      { label: "任务巡检", href: "/admin/users/video-job-health" },
      { label: "视频任务总览", href: "/admin/users/highlight-jobs" },
      { label: "视频任务GIF列表", href: "/admin/users/highlight-jobs/gif" },
      { label: "视频任务PNG列表", href: "/admin/users/highlight-jobs/png" },
      { label: "视频任务JPG列表", href: "/admin/users/highlight-jobs/jpg" },
      { label: "视频任务WebP列表", href: "/admin/users/highlight-jobs/webp" },
      { label: "视频任务Live列表", href: "/admin/users/highlight-jobs/live" },
      { label: "视频任务MP4列表", href: "/admin/users/highlight-jobs/mp4" },
      { label: "视频转图GIF质量", href: "/admin/settings/video-quality/gif" },
      { label: "视频转图PNG质量", href: "/admin/settings/video-quality/png" },
      { label: "全局阈值设置", href: "/admin/users/global-thresholds" },
      { label: "算力账户", href: "/admin/users/compute-accounts" },
    ],
  },
  {
    title: "主题与分类",
    items: [
      { label: "主题管理", href: "/admin/taxonomy/themes" },
      { label: "分类管理", href: "/admin/taxonomy/categories" },
      { label: "标签管理", href: "/admin/taxonomy/tags" },
      { label: "IP 管理", href: "/admin/taxonomy/ips" },
    ],
  },
  {
    title: "审核与版权",
    items: [
      { label: "待审核", href: "/admin/audit/pending" },
      { label: "加入申请", href: "/admin/audit/join-applications" },
      { label: "举报处理", href: "/admin/audit/reports" },
      { label: "版权库", href: "/admin/audit/rights" },
    ],
  },
  {
    title: "表情包版权",
    items: [
      { label: "版权工作台", href: "/admin/copyright" },
      { label: "合集版权识别", href: "/admin/copyright/collections" },
      { label: "单图版权识别", href: "/admin/copyright/images" },
      { label: "高风险待复核", href: "/admin/copyright/reviews" },
      { label: "标签管理（版权）", href: "/admin/copyright/tags" },
      { label: "识别任务记录", href: "/admin/copyright/tasks" },
    ],
  },
  {
    title: "运营",
    items: [
      { label: "运营数据", href: "/admin/ops/metrics" },
      { label: "XHS 入口", href: "/admin/ops/xhs-generator" },
      { label: "推荐位", href: "/admin/ops/recommend" },
      { label: "排行榜", href: "/admin/ops/ranking" },
      { label: "专题活动", href: "/admin/ops/campaigns" },
    ],
  },
  {
    title: "用户与权限",
    items: [
      { label: "用户列表", href: "/admin/users" },
      { label: "兑换码", href: "/admin/redeem-codes" },
      { label: "算力兑换码", href: "/admin/compute-redeem-codes" },
      { label: "合集次卡", href: "/admin/collection-download-codes" },
      { label: "风控防刷", href: "/admin/users/security" },
      { label: "角色权限", href: "/admin/roles" },
    ],
  },
  {
    title: "系统",
    items: [
      { label: "基础设置", href: "/admin/settings/general" },
      { label: "存储与 CDN", href: "/admin/settings/storage" },
      { label: "数据审计健康", href: "/admin/settings/data-audit" },
      { label: "日志审计", href: "/admin/settings/logs" },
    ],
  },
];

const LONG_GROUP_ITEM_THRESHOLD = 10;
const LONG_GROUP_INITIAL_VISIBLE_COUNT = 8;

function normalizePath(input: string) {
  const [path] = input.split("?");
  const trimmed = path.replace(/\/+$/, "");
  return trimmed || "/";
}

function pathMatchScore(pathname: string, href: string) {
  const current = normalizePath(pathname);
  const target = normalizePath(href);
  if (current === target) {
    return target.length + 10_000; // exact match always wins
  }
  if (current.startsWith(`${target}/`)) {
    return target.length;
  }
  return -1;
}

function resolveBestActiveItem(pathname: string, items: Array<{ href: string }>) {
  let bestHref = "";
  let bestScore = -1;
  for (const item of items) {
    const score = pathMatchScore(pathname, item.href);
    if (score > bestScore) {
      bestScore = score;
      bestHref = item.href;
    }
  }
  return bestScore >= 0 ? bestHref : "";
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedLongGroups, setExpandedLongGroups] = useState<Record<string, boolean>>({});
  const [menuSearch, setMenuSearch] = useState("");
  const profile = getAdminProfile();

  const toggleGroup = (title: string, currentCollapsed: boolean) => {
    setCollapsedGroups(prev => ({ ...prev, [title]: !currentCollapsed }));
  };

  const isSuperAdmin = profile.role === "super_admin";
  const nav = useMemo(
    () => NAV.filter((group) => group.title !== "表情包版权" || isSuperAdmin),
    [isSuperAdmin]
  );
  const menuSearchText = menuSearch.trim().toLowerCase();
  const filteredNav = useMemo(() => {
    if (!menuSearchText) {
      return nav;
    }
    return nav
      .map((group) => {
        const groupMatched = group.title.toLowerCase().includes(menuSearchText);
        const items = groupMatched
          ? group.items
          : group.items.filter(
              (item) =>
                item.label.toLowerCase().includes(menuSearchText) || item.href.toLowerCase().includes(menuSearchText)
            );
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [menuSearchText, nav]);

  const currentLabel = useMemo(() => {
    let bestLabel = "管理后台";
    let bestScore = -1;
    for (const group of nav) {
      for (const item of group.items) {
        const score = pathMatchScore(pathname, item.href);
        if (score > bestScore) {
          bestScore = score;
          bestLabel = item.label;
        }
      }
    }
    return bestLabel;
  }, [pathname, nav]);

  useEffect(() => {
    const guard = async () => {
      if (pathname.startsWith("/admin/login")) {
        setReady(true);
        return;
      }
      const ok = await ensureValidSession();
      if (!ok) {
        clearTokens();
        router.replace("/admin/login");
        return;
      }
      setReady(true);
    };
    guard();
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="admin-theme flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
          <span className="text-sm font-medium">正在初始化工作台...</span>
        </div>
      </div>
    );
  }

  if (pathname.startsWith("/admin/login")) {
    return <div className="admin-theme">{children}</div>;
  }

  return (
    <div className="admin-theme relative flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#dcfce7_0%,#f8fafc_26%,#f1f5f9_100%)] text-slate-900">
      {/* Sidebar */}
      <aside className="hidden w-80 flex-col border-r border-slate-200/70 bg-white shadow-[0_20px_40px_-30px_rgba(2,6,23,0.35)] lg:flex">
        <div className="flex shrink-0 flex-col gap-8 px-6 py-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-lg shadow-lg shadow-emerald-200">
                <span className="filter grayscale brightness-200 contrast-200">🗂️</span>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                  Emoji Archive
                </div>
                <div className="text-lg font-bold tracking-tight text-slate-900">
                  管理控制台
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-6 py-2">
          {filteredNav.map((group) => {
            const groupActiveHref = resolveBestActiveItem(pathname, group.items);
            const groupActive = groupActiveHref !== "";
            const defaultCollapsed = group.items.length > LONG_GROUP_ITEM_THRESHOLD && !groupActive;
            const collapsedOverride = collapsedGroups[group.title];
            const isCollapsed = menuSearchText ? false : typeof collapsedOverride === "boolean" ? collapsedOverride : defaultCollapsed;
            const canFoldLongItems = !menuSearchText && group.items.length > LONG_GROUP_INITIAL_VISIBLE_COUNT;
            const isLongExpanded = expandedLongGroups[group.title] || false;
            const visibleItems =
              canFoldLongItems && !isLongExpanded
                ? group.items.slice(0, LONG_GROUP_INITIAL_VISIBLE_COUNT)
                : group.items;
            return (
              <div key={group.title}>
                <button 
                  onClick={() => toggleGroup(group.title, isCollapsed)}
                  className={`group mb-2 flex w-full items-center justify-between rounded-xl px-3 py-2 transition-colors ${
                    groupActive
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="text-[18px] font-semibold tracking-tight">{group.title}</span>
                  <svg 
                    className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
                    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
                
                <div className={isCollapsed ? "hidden" : "space-y-1"}>
                  {visibleItems.map((item) => {
                    const active = normalizePath(item.href) === normalizePath(groupActiveHref);
                    return (
                      <button
                        key={item.href}
                        onClick={() => router.push(item.href)}
                        className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                          active
                            ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-1.5 w-1.5 rounded-full transition-all ${
                              active
                                ? "bg-emerald-500"
                                : "bg-transparent group-hover:bg-slate-300"
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {active && (
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                  {canFoldLongItems ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedLongGroups((prev) => ({
                          ...prev,
                          [group.title]: !prev[group.title],
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                    >
                      {isLongExpanded
                        ? "收起分组"
                        : `展开更多（+${group.items.length - LONG_GROUP_INITIAL_VISIBLE_COUNT}）`}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {!filteredNav.length ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
              没有匹配的菜单，请更换关键词。
            </div>
          ) : null}
        </nav>

        <div className="shrink-0 border-t border-slate-100 p-6">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50/90 p-4 ring-1 ring-slate-200/70">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 font-bold text-emerald-700">
              {profile.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="truncate text-sm font-bold text-slate-900">
                {profile.name || "管理员"}
              </div>
              <div className="truncate text-[11px] font-medium text-slate-500">
                {profile.role === "super_admin" ? "首席档案官" : "普通管理员"}
              </div>
            </div>
            <button 
              onClick={() => {
                clearTokens();
                router.push("/admin/login");
              }}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
              title="退出登录"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 shrink-0 border-b border-slate-200/70 bg-white px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                <span>Archive</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>Admin</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {currentLabel}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </span>
                <input
                  value={menuSearch}
                  onChange={(event) => setMenuSearch(event.target.value)}
                  className="w-64 rounded-xl border border-slate-200/80 bg-white py-2 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 placeholder:text-slate-400"
                  placeholder="筛选菜单（名称/路径）"
                />
              </div>
              
              <div className="h-8 w-[1px] bg-slate-200 mx-2" />

              <button
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition-all hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0"
                onClick={() => window.location.reload()}
                title="刷新页面"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path d="M21 3v6h-6" />
                </svg>
                <span>刷新</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-[1500px] animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
