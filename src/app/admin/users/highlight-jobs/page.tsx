"use client";

import Link from "next/link";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type AdminVideoJobUser = {
  id: number;
  display_name?: string;
  phone?: string;
};

type AdminVideoJobCost = {
  estimated_cost?: number;
  currency?: string;
  output_count?: number;
  ai_cost_usd?: number;
  ai_cost_cny?: number;
  ai_calls?: number;
  ai_duration_ms?: number;
};

type AdminVideoJobPointHold = {
  status?: string;
  reserved_points?: number;
  settled_points?: number;
};

type AdminVideoJobAudit = {
  proposal_count?: number;
  deliver_count?: number;
  feedback_count?: number;
  rerender_count?: number;
  keep_internal_count?: number;
  reject_count?: number;
  need_manual_review_count?: number;
};

type AdminVideoJobItem = {
  id: number;
  title?: string;
  source_video_key?: string;
  requested_format?: string;
  output_formats?: string[];
  status: string;
  stage: string;
  progress?: number;
  options?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  created_at?: string;
  user: AdminVideoJobUser;
  cost?: AdminVideoJobCost;
  point_hold?: AdminVideoJobPointHold;
  audit?: AdminVideoJobAudit;
};

type AdminVideoJobListResponse = {
  items?: AdminVideoJobItem[];
  total?: number;
  page?: number;
  page_size?: number;
};

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

const PAGE_SIZE = 30;
type FormatOption = "all" | "gif" | "jpg" | "png" | "webp" | "mp4" | "live";
const SOURCE_READ_REASON_OPTIONS = [
  "all",
  "source_video_not_found",
  "source_video_forbidden",
  "source_video_storage_5xx",
  "source_video_network_unstable",
  "source_video_url_unavailable",
  "source_video_storage_unconfigured",
  "source_video_key_empty",
  "source_video_read_failed",
  "video_storage_unavailable",
  "video_probe_failed",
] as const;
const SOURCE_READ_QUICK_OPTIONS = [
  "source_video_not_found",
  "source_video_forbidden",
  "source_video_network_unstable",
  "source_video_storage_5xx",
] as const;
const AUDIT_SIGNAL_OPTIONS = ["all", "proposal", "deliver", "feedback", "rerender"] as const;

const SOURCE_READ_REASON_LABELS: Record<string, string> = {
  source_video_not_found: "源视频不存在(404)",
  source_video_forbidden: "读取被拒绝(401/403)",
  source_video_network_unstable: "网络不稳定",
  source_video_storage_5xx: "存储服务5xx",
  source_video_url_unavailable: "URL不可用",
  source_video_storage_unconfigured: "存储未配置",
  source_video_key_empty: "source_key为空",
  source_video_read_failed: "读取失败",
  video_storage_unavailable: "视频存储不可用",
  video_probe_failed: "预探测失败",
};

const INPUT_CLASS =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
const SELECT_CLASS = INPUT_CLASS;
const PRIMARY_BUTTON_CLASS =
  "inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600";
const SECONDARY_BUTTON_CLASS =
  "inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50";

function resolveLockedFormatByPath(pathname?: string): FormatOption | null {
  const current = (pathname || "").split("?")[0].replace(/\/+$/, "");
  if (current.endsWith("/admin/users/highlight-jobs/gif")) return "gif";
  if (current.endsWith("/admin/users/highlight-jobs/png")) return "png";
  if (current.endsWith("/admin/users/highlight-jobs/jpg")) return "jpg";
  if (current.endsWith("/admin/users/highlight-jobs/webp")) return "webp";
  if (current.endsWith("/admin/users/highlight-jobs/live")) return "live";
  if (current.endsWith("/admin/users/highlight-jobs/mp4")) return "mp4";
  return null;
}

function formatTime(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("zh-CN");
}

function formatCurrency(value?: number, currency = "CNY") {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  return `${currency.toUpperCase() === "CNY" ? "¥" : `${currency.toUpperCase()} `}${n.toFixed(4)}`;
}

function formatPoints(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  return String(Math.round(n));
}

