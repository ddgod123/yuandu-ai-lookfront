"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type TodayStatsResponse = {
  date?: string;
  today_new_emojis?: number;
};

type HomeStatsResponse = {
  stat_date?: string;
  total_collections?: number;
  total_emojis?: number;
  updated_at?: string;
  source?: string;
};

type ThemeItem = {
  id: number;
  status?: string;
};

type JoinApplicationListResponse = {
  total?: number;
};

type UploadTaskListResponse = {
  total?: number;
};

type SecurityOverviewResponse = {
  blocked_events_last_24h?: number;
  rate_limited_last_24h?: number;
  active_blacklist_count?: number;
};

type CollectionItem = {
  id: number;
  title?: string;
  download_count?: number;
  file_count?: number;
};

type CollectionListResponse = {
  items?: CollectionItem[];
};

type DashboardTrendPointResponse = {
  date?: string;
  new_emojis?: number;
  downloads?: number;
  blocked_events?: number;
};

type DashboardTrendResponse = {
  items?: DashboardTrendPointResponse[];
};

type DashboardTrendPoint = {
  date: string;
  newEmojis: number;
  downloads: number;
  blockedEvents: number;
};

type DashboardSummary = {
  statDate: string;
  todayNewEmojis: number;
  totalCollections: number;
  totalEmojis: number;
  activeThemes: number;
  source: string;
};

type DashboardQueue = {
  joinApplications: number;
  uploadRunning: number;
  uploadFailed: number;
  blockedLast24h: number;
  rateLimitedLast24h: number;
  activeBlacklist: number;
};

type WorkerQueueInfoResponse = {
  name?: string;
  pending?: number;
  active?: number;
  scheduled?: number;
  retry?: number;
  latency_seconds?: number;
  paused?: boolean;
};

type WorkerLaneHealthResponse = {
  role?: string;
  label?: string;
  queue_name?: string;
  health?: string;
  servers_total?: number;
  servers_active?: number;
  alerts?: string[];
  start_enabled?: boolean;
  start_hint?: string;
  stop_enabled?: boolean;
  stop_hint?: string;
  queue?: WorkerQueueInfoResponse;
};

type WorkerGuardActionResponse = {
  role?: string;
  label?: string;
  queue_name?: string;
  action?: string;
  trigger?: string;
  status?: string;
  message?: string;
  source?: string;
  created_at?: string;
};

type WorkerGuardPolicyResponse = {
  enabled?: boolean;
  auto_pause_enabled?: boolean;
  auto_run_on_health?: boolean;
  latency_warn_seconds?: number;
  latency_critical_seconds?: number;
  pending_warn?: number;
  pending_critical?: number;
  retry_critical?: number;
  stale_queued_critical?: number;
  pause_cooldown_seconds?: number;
};

type WorkerGuardStatusResponse = {
  policy?: WorkerGuardPolicyResponse;
  recommended_actions?: WorkerGuardActionResponse[];
  applied_actions?: WorkerGuardActionResponse[];
  recent_actions?: WorkerGuardActionResponse[];
  last_run_at?: string;
};

type WorkerHealthResponse = {
  health?: string;
  redis_reachable?: boolean;
  queue_name?: string;
  servers_total?: number;
  servers_active?: number;
  queue?: WorkerQueueInfoResponse;
  lanes?: WorkerLaneHealthResponse[];
  stale_queued_jobs?: number;
  alerts?: string[];
  checked_at?: string;
  start_enabled?: boolean;
  start_hint?: string;
  stop_enabled?: boolean;
  stop_hint?: string;
  guard?: WorkerGuardStatusResponse;
};

type DashboardWorkerLane = {
  role: string;
  label: string;
  queueName: string;
  health: "green" | "yellow" | "red" | "unknown";
  serversTotal: number;
  serversActive: number;
  pending: number;
  active: number;
  retry: number;
  scheduled: number;
  latencySeconds: number;
  paused: boolean;
  alerts: string[];
  startEnabled: boolean;
  startHint: string;
  stopEnabled: boolean;
  stopHint: string;
};

type DashboardWorkerGuardAction = {
  role: string;
  label: string;
  queueName: string;
  trigger: string;
  status: string;
  message: string;
  createdAt: string;
};

