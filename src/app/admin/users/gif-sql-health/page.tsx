"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type AdminGIFHealthSchemaCheck = {
  table_name: string;
  column_name: string;
  status: "ok" | "missing" | string;
};

type AdminGIFHealthJobsSummary = {
  jobs_total?: number;
  jobs_done?: number;
  jobs_failed?: number;
  jobs_running?: number;
  jobs_queued?: number;
  done_rate?: number;
  failed_rate?: number;
};

type AdminGIFHealthOutputsSummary = {
  outputs_total?: number;
  avg_size_bytes?: number;
  p50_size_bytes?: number;
  p95_size_bytes?: number;
  avg_width?: number;
  avg_height?: number;
};

type AdminGIFHealthLoopTuneSummary = {
  samples?: number;
  applied?: number;
  effective_applied?: number;
  fallback_to_base?: number;
  applied_rate?: number;
  effective_applied_rate?: number;
  fallback_rate?: number;
  avg_score?: number;
  avg_loop_closure?: number;
  avg_motion_mean?: number;
  avg_effective_sec?: number;
};

type AdminGIFHealthOptimizerSummary = {
  samples?: number;
  attempted?: number;
  applied?: number;
  applied_rate?: number;
  avg_saved_ratio?: number;
  avg_saved_bytes?: number;
};

type AdminGIFHealthPathSummary = {
  total?: number;
  new_path_prefix_count?: number;
  new_path_strict_count?: number;
  new_path_prefix_rate?: number;
  new_path_strict_rate?: number;
};

type AdminGIFHealthFailureReason = {
  error_code?: string;
  error_message?: string;
  count?: number;
};

type AdminGIFHealthConsistencySummary = {
  done_without_main_output?: number;
  failed_but_has_main_output?: number;
  running_but_has_main_output?: number;
};

type AdminGIFHealthIntegritySummary = {
  samples?: number;
  missing_object_key?: number;
  non_positive_size?: number;
  invalid_dimension?: number;
  tune_applied_but_zero_score?: number;
};

type AdminGIFHealthCandidateRejectSummary = {
  samples?: number;
  rejected?: number;
  reject_rate?: number;
  low_emotion?: number;
  low_confidence?: number;
  duplicate_candidate?: number;
  blur_low?: number;
  size_budget_exceeded?: number;
  loop_poor?: number;
  unknown_reason?: number;
};

type AdminGIFHealthCandidateRejectItem = {
  reason?: string;
  count?: number;
  rate?: number;
};

type AdminGIFHealthAlert = {
  level?: "critical" | "warn" | "info" | string;
  code?: string;
  message?: string;
};

type AdminGIFHealthAlertThresholds = {
  gif_health_done_rate_warn?: number;
  gif_health_done_rate_critical?: number;
  gif_health_failed_rate_warn?: number;
  gif_health_failed_rate_critical?: number;
  gif_health_path_strict_rate_warn?: number;
  gif_health_path_strict_rate_critical?: number;
  gif_health_loop_fallback_rate_warn?: number;
  gif_health_loop_fallback_rate_critical?: number;
};

type AdminGIFHealthReportResponse = {
  window_hours?: number;
  window_start?: string;
  window_end?: string;
  checked_at?: string;
  health?: "green" | "yellow" | "red" | string;
  alert_thresholds?: AdminGIFHealthAlertThresholds;
  schema_ok?: boolean;
  missing_columns?: number;
  schema_checks?: AdminGIFHealthSchemaCheck[];
  jobs?: AdminGIFHealthJobsSummary;
  outputs?: AdminGIFHealthOutputsSummary;
  loop_tune?: AdminGIFHealthLoopTuneSummary;
  optimizer?: AdminGIFHealthOptimizerSummary;
  path?: AdminGIFHealthPathSummary;
  top_failures?: AdminGIFHealthFailureReason[];
  consistency?: AdminGIFHealthConsistencySummary;
  integrity?: AdminGIFHealthIntegritySummary;
  candidate_reject?: AdminGIFHealthCandidateRejectSummary;
  candidate_top?: AdminGIFHealthCandidateRejectItem[];
  alerts?: AdminGIFHealthAlert[];
};

