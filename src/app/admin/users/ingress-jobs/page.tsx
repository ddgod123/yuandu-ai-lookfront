"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type AdminVideoIngressCountItem = {
  key?: string;
  count?: number;
};

type AdminVideoIngressJobItem = {
  id?: number;
  provider?: string;
  provider_label?: string;
  channel?: string;
  status?: string;
  error_message?: string;
  bound_user_id?: number;
  user_display_name?: string;
  user_phone?: string;
  external_user_id?: string;
  video_job_id?: number;
  video_job_status?: string;
  source_file_name?: string;
  source_video_key?: string;
  source_size_bytes?: number;
  created_at?: string;
  updated_at?: string;
  finished_at?: string;
};

type AdminVideoIngressJobListResponse = {
  window?: string;
  total?: number;
  items?: AdminVideoIngressJobItem[];
  provider_counts?: AdminVideoIngressCountItem[];
  status_counts?: AdminVideoIngressCountItem[];
};

const PROVIDER_OPTIONS = [
  { value: "all", label: "全部来源" },
  { value: "web", label: "官网Web" },
  { value: "feishu", label: "飞书" },
  { value: "qq", label: "QQ" },
  { value: "wecom", label: "企业微信" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "queued", label: "排队" },
  { value: "processing", label: "处理中" },
  { value: "waiting_bind", label: "待绑定" },
  { value: "job_queued", label: "任务已创建" },
  { value: "done", label: "完成" },
  { value: "failed", label: "失败" },
] as const;

function formatTime(value?: string) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString("zh-CN");
}

function formatSize(bytes?: number) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export default function AdminIngressJobsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("all");
  const [status, setStatus] = useState("all");
  const [windowValue, setWindowValue] = useState("7d");
  const [userID, setUserID] = useState("");
  const [resp, setResp] = useState<AdminVideoIngressJobListResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", "80");
      params.set("window", windowValue);
      if (provider !== "all") params.set("provider", provider);
      if (status !== "all") params.set("status", status);
      if (userID.trim()) params.set("user_id", userID.trim());
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ingress-jobs?${params.toString()}`);
      if (!res.ok) {
        throw new Error((await res.text()) || "加载失败");
      }
      const data = (await res.json()) as AdminVideoIngressJobListResponse;
      setResp(data);
    } catch (err: unknown) {
      setResp(null);
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [provider, status, userID, windowValue]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => (Array.isArray(resp?.items) ? resp?.items || [] : []), [resp?.items]);

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="多入口接入追踪"
        description="统一查看 Web / 飞书 / QQ / 企业微信 的入站任务，定位绑定与分发问题。"
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "刷新中..." : "刷新"}
          </button>
        }
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs font-semibold text-slate-500">
            来源
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
            >
              {PROVIDER_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-500">
            状态
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-500">
            时间窗口
            <select
              value={windowValue}
              onChange={(event) => setWindowValue(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
            >
              <option value="24h">24h</option>
              <option value="7d">7d</option>
              <option value="30d">30d</option>
              <option value="all">all</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-500">
            用户ID（可选）
            <input
              value={userID}
              onChange={(event) => setUserID(event.target.value)}
              placeholder="例如 10001"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
          </label>
        </div>
      </section>

      {error ? <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</section> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            总数：{Number(resp?.total || 0).toLocaleString("zh-CN")}
          </span>
          {(resp?.provider_counts || []).map((item) => (
            <span key={`provider-${item.key}`} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              来源 {item.key || "-"}：{Number(item.count || 0).toLocaleString("zh-CN")}
            </span>
          ))}
          {(resp?.status_counts || []).map((item) => (
            <span key={`status-${item.key}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              状态 {item.key || "-"}：{Number(item.count || 0).toLocaleString("zh-CN")}
            </span>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">来源/状态</th>
                <th className="px-3 py-2 text-left">用户</th>
                <th className="px-3 py-2 text-left">任务</th>
                <th className="px-3 py-2 text-left">文件</th>
                <th className="px-3 py-2 text-left">时间</th>
                <th className="px-3 py-2 text-left">异常</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={String(item.id)} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{item.id || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-700">{item.provider_label || item.provider || "-"}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.channel || "-"}</div>
                    <div className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {item.status || "-"}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-700">{item.user_display_name || "-"}</div>
                    <div className="mt-1 text-xs text-slate-500">UID: {item.bound_user_id || "-"}</div>
                    <div className="text-xs text-slate-500">{item.user_phone || "-"}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-700">{item.video_job_id ? `#${item.video_job_id}` : "-"}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.video_job_status || "-"}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="max-w-[260px] truncate font-semibold text-slate-700" title={item.source_file_name || item.source_video_key || "-"}>
                      {item.source_file_name || item.source_video_key || "-"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{formatSize(item.source_size_bytes)}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    <div>创建：{formatTime(item.created_at)}</div>
                    <div className="mt-1">更新：{formatTime(item.updated_at)}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-rose-600">{item.error_message || "-"}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">
                    暂无数据
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