type DashboardWorkerHealth = {
  health: "green" | "yellow" | "red" | "unknown";
  redisReachable: boolean;
  queueName: string;
  serversTotal: number;
  serversActive: number;
  pending: number;
  active: number;
  retry: number;
  scheduled: number;
  latencySeconds: number;
  staleQueuedJobs: number;
  alerts: string[];
  checkedAt: string;
  startEnabled: boolean;
  startHint: string;
  stopEnabled: boolean;
  stopHint: string;
  lanes: DashboardWorkerLane[];
  guardEnabled: boolean;
  guardAutoPause: boolean;
  guardAutoRun: boolean;
  guardLastRunAt: string;
  guardRecommended: DashboardWorkerGuardAction[];
  guardApplied: DashboardWorkerGuardAction[];
  guardRecent: DashboardWorkerGuardAction[];
};

const EMPTY_SUMMARY: DashboardSummary = {
  statDate: "",
  todayNewEmojis: 0,
  totalCollections: 0,
  totalEmojis: 0,
  activeThemes: 0,
  source: "",
};

const EMPTY_QUEUE: DashboardQueue = {
  joinApplications: 0,
  uploadRunning: 0,
  uploadFailed: 0,
  blockedLast24h: 0,
  rateLimitedLast24h: 0,
  activeBlacklist: 0,
};

