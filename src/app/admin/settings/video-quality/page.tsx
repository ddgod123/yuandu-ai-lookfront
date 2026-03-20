"use client";

import { useEffect, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type VideoQualitySetting = {
  min_brightness: number;
  max_brightness: number;
  blur_threshold_factor: number;
  blur_threshold_min: number;
  blur_threshold_max: number;
  duplicate_hamming_threshold: number;
  duplicate_backtrack_frames: number;
  fallback_blur_relax_factor: number;
  fallback_hamming_threshold: number;
  min_keep_base: number;
  min_keep_ratio: number;
  quality_analysis_workers: number;
  upload_concurrency: number;
  gif_profile: string;
  webp_profile: string;
  live_profile: string;
  jpg_profile: string;
  png_profile: string;
  gif_default_fps: number;
  gif_default_max_colors: number;
  gif_dither_mode: string;
  gif_target_size_kb: number;
  gif_gifsicle_enabled: boolean;
  gif_gifsicle_level: number;
  gif_gifsicle_skip_below_kb: number;
  gif_gifsicle_min_gain_ratio: number;
  gif_loop_tune_enabled: boolean;
  gif_loop_tune_min_enable_sec: number;
  gif_loop_tune_min_improvement: number;
  gif_loop_tune_motion_target: number;
  gif_loop_tune_prefer_duration_sec: number;
  gif_candidate_max_outputs: number;
  gif_candidate_long_video_max_outputs: number;
  gif_candidate_ultra_video_max_outputs: number;
  gif_candidate_confidence_threshold: number;
  gif_candidate_dedup_iou_threshold: number;
  webp_target_size_kb: number;
  jpg_target_size_kb: number;
  png_target_size_kb: number;
  still_min_blur_score: number;
  still_min_exposure_score: number;
  still_min_width: number;
  still_min_height: number;
  live_cover_portrait_weight: number;
  live_cover_scene_min_samples: number;
  live_cover_guard_min_total: number;
  live_cover_guard_score_floor: number;
  highlight_feedback_enabled: boolean;
  highlight_feedback_rollout_percent: number;
  highlight_feedback_min_engaged_jobs: number;
  highlight_feedback_min_weighted_signals: number;
  highlight_feedback_boost_scale: number;
  highlight_feedback_position_weight: number;
  highlight_feedback_duration_weight: number;
  highlight_feedback_reason_weight: number;
  highlight_feedback_negative_guard_enabled: boolean;
  highlight_feedback_negative_guard_dominance_threshold: number;
  highlight_feedback_negative_guard_min_weight: number;
  highlight_feedback_negative_guard_penalty_scale: number;
  highlight_feedback_negative_guard_penalty_weight: number;
  gif_health_done_rate_warn: number;
  gif_health_done_rate_critical: number;
  gif_health_failed_rate_warn: number;
  gif_health_failed_rate_critical: number;
  gif_health_path_strict_rate_warn: number;
  gif_health_path_strict_rate_critical: number;
  gif_health_loop_fallback_rate_warn: number;
  gif_health_loop_fallback_rate_critical: number;
  feedback_integrity_output_coverage_rate_warn: number;
  feedback_integrity_output_coverage_rate_critical: number;
  feedback_integrity_output_resolved_rate_warn: number;
  feedback_integrity_output_resolved_rate_critical: number;
  feedback_integrity_output_job_consistency_rate_warn: number;
  feedback_integrity_output_job_consistency_rate_critical: number;
  feedback_integrity_top_pick_conflict_users_warn: number;
  feedback_integrity_top_pick_conflict_users_critical: number;
  ai_director_operator_instruction: string;
  ai_director_operator_instruction_version: string;
  ai_director_operator_enabled: boolean;
  updated_at?: string;
};

type VideoQualityRolloutEffectMetric = {
  jobs_total?: number;
  jobs_done?: number;
  jobs_failed?: number;
  done_rate?: number;
  failed_rate?: number;
  output_samples?: number;
  avg_output_score?: number;
  avg_loop_closure?: number;
  loop_effective_rate?: number;
  loop_fallback_rate?: number;
};

type VideoQualityRolloutEffectDelta = {
  done_rate_delta?: number;
  failed_rate_delta?: number;
  avg_output_score_delta?: number;
  avg_loop_closure_delta?: number;
  loop_effective_rate_delta?: number;
  loop_fallback_rate_delta?: number;
};

type VideoQualityRolloutEffectCard = {
  audit_id?: number;
  admin_id?: number;
  applied_at?: string;
  window?: string;
  from_rollout_percent?: number;
  to_rollout_percent?: number;
  verdict?: string;
  verdict_reason?: string;
  recommendation_state?: string;
  base_metrics?: VideoQualityRolloutEffectMetric;
  target_metrics?: VideoQualityRolloutEffectMetric;
  delta?: VideoQualityRolloutEffectDelta;
};

type VideoQualityRolloutEffectsResponse = {
  items?: VideoQualityRolloutEffectCard[];
};

type VideoJobsOverviewRolloutAudit = {
  id?: number;
  admin_id?: number;
  from_rollout_percent?: number;
  to_rollout_percent?: number;
  window?: string;
  recommendation_state?: string;
  recommendation_reason?: string;
  created_at?: string;
};

type VideoJobsOverviewFallbackResponse = {
  feedback_rollout_audit_logs?: VideoJobsOverviewRolloutAudit[];
};

type PromptTemplateStage = "ai1" | "ai2" | "scoring" | "ai3";
type PromptTemplateLayer = "editable" | "fixed";
type PromptTemplateTabKey = "ai1" | "ai2" | "scoring" | "ai3";
type PromptTemplateFormat = "all" | "gif" | "webp" | "jpg" | "png" | "live";

type AdminVideoAIPromptTemplateItem = {
  id: number;
  format: PromptTemplateFormat | string;
  stage: PromptTemplateStage | string;
  layer: PromptTemplateLayer | string;
  template_text: string;
  template_json_schema?: Record<string, unknown>;
  enabled: boolean;
  version: string;
  is_active: boolean;
  resolved_from?: string;
  updated_at?: string;
};

type AdminVideoAIPromptTemplatesResponse = {
  format?: PromptTemplateFormat | string;
  items?: AdminVideoAIPromptTemplateItem[];
};

type AdminVideoAIPromptTemplateAuditItem = {
  id: number;
  template_id?: number;
  format?: string;
  stage?: string;
  layer?: string;
  action?: string;
  reason?: string;
  operator_admin_id?: number;
  created_at?: string;
};

type AdminVideoAIPromptTemplateAuditsResponse = {
  items?: AdminVideoAIPromptTemplateAuditItem[];
};

type AdminVideoAIPromptTemplateVersionItem = {
  id: number;
  format?: string;
  stage?: string;
  layer?: string;
  version?: string;
  enabled?: boolean;
  is_active?: boolean;
  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;
};

type AdminVideoAIPromptTemplateVersionsResponse = {
  format?: string;
  stage?: string;
  layer?: string;
  resolved_from?: string;
  items?: AdminVideoAIPromptTemplateVersionItem[];
};

const DEFAULT_FORM: VideoQualitySetting = {
  min_brightness: 16,
  max_brightness: 244,
  blur_threshold_factor: 0.22,
  blur_threshold_min: 12,
  blur_threshold_max: 120,
  duplicate_hamming_threshold: 5,
  duplicate_backtrack_frames: 4,
  fallback_blur_relax_factor: 0.5,
  fallback_hamming_threshold: 1,
  min_keep_base: 6,
  min_keep_ratio: 0.35,
  quality_analysis_workers: 4,
  upload_concurrency: 4,
  gif_profile: "clarity",
  webp_profile: "clarity",
  live_profile: "clarity",
  jpg_profile: "clarity",
  png_profile: "clarity",
  gif_default_fps: 12,
  gif_default_max_colors: 128,
  gif_dither_mode: "sierra2_4a",
  gif_target_size_kb: 2048,
  gif_gifsicle_enabled: true,
  gif_gifsicle_level: 2,
  gif_gifsicle_skip_below_kb: 256,
  gif_gifsicle_min_gain_ratio: 0.02,
  gif_loop_tune_enabled: true,
  gif_loop_tune_min_enable_sec: 1.4,
  gif_loop_tune_min_improvement: 0.04,
  gif_loop_tune_motion_target: 0.22,
  gif_loop_tune_prefer_duration_sec: 2.4,
  gif_candidate_max_outputs: 3,
  gif_candidate_long_video_max_outputs: 3,
  gif_candidate_ultra_video_max_outputs: 2,
  gif_candidate_confidence_threshold: 0.35,
  gif_candidate_dedup_iou_threshold: 0.45,
  webp_target_size_kb: 1536,
  jpg_target_size_kb: 512,
  png_target_size_kb: 1024,
  still_min_blur_score: 12,
  still_min_exposure_score: 0.28,
  still_min_width: 0,
  still_min_height: 0,
  live_cover_portrait_weight: 0.04,
  live_cover_scene_min_samples: 5,
  live_cover_guard_min_total: 20,
  live_cover_guard_score_floor: 0.58,
  highlight_feedback_enabled: true,
  highlight_feedback_rollout_percent: 100,
  highlight_feedback_min_engaged_jobs: 2,
  highlight_feedback_min_weighted_signals: 6,
  highlight_feedback_boost_scale: 1,
  highlight_feedback_position_weight: 0.14,
  highlight_feedback_duration_weight: 0.08,
  highlight_feedback_reason_weight: 0.08,
  highlight_feedback_negative_guard_enabled: true,
  highlight_feedback_negative_guard_dominance_threshold: 0.45,
  highlight_feedback_negative_guard_min_weight: 4,
  highlight_feedback_negative_guard_penalty_scale: 0.55,
  highlight_feedback_negative_guard_penalty_weight: 0.9,
  gif_health_done_rate_warn: 0.85,
  gif_health_done_rate_critical: 0.6,
  gif_health_failed_rate_warn: 0.15,
  gif_health_failed_rate_critical: 0.3,
  gif_health_path_strict_rate_warn: 0.9,
  gif_health_path_strict_rate_critical: 0.5,
  gif_health_loop_fallback_rate_warn: 0.4,
  gif_health_loop_fallback_rate_critical: 0.7,
  feedback_integrity_output_coverage_rate_warn: 0.98,
  feedback_integrity_output_coverage_rate_critical: 0.95,
  feedback_integrity_output_resolved_rate_warn: 0.99,
  feedback_integrity_output_resolved_rate_critical: 0.97,
  feedback_integrity_output_job_consistency_rate_warn: 0.999,
  feedback_integrity_output_job_consistency_rate_critical: 0.995,
  feedback_integrity_top_pick_conflict_users_warn: 1,
  feedback_integrity_top_pick_conflict_users_critical: 3,
  ai_director_operator_instruction: "",
  ai_director_operator_instruction_version: "v1",
  ai_director_operator_enabled: true,
};

const DITHER_OPTIONS = [
  { value: "sierra2_4a", label: "sierra2_4a（推荐）" },
  { value: "floyd_steinberg", label: "floyd_steinberg" },
  { value: "bayer", label: "bayer" },
  { value: "none", label: "none（无抖动）" },
];

const PROFILE_OPTIONS = [
  { value: "clarity", label: "清晰优先" },
  { value: "size", label: "体积优先" },
];

const TEMPLATE_FORMAT_OPTIONS: Array<{ value: PromptTemplateFormat; label: string }> = [
  { value: "all", label: "全局默认（all）" },
  { value: "gif", label: "GIF" },
  { value: "webp", label: "WebP" },
  { value: "jpg", label: "JPG" },
  { value: "png", label: "PNG" },
  { value: "live", label: "Live" },
];

const TEMPLATE_TAB_OPTIONS: Array<{ value: PromptTemplateTabKey; label: string; desc: string }> = [
  { value: "ai1", label: "AI1 模板", desc: "可编辑层 + 固定层" },
  { value: "ai2", label: "AI2 模板", desc: "固定层（提名阶段）" },
  { value: "scoring", label: "打分指标系统", desc: "质量参数 + 固定评分说明" },
  { value: "ai3", label: "AI3 模板", desc: "固定层（复审阶段）" },
];

function toNumber(value: string, fallback: number) {
  const raw = value.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function validateBeforeSave(form: VideoQualitySetting): string | null {
  if (!form.ai_director_operator_instruction_version.trim()) {
    return "AI1 运营指令版本不能为空。";
  }
  if (form.ai_director_operator_instruction_version.trim().length > 64) {
    return "AI1 运营指令版本长度不能超过 64 个字符。";
  }
  if (form.ai_director_operator_instruction.trim().length > 4000) {
    return "AI1 运营指令模板不能超过 4000 个字符。";
  }
  if (form.min_brightness <= 0 || form.max_brightness <= 0 || form.min_brightness >= form.max_brightness) {
    return "亮度区间非法：要求 min_brightness > 0 且 min_brightness < max_brightness。";
  }
  if (form.blur_threshold_min <= 0 || form.blur_threshold_max <= 0 || form.blur_threshold_min > form.blur_threshold_max) {
    return "模糊阈值区间非法：要求 blur_threshold_min > 0 且 blur_threshold_min <= blur_threshold_max。";
  }
  if (form.live_cover_guard_min_total < form.live_cover_scene_min_samples) {
    return "Live 护栏阈值非法：live_cover_guard_min_total 必须 >= live_cover_scene_min_samples。";
  }
  if (form.gif_candidate_max_outputs < 1 || form.gif_candidate_max_outputs > 6) {
    return "GIF 最大产出数非法：gif_candidate_max_outputs 必须在 1~6。";
  }
  if (form.gif_candidate_long_video_max_outputs < 1 || form.gif_candidate_long_video_max_outputs > 6) {
    return "长视频最大产出数非法：gif_candidate_long_video_max_outputs 必须在 1~6。";
  }
  if (form.gif_candidate_ultra_video_max_outputs < 1 || form.gif_candidate_ultra_video_max_outputs > 6) {
    return "超长视频最大产出数非法：gif_candidate_ultra_video_max_outputs 必须在 1~6。";
  }
  if (form.gif_candidate_long_video_max_outputs > form.gif_candidate_max_outputs) {
    return "长视频最大产出数非法：必须 <= GIF 最大产出数。";
  }
  if (form.gif_candidate_ultra_video_max_outputs > form.gif_candidate_long_video_max_outputs) {
    return "超长视频最大产出数非法：必须 <= 长视频最大产出数。";
  }
  if (form.gif_gifsicle_level < 1 || form.gif_gifsicle_level > 3) {
    return "GIF Gifsicle 压缩等级非法：gif_gifsicle_level 必须在 1~3。";
  }
  if (form.gif_gifsicle_skip_below_kb < 0 || form.gif_gifsicle_skip_below_kb > 4096) {
    return "GIF Gifsicle 跳过阈值非法：gif_gifsicle_skip_below_kb 必须在 0~4096。";
  }
  if (form.gif_gifsicle_min_gain_ratio < 0 || form.gif_gifsicle_min_gain_ratio > 0.5) {
    return "GIF Gifsicle 最小收益阈值非法：gif_gifsicle_min_gain_ratio 必须在 0~0.5。";
  }
  if (
    form.highlight_feedback_position_weight < 0 ||
    form.highlight_feedback_duration_weight < 0 ||
    form.highlight_feedback_reason_weight < 0
  ) {
    return "高光反馈权重非法：position/duration/reason 不能小于 0。";
  }
  if (
    form.highlight_feedback_position_weight +
      form.highlight_feedback_duration_weight +
      form.highlight_feedback_reason_weight <=
    0
  ) {
    return "高光反馈权重非法：position + duration + reason 必须 > 0。";
  }
  if (form.gif_health_done_rate_warn <= form.gif_health_done_rate_critical) {
    return "完成率阈值非法：warn 必须大于 critical（完成率是“低于触发”）。";
  }
  if (form.gif_health_path_strict_rate_warn <= form.gif_health_path_strict_rate_critical) {
    return "路径命中率阈值非法：warn 必须大于 critical（命中率是“低于触发”）。";
  }
  if (form.gif_health_failed_rate_critical <= form.gif_health_failed_rate_warn) {
    return "失败率阈值非法：critical 必须大于 warn（失败率是“高于触发”）。";
  }
  if (form.gif_health_loop_fallback_rate_critical <= form.gif_health_loop_fallback_rate_warn) {
    return "Loop 回退率阈值非法：critical 必须大于 warn（回退率是“高于触发”）。";
  }
  if (
    form.feedback_integrity_output_coverage_rate_warn <= form.feedback_integrity_output_coverage_rate_critical
  ) {
    return "反馈完整性-output覆盖率阈值非法：warn 必须大于 critical（覆盖率是“低于触发”）。";
  }
  if (
    form.feedback_integrity_output_resolved_rate_warn <= form.feedback_integrity_output_resolved_rate_critical
  ) {
    return "反馈完整性-output可解析率阈值非法：warn 必须大于 critical（可解析率是“低于触发”）。";
  }
  if (
    form.feedback_integrity_output_job_consistency_rate_warn <=
    form.feedback_integrity_output_job_consistency_rate_critical
  ) {
    return "反馈完整性-job对齐率阈值非法：warn 必须大于 critical（对齐率是“低于触发”）。";
  }
  if (
    form.feedback_integrity_top_pick_conflict_users_critical <=
    form.feedback_integrity_top_pick_conflict_users_warn
  ) {
    return "反馈完整性-top_pick冲突阈值非法：critical 必须大于 warn（冲突数是“高于触发”）。";
  }
  return null;
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

function formatTime(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("zh-CN");
}

function formatRate(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "-";
  return `${(n * 100).toFixed(2)}%`;
}

function formatDelta(value?: number, digits = 2) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "-";
  if (n === 0) return `0.${"0".repeat(digits)}%`;
  return `${n > 0 ? "+" : ""}${(n * 100).toFixed(digits)}%`;
}

function formatMetric(value?: number, digits = 3) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(digits);
}

function rolloutVerdictMeta(value?: string) {
  const verdict = (value || "").trim().toLowerCase();
  switch (verdict) {
    case "improved":
      return { label: "改善", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
    case "regressed":
      return { label: "回退", className: "border-rose-200 bg-rose-50 text-rose-700" };
    case "insufficient_data":
      return { label: "样本不足", className: "border-slate-200 bg-slate-50 text-slate-600" };
    default:
      return { label: "持平", className: "border-amber-200 bg-amber-50 text-amber-700" };
  }
}

function normalizePromptTemplateFormat(value?: string): PromptTemplateFormat {
  const lower = (value || "").trim().toLowerCase();
  switch (lower) {
    case "gif":
    case "webp":
    case "jpg":
    case "png":
    case "live":
      return lower;
    default:
      return "all";
  }
}

function normalizePromptTemplateStage(value?: string): PromptTemplateStage | "" {
  const lower = (value || "").trim().toLowerCase();
  if (lower === "ai1" || lower === "ai2" || lower === "ai3" || lower === "scoring") return lower;
  return "";
}

function normalizePromptTemplateLayer(value?: string): PromptTemplateLayer | "" {
  const lower = (value || "").trim().toLowerCase();
  if (lower === "editable" || lower === "fixed") return lower;
  return "";
}

function mapFallbackAuditToEffectCard(item: VideoJobsOverviewRolloutAudit): VideoQualityRolloutEffectCard {
  return {
    audit_id: item.id || 0,
    admin_id: item.admin_id || 0,
    applied_at: item.created_at || "",
    window: item.window || "24h",
    from_rollout_percent: item.from_rollout_percent || 0,
    to_rollout_percent: item.to_rollout_percent || 0,
    verdict: "insufficient_data",
    verdict_reason: item.recommendation_reason || "当前后端未提供 rollout-effects 细分指标，展示基础变更审计记录。",
    recommendation_state: item.recommendation_state || "",
    base_metrics: {},
    target_metrics: {},
    delta: {},
  };
}

export default function Page() {
  const [form, setForm] = useState<VideoQualitySetting>(DEFAULT_FORM);
  const [baseForm, setBaseForm] = useState<VideoQualitySetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [rolloutEffects, setRolloutEffects] = useState<VideoQualityRolloutEffectCard[]>([]);
  const [rolloutEffectsLoading, setRolloutEffectsLoading] = useState(false);
  const [rolloutEffectsError, setRolloutEffectsError] = useState<string | null>(null);
  const [rolloutEffectsFallbackUsed, setRolloutEffectsFallbackUsed] = useState(false);
  const [templateFormat, setTemplateFormat] = useState<PromptTemplateFormat>("all");
  const [templateTab, setTemplateTab] = useState<PromptTemplateTabKey>("ai1");
  const [templateItems, setTemplateItems] = useState<AdminVideoAIPromptTemplateItem[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);
  const [templateAudits, setTemplateAudits] = useState<AdminVideoAIPromptTemplateAuditItem[]>([]);
  const [templateAuditsLoading, setTemplateAuditsLoading] = useState(false);
  const [templateVersions, setTemplateVersions] = useState<AdminVideoAIPromptTemplateVersionItem[]>([]);
  const [templateVersionsResolvedFrom, setTemplateVersionsResolvedFrom] = useState("");
  const [templateVersionsLoading, setTemplateVersionsLoading] = useState(false);
  const [templateActivateSaving, setTemplateActivateSaving] = useState(false);
  const [selectedVersionID, setSelectedVersionID] = useState<number>(0);
  const [ai1EditableEnabled, setAi1EditableEnabled] = useState(true);
  const [ai1EditableVersion, setAi1EditableVersion] = useState("v1");
  const [ai1EditableText, setAi1EditableText] = useState("");

  const dirtyKeys = (() => {
    if (!baseForm) return [] as Array<keyof VideoQualitySetting>;
    return (Object.keys(DEFAULT_FORM) as Array<keyof VideoQualitySetting>).filter((key) => {
      return form[key] !== baseForm[key];
    });
  })();
  const dirtyCount = dirtyKeys.length;

  const findTemplate = (stage: PromptTemplateStage, layer: PromptTemplateLayer) => {
    return templateItems.find((item) => {
      return normalizePromptTemplateStage(item.stage) === stage && normalizePromptTemplateLayer(item.layer) === layer;
    });
  };

  const applyProfilePreset = (preset: "clarity" | "size") => {
    setForm((prev) => ({
      ...prev,
      gif_profile: preset,
      webp_profile: preset,
      live_profile: preset,
      jpg_profile: preset,
      png_profile: preset,
    }));
  };

  const loadPromptTemplates = async (format: PromptTemplateFormat) => {
    setTemplateLoading(true);
    setTemplateError(null);
    setTemplateSuccess(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates?format=${format}`);
      if (!res.ok) throw new Error(await parseApiError(res, "加载 AI 模板失败"));
      const data = (await res.json()) as AdminVideoAIPromptTemplatesResponse;
      const normalizedItems = Array.isArray(data.items) ? data.items : [];
      setTemplateItems(normalizedItems);
      const ai1Editable = normalizedItems.find((item) => {
        return normalizePromptTemplateStage(item.stage) === "ai1" && normalizePromptTemplateLayer(item.layer) === "editable";
      });
      setAi1EditableEnabled(ai1Editable?.enabled ?? true);
      setAi1EditableVersion((ai1Editable?.version || "v1").trim() || "v1");
      setAi1EditableText(ai1Editable?.template_text || "");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载 AI 模板失败";
      setTemplateError(message);
      setTemplateItems([]);
      setAi1EditableEnabled(true);
      setAi1EditableVersion("v1");
      setAi1EditableText("");
    } finally {
      setTemplateLoading(false);
    }
  };

  const loadPromptTemplateAudits = async (format: PromptTemplateFormat, tab: PromptTemplateTabKey) => {
    setTemplateAuditsLoading(true);
    try {
      const stage = tab;
      const layer = tab === "ai1" ? "" : "fixed";
      const params = new URLSearchParams();
      params.set("limit", "8");
      params.set("format", format);
      params.set("stage", stage);
      if (layer) params.set("layer", layer);
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates/audits?${params.toString()}`);
      if (!res.ok) throw new Error(await parseApiError(res, "加载模板变更日志失败"));
      const data = (await res.json()) as AdminVideoAIPromptTemplateAuditsResponse;
      setTemplateAudits(Array.isArray(data.items) ? data.items : []);
    } catch {
      setTemplateAudits([]);
    } finally {
      setTemplateAuditsLoading(false);
    }
  };

  const loadPromptTemplateVersions = async (format: PromptTemplateFormat, tab: PromptTemplateTabKey) => {
    const stage = tab;
    const layer: PromptTemplateLayer = tab === "ai1" ? "fixed" : "fixed";
    setTemplateVersionsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("format", format);
      params.set("stage", stage);
      params.set("layer", layer);
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates/versions?${params.toString()}`);
      if (!res.ok) throw new Error(await parseApiError(res, "加载模板版本失败"));
      const data = (await res.json()) as AdminVideoAIPromptTemplateVersionsResponse;
      const versions = Array.isArray(data.items) ? data.items : [];
      setTemplateVersions(versions);
      setTemplateVersionsResolvedFrom((data.resolved_from || "").toLowerCase());
      const active = versions.find((item) => !!item.is_active);
      setSelectedVersionID(active?.id || versions[0]?.id || 0);
    } catch {
      setTemplateVersions([]);
      setTemplateVersionsResolvedFrom("");
      setSelectedVersionID(0);
    } finally {
      setTemplateVersionsLoading(false);
    }
  };

  const activateFixedTemplateVersion = async () => {
    const stage = templateTab;
    const layer = "fixed";
    if (!selectedVersionID) {
      setTemplateError("请选择要切换的版本。");
      return;
    }
    if (templateVersionsResolvedFrom && templateVersionsResolvedFrom !== templateFormat) {
      setTemplateError(`当前展示为 ${templateVersionsResolvedFrom} 回退版本，不能在 ${templateFormat} 作用域直接切换。`);
      return;
    }
    setTemplateActivateSaving(true);
    setTemplateError(null);
    setTemplateSuccess(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: templateFormat,
          stage,
          layer,
          template_id: selectedVersionID,
          reason: "admin_activate_from_quality_page",
        }),
      });
      if (!res.ok) throw new Error(await parseApiError(res, "切换模板版本失败"));
      await loadPromptTemplateVersions(templateFormat, templateTab);
      await loadPromptTemplates(templateFormat);
      await loadPromptTemplateAudits(templateFormat, templateTab);
      setTemplateSuccess(`已切换 ${stage.toUpperCase()} 固定层版本。`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "切换模板版本失败";
      setTemplateError(message);
    } finally {
      setTemplateActivateSaving(false);
    }
  };

  const saveAI1EditableTemplate = async () => {
    if (!ai1EditableVersion.trim()) {
      setTemplateError("AI1 可编辑层版本不能为空。");
      setTemplateSuccess(null);
      return;
    }
    if (ai1EditableVersion.trim().length > 64) {
      setTemplateError("AI1 可编辑层版本长度不能超过 64 个字符。");
      setTemplateSuccess(null);
      return;
    }
    if (ai1EditableText.length > 16000) {
      setTemplateError("AI1 可编辑层模板正文不能超过 16000 个字符。");
      setTemplateSuccess(null);
      return;
    }
    setTemplateSaving(true);
    setTemplateError(null);
    setTemplateSuccess(null);
    try {
      const payload = {
        format: templateFormat,
        items: [
          {
            stage: "ai1",
            layer: "editable",
            enabled: ai1EditableEnabled,
            version: ai1EditableVersion.trim(),
            template_text: ai1EditableText,
          },
        ],
      };
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await parseApiError(res, "保存 AI1 可编辑层失败"));
      const data = (await res.json()) as AdminVideoAIPromptTemplatesResponse;
      const normalizedItems = Array.isArray(data.items) ? data.items : [];
      setTemplateItems(normalizedItems);
      const updated = normalizedItems.find((item) => {
        return normalizePromptTemplateStage(item.stage) === "ai1" && normalizePromptTemplateLayer(item.layer) === "editable";
      });
      setAi1EditableEnabled(updated?.enabled ?? ai1EditableEnabled);
      setAi1EditableVersion((updated?.version || ai1EditableVersion).trim() || "v1");
      setAi1EditableText(updated?.template_text ?? ai1EditableText);
      await loadPromptTemplateAudits(templateFormat, templateTab);
      setTemplateSuccess(`AI1 可编辑层模板已保存（format=${templateFormat}）。`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "保存 AI1 可编辑层失败";
      setTemplateError(message);
    } finally {
      setTemplateSaving(false);
    }
  };

  const fetchRolloutEffects = async (limit = 6): Promise<{ items: VideoQualityRolloutEffectCard[]; fallbackUsed: boolean }> => {
    const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/quality-settings/rollout-effects?limit=${limit}`);
    if (res.ok) {
      const data = (await res.json()) as VideoQualityRolloutEffectsResponse;
      return {
        items: Array.isArray(data.items) ? data.items : [],
        fallbackUsed: false,
      };
    }
    if (res.status !== 404) {
      throw new Error(await parseApiError(res, "加载 rollout 变更记录失败"));
    }

    const fallbackRes = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/overview?window=7d`);
    if (!fallbackRes.ok) {
      throw new Error(await parseApiError(fallbackRes, "加载 rollout 变更记录失败"));
    }
    const fallbackData = (await fallbackRes.json()) as VideoJobsOverviewFallbackResponse;
    const audits = Array.isArray(fallbackData.feedback_rollout_audit_logs)
      ? fallbackData.feedback_rollout_audit_logs.slice(0, limit)
      : [];
    return {
      items: audits.map(mapFallbackAuditToEffectCard),
      fallbackUsed: true,
    };
  };

  const loadRolloutEffects = async () => {
    setRolloutEffectsLoading(true);
    setRolloutEffectsError(null);
    try {
      const result = await fetchRolloutEffects(6);
      setRolloutEffects(result.items);
      setRolloutEffectsFallbackUsed(result.fallbackUsed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载 rollout 变更记录失败";
      setRolloutEffectsError(message);
      setRolloutEffectsFallbackUsed(false);
      setRolloutEffects([]);
    } finally {
      setRolloutEffectsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setRolloutEffectsLoading(true);
      setRolloutEffectsError(null);
      setError(null);
      setSuccess(null);
      try {
        const [settingRes, effectsResult] = await Promise.all([
          fetchWithAuth(`${API_BASE}/api/admin/video-jobs/quality-settings`),
          fetchRolloutEffects(6),
        ]);
        if (!settingRes.ok) throw new Error(await parseApiError(settingRes, "加载失败"));
        const data = (await settingRes.json()) as VideoQualitySetting;
        const merged = { ...DEFAULT_FORM, ...data };
        setForm(merged);
        setBaseForm(merged);
        setUpdatedAt(data.updated_at || "");
        setRolloutEffects(effectsResult.items);
        setRolloutEffectsFallbackUsed(effectsResult.fallbackUsed);
        setRolloutEffectsError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "加载失败";
        setError(message);
        setRolloutEffectsFallbackUsed(false);
        setBaseForm(null);
      } finally {
        setLoading(false);
        setRolloutEffectsLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    void loadPromptTemplates(templateFormat);
  }, [templateFormat]);

  useEffect(() => {
    void loadPromptTemplateAudits(templateFormat, templateTab);
  }, [templateFormat, templateTab]);

  useEffect(() => {
    void loadPromptTemplateVersions(templateFormat, templateTab);
  }, [templateFormat, templateTab]);

  const save = async () => {
    if (!baseForm) {
      setError("配置尚未成功加载，已禁止保存默认值覆盖。请先刷新页面。");
      setSuccess(null);
      return;
    }
    const validationMessage = validateBeforeSave(form);
    if (validationMessage) {
      setError(validationMessage);
      setSuccess(null);
      return;
    }
    if (dirtyCount === 0) {
      setError(null);
      setSuccess("当前没有变更项。");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const key of dirtyKeys) {
        payload[key] = form[key];
      }
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/quality-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await parseApiError(res, "保存失败"));
      const data = (await res.json()) as VideoQualitySetting;
      const merged = { ...DEFAULT_FORM, ...data };
      setForm(merged);
      setBaseForm(merged);
      setUpdatedAt(data.updated_at || "");
      setSuccess(`已保存视频转图质量配置（${dirtyCount} 项变更）。`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "保存失败";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="视频转图质量" description="加载中..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="视频转图质量"
        description="配置帧质量过滤阈值与 GIF 输出参数，目标是“更清晰 + 更稳定 + 更有代表性”。"
        actions={
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            onClick={() => void save()}
            disabled={saving || !baseForm}
            title={!baseForm ? "配置未加载成功，禁止保存" : undefined}
          >
            {saving ? "保存中..." : dirtyCount > 0 ? `保存配置（${dirtyCount}）` : "保存配置"}
          </button>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}
      {!baseForm ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          当前处于只读保护：配置未成功从后端加载，已禁用保存，避免默认值覆盖线上参数。
        </div>
      ) : null}

      <div className="space-y-4 rounded-3xl border border-indigo-100 bg-indigo-50/40 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-indigo-800">AI 模板中心（AI1 / AI2 / 评分 / AI3）</h3>
            <p className="mt-1 text-xs text-indigo-700/80">
              支持按格式切换。AI1 提供“可编辑层 + 固定层”；AI2、评分、AI3 采用固定层模板。
            </p>
          </div>
          <label className="text-xs text-indigo-700">
            <span className="mb-1 block">格式范围</span>
            <select
              value={templateFormat}
              onChange={(e) => setTemplateFormat(normalizePromptTemplateFormat(e.target.value))}
              className="min-w-[180px] rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
            >
              {TEMPLATE_FORMAT_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {TEMPLATE_TAB_OPTIONS.map((item) => {
            const active = templateTab === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setTemplateTab(item.value)}
                className={
                  active
                    ? "rounded-xl border border-indigo-300 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
                    : "rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                }
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {templateError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{templateError}</div>
        ) : null}
        {templateSuccess ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
            {templateSuccess}
          </div>
        ) : null}

        {templateLoading ? (
          <div className="rounded-xl border border-indigo-200 bg-white px-4 py-6 text-center text-xs text-indigo-700">
            模板加载中...
          </div>
        ) : null}

        {!templateLoading ? (
          <div className="rounded-2xl border border-indigo-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-indigo-700">固定层版本切换（只读历史）</div>
                <div className="mt-1 text-[11px] text-indigo-700/80">
                  当前标签：{templateTab.toUpperCase()} · 来源作用域：{templateVersionsResolvedFrom || "未配置"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void loadPromptTemplateVersions(templateFormat, templateTab)}
                disabled={templateVersionsLoading}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
              >
                {templateVersionsLoading ? "刷新中..." : "刷新版本"}
              </button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <select
                value={selectedVersionID ? String(selectedVersionID) : ""}
                onChange={(e) => setSelectedVersionID(Number(e.target.value || 0))}
                className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
                disabled={templateVersionsLoading || templateVersions.length === 0}
              >
                {templateVersions.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.version || `v-${item.id}`} {item.is_active ? "（当前）" : ""} · {formatTime(item.updated_at)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void activateFixedTemplateVersion()}
                disabled={
                  templateActivateSaving ||
                  templateVersionsLoading ||
                  !selectedVersionID ||
                  (templateVersionsResolvedFrom !== "" && templateVersionsResolvedFrom !== templateFormat)
                }
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {templateActivateSaving ? "切换中..." : "切换为当前版本"}
              </button>
            </div>
            {templateVersionsResolvedFrom !== "" && templateVersionsResolvedFrom !== templateFormat ? (
              <div className="mt-2 text-[11px] text-amber-700">
                当前是 {templateVersionsResolvedFrom} 回退版本；若要切换，请先切到对应作用域再操作。
              </div>
            ) : null}
          </div>
        ) : null}

        {!templateLoading && templateTab === "ai1" ? (
          <div className="space-y-4 rounded-2xl border border-indigo-200 bg-white p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-1 text-xs text-indigo-700">
                <span>可编辑层开关</span>
                <select
                  value={ai1EditableEnabled ? "1" : "0"}
                  onChange={(e) => setAi1EditableEnabled(e.target.value === "1")}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="1">开启</option>
                  <option value="0">关闭</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-indigo-700 md:col-span-2">
                <span>可编辑层版本</span>
                <input
                  type="text"
                  value={ai1EditableVersion}
                  onChange={(e) => setAi1EditableVersion(e.target.value)}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
                  placeholder="例如：v2 / 20260318-alpha"
                />
              </label>
            </div>

            <label className="block space-y-1 text-xs text-indigo-700">
              <span>AI1 可编辑层模板正文</span>
              <textarea
                value={ai1EditableText}
                onChange={(e) => setAi1EditableText(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
                placeholder="在这里编辑给 AI1 的运营策略指令（结构化要求、目标、约束、偏好）。"
              />
            </label>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => void saveAI1EditableTemplate()}
                disabled={templateSaving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {templateSaving ? "保存中..." : "保存 AI1 可编辑层"}
              </button>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-700">
              <div className="font-semibold">AI1 固定层（只读）</div>
              <div className="mt-1 text-[11px] text-indigo-700/80">
                来源：{findTemplate("ai1", "fixed")?.resolved_from || "未配置"}
                {findTemplate("ai1", "fixed")?.version ? ` · 版本 ${findTemplate("ai1", "fixed")?.version}` : ""}
              </div>
              <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[11px] leading-5 text-slate-700">
                {findTemplate("ai1", "fixed")?.template_text || "（未配置）"}
              </pre>
            </div>
          </div>
        ) : null}

        {!templateLoading && templateTab === "ai2" ? (
          <div className="rounded-2xl border border-indigo-200 bg-white p-4">
            <div className="text-xs font-semibold text-indigo-700">AI2 固定层模板（提名阶段）</div>
            <div className="mt-1 text-[11px] text-indigo-700/80">
              来源：{findTemplate("ai2", "fixed")?.resolved_from || "未配置"}
              {findTemplate("ai2", "fixed")?.version ? ` · 版本 ${findTemplate("ai2", "fixed")?.version}` : ""}
            </div>
            <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-[11px] leading-5 text-slate-700">
              {findTemplate("ai2", "fixed")?.template_text || "（未配置）"}
            </pre>
          </div>
        ) : null}

        {!templateLoading && templateTab === "scoring" ? (
          <div className="rounded-2xl border border-indigo-200 bg-white p-4">
            <div className="text-xs font-semibold text-indigo-700">评分系统固定层说明</div>
            <div className="mt-1 text-[11px] text-indigo-700/80">
              来源：{findTemplate("scoring", "fixed")?.resolved_from || "未配置"}
              {findTemplate("scoring", "fixed")?.version
                ? ` · 版本 ${findTemplate("scoring", "fixed")?.version}`
                : ""}
            </div>
            <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-[11px] leading-5 text-slate-700">
              {findTemplate("scoring", "fixed")?.template_text || "（未配置）"}
            </pre>
          </div>
        ) : null}

        {!templateLoading && templateTab === "ai3" ? (
          <div className="rounded-2xl border border-indigo-200 bg-white p-4">
            <div className="text-xs font-semibold text-indigo-700">AI3 固定层模板（复审阶段）</div>
            <div className="mt-1 text-[11px] text-indigo-700/80">
              来源：{findTemplate("ai3", "fixed")?.resolved_from || "未配置"}
              {findTemplate("ai3", "fixed")?.version ? ` · 版本 ${findTemplate("ai3", "fixed")?.version}` : ""}
            </div>
            <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-[11px] leading-5 text-slate-700">
              {findTemplate("ai3", "fixed")?.template_text || "（未配置）"}
            </pre>
          </div>
        ) : null}

        <div className="rounded-2xl border border-indigo-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-indigo-700">模板变更日志（最近 8 条）</div>
            <button
              type="button"
              onClick={() => void loadPromptTemplateAudits(templateFormat, templateTab)}
              disabled={templateAuditsLoading}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
            >
              {templateAuditsLoading ? "刷新中..." : "刷新"}
            </button>
          </div>
          {templateAuditsLoading && !templateAudits.length ? (
            <div className="mt-2 text-[11px] text-slate-500">加载中...</div>
          ) : null}
          {!templateAuditsLoading && !templateAudits.length ? (
            <div className="mt-2 text-[11px] text-slate-500">暂无日志</div>
          ) : null}
          {templateAudits.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-[11px] text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-2 py-1">时间</th>
                    <th className="px-2 py-1">动作</th>
                    <th className="px-2 py-1">格式</th>
                    <th className="px-2 py-1">阶段</th>
                    <th className="px-2 py-1">层级</th>
                    <th className="px-2 py-1">管理员</th>
                    <th className="px-2 py-1">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {templateAudits.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-2 py-1">{formatTime(item.created_at)}</td>
                      <td className="px-2 py-1">{(item.action || "-").toLowerCase()}</td>
                      <td className="px-2 py-1">{(item.format || "-").toLowerCase()}</td>
                      <td className="px-2 py-1">{(item.stage || "-").toLowerCase()}</td>
                      <td className="px-2 py-1">{(item.layer || "-").toLowerCase()}</td>
                      <td className="px-2 py-1">#{item.operator_admin_id || 0}</td>
                      <td className="px-2 py-1">{item.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      {templateTab === "scoring" ? (
        <>
      <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">最近几次 rollout 变更记录</h3>
            <p className="mt-1 text-xs text-slate-500">用于核对参数变更前后窗口效果（完成率/失败率/质量分/闭环）。</p>
          </div>
          <button
            type="button"
            onClick={() => void loadRolloutEffects()}
            disabled={rolloutEffectsLoading}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {rolloutEffectsLoading ? "刷新中..." : "刷新记录"}
          </button>
        </div>

        {rolloutEffectsError ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700">{rolloutEffectsError}</div>
        ) : null}

        {!rolloutEffectsError && rolloutEffectsFallbackUsed ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            当前后端版本未提供 rollout-effects 专项接口，已自动回退为“基础变更审计记录”。
          </div>
        ) : null}

        {rolloutEffectsLoading && !rolloutEffects.length ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">加载中...</div>
        ) : null}

        {!rolloutEffectsLoading && !rolloutEffects.length ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
            暂无 rollout 变更记录。
          </div>
        ) : null}

        {rolloutEffects.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {rolloutEffects.map((item) => {
              const verdict = rolloutVerdictMeta(item.verdict);
              const base = item.base_metrics || {};
              const target = item.target_metrics || {};
              const delta = item.delta || {};
              return (
                <div key={`${item.audit_id || 0}-${item.applied_at || ""}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-slate-500">
                      {formatTime(item.applied_at)} · Admin #{item.admin_id || 0} · {item.window || "-"}
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${verdict.className}`}>{verdict.label}</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-800">
                    rollout {item.from_rollout_percent ?? 0}% → {item.to_rollout_percent ?? 0}%
                  </div>
                  {item.verdict_reason ? <div className="mt-1 text-xs text-slate-600">{item.verdict_reason}</div> : null}
                  <div className="mt-3 grid gap-2 text-xs text-slate-600">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="font-medium text-slate-500">指标</div>
                      <div className="font-medium text-slate-500">base</div>
                      <div className="font-medium text-slate-500">target</div>
                      <div className="font-medium text-slate-500">Δ</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>完成率</div>
                      <div>{formatRate(base.done_rate)}</div>
                      <div>{formatRate(target.done_rate)}</div>
                      <div>{formatDelta(delta.done_rate_delta)}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>失败率</div>
                      <div>{formatRate(base.failed_rate)}</div>
                      <div>{formatRate(target.failed_rate)}</div>
                      <div>{formatDelta(delta.failed_rate_delta)}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>质量分均值</div>
                      <div>{formatMetric(base.avg_output_score, 3)}</div>
                      <div>{formatMetric(target.avg_output_score, 3)}</div>
                      <div>{formatMetric(delta.avg_output_score_delta, 3)}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>闭环均值</div>
                      <div>{formatMetric(base.avg_loop_closure, 3)}</div>
                      <div>{formatMetric(target.avg_loop_closure, 3)}</div>
                      <div>{formatMetric(delta.avg_loop_closure_delta, 3)}</div>
                    </div>
                    <div className="pt-1 text-[11px] text-slate-500">
                      样本：jobs {base.jobs_total || 0} → {target.jobs_total || 0}，outputs {base.output_samples || 0} →{" "}
                      {target.output_samples || 0}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-800">格式级模板（清晰/体积）</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => applyProfilePreset("clarity")}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              一键清晰优先
            </button>
            <button
              type="button"
              onClick={() => applyProfilePreset("size")}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              一键体积优先
            </button>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
            说明：静态图最小宽高设为 0 表示不启用分辨率硬门槛；建议先调清晰度/曝光阈值，再逐步加宽高门槛。
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          <label className="space-y-1 text-xs text-slate-500">
            <span>GIF 模板</span>
            <select
              value={form.gif_profile}
              onChange={(e) => setForm((prev) => ({ ...prev, gif_profile: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >
              {PROFILE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-500">
            <span>WebP 模板</span>
            <select
              value={form.webp_profile}
              onChange={(e) => setForm((prev) => ({ ...prev, webp_profile: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >
              {PROFILE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-500">
            <span>Live 模板</span>
            <select
              value={form.live_profile}
              onChange={(e) => setForm((prev) => ({ ...prev, live_profile: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >
              {PROFILE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-500">
            <span>JPG 模板</span>
            <select
              value={form.jpg_profile}
              onChange={(e) => setForm((prev) => ({ ...prev, jpg_profile: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >
              {PROFILE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-500">
            <span>PNG 模板</span>
            <select
              value={form.png_profile}
              onChange={(e) => setForm((prev) => ({ ...prev, png_profile: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >
              {PROFILE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">帧质量过滤</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-xs text-slate-500">
              <span>最小亮度</span>
              <input
                type="number"
                value={form.min_brightness}
                onChange={(e) => setForm((prev) => ({ ...prev, min_brightness: toNumber(e.target.value, prev.min_brightness) }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>最大亮度</span>
              <input
                type="number"
                value={form.max_brightness}
                onChange={(e) => setForm((prev) => ({ ...prev, max_brightness: toNumber(e.target.value, prev.max_brightness) }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>模糊阈值系数</span>
              <input
                type="number"
                step="0.01"
                value={form.blur_threshold_factor}
                onChange={(e) => setForm((prev) => ({ ...prev, blur_threshold_factor: toNumber(e.target.value, prev.blur_threshold_factor) }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>模糊阈值下限</span>
              <input
                type="number"
                value={form.blur_threshold_min}
                onChange={(e) => setForm((prev) => ({ ...prev, blur_threshold_min: toNumber(e.target.value, prev.blur_threshold_min) }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>模糊阈值上限</span>
              <input
                type="number"
                value={form.blur_threshold_max}
                onChange={(e) => setForm((prev) => ({ ...prev, blur_threshold_max: toNumber(e.target.value, prev.blur_threshold_max) }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>静态图最小清晰度（硬门槛）</span>
              <input
                type="number"
                step="0.1"
                value={form.still_min_blur_score}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    still_min_blur_score: toNumber(e.target.value, prev.still_min_blur_score),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>静态图最小曝光分（0-1）</span>
              <input
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={form.still_min_exposure_score}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    still_min_exposure_score: toNumber(e.target.value, prev.still_min_exposure_score),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>静态图最小宽度（px）</span>
              <input
                type="number"
                min={0}
                max={4096}
                value={form.still_min_width}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    still_min_width: toNumber(e.target.value, prev.still_min_width),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>静态图最小高度（px）</span>
              <input
                type="number"
                min={0}
                max={4096}
                value={form.still_min_height}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    still_min_height: toNumber(e.target.value, prev.still_min_height),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>重复判定阈值（哈希距离）</span>
              <input
                type="number"
                value={form.duplicate_hamming_threshold}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    duplicate_hamming_threshold: toNumber(e.target.value, prev.duplicate_hamming_threshold),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>重复回看帧数</span>
              <input
                type="number"
                value={form.duplicate_backtrack_frames}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    duplicate_backtrack_frames: toNumber(e.target.value, prev.duplicate_backtrack_frames),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>回退模糊放宽系数</span>
              <input
                type="number"
                step="0.05"
                value={form.fallback_blur_relax_factor}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    fallback_blur_relax_factor: toNumber(e.target.value, prev.fallback_blur_relax_factor),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>回退重复阈值</span>
              <input
                type="number"
                value={form.fallback_hamming_threshold}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    fallback_hamming_threshold: toNumber(e.target.value, prev.fallback_hamming_threshold),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>最少保留帧基数</span>
              <input
                type="number"
                value={form.min_keep_base}
                onChange={(e) => setForm((prev) => ({ ...prev, min_keep_base: toNumber(e.target.value, prev.min_keep_base) }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>最少保留比例</span>
              <input
                type="number"
                step="0.01"
                value={form.min_keep_ratio}
                onChange={(e) => setForm((prev) => ({ ...prev, min_keep_ratio: toNumber(e.target.value, prev.min_keep_ratio) }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>质量分析并发</span>
              <input
                type="number"
                value={form.quality_analysis_workers}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    quality_analysis_workers: toNumber(e.target.value, prev.quality_analysis_workers),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>上传并发</span>
              <input
                type="number"
                value={form.upload_concurrency}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    upload_concurrency: toNumber(e.target.value, prev.upload_concurrency),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>Live 人像提示权重</span>
              <input
                type="number"
                step="0.01"
                min={0.01}
                max={0.25}
                value={form.live_cover_portrait_weight}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    live_cover_portrait_weight: toNumber(e.target.value, prev.live_cover_portrait_weight),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>Live 低样本阈值</span>
              <input
                type="number"
                min={1}
                max={100}
                value={form.live_cover_scene_min_samples}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    live_cover_scene_min_samples: toNumber(e.target.value, prev.live_cover_scene_min_samples),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>Live 护栏最小总样本</span>
              <input
                type="number"
                min={1}
                max={1000}
                value={form.live_cover_guard_min_total}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    live_cover_guard_min_total: toNumber(e.target.value, prev.live_cover_guard_min_total),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>Live 护栏分数底线</span>
              <input
                type="number"
                step="0.01"
                min={0.3}
                max={0.95}
                value={form.live_cover_guard_score_floor}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    live_cover_guard_score_floor: toNumber(e.target.value, prev.live_cover_guard_score_floor),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">高光反馈重排（A/B）</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 md:col-span-2">
              <input
                type="checkbox"
                checked={form.highlight_feedback_enabled}
                onChange={(e) => setForm((prev) => ({ ...prev, highlight_feedback_enabled: e.target.checked }))}
              />
              启用反馈重排（根据下载/收藏偏好调整高光候选排序）
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>流量比例（%）</span>
              <input
                type="number"
                value={form.highlight_feedback_rollout_percent}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    highlight_feedback_rollout_percent: toNumber(e.target.value, prev.highlight_feedback_rollout_percent),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>最小有反馈任务数</span>
              <input
                type="number"
                value={form.highlight_feedback_min_engaged_jobs}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    highlight_feedback_min_engaged_jobs: toNumber(e.target.value, prev.highlight_feedback_min_engaged_jobs),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>最小加权反馈信号</span>
              <input
                type="number"
                step="0.1"
                value={form.highlight_feedback_min_weighted_signals}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    highlight_feedback_min_weighted_signals: toNumber(
                      e.target.value,
                      prev.highlight_feedback_min_weighted_signals
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>增强系数</span>
              <input
                type="number"
                step="0.05"
                value={form.highlight_feedback_boost_scale}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    highlight_feedback_boost_scale: toNumber(e.target.value, prev.highlight_feedback_boost_scale),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>位置偏好权重</span>
              <input
                type="number"
                step="0.01"
                value={form.highlight_feedback_position_weight}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    highlight_feedback_position_weight: toNumber(e.target.value, prev.highlight_feedback_position_weight),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>时长偏好权重</span>
              <input
                type="number"
                step="0.01"
                value={form.highlight_feedback_duration_weight}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    highlight_feedback_duration_weight: toNumber(e.target.value, prev.highlight_feedback_duration_weight),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>原因偏好权重</span>
              <input
                type="number"
                step="0.01"
                value={form.highlight_feedback_reason_weight}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    highlight_feedback_reason_weight: toNumber(e.target.value, prev.highlight_feedback_reason_weight),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 md:col-span-2">
              <input
                type="checkbox"
                checked={form.highlight_feedback_negative_guard_enabled}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, highlight_feedback_negative_guard_enabled: e.target.checked }))
                }
              />
              启用负反馈保护（对被“dislike”偏多的候选原因自动降权）
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>负反馈占比阈值</span>
              <input
                type="number"
                step="0.01"
                value={form.highlight_feedback_negative_guard_dominance_threshold}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    highlight_feedback_negative_guard_dominance_threshold: toNumber(
                      e.target.value,
                      prev.highlight_feedback_negative_guard_dominance_threshold
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>负反馈最小权重</span>
              <input
                type="number"
                step="0.1"
                value={form.highlight_feedback_negative_guard_min_weight}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    highlight_feedback_negative_guard_min_weight: toNumber(
                      e.target.value,
                      prev.highlight_feedback_negative_guard_min_weight
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>负反馈乘性降权</span>
              <input
                type="number"
                step="0.01"
                value={form.highlight_feedback_negative_guard_penalty_scale}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    highlight_feedback_negative_guard_penalty_scale: toNumber(
                      e.target.value,
                      prev.highlight_feedback_negative_guard_penalty_scale
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>负反馈加性惩罚</span>
              <input
                type="number"
                step="0.01"
                value={form.highlight_feedback_negative_guard_penalty_weight}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    highlight_feedback_negative_guard_penalty_weight: toNumber(
                      e.target.value,
                      prev.highlight_feedback_negative_guard_penalty_weight
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
            建议：先开 30% 流量观察“收藏率/下载率变化”，稳定后再逐步拉到 100%。
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">GIF SQL巡检告警阈值</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-xs text-slate-500">
              <span>完成率 Warn（低于触发）</span>
              <input
                type="number"
                step="0.01"
                min={0.5}
                max={0.99}
                value={form.gif_health_done_rate_warn}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_health_done_rate_warn: toNumber(e.target.value, prev.gif_health_done_rate_warn),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>完成率 Critical（低于触发）</span>
              <input
                type="number"
                step="0.01"
                min={0.01}
                max={0.98}
                value={form.gif_health_done_rate_critical}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_health_done_rate_critical: toNumber(e.target.value, prev.gif_health_done_rate_critical),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>

            <label className="space-y-1 text-xs text-slate-500">
              <span>失败率 Warn（高于触发）</span>
              <input
                type="number"
                step="0.01"
                min={0.01}
                max={0.95}
                value={form.gif_health_failed_rate_warn}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_health_failed_rate_warn: toNumber(e.target.value, prev.gif_health_failed_rate_warn),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>失败率 Critical（高于触发）</span>
              <input
                type="number"
                step="0.01"
                min={0.02}
                max={0.99}
                value={form.gif_health_failed_rate_critical}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_health_failed_rate_critical: toNumber(e.target.value, prev.gif_health_failed_rate_critical),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>

            <label className="space-y-1 text-xs text-slate-500">
              <span>新路径严格命中 Warn（低于触发）</span>
              <input
                type="number"
                step="0.01"
                min={0.5}
                max={0.99}
                value={form.gif_health_path_strict_rate_warn}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_health_path_strict_rate_warn: toNumber(
                      e.target.value,
                      prev.gif_health_path_strict_rate_warn
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>新路径严格命中 Critical（低于触发）</span>
              <input
                type="number"
                step="0.01"
                min={0.01}
                max={0.98}
                value={form.gif_health_path_strict_rate_critical}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_health_path_strict_rate_critical: toNumber(
                      e.target.value,
                      prev.gif_health_path_strict_rate_critical
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>

            <label className="space-y-1 text-xs text-slate-500">
              <span>Loop回退率 Warn（高于触发）</span>
              <input
                type="number"
                step="0.01"
                min={0.01}
                max={0.95}
                value={form.gif_health_loop_fallback_rate_warn}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_health_loop_fallback_rate_warn: toNumber(
                      e.target.value,
                      prev.gif_health_loop_fallback_rate_warn
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>Loop回退率 Critical（高于触发）</span>
              <input
                type="number"
                step="0.01"
                min={0.02}
                max={0.99}
                value={form.gif_health_loop_fallback_rate_critical}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_health_loop_fallback_rate_critical: toNumber(
                      e.target.value,
                      prev.gif_health_loop_fallback_rate_critical
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <h4 className="mb-2 text-xs font-semibold text-slate-700">反馈完整性告警阈值（output_id 闭环）</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-xs text-slate-500">
                <span>output覆盖率 Warn（低于触发）</span>
                <input
                  type="number"
                  step="0.001"
                  min={0.5}
                  max={1}
                  value={form.feedback_integrity_output_coverage_rate_warn}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      feedback_integrity_output_coverage_rate_warn: toNumber(
                        e.target.value,
                        prev.feedback_integrity_output_coverage_rate_warn
                      ),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-500">
                <span>output覆盖率 Critical（低于触发）</span>
                <input
                  type="number"
                  step="0.001"
                  min={0.01}
                  max={0.999}
                  value={form.feedback_integrity_output_coverage_rate_critical}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      feedback_integrity_output_coverage_rate_critical: toNumber(
                        e.target.value,
                        prev.feedback_integrity_output_coverage_rate_critical
                      ),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-500">
                <span>output可解析率 Warn（低于触发）</span>
                <input
                  type="number"
                  step="0.001"
                  min={0.5}
                  max={1}
                  value={form.feedback_integrity_output_resolved_rate_warn}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      feedback_integrity_output_resolved_rate_warn: toNumber(
                        e.target.value,
                        prev.feedback_integrity_output_resolved_rate_warn
                      ),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-500">
                <span>output可解析率 Critical（低于触发）</span>
                <input
                  type="number"
                  step="0.001"
                  min={0.01}
                  max={0.999}
                  value={form.feedback_integrity_output_resolved_rate_critical}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      feedback_integrity_output_resolved_rate_critical: toNumber(
                        e.target.value,
                        prev.feedback_integrity_output_resolved_rate_critical
                      ),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-500">
                <span>job对齐率 Warn（低于触发）</span>
                <input
                  type="number"
                  step="0.0001"
                  min={0.5}
                  max={1}
                  value={form.feedback_integrity_output_job_consistency_rate_warn}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      feedback_integrity_output_job_consistency_rate_warn: toNumber(
                        e.target.value,
                        prev.feedback_integrity_output_job_consistency_rate_warn
                      ),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-500">
                <span>job对齐率 Critical（低于触发）</span>
                <input
                  type="number"
                  step="0.0001"
                  min={0.01}
                  max={0.9999}
                  value={form.feedback_integrity_output_job_consistency_rate_critical}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      feedback_integrity_output_job_consistency_rate_critical: toNumber(
                        e.target.value,
                        prev.feedback_integrity_output_job_consistency_rate_critical
                      ),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-500">
                <span>top_pick冲突用户 Warn（高于触发）</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.feedback_integrity_top_pick_conflict_users_warn}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      feedback_integrity_top_pick_conflict_users_warn: toNumber(
                        e.target.value,
                        prev.feedback_integrity_top_pick_conflict_users_warn
                      ),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-500">
                <span>top_pick冲突用户 Critical（高于触发）</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={form.feedback_integrity_top_pick_conflict_users_critical}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      feedback_integrity_top_pick_conflict_users_critical: toNumber(
                        e.target.value,
                        prev.feedback_integrity_top_pick_conflict_users_critical
                      ),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
                />
              </label>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
            说明：完成率/命中率类阈值是“低于触发”，失败率/回退率/冲突数类阈值是“高于触发”。建议先改 Warn，再观察 1~2 天再改 Critical。
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">动图/静态图体积预算</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-xs text-slate-500">
              <span>默认 FPS</span>
              <input
                type="number"
                value={form.gif_default_fps}
                onChange={(e) => setForm((prev) => ({ ...prev, gif_default_fps: toNumber(e.target.value, prev.gif_default_fps) }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>默认颜色数</span>
              <input
                type="number"
                value={form.gif_default_max_colors}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_default_max_colors: toNumber(e.target.value, prev.gif_default_max_colors),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 md:col-span-2">
              <input
                type="checkbox"
                checked={form.gif_loop_tune_enabled}
                onChange={(e) => setForm((prev) => ({ ...prev, gif_loop_tune_enabled: e.target.checked }))}
              />
              启用 GIF 循环闭合窗口调优（自动优化首尾衔接）
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>GIF 最大产出数</span>
              <input
                type="number"
                min={1}
                max={6}
                value={form.gif_candidate_max_outputs}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_candidate_max_outputs: toNumber(e.target.value, prev.gif_candidate_max_outputs),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>长视频最大产出数（≥60s）</span>
              <input
                type="number"
                min={1}
                max={6}
                value={form.gif_candidate_long_video_max_outputs}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_candidate_long_video_max_outputs: toNumber(
                      e.target.value,
                      prev.gif_candidate_long_video_max_outputs
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>超长视频最大产出数（≥150s）</span>
              <input
                type="number"
                min={1}
                max={6}
                value={form.gif_candidate_ultra_video_max_outputs}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_candidate_ultra_video_max_outputs: toNumber(
                      e.target.value,
                      prev.gif_candidate_ultra_video_max_outputs
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>GIF 候选置信阈值（0 关闭）</span>
              <input
                type="number"
                step="0.01"
                min={0}
                max={0.95}
                value={form.gif_candidate_confidence_threshold}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_candidate_confidence_threshold: toNumber(
                      e.target.value,
                      prev.gif_candidate_confidence_threshold
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>GIF 去重 IoU 阈值</span>
              <input
                type="number"
                step="0.01"
                min={0.1}
                max={0.95}
                value={form.gif_candidate_dedup_iou_threshold}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_candidate_dedup_iou_threshold: toNumber(
                      e.target.value,
                      prev.gif_candidate_dedup_iou_threshold
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>GIF 调优最小时长（秒）</span>
              <input
                type="number"
                step="0.1"
                min={0.8}
                max={4}
                value={form.gif_loop_tune_min_enable_sec}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_loop_tune_min_enable_sec: toNumber(e.target.value, prev.gif_loop_tune_min_enable_sec),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>GIF 调优最小提升阈值</span>
              <input
                type="number"
                step="0.005"
                min={0.005}
                max={0.3}
                value={form.gif_loop_tune_min_improvement}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_loop_tune_min_improvement: toNumber(e.target.value, prev.gif_loop_tune_min_improvement),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>GIF 目标运动强度</span>
              <input
                type="number"
                step="0.01"
                min={0.05}
                max={0.8}
                value={form.gif_loop_tune_motion_target}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_loop_tune_motion_target: toNumber(e.target.value, prev.gif_loop_tune_motion_target),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>GIF 偏好时长（秒）</span>
              <input
                type="number"
                step="0.1"
                min={1}
                max={4}
                value={form.gif_loop_tune_prefer_duration_sec}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_loop_tune_prefer_duration_sec: toNumber(
                      e.target.value,
                      prev.gif_loop_tune_prefer_duration_sec
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>GIF 目标体积（KB）</span>
              <input
                type="number"
                min={128}
                max={10240}
                value={form.gif_target_size_kb}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_target_size_kb: toNumber(e.target.value, prev.gif_target_size_kb),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 md:col-span-2">
              <input
                type="checkbox"
                checked={form.gif_gifsicle_enabled}
                onChange={(e) => setForm((prev) => ({ ...prev, gif_gifsicle_enabled: e.target.checked }))}
              />
              启用 Gifsicle 二次压缩（后处理）
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>Gifsicle 压缩等级（1~3）</span>
              <input
                type="number"
                min={1}
                max={3}
                value={form.gif_gifsicle_level}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_gifsicle_level: toNumber(e.target.value, prev.gif_gifsicle_level),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>Gifsicle 跳过阈值（KB）</span>
              <input
                type="number"
                min={0}
                max={4096}
                value={form.gif_gifsicle_skip_below_kb}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_gifsicle_skip_below_kb: toNumber(e.target.value, prev.gif_gifsicle_skip_below_kb),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>Gifsicle 最小收益阈值（0~0.5）</span>
              <input
                type="number"
                step="0.001"
                min={0}
                max={0.5}
                value={form.gif_gifsicle_min_gain_ratio}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_gifsicle_min_gain_ratio: toNumber(e.target.value, prev.gif_gifsicle_min_gain_ratio),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>WebP 目标体积（KB）</span>
              <input
                type="number"
                min={128}
                max={10240}
                value={form.webp_target_size_kb}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    webp_target_size_kb: toNumber(e.target.value, prev.webp_target_size_kb),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>JPG 目标体积（KB）</span>
              <input
                type="number"
                min={64}
                max={10240}
                value={form.jpg_target_size_kb}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    jpg_target_size_kb: toNumber(e.target.value, prev.jpg_target_size_kb),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>PNG 目标体积（KB）</span>
              <input
                type="number"
                min={64}
                max={10240}
                value={form.png_target_size_kb}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    png_target_size_kb: toNumber(e.target.value, prev.png_target_size_kb),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500 md:col-span-2">
              <span>默认抖动模式</span>
              <select
                value={form.gif_dither_mode}
                onChange={(e) => setForm((prev) => ({ ...prev, gif_dither_mode: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              >
                {DITHER_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
            建议：先维持默认值，用 20 条样本观察“可用帧数 + 动图/静态图体积 + 主观清晰度”后再微调。
          </div>
          {updatedAt ? <div className="text-xs text-slate-400">最近更新时间：{updatedAt}</div> : null}
        </div>
      </div>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
          当前标签页聚焦模板治理；打分阈值与质量参数请切换到「打分指标系统」标签查看与调整。
        </div>
      )}
    </div>
  );
}
