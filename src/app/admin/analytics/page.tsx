"use client";

import {
  Activity,
  ArrowDownToLine,
  Clock3,
  Download,
  Globe2,
  MousePointerClick,
  RefreshCw,
  Users,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import {
  ANALYTICS_DIMENSION_OPTIONS,
  ANALYTICS_RANGE_OPTIONS,
  backfillAdminAnalyticsGeo,
  createDefaultAnalyticsQuery,
  fetchAdminAnalyticsDashboard,
  type AdminAnalyticsBreakdownItem,
  type AdminAnalyticsDashboard,
  type AdminAnalyticsGeoItem,
  type AdminAnalyticsQuery,
  type AdminAnalyticsRealtime,
  type AdminAnalyticsTopDownloadItem,
  type AdminAnalyticsTopPageItem,
  type AdminAnalyticsTrendPoint,
  type AnalyticsDimension,
  type AnalyticsRangePreset,
} from "@/lib/admin-analytics";

const DEFAULT_TIMEZONE = "Asia/Shanghai";
const NUMBER_FORMATTER = new Intl.NumberFormat("zh-CN");

type MetricTone = "emerald" | "sky" | "violet" | "amber";

type MetricCardViewModel = {
  title: string;
  value: string;
  helper: string;
  badge: string;
  tone: MetricTone;
  icon: ReactNode;
};

export default function Page() {
  const today = useMemo(() => formatDateOnly(new Date()), []);
  const last7dStart = useMemo(() => formatDateOnly(addDays(new Date(), -6)), []);

  const [query, setQuery] = useState<AdminAnalyticsQuery>(() => ({
    ...createDefaultAnalyticsQuery(DEFAULT_TIMEZONE),
    from: last7dStart,
    to: today,
  }));

  const [draftRange, setDraftRange] = useState<AnalyticsRangePreset>("7d");
  const [draftDimension, setDraftDimension] = useState<AnalyticsDimension>("all");
  const [draftFrom, setDraftFrom] = useState(last7dStart);
  const [draftTo, setDraftTo] = useState(today);

  const [dashboard, setDashboard] = useState<AdminAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [backfillingGeo, setBackfillingGeo] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState("");

  const loadDashboard = useCallback(async (nextQuery: AdminAnalyticsQuery) => {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchAdminAnalyticsDashboard(nextQuery);
      setDashboard(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "数据加载失败，请稍后重试";
      setError(message || "数据加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(query);
  }, [loadDashboard, query]);

  const hasPendingFilterChanges =
    draftRange !== query.range ||
    draftDimension !== query.dimension ||
    (draftRange === "custom" && (draftFrom !== (query.from || "") || draftTo !== (query.to || "")));

  const applyFilters = useCallback(() => {
    setQuery({
      range: draftRange,
      dimension: draftDimension,
      timezone: DEFAULT_TIMEZONE,
      ...(draftRange === "custom"
        ? {
            from: draftFrom || last7dStart,
            to: draftTo || today,
          }
        : {}),
    });
  }, [draftDimension, draftFrom, draftRange, draftTo, last7dStart, today]);

  const handleRefresh = useCallback(() => {
    void loadDashboard(query);
  }, [loadDashboard, query]);

  const handleBackfillGeo = useCallback(async () => {
    setBackfillingGeo(true);
    setBackfillMessage("");
    setError("");
    try {
      const result = await backfillAdminAnalyticsGeo(30, 2000);
      setBackfillMessage(`地域补齐完成：扫描 ${formatNumber(result.scanned)}，更新 ${formatNumber(result.updated)} 条`);
      await loadDashboard(query);
    } catch (err) {
      const message = err instanceof Error ? err.message : "地域补齐失败";
      setError(message || "地域补齐失败");
    } finally {
      setBackfillingGeo(false);
    }
  }, [loadDashboard, query]);

  const handleExportJSON = useCallback(() => {
    if (!dashboard) return;
    const blob = new Blob([JSON.stringify(dashboard, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const link = document.createElement("a");
    const label = `${dashboard.query.from || today}_${dashboard.query.to || today}`.replaceAll("/", "-");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `analytics-dashboard-${label}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [dashboard, today]);

  const windowLabel = useMemo(() => {
    const from = dashboard?.query.from;
    const to = dashboard?.query.to;
    if (!from || !to) return "-";
    if (from === to) return from;
    return `${from} ~ ${to}`;
  }, [dashboard]);

  const selectedDimensionLabel =
    ANALYTICS_DIMENSION_OPTIONS.find((item) => item.value === (dashboard?.query.dimension || query.dimension))
      ?.label || "全部";

  const metricCards = useMemo<MetricCardViewModel[]>(() => {
    if (!dashboard) return [];
    const days = Math.max(dashboard.trends.length, 1);
    const { overview } = dashboard;

    return [
      {
        title: "页面浏览量 PV",
        value: formatNumber(overview.pv),
        helper: `日均 ${formatNumber(Math.round(overview.pv / days))}`,
        badge: "全站访问",
        tone: "sky",
        icon: <MousePointerClick className="h-4 w-4" />,
      },
      {
        title: "独立访客 UV",
        value: formatNumber(overview.uv),
        helper: `会话 ${formatNumber(overview.sessions)}`,
        badge: "去重访客",
        tone: "emerald",
        icon: <Users className="h-4 w-4" />,
      },
      {
        title: "下载总量",
        value: formatNumber(overview.downloads),
        helper: `下载用户 ${formatNumber(overview.downloadUsers)}`,
        badge: `转化 ${formatPercent(overview.downloadRate)}`,
        tone: "violet",
        icon: <Download className="h-4 w-4" />,
      },
      {
        title: "平均停留时长",
        value: formatDuration(overview.avgStaySeconds),
        helper: `新访客占比 ${formatPercent(overview.newVisitorRate)}`,
        badge: "质量指标",
        tone: "amber",
        icon: <Clock3 className="h-4 w-4" />,
      },
    ];
  }, [dashboard]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="运营数据看板"
        description={
          dashboard
            ? `${windowLabel} · 维度：${selectedDimensionLabel} · 更新时间 ${formatDateTime(dashboard.generatedAt)}`
            : "站点流量、下载转化与地域来源全局运营概览。"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "刷新中..." : "刷新"}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleBackfillGeo}
              disabled={backfillingGeo || loading}
              title="按最近 30 天行为事件基于 request_ip 补齐地域"
            >
              {backfillingGeo ? "补齐中..." : "补齐地域"}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={handleExportJSON}
              disabled={!dashboard}
            >
              <ArrowDownToLine className="h-4 w-4" />
              导出 JSON
            </button>
          </div>
        }
      />

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            时间范围
            <select
              value={draftRange}
              onChange={(e) => setDraftRange(e.target.value as AnalyticsRangePreset)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-emerald-300 transition focus:border-emerald-300 focus:ring"
            >
              {ANALYTICS_RANGE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            分析维度
            <select
              value={draftDimension}
              onChange={(e) => setDraftDimension(e.target.value as AnalyticsDimension)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-emerald-300 transition focus:border-emerald-300 focus:ring"
            >
              {ANALYTICS_DIMENSION_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {draftRange === "custom" ? (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                开始日期
                <input
                  type="date"
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-emerald-300 transition focus:border-emerald-300 focus:ring"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                结束日期
                <input
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-emerald-300 transition focus:border-emerald-300 focus:ring"
                />
              </label>
            </>
          ) : (
            <div className="flex items-end rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 lg:col-span-2">
              已选区间：{windowLabel}
            </div>
          )}

          <div className="flex items-end">
            <button
              className="h-10 w-full rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={applyFilters}
              disabled={!hasPendingFilterChanges || loading}
            >
              应用筛选
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span>时区：{query.timezone || DEFAULT_TIMEZONE}</span>
          <span>统计口径：PV=page_view*，下载量=action.downloads + action.collection_downloads，地域=行为事件元数据</span>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}
      {backfillMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {backfillMessage}
        </div>
      ) : null}

      {loading && !dashboard ? <LoadingBlocks /> : null}

      {dashboard ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((item) => (
              <MetricCard key={item.title} item={item} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <TrendChartCard points={dashboard.trends} />
            <RealtimeCard realtime={dashboard.realtime} />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <TopDownloadsCard title="表情包下载 Top 10" items={dashboard.topCollections} />
            <TopDownloadsCard title="单表情下载 Top 10" items={dashboard.topEmojis} />
            <TopPagesCard items={dashboard.topPages} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
            <GeoTableCard items={dashboard.geo} dimensionLabel={selectedDimensionLabel} />
            <div className="space-y-6">
              <BreakdownCard title="访问渠道分布" items={dashboard.channels} valueLabel="访客" />
              <BreakdownCard title="设备分布" items={dashboard.devices} valueLabel="访客" />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ item }: { item: MetricCardViewModel }) {
  const toneClassMap: Record<MetricTone, { icon: string; badge: string }> = {
    emerald: {
      icon: "bg-emerald-50 text-emerald-600 border-emerald-100",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    sky: {
      icon: "bg-sky-50 text-sky-600 border-sky-100",
      badge: "bg-sky-50 text-sky-700 border-sky-100",
    },
    violet: {
      icon: "bg-violet-50 text-violet-600 border-violet-100",
      badge: "bg-violet-50 text-violet-700 border-violet-100",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600 border-amber-100",
      badge: "bg-amber-50 text-amber-700 border-amber-100",
    },
  };

  const tone = toneClassMap[item.tone];

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${tone.icon}`}>{item.icon}</div>
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.badge}`}>
          {item.badge}
        </span>
      </div>
      <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">{item.title}</div>
      <div className="mt-1 text-3xl font-black tracking-tight text-slate-900">{item.value}</div>
      <div className="mt-2 text-xs text-slate-500">{item.helper}</div>
    </div>
  );
}

function TrendChartCard({ points }: { points: AdminAnalyticsTrendPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">暂无趋势数据</div>
      </div>
    );
  }

  const width = 840;
  const height = 300;
  const paddingX = 28;
  const paddingY = 18;

  const pvSeries = points.map((item) => item.pv);
  const uvSeries = points.map((item) => item.uv);
  const downloadSeries = points.map((item) => item.downloads);
  const maxValue = Math.max(1, ...pvSeries, ...uvSeries, ...downloadSeries);

  const pvLine = buildPolyline(pvSeries, width, height, paddingX, paddingY, maxValue);
  const uvLine = buildPolyline(uvSeries, width, height, paddingX, paddingY, maxValue);
  const downloadLine = buildPolyline(downloadSeries, width, height, paddingX, paddingY, maxValue);

  const start = points[0]?.date || "";
  const middle = points[Math.floor(points.length / 2)]?.date || "";
  const end = points[points.length - 1]?.date || "";

  const avgPV = Math.round(pvSeries.reduce((acc, cur) => acc + cur, 0) / points.length);
  const avgDownloads = Math.round(downloadSeries.reduce((acc, cur) => acc + cur, 0) / points.length);
  const peakPV = Math.max(...pvSeries);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">流量与下载趋势</h3>
          <p className="mt-1 text-xs text-slate-500">PV / UV / 下载量（按日聚合）</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <LegendDot colorClassName="bg-sky-500" label="PV" />
          <LegendDot colorClassName="bg-emerald-500" label="UV" />
          <LegendDot colorClassName="bg-violet-500" label="下载量" />
        </div>
      </div>

      <div className="mt-4 h-64 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingY + (1 - ratio) * (height - paddingY * 2);
            return (
              <line
                key={ratio}
                x1={paddingX}
                x2={width - paddingX}
                y1={y}
                y2={y}
                stroke="rgba(148,163,184,0.25)"
                strokeDasharray={ratio === 0 ? "0" : "4 4"}
              />
            );
          })}

          <polyline points={pvLine} fill="none" stroke="#0ea5e9" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <polyline
            points={uvLine}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={downloadLine}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>{formatShortDate(start)}</span>
        <span>{formatShortDate(middle)}</span>
        <span>{formatShortDate(end)}</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SmallStat label="日均 PV" value={formatNumber(avgPV)} />
        <SmallStat label="日均下载" value={formatNumber(avgDownloads)} />
        <SmallStat label="峰值 PV" value={formatNumber(peakPV)} />
      </div>
    </div>
  );
}

function RealtimeCard({ realtime }: { realtime: AdminAnalyticsRealtime }) {
  const peak = Math.max(1, ...realtime.activePages.map((item) => item.pv30m));

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">实时概览</h3>
          <p className="mt-1 text-xs text-slate-500">最近 30 分钟滚动窗口</p>
        </div>
        <Activity className="h-5 w-5 text-emerald-500" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SmallStat label="PV" value={formatNumber(realtime.pv30m)} />
        <SmallStat label="下载" value={formatNumber(realtime.downloads30m)} />
        <SmallStat label="在线" value={formatNumber(realtime.onlineUsers)} />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Globe2 className="h-3.5 w-3.5" />
          实时活跃页面
        </div>
        <div className="mt-3 space-y-2">
          {realtime.activePages.length > 0 ? (
            realtime.activePages.map((item) => (
              <div key={item.path} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate text-slate-600" title={item.path}>
                    {item.title}
                  </span>
                  <span className="font-semibold text-slate-900">{formatNumber(item.pv30m)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500"
                    style={{ width: `${Math.max(4, (item.pv30m / peak) * 100)}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-500">暂无实时活跃页面</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TopDownloadsCard({ title, items }: { title: string; items: AdminAnalyticsTopDownloadItem[] }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-2 text-left">排名</th>
              <th className="py-2 text-left">名称</th>
              <th className="py-2 text-right">下载</th>
              <th className="py-2 text-right">转化</th>
              <th className="py-2 text-right">环比</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 10).map((item, index) => (
              <tr key={item.id} className="border-t border-slate-100 text-xs text-slate-600">
                <td className="py-2.5 font-semibold text-slate-800">#{index + 1}</td>
                <td className="max-w-[160px] py-2.5">
                  <span className="line-clamp-1" title={item.name}>
                    {item.name}
                  </span>
                </td>
                <td className="py-2.5 text-right font-semibold text-slate-900">{formatNumber(item.downloads)}</td>
                <td className="py-2.5 text-right">{formatPercent(item.downloadRate)}</td>
                <td className="py-2.5 text-right">
                  <span
                    className={`font-semibold ${item.growthRate >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {formatSignedPercent(item.growthRate)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TopPagesCard({ items }: { items: AdminAnalyticsTopPageItem[] }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-slate-900">热门页面 Top</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-2 text-left">页面</th>
              <th className="py-2 text-right">PV</th>
              <th className="py-2 text-right">UV</th>
              <th className="py-2 text-right">下载率</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 8).map((item) => (
              <tr key={item.path} className="border-t border-slate-100 text-xs text-slate-600">
                <td className="max-w-[170px] py-2.5">
                  <div className="line-clamp-1 font-medium text-slate-800" title={item.path}>
                    {item.title}
                  </div>
                  <div className="line-clamp-1 text-[11px] text-slate-400">{item.path}</div>
                </td>
                <td className="py-2.5 text-right font-semibold text-slate-900">{formatNumber(item.pv)}</td>
                <td className="py-2.5 text-right">{formatNumber(item.uv)}</td>
                <td className="py-2.5 text-right">{formatPercent(item.downloadRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GeoTableCard({ items, dimensionLabel }: { items: AdminAnalyticsGeoItem[]; dimensionLabel: string }) {
  const totalVisits = Math.max(1, items.reduce((acc, cur) => acc + cur.visits, 0));

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">访问地域分布</h3>
          <p className="mt-1 text-xs text-slate-500">国家 / 省份 / 城市（当前维度：{dimensionLabel}）</p>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-2 text-left">地区</th>
              <th className="py-2 text-right">访问</th>
              <th className="py-2 text-right">独立IP</th>
              <th className="py-2 text-right">下载</th>
              <th className="py-2 text-right">占比</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.country}-${item.region}-${item.city}`} className="border-t border-slate-100 text-xs text-slate-600">
                <td className="py-2.5">
                  <div className="font-medium text-slate-800">{item.city || item.region || item.country}</div>
                  <div className="text-[11px] text-slate-400">
                    {[item.country, item.region].filter(Boolean).join(" · ")}
                  </div>
                </td>
                <td className="py-2.5 text-right font-semibold text-slate-900">{formatNumber(item.visits)}</td>
                <td className="py-2.5 text-right">{formatNumber(item.uniqueIps)}</td>
                <td className="py-2.5 text-right">{formatNumber(item.downloads)}</td>
                <td className="py-2.5 text-right">
                  <div className="ml-auto w-24">
                    <div className="h-1.5 rounded-full bg-slate-200">
                      <div
                        className="h-1.5 rounded-full bg-sky-500"
                        style={{ width: `${Math.max(4, (item.visits / totalVisits) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">{formatPercent(item.visits / totalVisits)}</div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  items,
  valueLabel,
}: {
  title: string;
  items: AdminAnalyticsBreakdownItem[];
  valueLabel: string;
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.key}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{item.label}</span>
              <span className="text-slate-500">
                {formatNumber(item.value)} {valueLabel} · {formatPercent(item.share)}
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{ width: `${Math.max(4, (item.value / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingBlocks() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-3xl border border-slate-100 bg-white" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-3xl border border-slate-100 bg-white" />
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-64 animate-pulse rounded-3xl border border-slate-100 bg-white" />
        ))}
      </div>
    </div>
  );
}

function LegendDot({ colorClassName, label }: { colorClassName: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span className={`h-2.5 w-2.5 rounded-full ${colorClassName}`} />
      {label}
    </span>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function buildPolyline(
  values: number[],
  width: number,
  height: number,
  paddingX: number,
  paddingY: number,
  maxValue: number
) {
  if (values.length === 0) return "";

  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const step = values.length > 1 ? innerWidth / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = paddingX + step * index;
      const y = paddingY + (1 - value / Math.max(maxValue, 1)) * innerHeight;
      return `${x},${y}`;
    })
    .join(" ");
}

function formatNumber(value: number) {
  return NUMBER_FORMATTER.format(Math.round(value));
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${(value * 100).toFixed(1)}%`;
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total}s`;
  const minute = Math.floor(total / 60);
  const second = total % 60;
  if (minute < 60) {
    return second === 0 ? `${minute}m` : `${minute}m ${second}s`;
  }
  const hour = Math.floor(minute / 60);
  const restMinute = minute % 60;
  return restMinute === 0 ? `${hour}h` : `${hour}h ${restMinute}m`;
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");

  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function formatShortDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value || "-";
  return `${match[2]}-${match[3]}`;
}

function addDays(date: Date, diff: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + diff);
  return next;
}

function formatDateOnly(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
