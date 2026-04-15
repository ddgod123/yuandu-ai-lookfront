"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type AdminSystemDoctorCheck = {
  key?: string;
  title?: string;
  health?: "green" | "yellow" | "red" | string;
  summary?: string;
  alerts?: string[];
  details?: unknown;
};

type AdminSystemDoctorResponse = {
  checked_at?: string;
  health?: "green" | "yellow" | "red" | string;
  alerts?: string[];
  summary?: Record<string, number>;
  checks?: AdminSystemDoctorCheck[];
};

type AdminLocalGIFZipToWebPResponse = {
  input_file?: string;
  desktop_dir?: string;
  output_file?: string;
  output_path?: string;
  total_files?: number;
  converted_files?: number;
  skipped_files?: number;
  failed_files?: number;
  failures?: string[];
  warnings?: string[];
  elapsed_ms?: number;
};

const HEALTH_META: Record<string, { label: string; className: string }> = {
  green: { label: "健康", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  yellow: { label: "亚健康", className: "border-amber-200 bg-amber-50 text-amber-700" },
  red: { label: "异常", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

const HEALTH_FILTER_OPTIONS: Array<{ value: "all" | "green" | "yellow" | "red"; label: string }> = [
  { value: "all", label: "全部" },
  { value: "green", label: "健康" },
  { value: "yellow", label: "亚健康" },
  { value: "red", label: "异常" },
];

const REFRESH_INTERVAL_OPTIONS = [15, 30, 60, 120];

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

function normalizeHealthMeta(raw: string | undefined) {
  const key = String(raw || "").toLowerCase();
  return (
    HEALTH_META[key] || {
      label: key || "未知",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    }
  );
}

function stringifyDetails(details: unknown) {
  if (details === null || typeof details === "undefined") return "-";
  if (typeof details === "string") return details || "-";
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
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

export default function AdminSystemDoctorPage() {
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<AdminSystemDoctorResponse | null>(null);
  const [expandedKey, setExpandedKey] = useState<string>("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(30);
  const [onlyWithAlerts, setOnlyWithAlerts] = useState(false);
  const [healthFilter, setHealthFilter] = useState<"all" | "green" | "yellow" | "red">("all");
  const [keyword, setKeyword] = useState("");
  const [localZipFile, setLocalZipFile] = useState<File | null>(null);
  const [localConverting, setLocalConverting] = useState(false);
  const [localConvertError, setLocalConvertError] = useState("");
  const [localConvertResult, setLocalConvertResult] = useState<AdminLocalGIFZipToWebPResponse | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) {
      setPolling(true);
    } else {
      setLoading(true);
      setError("");
    }
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/system/doctor`);
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, "系统诊断加载失败"));
      }
      const data = (await res.json()) as AdminSystemDoctorResponse;
      setReport(data);
      setLastRefreshedAt(new Date().toISOString());
      setError("");
      if (!silent) {
        setExpandedKey("");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "系统诊断加载失败";
      setError(message);
      if (!silent) {
        setReport(null);
      }
    } finally {
      if (silent) {
        setPolling(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  const convertLocalZip = useCallback(async () => {
    if (!localZipFile) {
      setLocalConvertError("请先选择 zip 文件");
      return;
    }
    setLocalConverting(true);
    setLocalConvertError("");
    setLocalConvertResult(null);
    try {
      const form = new FormData();
      form.append("file", localZipFile);
      const res = await fetchWithAuth(`${API_BASE}/api/admin/system/local/gif-zip-to-webp`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, "转换失败"));
      }
      const data = (await res.json()) as AdminLocalGIFZipToWebPResponse;
      setLocalConvertResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "转换失败";
      setLocalConvertError(message);
    } finally {
      setLocalConverting(false);
    }
  }, [localZipFile]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const timer = window.setInterval(() => {
      void load(true);
    }, refreshIntervalSec * 1000);
    return () => window.clearInterval(timer);
  }, [autoRefreshEnabled, refreshIntervalSec, load]);

  const checks = useMemo(() => {
    return Array.isArray(report?.checks) ? report?.checks || [] : [];
  }, [report?.checks]);

  const checkStats = useMemo(() => {
    const stats = {
      all: checks.length,
      green: 0,
      yellow: 0,
      red: 0,
      alerts: 0,
    };
    for (const check of checks) {
      const health = String(check.health || "").toLowerCase();
      if (health === "green") stats.green += 1;
      if (health === "yellow") stats.yellow += 1;
      if (health === "red") stats.red += 1;
      if (Array.isArray(check.alerts) && check.alerts.length > 0) stats.alerts += 1;
    }
    return stats;
  }, [checks]);

  const globalAlerts = useMemo(() => {
    return Array.isArray(report?.alerts) ? report?.alerts || [] : [];
  }, [report?.alerts]);

  const filteredChecks = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return checks.filter((check) => {
      const health = String(check.health || "").toLowerCase();
      const alerts = Array.isArray(check.alerts) ? check.alerts || [] : [];
      if (healthFilter !== "all" && health !== healthFilter) return false;
      if (onlyWithAlerts && alerts.length === 0) return false;
      if (!query) return true;
      const joined = [check.key || "", check.title || "", check.summary || "", ...alerts]
        .join(" ")
        .toLowerCase();
      return joined.includes(query);
    });
  }, [checks, healthFilter, onlyWithAlerts, keyword]);

  const globalHealth = normalizeHealthMeta(report?.health);
  const autoRefreshStatusLabel = autoRefreshEnabled ? `自动刷新 ${refreshIntervalSec}s` : "自动刷新已关闭";

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="系统诊断"
        description="一键聚合依赖能力、配置完整性、队列/Worker状态与模板覆盖健康度。"
        actions={
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
              {polling ? "自动刷新中..." : autoRefreshStatusLabel}
            </span>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "刷新中..." : "刷新诊断"}
            </button>
          </div>
        }
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-base font-semibold text-slate-900">本地工具：GIF ZIP 转 WebP ZIP</div>
        <div className="mt-1 text-xs text-slate-500">
          上传 GIF 合集 zip，后端会本地转换并把结果 zip 保存到后端机器桌面（Desktop）。
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="text-xs font-semibold text-slate-500">
            选择 ZIP 文件
            <input
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setLocalZipFile(file);
                setLocalConvertError("");
                setLocalConvertResult(null);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
            />
          </label>
          <button
            onClick={() => void convertLocalZip()}
            disabled={localConverting || !localZipFile}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {localConverting ? "转换中..." : "开始转换并保存到桌面"}
          </button>
        </div>
        {localZipFile ? <div className="mt-2 text-xs text-slate-500">已选文件：{localZipFile.name}</div> : null}
        {localConvertError ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{localConvertError}</div>
        ) : null}
        {localConvertResult ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <div className="font-semibold">转换完成</div>
            <div className="mt-1 break-all">输出文件：{localConvertResult.output_path || "-"}</div>
            <div className="mt-1">
              共 {fmtInt(localConvertResult.total_files)} 个文件，成功 {fmtInt(localConvertResult.converted_files)}，跳过{" "}
              {fmtInt(localConvertResult.skipped_files)}，失败 {fmtInt(localConvertResult.failed_files)}。
            </div>
            {Array.isArray(localConvertResult.warnings) && localConvertResult.warnings.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-700">
                {localConvertResult.warnings.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : null}
            {Array.isArray(localConvertResult.failures) && localConvertResult.failures.length ? (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium text-rose-700">
                  查看失败明细（{fmtInt(localConvertResult.failures.length)}）
                </summary>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-rose-700">
                  {localConvertResult.failures.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}
      </section>

      {loading && !report ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">加载中...</div>
      ) : null}

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div> : null}

      {report ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="grid gap-3 lg:grid-cols-4">
              <label className="text-xs font-semibold text-slate-500">
                自动刷新
                <select
                  value={autoRefreshEnabled ? "on" : "off"}
                  onChange={(event) => setAutoRefreshEnabled(event.target.value === "on")}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
                >
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                </select>
              </label>

              <label className="text-xs font-semibold text-slate-500">
                刷新间隔
                <select
                  value={refreshIntervalSec}
                  onChange={(event) => setRefreshIntervalSec(Number(event.target.value))}
                  disabled={!autoRefreshEnabled}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  {REFRESH_INTERVAL_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value} 秒
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-slate-500">
                关键字过滤
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="按 key / 标题 / 告警 过滤"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-500">最近刷新</div>
                <div className="mt-1 text-sm font-semibold text-slate-800">{fmtTime(lastRefreshedAt || report.checked_at)}</div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${globalHealth.className}`}>
                {globalHealth.label}
              </span>
              <span className="text-xs text-slate-500">检查时间：{fmtTime(report.checked_at)}</span>
              <span className="text-xs text-slate-500">检查项：{fmtInt(checks.length)}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <SummaryCard label="健康" value={report.summary?.green} color="text-emerald-700" />
              <SummaryCard label="亚健康" value={report.summary?.yellow} color="text-amber-700" />
              <SummaryCard label="异常" value={report.summary?.red} color="text-rose-700" />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-2 text-base font-semibold text-slate-900">全局告警</div>
            {globalAlerts.length ? (
              <ul className="space-y-2 text-sm text-slate-700">
                {globalAlerts.map((item, index) => (
                  <li key={`${item}-${index}`} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                暂无全局告警
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-base font-semibold text-slate-900">
                检查明细（{fmtInt(filteredChecks.length)} / {fmtInt(checkStats.all)}）
              </div>
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyWithAlerts}
                  onChange={(event) => setOnlyWithAlerts(event.target.checked)}
                  className="h-3.5 w-3.5"
                />
                仅看有告警项（{fmtInt(checkStats.alerts)}）
              </label>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {HEALTH_FILTER_OPTIONS.map((option) => {
                const selected = healthFilter === option.value;
                const count =
                  option.value === "all"
                    ? checkStats.all
                    : option.value === "green"
                    ? checkStats.green
                    : option.value === "yellow"
                    ? checkStats.yellow
                    : checkStats.red;
                return (
                  <button
                    key={option.value}
                    onClick={() => setHealthFilter(option.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      selected
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option.label} · {fmtInt(count)}
                  </button>
                );
              })}
            </div>
            <div className="space-y-3">
              {filteredChecks.map((check, index) => {
                const checkKey = `${check.key || "check"}-${index}`;
                const healthMeta = normalizeHealthMeta(check.health);
                const alerts = Array.isArray(check.alerts) ? check.alerts || [] : [];
                const expanded = expandedKey === checkKey;
                const hasAlerts = alerts.length > 0;
                return (
                  <div
                    key={checkKey}
                    className={`rounded-xl border p-4 ${
                      hasAlerts ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-slate-50/70"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{check.title || check.key || "未命名检查项"}</div>
                        <div className="mt-1 text-xs text-slate-500">key：{check.key || "-"}</div>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${healthMeta.className}`}>
                        {healthMeta.label}
                      </span>
                    </div>

                    <div className="mt-3 text-sm text-slate-700">{check.summary || "-"}</div>

                    {alerts.length ? (
                      <ul className="mt-3 space-y-1 text-xs text-amber-700">
                        {alerts.map((item, alertIndex) => (
                          <li key={`${checkKey}-alert-${alertIndex}`} className="rounded-lg bg-amber-50 px-2 py-1">
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="mt-3">
                      <button
                        onClick={() => setExpandedKey((prev) => (prev === checkKey ? "" : checkKey))}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {expanded ? "收起详情" : "查看详情"}
                      </button>
                    </div>

                    {expanded ? (
                      <pre className="mt-3 max-h-96 overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                        {stringifyDetails(check.details)}
                      </pre>
                    ) : null}
                  </div>
                );
              })}

              {!filteredChecks.length ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  当前筛选条件下暂无检查项
                </div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value?: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${color}`}>{fmtInt(value)}</div>
    </div>
  );
}
