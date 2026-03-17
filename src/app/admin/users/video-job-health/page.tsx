"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type AdminVideoJobHealthCheckItem = {
  code: string;
  status: "pass" | "warn" | "fail" | string;
  message: string;
  detail?: Record<string, unknown>;
};

type AdminVideoJobHealthSummary = {
  total?: number;
  passed?: number;
  warned?: number;
  failed?: number;
};

type AdminVideoJobHealthStats = {
  events_source?: string;
  outputs_source?: string;
  public_event_count?: number;
  legacy_event_count?: number;
  public_output_count?: number;
  legacy_artifact_count?: number;
  effective_event_count?: number;
  effective_output_count?: number;
  primary_output_count?: number;
  format_counts?: Record<string, number>;
};

type AdminVideoJobHealthResponse = {
  job_id: number;
  health: "green" | "yellow" | "red" | string;
  checked_at?: string;
  job_status?: string;
  job_stage?: string;
  requested_format?: string;
  source_video_key?: string;
  storage_checked?: boolean;
  summary?: AdminVideoJobHealthSummary;
  stats?: AdminVideoJobHealthStats;
  checks?: AdminVideoJobHealthCheckItem[];
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  pass: { label: "通过", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  warn: { label: "告警", className: "border-amber-200 bg-amber-50 text-amber-700" },
  fail: { label: "失败", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

const HEALTH_META: Record<string, { label: string; className: string }> = {
  green: { label: "健康", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  yellow: { label: "亚健康", className: "border-amber-200 bg-amber-50 text-amber-700" },
  red: { label: "异常", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

function formatTime(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("zh-CN");
}

function parseTaskID(input: string) {
  const value = input.trim();
  if (!/^\d+$/.test(value)) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
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

export default function AdminVideoJobHealthPage() {
  const [taskIDInput, setTaskIDInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AdminVideoJobHealthResponse | null>(null);

  const checks = Array.isArray(report?.checks) ? report?.checks || [] : [];
  const healthMeta = HEALTH_META[String(report?.health || "").toLowerCase()] || {
    label: String(report?.health || "未知"),
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };

  const formatCounts = useMemo(() => {
    const raw = report?.stats?.format_counts || {};
    return Object.entries(raw).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  }, [report?.stats?.format_counts]);

  const inspect = async () => {
    const taskID = parseTaskID(taskIDInput);
    if (!taskID) {
      setError("请输入有效任务ID（正整数）");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/${taskID}/health?check_storage=1`);
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, "巡检失败"));
      }
      const data = (await res.json()) as AdminVideoJobHealthResponse;
      setReport(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "巡检失败";
      setError(message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="任务巡检"
        description="输入任务ID，一键检查视频转图片任务健康状态（状态链路、产物、存储、GIF关键指标）"
        actions={
          <>
            <Link
              href="/admin/users/gif-sql-health"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              SQL巡检（GIF）
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
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">任务ID</label>
            <input
              value={taskIDInput}
              onChange={(event) => setTaskIDInput(event.target.value)}
              placeholder="例如：12345"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void inspect();
                }
              }}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => void inspect()}
              disabled={loading}
              className="h-10 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "巡检中..." : "开始巡检"}
            </button>
          </div>
        </div>
        {error ? <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div> : null}
      </div>

      {report ? (
        <>
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-500">任务 #{report.job_id}</span>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${healthMeta.className}`}>
                {healthMeta.label}
              </span>
              <span className="text-xs text-slate-500">巡检时间：{formatTime(report.checked_at)}</span>
            </div>
            <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                状态：{report.job_status || "-"} / {report.job_stage || "-"}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                目标格式：{report.requested_format || "-"}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                检查项：{report.summary?.passed || 0} 通过 / {report.summary?.warned || 0} 告警 / {report.summary?.failed || 0} 失败
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                事件源：{report.stats?.events_source || "-"} · 产物源：{report.stats?.outputs_source || "-"}
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500 break-all">source key：{report.source_video_key || "-"}</div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-bold text-slate-800">巡检明细</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">检查项</th>
                    <th className="px-3 py-2">结果</th>
                    <th className="px-3 py-2">说明</th>
                    <th className="px-3 py-2">详情</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {checks.map((item, index) => {
                    const status = String(item.status || "warn").toLowerCase();
                    const meta = STATUS_META[status] || {
                      label: status || "未知",
                      className: "border-slate-200 bg-slate-50 text-slate-700",
                    };
                    const detailText = item.detail ? JSON.stringify(item.detail) : "-";
                    return (
                      <tr key={`${item.code}-${index}`}>
                        <td className="px-3 py-2 font-medium">{item.code || "-"}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.className}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">{item.message || "-"}</td>
                        <td className="px-3 py-2 max-w-[440px] whitespace-pre-wrap break-all text-xs text-slate-500">
                          {detailText}
                        </td>
                      </tr>
                    );
                  })}
                  {!checks.length ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                        暂无巡检项
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-bold text-slate-800">统计视图</div>
            <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                有效事件数：{report.stats?.effective_event_count || 0}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                有效产物数：{report.stats?.effective_output_count || 0}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                主产物数：{report.stats?.primary_output_count || 0}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                存储检查：{report.storage_checked ? "已开启" : "未开启"}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {formatCounts.map(([format, count]) => (
                <span key={format} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                  {String(format).toUpperCase()} · {count}
                </span>
              ))}
              {!formatCounts.length ? (
                <span className="text-xs text-slate-400">暂无格式分布</span>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
