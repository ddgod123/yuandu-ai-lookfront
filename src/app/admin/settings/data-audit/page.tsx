"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type DataAuditRunItem = {
  id: number;
  run_at: string;
  status: "healthy" | "warn" | "failed" | string;
  apply: boolean;
  fix_orphans: boolean;
  duration_ms: number;
  report_path: string;
  error_message: string;
  db_emoji_total: number;
  db_zip_total: number;
  qiniu_object_total: number;
  missing_emoji_object_count: number;
  missing_zip_object_count: number;
  qiniu_orphan_raw_count: number;
  qiniu_orphan_zip_count: number;
  file_count_mismatch_count: number;
  created_at: string;
};

type DataAuditTrendPoint = {
  date: string;
  runs: number;
  healthy_runs: number;
  warn_runs: number;
  failed_runs: number;
  max_missing_emoji_object_count: number;
  max_missing_zip_object_count: number;
  max_qiniu_orphan_raw_count: number;
  max_file_count_mismatch_count: number;
};

type DataAuditOverview = {
  checked_at: string;
  window_days: number;
  total: number;
  latest?: DataAuditRunItem;
  items: DataAuditRunItem[];
  trend: DataAuditTrendPoint[];
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  healthy: { label: "健康", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  warn: { label: "告警", className: "border-amber-200 bg-amber-50 text-amber-700" },
  failed: { label: "失败", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

function fmtTime(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("zh-CN");
}

function fmtInt(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  return Math.trunc(n).toLocaleString("zh-CN");
}

export default function DataAuditPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [windowDays, setWindowDays] = useState(7);
  const [overview, setOverview] = useState<DataAuditOverview | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", "30");
      params.set("window_days", String(windowDays));
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetchWithAuth(`${API_BASE}/api/admin/system/data-audit/overview?${params.toString()}`);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = (await res.json()) as DataAuditOverview;
      setOverview(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "加载失败";
      setOverview(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, windowDays]);

  const latest = overview?.latest;
  const latestStatusMeta = STATUS_META[latest?.status || ""] || {
    label: latest?.status || "-",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };

  const latestRiskTotal = useMemo(() => {
    if (!latest) return 0;
    return (
      Number(latest.missing_emoji_object_count || 0) +
      Number(latest.missing_zip_object_count || 0) +
      Number(latest.qiniu_orphan_raw_count || 0) +
      Number(latest.qiniu_orphan_zip_count || 0) +
      Number(latest.file_count_mismatch_count || 0)
    );
  }, [latest]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="数据审计健康"
        description="展示 data-audit 定时巡检结果：DB 与七牛对象一致性、孤儿对象、合集计数一致性。"
        actions={
          <button
            onClick={load}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-slate-800"
          >
            刷新
          </button>
        }
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs font-semibold text-slate-500">
            状态过滤
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">全部</option>
              <option value="healthy">健康</option>
              <option value="warn">告警</option>
              <option value="failed">失败</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            趋势窗口
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
            >
              <option value={7}>最近 7 天</option>
              <option value={14}>最近 14 天</option>
              <option value={30}>最近 30 天</option>
            </select>
          </label>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-500">最近检查时间</div>
            <div className="mt-1 text-sm font-semibold text-slate-800">{fmtTime(overview?.checked_at)}</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-500">运行记录</div>
            <div className="mt-1 text-sm font-semibold text-slate-800">{fmtInt(overview?.total || 0)}</div>
          </div>
        </div>
      </section>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">加载中...</div>
      )}
      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
      )}

      {!loading && !error && latest && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">最新一次巡检</h3>
            <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${latestStatusMeta.className}`}>
              {latestStatusMeta.label}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-6">
            <MetricCard label="对象缺失(emoji)" value={latest.missing_emoji_object_count} />
            <MetricCard label="对象缺失(zip)" value={latest.missing_zip_object_count} />
            <MetricCard label="孤儿 raw" value={latest.qiniu_orphan_raw_count} />
            <MetricCard label="孤儿 zip" value={latest.qiniu_orphan_zip_count} />
            <MetricCard label="计数不一致" value={latest.file_count_mismatch_count} />
            <MetricCard label="风险总数" value={latestRiskTotal} highlight={latestRiskTotal > 0} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <MetaLine label="运行时间" value={fmtTime(latest.run_at)} />
            <MetaLine label="耗时(ms)" value={fmtInt(latest.duration_ms)} />
            <MetaLine label="模式" value={`${latest.apply ? "apply" : "dry-run"} / ${latest.fix_orphans ? "fix-orphans" : "normal"}`} />
            <MetaLine label="报告路径" value={latest.report_path || "-"} />
          </div>
        </section>
      )}

      {!loading && !error && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900">日趋势</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">日期</th>
                  <th className="px-3 py-2">运行</th>
                  <th className="px-3 py-2">健康/告警/失败</th>
                  <th className="px-3 py-2">最大缺失(emoji/zip)</th>
                  <th className="px-3 py-2">最大孤儿 raw</th>
                  <th className="px-3 py-2">最大计数不一致</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.trend || []).map((row) => (
                  <tr key={row.date} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-800">{row.date}</td>
                    <td className="px-3 py-2 text-slate-700">{fmtInt(row.runs)}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {fmtInt(row.healthy_runs)} / {fmtInt(row.warn_runs)} / {fmtInt(row.failed_runs)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {fmtInt(row.max_missing_emoji_object_count)} / {fmtInt(row.max_missing_zip_object_count)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{fmtInt(row.max_qiniu_orphan_raw_count)}</td>
                    <td className="px-3 py-2 text-slate-700">{fmtInt(row.max_file_count_mismatch_count)}</td>
                  </tr>
                ))}
                {(overview?.trend || []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                      暂无趋势数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && !error && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900">最近运行记录</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">时间</th>
                  <th className="px-3 py-2">状态</th>
                  <th className="px-3 py-2">风险总数</th>
                  <th className="px-3 py-2">耗时</th>
                  <th className="px-3 py-2">报告路径</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.items || []).map((item) => {
                  const totalRisk =
                    Number(item.missing_emoji_object_count || 0) +
                    Number(item.missing_zip_object_count || 0) +
                    Number(item.qiniu_orphan_raw_count || 0) +
                    Number(item.qiniu_orphan_zip_count || 0) +
                    Number(item.file_count_mismatch_count || 0);
                  const meta = STATUS_META[item.status] || {
                    label: item.status || "-",
                    className: "border-slate-200 bg-slate-50 text-slate-700",
                  };
                  return (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-slate-800">{fmtTime(item.run_at)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${meta.className}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className={`px-3 py-2 ${totalRisk > 0 ? "font-semibold text-rose-600" : "text-slate-700"}`}>
                        {fmtInt(totalRisk)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{fmtInt(item.duration_ms)} ms</td>
                      <td className="max-w-[420px] truncate px-3 py-2 text-slate-500">{item.report_path || "-"}</td>
                    </tr>
                  );
                })}
                {(overview?.items || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                      暂无运行记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function MetricCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-slate-50"}`}>
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${highlight ? "text-rose-700" : "text-slate-900"}`}>{fmtInt(value)}</div>
    </div>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-800">{value || "-"}</div>
    </div>
  );
}
