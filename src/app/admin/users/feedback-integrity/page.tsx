"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type FeedbackIntegrityOverview = {
  samples?: number;
  with_output_id?: number;
  missing_output_id?: number;
  resolved_output?: number;
  orphan_output?: number;
  job_mismatch?: number;
  top_pick_multi_hit_users?: number;
  output_coverage_rate?: number;
  output_resolved_rate?: number;
  output_job_consistency_rate?: number;
};

type FeedbackIntegrityAlertThresholds = {
  feedback_integrity_output_coverage_rate_warn?: number;
  feedback_integrity_output_coverage_rate_critical?: number;
  feedback_integrity_output_resolved_rate_warn?: number;
  feedback_integrity_output_resolved_rate_critical?: number;
  feedback_integrity_output_job_consistency_rate_warn?: number;
  feedback_integrity_output_job_consistency_rate_critical?: number;
  feedback_integrity_top_pick_conflict_users_warn?: number;
  feedback_integrity_top_pick_conflict_users_critical?: number;
};

type FeedbackIntegrityAlert = {
  level?: string;
  code?: string;
  message?: string;
};

type FeedbackIntegrityHealthTrendPoint = {
  bucket?: string;
  samples?: number;
  health?: string;
  alert_count?: number;
  output_coverage_rate?: number;
  output_resolved_rate?: number;
  output_job_consistency_rate?: number;
  top_pick_multi_hit_users?: number;
};

type FeedbackIntegrityDelta = {
  has_previous_data?: boolean;
  previous_window_start?: string;
  previous_window_end?: string;
  previous_health?: string;
  current_health?: string;
  previous_samples?: number;
  current_samples?: number;
  samples_delta?: number;
  previous_alert_count?: number;
  current_alert_count?: number;
  alert_count_delta?: number;
  output_coverage_rate_delta?: number;
  output_resolved_rate_delta?: number;
  output_job_consistency_rate_delta?: number;
  top_pick_multi_hit_users_delta?: number;
};

type FeedbackIntegrityStreaks = {
  consecutive_red_days?: number;
  consecutive_non_green_days?: number;
  consecutive_green_days?: number;
  recent_7d_red_days?: number;
  recent_7d_non_green_days?: number;
  last_non_green_bucket?: string;
  last_red_bucket?: string;
};

type FeedbackIntegrityEscalation = {
  required?: boolean;
  level?: string;
  reason?: string;
  triggered_rules?: string[];
};

type FeedbackIntegrityEscalationTrendPoint = {
  bucket?: string;
  health?: string;
  recovery_status?: string;
  alert_count?: number;
  alert_count_delta?: number;
  top_pick_multi_hit_users?: number;
  top_pick_multi_hit_users_delta?: number;
  escalation_level?: string;
  escalation_required?: boolean;
  escalation_reason?: string;
  triggered_rules?: string[];
};

type FeedbackIntegrityEscalationStats = {
  total_days?: number;
  required_days?: number;
  oncall_days?: number;
  watch_days?: number;
  notice_days?: number;
  none_days?: number;
  latest_bucket?: string;
  latest_level?: string;
  latest_required?: boolean;
  latest_reason?: string;
};

type FeedbackIntegrityEscalationIncident = {
  bucket?: string;
  escalation_level?: string;
  escalation_required?: boolean;
  escalation_reason?: string;
  triggered_rules?: string[];
  alert_count?: number;
  alert_count_delta?: number;
  top_pick_multi_hit_users?: number;
  top_pick_multi_hit_users_delta?: number;
  recovery_status?: string;
};

type FeedbackIntegrityAlertCodeStat = {
  code?: string;
  days_hit?: number;
  latest_level?: string;
  latest_bucket?: string;
};

type FeedbackIntegrityRecommendation = {
  category?: string;
  severity?: string;
  title?: string;
  message?: string;
  suggested_quick?: string;
  suggested_action?: string;
  alert_codes?: string[];
};

type FeedbackLearningChain = {
  learning_mode?: string;
  legacy_feedback_fallback_enabled?: boolean;
  legacy_eval_backfill_candidates?: number;
};

type FeedbackIntegrityOverviewResponse = {
  window?: string;
  window_start?: string;
  window_end?: string;
  filter_user_id?: number;
  filter_format?: string;
  filter_guard_reason?: string;
  feedback_learning_chain?: FeedbackLearningChain;
  feedback_integrity_overview?: FeedbackIntegrityOverview;
  feedback_integrity_alert_thresholds?: FeedbackIntegrityAlertThresholds;
  feedback_integrity_health?: string;
  feedback_integrity_alerts?: FeedbackIntegrityAlert[];
  feedback_integrity_health_trend?: FeedbackIntegrityHealthTrendPoint[];
  feedback_integrity_alert_code_stats?: FeedbackIntegrityAlertCodeStat[];
  feedback_integrity_delta?: FeedbackIntegrityDelta;
  feedback_integrity_streaks?: FeedbackIntegrityStreaks;
  feedback_integrity_escalation?: FeedbackIntegrityEscalation;
  feedback_integrity_escalation_trend?: FeedbackIntegrityEscalationTrendPoint[];
  feedback_integrity_escalation_stats?: FeedbackIntegrityEscalationStats;
  feedback_integrity_escalation_incidents?: FeedbackIntegrityEscalationIncident[];
  feedback_integrity_recovery_status?: string;
  feedback_integrity_recovered?: boolean;
  feedback_integrity_previous_health?: string;
  feedback_integrity_recommendations?: FeedbackIntegrityRecommendation[];
  feedback_integrity_anomaly_jobs_window?: number;
  feedback_integrity_top_pick_conflict_jobs_window?: number;
  feedback_action_stats?: FeedbackActionStat[];
  feedback_top_scene_tags?: FeedbackSceneStat[];
  feedback_trend?: FeedbackTrendPoint[];
  feedback_negative_guard_overview?: FeedbackNegativeGuardOverview;
  feedback_negative_guard_reasons?: FeedbackNegativeGuardReasonStat[];
};