const EMPTY_WORKER_HEALTH: DashboardWorkerHealth = {
  health: "unknown",
  redisReachable: false,
  queueName: "media",
  serversTotal: 0,
  serversActive: 0,
  pending: 0,
  active: 0,
  retry: 0,
  scheduled: 0,
  latencySeconds: 0,
  staleQueuedJobs: 0,
  alerts: [],
  checkedAt: "",
  startEnabled: false,
  startHint: "",
  stopEnabled: false,
  stopHint: "",
  lanes: [],
  guardEnabled: false,
  guardAutoPause: false,
  guardAutoRun: false,
  guardLastRunAt: "",
  guardRecommended: [],
  guardApplied: [],
  guardRecent: [],
};

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    throw new Error(`request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
  const [queue, setQueue] = useState<DashboardQueue>(EMPTY_QUEUE);
  const [workerHealth, setWorkerHealth] = useState<DashboardWorkerHealth>(EMPTY_WORKER_HEALTH);
  const [topCollections, setTopCollections] = useState<CollectionItem[]>([]);
  const [trendItems, setTrendItems] = useState<DashboardTrendPoint[]>([]);
  const [fetchedAt, setFetchedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [workerActionLoadingKey, setWorkerActionLoadingKey] = useState("");
  const [workerActionMessage, setWorkerActionMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    const failedParts: string[] = [];

    try {
      const [
        todayResult,
        homeResult,
        themeResult,
        joinResult,
        uploadRunningResult,
        uploadFailedResult,
        securityResult,
        collectionResult,
        trendResult,
        workerResult,
      ] = await Promise.allSettled([
        fetchJSON<TodayStatsResponse>(`${API_BASE}/api/stats/today`),
        fetchJSON<HomeStatsResponse>(`${API_BASE}/api/stats/home`),
        fetchJSON<ThemeItem[]>(`${API_BASE}/api/admin/themes`),
        fetchJSON<JoinApplicationListResponse>(
          `${API_BASE}/api/admin/join-applications?page=1&page_size=1`
        ),
        fetchJSON<UploadTaskListResponse>(
          `${API_BASE}/api/admin/upload-tasks?page=1&page_size=1&status=running`
        ),
        fetchJSON<UploadTaskListResponse>(
          `${API_BASE}/api/admin/upload-tasks?page=1&page_size=1&status=failed`
        ),
        fetchJSON<SecurityOverviewResponse>(`${API_BASE}/api/admin/security/overview`),
        fetchJSON<CollectionListResponse>(
          `${API_BASE}/api/collections?page=1&page_size=5&sort=download_count&order=desc&status=active&visibility=public`
        ),
        fetchJSON<DashboardTrendResponse>(`${API_BASE}/api/admin/dashboard/trends?days=7`),
        fetchJSON<WorkerHealthResponse>(`${API_BASE}/api/admin/system/worker-health`),
      ]);

      const todayData =
        todayResult.status === "fulfilled" ? todayResult.value : (failedParts.push("今日新增"), {});
      const homeData =
        homeResult.status === "fulfilled" ? homeResult.value : (failedParts.push("站点概览"), {});
      const themeData =
        themeResult.status === "fulfilled" ? themeResult.value : (failedParts.push("主题统计"), []);
      const joinData =
        joinResult.status === "fulfilled" ? joinResult.value : (failedParts.push("加入申请"), {});
      const uploadRunningData =
        uploadRunningResult.status === "fulfilled"
          ? uploadRunningResult.value
          : (failedParts.push("上传任务(运行中)"), {});
      const uploadFailedData =
        uploadFailedResult.status === "fulfilled"
          ? uploadFailedResult.value
          : (failedParts.push("上传任务(失败)"), {});
      const securityData =
        securityResult.status === "fulfilled"
          ? securityResult.value
          : (failedParts.push("风控概览"), {});
      const collectionData =
        collectionResult.status === "fulfilled"
          ? collectionResult.value
          : (failedParts.push("热门合集"), {});
      const trendData =
        trendResult.status === "fulfilled" ? trendResult.value : (failedParts.push("7天趋势"), {});
      const workerData =
        workerResult.status === "fulfilled"
          ? workerResult.value
          : (failedParts.push("Worker健康"), {});

      const activeThemes = Array.isArray(themeData)
        ? themeData.filter((item) => {
            const status = (item.status || "").trim().toLowerCase();
            return !status || status === "active";
          }).length
        : 0;

      setSummary({
        statDate: (todayData.date || homeData.stat_date || "").trim(),
        todayNewEmojis: Number(todayData.today_new_emojis || 0),
        totalCollections: Number(homeData.total_collections || 0),
        totalEmojis: Number(homeData.total_emojis || 0),
        activeThemes,
        source: (homeData.source || "").trim(),
      });

      setQueue({
        joinApplications: Number(joinData.total || 0),
        uploadRunning: Number(uploadRunningData.total || 0),
        uploadFailed: Number(uploadFailedData.total || 0),
        blockedLast24h: Number(securityData.blocked_events_last_24h || 0),
        rateLimitedLast24h: Number(securityData.rate_limited_last_24h || 0),
        activeBlacklist: Number(securityData.active_blacklist_count || 0),
      });

      setTopCollections(
        Array.isArray(collectionData.items) ? collectionData.items.slice(0, 5) : []
      );
      setTrendItems(
        Array.isArray(trendData.items)
          ? trendData.items.map((item) => ({
              date: (item.date || "").trim(),
              newEmojis: Number(item.new_emojis || 0),
              downloads: Number(item.downloads || 0),
              blockedEvents: Number(item.blocked_events || 0),
            }))
          : []
      );
      setWorkerHealth({
        health: normalizeWorkerHealth(workerData.health),
        redisReachable: Boolean(workerData.redis_reachable),
        queueName: (workerData.queue?.name || workerData.queue_name || "media").trim() || "media",
        serversTotal: Number(workerData.servers_total || 0),
        serversActive: Number(workerData.servers_active || 0),
        pending: Number(workerData.queue?.pending || 0),
        active: Number(workerData.queue?.active || 0),
        retry: Number(workerData.queue?.retry || 0),
        scheduled: Number(workerData.queue?.scheduled || 0),
        latencySeconds: Number(workerData.queue?.latency_seconds || 0),
        staleQueuedJobs: Number(workerData.stale_queued_jobs || 0),
        alerts: Array.isArray(workerData.alerts) ? workerData.alerts.filter(Boolean).slice(0, 3) : [],
        checkedAt: (workerData.checked_at || "").trim(),
        startEnabled: Boolean(workerData.start_enabled),
        startHint: (workerData.start_hint || "").trim(),
        stopEnabled: Boolean(workerData.stop_enabled),
        stopHint: (workerData.stop_hint || "").trim(),
        lanes: Array.isArray(workerData.lanes)
          ? workerData.lanes.map((lane) => ({
              role: ((lane.role || "").trim().toLowerCase() || "unknown"),
              label: (lane.label || "").trim() || ((lane.role || "").trim().toUpperCase() || "UNKNOWN"),
              queueName: (lane.queue?.name || lane.queue_name || "").trim(),
              health: normalizeWorkerHealth(lane.health),
              serversTotal: Number(lane.servers_total || 0),
              serversActive: Number(lane.servers_active || 0),
              pending: Number(lane.queue?.pending || 0),
              active: Number(lane.queue?.active || 0),
              retry: Number(lane.queue?.retry || 0),
              scheduled: Number(lane.queue?.scheduled || 0),
              latencySeconds: Number(lane.queue?.latency_seconds || 0),
              paused: Boolean(lane.queue?.paused),
              alerts: Array.isArray(lane.alerts) ? lane.alerts.filter(Boolean).slice(0, 2) : [],
              startEnabled: Boolean(lane.start_enabled),
              startHint: (lane.start_hint || "").trim(),
              stopEnabled: Boolean(lane.stop_enabled),
              stopHint: (lane.stop_hint || "").trim(),
            }))
          : [],
        guardEnabled: Boolean(workerData.guard?.policy?.enabled),
        guardAutoPause: Boolean(workerData.guard?.policy?.auto_pause_enabled),
        guardAutoRun: Boolean(workerData.guard?.policy?.auto_run_on_health),
        guardLastRunAt: (workerData.guard?.last_run_at || "").trim(),
        guardRecommended: mapWorkerGuardActions(workerData.guard?.recommended_actions),
        guardApplied: mapWorkerGuardActions(workerData.guard?.applied_actions),
        guardRecent: mapWorkerGuardActions(workerData.guard?.recent_actions),
      });
      setFetchedAt(new Date().toISOString());

      if (failedParts.length >= 10) {
        setError("仪表盘数据加载失败，请稍后重试");
      } else if (failedParts.length > 0) {
        setError(`部分数据未加载成功：${failedParts.join("、")}`);
      }
    } catch {
      setError("仪表盘数据加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleWorkerAction = useCallback(
    async (action: "start" | "stop", role: string) => {
      const normalizedRole = (role || "").trim().toLowerCase() || "all";
      const loadingKey = `${action}:${normalizedRole}`;
      if (workerActionLoadingKey) return;
      setWorkerActionLoadingKey(loadingKey);
      setWorkerActionMessage("");
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/system/worker-${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: normalizedRole }),
        });
        let payload: { message?: string; error?: string } = {};
        try {
          payload = (await res.json()) as { message?: string; error?: string };
        } catch {
          payload = {};
        }
        if (!res.ok) {
          throw new Error((payload.error || "").trim() || `HTTP ${res.status}`);
        }
        const defaultMsg = action === "start" ? "Worker 启动命令已执行" : "Worker 停机命令已执行";
        setWorkerActionMessage((payload.message || defaultMsg).trim());
        await loadDashboard();
      } catch (e) {
        const message = e instanceof Error ? e.message : "未知错误";
        setWorkerActionMessage(`${action === "start" ? "启动" : "停机"}失败：${message}`);
      } finally {
        setWorkerActionLoadingKey("");
      }
    },
    [loadDashboard, workerActionLoadingKey]
  );

  const handleRunWorkerGuard = useCallback(
    async (apply: boolean) => {
      const loadingKey = apply ? "guard:apply" : "guard:preview";
      if (workerActionLoadingKey) return;
      setWorkerActionLoadingKey(loadingKey);
      setWorkerActionMessage("");
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/system/worker-guard/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apply }),
        });
        let payload: { message?: string; error?: string } = {};
        try {
          payload = (await res.json()) as { message?: string; error?: string };
        } catch {
          payload = {};
        }
        if (!res.ok) {
          throw new Error((payload.error || "").trim() || `HTTP ${res.status}`);
        }
        setWorkerActionMessage((payload.message || "Worker Guard 已执行").trim());
        await loadDashboard();
      } catch (e) {
        const message = e instanceof Error ? e.message : "未知错误";
        setWorkerActionMessage(`执行 guard 失败：${message}`);
      } finally {
        setWorkerActionLoadingKey("");
      }
    },
    [loadDashboard, workerActionLoadingKey]
  );

  const needsAttention = queue.uploadFailed + queue.blockedLast24h + queue.rateLimitedLast24h;
  const workerHealthMeta = useMemo(() => {
    switch (workerHealth.health) {
      case "green":
        return { label: "健康", className: "bg-emerald-50 text-emerald-600 border-emerald-200" };
      case "yellow":
        return { label: "亚健康", className: "bg-amber-50 text-amber-700 border-amber-200" };
      case "red":
        return { label: "异常", className: "bg-rose-50 text-rose-600 border-rose-200" };
      default:
        return { label: "未知", className: "bg-slate-100 text-slate-500 border-slate-200" };
    }
  }, [workerHealth.health]);
  const maxDownload = useMemo(
    () =>
      topCollections.reduce(
        (currentMax, item) => Math.max(currentMax, Number(item.download_count || 0)),
        0
      ),
    [topCollections]
  );

  const summaryCards = useMemo(
    () => [
      {
        label: "今日新增表情",
        value: summary.todayNewEmojis,
        badge: summary.statDate ? summary.statDate : "实时",
        badgeClassName: "bg-emerald-50 text-emerald-600",
        icon: (
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15V6" />
              <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
              <path d="M12 12H3" />
              <path d="M16 6H3" />
              <path d="M12 18H3" />
            </svg>
          </div>
        ),
      },
      {
        label: "公开表情总数",
        value: summary.totalEmojis,
        badge: summary.source === "snapshot" ? "快照" : "实时",
        badgeClassName: "bg-sky-50 text-sky-600",
        icon: (
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
        ),
      },
      {
        label: "活跃主题",
        value: summary.activeThemes,
        badge: fetchedAt ? `更新 ${formatClock(fetchedAt)}` : "实时",
        badgeClassName: "bg-indigo-50 text-indigo-600",
        icon: (
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v18" />
              <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
              <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
              <path d="M7 21h10" />
              <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
            </svg>
          </div>
        ),
      },
    ],
    [fetchedAt, summary.activeThemes, summary.source, summary.statDate, summary.todayNewEmojis, summary.totalEmojis]
  );

  const queueItems = useMemo(
    () => [
      {
        title: "上传失败任务",
        helper: `运行中 ${queue.uploadRunning}`,
        count: queue.uploadFailed,
        color: "bg-rose-500",
        href: "/admin/archive/assets",
      },
      {
        title: "加入申请总量",
        helper: "请定期处理",
        count: queue.joinApplications,
        color: "bg-amber-500",
        href: "/admin/audit/join-applications",
      },
      {
        title: "风控拦截（24h）",
        helper: `限流 ${queue.rateLimitedLast24h} · 黑名单 ${queue.activeBlacklist}`,
        count: queue.blockedLast24h,
        color: "bg-emerald-500",
        href: "/admin/users/security",
      },
    ],
    [
      queue.activeBlacklist,
      queue.blockedLast24h,
      queue.joinApplications,
      queue.rateLimitedLast24h,
      queue.uploadFailed,
      queue.uploadRunning,
    ]
  );

  const handleExportReport = useCallback(() => {
    const payload = {
      exported_at: new Date().toISOString(),
      summary,
      queue,
      trends: trendItems.map((item) => ({
        date: item.date,
        new_emojis: item.newEmojis,
        downloads: item.downloads,
        blocked_events: item.blockedEvents,
      })),
      top_collections: topCollections.map((item) => ({
        id: item.id,
        title: item.title || `合集 #${item.id}`,
        download_count: Number(item.download_count || 0),
        file_count: Number(item.file_count || 0),
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const link = document.createElement("a");
    const dateLabel = (summary.statDate || new Date().toISOString().slice(0, 10)).replaceAll("/", "-");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `dashboard-report-${dateLabel}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [queue, summary, topCollections, trendItems]);

  return (
    <div className="space-y-8">
      <SectionHeader
        title="工作台总览"
        description={
          fetchedAt
            ? `公开合集 ${formatNumber(summary.totalCollections)} · 公开表情 ${formatNumber(
                summary.totalEmojis
              )} · 更新于 ${formatDateTime(fetchedAt)}`
            : "欢迎回来，首席档案官。这是今日档案库的运行简报。"
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
              onClick={loadDashboard}
              disabled={loading}
            >
              {loading ? "刷新中..." : "刷新"}
            </button>
            <button
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
              onClick={handleExportReport}
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>导出日报</span>
            </button>
          </div>
        }
      />

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {summaryCards.map((item) => (
          <div
            key={item.label}
            className="group flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50"
          >
            <div className="flex items-start justify-between">
              {item.icon}
              <div className={`rounded-xl px-2 py-1 text-[11px] font-bold ${item.badgeClassName}`}>
                {item.badge}
              </div>
            </div>
            <div className="mt-6">
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {item.label}
              </div>
              <div className="mt-1 text-4xl font-black tracking-tight text-slate-900">
                {formatNumber(item.value)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-bold text-slate-900">Worker 服务健康</div>
            <div className="mt-1 text-xs text-slate-500">
              Redis {workerHealth.redisReachable ? "已连接" : "未连接"} · 队列 {workerHealth.queueName}
              {workerHealth.checkedAt ? ` · 更新于 ${formatDateTime(workerHealth.checkedAt)}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${workerHealthMeta.className}`}
            >
              {workerHealthMeta.label}
            </span>
            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void handleWorkerAction("start", "all")}
              disabled={!workerHealth.startEnabled || workerActionLoadingKey !== ""}
              title={workerHealth.startEnabled ? "恢复队列并尝试启动 worker" : workerHealth.startHint}
            >
              {workerActionLoadingKey === "start:all" ? "启动中..." : "一键启动 Worker"}
            </button>
            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void handleWorkerAction("stop", "all")}
              disabled={!workerHealth.stopEnabled || workerActionLoadingKey !== ""}
              title={workerHealth.stopEnabled ? "暂停队列并尝试停机 worker" : workerHealth.stopHint}
            >
              {workerActionLoadingKey === "stop:all" ? "停机中..." : "一键停机 Worker"}
            </button>
            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void handleRunWorkerGuard(false)}
              disabled={workerActionLoadingKey !== "" || !workerHealth.guardEnabled}
              title={workerHealth.guardEnabled ? "只做巡检预览，不执行动作" : "Guard 未启用"}
            >
              {workerActionLoadingKey === "guard:preview" ? "巡检中..." : "巡检预览"}
            </button>
            <button
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void handleRunWorkerGuard(true)}
              disabled={workerActionLoadingKey !== "" || !workerHealth.guardEnabled}
              title={workerHealth.guardEnabled ? "执行一次自动巡检策略" : "Guard 未启用"}
            >
              {workerActionLoadingKey === "guard:apply" ? "执行中..." : "执行自动巡检"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500">在线 Worker</div>
            <div className="mt-1 text-xl font-bold text-slate-900">
              {formatNumber(workerHealth.serversActive)} / {formatNumber(workerHealth.serversTotal)}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500">队列积压</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{formatNumber(workerHealth.pending)}</div>
            <div className="mt-1 text-[11px] text-slate-400">
              active {formatNumber(workerHealth.active)} · retry {formatNumber(workerHealth.retry)}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500">排队超时任务</div>
            <div className="mt-1 text-xl font-bold text-slate-900">
              {formatNumber(workerHealth.staleQueuedJobs)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              latency {Math.max(0, Math.round(workerHealth.latencySeconds))}s
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500">调度中</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{formatNumber(workerHealth.scheduled)}</div>
            <div className="mt-1 text-[11px] text-slate-400">
              {workerHealth.startEnabled
                ? "已启用一键启动"
                : workerHealth.startHint || "未启用一键启动"}
            </div>
          </div>
        </div>

        {workerActionMessage && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {workerActionMessage}
          </div>
        )}
        {workerHealth.alerts.length > 0 && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {workerHealth.alerts.join("；")}
          </div>
        )}

        <div className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-3 py-3 text-xs text-indigo-800">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold">Worker Guard</span>
            <span>开关：{workerHealth.guardEnabled ? "开启" : "关闭"}</span>
            <span>自动暂停：{workerHealth.guardAutoPause ? "开启" : "关闭"}</span>
            <span>健康页自动执行：{workerHealth.guardAutoRun ? "开启" : "关闭"}</span>
            <span>最近执行：{workerHealth.guardLastRunAt ? formatDateTime(workerHealth.guardLastRunAt) : "-"}</span>
          </div>
          <div className="mt-1">
            本次建议 {workerHealth.guardRecommended.length} 项，已执行 {workerHealth.guardApplied.length} 项
          </div>
          {workerHealth.guardRecent.length > 0 && (
            <div className="mt-2 rounded-xl border border-indigo-100 bg-white px-2 py-2 text-[11px] text-indigo-700">
              最近动作：{workerHealth.guardRecent.slice(0, 3).map((item) => `${item.label || item.role}:${item.status}`).join("；")}
            </div>
          )}
        </div>

        {workerHealth.lanes.length > 0 && (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {workerHealth.lanes.map((lane) => {
              const laneMeta =
                lane.health === "green"
                  ? { label: "健康", className: "border-emerald-200 bg-emerald-50 text-emerald-700" }
                  : lane.health === "yellow"
                    ? { label: "告警", className: "border-amber-200 bg-amber-50 text-amber-700" }
                    : lane.health === "red"
                      ? { label: "异常", className: "border-rose-200 bg-rose-50 text-rose-700" }
                      : { label: "未知", className: "border-slate-200 bg-slate-100 text-slate-600" };
              const started = lane.serversActive > 0 || lane.serversTotal > 0;
              const startKey = `start:${lane.role}`;
              const stopKey = `stop:${lane.role}`;
              return (
                <div key={`${lane.role}-${lane.queueName}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{lane.label} Worker</div>
                      <div className="text-[11px] text-slate-500">{lane.queueName || "-"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!started ? (
                        <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                          未启动
                        </span>
                      ) : null}
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${laneMeta.className}`}>
                        {laneMeta.label}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-slate-600">
                    <div>在线：{formatNumber(lane.serversActive)}/{formatNumber(lane.serversTotal)}</div>
                    <div>积压：{formatNumber(lane.pending)}</div>
                    <div>延迟：{Math.max(0, Math.round(lane.latencySeconds))}s</div>
                    <div>状态：{lane.paused ? "队列已暂停" : "队列运行中"}</div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => void handleWorkerAction("start", lane.role)}
                      disabled={!lane.startEnabled || workerActionLoadingKey !== ""}
                      title={lane.startEnabled ? "恢复此专线队列并尝试启动" : lane.startHint}
                    >
                      {workerActionLoadingKey === startKey ? "启动中..." : "启动"}
                    </button>
                    <button
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => void handleWorkerAction("stop", lane.role)}
                      disabled={!lane.stopEnabled || workerActionLoadingKey !== ""}
                      title={lane.stopEnabled ? "暂停此专线队列并尝试停机" : lane.stopHint}
                    >
                      {workerActionLoadingKey === stopKey ? "停机中..." : "停机"}
                    </button>
                  </div>
                  {lane.alerts.length > 0 && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                      {lane.alerts.join("；")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">近 7 天趋势</h3>
          <span className="text-xs text-slate-400">新增 / 下载 / 风控拦截</span>
        </div>
        {trendItems.length > 0 ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <TrendMiniBars
              title="新增表情"
              colorClassName="bg-emerald-400"
              items={trendItems}
              getValue={(item) => item.newEmojis}
            />
            <TrendMiniBars
              title="下载次数"
              colorClassName="bg-sky-400"
              items={trendItems}
              getValue={(item) => item.downloads}
            />
            <TrendMiniBars
              title="风控拦截"
              colorClassName="bg-rose-400"
              items={trendItems}
              getValue={(item) => item.blockedEvents}
            />
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center text-sm text-slate-400">
            {loading ? "正在加载趋势数据..." : "暂无趋势数据"}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">热门合集 TOP 5（按下载）</h3>
            <Link href="/admin/archive/collections" className="text-xs font-bold text-emerald-600 hover:underline">
              查看全部
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {topCollections.map((item, index) => {
              const downloadCount = Number(item.download_count || 0);
              const progressWidth =
                maxDownload > 0 ? Math.max(8, Math.round((downloadCount / maxDownload) * 100)) : 0;
              return (
                <div
                  key={item.id}
                  className="group flex items-center justify-between rounded-3xl bg-slate-50 px-5 py-4 transition-all hover:bg-white hover:shadow-md hover:ring-1 hover:ring-slate-100"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200 text-xs font-black text-slate-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-700">
                        {item.title?.trim() || `合集 #${item.id}`}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatNumber(Number(item.file_count || 0))} 张表情
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-1.5 w-24 overflow-hidden rounded-xl bg-slate-200">
                      <div
                        className="h-full rounded-xl bg-emerald-400"
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-emerald-600">
                      {formatNumber(downloadCount)}
                    </span>
                  </div>
                </div>
              );
            })}
            {!topCollections.length && (
              <div className="rounded-3xl border border-dashed border-slate-200 px-5 py-8 text-center text-sm text-slate-400">
                {loading ? "正在加载热门合集..." : "暂无下载数据"}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">审核队列</h3>
            <span
              className={`rounded-xl px-2.5 py-1 text-[10px] font-black ${
                needsAttention > 0 ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {needsAttention > 0 ? "需要处理" : "运行稳定"}
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {queueItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="relative block overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 transition-all hover:border-slate-200 hover:shadow-sm"
              >
                <div className={`absolute left-0 top-0 h-full w-1 ${item.color}`} />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-800">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.helper}</div>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{formatNumber(item.count)}</div>
                </div>
              </Link>
            ))}
          </div>
          <Link
            href="/admin/users/security"
            className="mt-6 block w-full rounded-3xl bg-slate-50 py-4 text-center text-sm font-bold text-slate-600 transition-all hover:bg-slate-100"
          >
            进入风控工作台
          </Link>
        </div>
      </div>
    </div>
  );
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 10000) return `${(value / 10000).toFixed(1)}w`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

function formatClock(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--:--";
  return parsed.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("zh-CN", { hour12: false });
}

function normalizeWorkerHealth(value?: string): "green" | "yellow" | "red" | "unknown" {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "green" || normalized === "yellow" || normalized === "red") {
    return normalized;
  }
  return "unknown";
}

function mapWorkerGuardActions(raw: unknown): DashboardWorkerGuardAction[] {
  if (!Array.isArray(raw)) return [];
  const out: DashboardWorkerGuardAction[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as WorkerGuardActionResponse;
    out.push({
      role: (record.role || "").trim().toLowerCase() || "unknown",
      label: (record.label || "").trim(),
      queueName: (record.queue_name || "").trim(),
      trigger: (record.trigger || "").trim(),
      status: (record.status || "").trim().toLowerCase(),
      message: (record.message || "").trim(),
      createdAt: (record.created_at || "").trim(),
    });
  }
  return out;
}

function TrendMiniBars({
  title,
  colorClassName,
  items,
  getValue,
}: {
  title: string;
  colorClassName: string;
  items: DashboardTrendPoint[];
  getValue: (item: DashboardTrendPoint) => number;
}) {
  const total = items.reduce((sum, item) => sum + Math.max(0, getValue(item)), 0);
  const maxValue = items.reduce((max, item) => Math.max(max, Math.max(0, getValue(item))), 0);

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">{title}</div>
        <div className="text-xs font-semibold text-slate-500">7天累计 {formatNumber(total)}</div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {items.map((item) => {
          const value = Math.max(0, getValue(item));
          const ratio = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
          const height = maxValue > 0 ? Math.max(8, ratio) : 0;
          return (
            <div key={`${title}-${item.date}`} className="flex flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end rounded-md bg-white px-1 pb-1">
                <div
                  className={`w-full rounded-sm ${colorClassName}`}
                  style={{ height: `${height}%` }}
                  title={`${item.date}: ${value}`}
                />
              </div>
              <div className="text-[10px] text-slate-400">{formatShortDate(item.date)}</div>
              <div className="text-[10px] font-semibold text-slate-600">{formatNumber(value)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatShortDate(value: string) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(5);
  return parsed.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}
