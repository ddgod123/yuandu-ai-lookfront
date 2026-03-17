"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type AdminSampleVideoJobsBaselineDiffSummary = {
  base_jobs_window?: number;
  target_jobs_window?: number;
  jobs_window_delta?: number;
  jobs_window_uplift?: number;
  base_done_window?: number;
  target_done_window?: number;
  done_window_delta?: number;
  done_window_uplift?: number;
  base_failed_window?: number;
  target_failed_window?: number;
  failed_window_delta?: number;
  failed_window_uplift?: number;
  base_success_rate?: number;
  target_success_rate?: number;
  success_rate_delta?: number;
  success_rate_uplift?: number;
  base_duration_p50_sec?: number;
  target_duration_p50_sec?: number;
  duration_p50_delta?: number;
  duration_p50_uplift?: number;
  base_duration_p95_sec?: number;
  target_duration_p95_sec?: number;
  duration_p95_delta?: number;
  duration_p95_uplift?: number;
};

type AdminSampleVideoJobsBaselineDiffFormatStat = {
  format?: string;
  base_requested_jobs?: number;
  target_requested_jobs?: number;
  base_generated_jobs?: number;
  target_generated_jobs?: number;
  base_success_rate?: number;
  target_success_rate?: number;
  success_rate_delta?: number;
  success_rate_uplift?: number;
  base_avg_artifact_size_bytes?: number;
  target_avg_artifact_size_bytes?: number;
  avg_artifact_size_delta?: number;
  avg_artifact_size_uplift?: number;
  base_duration_p50_sec?: number;
  target_duration_p50_sec?: number;
  duration_p50_delta?: number;
  duration_p50_uplift?: number;
  base_duration_p95_sec?: number;
  target_duration_p95_sec?: number;
  duration_p95_delta?: number;
  duration_p95_uplift?: number;
};

type AdminSampleVideoJobsBaselineDiffResponse = {
  base_window?: string;
  target_window?: string;
  generated_at?: string;
  summary?: AdminSampleVideoJobsBaselineDiffSummary;
  formats?: AdminSampleVideoJobsBaselineDiffFormatStat[];
};

type AdminVideoJobFeedbackRolloutRecommendation = {
  state?: string;
  reason?: string;
  current_rollout_percent?: number;
  suggested_rollout_percent?: number;
  consecutive_required?: number;
  consecutive_matched?: number;
  consecutive_passed?: boolean;
};

type ApplyRolloutSuggestionResponse = {
  applied?: boolean;
  applied_at?: string;
  cooldown_seconds?: number;
  next_allowed_at?: string;
  message?: string;
  window?: string;
  confirm_windows?: number;
  recommendation?: AdminVideoJobFeedbackRolloutRecommendation;
  setting?: {
    highlight_feedback_rollout_percent?: number;
  };
};

type AdminVideoJobFeedbackRolloutAudit = {
  id?: number;
  admin_id?: number;
  from_rollout_percent?: number;
  to_rollout_percent?: number;
  window?: string;
  confirm_windows?: number;
  recommendation_state?: string;
  recommendation_reason?: string;
  created_at?: string;
};

type AdminVideoJobGIFEvaluationOverview = {
  samples?: number;
  avg_emotion_score?: number;
  avg_clarity_score?: number;
  avg_motion_score?: number;
  avg_loop_score?: number;
  avg_efficiency_score?: number;
  avg_overall_score?: number;
};

type AdminVideoJobGIFBaselineSnapshot = {
  baseline_date?: string;
  window_label?: string;
  scope?: string;
  sample_jobs?: number;
  done_jobs?: number;
  failed_jobs?: number;
  done_rate?: number;
  failed_rate?: number;
  sample_outputs?: number;
  avg_emotion_score?: number;
  avg_clarity_score?: number;
  avg_motion_score?: number;
  avg_loop_score?: number;
  avg_efficiency_score?: number;
  avg_overall_score?: number;
};

type AdminVideoJobGIFEvaluationSample = {
  job_id?: number;
  output_id?: number;
  preview_url?: string;
  object_key?: string;
  window_start_ms?: number;
  window_end_ms?: number;
  overall_score?: number;
  emotion_score?: number;
  clarity_score?: number;
  motion_score?: number;
  loop_score?: number;
  efficiency_score?: number;
  candidate_reason?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  duration_ms?: number;
  created_at?: string;
};

type AdminVideoJobGIFManualScoreOverview = {
  samples?: number;
  with_output_id?: number;
  matched_evaluations?: number;
  matched_rate?: number;
  top_pick_rate?: number;
  pass_rate?: number;
  avg_manual_emotion?: number;
  avg_manual_clarity?: number;
  avg_manual_motion?: number;
  avg_manual_loop?: number;
  avg_manual_efficiency?: number;
  avg_manual_overall?: number;
  avg_auto_emotion?: number;
  avg_auto_clarity?: number;
  avg_auto_motion?: number;
  avg_auto_loop?: number;
  avg_auto_efficiency?: number;
  avg_auto_overall?: number;
  mae_emotion?: number;
  mae_clarity?: number;
  mae_motion?: number;
  mae_loop?: number;
  mae_efficiency?: number;
  mae_overall?: number;
  avg_overall_delta?: number;
};

type AdminVideoJobGIFManualScoreDiffSample = {
  sample_id?: string;
  baseline_version?: string;
  review_round?: string;
  reviewer?: string;
  job_id?: number;
  output_id?: number;
  preview_url?: string;
  object_key?: string;
  manual_overall_score?: number;
  auto_overall_score?: number;
  overall_score_delta?: number;
  abs_overall_score_diff?: number;
  manual_loop_score?: number;
  auto_loop_score?: number;
  loop_score_delta?: number;
  manual_clarity_score?: number;
  auto_clarity_score?: number;
  clarity_score_delta?: number;
  is_top_pick?: boolean;
  is_pass?: boolean;
  reject_reason?: string;
  reviewed_at?: string;
};

type AdminVideoJobOverviewResponse = {
  feedback_rollout_recommendation?: AdminVideoJobFeedbackRolloutRecommendation;
  feedback_rollout_audit_logs?: AdminVideoJobFeedbackRolloutAudit[];
  gif_evaluation_overview?: AdminVideoJobGIFEvaluationOverview;
  gif_baseline_snapshots?: AdminVideoJobGIFBaselineSnapshot[];
  gif_evaluation_top_samples?: AdminVideoJobGIFEvaluationSample[];
  gif_evaluation_low_samples?: AdminVideoJobGIFEvaluationSample[];
  gif_manual_score_overview?: AdminVideoJobGIFManualScoreOverview;
  gif_manual_score_diff_samples?: AdminVideoJobGIFManualScoreDiffSample[];
};

type BaselineDecision = {
  state: "insufficient_data" | "hold" | "scale_up" | "scale_down";
  label: string;
  panelClass: string;
  badgeClass: string;
  reasonClass: string;
  reason: string;
};

type GIFVisualComparePair = {
  id: string;
  top?: AdminVideoJobGIFEvaluationSample;
  low?: AdminVideoJobGIFEvaluationSample;
};