type FeedbackSceneStat = {
  scene_tag?: string;
  signals?: number;
};

type FeedbackActionStat = {
  action?: string;
  count?: number;
  ratio?: number;
  weight_sum?: number;
};

type FeedbackTrendPoint = {
  bucket?: string;
  total?: number;
  positive?: number;
  neutral?: number;
  negative?: number;
  top_pick?: number;
};

type FeedbackNegativeGuardOverview = {
  samples?: number;
  treatment_jobs?: number;
  guard_enabled_jobs?: number;
  guard_reason_hit_jobs?: number;
  selection_shift_jobs?: number;
  blocked_reason_jobs?: number;
  guard_hit_rate?: number;
  selection_shift_rate?: number;
  blocked_reason_rate?: number;
  avg_negative_signals?: number;
  avg_positive_signals?: number;
};

type FeedbackNegativeGuardReasonStat = {
  reason?: string;
  jobs?: number;
  blocked_jobs?: number;
  avg_weight?: number;
};

type FeedbackIntegrityDrilldownRow = {
  job_id: number;
  user_id: number;
  title?: string;
  status?: string;
  stage?: string;
  anomaly_count?: number;
  top_pick_conflict_users?: number;
  top_pick_conflict_actions?: number;
  latest_feedback_at?: string;
};

type FeedbackIntegrityDrilldownResponse = {
  window?: string;
  window_start?: string;
  window_end?: string;
  anomaly_jobs?: FeedbackIntegrityDrilldownRow[];
  top_pick_conflict_jobs?: FeedbackIntegrityDrilldownRow[];
};

type Notice = {
  level: "success" | "error";
  message: string;
};

const FORMAT_OPTIONS = ["all", "gif", "jpg", "png", "webp", "mp4", "live"] as const;
const WINDOW_OPTIONS = ["24h", "7d", "30d"] as const;

function normalizeWindow(value?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (WINDOW_OPTIONS.includes(normalized as (typeof WINDOW_OPTIONS)[number])) {
    return normalized;
  }
  return "24h";
}

function normalizeFormat(value?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (FORMAT_OPTIONS.includes(normalized as (typeof FORMAT_OPTIONS)[number])) {
    return normalized;
  }
  return "all";
}

function formatPercent(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${(value * 100).toFixed(1)}%`;
}

function formatSignedInt(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${Math.trunc(value)}`;
}

function formatScore(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "-";
  return value.toFixed(2);
}

function formatTime(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN");
}

function formatWindowLabel(value?: string) {
  switch ((value || "").trim().toLowerCase()) {
    case "7d":
      return "7天";
    case "30d":
      return "30天";
    case "24h":
    default:
      return "24小时";
  }
}

function formatFeedbackActionLabel(action?: string) {
  switch ((action || "").trim().toLowerCase()) {
    case "download":
      return "下载";
    case "favorite":
      return "收藏";
    case "share":
      return "分享";
    case "use":
      return "使用";
    case "like":
      return "喜欢";
    case "neutral":
      return "一般";
    case "dislike":
      return "不满意";
    case "top_pick":
      return "最想下载";
    default:
      return action || "-";
  }
}

function formatTrendBucket(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const hour = date.getHours();
  const minute = date.getMinutes();
  if (hour === 0 && minute === 0) {
    return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
  }
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit" });
}

type NegativeGuardAlert = {
  label: string;
  textClass: string;
  panelClass: string;
  hint: string;
};

function resolveNegativeGuardAlert(overview: FeedbackNegativeGuardOverview | null): NegativeGuardAlert {
  if (!overview || (overview.treatment_jobs || 0) <= 0) {
    return {
      label: "数据不足",
      textClass: "text-slate-700",
      panelClass: "border-slate-200 bg-slate-50",
      hint: "当前窗口缺少 treatment 样本，暂不做风险判断。",
    };
  }
  const guardHitRate = overview.guard_hit_rate || 0;
  const blockedReasonRate = overview.blocked_reason_rate || 0;
  const selectionShiftRate = overview.selection_shift_rate || 0;
  const avgNegative = overview.avg_negative_signals || 0;

  if ((avgNegative >= 1.5 && guardHitRate < 0.05) || (blockedReasonRate > 0.75 && selectionShiftRate > 0.85)) {
    return {
      label: "高风险",
      textClass: "text-rose-700",
      panelClass: "border-rose-200 bg-rose-50",
      hint: "负反馈保护异常：命中不足或阻断过强，建议回调 penalty / threshold。",
    };
  }
  if ((avgNegative >= 1.0 && guardHitRate < 0.12) || blockedReasonRate > 0.6) {
    return {
      label: "需关注",
      textClass: "text-amber-700",
      panelClass: "border-amber-200 bg-amber-50",
      hint: "负反馈保护偏离预期，建议观察 24h 后再调参。",
    };
  }
  return {
    label: "健康",
    textClass: "text-emerald-700",
    panelClass: "border-emerald-200 bg-emerald-50",
    hint: "负反馈保护运行稳定。",
  };
}

function normalizeSeverity(value?: string) {
  const level = String(value || "").toLowerCase();
  if (level === "critical" || level === "red") return "critical";
  if (level === "warn" || level === "warning" || level === "yellow") return "warning";
  if (level === "green" || level === "ok") return "normal";
  return "normal";
}

function healthBadgeClass(health?: string) {
  const level = normalizeSeverity(health);
  if (level === "critical") return "bg-rose-600 text-white";
  if (level === "warning") return "bg-amber-500 text-white";
  return "bg-emerald-600 text-white";
}

function healthPanelClass(health?: string) {
  const level = normalizeSeverity(health);
  if (level === "critical") return "border-rose-200 bg-rose-50/40";
  if (level === "warning") return "border-amber-200 bg-amber-50/40";
  return "border-emerald-200 bg-emerald-50/30";
}

