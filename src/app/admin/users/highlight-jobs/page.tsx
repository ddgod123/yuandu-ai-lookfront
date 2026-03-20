"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
const FORMAT_OPTIONS = ["all", "gif", "jpg", "png", "webp", "mp4", "live"] as const;
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

async function parseApiError(response: Response, fallback: string) {
  try {
    const payload = (await response.clone().json()) as ApiErrorPayload;
    return payload.message || payload.error || fallback;
  } catch {
    const text = await response.text();
    return text || fallback;
  }
}

export default function AdminHighlightJobsPage() {
  const [items, setItems] = useState<AdminVideoJobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [draftUserID, setDraftUserID] = useState("");
  const [draftStatus, setDraftStatus] = useState("all");
  const [draftFormat, setDraftFormat] = useState("all");
  const [draftSourceReadReason, setDraftSourceReadReason] = useState("all");
  const [draftQuery, setDraftQuery] = useState("");

  const [userID, setUserID] = useState("");
  const [status, setStatus] = useState("all");
  const [format, setFormat] = useState("all");
  const [sourceReadReason, setSourceReadReason] = useState("all");
  const [query, setQuery] = useState("");

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
      if (format !== "all") params.set("format", format);
      if (sourceReadReason !== "all") params.set("source_read_reason", sourceReadReason);
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
  }, [format, page, query, sourceReadReason, status, userID]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const applyFilters = useCallback(() => {
    setUserID(draftUserID.trim());
    setStatus(draftStatus);
    setFormat(draftFormat);
    setSourceReadReason(draftSourceReadReason);
    setQuery(draftQuery.trim());
    setPage(1);
  }, [draftFormat, draftQuery, draftSourceReadReason, draftStatus, draftUserID]);

  const stats = useMemo(() => {
    let running = 0;
    let done = 0;
    let failed = 0;
    for (const item of items) {
      const s = (item.status || "").toLowerCase();
      if (s === "running" || s === "queued") running += 1;
      if (s === "done") done += 1;
      if (s === "failed") failed += 1;
    }
    return { running, done, failed };
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

  const applySourceReadQuickFilter = useCallback((reason: string) => {
    setDraftSourceReadReason(reason);
    setSourceReadReason(reason);
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="视频任务列表"
        description="一级页面：按视频任务展示列表。点击任务进入二级详情页查看 AI1/AI2/评分/AI3 全流程。"
        actions={
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
            onClick={() => void loadList()}
            disabled={loading}
          >
            {loading ? "加载中..." : "刷新"}
          </button>
        }
      />

      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-7">
          <input
            value={draftUserID}
            onChange={(e) => setDraftUserID(e.target.value)}
            placeholder="用户ID"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <select
            value={draftStatus}
            onChange={(e) => setDraftStatus(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="all">全部状态</option>
            <option value="queued">queued</option>
            <option value="running">running</option>
            <option value="done">done</option>
            <option value="failed">failed</option>
            <option value="cancelled">cancelled</option>
          </select>
          <select
            value={draftFormat}
            onChange={(e) => setDraftFormat(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            {FORMAT_OPTIONS.map((item) => (
              <option key={item} value={item}>
                格式：{item}
              </option>
            ))}
          </select>
          <select
            value={draftSourceReadReason}
            onChange={(e) => setDraftSourceReadReason(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            {SOURCE_READ_REASON_OPTIONS.map((item) => (
              <option key={item} value={item}>
                可读性原因：{item}
              </option>
            ))}
          </select>
          <input
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder="任务标题 / source key"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 md:col-span-2"
          />
          <button onClick={applyFilters} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            查询
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">任务总数（当前筛选）</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{total}</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700">处理中</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{stats.running}</div>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold text-sky-700">已完成</div>
          <div className="mt-1 text-2xl font-black text-sky-700">{stats.done}</div>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold text-rose-700">失败</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{stats.failed}</div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold text-amber-700">可读性异常（当前页）</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{sourceReadStats.abnormal}</div>
        </div>
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold text-cyan-700">Top 可读性原因（当前页）</div>
          <div className="mt-1 text-xs text-cyan-800">
            {sourceReadStats.top.length
              ? sourceReadStats.top.map((item) => `${sourceReadReasonLabel(item.reason)}(${item.count})`).join(" / ")
              : "-"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <div className="mb-2 text-xs font-semibold text-slate-500">
          可读性快捷筛选（点击即生效）
          {sourceReadReason !== "all" ? ` · 当前：${sourceReadReasonLabel(sourceReadReason)}` : ""}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applySourceReadQuickFilter("all")}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              sourceReadReason === "all"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            全部
          </button>
          {SOURCE_READ_QUICK_OPTIONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => applySourceReadQuickFilter(reason)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                sourceReadReason === reason
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
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

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">任务</th>
                <th className="px-4 py-3">用户</th>
                <th className="px-4 py-3">格式</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">创建时间</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-semibold text-slate-900">#{item.id} {item.title || "未命名任务"}</div>
                    <div className="mt-1 max-w-[340px] truncate text-xs text-slate-400" title={item.source_video_key || ""}>
                      {item.source_video_key || "-"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">输入：{resolveSourceProbeSummary(item.options)}</div>
                    <div className="mt-1 text-xs text-amber-700">
                      可读性原因：{sourceReadReasonLabel(resolveSourceReadabilityReason(item))}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">
                    <div>#{item.user?.id || 0} {item.user?.display_name || "-"}</div>
                    <div className="mt-1">{item.user?.phone || "-"}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">{resolveRequestedFormat(item)}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {statusLabel(item.status)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{item.stage} · {item.progress || 0}%</div>
                    <div className="mt-1 text-xs text-amber-700">
                      成本：{formatCurrency(item.cost?.estimated_cost, item.cost?.currency || "CNY")}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-500">{formatTime(item.created_at)}</td>
                  <td className="px-4 py-3 align-top">
                    <Link
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      href={`/admin/users/highlight-jobs/${item.id}`}
                    >
                      进入详情页
                    </Link>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={6}>
                    暂无数据
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600">
        <div>共 {total} 条，当前第 {page} / {totalPages} 页</div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50"
          >
            上一页
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