type AdminGIFHealthTrendPoint = {
  bucket_start?: string;
  bucket_end?: string;
  jobs_total?: number;
  jobs_done?: number;
  jobs_failed?: number;
  jobs_running?: number;
  jobs_queued?: number;
  done_rate?: number;
  failed_rate?: number;
  outputs_total?: number;
  loop_applied_rate?: number;
  loop_fallback_rate?: number;
  new_path_strict_rate?: number;
  avg_size_bytes?: number;
  avg_loop_score?: number;
};

type AdminGIFHealthTrendResponse = {
  window_hours?: number;
  window_start?: string;
  window_end?: string;
  checked_at?: string;
  points?: AdminGIFHealthTrendPoint[];
};

type AdminWorkerQueueStatus = {
  name?: string;
  paused?: boolean;
  pending?: number;
  active?: number;
  scheduled?: number;
  retry?: number;
  latency_seconds?: number;
  processed_today?: number;
  failed_today?: number;
};

type AdminWorkerLaneStatus = {
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
  queue?: AdminWorkerQueueStatus;
};

type AdminWorkerHealthResponse = {
  checked_at?: string;
  health?: "green" | "yellow" | "red" | string;
  redis_reachable?: boolean;
  queue_name?: string;
  servers_total?: number;
  servers_active?: number;
  stale_queued_jobs?: number;
  oldest_queued_age_sec?: number;
  alerts?: string[];
  start_enabled?: boolean;
  start_hint?: string;
  stop_enabled?: boolean;
  stop_hint?: string;
  lanes?: AdminWorkerLaneStatus[];
  queue?: AdminWorkerQueueStatus;
};