async function parseApiError(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    return parsed.message || parsed.error || fallback;
  } catch {
    return text;
  }
}

function resolveDownloadFilename(response: Response, fallback: string) {
  const contentDisposition = response.headers.get("content-disposition") || "";
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) return plainMatch[1];
  return fallback;
}

export default function AdminFeedbackIntegrityPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.toString();
  const initializedFromQueryRef = useRef(false);

  const [windowValue, setWindowValue] = useState("24h");
  const [formatFilter, setFormatFilter] = useState("all");
  const [userID, setUserID] = useState("");
  const [guardReason, setGuardReason] = useState("");

  const [draftWindowValue, setDraftWindowValue] = useState("24h");
  const [draftFormatFilter, setDraftFormatFilter] = useState("all");
  const [draftUserID, setDraftUserID] = useState("");
  const [draftGuardReason, setDraftGuardReason] = useState("");

  const [overview, setOverview] = useState<FeedbackIntegrityOverviewResponse | null>(null);
  const [drilldown, setDrilldown] = useState<FeedbackIntegrityDrilldownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [exportingFeedbackReport, setExportingFeedbackReport] = useState(false);
  const [exportingIntegrity, setExportingIntegrity] = useState(false);
  const [exportingTrend, setExportingTrend] = useState(false);
  const [exportingAnomalies, setExportingAnomalies] = useState(false);
  const [exportingBlocked, setExportingBlocked] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [activeTab, setActiveTab] = useState<"integrity" | "behavior">("integrity");
  const [focusTab, setFocusTab] = useState<"anomaly" | "top_pick">("anomaly");

  const overviewRequestSeqRef = useRef(0);
  const drilldownRequestSeqRef = useRef(0);

  useEffect(() => {
    if (initializedFromQueryRef.current) return;
    const queryWindow = normalizeWindow(searchParams.get("window") || undefined);
    const queryFormat = normalizeFormat(searchParams.get("format") || undefined);
    const queryUserID = (searchParams.get("user_id") || "").trim();
    const queryGuardReason = (searchParams.get("guard_reason") || "").trim().toLowerCase();
    const queryTab = String(searchParams.get("tab") || "").trim().toLowerCase();
    const nextTab = queryTab === "behavior" ? "behavior" : "integrity";

    setWindowValue(queryWindow);
    setFormatFilter(queryFormat);
    setUserID(queryUserID);
    setGuardReason(queryGuardReason);
    setActiveTab(nextTab);

    setDraftWindowValue(queryWindow);
    setDraftFormatFilter(queryFormat);
    setDraftUserID(queryUserID);
    setDraftGuardReason(queryGuardReason);

    initializedFromQueryRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initializedFromQueryRef.current) return;
    const params = new URLSearchParams();
    params.set("window", windowValue);
    if (formatFilter !== "all") params.set("format", formatFilter);
    if (userID.trim()) params.set("user_id", userID.trim());
    if (guardReason.trim()) params.set("guard_reason", guardReason.trim());
    if (activeTab !== "integrity") params.set("tab", activeTab);
    const nextQuery = params.toString();
    if (nextQuery === currentQuery) return;
    const href = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(href, { scroll: false });
  }, [activeTab, currentQuery, formatFilter, guardReason, pathname, router, userID, windowValue]);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams({ window: windowValue });
    if (formatFilter !== "all") params.set("format", formatFilter);
    if (userID.trim()) params.set("user_id", userID.trim());
    if (guardReason.trim()) params.set("guard_reason", guardReason.trim().toLowerCase());
    return params;
  }, [formatFilter, guardReason, userID, windowValue]);

  const loadOverview = useCallback(async () => {
    const requestSeq = overviewRequestSeqRef.current + 1;
    overviewRequestSeqRef.current = requestSeq;
    setLoading(true);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/feedback-integrity/overview?${buildFilterParams().toString()}`
      );
      if (!res.ok) throw new Error(await parseApiError(res, "加载反馈完整性概览失败"));
      const data = (await res.json()) as FeedbackIntegrityOverviewResponse;
      if (requestSeq !== overviewRequestSeqRef.current) return;
      setOverview(data);
    } catch (err: unknown) {
      if (requestSeq !== overviewRequestSeqRef.current) return;
      const message = err instanceof Error ? err.message : "加载反馈完整性概览失败";
      setNotice({ level: "error", message });
      setOverview(null);
    } finally {
      if (requestSeq === overviewRequestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [buildFilterParams]);

  const loadDrilldown = useCallback(async () => {
    const requestSeq = drilldownRequestSeqRef.current + 1;
    drilldownRequestSeqRef.current = requestSeq;
    setDrilldownLoading(true);
    try {
      const params = buildFilterParams();
      params.set("limit", "20");
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/feedback-integrity/drilldown?${params.toString()}`
      );
      if (!res.ok) throw new Error(await parseApiError(res, "加载异常下钻失败"));
      const data = (await res.json()) as FeedbackIntegrityDrilldownResponse;
      if (requestSeq !== drilldownRequestSeqRef.current) return;
      setDrilldown(data);
    } catch (err: unknown) {
      if (requestSeq !== drilldownRequestSeqRef.current) return;
      const message = err instanceof Error ? err.message : "加载异常下钻失败";
      setNotice({ level: "error", message });
      setDrilldown(null);
    } finally {
      if (requestSeq === drilldownRequestSeqRef.current) {
        setDrilldownLoading(false);
      }
    }
  }, [buildFilterParams]);

  useEffect(() => {
    void loadOverview();
    void loadDrilldown();
  }, [loadDrilldown, loadOverview]);

  const applyFilters = useCallback(() => {
    const nextWindow = normalizeWindow(draftWindowValue || "24h");
    const nextFormat = normalizeFormat(draftFormatFilter || "all");
    const nextUserID = draftUserID.trim();
    const nextGuardReason = draftGuardReason.trim().toLowerCase();
    const unchanged =
      nextWindow === windowValue &&
      nextFormat === formatFilter &&
      nextUserID === userID &&
      nextGuardReason === guardReason;

    setWindowValue(nextWindow);
    setFormatFilter(nextFormat);
    setUserID(nextUserID);
    setGuardReason(nextGuardReason);

    if (unchanged) {
      void loadOverview();
      void loadDrilldown();
    }
  }, [draftFormatFilter, draftGuardReason, draftUserID, draftWindowValue, formatFilter, guardReason, loadDrilldown, loadOverview, userID, windowValue]);

  const resetFilters = useCallback(() => {
    setDraftWindowValue("24h");
    setDraftFormatFilter("all");
    setDraftUserID("");
    setDraftGuardReason("");
    setWindowValue("24h");
    setFormatFilter("all");
    setUserID("");
    setGuardReason("");
  }, []);

  const downloadCSV = useCallback(
    async (url: string, fallbackFileName: string) => {
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error(await parseApiError(res, "导出失败"));
      const blob = await res.blob();
      const objectURL = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectURL;
      link.download = resolveDownloadFilename(res, fallbackFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectURL);
      return link.download;
    },
    []
  );

  const exportIntegrity = useCallback(async () => {
    setExportingIntegrity(true);
    try {
      const fileName = await downloadCSV(
        `${API_BASE}/api/admin/video-jobs/feedback-integrity.csv?${buildFilterParams().toString()}`,
        `video_jobs_feedback_integrity_${windowValue}.csv`
      );
      setNotice({ level: "success", message: `导出成功：${fileName}` });
    } catch (err: unknown) {
      setNotice({ level: "error", message: err instanceof Error ? err.message : "导出反馈完整性失败" });
    } finally {
      setExportingIntegrity(false);
    }
  }, [buildFilterParams, downloadCSV, windowValue]);

  const exportTrend = useCallback(async () => {
    setExportingTrend(true);
    try {
      const fileName = await downloadCSV(
        `${API_BASE}/api/admin/video-jobs/feedback-integrity-trend.csv?${buildFilterParams().toString()}`,
        `video_jobs_feedback_integrity_trend_${windowValue}.csv`
      );
      setNotice({ level: "success", message: `导出成功：${fileName}` });
    } catch (err: unknown) {
      setNotice({ level: "error", message: err instanceof Error ? err.message : "导出完整性趋势失败" });
    } finally {
      setExportingTrend(false);
    }
  }, [buildFilterParams, downloadCSV, windowValue]);

  const exportFeedbackReport = useCallback(async () => {
    setExportingFeedbackReport(true);
    try {
      const fileName = await downloadCSV(
        `${API_BASE}/api/admin/video-jobs/feedback-report.csv?${buildFilterParams().toString()}`,
        `video_jobs_feedback_report_${windowValue}.csv`
      );
      setNotice({ level: "success", message: `导出成功：${fileName}` });
    } catch (err: unknown) {
      setNotice({ level: "error", message: err instanceof Error ? err.message : "导出反馈报表失败" });
    } finally {
      setExportingFeedbackReport(false);
    }
  }, [buildFilterParams, downloadCSV, windowValue]);

  const exportAnomalies = useCallback(async () => {
    setExportingAnomalies(true);
    try {
      const params = buildFilterParams();
      params.set("limit", "500");
      const fileName = await downloadCSV(
        `${API_BASE}/api/admin/video-jobs/feedback-integrity-anomalies.csv?${params.toString()}`,
        `video_jobs_feedback_integrity_anomalies_${windowValue}.csv`
      );
      setNotice({ level: "success", message: `导出成功：${fileName}` });
    } catch (err: unknown) {
      setNotice({ level: "error", message: err instanceof Error ? err.message : "导出异常明细失败" });
    } finally {
      setExportingAnomalies(false);
    }
  }, [buildFilterParams, downloadCSV, windowValue]);

  const exportBlocked = useCallback(async () => {
    setExportingBlocked(true);
    try {
      const params = buildFilterParams();
      params.set("blocked_only", "1");
      const fileName = await downloadCSV(
        `${API_BASE}/api/admin/video-jobs/feedback-report.csv?${params.toString()}`,
        `video_jobs_feedback_blocked_report_${windowValue}.csv`
      );
      setNotice({ level: "success", message: `导出成功：${fileName}` });
    } catch (err: unknown) {
      setNotice({ level: "error", message: err instanceof Error ? err.message : "导出阻断名单失败" });
    } finally {
      setExportingBlocked(false);
    }
  }, [buildFilterParams, downloadCSV, windowValue]);

  const windowLabel = formatWindowLabel(overview?.window || windowValue);
  const integrity = overview?.feedback_integrity_overview || null;
  const learningChain = overview?.feedback_learning_chain || null;
  const learningModeLabel = useMemo(() => {
    const mode = String(learningChain?.learning_mode || "").trim().toLowerCase();
    if (mode === "legacy_fallback_enabled") return "Legacy 回退已开启";
    return "Strict（output_id/candidate）";
  }, [learningChain?.learning_mode]);
  const alerts = Array.isArray(overview?.feedback_integrity_alerts) ? overview.feedback_integrity_alerts : [];
  const healthTrend = Array.isArray(overview?.feedback_integrity_health_trend)
    ? overview.feedback_integrity_health_trend
    : [];
  const alertCodeStats = Array.isArray(overview?.feedback_integrity_alert_code_stats)
    ? overview.feedback_integrity_alert_code_stats
    : [];
  const recommendations = Array.isArray(overview?.feedback_integrity_recommendations)
    ? overview.feedback_integrity_recommendations
    : [];
  const feedbackActionStats = useMemo(() => {
    const source = Array.isArray(overview?.feedback_action_stats) ? overview.feedback_action_stats : [];
    if (!source.length) return [];
    return source.slice(0, 10);
  }, [overview?.feedback_action_stats]);
  const feedbackTopSceneTags = useMemo(() => {
    const source = Array.isArray(overview?.feedback_top_scene_tags) ? overview.feedback_top_scene_tags : [];
    if (!source.length) return [];
    return source.slice(0, 10);
  }, [overview?.feedback_top_scene_tags]);
  const feedbackTrend = useMemo(() => {
    const source = Array.isArray(overview?.feedback_trend) ? overview.feedback_trend : [];
    if (!source.length) return [];
    const cap = windowValue === "24h" ? 24 : 30;
    return source.slice(-cap);
  }, [overview?.feedback_trend, windowValue]);
  const feedbackTrendMax = useMemo(() => {
    if (!feedbackTrend.length) return 1;
    return feedbackTrend.reduce((acc, item) => Math.max(acc, item.total || 0), 1);
  }, [feedbackTrend]);
  const feedbackNegativeGuardOverview = overview?.feedback_negative_guard_overview || null;
  const feedbackNegativeGuardReasons = useMemo(() => {
    const source = Array.isArray(overview?.feedback_negative_guard_reasons)
      ? overview.feedback_negative_guard_reasons
      : [];
    if (!source.length) return [];
    return source.slice(0, 12);
  }, [overview?.feedback_negative_guard_reasons]);
  const negativeGuardAlert = useMemo(
    () => resolveNegativeGuardAlert(feedbackNegativeGuardOverview),
    [feedbackNegativeGuardOverview]
  );
  const escalationTrend = Array.isArray(overview?.feedback_integrity_escalation_trend)
    ? overview.feedback_integrity_escalation_trend
    : [];
  const escalationIncidents = Array.isArray(overview?.feedback_integrity_escalation_incidents)
    ? overview.feedback_integrity_escalation_incidents
    : [];
  const anomalyJobs = Array.isArray(drilldown?.anomaly_jobs) ? drilldown.anomaly_jobs : [];
  const topPickJobs = Array.isArray(drilldown?.top_pick_conflict_jobs) ? drilldown.top_pick_conflict_jobs : [];

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`窗口:${windowValue}`);
    if (formatFilter !== "all") parts.push(`格式:${formatFilter}`);
    if (userID.trim()) parts.push(`用户#${userID.trim()}`);
    if (guardReason.trim()) parts.push(`原因:${guardReason.trim()}`);
    return parts.join(" · ");
  }, [formatFilter, guardReason, userID, windowValue]);

  const healthText = useMemo(() => {
    const normalized = String(overview?.feedback_integrity_health || "").toLowerCase();
    if (normalized === "red") return "异常";
    if (normalized === "yellow") return "需关注";
    if (normalized === "no_data") return "样本不足";
    return "健康";
  }, [overview?.feedback_integrity_health]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="反馈链路完整性"
        description="视频转图片（全格式）反馈信号治理中心：校验 feedback -> output -> job 映射健康。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/users/video-jobs"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
            >
              返回创作任务
            </Link>
            <button
              type="button"
              onClick={() => {
                void loadOverview();
                void loadDrilldown();
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
              disabled={loading || drilldownLoading}
            >
              {loading || drilldownLoading ? "刷新中..." : "刷新"}
            </button>
          </div>
        }
      />

      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-8">
          <select
            value={draftWindowValue}
            onChange={(e) => setDraftWindowValue(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="24h">窗口：24h</option>
            <option value="7d">窗口：7d</option>
            <option value="30d">窗口：30d</option>
          </select>
          <select
            value={draftFormatFilter}
            onChange={(e) => setDraftFormatFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            {FORMAT_OPTIONS.map((item) => (
              <option key={item} value={item}>
                格式：{item}
              </option>
            ))}
          </select>
          <input
            value={draftUserID}
            onChange={(e) => setDraftUserID(e.target.value)}
            placeholder="用户ID(可选)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <input
            value={draftGuardReason}
            onChange={(e) => setDraftGuardReason(e.target.value)}
            placeholder="负反馈原因(可选)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-500 md:col-span-2"
          />
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            查询
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
          >
            重置
          </button>
        </div>
        <div className="mt-3 text-xs text-slate-500">当前筛选：{filterSummary}</div>
      </div>

      {notice ? (
        <div
          className={`rounded-2xl border px-3 py-2 text-sm ${
            notice.level === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("integrity")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            activeTab === "integrity"
              ? "bg-emerald-600 text-white"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300"
          }`}
        >
          完整性治理
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("behavior")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            activeTab === "behavior"
              ? "bg-rose-600 text-white"
              : "border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300"
          }`}
        >
          行为分析
        </button>
      </div>

      {activeTab === "integrity" ? (
      <>
      <div className={`rounded-3xl border p-4 shadow-sm ${healthPanelClass(overview?.feedback_integrity_health)}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-bold text-slate-800">反馈链路完整性（{windowLabel}）</div>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${healthBadgeClass(overview?.feedback_integrity_health)}`}>
            {healthText}
          </span>
        </div>

        <div className="mb-3 text-[11px] text-slate-500">
          阈值：覆盖率 {formatPercent(overview?.feedback_integrity_alert_thresholds?.feedback_integrity_output_coverage_rate_warn)} /{" "}
          {formatPercent(overview?.feedback_integrity_alert_thresholds?.feedback_integrity_output_coverage_rate_critical)} ·
          可解析率 {formatPercent(overview?.feedback_integrity_alert_thresholds?.feedback_integrity_output_resolved_rate_warn)} /{" "}
          {formatPercent(overview?.feedback_integrity_alert_thresholds?.feedback_integrity_output_resolved_rate_critical)} ·
          job对齐率 {formatPercent(overview?.feedback_integrity_alert_thresholds?.feedback_integrity_output_job_consistency_rate_warn)} /{" "}
          {formatPercent(overview?.feedback_integrity_alert_thresholds?.feedback_integrity_output_job_consistency_rate_critical)} ·
          top_pick冲突 {overview?.feedback_integrity_alert_thresholds?.feedback_integrity_top_pick_conflict_users_warn ?? 1} /{" "}
          {overview?.feedback_integrity_alert_thresholds?.feedback_integrity_top_pick_conflict_users_critical ?? 3}
        </div>

        <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
            恢复：{overview?.feedback_integrity_recovery_status || "no_data"}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
            升级：{overview?.feedback_integrity_escalation?.level || "none"}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
            链路：{learningModeLabel}
          </span>
          {overview?.feedback_integrity_previous_health ? (
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
              上一有效状态：{overview.feedback_integrity_previous_health}
            </span>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-6">
          <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
            <div className="text-[11px] text-slate-500">反馈样本</div>
            <div className="mt-1 text-lg font-black text-slate-800">{integrity?.samples || 0}</div>
            <div className="mt-1 text-[11px] text-slate-500">带 output_id：{integrity?.with_output_id || 0}</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
            <div className="text-[11px] text-slate-500">output 覆盖率</div>
            <div className="mt-1 text-lg font-black text-slate-800">{formatPercent(integrity?.output_coverage_rate)}</div>
            <div className="mt-1 text-[11px] text-slate-500">缺失 output_id：{integrity?.missing_output_id || 0}</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
            <div className="text-[11px] text-slate-500">output 可解析率</div>
            <div className={`mt-1 text-lg font-black ${(integrity?.orphan_output || 0) > 0 ? "text-rose-700" : "text-slate-800"}`}>
              {formatPercent(integrity?.output_resolved_rate)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">孤儿 output：{integrity?.orphan_output || 0}</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
            <div className="text-[11px] text-slate-500">job 对齐率</div>
            <div className={`mt-1 text-lg font-black ${(integrity?.job_mismatch || 0) > 0 ? "text-rose-700" : "text-slate-800"}`}>
              {formatPercent(integrity?.output_job_consistency_rate)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">job_mismatch：{integrity?.job_mismatch || 0}</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
            <div className="text-[11px] text-slate-500">top_pick 冲突用户</div>
            <div
              className={`mt-1 text-lg font-black ${(integrity?.top_pick_multi_hit_users || 0) > 0 ? "text-rose-700" : "text-slate-800"}`}
            >
              {integrity?.top_pick_multi_hit_users || 0}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">期望：0</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
            <div className="text-[11px] text-slate-500">学习链路状态</div>
            <div className="mt-1 text-sm font-bold text-slate-800">{learningModeLabel}</div>
            <div className="mt-1 text-[11px] text-slate-500">
              fallback：{learningChain?.legacy_feedback_fallback_enabled ? "ON" : "OFF"}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              legacy_backfill：{learningChain?.legacy_eval_backfill_candidates || 0}
            </div>
          </div>
        </div>

        {overview?.feedback_integrity_delta?.has_previous_data ? (
          <div className="mt-3 grid gap-2 md:grid-cols-3 text-xs">
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
              样本 Δ {formatSignedInt(overview.feedback_integrity_delta.samples_delta)}
            </div>
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
              告警数 Δ {formatSignedInt(overview.feedback_integrity_delta.alert_count_delta)}
            </div>
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
              top_pick冲突 Δ {formatSignedInt(overview.feedback_integrity_delta.top_pick_multi_hit_users_delta)}
            </div>
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
              覆盖率 Δ {formatSignedPercent(overview.feedback_integrity_delta.output_coverage_rate_delta)}
            </div>
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
              可解析率 Δ {formatSignedPercent(overview.feedback_integrity_delta.output_resolved_rate_delta)}
            </div>
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
              对齐率 Δ {formatSignedPercent(overview.feedback_integrity_delta.output_job_consistency_rate_delta)}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-slate-800">告警与处置建议</div>
          {alerts.length ? (
            <div className="space-y-2">
              {alerts.map((item, idx) => {
                const level = normalizeSeverity(item.level);
                const toneClass =
                  level === "critical"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : level === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-slate-50 text-slate-600";
                return (
                  <div key={`${item.code || "alert"}-${idx}`} className={`rounded-xl border px-3 py-2 text-xs ${toneClass}`}>
                    <span className="font-semibold">{(item.code || "alert").toUpperCase()}</span>
                    <span className="ml-2">{item.message || "-"}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-400">当前窗口无告警。</div>
          )}

          {recommendations.length ? (
            <div className="mt-3 space-y-2">
              {recommendations.map((item, idx) => (
                <div key={`rec-${idx}`} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs">
                  <div className="font-semibold text-slate-700">{item.title || "处置建议"}</div>
                  {item.message ? <div className="mt-1 text-slate-600">{item.message}</div> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-slate-800">趋势与升级</div>

          {healthTrend.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {healthTrend.slice(-8).map((point) => {
                const health = String(point.health || "").toLowerCase();
                const toneClass =
                  health === "red"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : health === "yellow"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : health === "green"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-500";
                return (
                  <div key={`trend-${point.bucket}`} className={`rounded-xl border px-2 py-1.5 text-[11px] ${toneClass}`}>
                    <div className="font-semibold">{point.bucket || "-"}</div>
                    <div className="mt-1">状态：{health || "-"}</div>
                    <div>样本：{point.samples || 0}</div>
                    <div>告警：{point.alert_count || 0}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-400">暂无趋势数据。</div>
          )}

          {overview?.feedback_integrity_streaks ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                连续红色：{overview.feedback_integrity_streaks.consecutive_red_days || 0} 天
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                连续非绿：{overview.feedback_integrity_streaks.consecutive_non_green_days || 0} 天
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-slate-800">告警代码热度</div>
          {alertCodeStats.length ? (
            <div className="space-y-1.5">
              {alertCodeStats.map((item, idx) => (
                <div key={`code-${item.code || idx}`} className="flex items-center justify-between text-xs">
                  <span className="truncate text-slate-600">{item.code || "-"}</span>
                  <span className="font-semibold text-slate-700">
                    {item.days_hit || 0} 天 · 最近 {item.latest_bucket || "-"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400">暂无代码热度。</div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-slate-800">升级统计</div>
          {overview?.feedback_integrity_escalation_stats ? (
            <div className="grid gap-2 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                总天数 {overview.feedback_integrity_escalation_stats.total_days || 0} · 需升级 {overview.feedback_integrity_escalation_stats.required_days || 0}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                oncall {overview.feedback_integrity_escalation_stats.oncall_days || 0} / watch {overview.feedback_integrity_escalation_stats.watch_days || 0}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                notice {overview.feedback_integrity_escalation_stats.notice_days || 0} / none {overview.feedback_integrity_escalation_stats.none_days || 0}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">暂无升级统计。</div>
          )}
        </div>
      </div>

      {(escalationIncidents.length || escalationTrend.length) && (
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-slate-800">升级轨迹</div>
          {escalationIncidents.length ? (
            <div className="mb-3 space-y-2">
              {escalationIncidents.map((item, idx) => (
                <div key={`incident-${item.bucket}-${idx}`} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs">
                  <div className="font-semibold text-slate-700">
                    {item.bucket || "-"} · {(item.escalation_level || "none").toUpperCase()} · {item.escalation_required ? "需升级" : "观察"}
                  </div>
                  <div className="mt-1 text-slate-600">
                    告警 {item.alert_count || 0}（Δ {formatSignedInt(item.alert_count_delta)}） · 冲突 {item.top_pick_multi_hit_users || 0}（Δ {formatSignedInt(item.top_pick_multi_hit_users_delta)}）
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {escalationTrend.length ? (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {escalationTrend.slice(-8).map((item, idx) => (
                <div key={`escalation-trend-${item.bucket}-${idx}`} className="rounded-xl border border-slate-100 bg-slate-50/60 px-2 py-1.5 text-[11px]">
                  <div className="font-semibold text-slate-700">{item.bucket || "-"}</div>
                  <div className="mt-1 text-slate-600">级别：{(item.escalation_level || "none").toUpperCase()}</div>
                  <div className="text-slate-600">恢复：{item.recovery_status || "-"}</div>
                  <div className="text-slate-600">告警：{item.alert_count || 0}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-bold text-slate-800">异常下钻</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFocusTab("anomaly")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                focusTab === "anomaly"
                  ? "bg-rose-700 text-white"
                  : "border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300"
              }`}
            >
              异常任务（{overview?.feedback_integrity_anomaly_jobs_window ?? 0}）
            </button>
            <button
              type="button"
              onClick={() => setFocusTab("top_pick")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                focusTab === "top_pick"
                  ? "bg-amber-600 text-white"
                  : "border border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300"
              }`}
            >
              top_pick冲突（{overview?.feedback_integrity_top_pick_conflict_jobs_window ?? 0}）
            </button>
            <button
              type="button"
              onClick={() => void exportAnomalies()}
              disabled={exportingAnomalies}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-60"
            >
              {exportingAnomalies ? "导出中..." : "导出异常明细CSV"}
            </button>
          </div>
        </div>

        {drilldownLoading ? (
          <div className="text-xs text-slate-400">加载中...</div>
        ) : focusTab === "anomaly" ? (
          anomalyJobs.length ? (
            <div className="space-y-2">
              {anomalyJobs.map((item) => (
                <div key={`anomaly-${item.job_id}`} className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <Link
                      href={`/admin/users/video-jobs?q=${encodeURIComponent(String(item.job_id))}`}
                      className="font-semibold text-rose-700 underline-offset-2 hover:underline"
                    >
                      任务#{item.job_id} · {item.title || "-"}
                    </Link>
                    <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 font-semibold text-rose-700">
                      异常 {item.anomaly_count || 0}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    用户#{item.user_id} · {item.status || "-"} / {item.stage || "-"} · 最近反馈 {formatTime(item.latest_feedback_at)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400">暂无异常任务。</div>
          )
        ) : topPickJobs.length ? (
          <div className="space-y-2">
            {topPickJobs.map((item) => (
              <div key={`top-pick-${item.job_id}`} className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <Link
                    href={`/admin/users/video-jobs?q=${encodeURIComponent(String(item.job_id))}`}
                    className="font-semibold text-amber-700 underline-offset-2 hover:underline"
                  >
                    任务#{item.job_id} · {item.title || "-"}
                  </Link>
                  <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 font-semibold text-amber-700">
                    用户冲突 {item.top_pick_conflict_users || 0}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  用户#{item.user_id} · 冲突动作 {item.top_pick_conflict_actions || 0} · 最近反馈 {formatTime(item.latest_feedback_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400">暂无 top_pick 冲突任务。</div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-bold text-slate-800">报表导出（当前筛选）</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void exportIntegrity()}
            disabled={exportingIntegrity}
            className="rounded-xl border border-pink-200 bg-pink-50 px-4 py-2 text-xs font-semibold text-pink-700 hover:border-pink-300 disabled:opacity-60"
          >
            {exportingIntegrity ? "导出中..." : `导出反馈完整性(${windowValue})`}
          </button>
          <button
            type="button"
            onClick={() => void exportTrend()}
            disabled={exportingTrend}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-300 disabled:opacity-60"
          >
            {exportingTrend ? "导出中..." : `导出完整性趋势(${windowValue})`}
          </button>
          <button
            type="button"
            onClick={() => void exportAnomalies()}
            disabled={exportingAnomalies}
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 hover:border-amber-300 disabled:opacity-60"
          >
            {exportingAnomalies ? "导出中..." : `导出完整性异常(${windowValue})`}
          </button>
          <button
            type="button"
            onClick={() => void exportBlocked()}
            disabled={exportingBlocked}
            className="rounded-xl border border-rose-300 bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-800 hover:border-rose-400 disabled:opacity-60"
          >
            {exportingBlocked ? "导出中..." : `导出原因阻断名单(${windowValue})`}
          </button>
        </div>
      </div>
      </>
      ) : null}

      {activeTab === "behavior" ? (
        <>
          <div className="rounded-3xl border border-rose-100 bg-rose-50/30 p-4 shadow-sm">
            <div className="mb-3 text-sm font-bold text-rose-700">用户反馈动作看板（{windowLabel}）</div>
            <div className="mb-3 text-[11px] text-rose-600">反馈报表导出将套用筛选：{filterSummary}</div>
            <div className="grid gap-3 lg:grid-cols-5">
              <div className="rounded-2xl border border-rose-100 bg-white p-3">
                <div className="mb-2 text-xs font-semibold text-rose-700">动作分布</div>
                <div className="space-y-2">
                  {feedbackActionStats.map((item) => (
                    <div
                      key={`feedback-action-${item.action}`}
                      className="rounded-lg border border-rose-100 bg-rose-50/40 px-2 py-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{formatFeedbackActionLabel(item.action)}</span>
                        <span className="text-slate-500">{item.count || 0}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        占比 {formatPercent(item.ratio)} · 权重和 {formatScore(item.weight_sum)}
                      </div>
                    </div>
                  ))}
                  {!feedbackActionStats.length ? <div className="text-xs text-slate-400">暂无反馈动作数据</div> : null}
                </div>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-white p-3">
                <div className="mb-2 text-xs font-semibold text-rose-700">场景标签 Top</div>
                <div className="space-y-1.5">
                  {feedbackTopSceneTags.map((item) => (
                    <div
                      key={`feedback-scene-tag-${item.scene_tag}`}
                      className="flex items-center justify-between text-xs text-slate-600"
                    >
                      <span className="truncate">{item.scene_tag || "-"}</span>
                      <span className="font-semibold text-slate-700">{item.signals || 0}</span>
                    </div>
                  ))}
                  {!feedbackTopSceneTags.length ? <div className="text-xs text-slate-400">暂无场景标签数据</div> : null}
                </div>
              </div>

              <div className={`rounded-2xl border p-3 ${negativeGuardAlert.panelClass}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-rose-700">负反馈保护（rerank）</div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${negativeGuardAlert.textClass}`}>
                    {negativeGuardAlert.label}
                  </span>
                </div>
                {feedbackNegativeGuardOverview ? (
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>样本/实验</span>
                      <span className="font-semibold text-slate-700">
                        {feedbackNegativeGuardOverview.samples || 0} / {feedbackNegativeGuardOverview.treatment_jobs || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>保护命中率</span>
                      <span className="font-semibold text-slate-700">
                        {formatPercent(feedbackNegativeGuardOverview.guard_hit_rate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>选中位移率</span>
                      <span className="font-semibold text-slate-700">
                        {formatPercent(feedbackNegativeGuardOverview.selection_shift_rate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>原因阻断率</span>
                      <span className="font-semibold text-slate-700">
                        {formatPercent(feedbackNegativeGuardOverview.blocked_reason_rate)}
                      </span>
                    </div>
                    <div className="pt-1 text-[11px] text-slate-500">
                      平均负向 {formatScore(feedbackNegativeGuardOverview.avg_negative_signals)} · 平均正向{" "}
                      {formatScore(feedbackNegativeGuardOverview.avg_positive_signals)}
                    </div>
                    <div className={`pt-1 text-[11px] ${negativeGuardAlert.textClass}`}>{negativeGuardAlert.hint}</div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">暂无负反馈保护数据</div>
                )}
              </div>

              <div className="rounded-2xl border border-rose-100 bg-white p-3">
                <div className="mb-2 text-xs font-semibold text-rose-700">负反馈原因 Top</div>
                <div className="space-y-1.5">
                  {feedbackNegativeGuardReasons.map((item) => (
                    <div
                      key={`feedback-guard-reason-${item.reason}`}
                      className="rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-1.5 text-left"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate font-semibold text-slate-700">{item.reason || "-"}</span>
                        <span className="text-slate-500">{item.jobs || 0}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        阻断 {item.blocked_jobs || 0} · 平均权重 {formatScore(item.avg_weight)}
                      </div>
                    </div>
                  ))}
                  {!feedbackNegativeGuardReasons.length ? (
                    <div className="text-xs text-slate-400">暂无负反馈原因数据</div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-white p-3">
                <div className="mb-2 text-xs font-semibold text-rose-700">最近反馈趋势</div>
                <div className="space-y-1.5">
                  {feedbackTrend.map((item) => {
                    const ratio = feedbackTrendMax > 0 ? (item.total || 0) / feedbackTrendMax : 0;
                    const width = Math.max(item.total ? 8 : 0, Math.round(ratio * 100));
                    return (
                      <div
                        key={`feedback-trend-${item.bucket}`}
                        className="space-y-1 rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{formatTrendBucket(item.bucket)}</span>
                          <span className="font-semibold text-slate-700">{item.total || 0}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-rose-400" style={{ width: `${width}%` }} />
                        </div>
                        <div className="text-[10px] text-slate-500">
                          正向 {item.positive || 0} · 中性 {item.neutral || 0} · 负向 {item.negative || 0} · TopPick{" "}
                          {item.top_pick || 0}
                        </div>
                      </div>
                    );
                  })}
                  {!feedbackTrend.length ? <div className="text-xs text-slate-400">暂无趋势数据</div> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-bold text-slate-800">行为报表导出（当前筛选）</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void exportFeedbackReport()}
                disabled={exportingFeedbackReport}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:border-rose-300 disabled:opacity-60"
              >
                {exportingFeedbackReport ? "导出中..." : `导出反馈报表(${windowValue})`}
              </button>
              <button
                type="button"
                onClick={() => void exportBlocked()}
                disabled={exportingBlocked}
                className="rounded-xl border border-rose-300 bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-800 hover:border-rose-400 disabled:opacity-60"
              >
                {exportingBlocked ? "导出中..." : `导出原因阻断名单(${windowValue})`}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