function pointHoldStatusLabel(value?: string) {
  switch ((value || "").trim().toLowerCase()) {
    case "settled":
      return "已结算";
    case "held":
      return "预冻结";
    case "released":
      return "已释放";
    case "cancelled":
      return "已取消";
    case "failed":
      return "失败";
    default:
      return value || "-";
  }
}

function statusLabel(status?: string) {
  switch ((status || "").toLowerCase()) {
    case "queued":
      return "排队中";
    case "running":
      return "处理中";
    case "done":
      return "已完成";
    case "failed":
      return "失败";
    case "cancelled":
      return "已取消";
    default:
      return status || "-";
  }
}

function parseNumberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function resolveRequestedFormat(job?: AdminVideoJobItem | null) {
  const requested = (job?.requested_format || "").trim().toLowerCase();
  if (requested) return requested;
  const outputFormats = Array.isArray(job?.output_formats) ? job?.output_formats : [];
  if (outputFormats.length) return outputFormats.join("/");
  return "gif";
}

function resolveSourceProbeSummary(options?: Record<string, unknown>) {
  const raw = options?.source_video_probe;
  if (!raw || typeof raw !== "object") return "-";
  const probe = raw as Record<string, unknown>;
  const width = parseNumberValue(probe.width);
  const height = parseNumberValue(probe.height);
  const fps = parseNumberValue(probe.fps);
  const duration = parseNumberValue(probe.duration_sec);
  const parts: string[] = [];
  if (typeof width === "number" && typeof height === "number") parts.push(`${Math.round(width)}x${Math.round(height)}`);
  if (typeof fps === "number") parts.push(`${fps.toFixed(1)}fps`);
  if (typeof duration === "number") parts.push(`${duration.toFixed(1)}s`);
  return parts.join(" · ") || "-";
}