const HEALTH_META: Record<string, { label: string; className: string }> = {
  green: { label: "健康", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  yellow: { label: "告警", className: "border-amber-200 bg-amber-50 text-amber-700" },
  red: { label: "异常", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

const ALERT_META: Record<string, { label: string; className: string }> = {
  critical: { label: "严重", className: "border-rose-200 bg-rose-50 text-rose-700" },
  warn: { label: "告警", className: "border-amber-200 bg-amber-50 text-amber-700" },
  info: { label: "提示", className: "border-slate-200 bg-slate-50 text-slate-700" },
};

const WORKER_HEALTH_META: Record<string, { label: string; className: string }> = {
  green: { label: "健康", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  yellow: { label: "告警", className: "border-amber-200 bg-amber-50 text-amber-700" },
  red: { label: "异常", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

function formatTime(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("zh-CN");
}

function formatInt(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  return Math.trunc(n).toLocaleString("zh-CN");
}

function formatDecimal(value?: number, digits = 2) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatPercent(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0.00%";
  return `${(n * 100).toFixed(2)}%`;
}

async function parseErrorMessage(response: Response, fallback: string) {
  const text = (await response.text()) || fallback;
  if (!text) return fallback;
  try {
    const payload = JSON.parse(text) as { error?: string; message?: string };
    return payload.message || payload.error || fallback;
  } catch {
    return text;
  }
}

function parseFilename(contentDisposition: string | null, fallback: string) {
  const raw = String(contentDisposition || "");
  const matched = raw.match(/filename\\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i);
  let name = (matched?.[1] || matched?.[2] || "").trim();
  try {
    name = decodeURIComponent(name);
  } catch {
    // ignore decode errors, keep raw filename
  }
  return name || fallback;
}

export default function AdminGIFSQLHealthPage() {
  const [windowHours, setWindowHours] = useState("24");
  const [loading, setLoading] = useState(false);
  const [exportingTrend, setExportingTrend] = useState(false);
  const [workerActionLoadingKey, setWorkerActionLoadingKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [workerActionMessage, setWorkerActionMessage] = useState<string | null>(null);
  const [report, setReport] = useState<AdminGIFHealthReportResponse | null>(null);
  const [trend, setTrend] = useState<AdminGIFHealthTrendResponse | null>(null);
  const [workerHealth, setWorkerHealth] = useState<AdminWorkerHealthResponse | null>(null);

  const healthMeta = HEALTH_META[String(report?.health || "").toLowerCase()] || {
    label: String(report?.health || "未知"),
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };
  const workerHealthMeta = WORKER_HEALTH_META[String(workerHealth?.health || "").toLowerCase()] || {
    label: String(workerHealth?.health || "未知"),
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };

  const schemaChecks = Array.isArray(report?.schema_checks) ? report?.schema_checks || [] : [];
  const schemaMissing = schemaChecks.filter((item) => String(item.status || "").toLowerCase() === "missing");
  const alerts = Array.isArray(report?.alerts) ? report?.alerts || [] : [];
  const topFailures = Array.isArray(report?.top_failures) ? report?.top_failures || [] : [];
  const candidateTop = Array.isArray(report?.candidate_top) ? report?.candidate_top || [] : [];
  const trendPoints = Array.isArray(trend?.points) ? trend?.points || [] : [];
  const workerAlerts = Array.isArray(workerHealth?.alerts) ? workerHealth?.alerts || [] : [];
  const workerLanes = Array.isArray(workerHealth?.lanes) ? workerHealth?.lanes || [] : [];

  const fetchWorkerHealth = async () => {
    try {
      const workerRes = await fetchWithAuth(`${API_BASE}/api/admin/system/worker-health`);
      if (!workerRes.ok) {
        setWorkerHealth(null);
        setWorkerError(await parseErrorMessage(workerRes, "加载 worker 健康失败"));
        return;
      }
      const workerData = (await workerRes.json()) as AdminWorkerHealthResponse;
      setWorkerHealth(workerData);
      setWorkerError(null);
    } catch (err: unknown) {
      setWorkerHealth(null);
      setWorkerError(err instanceof Error ? err.message : "加载 worker 健康失败");
    }
  };

  const fetchReport = async (nextWindowHours?: string) => {
    const raw = (nextWindowHours ?? windowHours).trim();
    if (!/^\d+$/.test(raw)) {
      setError("window_hours 请输入 1~168 的整数");
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 168) {
      setError("window_hours 请输入 1~168 的整数");
      return;
    }

    setLoading(true);
    setError(null);
    setWorkerActionMessage(null);
    try {
      const [summaryRes, trendRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/admin/video-jobs/gif-health?window_hours=${parsed}`),
        fetchWithAuth(`${API_BASE}/api/admin/video-jobs/gif-health/trend?window_hours=${parsed}`),
      ]);
      if (!summaryRes.ok) {
        throw new Error(await parseErrorMessage(summaryRes, "加载巡检报告失败"));
      }
      if (!trendRes.ok) {
        throw new Error(await parseErrorMessage(trendRes, "加载趋势失败"));
      }
      const summaryData = (await summaryRes.json()) as AdminGIFHealthReportResponse;
      const trendData = (await trendRes.json()) as AdminGIFHealthTrendResponse;
      setReport(summaryData);
      setTrend(trendData);
      await fetchWorkerHealth();
    } catch (err: unknown) {
      setReport(null);
      setTrend(null);
      setError(err instanceof Error ? err.message : "加载巡检报告失败");
    } finally {
      setLoading(false);
    }
  };

  const handleWorkerAction = async (action: "start" | "stop", role: string) => {
    const normalizedRole = (role || "").trim().toLowerCase() || "all";
    const loadingKey = `${action}:${normalizedRole}`;
    if (workerActionLoadingKey) return;
    setWorkerActionLoadingKey(loadingKey);
    setWorkerActionMessage(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/system/worker-${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: normalizedRole }),
      });
      const text = await res.text();
      let payload: { message?: string; error?: string } = {};
      if (text) {
        try {
          payload = JSON.parse(text) as { message?: string; error?: string };
        } catch {
          payload = { message: text };
        }
      }
      if (!res.ok) {
        throw new Error(payload.error || payload.message || `${action === "start" ? "启动" : "停机"} worker 失败`);
      }
      setWorkerActionMessage(payload.message || `已执行${action === "start" ? "启动" : "停机"}命令`);
      await fetchWorkerHealth();
    } catch (err: unknown) {
      setWorkerActionMessage(err instanceof Error ? err.message : `${action === "start" ? "启动" : "停机"} worker 失败`);
    } finally {
      setWorkerActionLoadingKey("");
    }
  };

  const exportTrendCSV = async () => {
    const raw = windowHours.trim();
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 168) {
      setError("window_hours 请输入 1~168 的整数");
      return;
    }
    setExportingTrend(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/gif-health/trend.csv?window_hours=${parsed}`);
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, "导出趋势CSV失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = parseFilename(res.headers.get("content-disposition"), `video_jobs_gif_health_trend_${parsed}h.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "导出趋势CSV失败");
    } finally {
      setExportingTrend(false);
    }
  };

  useEffect(() => {
    void fetchReport("24");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="SQL巡检（GIF）"
        description="可视化展示 GIF 巡检指标：任务成功率、产物质量、路径命中、链路一致性与异常告警"
        actions={
          <>
            <Link
              href="/admin/settings/video-quality"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              阈值设置
            </Link>
            <Link
              href="/admin/users/video-job-health"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              单任务巡检
            </Link>
            <Link
              href="/admin/users/video-jobs"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              返回创作任务
            </Link>
          </>
        }
      />

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[220px_auto]">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">巡检窗口（小时）</label>
            <select
              value={windowHours}
              onChange={(event) => {
                const val = event.target.value;
                setWindowHours(val);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="24">24 小时</option>
              <option value="72">72 小时</option>
              <option value="168">168 小时（7天）</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => void fetchReport()}
              disabled={loading}
              className="h-10 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "刷新中..." : "刷新巡检"}
            </button>
            <button
              onClick={() => void exportTrendCSV()}
              disabled={exportingTrend}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportingTrend ? "导出中..." : "导出趋势CSV"}
            </button>
            <span className="text-xs text-slate-500">
              窗口：{formatTime(report?.window_start)} ~ {formatTime(report?.window_end)}
            </span>
          </div>
        </div>
        {error ? <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div> : null}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-slate-800">Worker 健康检查</div>
            <div className="mt-1 text-xs text-slate-500">
              队列：{workerHealth?.queue?.name || workerHealth?.queue_name || "media"} · 检查时间：
              {formatTime(workerHealth?.checked_at)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${workerHealthMeta.className}`}>
              {workerHealthMeta.label}
            </span>
            <button
              onClick={() => void fetchWorkerHealth()}
              className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              刷新 Worker
            </button>
            <button
              onClick={() => void handleWorkerAction("start", "all")}
              disabled={workerActionLoadingKey !== "" || !workerHealth?.start_enabled}
              className="h-9 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              title={workerHealth?.start_enabled ? "恢复队列并尝试启动 worker" : workerHealth?.start_hint || "未配置一键启动"}
            >
              {workerActionLoadingKey === "start:all" ? "启动中..." : "一键启动 Worker"}
            </button>
            <button
              onClick={() => void handleWorkerAction("stop", "all")}
              disabled={workerActionLoadingKey !== "" || !workerHealth?.stop_enabled}
              className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              title={workerHealth?.stop_enabled ? "暂停队列并尝试停机 worker" : workerHealth?.stop_hint || "未配置一键停机"}
            >
              {workerActionLoadingKey === "stop:all" ? "停机中..." : "一键停机 Worker"}
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="在线 Worker"
            value={`${formatInt(workerHealth?.servers_active)} / ${formatInt(workerHealth?.servers_total)}`}
            sub={workerHealth?.redis_reachable ? "Redis 已连接" : "Redis 未连接"}
          />
          <MetricCard
            title="队列积压"
            value={formatInt(workerHealth?.queue?.pending)}
            sub={`active ${formatInt(workerHealth?.queue?.active)} · retry ${formatInt(workerHealth?.queue?.retry)}`}
          />
          <MetricCard
            title="队列延迟"
            value={`${formatDecimal(workerHealth?.queue?.latency_seconds, 0)}s`}
            sub={`scheduled ${formatInt(workerHealth?.queue?.scheduled)}`}
          />
          <MetricCard
            title="排队超2分钟"
            value={formatInt(workerHealth?.stale_queued_jobs)}
            sub={`最老排队 ${formatDecimal(workerHealth?.oldest_queued_age_sec, 0)}s`}
          />
        </div>

        {workerError ? <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{workerError}</div> : null}
        {workerActionMessage ? (
          <div className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{workerActionMessage}</div>
        ) : null}
        {workerAlerts.length ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {workerAlerts.join("；")}
          </div>
        ) : null}

        {workerLanes.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {workerLanes.map((lane) => {
              const laneHealth = String(lane.health || "").toLowerCase();
              const laneMeta = WORKER_HEALTH_META[laneHealth] || {
                label: lane.health || "未知",
                className: "border-slate-200 bg-slate-50 text-slate-700",
              };
              const role = String(lane.role || "").toLowerCase() || "unknown";
              const startKey = `start:${role}`;
              const stopKey = `stop:${role}`;
              return (
                <div key={`${role}-${lane.queue_name || lane.queue?.name || ""}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{lane.label || role.toUpperCase()} Worker</div>
                      <div className="text-[11px] text-slate-500">{lane.queue?.name || lane.queue_name || "-"}</div>
                    </div>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${laneMeta.className}`}>
                      {laneMeta.label}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-slate-600">
                    <div>在线：{formatInt(lane.servers_active)} / {formatInt(lane.servers_total)}</div>
                    <div>积压：{formatInt(lane.queue?.pending)}</div>
                    <div>延迟：{formatDecimal(lane.queue?.latency_seconds, 0)}s</div>
                    <div>状态：{lane.queue?.paused ? "队列已暂停" : "队列运行中"}</div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => void handleWorkerAction("start", role)}
                      disabled={workerActionLoadingKey !== "" || !lane.start_enabled}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      title={lane.start_enabled ? "恢复队列并尝试启动" : lane.start_hint || "不可用"}
                    >
                      {workerActionLoadingKey === startKey ? "启动中..." : "启动"}
                    </button>
                    <button
                      onClick={() => void handleWorkerAction("stop", role)}
                      disabled={workerActionLoadingKey !== "" || !lane.stop_enabled}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      title={lane.stop_enabled ? "暂停队列并尝试停机" : lane.stop_hint || "不可用"}
                    >
                      {workerActionLoadingKey === stopKey ? "停机中..." : "停机"}
                    </button>
                  </div>
                  {Array.isArray(lane.alerts) && lane.alerts.length ? (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                      {lane.alerts.filter(Boolean).join("；")}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {report ? (
        <>
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${healthMeta.className}`}>
                {healthMeta.label}
              </span>
              <span className="text-xs text-slate-500">巡检时间：{formatTime(report.checked_at)}</span>
              <span className="text-xs text-slate-500">缺失字段：{formatInt(report.missing_columns)}</span>
              <span className="text-xs text-slate-500">
                阈值：完成率 {formatPercent(report.alert_thresholds?.gif_health_done_rate_warn)} /{" "}
                {formatPercent(report.alert_thresholds?.gif_health_done_rate_critical)} · 失败率{" "}
                {formatPercent(report.alert_thresholds?.gif_health_failed_rate_warn)} /{" "}
                {formatPercent(report.alert_thresholds?.gif_health_failed_rate_critical)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="GIF任务总数" value={formatInt(report.jobs?.jobs_total)} sub={`Done ${formatInt(report.jobs?.jobs_done)} / Failed ${formatInt(report.jobs?.jobs_failed)}`} />
              <MetricCard title="任务完成率" value={formatPercent(report.jobs?.done_rate)} sub={`失败率 ${formatPercent(report.jobs?.failed_rate)}`} />
              <MetricCard title="GIF主产物数" value={formatInt(report.outputs?.outputs_total)} sub={`P50 ${formatInt(report.outputs?.p50_size_bytes)}B · P95 ${formatInt(report.outputs?.p95_size_bytes)}B`} />
              <MetricCard title="新路径严格命中" value={formatPercent(report.path?.new_path_strict_rate)} sub={`Prefix ${formatPercent(report.path?.new_path_prefix_rate)}`} />
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Loop调优触发率" value={formatPercent(report.loop_tune?.applied_rate)} sub={`生效率 ${formatPercent(report.loop_tune?.effective_applied_rate)}`} />
              <MetricCard title="Loop回退率" value={formatPercent(report.loop_tune?.fallback_rate)} sub={`样本 ${formatInt(report.loop_tune?.samples)}`} />
              <MetricCard title="平均分辨率" value={`${formatDecimal(report.outputs?.avg_width, 0)} × ${formatDecimal(report.outputs?.avg_height, 0)}`} sub={`均值体积 ${formatInt(report.outputs?.avg_size_bytes)}B`} />
              <MetricCard title="Loop质量" value={`${formatDecimal(report.loop_tune?.avg_loop_closure, 3)} / ${formatDecimal(report.loop_tune?.avg_motion_mean, 3)}`} sub={`score ${formatDecimal(report.loop_tune?.avg_score, 3)} · sec ${formatDecimal(report.loop_tune?.avg_effective_sec, 2)}`} />
              <MetricCard
                title="Gifsicle 应用率"
                value={formatPercent(report.optimizer?.applied_rate)}
                sub={`applied ${formatInt(report.optimizer?.applied)} / attempted ${formatInt(report.optimizer?.attempted)}`}
              />
              <MetricCard
                title="Gifsicle 平均节省"
                value={formatPercent(report.optimizer?.avg_saved_ratio)}
                sub={`均值 ${formatDecimal(report.optimizer?.avg_saved_bytes, 0)}B · 样本 ${formatInt(report.optimizer?.samples)}`}
              />
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="候选淘汰率"
                value={formatPercent(report.candidate_reject?.reject_rate)}
                sub={`淘汰 ${formatInt(report.candidate_reject?.rejected)} / 总候选 ${formatInt(report.candidate_reject?.samples)}`}
              />
              <MetricCard
                title="重复淘汰"
                value={formatInt(report.candidate_reject?.duplicate_candidate)}
                sub={`low_emotion ${formatInt(report.candidate_reject?.low_emotion)}`}
              />
              <MetricCard
                title="低置信淘汰"
                value={formatInt(report.candidate_reject?.low_confidence)}
                sub={`low_confidence`}
              />
              <MetricCard
                title="模糊淘汰"
                value={formatInt(report.candidate_reject?.blur_low)}
                sub={`blur_low`}
              />
              <MetricCard
                title="体积超预算"
                value={formatInt(report.candidate_reject?.size_budget_exceeded)}
                sub={`size_budget_exceeded`}
              />
              <MetricCard
                title="循环质量差"
                value={formatInt(report.candidate_reject?.loop_poor)}
                sub={`loop_poor`}
              />
              <MetricCard
                title="其它原因淘汰"
                value={formatInt(report.candidate_reject?.unknown_reason)}
                sub={`unknown_reason`}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-bold text-slate-800">告警摘要</div>
            <div className="space-y-2">
              {alerts.length ? (
                alerts.map((item, index) => {
                  const level = String(item.level || "info").toLowerCase();
                  const meta = ALERT_META[level] || ALERT_META.info;
                  return (
                    <div key={`${item.code || "alert"}-${index}`} className="flex flex-wrap items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                      <span className="text-xs text-slate-500">{item.code || "-"}</span>
                      <span className="text-sm text-slate-700">{item.message || "-"}</span>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  当前窗口未发现告警项
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-bold text-slate-800">小时趋势</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <TrendCard
                title="任务数/小时"
                value={formatInt(trendPoints[trendPoints.length - 1]?.jobs_total)}
                values={trendPoints.map((item) => Number(item.jobs_total || 0))}
                tone="emerald"
                sub={`最新 done_rate ${formatPercent(trendPoints[trendPoints.length - 1]?.done_rate)}`}
              />
              <TrendCard
                title="失败率/小时"
                value={formatPercent(trendPoints[trendPoints.length - 1]?.failed_rate)}
                values={trendPoints.map((item) => Number(item.failed_rate || 0))}
                tone="rose"
                sub={`最新 jobs_failed ${formatInt(trendPoints[trendPoints.length - 1]?.jobs_failed)}`}
              />
              <TrendCard
                title="主产物数/小时"
                value={formatInt(trendPoints[trendPoints.length - 1]?.outputs_total)}
                values={trendPoints.map((item) => Number(item.outputs_total || 0))}
                tone="indigo"
                sub={`最新 loop fallback ${formatPercent(trendPoints[trendPoints.length - 1]?.loop_fallback_rate)}`}
              />
              <TrendCard
                title="新路径严格命中"
                value={formatPercent(trendPoints[trendPoints.length - 1]?.new_path_strict_rate)}
                values={trendPoints.map((item) => Number(item.new_path_strict_rate || 0))}
                tone="amber"
                sub={`最新 avg_size ${formatInt(trendPoints[trendPoints.length - 1]?.avg_size_bytes)}B`}
              />
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">小时</th>
                    <th className="px-3 py-2">任务总数</th>
                    <th className="px-3 py-2">完成率</th>
                    <th className="px-3 py-2">失败率</th>
                    <th className="px-3 py-2">主产物</th>
                    <th className="px-3 py-2">Loop触发率</th>
                    <th className="px-3 py-2">Loop回退率</th>
                    <th className="px-3 py-2">新路径严格命中</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {trendPoints.length ? (
                    trendPoints.map((item, index) => (
                      <tr key={`${item.bucket_start || "bucket"}-${index}`}>
                        <td className="px-3 py-2 text-xs">{formatTime(item.bucket_start)}</td>
                        <td className="px-3 py-2">{formatInt(item.jobs_total)}</td>
                        <td className="px-3 py-2">{formatPercent(item.done_rate)}</td>
                        <td className="px-3 py-2">{formatPercent(item.failed_rate)}</td>
                        <td className="px-3 py-2">{formatInt(item.outputs_total)}</td>
                        <td className="px-3 py-2">{formatPercent(item.loop_applied_rate)}</td>
                        <td className="px-3 py-2">{formatPercent(item.loop_fallback_rate)}</td>
                        <td className="px-3 py-2">{formatPercent(item.new_path_strict_rate)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                        暂无趋势数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-3 text-sm font-bold text-slate-800">Schema检查</div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">表</th>
                      <th className="px-3 py-2">字段</th>
                      <th className="px-3 py-2">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {schemaChecks.map((item, index) => {
                      const missing = String(item.status || "").toLowerCase() === "missing";
                      return (
                        <tr key={`${item.table_name}-${item.column_name}-${index}`}>
                          <td className="px-3 py-2">{item.table_name}</td>
                          <td className="px-3 py-2">{item.column_name}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                                missing
                                  ? "border-rose-200 bg-rose-50 text-rose-700"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {missing ? "missing" : "ok"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-xs text-slate-500">Missing 字段：{formatInt(schemaMissing.length)}</div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-3 text-sm font-bold text-slate-800">失败原因 Top 10</div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">错误码</th>
                      <th className="px-3 py-2">错误信息</th>
                      <th className="px-3 py-2">次数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {topFailures.length ? (
                      topFailures.map((item, index) => (
                        <tr key={`${item.error_code || "code"}-${index}`}>
                          <td className="px-3 py-2 text-xs">{item.error_code || "[empty]"}</td>
                          <td className="px-3 py-2 text-xs max-w-[320px] whitespace-pre-wrap break-all">
                            {item.error_message || "[empty]"}
                          </td>
                          <td className="px-3 py-2">{formatInt(item.count)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                          当前窗口无失败任务
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-bold text-slate-800">候选淘汰归因 Top 10</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">淘汰原因</th>
                    <th className="px-3 py-2">次数</th>
                    <th className="px-3 py-2">占比</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {candidateTop.length ? (
                    candidateTop.map((item, index) => (
                      <tr key={`${item.reason || "reason"}-${index}`}>
                        <td className="px-3 py-2 text-xs">{item.reason || "[empty]"}</td>
                        <td className="px-3 py-2">{formatInt(item.count)}</td>
                        <td className="px-3 py-2">{formatPercent(item.rate)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                        当前窗口无候选淘汰归因数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-3 text-sm font-bold text-slate-800">链路一致性</div>
              <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  done但无主产物：{formatInt(report.consistency?.done_without_main_output)}
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  failed却有主产物：{formatInt(report.consistency?.failed_but_has_main_output)}
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  running已出主产物：{formatInt(report.consistency?.running_but_has_main_output)}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-3 text-sm font-bold text-slate-800">字段完整性</div>
              <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  样本数：{formatInt(report.integrity?.samples)}
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  object_key 为空：{formatInt(report.integrity?.missing_object_key)}
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  size_bytes ≤ 0：{formatInt(report.integrity?.non_positive_size)}
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  宽高异常：{formatInt(report.integrity?.invalid_dimension)}
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 md:col-span-2">
                  调优触发但 score=0：{formatInt(report.integrity?.tune_applied_but_zero_score)}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-[11px] font-semibold text-slate-500">{title}</div>
      <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

function TrendCard({
  title,
  value,
  sub,
  values,
  tone,
}: {
  title: string;
  value: string;
  sub?: string;
  values: number[];
  tone: "emerald" | "rose" | "indigo" | "amber";
}) {
  const max = values.reduce((acc, item) => Math.max(acc, Number(item || 0)), 0);
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-400",
    rose: "bg-rose-400",
    indigo: "bg-indigo-400",
    amber: "bg-amber-400",
  };
  const barClass = colorMap[tone] || "bg-slate-400";

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-[11px] font-semibold text-slate-500">{title}</div>
      <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
      <div className="mt-2 flex h-16 items-end gap-1">
        {values.length ? (
          values.map((item, idx) => {
            const val = Number(item || 0);
            const ratio = max > 0 ? Math.max(4, Math.round((val / max) * 100)) : 4;
            return <div key={`${idx}-${val}`} className={`w-1.5 rounded-sm ${barClass}`} style={{ height: `${ratio}%` }} />;
          })
        ) : (
          <div className="text-xs text-slate-400">暂无数据</div>
        )}
      </div>
    </div>
  );
}