function extractObjectKey(rawURL?: string, fallbackObjectKey?: string) {
  const fallback = (fallbackObjectKey || "").trim().replace(/^\/+/, "");
  if (fallback.startsWith("emoji/")) return fallback;
  const raw = (rawURL || "").trim();
  if (!raw) return fallback;
  try {
    if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) {
      const parsed = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
      const pathname = decodeURIComponent(parsed.pathname || "").replace(/^\/+/, "");
      if (pathname) return pathname;
    }
  } catch {
    // ignore parse errors
  }
  return raw.replace(/^\/+/, "").split("?")[0].split("#")[0];
}

function buildStorageProxyURL(rawURL?: string, objectKey?: string) {
  const key = extractObjectKey(rawURL, objectKey);
  if (!key || !key.startsWith("emoji/")) return "";
  return `${API_BASE}/api/storage/proxy?key=${encodeURIComponent(key)}`;
}

function buildPreviewCandidates(rawURL?: string, objectKey?: string) {
  const raw = (rawURL || "").trim();
  const proxyURL = buildStorageProxyURL(raw, objectKey);
  const out: string[] = [];
  const add = (value?: string) => {
    const clean = (value || "").trim();
    if (!clean) return;
    if (!out.includes(clean)) out.push(clean);
  };

  // 开发期优先走后端 proxy，避免七牛域名冻结/未备案导致空图。
  add(proxyURL);
  add(raw);
  if (/^http:\/\//i.test(raw)) add(raw.replace(/^http:\/\//i, "https://"));
  if (/^https:\/\//i.test(raw)) add(raw.replace(/^https:\/\//i, "http://"));
  return out;
}

function resolvePreviewHref(rawURL?: string, objectKey?: string) {
  const candidates = buildPreviewCandidates(rawURL, objectKey);
  return candidates[0] || "";
}

function BaselinePreviewImage({
  previewURL,
  objectKey,
  alt,
  className,
}: {
  previewURL?: string;
  objectKey?: string;
  alt: string;
  className: string;
}) {
  const candidates = useMemo(
    () => buildPreviewCandidates(previewURL, objectKey),
    [objectKey, previewURL]
  );
  const [index, setIndex] = useState(0);

  const src = candidates[index];
  if (!src) {
    return <div className={`${className} bg-slate-100`} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setIndex((prev) => (prev + 1 < candidates.length ? prev + 1 : prev))}
    />
  );
}

function formatTime(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN");
}

function formatPercent(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0.00%";
  return `${(n * 100).toFixed(2)}%`;
}

function formatScore(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0.000";
  return n.toFixed(3);
}

function formatSignedScore(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0.000";
  if (n === 0) return "0.000";
  return `${n > 0 ? "+" : ""}${n.toFixed(3)}`;
}

function formatSignedPercent(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0.00%";
  return `${n > 0 ? "+" : ""}${(n * 100).toFixed(2)}%`;
}

function formatSeconds(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  return `${n.toFixed(2)}s`;
}

function formatSignedSeconds(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n === 0) return "0.00s";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}s`;
}

function formatBytes(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  if (n < 1024) return `${n.toFixed(0)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatSignedBytes(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n === 0) return "0 B";
  const prefix = n > 0 ? "+" : "";
  const abs = Math.abs(n);
  if (abs < 1024) return `${prefix}${n.toFixed(0)} B`;
  if (abs < 1024 * 1024) return `${prefix}${(n / 1024).toFixed(1)} KB`;
  if (abs < 1024 * 1024 * 1024) return `${prefix}${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${prefix}${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatWindowRangeMs(startMs?: number, endMs?: number) {
  const start = Number(startMs || 0);
  const end = Number(endMs || 0);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "-";
  return `${(start / 1000).toFixed(2)}s ~ ${(end / 1000).toFixed(2)}s`;
}

function formatDurationMs(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  return `${(n / 1000).toFixed(2)}s`;
}

function upliftTextClass(value?: number, options?: { inverse?: boolean }) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "text-slate-500";
  const score = options?.inverse ? -value : value;
  if (score >= 0.05) return "font-semibold text-emerald-700";
  if (score >= 0.01) return "text-emerald-600";
  if (score <= -0.05) return "font-semibold text-rose-700";
  if (score < 0) return "text-amber-700";
  return "text-slate-600";
}

function formatWindowLabel(window: string) {
  switch ((window || "").toLowerCase()) {
    case "24h":
      return "24 小时";
    case "7d":
      return "7 天";
    case "30d":
      return "30 天";
    default:
      return window || "-";
  }
}

function resolveBaselineDecision(
  summary?: AdminSampleVideoJobsBaselineDiffSummary,
  formats: AdminSampleVideoJobsBaselineDiffFormatStat[] = []
): BaselineDecision {
  if (!summary) {
    return {
      state: "insufficient_data",
      label: "insufficient_data",
      reason: "暂无样本基线数据，请先准备 sample 任务。",
      panelClass: "border-slate-200 bg-slate-50",
      badgeClass: "bg-slate-600 text-white",
      reasonClass: "text-slate-600",
    };
  }

  const targetJobs = summary.target_jobs_window || 0;
  if (targetJobs < 12) {
    return {
      state: "insufficient_data",
      label: "insufficient_data",
      reason: `目标窗口样本量仅 ${targetJobs}，建议至少 12 条后再做放量判断。`,
      panelClass: "border-slate-200 bg-slate-50",
      badgeClass: "bg-slate-600 text-white",
      reasonClass: "text-slate-600",
    };
  }

  const regressedFormats = formats.filter(
    (item) => (item.target_requested_jobs || 0) >= 5 && (item.success_rate_uplift || 0) <= -0.08
  );
  const successRegressed = (summary.success_rate_uplift || 0) <= -0.05;
  const p95Regressed = (summary.duration_p95_uplift || 0) >= 0.2 && (summary.duration_p95_delta || 0) >= 2;
  if (successRegressed || p95Regressed || regressedFormats.length > 0) {
    const reasons: string[] = [];
    if (successRegressed) reasons.push(`成功率 Uplift ${formatSignedPercent(summary.success_rate_uplift)}`);
    if (p95Regressed) reasons.push(`耗时P95 Uplift ${formatSignedPercent(summary.duration_p95_uplift)}`);
    if (regressedFormats.length > 0) {
      reasons.push(`格式回退 ${regressedFormats.map((item) => (item.format || "-").toUpperCase()).join("/")}`);
    }
    return {
      state: "scale_down",
      label: "scale_down",
      reason: `建议回退：${reasons.join("，")}。`,
      panelClass: "border-rose-200 bg-rose-50/70",
      badgeClass: "bg-rose-600 text-white",
      reasonClass: "text-rose-700",
    };
  }

  const successImproved = (summary.success_rate_uplift || 0) >= 0.03;
  const p95Stable = (summary.duration_p95_uplift || 0) <= 0.1;
  const p50Stable = (summary.duration_p50_uplift || 0) <= 0.1;
  if (successImproved && p95Stable && p50Stable) {
    return {
      state: "scale_up",
      label: "scale_up",
      reason: `建议放量：成功率 Uplift ${formatSignedPercent(summary.success_rate_uplift)}，耗时保持稳定。`,
      panelClass: "border-emerald-200 bg-emerald-50/70",
      badgeClass: "bg-emerald-600 text-white",
      reasonClass: "text-emerald-700",
    };
  }

  return {
    state: "hold",
    label: "hold",
    reason: "建议继续观察：当前波动尚未达到明确放量/回退阈值。",
    panelClass: "border-amber-200 bg-amber-50/70",
    badgeClass: "bg-amber-500 text-white",
    reasonClass: "text-amber-700",
  };
}

function rolloutStateMeta(state?: string) {
  const value = (state || "").trim().toLowerCase();
  switch (value) {
    case "scale_up":
      return {
        label: "scale_up",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "scale_down":
      return {
        label: "scale_down",
        className: "border-rose-200 bg-rose-50 text-rose-700",
      };
    case "hold":
      return {
        label: "hold",
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
    case "insufficient_data":
      return {
        label: "insufficient_data",
        className: "border-slate-200 bg-slate-50 text-slate-700",
      };
    default:
      return {
        label: value || "unknown",
        className: "border-slate-200 bg-slate-50 text-slate-700",
      };
  }
}

async function parseApiError(response: Response, fallback: string) {
  const text = (await response.text()) || fallback;
  if (!text) return fallback;
  try {
    const payload = JSON.parse(text) as { error?: string; message?: string };
    return payload.message || payload.error || fallback;
  } catch {
    return text;
  }
}

export default function AdminGIFBaselinesPage() {
  const [baseWindow, setBaseWindow] = useState("7d");
  const [targetWindow, setTargetWindow] = useState("24h");
  const [formatFilter, setFormatFilter] = useState<"all" | "gif">("all");
  const [loading, setLoading] = useState(false);
  const [exportingBaseline, setExportingBaseline] = useState(false);
  const [exportingDiff, setExportingDiff] = useState(false);
  const [exportingGIFEvaluations, setExportingGIFEvaluations] = useState(false);
  const [exportingGIFBaselines, setExportingGIFBaselines] = useState(false);
  const [exportingGIFRerankLogs, setExportingGIFRerankLogs] = useState(false);
  const [exportingGIFQualityReport, setExportingGIFQualityReport] = useState(false);
  const [exportingGIFManualCompare, setExportingGIFManualCompare] = useState(false);
  const [applyingRollout, setApplyingRollout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rolloutActionMessage, setRolloutActionMessage] = useState<string | null>(null);
  const [report, setReport] = useState<AdminSampleVideoJobsBaselineDiffResponse | null>(null);
  const [rolloutRecommendation, setRolloutRecommendation] = useState<AdminVideoJobFeedbackRolloutRecommendation | null>(null);
  const [rolloutAuditLogs, setRolloutAuditLogs] = useState<AdminVideoJobFeedbackRolloutAudit[]>([]);
  const [gifEvaluationOverview, setGifEvaluationOverview] = useState<AdminVideoJobGIFEvaluationOverview | null>(null);
  const [gifBaselineSnapshots, setGifBaselineSnapshots] = useState<AdminVideoJobGIFBaselineSnapshot[]>([]);
  const [gifTopSamples, setGifTopSamples] = useState<AdminVideoJobGIFEvaluationSample[]>([]);
  const [gifLowSamples, setGifLowSamples] = useState<AdminVideoJobGIFEvaluationSample[]>([]);
  const [gifManualScoreOverview, setGifManualScoreOverview] = useState<AdminVideoJobGIFManualScoreOverview | null>(null);
  const [gifManualDiffSamples, setGifManualDiffSamples] = useState<AdminVideoJobGIFManualScoreDiffSample[]>([]);
  const fetchSeqRef = useRef(0);

  const fetchReport = useCallback(
    async (
      nextBaseWindow?: string,
      nextTargetWindow?: string,
      options?: { preserveActionMessage?: boolean }
    ) => {
      const base = (nextBaseWindow || baseWindow).trim();
      const target = (nextTargetWindow || targetWindow).trim();
      const fetchSeq = fetchSeqRef.current + 1;
      fetchSeqRef.current = fetchSeq;
      setLoading(true);
      setError(null);
      if (!options?.preserveActionMessage) {
        setRolloutActionMessage(null);
      }
      try {
        const diffRes = await fetchWithAuth(
          `${API_BASE}/api/admin/video-jobs/samples/baseline-diff?base_window=${encodeURIComponent(base)}&target_window=${encodeURIComponent(target)}`
        );
        if (!diffRes.ok) {
          throw new Error(await parseApiError(diffRes, "加载样本基线对比失败"));
        }
        const data = (await diffRes.json()) as AdminSampleVideoJobsBaselineDiffResponse;
        if (fetchSeq !== fetchSeqRef.current) return;
        setReport(data);

        const overviewRes = await fetchWithAuth(
          `${API_BASE}/api/admin/video-jobs/overview?window=${encodeURIComponent(target)}`
        );
        if (!overviewRes.ok) {
          if (fetchSeq !== fetchSeqRef.current) return;
          setRolloutRecommendation(null);
          setRolloutAuditLogs([]);
          setGifEvaluationOverview(null);
          setGifBaselineSnapshots([]);
          setGifTopSamples([]);
          setGifLowSamples([]);
          setGifManualScoreOverview(null);
          setGifManualDiffSamples([]);
        } else {
          const overview = (await overviewRes.json()) as AdminVideoJobOverviewResponse;
          if (fetchSeq !== fetchSeqRef.current) return;
          setRolloutRecommendation(overview.feedback_rollout_recommendation || null);
          setRolloutAuditLogs(
            Array.isArray(overview.feedback_rollout_audit_logs) ? overview.feedback_rollout_audit_logs || [] : []
          );
          setGifEvaluationOverview(overview.gif_evaluation_overview || null);
          setGifBaselineSnapshots(
            Array.isArray(overview.gif_baseline_snapshots) ? overview.gif_baseline_snapshots || [] : []
          );
          setGifTopSamples(
            Array.isArray(overview.gif_evaluation_top_samples) ? overview.gif_evaluation_top_samples || [] : []
          );
          setGifLowSamples(
            Array.isArray(overview.gif_evaluation_low_samples) ? overview.gif_evaluation_low_samples || [] : []
          );
          setGifManualScoreOverview(overview.gif_manual_score_overview || null);
          setGifManualDiffSamples(
            Array.isArray(overview.gif_manual_score_diff_samples) ? overview.gif_manual_score_diff_samples || [] : []
          );
        }
      } catch (err: unknown) {
        if (fetchSeq !== fetchSeqRef.current) return;
        setReport(null);
        setRolloutRecommendation(null);
        setRolloutAuditLogs([]);
        setGifEvaluationOverview(null);
        setGifBaselineSnapshots([]);
        setGifTopSamples([]);
        setGifLowSamples([]);
        setGifManualScoreOverview(null);
        setGifManualDiffSamples([]);
        setError(err instanceof Error ? err.message : "加载样本基线对比失败");
      } finally {
        if (fetchSeq === fetchSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [baseWindow, targetWindow]
  );

  const applyRolloutSuggestion = useCallback(async () => {
    const reportBase = (report?.base_window || "").trim().toLowerCase();
    const reportTarget = (report?.target_window || "").trim().toLowerCase();
    const currentBase = baseWindow.trim().toLowerCase();
    const currentTarget = targetWindow.trim().toLowerCase();
    if (!reportBase || !reportTarget || reportBase !== currentBase || reportTarget !== currentTarget) {
      setRolloutActionMessage("当前展示数据与窗口选择不一致，请等待自动刷新后再应用。");
      return;
    }
    setApplyingRollout(true);
    setRolloutActionMessage(null);
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/quality-settings/apply-rollout-suggestion?window=${encodeURIComponent(targetWindow)}&confirm_windows=3`,
        { method: "POST" }
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "应用 rollout 建议失败"));
      }
      const data = (await res.json()) as ApplyRolloutSuggestionResponse;
      const recommendation = data.recommendation || {};
      const settingRollout = data.setting?.highlight_feedback_rollout_percent;
      const nextAllowedAt = formatTime(data.next_allowed_at);
      const appliedAt = formatTime(data.applied_at);

      if (data.applied) {
        const current = recommendation.current_rollout_percent;
        const suggested = recommendation.suggested_rollout_percent;
        const fromText = typeof current === "number" ? `${current}%` : "-";
        const toText = typeof suggested === "number" ? `${suggested}%` : "-";
        let message = `已应用 rollout：${fromText} → ${toText}`;
        if (typeof settingRollout === "number") {
          message += `（当前 ${settingRollout}%）`;
        }
        if (appliedAt !== "-") {
          message += ` · 生效时间 ${appliedAt}`;
        }
        setRolloutActionMessage(message);
      } else {
        let message = data.message || recommendation.reason || "当前建议不可应用";
        if ((data.cooldown_seconds || 0) > 0 && nextAllowedAt !== "-") {
          message += `（冷却剩余 ${data.cooldown_seconds}s，预计 ${nextAllowedAt} 可再次调整）`;
        }
        setRolloutActionMessage(message);
      }
      await fetchReport(baseWindow, targetWindow, { preserveActionMessage: true });
    } catch (err: unknown) {
      setRolloutActionMessage(err instanceof Error ? err.message : "应用 rollout 建议失败");
    } finally {
      setApplyingRollout(false);
    }
  }, [baseWindow, fetchReport, report?.base_window, report?.target_window, targetWindow]);

  const exportBaselineCSV = useCallback(async () => {
    setExportingBaseline(true);
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/samples/baseline.csv?window=${encodeURIComponent(targetWindow)}`
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "导出样本基线失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `video_jobs_sample_baseline_${targetWindow}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "导出样本基线失败");
    } finally {
      setExportingBaseline(false);
    }
  }, [targetWindow]);

  const exportDiffCSV = useCallback(async () => {
    setExportingDiff(true);
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/samples/baseline-diff.csv?base_window=${encodeURIComponent(baseWindow)}&target_window=${encodeURIComponent(targetWindow)}`
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "导出样本基线Diff失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `video_jobs_sample_baseline_diff_${targetWindow}_vs_${baseWindow}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "导出样本基线Diff失败");
    } finally {
      setExportingDiff(false);
    }
  }, [baseWindow, targetWindow]);

  const exportGIFEvaluationsCSV = useCallback(async () => {
    setExportingGIFEvaluations(true);
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/gif-evaluations.csv?window=${encodeURIComponent(targetWindow)}&limit=3000`
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "导出 GIF 评测明细失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `video_jobs_gif_evaluations_${targetWindow}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "导出 GIF 评测明细失败");
    } finally {
      setExportingGIFEvaluations(false);
    }
  }, [targetWindow]);

  const exportGIFBaselinesCSV = useCallback(async () => {
    setExportingGIFBaselines(true);
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/gif-baselines.csv?window=${encodeURIComponent(targetWindow)}&limit=180`
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "导出 GIF 基线快照失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `video_jobs_gif_baselines_${targetWindow}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "导出 GIF 基线快照失败");
    } finally {
      setExportingGIFBaselines(false);
    }
  }, [targetWindow]);

  const exportGIFRerankLogsCSV = useCallback(async () => {
    setExportingGIFRerankLogs(true);
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/gif-rerank-logs.csv?window=${encodeURIComponent(targetWindow)}&limit=5000`
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "导出 GIF 重排日志失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `video_jobs_gif_rerank_logs_${targetWindow}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "导出 GIF 重排日志失败");
    } finally {
      setExportingGIFRerankLogs(false);
    }
  }, [targetWindow]);

  const exportGIFQualityReportCSV = useCallback(async () => {
    setExportingGIFQualityReport(true);
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/gif-quality-report.csv?window=${encodeURIComponent(targetWindow)}`
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "导出 GIF 质量对比报表失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `video_jobs_gif_quality_report_${targetWindow}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "导出 GIF 质量对比报表失败");
    } finally {
      setExportingGIFQualityReport(false);
    }
  }, [targetWindow]);

  const exportGIFManualCompareCSV = useCallback(async () => {
    setExportingGIFManualCompare(true);
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/gif-manual-compare.csv?window=${encodeURIComponent(targetWindow)}`
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "导出人工评分对比报表失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `video_jobs_gif_manual_compare_${targetWindow}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "导出人工评分对比报表失败");
    } finally {
      setExportingGIFManualCompare(false);
    }
  }, [targetWindow]);

  useEffect(() => {
    void fetchReport(baseWindow, targetWindow);
  }, [baseWindow, fetchReport, targetWindow]);

  const summary = report?.summary;
  const rolloutSuggestionMeta = rolloutStateMeta(rolloutRecommendation?.state);
  const formats = useMemo(() => {
    const list = Array.isArray(report?.formats) ? report?.formats || [] : [];
    if (formatFilter === "gif") {
      return list.filter((item) => String(item.format || "").toLowerCase() === "gif");
    }
    return list;
  }, [report?.formats, formatFilter]);
  const decision = resolveBaselineDecision(summary, formats);
  const reportBaseWindow = (report?.base_window || "").trim().toLowerCase();
  const reportTargetWindow = (report?.target_window || "").trim().toLowerCase();
  const windowMatched =
    reportBaseWindow !== "" &&
    reportTargetWindow !== "" &&
    reportBaseWindow === baseWindow.trim().toLowerCase() &&
    reportTargetWindow === targetWindow.trim().toLowerCase();
  const rolloutApplyDisabled = applyingRollout || loading || !windowMatched;
  const latestBaseline = gifBaselineSnapshots[0];
  const previousBaseline = gifBaselineSnapshots.length > 1 ? gifBaselineSnapshots[1] : null;
  const qualityDeltaLatest =
    latestBaseline && previousBaseline
      ? {
          overall: (latestBaseline.avg_overall_score || 0) - (previousBaseline.avg_overall_score || 0),
          loop: (latestBaseline.avg_loop_score || 0) - (previousBaseline.avg_loop_score || 0),
          clarity: (latestBaseline.avg_clarity_score || 0) - (previousBaseline.avg_clarity_score || 0),
          efficiency: (latestBaseline.avg_efficiency_score || 0) - (previousBaseline.avg_efficiency_score || 0),
        }
      : null;
  const visualComparePairs = useMemo<GIFVisualComparePair[]>(() => {
    const maxPairs = Math.max(gifTopSamples.length, gifLowSamples.length);
    const out: GIFVisualComparePair[] = [];
    for (let i = 0; i < maxPairs; i += 1) {
      const top = gifTopSamples[i];
      const low = gifLowSamples[i];
      if (!top && !low) continue;
      out.push({
        id: `${top?.output_id || 0}-${low?.output_id || 0}-${i}`,
        top,
        low,
      });
    }
    return out;
  }, [gifLowSamples, gifTopSamples]);

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="样本基线对比"
        description="对比 sample 样本任务的窗口基线（成功率 / 耗时 / 体积），辅助判断“放量、保持或回退”。"
        actions={
          <>
            <Link
              href="/admin/users/video-jobs"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              返回创作任务
            </Link>
            <Link
              href="/admin/settings/video-quality"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              调整质量参数
            </Link>
          </>
        }
      />

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <label className="space-y-1 text-xs text-slate-500">
            <span>对照窗口</span>
            <select
              value={baseWindow}
              onChange={(event) => setBaseWindow(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-500"
            >
              <option value="24h">24 小时</option>
              <option value="7d">7 天</option>
              <option value="30d">30 天</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-500">
            <span>目标窗口</span>
            <select
              value={targetWindow}
              onChange={(event) => setTargetWindow(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-500"
            >
              <option value="24h">24 小时</option>
              <option value="7d">7 天</option>
              <option value="30d">30 天</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-500">
            <span>格式视图</span>
            <select
              value={formatFilter}
              onChange={(event) => setFormatFilter(event.target.value as "all" | "gif")}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-500"
            >
              <option value="all">全部格式</option>
              <option value="gif">仅 GIF</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              onClick={() => void fetchReport()}
              disabled={loading}
              className="w-full rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
            >
              {loading ? "加载中..." : "刷新对比"}
            </button>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => void exportBaselineCSV()}
              disabled={exportingBaseline}
              className="flex-1 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs font-semibold text-fuchsia-700 disabled:opacity-60"
            >
              {exportingBaseline ? "导出中..." : "导出基线"}
            </button>
            <button
              onClick={() => void exportDiffCSV()}
              disabled={exportingDiff}
              className="flex-1 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 disabled:opacity-60"
            >
              {exportingDiff ? "导出中..." : "导出Diff"}
            </button>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          说明：仅统计 <code>is_sample = true</code> 的任务样本集。当前对比：
          {formatWindowLabel(report?.target_window || targetWindow)} vs {formatWindowLabel(report?.base_window || baseWindow)}。
          更新时间：{formatTime(report?.generated_at)}。
        </div>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-700">GIF 专项导出</div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            <button
              onClick={() => void exportGIFEvaluationsCSV()}
              disabled={exportingGIFEvaluations}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-60"
            >
              {exportingGIFEvaluations ? "导出中..." : "评测明细 CSV"}
            </button>
            <button
              onClick={() => void exportGIFBaselinesCSV()}
              disabled={exportingGIFBaselines}
              className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 disabled:opacity-60"
            >
              {exportingGIFBaselines ? "导出中..." : "基线快照 CSV"}
            </button>
            <button
              onClick={() => void exportGIFRerankLogsCSV()}
              disabled={exportingGIFRerankLogs}
              className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs font-semibold text-fuchsia-700 disabled:opacity-60"
            >
              {exportingGIFRerankLogs ? "导出中..." : "重排日志 CSV"}
            </button>
            <button
              onClick={() => void exportGIFQualityReportCSV()}
              disabled={exportingGIFQualityReport}
              className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 disabled:opacity-60"
            >
              {exportingGIFQualityReport ? "导出中..." : "质量对比报表 CSV"}
            </button>
            <button
              onClick={() => void exportGIFManualCompareCSV()}
              disabled={exportingGIFManualCompare}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 disabled:opacity-60"
            >
              {exportingGIFManualCompare ? "导出中..." : "人工评分对比 CSV"}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}
      {rolloutActionMessage ? (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          {rolloutActionMessage}
        </div>
      ) : null}
      {!loading && report && !windowMatched ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          当前展示窗口为 {formatWindowLabel(report.base_window || "-")} vs {formatWindowLabel(report.target_window || "-")}，
          与当前选择（{formatWindowLabel(baseWindow)} vs {formatWindowLabel(targetWindow)}）不一致，已暂时禁用 rollout 应用。
        </div>
      ) : null}

      <div className={`rounded-3xl border px-4 py-3 shadow-sm ${decision.panelClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${decision.badgeClass}`}>
              {decision.label}
            </span>
            <span className="text-xs text-slate-500">样本窗口建议</span>
          </div>
          <button
            onClick={() => void applyRolloutSuggestion()}
            disabled={rolloutApplyDisabled}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {applyingRollout ? "应用中..." : `应用 rollout 建议（${formatWindowLabel(targetWindow)}）`}
          </button>
        </div>
        <div className={`mt-1 text-xs ${decision.reasonClass}`}>{decision.reason}</div>
        <div className="mt-1 text-[11px] text-slate-500">
          使用后端策略接口：连续窗口 + 护栏校验 + 冷却时间校验
        </div>
      </div>

      <div className="rounded-3xl border border-indigo-100 bg-indigo-50/30 p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-bold text-indigo-700">最近几次 rollout 变更记录</div>
          <div className="text-xs text-indigo-500">最近 {rolloutAuditLogs.length} 条</div>
        </div>

        {rolloutRecommendation ? (
          <div className="mb-3 rounded-xl border border-indigo-100 bg-white px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${rolloutSuggestionMeta.className}`}
              >
                {rolloutSuggestionMeta.label}
              </span>
              <span className="text-xs text-slate-500">
                当前建议：{rolloutRecommendation.current_rollout_percent ?? "-"}% →{" "}
                {rolloutRecommendation.suggested_rollout_percent ?? "-"}%
              </span>
            </div>
            <div className="mt-1 text-xs text-indigo-700">{rolloutRecommendation.reason || "暂无建议说明"}</div>
            <div className="mt-1 text-[11px] text-slate-500">
              连续确认：{rolloutRecommendation.consecutive_matched ?? 0}/{rolloutRecommendation.consecutive_required ?? 0}
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-indigo-100 bg-white">
          <table className="w-full min-w-[940px] text-left text-xs">
            <thead className="bg-indigo-50 text-indigo-700">
              <tr>
                <th className="px-3 py-2">时间</th>
                <th className="px-3 py-2">调整</th>
                <th className="px-3 py-2">状态</th>
                <th className="px-3 py-2">窗口</th>
                <th className="px-3 py-2">连续确认</th>
                <th className="px-3 py-2">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50 text-slate-700">
              {rolloutAuditLogs.map((item) => {
                const stateMeta = rolloutStateMeta(item.recommendation_state);
                return (
                  <tr key={item.id || `${item.created_at}-${item.from_rollout_percent}-${item.to_rollout_percent}`}>
                    <td className="px-3 py-2">{formatTime(item.created_at)}</td>
                    <td className="px-3 py-2 font-semibold">
                      {item.from_rollout_percent ?? "-"}% → {item.to_rollout_percent ?? "-"}%
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${stateMeta.className}`}
                      >
                        {stateMeta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">{formatWindowLabel(item.window || "-")}</td>
                    <td className="px-3 py-2">{item.confirm_windows ?? "-"}</td>
                    <td className="px-3 py-2 max-w-[420px] whitespace-pre-wrap break-all text-slate-600">
                      {item.recommendation_reason || "-"}
                    </td>
                  </tr>
                );
              })}
              {!rolloutAuditLogs.length ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    暂无 rollout 变更记录
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {summary ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">样本任务量</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">
              {summary.base_jobs_window || 0} → {summary.target_jobs_window || 0}
            </div>
            <div className={`mt-1 text-xs ${upliftTextClass(summary.jobs_window_uplift)}`}>
              Δ {(summary.jobs_window_delta || 0) > 0 ? "+" : ""}
              {(summary.jobs_window_delta || 0).toFixed(0)} · Uplift {formatSignedPercent(summary.jobs_window_uplift)}
            </div>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">成功率</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">
              {formatPercent(summary.base_success_rate)} → {formatPercent(summary.target_success_rate)}
            </div>
            <div className={`mt-1 text-xs ${upliftTextClass(summary.success_rate_uplift)}`}>
              Δ {formatSignedPercent(summary.success_rate_delta)} · Uplift {formatSignedPercent(summary.success_rate_uplift)}
            </div>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">耗时 P50</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">
              {formatSeconds(summary.base_duration_p50_sec)} → {formatSeconds(summary.target_duration_p50_sec)}
            </div>
            <div className={`mt-1 text-xs ${upliftTextClass(summary.duration_p50_uplift, { inverse: true })}`}>
              Δ {formatSignedSeconds(summary.duration_p50_delta)} · Uplift {formatSignedPercent(summary.duration_p50_uplift)}
            </div>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">耗时 P95</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">
              {formatSeconds(summary.base_duration_p95_sec)} → {formatSeconds(summary.target_duration_p95_sec)}
            </div>
            <div className={`mt-1 text-xs ${upliftTextClass(summary.duration_p95_uplift, { inverse: true })}`}>
              Δ {formatSignedSeconds(summary.duration_p95_delta)} · Uplift {formatSignedPercent(summary.duration_p95_uplift)}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-bold text-emerald-700">GIF 五维评分（结果级评测）</div>
          <div className="text-xs text-slate-500">样本 {gifEvaluationOverview?.samples || 0}</div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <div className="text-[11px] text-slate-500">情绪价值 Emotion</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{formatScore(gifEvaluationOverview?.avg_emotion_score)}</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <div className="text-[11px] text-slate-500">清晰质量 Clarity</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{formatScore(gifEvaluationOverview?.avg_clarity_score)}</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <div className="text-[11px] text-slate-500">动态完整 Motion</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{formatScore(gifEvaluationOverview?.avg_motion_score)}</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <div className="text-[11px] text-slate-500">循环质量 Loop</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{formatScore(gifEvaluationOverview?.avg_loop_score)}</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <div className="text-[11px] text-slate-500">传播效率 Efficiency</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{formatScore(gifEvaluationOverview?.avg_efficiency_score)}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-[11px] text-slate-500">综合得分 Overall</div>
            <div className="mt-1 text-sm font-bold text-emerald-700">{formatScore(gifEvaluationOverview?.avg_overall_score)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-bold text-amber-700">人工评分对齐度（Manual vs Auto）</div>
          <div className="text-xs text-slate-500">
            样本 {gifManualScoreOverview?.samples || 0} · 匹配评测 {gifManualScoreOverview?.matched_evaluations || 0}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
            <div className="text-[11px] text-slate-500">匹配率</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{formatPercent(gifManualScoreOverview?.matched_rate)}</div>
            <div className="mt-1 text-[11px] text-slate-500">
              output_id: {gifManualScoreOverview?.with_output_id || 0} · pass_rate {formatPercent(gifManualScoreOverview?.pass_rate)}
            </div>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
            <div className="text-[11px] text-slate-500">Overall MAE</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{formatScore(gifManualScoreOverview?.mae_overall)}</div>
            <div className={`mt-1 text-[11px] ${upliftTextClass(-(gifManualScoreOverview?.avg_overall_delta || 0), { inverse: true })}`}>
              平均偏差 Δ {formatSignedScore(gifManualScoreOverview?.avg_overall_delta)}
            </div>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
            <div className="text-[11px] text-slate-500">人工/自动 Overall 均值</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">
              {formatScore(gifManualScoreOverview?.avg_manual_overall)} / {formatScore(gifManualScoreOverview?.avg_auto_overall)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">top_pick_rate {formatPercent(gifManualScoreOverview?.top_pick_rate)}</div>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
            <div className="text-[11px] text-slate-500">分维 MAE</div>
            <div className="mt-1 text-[11px] text-slate-700">
              Emotion {formatScore(gifManualScoreOverview?.mae_emotion)} · Clarity {formatScore(gifManualScoreOverview?.mae_clarity)}
            </div>
            <div className="mt-1 text-[11px] text-slate-700">
              Motion {formatScore(gifManualScoreOverview?.mae_motion)} · Loop {formatScore(gifManualScoreOverview?.mae_loop)}
            </div>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-amber-100">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-amber-50 text-amber-700">
              <tr>
                <th className="px-3 py-2">样本ID</th>
                <th className="px-3 py-2">版本/评审</th>
                <th className="px-3 py-2">输出</th>
                <th className="px-3 py-2">Manual/Auto Overall</th>
                <th className="px-3 py-2">Δ Overall</th>
                <th className="px-3 py-2">Δ Loop / Δ Clarity</th>
                <th className="px-3 py-2">标记</th>
                <th className="px-3 py-2">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-50 text-slate-700">
              {gifManualDiffSamples.map((item, idx) => (
                <tr key={`${item.sample_id || "sample"}-${item.output_id || 0}-${idx}`}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {resolvePreviewHref(item.preview_url, item.object_key) ? (
                        <a
                          href={resolvePreviewHref(item.preview_url, item.object_key)}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0"
                        >
                          <BaselinePreviewImage
                            previewURL={item.preview_url}
                            objectKey={item.object_key}
                            alt="manual-diff"
                            className="h-8 w-8 rounded object-cover"
                          />
                        </a>
                      ) : null}
                      <span>{item.sample_id || "-"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {item.baseline_version || "-"} · {item.review_round || "-"} · {item.reviewer || "-"}
                  </td>
                  <td className="px-3 py-2">
                    任务 #{item.job_id || 0} / 输出 #{item.output_id || 0}
                  </td>
                  <td className="px-3 py-2">
                    {formatScore(item.manual_overall_score)} / {formatScore(item.auto_overall_score)}
                  </td>
                  <td className={`px-3 py-2 ${upliftTextClass(item.overall_score_delta)}`}>
                    {formatSignedScore(item.overall_score_delta)}（|Δ| {formatScore(item.abs_overall_score_diff)}）
                  </td>
                  <td className="px-3 py-2">
                    {formatSignedScore(item.loop_score_delta)} / {formatSignedScore(item.clarity_score_delta)}
                  </td>
                  <td className="px-3 py-2">
                    {item.is_top_pick ? "top_pick" : "-"} · {item.is_pass ? "pass" : "reject"}
                    {item.reject_reason ? ` · ${item.reject_reason}` : ""}
                  </td>
                  <td className="px-3 py-2">{formatTime(item.reviewed_at)}</td>
                </tr>
              ))}
              {!gifManualDiffSamples.length ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                    当前窗口暂无人工评分对齐样本（请先导入 manual_scoring 数据）
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
        <div className="text-sm font-bold text-sky-700">参数差异解释（自动）</div>
        <div className="mt-2 space-y-1 text-xs text-slate-600">
          {summary ? (
            <div>
              · 成功率变化：{formatPercent(summary.base_success_rate)} → {formatPercent(summary.target_success_rate)}
              （Δ {formatSignedPercent(summary.success_rate_delta)}，Uplift {formatSignedPercent(summary.success_rate_uplift)}）
            </div>
          ) : null}
          {qualityDeltaLatest ? (
            <>
              <div>
                · 基线快照（{latestBaseline?.baseline_date || "-"} vs {previousBaseline?.baseline_date || "-"}）：
                Overall {formatSignedScore(qualityDeltaLatest.overall)}，Loop {formatSignedScore(qualityDeltaLatest.loop)}
              </div>
              <div>
                · 质量维度变化：Clarity {formatSignedScore(qualityDeltaLatest.clarity)}，Efficiency{" "}
                {formatSignedScore(qualityDeltaLatest.efficiency)}
              </div>
            </>
          ) : (
            <div>· 基线快照不足 2 天，暂无法给出连续参数差异解释。</div>
          )}
          {rolloutRecommendation?.reason ? <div>· rollout 建议解释：{rolloutRecommendation.reason}</div> : null}
        </div>
      </div>

      <div className="rounded-3xl border border-fuchsia-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-bold text-fuchsia-700">GIF baseline 样例对比（Top vs Low）</div>
          <div className="text-xs text-slate-500">用于人工复核模型评分与窗口选择</div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/20 p-3">
            <div className="mb-2 text-xs font-semibold text-emerald-700">Top 样例（高分）</div>
            <div className="space-y-2">
              {gifTopSamples.map((item) => (
                <div key={`top-${item.output_id || 0}-${item.job_id || 0}`} className="rounded-xl border border-emerald-100 bg-white p-2">
                  <div className="flex gap-3">
                    {resolvePreviewHref(item.preview_url, item.object_key) ? (
                      <a
                        href={resolvePreviewHref(item.preview_url, item.object_key)}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0"
                      >
                        <BaselinePreviewImage
                          previewURL={item.preview_url}
                          objectKey={item.object_key}
                          alt="top-sample"
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      </a>
                    ) : null}
                    <div className="min-w-0 flex-1 text-[11px] text-slate-600">
                      <div className="font-semibold text-slate-700">
                        任务 #{item.job_id || 0} · 输出 #{item.output_id || 0}
                      </div>
                      <div>Overall {formatScore(item.overall_score)} · Loop {formatScore(item.loop_score)}</div>
                      <div>Clarity {formatScore(item.clarity_score)} · Efficiency {formatScore(item.efficiency_score)}</div>
                      <div>窗口 {formatWindowRangeMs(item.window_start_ms, item.window_end_ms)} · {formatTime(item.created_at)}</div>
                      <div className="truncate">原因：{item.candidate_reason || "-"}</div>
                    </div>
                  </div>
                </div>
              ))}
              {!gifTopSamples.length ? <div className="text-xs text-slate-400">暂无高分样例</div> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/20 p-3">
            <div className="mb-2 text-xs font-semibold text-rose-700">Low 样例（低分）</div>
            <div className="space-y-2">
              {gifLowSamples.map((item) => (
                <div key={`low-${item.output_id || 0}-${item.job_id || 0}`} className="rounded-xl border border-rose-100 bg-white p-2">
                  <div className="flex gap-3">
                    {resolvePreviewHref(item.preview_url, item.object_key) ? (
                      <a
                        href={resolvePreviewHref(item.preview_url, item.object_key)}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0"
                      >
                        <BaselinePreviewImage
                          previewURL={item.preview_url}
                          objectKey={item.object_key}
                          alt="low-sample"
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      </a>
                    ) : null}
                    <div className="min-w-0 flex-1 text-[11px] text-slate-600">
                      <div className="font-semibold text-slate-700">
                        任务 #{item.job_id || 0} · 输出 #{item.output_id || 0}
                      </div>
                      <div>Overall {formatScore(item.overall_score)} · Loop {formatScore(item.loop_score)}</div>
                      <div>Clarity {formatScore(item.clarity_score)} · Efficiency {formatScore(item.efficiency_score)}</div>
                      <div>窗口 {formatWindowRangeMs(item.window_start_ms, item.window_end_ms)} · {formatTime(item.created_at)}</div>
                      <div className="truncate">原因：{item.candidate_reason || "-"}</div>
                    </div>
                  </div>
                </div>
              ))}
              {!gifLowSamples.length ? <div className="text-xs text-slate-400">暂无低分样例</div> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-indigo-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-bold text-indigo-700">视觉对比资产卡（可回归复用）</div>
          <div className="text-xs text-slate-500">
            对照窗口 {formatWindowLabel(baseWindow)} · 目标窗口 {formatWindowLabel(targetWindow)} · 可对比 {visualComparePairs.length} 对
          </div>
        </div>
        <div className="space-y-3">
          {visualComparePairs.map((pair, idx) => {
            const top = pair.top;
            const low = pair.low;
            const comparable = Boolean(top && low);
            const overallDelta = comparable ? (top?.overall_score || 0) - (low?.overall_score || 0) : undefined;
            const loopDelta = comparable ? (top?.loop_score || 0) - (low?.loop_score || 0) : undefined;
            const clarityDelta = comparable ? (top?.clarity_score || 0) - (low?.clarity_score || 0) : undefined;
            const efficiencyDelta = comparable ? (top?.efficiency_score || 0) - (low?.efficiency_score || 0) : undefined;
            const sizeDelta = comparable ? (top?.size_bytes || 0) - (low?.size_bytes || 0) : undefined;
            return (
              <div key={pair.id} className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-3">
                <div className="mb-2 text-xs font-semibold text-indigo-700">对比 #{idx + 1}</div>
                <div className="grid gap-3 xl:grid-cols-[1fr_280px_1fr]">
                  <div className="rounded-xl border border-emerald-100 bg-white p-2">
                    <div className="mb-1 text-[11px] font-semibold text-emerald-700">Top 样例</div>
                    {top ? (
                      <div className="flex gap-2">
                        {resolvePreviewHref(top.preview_url, top.object_key) ? (
                          <a
                            href={resolvePreviewHref(top.preview_url, top.object_key)}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0"
                          >
                            <BaselinePreviewImage
                              previewURL={top.preview_url}
                              objectKey={top.object_key}
                              alt="compare-top"
                              className="h-14 w-14 rounded-lg object-cover"
                            />
                          </a>
                        ) : null}
                        <div className="min-w-0 text-[11px] text-slate-600">
                          <div className="font-semibold text-slate-700">
                            任务 #{top.job_id || 0} · 输出 #{top.output_id || 0}
                          </div>
                          <div>Overall {formatScore(top.overall_score)} · Loop {formatScore(top.loop_score)}</div>
                          <div>Clarity {formatScore(top.clarity_score)} · Eff {formatScore(top.efficiency_score)}</div>
                          <div>窗口 {formatWindowRangeMs(top.window_start_ms, top.window_end_ms)}</div>
                          <div>时长 {formatDurationMs(top.duration_ms)} · 体积 {formatBytes(top.size_bytes)}</div>
                          <div className="truncate">原因：{top.candidate_reason || "-"}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400">暂无 Top 样例</div>
                    )}
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-white p-2 text-[11px] text-slate-600">
                    <div className="mb-1 font-semibold text-indigo-700">差异解释</div>
                    <div className={comparable ? upliftTextClass(overallDelta) : "text-slate-500"}>
                      Overall Δ {comparable ? formatSignedScore(overallDelta) : "-"}
                    </div>
                    <div className={comparable ? upliftTextClass(loopDelta) : "text-slate-500"}>
                      Loop Δ {comparable ? formatSignedScore(loopDelta) : "-"}
                    </div>
                    <div className={comparable ? upliftTextClass(clarityDelta) : "text-slate-500"}>
                      Clarity Δ {comparable ? formatSignedScore(clarityDelta) : "-"}
                    </div>
                    <div className={comparable ? upliftTextClass(efficiencyDelta) : "text-slate-500"}>
                      Efficiency Δ {comparable ? formatSignedScore(efficiencyDelta) : "-"}
                    </div>
                    <div className={comparable ? upliftTextClass(sizeDelta, { inverse: true }) : "text-slate-500"}>
                      体积 Δ {comparable ? formatSignedBytes(sizeDelta) : "-"}
                    </div>
                    <div className="mt-1 text-slate-500">
                      Top reason：{top?.candidate_reason || "-"} / Low reason：{low?.candidate_reason || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-rose-100 bg-white p-2">
                    <div className="mb-1 text-[11px] font-semibold text-rose-700">Low 样例</div>
                    {low ? (
                      <div className="flex gap-2">
                        {resolvePreviewHref(low.preview_url, low.object_key) ? (
                          <a
                            href={resolvePreviewHref(low.preview_url, low.object_key)}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0"
                          >
                            <BaselinePreviewImage
                              previewURL={low.preview_url}
                              objectKey={low.object_key}
                              alt="compare-low"
                              className="h-14 w-14 rounded-lg object-cover"
                            />
                          </a>
                        ) : null}
                        <div className="min-w-0 text-[11px] text-slate-600">
                          <div className="font-semibold text-slate-700">
                            任务 #{low.job_id || 0} · 输出 #{low.output_id || 0}
                          </div>
                          <div>Overall {formatScore(low.overall_score)} · Loop {formatScore(low.loop_score)}</div>
                          <div>Clarity {formatScore(low.clarity_score)} · Eff {formatScore(low.efficiency_score)}</div>
                          <div>窗口 {formatWindowRangeMs(low.window_start_ms, low.window_end_ms)}</div>
                          <div>时长 {formatDurationMs(low.duration_ms)} · 体积 {formatBytes(low.size_bytes)}</div>
                          <div className="truncate">原因：{low.candidate_reason || "-"}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400">暂无 Low 样例</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!visualComparePairs.length ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
              暂无可复用视觉对比资产，请先产出 Top/Low 样例数据
            </div>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
        <div className="border-b border-sky-100 bg-sky-50/60 px-4 py-2 text-sm font-semibold text-sky-700">GIF 日基线快照</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-sky-50 text-sky-700">
              <tr>
                <th className="px-3 py-2">日期</th>
                <th className="px-3 py-2">样本任务</th>
                <th className="px-3 py-2">完成率 / 失败率</th>
                <th className="px-3 py-2">Emotion</th>
                <th className="px-3 py-2">Clarity</th>
                <th className="px-3 py-2">Motion</th>
                <th className="px-3 py-2">Loop</th>
                <th className="px-3 py-2">Efficiency</th>
                <th className="px-3 py-2">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50 text-slate-700">
              {gifBaselineSnapshots.map((item) => (
                <tr key={`${item.baseline_date}-${item.window_label}-${item.scope}`}>
                  <td className="px-3 py-2">{item.baseline_date || "-"}</td>
                  <td className="px-3 py-2">
                    {item.sample_jobs || 0}（done {item.done_jobs || 0} / failed {item.failed_jobs || 0}）
                  </td>
                  <td className="px-3 py-2">
                    {formatPercent(item.done_rate)} / {formatPercent(item.failed_rate)}
                  </td>
                  <td className="px-3 py-2">{formatScore(item.avg_emotion_score)}</td>
                  <td className="px-3 py-2">{formatScore(item.avg_clarity_score)}</td>
                  <td className="px-3 py-2">{formatScore(item.avg_motion_score)}</td>
                  <td className="px-3 py-2">{formatScore(item.avg_loop_score)}</td>
                  <td className="px-3 py-2">{formatScore(item.avg_efficiency_score)}</td>
                  <td className="px-3 py-2 font-semibold text-sky-700">{formatScore(item.avg_overall_score)}</td>
                </tr>
              ))}
              {!gifBaselineSnapshots.length ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
                    暂无 GIF 日基线快照（请先运行新迁移并产生任务样本）
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-xs">
            <thead className="bg-violet-50 text-violet-700">
              <tr>
                <th className="px-3 py-2">格式</th>
                <th className="px-3 py-2">目标请求 / 成功</th>
                <th className="px-3 py-2">成功率（对照→目标）</th>
                <th className="px-3 py-2">成功率 Uplift</th>
                <th className="px-3 py-2">平均体积（对照→目标）</th>
                <th className="px-3 py-2">体积 Δ / Uplift</th>
                <th className="px-3 py-2">P50（对照→目标）</th>
                <th className="px-3 py-2">P95（对照→目标）</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50 text-slate-700">
              {formats.map((item) => (
                <tr key={item.format || "unknown"}>
                  <td className="px-3 py-2 font-semibold uppercase">{item.format || "-"}</td>
                  <td className="px-3 py-2">
                    {item.target_requested_jobs || 0} / {item.target_generated_jobs || 0}
                  </td>
                  <td className="px-3 py-2">
                    {formatPercent(item.base_success_rate)} → {formatPercent(item.target_success_rate)}
                  </td>
                  <td className={`px-3 py-2 ${upliftTextClass(item.success_rate_uplift)}`}>
                    {formatSignedPercent(item.success_rate_uplift)}
                  </td>
                  <td className="px-3 py-2">
                    {formatBytes(item.base_avg_artifact_size_bytes)} → {formatBytes(item.target_avg_artifact_size_bytes)}
                  </td>
                  <td className={`px-3 py-2 ${upliftTextClass(item.avg_artifact_size_uplift, { inverse: true })}`}>
                    {formatSignedBytes(item.avg_artifact_size_delta)} / {formatSignedPercent(item.avg_artifact_size_uplift)}
                  </td>
                  <td className="px-3 py-2">
                    {formatSeconds(item.base_duration_p50_sec)} → {formatSeconds(item.target_duration_p50_sec)}
                    <span className={`ml-1 ${upliftTextClass(item.duration_p50_uplift, { inverse: true })}`}>
                      ({formatSignedPercent(item.duration_p50_uplift)})
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {formatSeconds(item.base_duration_p95_sec)} → {formatSeconds(item.target_duration_p95_sec)}
                    <span className={`ml-1 ${upliftTextClass(item.duration_p95_uplift, { inverse: true })}`}>
                      ({formatSignedPercent(item.duration_p95_uplift)})
                    </span>
                  </td>
                </tr>
              ))}
              {!formats.length && !loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                    暂无样本基线Diff数据
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