function resolveSourceReadabilityReason(job?: AdminVideoJobItem | null) {
  const metrics = (job?.metrics && typeof job.metrics === "object" ? job.metrics : {}) as Record<string, unknown>;
  const options = (job?.options && typeof job.options === "object" ? job.options : {}) as Record<string, unknown>;
  const readability = (metrics.source_video_readability_v1 &&
  typeof metrics.source_video_readability_v1 === "object"
    ? (metrics.source_video_readability_v1 as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const degraded = (options.source_video_probe_degraded_v1 &&
  typeof options.source_video_probe_degraded_v1 === "object"
    ? (options.source_video_probe_degraded_v1 as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const probe = (options.source_video_probe && typeof options.source_video_probe === "object"
    ? (options.source_video_probe as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const candidates = [
    String(readability.reason_code || "").trim().toLowerCase(),
    String(degraded.reason_code || "").trim().toLowerCase(),
    String(probe.reason_code || "").trim().toLowerCase(),
  ].filter(Boolean);
  return candidates[0] || "-";
}

function sourceReadReasonLabel(reason?: string) {
  const key = String(reason || "-").trim().toLowerCase();
  if (!key || key === "-") return "-";
  return SOURCE_READ_REASON_LABELS[key] || key;
}

function auditSignalLabel(value?: string) {
  switch ((value || "").trim().toLowerCase()) {
    case "proposal":
      return "有 Proposal";
    case "deliver":
      return "有 Deliver";
    case "feedback":
      return "有反馈";
    case "rerender":
      return "有重渲染";
    default:
      return "全部信号";
  }
}

type JobAnomalySignal = {
  key: string;
  label: string;
  className: string;
  title?: string;
};

function buildJobAnomalySignals(job: AdminVideoJobItem, aiCostHighThresholdCNY: number): JobAnomalySignal[] {
  const status = String(job.status || "").trim().toLowerCase();
  const proposalCount = Number(job.audit?.proposal_count || 0);
  const deliverCount = Number(job.audit?.deliver_count || 0);
  const feedbackCount = Number(job.audit?.feedback_count || 0);
  const rerenderCount = Number(job.audit?.rerender_count || 0);
  const outputCount = Number(job.cost?.output_count || 0);
  const aiCostCNY = Number(job.cost?.ai_cost_cny || 0);
  const out: JobAnomalySignal[] = [];

  if (status === "done" && proposalCount <= 0) {
    out.push({
      key: "proposal_missing",
      label: "无Proposal",
      className: "border-rose-200 bg-rose-50 text-rose-700",
      title: "任务已完成，但没有 AI2 proposal。",
    });
  }
  if (status === "done" && outputCount > 0 && deliverCount <= 0) {
    out.push({
      key: "deliver_missing",
      label: "有产物无Deliver",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      title: "已有输出产物，但没有 deliver 结果。",
    });
  }
  if (outputCount > 0 && feedbackCount <= 0) {
    out.push({
      key: "feedback_missing",
      label: "有产物无反馈",
      className: "border-sky-200 bg-sky-50 text-sky-700",
      title: "已有输出产物，但暂无用户反馈。",
    });
  }
  if (rerenderCount > 0) {
    out.push({
      key: "rerender_hit",
      label: "发生重渲染",
      className: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
      title: "该任务存在人工/运维触发的重渲染记录。",
    });
  }
  if (aiCostHighThresholdCNY > 0 && aiCostCNY >= aiCostHighThresholdCNY) {
    out.push({
      key: "ai_cost_high",
      label: "AI成本偏高",
      className: "border-violet-200 bg-violet-50 text-violet-700",
      title: `AI 成本达到当前页高位阈值（≥ ${formatCurrency(aiCostHighThresholdCNY, "CNY")}）。`,
    });
  }

  return out;
}

async function parseApiError(response: Response, fallback: string) {
  try {
    const payload = (await response.clone().json()) as ApiErrorPayload;
    return payload.message || payload.error || fallback;
  } catch {
    const text = await response.text();
    return text || fallback;
  }
}

function statusBadgeClass(status?: string) {
  switch ((status || "").toLowerCase()) {
    case "done":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "running":
    case "queued":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "failed":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "cancelled":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function KpiCard({
  label,
  value,
  tone = "slate",
  subText,
}: {
  label: string;
  value: ReactNode;
  tone?: "slate" | "emerald" | "sky" | "rose" | "amber" | "violet" | "indigo" | "fuchsia" | "orange";
  subText?: string;
}) {
  const toneClass = {
    slate: "border-slate-100 bg-white text-slate-900",
    emerald: "border-emerald-100 bg-emerald-50/60 text-emerald-700",
    sky: "border-sky-100 bg-sky-50/60 text-sky-700",
    rose: "border-rose-100 bg-rose-50/60 text-rose-700",
    amber: "border-amber-100 bg-amber-50/60 text-amber-700",
    violet: "border-violet-100 bg-violet-50/60 text-violet-700",
    indigo: "border-indigo-100 bg-indigo-50/60 text-indigo-700",
    fuchsia: "border-fuchsia-100 bg-fuchsia-50/60 text-fuchsia-700",
    orange: "border-orange-100 bg-orange-50/60 text-orange-700",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneClass}`}>
      <div className="text-xs font-semibold opacity-90">{label}</div>
      <div className="mt-1 text-2xl font-black leading-none">{value}</div>
      {subText ? <div className="mt-1 text-[11px] opacity-90">{subText}</div> : null}
    </div>
  );
}

export default function AdminHighlightJobsPage() {
  const pathname = usePathname();
  const lockedFormat = useMemo(() => resolveLockedFormatByPath(pathname), [pathname]);
  const [items, setItems] = useState<AdminVideoJobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [draftUserID, setDraftUserID] = useState("");
  const [draftStatus, setDraftStatus] = useState("all");
  const [draftFormat, setDraftFormat] = useState("all");
  const [draftSourceReadReason, setDraftSourceReadReason] = useState("all");
  const [draftAuditSignal, setDraftAuditSignal] = useState("all");
  const [draftQuery, setDraftQuery] = useState("");

  const [userID, setUserID] = useState("");
  const [status, setStatus] = useState("all");
  const [format, setFormat] = useState("all");
  const [sourceReadReason, setSourceReadReason] = useState("all");
  const [auditSignal, setAuditSignal] = useState("all");
  const [query, setQuery] = useState("");
  const effectiveFormat = lockedFormat || format;

  useEffect(() => {
    if (!lockedFormat) return;
    if (format !== lockedFormat) setFormat(lockedFormat);
    if (draftFormat !== lockedFormat) setDraftFormat(lockedFormat);
  }, [draftFormat, format, lockedFormat]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      if (userID.trim()) params.set("user_id", userID.trim());
      if (status !== "all") params.set("status", status);
      if (effectiveFormat !== "all") params.set("format", effectiveFormat);
      if (sourceReadReason !== "all") params.set("source_read_reason", sourceReadReason);
      if (auditSignal !== "all") params.set("audit_signal", auditSignal);
      if (query.trim()) params.set("q", query.trim());
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs?${params.toString()}`);
      if (!res.ok) throw new Error(await parseApiError(res, "加载任务列表失败"));
      const data = (await res.json()) as AdminVideoJobListResponse;
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total || 0));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载任务列表失败");
    } finally {
      setLoading(false);
    }
  }, [auditSignal, effectiveFormat, page, query, sourceReadReason, status, userID]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const applyFilters = useCallback(() => {
    setUserID(draftUserID.trim());
    setStatus(draftStatus);
    setFormat(lockedFormat || draftFormat);
    setSourceReadReason(draftSourceReadReason);
    setAuditSignal(draftAuditSignal);
    setQuery(draftQuery.trim());
    setPage(1);
  }, [draftAuditSignal, draftFormat, draftQuery, draftSourceReadReason, draftStatus, draftUserID, lockedFormat]);

  const stats = useMemo(() => {
    let running = 0;
    let done = 0;
    let failed = 0;
    let proposalCount = 0;
    let deliverCount = 0;
    let feedbackCount = 0;
    let rerenderCount = 0;
    let aiCostCNY = 0;
    let aiCostUSD = 0;
    let settledPoints = 0;
    let reservedPoints = 0;
    for (const item of items) {
      const s = (item.status || "").toLowerCase();
      if (s === "running" || s === "queued") running += 1;
      if (s === "done") done += 1;
      if (s === "failed") failed += 1;
      proposalCount += Number(item.audit?.proposal_count || 0);
      deliverCount += Number(item.audit?.deliver_count || 0);
      feedbackCount += Number(item.audit?.feedback_count || 0);
      rerenderCount += Number(item.audit?.rerender_count || 0);
      aiCostCNY += Number(item.cost?.ai_cost_cny || 0);
      aiCostUSD += Number(item.cost?.ai_cost_usd || 0);
      settledPoints += Number(item.point_hold?.settled_points || 0);
      reservedPoints += Number(item.point_hold?.reserved_points || 0);
    }
    return {
      running,
      done,
      failed,
      proposalCount,
      deliverCount,
      feedbackCount,
      rerenderCount,
      aiCostCNY,
      aiCostUSD,
      settledPoints,
      reservedPoints,
    };
  }, [items]);

  const sourceReadStats = useMemo(() => {
    const counts = new Map<string, number>();
    let abnormal = 0;
    for (const item of items) {
      const reason = resolveSourceReadabilityReason(item);
      if (!reason || reason === "-" || reason === "ok") continue;
      abnormal += 1;
      counts.set(reason, (counts.get(reason) || 0) + 1);
    }
    const top = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason, count]) => ({ reason, count }));
    return { abnormal, top };
  }, [items]);

  const aiCostHighThresholdCNY = useMemo(() => {
    const values = items
      .map((item) => Number(item.cost?.ai_cost_cny || 0))
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b);
    if (!values.length) return 0;
    const mid = Math.floor(values.length / 2);
    const median =
      values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
    return Math.max(median * 2, 1);
  }, [items]);

  const pageAnomalyCount = useMemo(
    () => items.filter((item) => buildJobAnomalySignals(item, aiCostHighThresholdCNY).length > 0).length,
    [aiCostHighThresholdCNY, items]
  );

  const applySourceReadQuickFilter = useCallback((reason: string) => {
    setDraftSourceReadReason(reason);
    setSourceReadReason(reason);
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={lockedFormat ? `视频任务列表 · ${lockedFormat.toUpperCase()}` : "视频任务列表"}
        description={
          lockedFormat
            ? `当前页面已锁定 ${lockedFormat.toUpperCase()} 格式任务。`
            : "一级页面：按视频任务展示列表。点击任务进入二级详情页查看 AI1/AI2/评分/AI3 全流程。"
        }
        actions={
          <button
            className={SECONDARY_BUTTON_CLASS}
            onClick={() => void loadList()}
            disabled={loading}
          >
            {loading ? "加载中..." : "刷新"}
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 text-[13px] font-semibold tracking-wide text-slate-800">筛选条件</div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-slate-500">用户ID</span>
            <input
              value={draftUserID}
              onChange={(e) => setDraftUserID(e.target.value)}
              placeholder="如：1024"
              className={INPUT_CLASS}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-slate-500">任务状态</span>
            <select
              value={draftStatus}
              onChange={(e) => setDraftStatus(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="all">全部状态</option>
              <option value="queued">queued</option>
              <option value="running">running</option>
              <option value="done">done</option>
              <option value="failed">failed</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-slate-500">输出格式</span>
            <div className={`${SELECT_CLASS} flex items-center justify-between gap-2`}>
              <span>格式：{lockedFormat || "all"}</span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                {lockedFormat ? "锁定" : "按菜单分页面"}
              </span>
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-slate-500">可读性原因</span>
            <select
              value={draftSourceReadReason}
              onChange={(e) => setDraftSourceReadReason(e.target.value)}
              className={SELECT_CLASS}
            >
              {SOURCE_READ_REASON_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  可读性原因：{item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-slate-500">审计信号</span>
            <select
              value={draftAuditSignal}
              onChange={(e) => setDraftAuditSignal(e.target.value)}
              className={SELECT_CLASS}
            >
              {AUDIT_SIGNAL_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  审计信号：{auditSignalLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 sm:col-span-2 md:col-span-4 lg:col-span-2">
            <span className="text-[11px] font-medium text-slate-500">关键词</span>
            <input
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder="任务标题 / source key"
              className={INPUT_CLASS}
            />
          </label>
          <div className="flex items-end sm:col-span-2 md:col-span-4 lg:col-span-1">
            <button onClick={applyFilters} className={`${PRIMARY_BUTTON_CLASS} w-full`}>
              查询
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 mt-5 mb-5">
        <KpiCard label="任务总数（当前筛选）" value={total} />
        <KpiCard label="处理中" value={stats.running} tone="emerald" />
        <KpiCard label="已完成" value={stats.done} tone="sky" />
        <KpiCard label="失败" value={stats.failed} tone="rose" />
        <KpiCard label="可读性异常（当前页）" value={sourceReadStats.abnormal} tone="amber" />
        <KpiCard
          label="Top 可读性原因（当前页）"
          value={<span className="text-sm leading-snug">
            {sourceReadStats.top.length
              ? sourceReadStats.top.map((item) => `${sourceReadReasonLabel(item.reason)}(${item.count})`).join(" / ")
              : "-"}
          </span>}
          tone="sky"
        />
        <KpiCard label="Proposal（当前页）" value={stats.proposalCount} tone="violet" />
        <KpiCard label="Deliver（当前页）" value={stats.deliverCount} tone="indigo" />
        <KpiCard label="反馈（当前页）" value={stats.feedbackCount} tone="fuchsia" />
        <KpiCard label="Rerender（当前页）" value={stats.rerenderCount} tone="orange" />
        <KpiCard label="异常任务（当前页）" value={pageAnomalyCount} tone="rose" />
        <KpiCard
          label="真实API成本（当前页）"
          value={<span className="text-lg">{formatCurrency(stats.aiCostCNY, "CNY")}</span>}
          tone="sky"
          subText={formatCurrency(stats.aiCostUSD, "USD")}
        />
        <KpiCard
          label="算力结算点数（当前页）"
          value={<span className="text-lg">{formatPoints(stats.settledPoints)}</span>}
          tone="emerald"
          subText={`预冻结 ${formatPoints(stats.reservedPoints)}`}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mb-6">
        <div className="mb-3 text-[13px] font-semibold text-slate-800">
          可读性快捷筛选（点击即生效）
          {sourceReadReason !== "all" ? <span className="ml-2 font-normal text-slate-500">当前：{sourceReadReasonLabel(sourceReadReason)}</span> : ""}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applySourceReadQuickFilter("all")}
            className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition ${
              sourceReadReason === "all"
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            全部
          </button>
          {SOURCE_READ_QUICK_OPTIONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => applySourceReadQuickFilter(reason)}
              className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition ${
                sourceReadReason === reason
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {sourceReadReasonLabel(reason)}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm mt-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1420px] text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="text-[13px] border-b border-slate-200">
                <th className="px-4 py-3.5 font-semibold w-[360px]">任务</th>
                <th className="px-4 py-3.5 font-semibold w-36">用户</th>
                <th className="px-4 py-3.5 font-semibold w-20 text-center">格式</th>
                <th className="px-4 py-3.5 font-semibold text-center w-28">状态</th>
                <th className="px-4 py-3.5 font-semibold text-center w-32">审计摘要</th>
                <th className="px-4 py-3.5 font-semibold text-center w-48">异常信号</th>
                <th className="px-4 py-3.5 font-semibold text-right w-44">真实成本</th>
                <th className="px-4 py-3.5 font-semibold text-right w-44">算力扣点</th>
                <th className="px-4 py-3.5 font-semibold text-center w-36">创建时间</th>
                <th className="px-4 py-3.5 font-semibold text-center w-24">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((item) => {
                const anomalySignals = buildJobAnomalySignals(item, aiCostHighThresholdCNY);
                return (
                <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-col gap-1.5">
                      <div className="font-semibold text-slate-800 text-[13px] hover:text-emerald-600 transition-colors cursor-pointer whitespace-normal leading-relaxed" onClick={() => window.open(`/admin/users/highlight-jobs/${item.id}`, '_self')}>
                        <span className="text-slate-400 font-normal mr-1">#{item.id}</span>
                        {item.title || "未命名任务"}
                      </div>
                      <div className="max-w-[340px] truncate text-[11px] text-slate-400 font-mono bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded w-fit" title={item.source_video_key || ""}>
                        {item.source_video_key || "-"}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-start gap-1.5">
                        <span className="text-slate-400 mt-[3px]">输入</span>
                        <span className="bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium break-all whitespace-normal leading-relaxed">{resolveSourceProbeSummary(item.options)}</span>
                      </div>
                      {resolveSourceReadabilityReason(item) !== "-" && resolveSourceReadabilityReason(item) !== "ok" && (
                        <div className="text-[11px] text-amber-600 flex items-center gap-1 mt-0.5">
                          <span className="bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded font-medium">读失败</span>
                          {sourceReadReasonLabel(resolveSourceReadabilityReason(item))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-xs text-slate-600">
                    <div className="flex flex-col gap-1.5 mt-2.5 ml-2">
                      <div className="font-semibold text-slate-800 text-[13px]">
                        <span className="text-slate-400 font-normal mr-1">#{item.user?.id || 0}</span>
                        {item.user?.display_name || "-"}
                      </div>
                      <div className="text-slate-500 text-[11px] font-mono mt-0.5">{item.user?.phone || "-"}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-center text-xs text-slate-600">
                    <div className="mt-3.5">
                      <span className="uppercase font-medium tracking-wider bg-slate-100/80 border border-slate-200 text-slate-600 px-2 py-1 rounded text-[11px] shadow-sm">{resolveRequestedFormat(item)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-center">
                    <div className="flex flex-col items-center gap-1.5 mt-2 w-[110px] mx-auto">
                      <div className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusBadgeClass(item.status)}`}>
                        {statusLabel(item.status)}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded whitespace-nowrap shadow-sm">{item.stage} · {item.progress || 0}%</div>
                      <div className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded whitespace-nowrap shadow-sm">
                        成本：{formatCurrency(item.cost?.estimated_cost, item.cost?.currency || "CNY")}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-[11px] text-slate-600">
                    <div className="grid gap-1.5 mx-auto w-[130px] text-left mt-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">proposal</span>
                        <span className="font-semibold text-slate-700 bg-slate-50/50 border border-slate-100/60 px-2 py-0.5 rounded shadow-sm text-xs">{Number(item.audit?.proposal_count || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">deliver</span>
                        <span className="font-semibold text-slate-700 bg-slate-50/50 border border-slate-100/60 px-2 py-0.5 rounded shadow-sm text-xs">{Number(item.audit?.deliver_count || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">feedback</span>
                        <span className="font-semibold text-slate-700 bg-slate-50/50 border border-slate-100/60 px-2 py-0.5 rounded shadow-sm text-xs">{Number(item.audit?.feedback_count || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">rerender</span>
                        <span className="font-semibold text-slate-700 bg-slate-50/50 border border-slate-100/60 px-2 py-0.5 rounded shadow-sm text-xs">{Number(item.audit?.rerender_count || 0)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-xs text-slate-600">
                    <div className="flex max-w-[180px] flex-wrap gap-2 justify-center mx-auto mt-4">
                      {anomalySignals.length ? anomalySignals.map((signal) => (
                        <span
                          key={`${item.id}-${signal.key}`}
                          title={signal.title || signal.label}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium shadow-sm ${signal.className}`}
                        >
                          {signal.label}
                        </span>
                      )) : (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 shadow-sm">
                          暂无异常
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-[11px] text-slate-600">
                    <div className="flex flex-col items-end gap-1.5 mt-1 w-[150px] ml-auto">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-slate-400">API CNY</span>
                        <span className="font-semibold text-slate-700 bg-slate-50/50 px-2.5 py-1 rounded-md border border-slate-100/60 shadow-sm text-xs">{formatCurrency(item.cost?.ai_cost_cny, "CNY")}</span>
                      </div>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-slate-400">API USD</span>
                        <span className="text-slate-600 font-medium bg-slate-50/50 px-2.5 py-1 rounded-md border border-slate-100/60 shadow-sm text-xs">{formatCurrency(item.cost?.ai_cost_usd, "USD")}</span>
                      </div>
                      <div className="flex items-center justify-between w-full mt-1.5">
                        <span className="text-slate-400">估算</span>
                        <span className="text-slate-600 font-medium bg-slate-50/50 px-2.5 py-1 rounded-md border border-slate-100/60 shadow-sm text-xs">
                          {formatCurrency(item.cost?.estimated_cost, item.cost?.currency || "CNY")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-slate-400">calls</span>
                        <span className="text-slate-600 font-medium bg-slate-50/50 px-2.5 py-1 rounded-md border border-slate-100/60 shadow-sm text-xs">{Number(item.cost?.ai_calls || 0)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-[11px] text-slate-600">
                    <div className="flex flex-col items-end gap-1.5 mt-1 w-[150px] ml-auto">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-slate-400">结算</span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 shadow-sm text-xs">
                          {formatPoints(item.point_hold?.settled_points)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-slate-400">预冻结</span>
                        <span className="text-slate-600 font-medium bg-slate-50/50 px-2.5 py-1 rounded-md border border-slate-100/60 shadow-sm text-xs">
                          {formatPoints(item.point_hold?.reserved_points)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-slate-400">状态</span>
                        <span className="text-slate-600 font-medium bg-slate-50/50 px-2.5 py-1 rounded-md border border-slate-100/60 shadow-sm text-xs">
                          {pointHoldStatusLabel(item.point_hold?.status)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-[11px] text-slate-500 text-center whitespace-nowrap pt-4">
                    <div className="mt-[22px] flex flex-col gap-1.5 items-center w-full">
                      <span className="bg-slate-50/80 px-2.5 py-1 rounded-md border border-slate-100/60 shadow-sm text-slate-600 font-medium">{formatTime(item.created_at)?.split(" ")[0]}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{formatTime(item.created_at)?.split(" ")[1]}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-center pt-4">
                    <div className="mt-[22px]">
                      <Link className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95" href={`/admin/users/highlight-jobs/${item.id}`}>
                        详情
                      </Link>
                    </div>
                  </td>
                </tr>
              )})}
              {!items.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={10}>
                    暂无数据
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium text-slate-600 shadow-sm mt-5">
        <div>共 {total} 条，当前第 {page} / {totalPages} 页</div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            上一页
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
