"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type AdminVideoJobUser = {
  id: number;
  display_name?: string;
  phone?: string;
};

type AdminVideoJobItem = {
  id: number;
  title: string;
  status: string;
  stage: string;
  progress: number;
  created_at?: string;
  updated_at?: string;
  source_video_key?: string;
  output_formats?: string[];
  result_collection_id?: number;
  user: AdminVideoJobUser;
  options?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
};

type AdminVideoJobListResponse = {
  items?: AdminVideoJobItem[];
  total?: number;
};

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

const FORMAT_OPTIONS = ["all", "gif", "jpg", "png", "webp", "mp4", "live"] as const;

function formatTime(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN");
}

function statusLabel(status: string) {
  switch (status) {
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

function resolveJobFormat(job: AdminVideoJobItem) {
  const fromOutput = Array.isArray(job.output_formats) ? job.output_formats : [];
  if (fromOutput.length) return fromOutput.join("/");
  const metrics = job.metrics || {};
  const formats = Array.isArray((metrics as Record<string, unknown>).output_formats)
    ? ((metrics as Record<string, unknown>).output_formats as string[])
    : [];
  return formats.length ? formats.join("/") : "-";
}

async function parseApiError(res: Response) {
  try {
    return (await res.clone().json()) as ApiErrorPayload;
  } catch {
    return {};
  }
}

export default function AdminHighlightJobsPage() {
  const [items, setItems] = useState<AdminVideoJobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [format, setFormat] = useState("all");
  const [userID, setUserID] = useState("");
  const [query, setQuery] = useState("");
  const [deletingJob, setDeletingJob] = useState<number | null>(null);
  const [deletingEmoji, setDeletingEmoji] = useState<number | null>(null);
  const [downloadingZip, setDownloadingZip] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: "1",
        page_size: "100",
      });
      if (status !== "all") params.set("status", status);
      if (format !== "all") params.set("format", format);
      if (userID.trim()) params.set("user_id", userID.trim());
      if (query.trim()) params.set("q", query.trim());
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs?${params.toString()}`);
      if (!res.ok) throw new Error((await res.text()) || "加载失败");
      const data = (await res.json()) as AdminVideoJobListResponse;
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [status, format, userID, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    let done = 0;
    let failed = 0;
    let running = 0;
    for (const item of items) {
      if (item.status === "done") done += 1;
      if (item.status === "failed") failed += 1;
      if (item.status === "running" || item.status === "queued") running += 1;
    }
    return { done, failed, running };
  }, [items]);

  const handleDeleteCollection = useCallback(
    async (job: AdminVideoJobItem) => {
      if (!job.result_collection_id || deletingJob) return;
      if (!window.confirm(`确认删除合集 #${job.result_collection_id}（任务 #${job.id}）？该操作不可恢复。`)) {
        return;
      }
      setDeletingJob(job.id);
      setError(null);
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/${job.id}/delete-collection`, {
          method: "POST",
        });
        if (!res.ok) {
          const payload = await parseApiError(res);
          throw new Error(payload.message || payload.error || "删除失败");
        }
        void load();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "删除失败";
        setError(message);
      } finally {
        setDeletingJob(null);
      }
    },
    [deletingJob, load]
  );

  const handleDeleteEmoji = useCallback(
    async (job: AdminVideoJobItem) => {
      if (deletingEmoji) return;
      const raw = window.prompt("输入要删除的 emoji_id（单张作品 ID）：");
      if (!raw) return;
      const emojiId = Number(raw.trim());
      if (!Number.isFinite(emojiId) || emojiId <= 0) {
        setError("emoji_id 无效");
        return;
      }
      if (!window.confirm(`确认删除 emoji #${emojiId}（任务 #${job.id}）？该操作不可恢复。`)) {
        return;
      }
      setDeletingEmoji(emojiId);
      setError(null);
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/${job.id}/delete-output`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji_id: emojiId }),
        });
        if (!res.ok) {
          const payload = await parseApiError(res);
          throw new Error(payload.message || payload.error || "删除失败");
        }
        void load();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "删除失败";
        setError(message);
      } finally {
        setDeletingEmoji(null);
      }
    },
    [deletingEmoji, load]
  );

  const handleDownloadZip = useCallback(
    async (job: AdminVideoJobItem) => {
      if (!job.result_collection_id || downloadingZip !== null) {
        return;
      }
      setDownloadingZip(job.id);
      setError(null);
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/${job.id}/download-zip`);
        if (!res.ok) {
          const payload = await parseApiError(res);
          throw new Error(payload.message || payload.error || "获取 ZIP 失败");
        }
        const payload = (await res.json()) as { url?: string; name?: string };
        const url = (payload.url || "").trim();
        if (!url) {
          throw new Error("ZIP 下载地址为空");
        }
        const link = document.createElement("a");
        link.href = url;
        link.download = payload.name || `job_${job.id}_outputs.zip`;
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "获取 ZIP 失败";
        setError(message);
      } finally {
        setDownloadingZip(null);
      }
    },
    [downloadingZip]
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="任务管理清单"
        description="统一管理视频转图片任务，支持按格式/用户筛选并执行删除操作。"
        actions={
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? "加载中..." : "刷新"}
            </button>
          </div>
        }
      />

      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-6">
          <input
            value={userID}
            onChange={(e) => setUserID(e.target.value)}
            placeholder="用户ID"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
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
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            {FORMAT_OPTIONS.map((item) => (
              <option key={item} value={item}>
                格式：{item}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="任务标题 / source key"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 md:col-span-2"
          />
          <button
            onClick={() => void load()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            查询
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
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
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">任务</th>
                <th className="px-4 py-3">用户</th>
                <th className="px-4 py-3">格式</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">合集</th>
                <th className="px-4 py-3">创建时间</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-semibold text-slate-900">#{item.id} {item.title || "未命名任务"}</div>
                    <div className="mt-1 text-xs text-slate-400 max-w-[320px] truncate" title={item.source_video_key}>
                      {item.source_video_key || "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">
                    <div>#{item.user?.id || 0} {item.user?.display_name || "-"}</div>
                    <div className="mt-1">{item.user?.phone || "-"}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">
                    {resolveJobFormat(item)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 inline-block">
                      {statusLabel(item.status)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{item.stage} · {item.progress || 0}%</div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">
                    {item.result_collection_id ? `#${item.result_collection_id}` : "-"}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-500">
                    {formatTime(item.created_at)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/users/video-jobs?q=${encodeURIComponent(String(item.id))}`}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        查看
                      </Link>
                      <button
                        onClick={() => void handleDeleteEmoji(item)}
                        disabled={deletingEmoji !== null}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 disabled:opacity-50"
                      >
                        删除单张
                      </button>
                      <button
                        onClick={() => void handleDownloadZip(item)}
                        disabled={!item.result_collection_id || downloadingZip === item.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50"
                      >
                        {downloadingZip === item.id ? "ZIP 准备中..." : "下载 ZIP"}
                      </button>
                      <button
                        onClick={() => void handleDeleteCollection(item)}
                        disabled={!item.result_collection_id || deletingJob === item.id}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 disabled:opacity-50"
                      >
                        {deletingJob === item.id ? "删除中..." : "删除合集"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={7}>
                    暂无数据
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
