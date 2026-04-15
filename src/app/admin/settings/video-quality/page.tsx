"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import PromptSourceBadge, { parsePromptSource } from "@/app/admin/_components/PromptSourceBadge";
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
  ai_director_constraint_override_enabled: boolean;
  ai_director_count_expand_ratio: number;
  ai_director_duration_expand_ratio: number;
  ai_director_count_absolute_cap: number;
  ai_director_duration_absolute_cap_sec: number;
  gif_ai_judge_hard_gate_min_overall_score: number;
  gif_ai_judge_hard_gate_min_clarity_score: number;
  gif_ai_judge_hard_gate_min_loop_score: number;
  gif_ai_judge_hard_gate_min_output_score: number;
  gif_ai_judge_hard_gate_min_duration_ms: number;
  gif_ai_judge_hard_gate_size_multiplier: number;
  format_scope?: string;
  resolved_from?: string[];
  override_version?: string;
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

type VideoQualitySettingAuditField = {
  field?: string;
  old_value?: unknown;
  new_value?: unknown;
};

type VideoQualitySettingAuditItem = {
  id?: number;
  admin_id?: number;
  action?: string;
  change_kind?: string;
  format_scope?: string;
  resolved_from?: string[];
  changed_count?: number;
  changed_fields?: VideoQualitySettingAuditField[];
  created_at?: string;
};

type VideoQualitySettingAuditsResponse = {
  items?: VideoQualitySettingAuditItem[];
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

type AdminVideoImageSplitBackfillTableReport = {
  scanned?: number;
  would_write?: number;
  written?: number;
  skipped_by_format?: number;
  fallback_used?: number;
  failed?: number;
  last_id?: number;
};

type AdminVideoImageSplitBackfillReport = {
  apply?: boolean;
  batch_size?: number;
  format_filter?: string;
  fallback_format?: string;
  stopped?: boolean;
  started_at?: string;
  finished_at?: string;
  jobs?: AdminVideoImageSplitBackfillTableReport;
  outputs?: AdminVideoImageSplitBackfillTableReport;
  packages?: AdminVideoImageSplitBackfillTableReport;
  events?: AdminVideoImageSplitBackfillTableReport;
  feedbacks?: AdminVideoImageSplitBackfillTableReport;
};

type AdminVideoImageSplitBackfillOptions = {
  apply?: boolean;
  batch_size?: number;
  format?: string;
  fallback_format?: string;
  tables?: string;
};

type AdminVideoImageSplitBackfillStatus = {
  running?: boolean;
  stop_requested?: boolean;
  run_id?: string;
  requested_by?: number;
  started_at?: string;
  finished_at?: string;
  heartbeat_at?: string;
  last_error?: string;
  options?: AdminVideoImageSplitBackfillOptions;
  lease?: {
    owner_instance?: string;
    is_local_owner?: boolean;
    timeout_seconds?: number;
    expires_at?: string;
    remaining_seconds?: number;
    can_takeover?: boolean;
  };
  report?: AdminVideoImageSplitBackfillReport;
  history?: AdminVideoImageSplitBackfillHistoryItem[];
};

type AdminVideoImageSplitBackfillHistoryItem = {
  run_id?: string;
  status?: string;
  requested_by?: number;
  started_at?: string;
  finished_at?: string;
  stopped?: boolean;
  last_error?: string;
  options?: AdminVideoImageSplitBackfillOptions;
  report?: AdminVideoImageSplitBackfillReport;
};

type PromptTemplateStage = "ai1" | "ai2" | "scoring" | "ai3";
type PromptTemplateLayer = "editable" | "fixed";
type PromptTemplateTabKey = "ai1" | "ai2" | "scoring" | "ai3";
type PromptTemplateFormat = "all" | "gif" | "webp" | "jpg" | "png" | "live";
type QualityFormatScope = "all" | "gif" | "png" | "jpg" | "webp" | "live" | "mp4";

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

type AdminVideoAIPromptFixedTemplateDetailResponse = {
  item?: AdminVideoAIPromptTemplateItem;
};

type AI1SceneKey = string;

type AI1SceneStrategyDraft = {
  scene_label: string;
  business_goal: string;
  audience: string;
  operator_identity: string;
  style_direction: string;
  candidate_count_min: number;
  candidate_count_max: number;
  directive_hint: string;
  must_capture_bias_text: string;
  avoid_bias_text: string;
  risk_flags_text: string;
  enabled: boolean;
  quality_semantic: number;
  quality_clarity: number;
  quality_loop: number;
  quality_efficiency: number;
  max_blur_tolerance: "low" | "medium" | "high";
  avoid_watermarks: boolean;
  avoid_extreme_dark: boolean;
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
  ai_director_constraint_override_enabled: false,
  ai_director_count_expand_ratio: 0.2,
  ai_director_duration_expand_ratio: 0.2,
  ai_director_count_absolute_cap: 10,
  ai_director_duration_absolute_cap_sec: 6,
  gif_ai_judge_hard_gate_min_overall_score: 0.2,
  gif_ai_judge_hard_gate_min_clarity_score: 0.2,
  gif_ai_judge_hard_gate_min_loop_score: 0.2,
  gif_ai_judge_hard_gate_min_output_score: 0.2,
  gif_ai_judge_hard_gate_min_duration_ms: 200,
  gif_ai_judge_hard_gate_size_multiplier: 4,
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

const QUALITY_FORMAT_OPTIONS: Array<{ value: QualityFormatScope; label: string }> = [
  { value: "all", label: "全局（all）" },
  { value: "gif", label: "GIF" },
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
  { value: "webp", label: "WebP" },
  { value: "live", label: "Live" },
  { value: "mp4", label: "MP4" },
];

const QUALITY_SCOPE_TITLES: Record<QualityFormatScope, string> = {
  all: "视频转图质量",
  gif: "视频转图GIF质量",
  png: "视频转图PNG质量",
  jpg: "视频转图JPG质量",
  webp: "视频转图WebP质量",
  live: "视频转图Live质量",
  mp4: "视频转图MP4质量",
};

const AI1_SCENE_OPTIONS: Array<{ value: AI1SceneKey; label: string; description: string }> = [
  { value: "default", label: "通用截图", description: "默认平衡策略，适合大多数场景" },
  { value: "xiaohongshu", label: "小红书网感", description: "偏重高吸引力封面与清晰特写" },
  { value: "wallpaper", label: "手机壁纸", description: "偏重构图干净、主体居中、竖屏友好" },
  { value: "news", label: "新闻配图", description: "偏重纪实客观、信息表达完整" },
];
const AI1_BUILTIN_SCENE_LABELS: Record<string, string> = AI1_SCENE_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {} as Record<string, string>);
const AI1_BUILTIN_SCENE_DESCRIPTIONS: Record<string, string> = AI1_SCENE_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.description;
  return acc;
}, {} as Record<string, string>);

const AI1_SCENE_BLUR_TOLERANCE_OPTIONS: Array<{ value: "low" | "medium" | "high"; label: string }> = [
  { value: "low", label: "低容忍（更严格）" },
  { value: "medium", label: "中容忍" },
  { value: "high", label: "高容忍（更宽松）" },
];

const AI1_DEFAULT_SCENE_STRATEGY_DRAFTS: Record<AI1SceneKey, AI1SceneStrategyDraft> = {
  default: {
    scene_label: "通用截图",
    business_goal: "extract_high_quality_frames",
    audience: "通用用户",
    operator_identity: "视觉总监",
    style_direction: "balanced_clarity",
    candidate_count_min: 4,
    candidate_count_max: 8,
    directive_hint: "优先输出清晰、可用、构图完整的静态帧。",
    must_capture_bias_text: "主体清晰\n关键内容完整",
    avoid_bias_text: "严重模糊\n全黑或全白曝光异常",
    risk_flags_text: "",
    enabled: true,
    quality_semantic: 0.35,
    quality_clarity: 0.35,
    quality_loop: 0.05,
    quality_efficiency: 0.25,
    max_blur_tolerance: "low",
    avoid_watermarks: true,
    avoid_extreme_dark: true,
  },
  xiaohongshu: {
    scene_label: "小红书网感",
    business_goal: "social_spread",
    audience: "小红书内容受众",
    operator_identity: "时尚视觉总监",
    style_direction: "vivid_contrast_portrait",
    candidate_count_min: 4,
    candidate_count_max: 8,
    directive_hint: "按社交封面标准筛选，优先高吸引力与清晰度。",
    must_capture_bias_text: "高颜值特写\n情绪峰值\n色彩明快",
    avoid_bias_text: "背影遮挡\n低饱和灰雾\n杂乱背景",
    risk_flags_text: "social_style_preferred",
    enabled: true,
    quality_semantic: 0.4,
    quality_clarity: 0.45,
    quality_loop: 0.02,
    quality_efficiency: 0.13,
    max_blur_tolerance: "low",
    avoid_watermarks: true,
    avoid_extreme_dark: true,
  },
  wallpaper: {
    scene_label: "手机壁纸",
    business_goal: "mobile_wallpaper",
    audience: "手机壁纸使用者",
    operator_identity: "壁纸构图编辑",
    style_direction: "clean_centered_wallpaper",
    candidate_count_min: 3,
    candidate_count_max: 6,
    directive_hint: "按壁纸可用性标准筛选，优先构图与纯净度。",
    must_capture_bias_text: "主体居中\n画面干净\n竖屏友好",
    avoid_bias_text: "杂乱背景\n大面积字幕\n边缘主体残缺",
    risk_flags_text: "wallpaper_composition_strict",
    enabled: true,
    quality_semantic: 0.3,
    quality_clarity: 0.5,
    quality_loop: 0.02,
    quality_efficiency: 0.18,
    max_blur_tolerance: "low",
    avoid_watermarks: true,
    avoid_extreme_dark: true,
  },
  news: {
    scene_label: "新闻配图",
    business_goal: "news_illustration",
    audience: "新闻阅读受众",
    operator_identity: "纪实图片编辑",
    style_direction: "documentary_objective",
    candidate_count_min: 3,
    candidate_count_max: 8,
    directive_hint: "按纪实配图标准筛选，保证客观表达。",
    must_capture_bias_text: "事件关键瞬间\n信息量充足\n主体明确",
    avoid_bias_text: "夸张滤镜\n过度美化\n场景失真",
    risk_flags_text: "documentary_objective",
    enabled: true,
    quality_semantic: 0.45,
    quality_clarity: 0.35,
    quality_loop: 0.02,
    quality_efficiency: 0.18,
    max_blur_tolerance: "low",
    avoid_watermarks: true,
    avoid_extreme_dark: true,
  },
};

function deepCloneAI1SceneStrategyDrafts(): Record<AI1SceneKey, AI1SceneStrategyDraft> {
  return JSON.parse(JSON.stringify(AI1_DEFAULT_SCENE_STRATEGY_DRAFTS)) as Record<AI1SceneKey, AI1SceneStrategyDraft>;
}

function normalizeAI1SceneKey(raw: string): string {
  const source = (raw || "").trim().toLowerCase();
  if (!source) return "";
  const normalized = source
    .replace(/[^a-z0-9_\-./\s]+/g, "_")
    .replace(/[.\-/\s]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return normalized;
}

function getAI1DefaultSceneDraft(scene: string): AI1SceneStrategyDraft {
  const key = normalizeAI1SceneKey(scene) || "default";
  const hit = AI1_DEFAULT_SCENE_STRATEGY_DRAFTS[key];
  if (hit) {
    return JSON.parse(JSON.stringify(hit)) as AI1SceneStrategyDraft;
  }
  const base = AI1_DEFAULT_SCENE_STRATEGY_DRAFTS.default;
  const label = AI1_BUILTIN_SCENE_LABELS[key] || key;
  return {
    ...JSON.parse(JSON.stringify(base)),
    scene_label: label,
  } as AI1SceneStrategyDraft;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function splitTagText(value: string): string[] {
  const text = (value || "").trim();
  if (!text) return [];
  return text
    .split(/[\n,，;；]+/g)
    .map((item) => item.trim())
    .filter((item, index, array) => item && array.indexOf(item) === index)
    .slice(0, 16);
}

function joinTagText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => String(item || "").trim())
    .filter((item, index, array) => item && array.indexOf(item) === index)
    .slice(0, 16)
    .join("\n");
}

function normalizeWeight(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "true" || lower === "1") return true;
    if (lower === "false" || lower === "0") return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return fallback;
}

function normalizeBlurTolerance(value: unknown, fallback: "low" | "medium" | "high"): "low" | "medium" | "high" {
  const lower = String(value || "").trim().toLowerCase();
  if (lower === "low" || lower === "medium" || lower === "high") return lower;
  return fallback;
}

function parseAI1SceneStrategyDraftsFromSchema(
  schema?: Record<string, unknown>,
): { version: string; drafts: Record<AI1SceneKey, AI1SceneStrategyDraft> } {
  const drafts = deepCloneAI1SceneStrategyDrafts();
  const schemaRoot = asRecord(schema?.scene_strategies_v1) || asRecord(schema?.scene_strategies) || null;
  const root = schemaRoot || {};
  const version = String((root.version as string) || "png_scene_strategy_v1").trim() || "png_scene_strategy_v1";
  const sceneContainer = asRecord(root.scenes) || root;

  Object.entries(sceneContainer || {}).forEach(([rawSceneKey, rawValue]) => {
    const entry = asRecord(rawValue);
    if (!entry) return;
    const sceneKey = normalizeAI1SceneKey(String(entry.scene || entry.scenario || rawSceneKey || ""));
    if (!sceneKey || sceneKey === "version") return;
    const technicalReject = asRecord(entry.technical_reject) || {};
    const qualityWeights = asRecord(entry.quality_weights) || {};
    const candidateCountBias = asRecord(entry.candidate_count_bias) || {};
    const base = drafts[sceneKey] || getAI1DefaultSceneDraft(sceneKey);
    drafts[sceneKey] = {
      scene_label: String((entry.scene_label as string) || base.scene_label).trim() || base.scene_label,
      business_goal: String((entry.business_goal as string) || base.business_goal).trim() || base.business_goal,
      audience: String((entry.audience as string) || base.audience).trim() || base.audience,
      operator_identity:
        String((entry.operator_identity as string) || base.operator_identity).trim() || base.operator_identity,
      style_direction: String((entry.style_direction as string) || base.style_direction).trim() || base.style_direction,
      candidate_count_min: Math.max(
        1,
        Math.round(
          Number(candidateCountBias.min ?? entry.candidate_count_min ?? base.candidate_count_min) || base.candidate_count_min
        )
      ),
      candidate_count_max: Math.max(
        1,
        Math.round(
          Number(candidateCountBias.max ?? entry.candidate_count_max ?? base.candidate_count_max) || base.candidate_count_max
        )
      ),
      directive_hint: String((entry.directive_hint as string) || base.directive_hint).trim() || base.directive_hint,
      must_capture_bias_text: joinTagText(entry.must_capture_bias) || base.must_capture_bias_text,
      avoid_bias_text: joinTagText(entry.avoid_bias) || base.avoid_bias_text,
      risk_flags_text: joinTagText(entry.risk_flags) || base.risk_flags_text,
      enabled: normalizeBoolean(entry.enabled, base.enabled),
      quality_semantic: normalizeWeight(qualityWeights.semantic, base.quality_semantic),
      quality_clarity: normalizeWeight(qualityWeights.clarity, base.quality_clarity),
      quality_loop: normalizeWeight(qualityWeights.loop, base.quality_loop),
      quality_efficiency: normalizeWeight(qualityWeights.efficiency, base.quality_efficiency),
      max_blur_tolerance: normalizeBlurTolerance(technicalReject.max_blur_tolerance, base.max_blur_tolerance),
      avoid_watermarks: normalizeBoolean(technicalReject.avoid_watermarks, base.avoid_watermarks),
      avoid_extreme_dark: normalizeBoolean(technicalReject.avoid_extreme_dark, base.avoid_extreme_dark),
    };
    if (drafts[sceneKey].candidate_count_max < drafts[sceneKey].candidate_count_min) {
      drafts[sceneKey].candidate_count_max = drafts[sceneKey].candidate_count_min;
    }
  });

  return { version, drafts };
}

function normalizeSceneQualityWeights(draft: AI1SceneStrategyDraft, fallback: AI1SceneStrategyDraft) {
  const semantic = Math.max(0, Number(draft.quality_semantic) || 0);
  const clarity = Math.max(0, Number(draft.quality_clarity) || 0);
  const loop = Math.max(0, Number(draft.quality_loop) || 0);
  const efficiency = Math.max(0, Number(draft.quality_efficiency) || 0);
  const sum = semantic + clarity + loop + efficiency;
  if (sum <= 0) {
    const fallbackSum =
      fallback.quality_semantic + fallback.quality_clarity + fallback.quality_loop + fallback.quality_efficiency;
    return {
      semantic: Number((fallback.quality_semantic / fallbackSum).toFixed(4)),
      clarity: Number((fallback.quality_clarity / fallbackSum).toFixed(4)),
      loop: Number((fallback.quality_loop / fallbackSum).toFixed(4)),
      efficiency: Number((fallback.quality_efficiency / fallbackSum).toFixed(4)),
    };
  }
  return {
    semantic: Number((semantic / sum).toFixed(4)),
    clarity: Number((clarity / sum).toFixed(4)),
    loop: Number((loop / sum).toFixed(4)),
    efficiency: Number((efficiency / sum).toFixed(4)),
  };
}

function buildAI1SceneStrategyTemplateSchema(
  version: string,
  drafts: Record<AI1SceneKey, AI1SceneStrategyDraft>,
): Record<string, unknown> {
  const scenes: Record<string, unknown> = {};
  Object.entries(drafts || {}).forEach(([rawSceneKey, rawDraft]) => {
    const sceneKey = normalizeAI1SceneKey(rawSceneKey);
    if (!sceneKey) return;
    const draft = rawDraft || getAI1DefaultSceneDraft(sceneKey);
    const fallbackDraft = AI1_DEFAULT_SCENE_STRATEGY_DRAFTS[sceneKey] || AI1_DEFAULT_SCENE_STRATEGY_DRAFTS.default;
    const candidateCountMin = Math.max(1, Math.round(Number(draft.candidate_count_min) || fallbackDraft.candidate_count_min));
    const candidateCountMax = Math.max(candidateCountMin, Math.round(Number(draft.candidate_count_max) || fallbackDraft.candidate_count_max));
    scenes[sceneKey] = {
      scene: sceneKey,
      enabled: normalizeBoolean(draft.enabled, true),
      scene_label: draft.scene_label.trim() || fallbackDraft.scene_label,
      business_goal: draft.business_goal.trim() || fallbackDraft.business_goal,
      audience: draft.audience.trim() || fallbackDraft.audience,
      operator_identity: draft.operator_identity.trim() || fallbackDraft.operator_identity,
      style_direction: draft.style_direction.trim() || fallbackDraft.style_direction,
      candidate_count_bias: {
        min: candidateCountMin,
        max: candidateCountMax,
      },
      directive_hint: draft.directive_hint.trim() || fallbackDraft.directive_hint,
      must_capture_bias: splitTagText(draft.must_capture_bias_text),
      avoid_bias: splitTagText(draft.avoid_bias_text),
      risk_flags: splitTagText(draft.risk_flags_text),
      quality_weights: normalizeSceneQualityWeights(draft, fallbackDraft),
      technical_reject: {
        max_blur_tolerance: normalizeBlurTolerance(draft.max_blur_tolerance, fallbackDraft.max_blur_tolerance),
        avoid_watermarks: !!draft.avoid_watermarks,
        avoid_extreme_dark: !!draft.avoid_extreme_dark,
      },
    };
  });
  return {
    scene_strategies_v1: {
      version: version.trim() || "png_scene_strategy_v1",
      scenes,
    },
  };
}

function normalizeQualityFormatScope(value?: string): QualityFormatScope {
  const lower = (value || "").trim().toLowerCase();
  switch (lower) {
    case "gif":
    case "png":
    case "jpg":
    case "webp":
    case "live":
    case "mp4":
      return lower;
    default:
      return "all";
  }
}

function resolveLockedQualityFormatByPath(pathname?: string): QualityFormatScope | null {
  const current = (pathname || "").split("?")[0].replace(/\/+$/, "");
  if (current.endsWith("/admin/settings/video-quality") || current.endsWith("/admin/settings/video-quality/gif")) {
    return "gif";
  }
  if (current.endsWith("/admin/settings/video-quality/png")) {
    return "png";
  }
  if (current.endsWith("/admin/settings/video-quality/jpg")) {
    return "jpg";
  }
  if (current.endsWith("/admin/settings/video-quality/webp")) {
    return "webp";
  }
  if (current.endsWith("/admin/settings/video-quality/live")) {
    return "live";
  }
  if (current.endsWith("/admin/settings/video-quality/mp4")) {
    return "mp4";
  }
  return null;
}

const TEMPLATE_TAB_OPTIONS: Array<{ value: PromptTemplateTabKey; label: string; desc: string }> = [
  { value: "ai1", label: "AI1 模板", desc: "可编辑层 + 固定层" },
  { value: "ai2", label: "AI2 模板", desc: "固定层（提名阶段）" },
  { value: "scoring", label: "打分指标系统", desc: "质量参数 + 固定评分说明" },
  { value: "ai3", label: "AI3 模板", desc: "固定层（复审阶段）" },
];

const PROMPT_STAGE_LABEL: Record<string, string> = {
  ai1: "AI1",
  ai2: "AI2",
  scoring: "SCORING",
  ai3: "AI3",
  default: "DEFAULT",
};

function toNumber(value: string, fallback: number) {
  const raw = value.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function buildAI1ConstraintVariablePayload(form: VideoQualitySetting) {
  return {
    ai_director_constraint_override_enabled: !!form.ai_director_constraint_override_enabled,
    ai_director_count_expand_ratio: form.ai_director_count_expand_ratio,
    ai_director_duration_expand_ratio: form.ai_director_duration_expand_ratio,
    ai_director_count_absolute_cap: form.ai_director_count_absolute_cap,
    ai_director_duration_absolute_cap_sec: form.ai_director_duration_absolute_cap_sec,
  };
}

function formatAI1ConstraintVariableJSON(form: VideoQualitySetting) {
  return JSON.stringify(buildAI1ConstraintVariablePayload(form), null, 2);
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
  if (form.gif_candidate_max_outputs < 1 || form.gif_candidate_max_outputs > 20) {
    return "GIF 最大产出数非法：gif_candidate_max_outputs 必须在 1~20。";
  }
  if (form.gif_candidate_long_video_max_outputs < 1 || form.gif_candidate_long_video_max_outputs > 20) {
    return "长视频最大产出数非法：gif_candidate_long_video_max_outputs 必须在 1~20。";
  }
  if (form.gif_candidate_ultra_video_max_outputs < 1 || form.gif_candidate_ultra_video_max_outputs > 20) {
    return "超长视频最大产出数非法：gif_candidate_ultra_video_max_outputs 必须在 1~20。";
  }
  if (form.gif_candidate_long_video_max_outputs > form.gif_candidate_max_outputs) {
    return "长视频最大产出数非法：必须 <= GIF 最大产出数。";
  }
  if (form.gif_candidate_ultra_video_max_outputs > form.gif_candidate_long_video_max_outputs) {
    return "超长视频最大产出数非法：必须 <= 长视频最大产出数。";
  }
  if (form.ai_director_count_expand_ratio < 0 || form.ai_director_count_expand_ratio > 3) {
    return "AI1 数量扩张比例非法：ai_director_count_expand_ratio 必须在 0~3。";
  }
  if (form.ai_director_duration_expand_ratio < 0 || form.ai_director_duration_expand_ratio > 3) {
    return "AI1 时长扩张比例非法：ai_director_duration_expand_ratio 必须在 0~3。";
  }
  if (form.ai_director_count_absolute_cap < 1 || form.ai_director_count_absolute_cap > 20) {
    return "AI1 数量绝对上限非法：ai_director_count_absolute_cap 必须在 1~20。";
  }
  if (form.ai_director_count_absolute_cap < form.gif_candidate_max_outputs) {
    return "AI1 数量绝对上限非法：必须 >= GIF 最大产出数。";
  }
  if (form.ai_director_duration_absolute_cap_sec < 2 || form.ai_director_duration_absolute_cap_sec > 12) {
    return "AI1 时长绝对上限非法：ai_director_duration_absolute_cap_sec 必须在 2~12 秒。";
  }
  if (form.gif_ai_judge_hard_gate_min_overall_score <= 0 || form.gif_ai_judge_hard_gate_min_overall_score > 1) {
    return "AI3 硬闸门非法：gif_ai_judge_hard_gate_min_overall_score 必须在 (0,1]。";
  }
  if (form.gif_ai_judge_hard_gate_min_clarity_score <= 0 || form.gif_ai_judge_hard_gate_min_clarity_score > 1) {
    return "AI3 硬闸门非法：gif_ai_judge_hard_gate_min_clarity_score 必须在 (0,1]。";
  }
  if (form.gif_ai_judge_hard_gate_min_loop_score <= 0 || form.gif_ai_judge_hard_gate_min_loop_score > 1) {
    return "AI3 硬闸门非法：gif_ai_judge_hard_gate_min_loop_score 必须在 (0,1]。";
  }
  if (form.gif_ai_judge_hard_gate_min_output_score <= 0 || form.gif_ai_judge_hard_gate_min_output_score > 1) {
    return "AI3 硬闸门非法：gif_ai_judge_hard_gate_min_output_score 必须在 (0,1]。";
  }
  if (form.gif_ai_judge_hard_gate_min_duration_ms < 50 || form.gif_ai_judge_hard_gate_min_duration_ms > 10000) {
    return "AI3 硬闸门非法：gif_ai_judge_hard_gate_min_duration_ms 必须在 50~10000。";
  }
  if (form.gif_ai_judge_hard_gate_size_multiplier < 1 || form.gif_ai_judge_hard_gate_size_multiplier > 20) {
    return "AI3 硬闸门非法：gif_ai_judge_hard_gate_size_multiplier 必须在 1~20。";
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

type APIValidationIssue = {
  field_path?: string;
  code?: string;
  message?: string;
};

class AdminRequestError extends Error {
  status: number;
  validationIssues: APIValidationIssue[];

  constructor(message: string, status: number, validationIssues: APIValidationIssue[] = []) {
    super(message);
    this.name = "AdminRequestError";
    this.status = status;
    this.validationIssues = validationIssues;
  }
}

async function parseApiErrorWithValidation(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) return { message: fallback, validationIssues: [] as APIValidationIssue[] };
  try {
    const parsed = JSON.parse(text) as {
      error?: string;
      message?: string;
      validation_issues?: APIValidationIssue[];
    };
    return {
      message: parsed.message || parsed.error || fallback,
      validationIssues: Array.isArray(parsed.validation_issues) ? parsed.validation_issues : [],
    };
  } catch {
    return { message: text || fallback, validationIssues: [] as APIValidationIssue[] };
  }
}

async function buildRequestErrorWithValidation(response: Response, fallback: string) {
  const parsed = await parseApiErrorWithValidation(response, fallback);
  return new AdminRequestError(parsed.message, response.status, parsed.validationIssues);
}

function extractValidationIssues(error: unknown): APIValidationIssue[] {
  if (error instanceof AdminRequestError) return error.validationIssues || [];
  return [];
}

function normalizeIssueMessage(issue: APIValidationIssue) {
  const path = (issue.field_path || "").trim();
  const message = (issue.message || "").trim();
  const code = (issue.code || "").trim();
  if (!path && !code) return message || "参数校验失败";
  const prefix = [path, code].filter(Boolean).join(" · ");
  return message ? `${prefix}：${message}` : prefix;
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

function formatAuditFieldValue(value: unknown) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatPrettyObject(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value ?? "{}");
  }
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

function resolveTemplateFormatByQualityScope(scope: QualityFormatScope): PromptTemplateFormat {
  switch (scope) {
    case "gif":
    case "png":
    case "jpg":
    case "webp":
    case "live":
      return scope;
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
  const router = useRouter();
  const pathname = usePathname();
  const lockedQualityFormat = resolveLockedQualityFormatByPath(pathname);
  const initialQualityFormat = lockedQualityFormat || "all";
  const initialTemplateFormat = resolveTemplateFormatByQualityScope(initialQualityFormat);

  const [form, setForm] = useState<VideoQualitySetting>(DEFAULT_FORM);
  const [baseForm, setBaseForm] = useState<VideoQualitySetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [qualityFormat, setQualityFormat] = useState<QualityFormatScope>(initialQualityFormat);
  const [qualityResolvedFrom, setQualityResolvedFrom] = useState<string[]>([]);
  const [qualityOverrideVersion, setQualityOverrideVersion] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [rolloutEffects, setRolloutEffects] = useState<VideoQualityRolloutEffectCard[]>([]);
  const [rolloutEffectsLoading, setRolloutEffectsLoading] = useState(false);
  const [rolloutEffectsError, setRolloutEffectsError] = useState<string | null>(null);
  const [rolloutEffectsFallbackUsed, setRolloutEffectsFallbackUsed] = useState(false);
  const [qualityAudits, setQualityAudits] = useState<VideoQualitySettingAuditItem[]>([]);
  const [qualityAuditsLoading, setQualityAuditsLoading] = useState(false);
  const [qualityAuditsError, setQualityAuditsError] = useState<string | null>(null);
  const [templateFormat, setTemplateFormat] = useState<PromptTemplateFormat>(initialTemplateFormat);
  const [templateTab, setTemplateTab] = useState<PromptTemplateTabKey>("ai1");
  const [templateItems, setTemplateItems] = useState<AdminVideoAIPromptTemplateItem[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateValidationIssues, setTemplateValidationIssues] = useState<APIValidationIssue[]>([]);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);
  const [templateAudits, setTemplateAudits] = useState<AdminVideoAIPromptTemplateAuditItem[]>([]);
  const [templateAuditsLoading, setTemplateAuditsLoading] = useState(false);
  const [templateVersions, setTemplateVersions] = useState<AdminVideoAIPromptTemplateVersionItem[]>([]);
  const [templateVersionsResolvedFrom, setTemplateVersionsResolvedFrom] = useState("");
  const [templateVersionsLoading, setTemplateVersionsLoading] = useState(false);
  const [templateActivateSaving, setTemplateActivateSaving] = useState(false);
  const [selectedVersionID, setSelectedVersionID] = useState<number>(0);
  const [fixedTemplateViewOpen, setFixedTemplateViewOpen] = useState(false);
  const [fixedTemplateViewLoading, setFixedTemplateViewLoading] = useState(false);
  const [fixedTemplateViewError, setFixedTemplateViewError] = useState<string | null>(null);
  const [fixedTemplateViewItem, setFixedTemplateViewItem] = useState<AdminVideoAIPromptTemplateItem | null>(null);
  const [fixedTemplateViewCompatTip, setFixedTemplateViewCompatTip] = useState<string | null>(null);
  const [ai1EditableEnabled, setAi1EditableEnabled] = useState(true);
  const [ai1EditableVersion, setAi1EditableVersion] = useState("v1");
  const [ai1EditableText, setAi1EditableText] = useState("");
  const [ai1EditableTemplateSchema, setAi1EditableTemplateSchema] = useState<Record<string, unknown>>({});
  const [ai1EditablePNGTemplate, setAi1EditablePNGTemplate] = useState<AdminVideoAIPromptTemplateItem | null>(null);
  const [ai1EditableALLTemplate, setAi1EditableALLTemplate] = useState<AdminVideoAIPromptTemplateItem | null>(null);
  const [ai1EditableChainLoading, setAi1EditableChainLoading] = useState(false);
  const [ai1EditableChainError, setAi1EditableChainError] = useState<string | null>(null);
  const [ai1SceneStrategyVersion, setAi1SceneStrategyVersion] = useState("png_scene_strategy_v1");
  const [ai1SceneStrategyDrafts, setAi1SceneStrategyDrafts] =
    useState<Record<AI1SceneKey, AI1SceneStrategyDraft>>(deepCloneAI1SceneStrategyDrafts());
  const [ai1SceneStrategyScene, setAi1SceneStrategyScene] = useState<AI1SceneKey>("default");
  const [ai1NewSceneKey, setAi1NewSceneKey] = useState("");
  const [ai1NewSceneLabel, setAi1NewSceneLabel] = useState("");
  const [ai1SceneStrategyError, setAi1SceneStrategyError] = useState<string | null>(null);
  const [ai1SceneStrategySuccess, setAi1SceneStrategySuccess] = useState<string | null>(null);
  const [ai1ConstraintJSON, setAi1ConstraintJSON] = useState("");
  const [ai1ConstraintError, setAi1ConstraintError] = useState<string | null>(null);
  const [ai1ConstraintSuccess, setAi1ConstraintSuccess] = useState<string | null>(null);
  const templateVersionSelectRef = useRef<HTMLSelectElement | null>(null);
  const ai1EditableVersionRef = useRef<HTMLInputElement | null>(null);
  const ai1EditableTextRef = useRef<HTMLTextAreaElement | null>(null);
  const ai1SceneStrategyVersionRef = useRef<HTMLInputElement | null>(null);
  const ai1SceneStrategySectionRef = useRef<HTMLDivElement | null>(null);

  const templateResolvedSource = useMemo(() => parsePromptSource(templateVersionsResolvedFrom), [templateVersionsResolvedFrom]);
  const templateResolvedFormat = (templateResolvedSource?.format || "").trim().toLowerCase();
  const templateResolvedStage = (templateResolvedSource?.stage || "").trim().toLowerCase();
  const templateSourceMismatch = useMemo(() => {
    if (!templateResolvedSource) return false;
    if (templateResolvedFormat && templateResolvedFormat !== templateFormat) return true;
    if (templateResolvedStage && templateResolvedStage !== templateTab) return true;
    return false;
  }, [templateResolvedFormat, templateResolvedSource, templateResolvedStage, templateFormat, templateTab]);
  const templateSourceHint = useMemo(() => {
    if (!templateResolvedSource) return "";
    if (templateResolvedFormat && templateResolvedFormat !== templateFormat) {
      return `当前是 ${templateResolvedFormat.toUpperCase()} 作用域回退版本；若要切换，请先切到对应作用域再操作。`;
    }
    if (templateResolvedStage && templateResolvedStage !== templateTab) {
      return `当前是 ${PROMPT_STAGE_LABEL[templateResolvedStage] || templateResolvedStage.toUpperCase()} 阶段回退版本；若要切换，请先切到对应阶段再操作。`;
    }
    return "";
  }, [templateResolvedSource, templateResolvedFormat, templateResolvedStage, templateFormat, templateTab]);

  const hasTemplateValidationIssue = useCallback(
    (matcher: (issue: APIValidationIssue) => boolean) => templateValidationIssues.some((issue) => matcher(issue)),
    [templateValidationIssues]
  );
  const ai1VersionHasIssue = hasTemplateValidationIssue((issue) => (issue.field_path || "").toLowerCase().includes("version"));
  const ai1TemplateTextHasIssue = hasTemplateValidationIssue((issue) => (issue.field_path || "").toLowerCase().includes("template_text"));
  const ai1TemplateSchemaHasIssue = hasTemplateValidationIssue((issue) => {
    const path = (issue.field_path || "").toLowerCase();
    return (
      path.includes("template_json_schema") ||
      path.includes("scene_strategies") ||
      path.includes("quality_weights") ||
      path.includes("candidate_count_bias") ||
      path.includes("technical_reject") ||
      path.includes("must_capture_bias") ||
      path.includes("avoid_bias") ||
      path.includes("risk_flags")
    );
  });

  const focusElement = useCallback((node: HTMLElement | null) => {
    if (!node) return false;
    node.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    node.focus();
    return true;
  }, []);

  const focusTemplateValidationIssue = useCallback(
    (issue: APIValidationIssue) => {
      const path = (issue.field_path || "").toLowerCase();
      const isSchemaIssue =
        path.includes("template_json_schema") ||
        path.includes("scene_strategies") ||
        path.includes("quality_weights") ||
        path.includes("candidate_count_bias") ||
        path.includes("technical_reject") ||
        path.includes("must_capture_bias") ||
        path.includes("avoid_bias") ||
        path.includes("risk_flags");
      const isEditableVersionIssue =
        path.includes("version") &&
        !path.includes("template_id") &&
        !path.includes("stage") &&
        !path.includes("layer") &&
        !path.includes("format");
      const needAI1 = isEditableVersionIssue || path.includes("template_text") || isSchemaIssue;
      const focusTarget = () => {
        if (path.includes("template_id")) {
          focusElement(templateVersionSelectRef.current);
          return;
        }
        if (path.includes("template_text")) {
          focusElement(ai1EditableTextRef.current);
          return;
        }
        if (isSchemaIssue) {
          if (!focusElement(ai1SceneStrategyVersionRef.current)) {
            focusElement(ai1SceneStrategySectionRef.current);
          }
          return;
        }
        if (isEditableVersionIssue) {
          focusElement(ai1EditableVersionRef.current);
          return;
        }
        if (path.includes("format") || path.includes("stage") || path.includes("layer")) {
          focusElement(templateVersionSelectRef.current);
        }
      };
      if (needAI1 && templateTab !== "ai1") {
        setTemplateTab("ai1");
        window.setTimeout(() => {
          focusTarget();
        }, 120);
        return;
      }
      focusTarget();
    },
    [focusElement, templateTab]
  );
  const [splitBackfillStatus, setSplitBackfillStatus] = useState<AdminVideoImageSplitBackfillStatus | null>(null);
  const [splitBackfillLoading, setSplitBackfillLoading] = useState(false);
  const [splitBackfillStarting, setSplitBackfillStarting] = useState(false);
  const [splitBackfillStopping, setSplitBackfillStopping] = useState(false);
  const [splitBackfillApply, setSplitBackfillApply] = useState(false);
  const [splitBackfillBatchSize, setSplitBackfillBatchSize] = useState("500");
  const [splitBackfillFormat, setSplitBackfillFormat] = useState<QualityFormatScope>("all");
  const [splitBackfillTables, setSplitBackfillTables] = useState("jobs,outputs,packages,events,feedbacks");
  const splitBackfillFeatureEnabled = false;

  const activeQualityFormat = normalizeQualityFormatScope(lockedQualityFormat || qualityFormat);
  const qualityTitle = QUALITY_SCOPE_TITLES[activeQualityFormat] || "视频转图质量";
  const qualityScopeLabel =
    QUALITY_FORMAT_OPTIONS.find((item) => item.value === activeQualityFormat)?.label || activeQualityFormat.toUpperCase();

  const dirtyKeys = (() => {
    if (!baseForm) return [] as Array<keyof VideoQualitySetting>;
    return (Object.keys(DEFAULT_FORM) as Array<keyof VideoQualitySetting>).filter((key) => {
      return form[key] !== baseForm[key];
    });
  })();
  const dirtyCount = dirtyKeys.length;
  const splitBackfillReport = splitBackfillStatus?.report || null;
  const splitBackfillLease = splitBackfillStatus?.lease || null;
  const splitBackfillRows = [
    { key: "jobs", label: "Jobs", stats: splitBackfillReport?.jobs },
    { key: "outputs", label: "Outputs", stats: splitBackfillReport?.outputs },
    { key: "packages", label: "Packages", stats: splitBackfillReport?.packages },
    { key: "events", label: "Events", stats: splitBackfillReport?.events },
    { key: "feedbacks", label: "Feedbacks", stats: splitBackfillReport?.feedbacks },
  ];
  const selectedTemplateVersion = useMemo(() => {
    if (!selectedVersionID) return null;
    return templateVersions.find((item) => item.id === selectedVersionID) || null;
  }, [templateVersions, selectedVersionID]);

  const findTemplate = (stage: PromptTemplateStage, layer: PromptTemplateLayer) => {
    return templateItems.find((item) => {
      return normalizePromptTemplateStage(item.stage) === stage && normalizePromptTemplateLayer(item.layer) === layer;
    });
  };

  const ai1SceneOptions = useMemo(() => {
    const keys = new Set<string>(["default"]);
    AI1_SCENE_OPTIONS.forEach((item) => keys.add(item.value));
    Object.keys(ai1SceneStrategyDrafts || {}).forEach((item) => {
      const normalized = normalizeAI1SceneKey(item);
      if (normalized) keys.add(normalized);
    });
    return Array.from(keys).map((sceneKey) => {
      const draft = ai1SceneStrategyDrafts[sceneKey] || getAI1DefaultSceneDraft(sceneKey);
      return {
        value: sceneKey,
        label: draft.scene_label || AI1_BUILTIN_SCENE_LABELS[sceneKey] || sceneKey,
        description:
          AI1_BUILTIN_SCENE_DESCRIPTIONS[sceneKey] || `自定义场景（scene_key=${sceneKey}）`,
        enabled: normalizeBoolean(draft.enabled, true),
        isCustom: !AI1_BUILTIN_SCENE_LABELS[sceneKey],
      };
    });
  }, [ai1SceneStrategyDrafts]);

  const currentSceneDraft = ai1SceneStrategyDrafts[ai1SceneStrategyScene] || getAI1DefaultSceneDraft(ai1SceneStrategyScene);

  const updateCurrentSceneDraft = (patch: Partial<AI1SceneStrategyDraft>) => {
    setAi1SceneStrategyDrafts((prev) => ({
      ...prev,
      [ai1SceneStrategyScene]: {
        ...(prev[ai1SceneStrategyScene] || getAI1DefaultSceneDraft(ai1SceneStrategyScene)),
        ...patch,
      },
    }));
    setAi1SceneStrategyError(null);
    setAi1SceneStrategySuccess(null);
  };

  const resetCurrentSceneDraft = () => {
    setAi1SceneStrategyDrafts((prev) => ({
      ...prev,
      [ai1SceneStrategyScene]: { ...getAI1DefaultSceneDraft(ai1SceneStrategyScene) },
    }));
    setAi1SceneStrategyError(null);
    setAi1SceneStrategySuccess(`已重置「${ai1SceneOptions.find((x) => x.value === ai1SceneStrategyScene)?.label || "当前场景"}」策略。`);
  };

  const resetAllSceneDrafts = () => {
    setAi1SceneStrategyDrafts(deepCloneAI1SceneStrategyDrafts());
    setAi1SceneStrategyScene("default");
    setAi1NewSceneKey("");
    setAi1NewSceneLabel("");
    setAi1SceneStrategyVersion("png_scene_strategy_v1");
    setAi1SceneStrategyError(null);
    setAi1SceneStrategySuccess("已重置全部场景策略为系统默认。");
  };

  const addCustomSceneDraft = () => {
    const sceneKey = normalizeAI1SceneKey(ai1NewSceneKey);
    if (!sceneKey) {
      setAi1SceneStrategyError("请填写合法的 scene_key（仅英文/数字/下划线）。");
      return;
    }
    if (sceneKey === "all") {
      setAi1SceneStrategyError("scene_key 不能为 all。");
      return;
    }
    const base = getAI1DefaultSceneDraft(sceneKey);
    const label = (ai1NewSceneLabel || "").trim() || sceneKey;
    setAi1SceneStrategyDrafts((prev) => ({
      ...prev,
      [sceneKey]: {
        ...(prev[sceneKey] || base),
        scene_label: label,
      },
    }));
    setAi1SceneStrategyScene(sceneKey);
    setAi1NewSceneKey("");
    setAi1NewSceneLabel("");
    setAi1SceneStrategyError(null);
    setAi1SceneStrategySuccess(`已新增场景「${label}」（scene_key=${sceneKey}）。`);
  };

  const removeCurrentCustomScene = () => {
    if (AI1_BUILTIN_SCENE_LABELS[ai1SceneStrategyScene]) {
      setAi1SceneStrategyError("内置场景不允许删除，可使用“重置当前场景”。");
      return;
    }
    setAi1SceneStrategyDrafts((prev) => {
      const next = { ...prev };
      delete next[ai1SceneStrategyScene];
      return next;
    });
    setAi1SceneStrategyScene("default");
    setAi1SceneStrategyError(null);
    setAi1SceneStrategySuccess(`已删除自定义场景 ${ai1SceneStrategyScene}。`);
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

  const loadPromptTemplates = useCallback(async (format: PromptTemplateFormat) => {
    setTemplateLoading(true);
    setTemplateError(null);
    setTemplateValidationIssues([]);
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
      const editableSchema = (ai1Editable?.template_json_schema || {}) as Record<string, unknown>;
      setAi1EditableTemplateSchema(editableSchema);
      const parsedSceneStrategy = parseAI1SceneStrategyDraftsFromSchema(editableSchema);
      setAi1SceneStrategyVersion(parsedSceneStrategy.version);
      setAi1SceneStrategyDrafts(parsedSceneStrategy.drafts);
      setAi1SceneStrategyScene((prev) => {
        if (parsedSceneStrategy.drafts[prev]) return prev;
        return parsedSceneStrategy.drafts.default ? "default" : Object.keys(parsedSceneStrategy.drafts)[0] || "default";
      });
      setAi1SceneStrategyError(null);
      setAi1SceneStrategySuccess(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载 AI 模板失败";
      setTemplateError(message);
      setTemplateValidationIssues(extractValidationIssues(err));
      setTemplateItems([]);
      setAi1EditableEnabled(true);
      setAi1EditableVersion("v1");
      setAi1EditableText("");
      setAi1EditableTemplateSchema({});
      setAi1SceneStrategyVersion("png_scene_strategy_v1");
      setAi1SceneStrategyDrafts(deepCloneAI1SceneStrategyDrafts());
      setAi1SceneStrategyError(null);
      setAi1SceneStrategySuccess(null);
    } finally {
      setTemplateLoading(false);
    }
  }, []);

  const loadAI1EditableTemplateChain = useCallback(async () => {
    setAi1EditableChainLoading(true);
    setAi1EditableChainError(null);
    try {
      const fetchEditable = async (format: PromptTemplateFormat) => {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates?format=${format}`);
        if (!res.ok) throw new Error(await parseApiError(res, `加载 ${format.toUpperCase()} AI1 模板失败`));
        const data = (await res.json()) as AdminVideoAIPromptTemplatesResponse;
        const items = Array.isArray(data.items) ? data.items : [];
        return (
          items.find((item) => {
            return normalizePromptTemplateStage(item.stage) === "ai1" && normalizePromptTemplateLayer(item.layer) === "editable";
          }) || null
        );
      };

      const [pngItem, allItem] = await Promise.all([fetchEditable("png"), fetchEditable("all")]);
      setAi1EditablePNGTemplate(pngItem);
      setAi1EditableALLTemplate(allItem);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载 AI1 模板链路失败";
      setAi1EditableChainError(message);
      setAi1EditablePNGTemplate(null);
      setAi1EditableALLTemplate(null);
    } finally {
      setAi1EditableChainLoading(false);
    }
  }, []);

  const loadPromptTemplateAudits = useCallback(async (format: PromptTemplateFormat, tab: PromptTemplateTabKey) => {
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
  }, []);

  const loadPromptTemplateVersions = useCallback(async (format: PromptTemplateFormat, tab: PromptTemplateTabKey) => {
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
  }, []);

  const loadFixedTemplateDetail = useCallback(async (templateID: number) => {
    if (!templateID) {
      setFixedTemplateViewError("请选择一个版本。");
      setFixedTemplateViewItem(null);
      return;
    }
    setFixedTemplateViewLoading(true);
    setFixedTemplateViewError(null);
    setFixedTemplateViewCompatTip(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates/fixed/${templateID}`);
      if (!res.ok) {
        if (res.status === 404) {
          const picked = templateVersions.find((item) => item.id === templateID);
          if (!picked) throw new Error("未找到该版本信息。");
          const stage = normalizePromptTemplateStage(picked.stage) || templateTab;
          let fallbackText =
            templateItems.find((item) => item.id === templateID)?.template_text ||
            templateItems.find((item) => {
              return (
                normalizePromptTemplateStage(item.stage) === stage &&
                normalizePromptTemplateLayer(item.layer) === "fixed" &&
                !!item.is_active
              );
            })?.template_text ||
            "";
          if (!fallbackText) {
            fallbackText = "（当前后端版本未提供 fixed 详情接口，无法读取该历史版本正文。请升级 backend 后查看。）";
          }
          setFixedTemplateViewItem({
            id: picked.id,
            format: (picked.format || templateFormat).toLowerCase(),
            stage: (picked.stage || templateTab).toLowerCase(),
            layer: "fixed",
            template_text: fallbackText,
            template_json_schema: {},
            enabled: !!picked.enabled,
            version: (picked.version || "").trim(),
            is_active: !!picked.is_active,
            resolved_from:
              ((picked.format || templateFormat).toLowerCase() || "all") +
              "/" +
              ((picked.stage || templateTab).toLowerCase() || "default"),
            updated_at: picked.updated_at || "",
          });
          setFixedTemplateViewCompatTip("当前后端未上线 /fixed/:id 接口，已使用兼容模式展示。");
          return;
        }
        throw new Error(await parseApiError(res, "加载固定模板详情失败"));
      }
      const data = (await res.json()) as AdminVideoAIPromptFixedTemplateDetailResponse;
      if (!data.item || !data.item.id) throw new Error("模板详情为空");
      setFixedTemplateViewItem(data.item);
      setFixedTemplateViewCompatTip(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载固定模板详情失败";
      setFixedTemplateViewError(message);
      setFixedTemplateViewItem(null);
      setFixedTemplateViewCompatTip(null);
    } finally {
      setFixedTemplateViewLoading(false);
    }
  }, [templateFormat, templateItems, templateTab, templateVersions]);

  const openFixedTemplateViewer = async () => {
    if (!selectedVersionID) {
      setTemplateError("请先选择要查看的版本。");
      return;
    }
    setFixedTemplateViewOpen(true);
    await loadFixedTemplateDetail(selectedVersionID);
  };

  const openFixedTemplateListPage = () => {
    const params = new URLSearchParams();
    params.set("format", templateFormat);
    params.set("stage", templateTab);
    router.push(`/admin/settings/video-quality/fixed-templates?${params.toString()}`);
  };

  const activateFixedTemplateVersion = async () => {
    setTemplateValidationIssues([]);
    const stage = templateTab;
    const layer = "fixed";
    if (!selectedVersionID) {
      setTemplateError("请选择要切换的版本。");
      return;
    }
    if (templateSourceMismatch) {
      setTemplateError(templateSourceHint || "当前展示为回退版本，请切换到对应作用域后再执行版本切换。");
      return;
    }
    setTemplateActivateSaving(true);
    setTemplateError(null);
    setTemplateValidationIssues([]);
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
      if (!res.ok) throw await buildRequestErrorWithValidation(res, "切换模板版本失败");
      await loadPromptTemplateVersions(templateFormat, templateTab);
      await loadPromptTemplates(templateFormat);
      await loadPromptTemplateAudits(templateFormat, templateTab);
      setTemplateSuccess(`已切换 ${stage.toUpperCase()} 固定层版本。`);
      setTemplateValidationIssues([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "切换模板版本失败";
      setTemplateError(message);
      setTemplateValidationIssues(extractValidationIssues(err));
    } finally {
      setTemplateActivateSaving(false);
    }
  };

  const saveAI1EditableTemplate = async () => {
    setTemplateValidationIssues([]);
    const canEditSceneStrategy = templateFormat === "png" || templateFormat === "all";
    if (!ai1EditableVersion.trim()) {
      setTemplateError("AI1 可编辑层版本不能为空。");
      setTemplateValidationIssues([{ field_path: "version", code: "invalid_version", message: "AI1 可编辑层版本不能为空。" }]);
      setTemplateSuccess(null);
      return;
    }
    if (ai1EditableVersion.trim().length > 64) {
      setTemplateError("AI1 可编辑层版本长度不能超过 64 个字符。");
      setTemplateValidationIssues([{ field_path: "version", code: "invalid_version", message: "AI1 可编辑层版本长度不能超过 64 个字符。" }]);
      setTemplateSuccess(null);
      return;
    }
    if (ai1EditableText.length > 16000) {
      setTemplateError("AI1 可编辑层模板正文不能超过 16000 个字符。");
      setTemplateValidationIssues([
        { field_path: "template_text", code: "invalid_template_text", message: "AI1 可编辑层模板正文不能超过 16000 个字符。" },
      ]);
      setTemplateSuccess(null);
      return;
    }
    if (canEditSceneStrategy) {
      if (!ai1SceneStrategyVersion.trim()) {
        setTemplateError("PNG 场景策略版本不能为空。");
        setTemplateValidationIssues([
          { field_path: "template_json_schema.scene_strategies_v1.version", code: "invalid_schema", message: "PNG 场景策略版本不能为空。" },
        ]);
        setTemplateSuccess(null);
        return;
      }
      if (ai1SceneStrategyVersion.trim().length > 64) {
        setTemplateError("PNG 场景策略版本长度不能超过 64 个字符。");
        setTemplateValidationIssues([
          {
            field_path: "template_json_schema.scene_strategies_v1.version",
            code: "invalid_schema",
            message: "PNG 场景策略版本长度不能超过 64 个字符。",
          },
        ]);
        setTemplateSuccess(null);
        return;
      }
    }
    setTemplateSaving(true);
    setTemplateError(null);
    setTemplateValidationIssues([]);
    setTemplateSuccess(null);
    setAi1SceneStrategyError(null);
    setAi1SceneStrategySuccess(null);
    try {
      const sceneStrategySchema = canEditSceneStrategy
        ? buildAI1SceneStrategyTemplateSchema(ai1SceneStrategyVersion, ai1SceneStrategyDrafts)
        : {};
      const mergedTemplateSchema: Record<string, unknown> = canEditSceneStrategy
        ? {
            ...(ai1EditableTemplateSchema || {}),
            ...sceneStrategySchema,
          }
        : {
            ...(ai1EditableTemplateSchema || {}),
          };
      const payload = {
        format: templateFormat,
        items: [
          {
            stage: "ai1",
            layer: "editable",
            enabled: ai1EditableEnabled,
            version: ai1EditableVersion.trim(),
            template_text: ai1EditableText,
            template_json_schema: mergedTemplateSchema,
          },
        ],
      };
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw await buildRequestErrorWithValidation(res, "保存 AI1 可编辑层失败");
      const data = (await res.json()) as AdminVideoAIPromptTemplatesResponse;
      const normalizedItems = Array.isArray(data.items) ? data.items : [];
      setTemplateItems(normalizedItems);
      const updated = normalizedItems.find((item) => {
        return normalizePromptTemplateStage(item.stage) === "ai1" && normalizePromptTemplateLayer(item.layer) === "editable";
      });
      setAi1EditableEnabled(updated?.enabled ?? ai1EditableEnabled);
      setAi1EditableVersion((updated?.version || ai1EditableVersion).trim() || "v1");
      setAi1EditableText(updated?.template_text ?? ai1EditableText);
      const updatedSchema = (updated?.template_json_schema || mergedTemplateSchema) as Record<string, unknown>;
      setAi1EditableTemplateSchema(updatedSchema);
      const parsedSceneStrategy = parseAI1SceneStrategyDraftsFromSchema(updatedSchema);
      setAi1SceneStrategyVersion(parsedSceneStrategy.version);
      setAi1SceneStrategyDrafts(parsedSceneStrategy.drafts);
      await loadPromptTemplateAudits(templateFormat, templateTab);
      await loadAI1EditableTemplateChain();
      setTemplateSuccess(`AI1 可编辑层模板已保存（format=${templateFormat}）。`);
      setTemplateValidationIssues([]);
      if (canEditSceneStrategy) {
        setAi1SceneStrategySuccess("PNG 场景策略组已同步保存。");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "保存 AI1 可编辑层失败";
      setTemplateError(message);
      setTemplateValidationIssues(extractValidationIssues(err));
      if (canEditSceneStrategy) {
        setAi1SceneStrategyError(message);
      }
    } finally {
      setTemplateSaving(false);
    }
  };

  const resetAI1ConstraintJSONFromForm = () => {
    setAi1ConstraintJSON(formatAI1ConstraintVariableJSON(form));
    setAi1ConstraintError(null);
    setAi1ConstraintSuccess("已按当前参数重建 JSON。");
  };

  const applyAI1ConstraintJSONToForm = () => {
    setAi1ConstraintError(null);
    setAi1ConstraintSuccess(null);
    try {
      const parsed = JSON.parse(ai1ConstraintJSON || "{}") as Record<string, unknown>;
      const nextPatch: Partial<VideoQualitySetting> = {};
      if ("ai_director_constraint_override_enabled" in parsed) {
        nextPatch.ai_director_constraint_override_enabled = Boolean(parsed.ai_director_constraint_override_enabled);
      }
      if ("ai_director_count_expand_ratio" in parsed) {
        const value = Number(parsed.ai_director_count_expand_ratio);
        if (!Number.isFinite(value)) throw new Error("ai_director_count_expand_ratio 不是合法数字");
        if (value < 0 || value > 3) throw new Error("ai_director_count_expand_ratio 超出范围（0~3）");
        nextPatch.ai_director_count_expand_ratio = value;
      }
      if ("ai_director_duration_expand_ratio" in parsed) {
        const value = Number(parsed.ai_director_duration_expand_ratio);
        if (!Number.isFinite(value)) throw new Error("ai_director_duration_expand_ratio 不是合法数字");
        if (value < 0 || value > 3) throw new Error("ai_director_duration_expand_ratio 超出范围（0~3）");
        nextPatch.ai_director_duration_expand_ratio = value;
      }
      if ("ai_director_count_absolute_cap" in parsed) {
        const value = Number(parsed.ai_director_count_absolute_cap);
        if (!Number.isFinite(value)) throw new Error("ai_director_count_absolute_cap 不是合法数字");
        if (value < 1 || value > 20) throw new Error("ai_director_count_absolute_cap 超出范围（1~20）");
        nextPatch.ai_director_count_absolute_cap = value;
      }
      if ("ai_director_duration_absolute_cap_sec" in parsed) {
        const value = Number(parsed.ai_director_duration_absolute_cap_sec);
        if (!Number.isFinite(value)) throw new Error("ai_director_duration_absolute_cap_sec 不是合法数字");
        if (value < 2 || value > 12) throw new Error("ai_director_duration_absolute_cap_sec 超出范围（2~12）");
        nextPatch.ai_director_duration_absolute_cap_sec = value;
      }

      if (
        typeof nextPatch.ai_director_count_absolute_cap === "number" &&
        nextPatch.ai_director_count_absolute_cap < form.gif_candidate_max_outputs
      ) {
        throw new Error("ai_director_count_absolute_cap 不能小于 gif_candidate_max_outputs");
      }

      setForm((prev) => ({
        ...prev,
        ...nextPatch,
      }));
      setAi1ConstraintSuccess("已应用 JSON 变量到当前配置（需点顶部“保存配置”才会落库）。");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "JSON 解析失败";
      setAi1ConstraintError(message);
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

  const loadQualityAudits = async (limit = 10) => {
    setQualityAuditsLoading(true);
    setQualityAuditsError(null);
    try {
      const params = new URLSearchParams();
      params.set("format", qualityFormat);
      params.set("limit", String(limit));
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/quality-settings/audits?${params.toString()}`);
      if (!res.ok) throw new Error(await parseApiError(res, "加载质量配置审计失败"));
      const data = (await res.json()) as VideoQualitySettingAuditsResponse;
      setQualityAudits(Array.isArray(data.items) ? data.items : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载质量配置审计失败";
      setQualityAuditsError(message);
      setQualityAudits([]);
    } finally {
      setQualityAuditsLoading(false);
    }
  };

  const loadSplitBackfillStatus = useCallback(async (silent = false) => {
    if (!silent) setSplitBackfillLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/split-backfill`);
      if (!res.ok) throw new Error(await parseApiError(res, "加载分表回填状态失败"));
      const data = (await res.json()) as AdminVideoImageSplitBackfillStatus;
      setSplitBackfillStatus(data);
    } catch (err: unknown) {
      if (!silent) {
        const message = err instanceof Error ? err.message : "加载分表回填状态失败";
        setError(message);
      }
    } finally {
      if (!silent) setSplitBackfillLoading(false);
    }
  }, []);

  const startSplitBackfill = async () => {
    setSplitBackfillStarting(true);
    setError(null);
    setSuccess(null);
    try {
      const batchSize = Math.max(1, Math.min(5000, Number(splitBackfillBatchSize || 0) || 500));
      const payload = {
        apply: splitBackfillApply,
        batch_size: batchSize,
        format: splitBackfillFormat === "all" ? "" : splitBackfillFormat,
        tables: splitBackfillTables.trim() || "jobs,outputs,packages,events,feedbacks",
      };
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/split-backfill/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as
        | AdminVideoImageSplitBackfillStatus
        | { error?: string; status?: AdminVideoImageSplitBackfillStatus }
        | null;
      if (!res.ok) {
        if (data && typeof data === "object" && "status" in data && data.status) {
          setSplitBackfillStatus(data.status);
        }
        throw new Error(
          (data && typeof data === "object" && "error" in data && data.error ? data.error : "") || "启动分表回填失败"
        );
      }
      if (data && typeof data === "object" && "running" in data) {
        setSplitBackfillStatus(data as AdminVideoImageSplitBackfillStatus);
      } else {
        await loadSplitBackfillStatus(true);
      }
      setSuccess("分表回填任务已启动。");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "启动分表回填失败";
      setError(message);
    } finally {
      setSplitBackfillStarting(false);
    }
  };

  const stopSplitBackfill = async () => {
    setSplitBackfillStopping(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/split-backfill/stop`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await parseApiError(res, "停止分表回填失败"));
      const data = (await res.json()) as AdminVideoImageSplitBackfillStatus;
      setSplitBackfillStatus(data);
      setSuccess("已发送停止信号。");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "停止分表回填失败";
      setError(message);
    } finally {
      setSplitBackfillStopping(false);
    }
  };

  useEffect(() => {
    if (!lockedQualityFormat) {
      return;
    }
    const normalized = normalizeQualityFormatScope(lockedQualityFormat);
    if (qualityFormat !== normalized) {
      setQualityFormat(normalized);
    }
    const fixedTemplate = resolveTemplateFormatByQualityScope(normalized);
    if (templateFormat !== fixedTemplate) {
      setTemplateFormat(fixedTemplate);
    }
  }, [lockedQualityFormat, qualityFormat, templateFormat]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setRolloutEffectsLoading(true);
      setRolloutEffectsError(null);
      setQualityAuditsLoading(true);
      setQualityAuditsError(null);
      setError(null);
      setSuccess(null);
      try {
        const qualityParams = new URLSearchParams();
        qualityParams.set("format", qualityFormat);
        const qualityAuditParams = new URLSearchParams();
        qualityAuditParams.set("format", qualityFormat);
        qualityAuditParams.set("limit", "10");
        const [settingRes, effectsResult, auditsRes] = await Promise.all([
          fetchWithAuth(`${API_BASE}/api/admin/video-jobs/quality-settings?${qualityParams.toString()}`),
          fetchRolloutEffects(6),
          fetchWithAuth(`${API_BASE}/api/admin/video-jobs/quality-settings/audits?${qualityAuditParams.toString()}`),
        ]);
        if (!settingRes.ok) throw new Error(await parseApiError(settingRes, "加载失败"));
        const data = (await settingRes.json()) as VideoQualitySetting;
        const merged = { ...DEFAULT_FORM, ...data };
        setForm(merged);
        setBaseForm(merged);
        setAi1ConstraintJSON(formatAI1ConstraintVariableJSON(merged));
        setAi1ConstraintError(null);
        setAi1ConstraintSuccess(null);
        setUpdatedAt(data.updated_at || "");
        setQualityResolvedFrom(Array.isArray(data.resolved_from) ? data.resolved_from.filter(Boolean) : []);
        setQualityOverrideVersion((data.override_version || "").trim());
        setRolloutEffects(effectsResult.items);
        setRolloutEffectsFallbackUsed(effectsResult.fallbackUsed);
        setRolloutEffectsError(null);
        if (!auditsRes.ok) throw new Error(await parseApiError(auditsRes, "加载质量配置审计失败"));
        const auditsData = (await auditsRes.json()) as VideoQualitySettingAuditsResponse;
        setQualityAudits(Array.isArray(auditsData.items) ? auditsData.items : []);
        setQualityAuditsError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "加载失败";
        setError(message);
        setRolloutEffectsFallbackUsed(false);
        setQualityAudits([]);
        setBaseForm(null);
        setAi1ConstraintJSON(formatAI1ConstraintVariableJSON(DEFAULT_FORM));
        setAi1ConstraintError(null);
        setAi1ConstraintSuccess(null);
        setQualityResolvedFrom([]);
        setQualityOverrideVersion("");
      } finally {
        setLoading(false);
        setRolloutEffectsLoading(false);
        setQualityAuditsLoading(false);
      }
    };
    void load();
  }, [qualityFormat]);

  useEffect(() => {
    void loadPromptTemplates(templateFormat);
  }, [templateFormat, loadPromptTemplates]);

  useEffect(() => {
    if (templateTab !== "ai1") return;
    if (templateFormat !== "png" && templateFormat !== "all") {
      setAi1EditablePNGTemplate(null);
      setAi1EditableALLTemplate(null);
      setAi1EditableChainError(null);
      return;
    }
    void loadAI1EditableTemplateChain();
  }, [templateFormat, templateTab, loadAI1EditableTemplateChain]);

  useEffect(() => {
    void loadPromptTemplateAudits(templateFormat, templateTab);
  }, [templateFormat, templateTab, loadPromptTemplateAudits]);

  useEffect(() => {
    void loadPromptTemplateVersions(templateFormat, templateTab);
  }, [templateFormat, templateTab, loadPromptTemplateVersions]);

  useEffect(() => {
    setFixedTemplateViewOpen(false);
    setFixedTemplateViewError(null);
    setFixedTemplateViewItem(null);
    setFixedTemplateViewCompatTip(null);
  }, [templateFormat, templateTab]);

  useEffect(() => {
    if (!splitBackfillFeatureEnabled) {
      return;
    }
    void loadSplitBackfillStatus();
    const timer = window.setInterval(() => {
      void loadSplitBackfillStatus(true);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [loadSplitBackfillStatus, splitBackfillFeatureEnabled]);

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
      const params = new URLSearchParams();
      params.set("format", qualityFormat);
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/quality-settings?${params.toString()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await parseApiError(res, "保存失败"));
      const data = (await res.json()) as VideoQualitySetting;
      const merged = { ...DEFAULT_FORM, ...data };
      setForm(merged);
      setBaseForm(merged);
      setAi1ConstraintJSON(formatAI1ConstraintVariableJSON(merged));
      setAi1ConstraintError(null);
      setAi1ConstraintSuccess(null);
      setUpdatedAt(data.updated_at || "");
      setQualityResolvedFrom(Array.isArray(data.resolved_from) ? data.resolved_from.filter(Boolean) : []);
      setQualityOverrideVersion((data.override_version || "").trim());
      setSuccess(`已保存视频转图质量配置（scope=${qualityFormat}，${dirtyCount} 项变更）。`);
      void loadQualityAudits(10);
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
        <SectionHeader title={qualityTitle} description="加载中..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title={qualityTitle}
        description={
          lockedQualityFormat
            ? `当前为 ${qualityScopeLabel} 专属配置页（固定格式，不支持切换作用域）。`
            : "配置帧质量过滤阈值与 GIF 输出参数，目标是“更清晰 + 更稳定 + 更有代表性”。"
        }
        actions={
          <div className="flex items-center gap-2">
            {lockedQualityFormat ? (
              <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                作用域：{qualityScopeLabel}
              </span>
            ) : (
              <label className="text-xs text-slate-500">
                <span className="sr-only">配置作用域</span>
                <select
                  value={qualityFormat}
                  onChange={(e) => setQualityFormat(normalizeQualityFormatScope(e.target.value))}
                  className="min-w-[140px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500"
                >
                  {QUALITY_FORMAT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              onClick={() => void save()}
              disabled={saving || !baseForm}
              title={!baseForm ? "配置未加载成功，禁止保存" : undefined}
            >
              {saving ? "保存中..." : dirtyCount > 0 ? `保存配置（${dirtyCount}）` : "保存配置"}
            </button>
          </div>
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

      {splitBackfillFeatureEnabled ? (
        <div className="space-y-3 rounded-3xl border border-cyan-100 bg-cyan-50/40 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-cyan-800">历史任务分表回填（base → format split）</h3>
            <p className="mt-1 text-xs text-cyan-700/80">
              用于将旧数据迁移到各格式独立分表，支持 dry-run / apply、可停止、可断点续跑。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                splitBackfillStatus?.running ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
              }`}
            >
              {splitBackfillStatus?.running ? "运行中" : "空闲"}
            </span>
            {splitBackfillStatus?.stop_requested ? (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">停止中</span>
            ) : null}
            {splitBackfillReport?.stopped ? (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">已停止</span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-12">
          <label className="flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={splitBackfillApply}
              onChange={(e) => setSplitBackfillApply(e.target.checked)}
              disabled={Boolean(splitBackfillStatus?.running)}
            />
            apply 写入
          </label>
          <input
            value={splitBackfillBatchSize}
            onChange={(e) => setSplitBackfillBatchSize(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 md:col-span-2"
            placeholder="batch-size"
            disabled={Boolean(splitBackfillStatus?.running)}
          />
          <select
            value={splitBackfillFormat}
            onChange={(e) => setSplitBackfillFormat(normalizeQualityFormatScope(e.target.value))}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 md:col-span-2"
            disabled={Boolean(splitBackfillStatus?.running)}
          >
            <option value="all">格式：all</option>
            <option value="gif">格式：gif</option>
            <option value="png">格式：png</option>
            <option value="jpg">格式：jpg</option>
            <option value="webp">格式：webp</option>
            <option value="live">格式：live</option>
            <option value="mp4">格式：mp4</option>
          </select>
          <input
            value={splitBackfillTables}
            onChange={(e) => setSplitBackfillTables(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 md:col-span-3"
            placeholder="jobs,outputs,packages,events,feedbacks"
            disabled={Boolean(splitBackfillStatus?.running)}
          />
          <button
            type="button"
            className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60 md:col-span-1"
            onClick={() => void startSplitBackfill()}
            disabled={splitBackfillStarting || Boolean(splitBackfillStatus?.running)}
          >
            {splitBackfillStarting ? "启动中..." : "启动"}
          </button>
          <button
            type="button"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60 md:col-span-1"
            onClick={() => void stopSplitBackfill()}
            disabled={splitBackfillStopping || !Boolean(splitBackfillStatus?.running)}
          >
            {splitBackfillStopping ? "停止中..." : "停止"}
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 md:col-span-1"
            onClick={() => void loadSplitBackfillStatus()}
            disabled={splitBackfillLoading}
          >
            刷新
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
          <span>RunID: {splitBackfillStatus?.run_id || "-"}</span>
          <span>开始: {formatTime(splitBackfillStatus?.started_at || splitBackfillReport?.started_at)}</span>
          <span>心跳: {formatTime(splitBackfillStatus?.heartbeat_at)}</span>
          <span>结束: {formatTime(splitBackfillStatus?.finished_at || splitBackfillReport?.finished_at)}</span>
          <span>执行人: #{splitBackfillStatus?.requested_by || 0}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
          <span>运行实例: {splitBackfillLease?.owner_instance || "-"}</span>
          <span>租约到期: {formatTime(splitBackfillLease?.expires_at)}</span>
          <span>
            租约剩余:
            {splitBackfillStatus?.running
              ? `${Math.max(0, Number(splitBackfillLease?.remaining_seconds || 0)).toLocaleString()}s`
              : "-"}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${
              splitBackfillLease?.can_takeover ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {splitBackfillLease?.can_takeover ? "可接管" : "租约有效"}
          </span>
          {splitBackfillLease?.is_local_owner ? (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700">本实例持有</span>
          ) : null}
          <span>超时阈值: {Number(splitBackfillLease?.timeout_seconds || 0)}s</span>
        </div>

        {splitBackfillStatus?.last_error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            最近错误：{splitBackfillStatus.last_error}
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-cyan-100 bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-cyan-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">表</th>
                <th className="px-3 py-2 text-right font-semibold">scanned</th>
                <th className="px-3 py-2 text-right font-semibold">would_write</th>
                <th className="px-3 py-2 text-right font-semibold">written</th>
                <th className="px-3 py-2 text-right font-semibold">skipped</th>
                <th className="px-3 py-2 text-right font-semibold">fallback</th>
                <th className="px-3 py-2 text-right font-semibold">failed</th>
                <th className="px-3 py-2 text-right font-semibold">last_id</th>
              </tr>
            </thead>
            <tbody>
              {splitBackfillRows.map((item) => (
                <tr key={item.key} className="border-t border-cyan-50 text-slate-700">
                  <td className="px-3 py-2 font-semibold">{item.label}</td>
                  <td className="px-3 py-2 text-right">{Number(item.stats?.scanned || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{Number(item.stats?.would_write || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{Number(item.stats?.written || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{Number(item.stats?.skipped_by_format || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{Number(item.stats?.fallback_used || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{Number(item.stats?.failed || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{Number(item.stats?.last_id || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-cyan-100 bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-cyan-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">最近执行</th>
                <th className="px-3 py-2 text-left font-semibold">状态</th>
                <th className="px-3 py-2 text-left font-semibold">参数</th>
                <th className="px-3 py-2 text-right font-semibold">written</th>
                <th className="px-3 py-2 text-right font-semibold">failed</th>
                <th className="px-3 py-2 text-left font-semibold">开始/结束</th>
              </tr>
            </thead>
            <tbody>
              {(splitBackfillStatus?.history || []).length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={6}>
                    暂无历史执行记录
                  </td>
                </tr>
              ) : (
                (splitBackfillStatus?.history || []).map((item, idx) => {
                  const status = (item.status || "").toLowerCase();
                  const statusClass =
                    status === "done"
                      ? "bg-emerald-100 text-emerald-700"
                      : status === "stopped"
                        ? "bg-amber-100 text-amber-700"
                        : status === "done_with_errors"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-rose-100 text-rose-700";
                  const totalWritten =
                    Number(item.report?.jobs?.written || 0) +
                    Number(item.report?.outputs?.written || 0) +
                    Number(item.report?.packages?.written || 0) +
                    Number(item.report?.events?.written || 0) +
                    Number(item.report?.feedbacks?.written || 0);
                  const totalFailed =
                    Number(item.report?.jobs?.failed || 0) +
                    Number(item.report?.outputs?.failed || 0) +
                    Number(item.report?.packages?.failed || 0) +
                    Number(item.report?.events?.failed || 0) +
                    Number(item.report?.feedbacks?.failed || 0);
                  return (
                    <tr key={`${item.run_id || "history"}-${idx}`} className="border-t border-cyan-50 text-slate-700">
                      <td className="px-3 py-2">
                        <div className="font-semibold">{item.run_id || "-"}</div>
                        <div className="text-[11px] text-slate-500">admin #{item.requested_by || 0}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}>
                          {status || "unknown"}
                        </span>
                        {item.last_error ? <div className="mt-1 text-[11px] text-rose-600">{item.last_error}</div> : null}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-600">
                        format={item.options?.format || "all"} · apply={item.options?.apply ? "1" : "0"}
                        <br />
                        batch={item.options?.batch_size || 0} · tables={item.options?.tables || "-"}
                      </td>
                      <td className="px-3 py-2 text-right">{totalWritten.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{totalFailed.toLocaleString()}</td>
                      <td className="px-3 py-2 text-[11px] text-slate-600">
                        <div>{formatTime(item.started_at)}</div>
                        <div>{formatTime(item.finished_at)}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </div>
      ) : null}

      <div className="space-y-4 rounded-3xl border border-indigo-100 bg-indigo-50/40 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-indigo-800">AI 模板中心（AI1 / AI2 / 评分 / AI3）</h3>
            <p className="mt-1 text-xs text-indigo-700/80">
              {lockedQualityFormat
                ? `当前固定为 ${qualityScopeLabel}，AI1 提供“可编辑层 + 固定层”；AI2、评分、AI3 采用固定层模板。`
                : "支持按格式切换。AI1 提供“可编辑层 + 固定层”；AI2、评分、AI3 采用固定层模板。"}
            </p>
          </div>
          {lockedQualityFormat ? (
            <span className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700">
              模板作用域：{templateFormat.toUpperCase()}
            </span>
          ) : (
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
          )}
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
        {templateValidationIssues.length > 0 ? (
          <div className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-xs text-rose-700">
            <div className="mb-2 font-semibold">字段校验详情</div>
            <ul className="space-y-1">
              {templateValidationIssues.map((issue, idx) => (
                <li key={`${issue.field_path || "field"}-${issue.code || "code"}-${idx}`} className="break-all">
                  <button
                    type="button"
                    onClick={() => focusTemplateValidationIssue(issue)}
                    className="w-full text-left underline decoration-dotted underline-offset-2 hover:text-rose-800"
                  >
                    • {normalizeIssueMessage(issue)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
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
          <div className="space-y-3 rounded-2xl border border-indigo-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-indigo-700">固定层版本切换（只读历史）</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-indigo-700/80">
                  <span>当前标签：{templateTab.toUpperCase()}</span>
                  <span>来源链路：</span>
                  <PromptSourceBadge
                    value={templateVersionsResolvedFrom}
                    expectedFormat={templateFormat}
                    expectedStage={templateTab}
                  />
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
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <select
                ref={templateVersionSelectRef}
                value={selectedVersionID ? String(selectedVersionID) : ""}
                onChange={(e) => setSelectedVersionID(Number(e.target.value || 0))}
                className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
                disabled={templateVersionsLoading || templateVersions.length === 0}
              >
                {templateVersions.length === 0 ? <option value="">暂无版本</option> : null}
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
                  templateSourceMismatch
                }
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {templateActivateSaving ? "切换中..." : "切换为当前版本"}
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => void openFixedTemplateViewer()}
                disabled={templateVersionsLoading || !selectedVersionID}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
              >
                查看
              </button>
              <button
                type="button"
                onClick={openFixedTemplateListPage}
                className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                固定模板列表
              </button>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-[11px] text-indigo-700/90">
              当前交互：先在下拉框选择目标版本，再点击「切换为当前版本」生效。
            </div>
            {templateSourceHint ? (
              <div className="text-[11px] text-amber-700">{templateSourceHint}</div>
            ) : null}
            {selectedTemplateVersion ? (
              <div className="text-[11px] text-slate-500">
                已选版本：{selectedTemplateVersion.version || `v-${selectedTemplateVersion.id}`}（ID:{" "}
                {selectedTemplateVersion.id}）
              </div>
            ) : null}
          </div>
        ) : null}

        {!templateLoading && templateTab === "ai1" ? (
          <div className="space-y-4 rounded-2xl border border-indigo-200 bg-white p-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-700">
              <div className="font-semibold">AI1 JSON 变量配置（硬约束放权）</div>
              <div className="mt-1 text-[11px] text-indigo-700/80">
                用于控制“系统基线约束 + AI 可扩张范围”。修改后请点顶部“保存配置”才会落库生效。
              </div>
              <textarea
                value={ai1ConstraintJSON}
                onChange={(e) => setAi1ConstraintJSON(e.target.value)}
                rows={9}
                className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 font-mono text-[11px] leading-5 text-slate-700 outline-none focus:border-indigo-500"
                placeholder='{\n  "ai_director_constraint_override_enabled": true,\n  "ai_director_count_expand_ratio": 1,\n  "ai_director_duration_expand_ratio": 0.5,\n  "ai_director_count_absolute_cap": 10,\n  "ai_director_duration_absolute_cap_sec": 6\n}'
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={applyAI1ConstraintJSONToForm}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-500"
                >
                  应用 JSON 到当前配置
                </button>
                <button
                  type="button"
                  onClick={resetAI1ConstraintJSONFromForm}
                  className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  按当前配置重建 JSON
                </button>
              </div>
              {ai1ConstraintError ? (
                <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
                  {ai1ConstraintError}
                </div>
              ) : null}
              {ai1ConstraintSuccess ? (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">
                  {ai1ConstraintSuccess}
                </div>
              ) : null}
              <ul className="mt-2 space-y-1 text-[11px] leading-5 text-indigo-700/90">
                <li>
                  <span className="font-semibold">ai_director_constraint_override_enabled</span>：是否启用 AI1 扩张策略
                </li>
                <li>
                  <span className="font-semibold">ai_director_count_expand_ratio</span>：数量扩张比例（1=+100%）
                </li>
                <li>
                  <span className="font-semibold">ai_director_duration_expand_ratio</span>：时长扩张比例（1=+100%）
                </li>
                <li>
                  <span className="font-semibold">ai_director_count_absolute_cap</span>：候选数量绝对上限（防失控）
                </li>
                <li>
                  <span className="font-semibold">ai_director_duration_absolute_cap_sec</span>：单窗口时长绝对上限（秒）
                </li>
              </ul>
            </div>

            {templateFormat === "png" || templateFormat === "all" ? (
              <div
                ref={ai1SceneStrategySectionRef}
                className={`rounded-xl border p-3 text-xs ${
                  ai1TemplateSchemaHasIssue
                    ? "border-rose-300 bg-rose-50 text-rose-800"
                    : "border-violet-200 bg-violet-50/70 text-violet-800"
                }`}
              >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">PNG 场景策略组（AI1 动态提示词与运营规则）</div>
                  <div className="mt-1 text-[11px] text-violet-800/80">
                    用于覆盖 AI1 的场景化策略（优先级：任务参数 {'>'} 场景策略 {'>'} 内置默认）。
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-violet-700">
                    <span className="mr-1">策略版本</span>
                    <input
                      ref={ai1SceneStrategyVersionRef}
                      type="text"
                      value={ai1SceneStrategyVersion}
                      onChange={(e) => {
                        setAi1SceneStrategyVersion(e.target.value);
                        setAi1SceneStrategyError(null);
                        setAi1SceneStrategySuccess(null);
                      }}
                      className="w-[180px] rounded-lg border border-violet-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-violet-500"
                      placeholder="png_scene_strategy_v1"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={resetAllSceneDrafts}
                    className="rounded-lg border border-violet-200 bg-white px-2 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                  >
                    重置全部
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {ai1SceneOptions.map((scene) => {
                  const active = scene.value === ai1SceneStrategyScene;
                  return (
                    <button
                      key={scene.value}
                      type="button"
                      onClick={() => setAi1SceneStrategyScene(scene.value)}
                      className={
                        active
                          ? "rounded-lg border border-violet-300 bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white"
                          : "rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                      }
                    >
                      <span>{scene.label}</span>
                      <span
                        className={`ml-2 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          scene.enabled ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {scene.enabled ? "已上线" : "测试中"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 text-[11px] text-violet-800/75">
                {ai1SceneOptions.find((item) => item.value === ai1SceneStrategyScene)?.description || ""}
              </div>

              <div className="mt-3 rounded-lg border border-violet-200 bg-white p-3">
                <div className="text-[11px] font-semibold text-violet-700">新增自定义场景（scene_key）</div>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <input
                    type="text"
                    value={ai1NewSceneKey}
                    onChange={(e) => setAi1NewSceneKey(e.target.value)}
                    className="rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-500"
                    placeholder="例如：ecom_cover"
                  />
                  <input
                    type="text"
                    value={ai1NewSceneLabel}
                    onChange={(e) => setAi1NewSceneLabel(e.target.value)}
                    className="rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-500"
                    placeholder="展示名称（可选）"
                  />
                  <button
                    type="button"
                    onClick={addCustomSceneDraft}
                    className="rounded-lg border border-violet-300 bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-500"
                  >
                    新增场景
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] text-violet-700">场景显示名称</span>
                  <input
                    type="text"
                    value={currentSceneDraft.scene_label}
                    onChange={(e) => updateCurrentSceneDraft({ scene_label: e.target.value })}
                    className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-violet-700">运营身份设定（operator_identity）</span>
                  <input
                    type="text"
                    value={currentSceneDraft.operator_identity}
                    onChange={(e) => updateCurrentSceneDraft({ operator_identity: e.target.value })}
                    className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-violet-700">业务目标（business_goal）</span>
                  <input
                    type="text"
                    value={currentSceneDraft.business_goal}
                    onChange={(e) => updateCurrentSceneDraft({ business_goal: e.target.value })}
                    className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-violet-700">目标受众（audience）</span>
                  <input
                    type="text"
                    value={currentSceneDraft.audience}
                    onChange={(e) => updateCurrentSceneDraft({ audience: e.target.value })}
                    className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-violet-700">风格方向（style_direction）</span>
                  <input
                    type="text"
                    value={currentSceneDraft.style_direction}
                    onChange={(e) => updateCurrentSceneDraft({ style_direction: e.target.value })}
                    className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-violet-700">建议候选数量最小值（candidate_count_bias.min）</span>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={currentSceneDraft.candidate_count_min}
                    onChange={(e) =>
                      updateCurrentSceneDraft({ candidate_count_min: Math.max(1, Math.round(Number(e.target.value) || 1)) })
                    }
                    className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-violet-700">建议候选数量最大值（candidate_count_bias.max）</span>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={currentSceneDraft.candidate_count_max}
                    onChange={(e) =>
                      updateCurrentSceneDraft({ candidate_count_max: Math.max(1, Math.round(Number(e.target.value) || 1)) })
                    }
                    className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-500"
                  />
                </label>
              </div>

              <label className="mt-3 block space-y-1">
                <span className="text-[11px] text-violet-700">导演提示（directive_hint）</span>
                <input
                  type="text"
                  value={currentSceneDraft.directive_hint}
                  onChange={(e) => updateCurrentSceneDraft({ directive_hint: e.target.value })}
                  className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-500"
                />
              </label>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-[11px] text-violet-700">必须捕捉（每行一条）</span>
                  <textarea
                    value={currentSceneDraft.must_capture_bias_text}
                    onChange={(e) => updateCurrentSceneDraft({ must_capture_bias_text: e.target.value })}
                    rows={6}
                    className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-[11px] text-slate-700 outline-none focus:border-violet-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-violet-700">规避项（每行一条）</span>
                  <textarea
                    value={currentSceneDraft.avoid_bias_text}
                    onChange={(e) => updateCurrentSceneDraft({ avoid_bias_text: e.target.value })}
                    rows={6}
                    className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-[11px] text-slate-700 outline-none focus:border-violet-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-violet-700">风险标记（每行一条）</span>
                  <textarea
                    value={currentSceneDraft.risk_flags_text}
                    onChange={(e) => updateCurrentSceneDraft({ risk_flags_text: e.target.value })}
                    rows={6}
                    className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-[11px] text-slate-700 outline-none focus:border-violet-500"
                  />
                </label>
              </div>

              <div className="mt-3 rounded-lg border border-violet-200 bg-white p-3">
                <div className="mb-2 text-[11px] font-semibold text-violet-700">质量权重（quality_weights）</div>
                <div className="grid gap-2 md:grid-cols-4">
                  <label className="space-y-1">
                    <span className="text-[11px] text-violet-700">语义</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={currentSceneDraft.quality_semantic}
                      onChange={(e) => updateCurrentSceneDraft({ quality_semantic: Number(e.target.value) })}
                      className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-violet-500"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] text-violet-700">清晰度</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={currentSceneDraft.quality_clarity}
                      onChange={(e) => updateCurrentSceneDraft({ quality_clarity: Number(e.target.value) })}
                      className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-violet-500"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] text-violet-700">循环</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={currentSceneDraft.quality_loop}
                      onChange={(e) => updateCurrentSceneDraft({ quality_loop: Number(e.target.value) })}
                      className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-violet-500"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] text-violet-700">效率</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={currentSceneDraft.quality_efficiency}
                      onChange={(e) => updateCurrentSceneDraft({ quality_efficiency: Number(e.target.value) })}
                      className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-violet-500"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-violet-200 bg-white p-3">
                <div className="mb-2 text-[11px] font-semibold text-violet-700">技术规避（technical_reject）</div>
                <div className="grid gap-2 md:grid-cols-3">
                  <label className="space-y-1">
                    <span className="text-[11px] text-violet-700">模糊容忍度</span>
                    <select
                      value={currentSceneDraft.max_blur_tolerance}
                      onChange={(e) =>
                        updateCurrentSceneDraft({
                          max_blur_tolerance: normalizeBlurTolerance(e.target.value, "low"),
                        })
                      }
                      className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-violet-500"
                    >
                      {AI1_SCENE_BLUR_TOLERANCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-2 py-2 text-[11px] text-violet-700">
                    <input
                      type="checkbox"
                      checked={!!currentSceneDraft.enabled}
                      onChange={(e) => updateCurrentSceneDraft({ enabled: e.target.checked })}
                      className="h-3.5 w-3.5"
                    />
                    场景已上线（关闭=测试中）
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-2 py-2 text-[11px] text-violet-700">
                    <input
                      type="checkbox"
                      checked={!!currentSceneDraft.avoid_watermarks}
                      onChange={(e) => updateCurrentSceneDraft({ avoid_watermarks: e.target.checked })}
                      className="h-3.5 w-3.5"
                    />
                    避开水印区域
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-2 py-2 text-[11px] text-violet-700">
                    <input
                      type="checkbox"
                      checked={!!currentSceneDraft.avoid_extreme_dark}
                      onChange={(e) => updateCurrentSceneDraft({ avoid_extreme_dark: e.target.checked })}
                      className="h-3.5 w-3.5"
                    />
                    避开极暗画面
                  </label>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                {!AI1_BUILTIN_SCENE_LABELS[ai1SceneStrategyScene] ? (
                  <button
                    type="button"
                    onClick={removeCurrentCustomScene}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    删除自定义场景
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={resetCurrentSceneDraft}
                  className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                >
                  重置当前场景
                </button>
              </div>

              {ai1SceneStrategyError ? (
                <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
                  {ai1SceneStrategyError}
                </div>
              ) : null}
              {ai1SceneStrategySuccess ? (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">
                  {ai1SceneStrategySuccess}
                </div>
              ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
                当前作用域为 {templateFormat.toUpperCase()}。PNG 场景策略组仅在 PNG / ALL 作用域可编辑。
              </div>
            )}

            {(templateFormat === "png" || templateFormat === "all") ? (
              <div className="space-y-2 rounded-xl border border-cyan-200 bg-cyan-50/70 p-3 text-xs text-cyan-900">
                <div className="font-semibold">AI1 可编辑层策略链路快照（PNG 命中 + ALL 兜底）</div>
                <div className="text-[11px] text-cyan-800/80">
                  运行时优先命中 <code>png/ai1/editable</code>，未命中时回退到 <code>all/ai1/editable</code>。
                </div>
                {ai1EditableChainError ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700">{ai1EditableChainError}</div>
                ) : null}
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { scope: "PNG（精确命中）", item: ai1EditablePNGTemplate },
                    { scope: "ALL（兜底）", item: ai1EditableALLTemplate },
                  ].map((entry) => (
                    <div key={entry.scope} className="rounded-lg border border-cyan-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] font-semibold text-cyan-800">{entry.scope}</div>
                        <div className="text-[10px] text-slate-500">
                          {entry.item
                            ? `version=${entry.item.version || "-"} · enabled=${entry.item.enabled ? "on" : "off"} · active=${
                                entry.item.is_active ? "true" : "false"
                              }`
                            : "未配置"}
                        </div>
                      </div>
                      {entry.item ? (
                        <>
                          <div className="mt-2 text-[10px] text-slate-500">resolved_from: {entry.item.resolved_from || "-"}</div>
                          <div className="mt-2 text-[10px] font-semibold text-slate-600">template_text</div>
                          <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 text-[10px] leading-4 text-slate-700">
                            {entry.item.template_text || "（空）"}
                          </pre>
                          <div className="mt-2 text-[10px] font-semibold text-slate-600">template_json_schema</div>
                          <pre className="mt-1 max-h-44 overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 text-[10px] leading-4 text-slate-700">
                            {formatPrettyObject(entry.item.template_json_schema || {})}
                          </pre>
                        </>
                      ) : (
                        <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600">当前作用域无可编辑模板。</div>
                      )}
                    </div>
                  ))}
                </div>
                {ai1EditableChainLoading ? <div className="text-[11px] text-cyan-700">加载中...</div> : null}
              </div>
            ) : null}

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
                  ref={ai1EditableVersionRef}
                  type="text"
                  value={ai1EditableVersion}
                  onChange={(e) => setAi1EditableVersion(e.target.value)}
                  className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 outline-none ${
                    ai1VersionHasIssue ? "border-rose-300 focus:border-rose-500" : "border-indigo-200 focus:border-indigo-500"
                  }`}
                  placeholder="例如：v2 / 20260318-alpha"
                />
              </label>
            </div>

            <label className="block space-y-1 text-xs text-indigo-700">
              <span>AI1 可编辑层模板正文</span>
              <textarea
                ref={ai1EditableTextRef}
                value={ai1EditableText}
                onChange={(e) => setAi1EditableText(e.target.value)}
                rows={8}
                className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 outline-none ${
                  ai1TemplateTextHasIssue ? "border-rose-300 focus:border-rose-500" : "border-indigo-200 focus:border-indigo-500"
                }`}
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
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-indigo-700/80">
                <span>来源：</span>
                <PromptSourceBadge value={findTemplate("ai1", "fixed")?.resolved_from} expectedFormat={templateFormat} expectedStage="ai1" />
                {findTemplate("ai1", "fixed")?.version ? <span>· 版本 {findTemplate("ai1", "fixed")?.version}</span> : null}
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
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-indigo-700/80">
              <span>来源：</span>
              <PromptSourceBadge value={findTemplate("ai2", "fixed")?.resolved_from} expectedFormat={templateFormat} expectedStage="ai2" />
              {findTemplate("ai2", "fixed")?.version ? <span>· 版本 {findTemplate("ai2", "fixed")?.version}</span> : null}
            </div>
            <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-[11px] leading-5 text-slate-700">
              {findTemplate("ai2", "fixed")?.template_text || "（未配置）"}
            </pre>
          </div>
        ) : null}

        {!templateLoading && templateTab === "scoring" ? (
          <div className="rounded-2xl border border-indigo-200 bg-white p-4">
            <div className="text-xs font-semibold text-indigo-700">评分系统固定层说明</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-indigo-700/80">
              <span>来源：</span>
              <PromptSourceBadge value={findTemplate("scoring", "fixed")?.resolved_from} expectedFormat={templateFormat} expectedStage="scoring" />
              {findTemplate("scoring", "fixed")?.version ? <span>· 版本 {findTemplate("scoring", "fixed")?.version}</span> : null}
            </div>
            <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-[11px] leading-5 text-slate-700">
              {findTemplate("scoring", "fixed")?.template_text || "（未配置）"}
            </pre>
          </div>
        ) : null}

        {!templateLoading && templateTab === "ai3" ? (
          <div className="rounded-2xl border border-indigo-200 bg-white p-4">
            <div className="text-xs font-semibold text-indigo-700">AI3 固定层模板（复审阶段）</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-indigo-700/80">
              <span>来源：</span>
              <PromptSourceBadge value={findTemplate("ai3", "fixed")?.resolved_from} expectedFormat={templateFormat} expectedStage="ai3" />
              {findTemplate("ai3", "fixed")?.version ? <span>· 版本 {findTemplate("ai3", "fixed")?.version}</span> : null}
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
          <div>
            <h3 className="text-sm font-bold text-slate-800">质量配置字段审计（最近 10 条）</h3>
            <p className="mt-1 text-xs text-slate-500">展示每次保存的字段级变更（旧值 → 新值）。</p>
          </div>
          <button
            type="button"
            onClick={() => void loadQualityAudits(10)}
            disabled={qualityAuditsLoading}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {qualityAuditsLoading ? "刷新中..." : "刷新审计"}
          </button>
        </div>

        {qualityAuditsError ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700">{qualityAuditsError}</div>
        ) : null}

        {qualityAuditsLoading && !qualityAudits.length ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">加载中...</div>
        ) : null}

        {!qualityAuditsLoading && !qualityAudits.length ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
            暂无字段级审计记录。
          </div>
        ) : null}

        {qualityAudits.length ? (
          <div className="space-y-3">
            {qualityAudits.map((item) => (
              <div key={`${item.id || 0}-${item.created_at || ""}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div>
                    {formatTime(item.created_at)} · Admin #{item.admin_id || 0} · scope=
                    {(item.format_scope || "all").toUpperCase()}
                  </div>
                  <div>
                    {(item.change_kind || "patch").toLowerCase()} · {(item.changed_count || 0)} 项变更
                  </div>
                </div>
                {Array.isArray(item.resolved_from) && item.resolved_from.length ? (
                  <div className="mt-1 text-[11px] text-slate-500">生效链路：{item.resolved_from.join(" → ")}</div>
                ) : null}
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-[11px] text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-2 py-1">字段</th>
                        <th className="px-2 py-1">旧值</th>
                        <th className="px-2 py-1">新值</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(item.changed_fields || []).map((field, idx) => (
                        <tr key={`${item.id || 0}-${field.field || "field"}-${idx}`} className="border-b border-slate-100">
                          <td className="px-2 py-1 font-mono text-[10px] text-slate-700">{field.field || "-"}</td>
                          <td className="px-2 py-1 font-mono text-[10px] text-slate-500">
                            {formatAuditFieldValue(field.old_value)}
                          </td>
                          <td className="px-2 py-1 font-mono text-[10px] text-slate-700">
                            {formatAuditFieldValue(field.new_value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
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

        <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
          <h3 className="text-sm font-bold text-slate-800">AI3 技术硬闸门（Hard Gate）</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1 text-xs text-slate-500">
              <span>总体质量最低分（0~1）</span>
              <input
                type="number"
                step="0.01"
                min={0.01}
                max={1}
                value={form.gif_ai_judge_hard_gate_min_overall_score}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_ai_judge_hard_gate_min_overall_score: toNumber(
                      e.target.value,
                      prev.gif_ai_judge_hard_gate_min_overall_score
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>清晰度最低分（0~1）</span>
              <input
                type="number"
                step="0.01"
                min={0.01}
                max={1}
                value={form.gif_ai_judge_hard_gate_min_clarity_score}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_ai_judge_hard_gate_min_clarity_score: toNumber(
                      e.target.value,
                      prev.gif_ai_judge_hard_gate_min_clarity_score
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>闭环最低分（0~1）</span>
              <input
                type="number"
                step="0.01"
                min={0.01}
                max={1}
                value={form.gif_ai_judge_hard_gate_min_loop_score}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_ai_judge_hard_gate_min_loop_score: toNumber(
                      e.target.value,
                      prev.gif_ai_judge_hard_gate_min_loop_score
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>输出分最低阈值（0~1）</span>
              <input
                type="number"
                step="0.01"
                min={0.01}
                max={1}
                value={form.gif_ai_judge_hard_gate_min_output_score}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_ai_judge_hard_gate_min_output_score: toNumber(
                      e.target.value,
                      prev.gif_ai_judge_hard_gate_min_output_score
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>最短时长阈值（ms）</span>
              <input
                type="number"
                min={50}
                max={10000}
                value={form.gif_ai_judge_hard_gate_min_duration_ms}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_ai_judge_hard_gate_min_duration_ms: toNumber(
                      e.target.value,
                      prev.gif_ai_judge_hard_gate_min_duration_ms
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>体积超预算倍数阈值</span>
              <input
                type="number"
                min={1}
                max={20}
                value={form.gif_ai_judge_hard_gate_size_multiplier}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gif_ai_judge_hard_gate_size_multiplier: toNumber(
                      e.target.value,
                      prev.gif_ai_judge_hard_gate_size_multiplier
                    ),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </label>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
            当 AI3 建议 deliver 时，仍会经过硬闸门二次拦截。命中硬闸门后将降级为 reject 或 need_manual_review。
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
              <span>GIF 最大产出数（1~20）</span>
              <input
                type="number"
                min={1}
                max={20}
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
              <span>长视频最大产出数（≥60s，1~20）</span>
              <input
                type="number"
                min={1}
                max={20}
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
              <span>超长视频最大产出数（≥150s，1~20）</span>
              <input
                type="number"
                min={1}
                max={20}
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
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
            当前作用域：<span className="font-semibold uppercase">{qualityFormat}</span>
            {qualityResolvedFrom.length ? (
              <span> · 生效链路：{qualityResolvedFrom.join(" → ")}</span>
            ) : null}
            {qualityOverrideVersion ? <span> · 覆写版本：{qualityOverrideVersion}</span> : null}
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

      {fixedTemplateViewOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 px-4 py-8">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">固定模板版本详情</h4>
                <p className="mt-1 text-xs text-slate-500">
                  当前标签：{templateTab.toUpperCase()} · 版本ID：{selectedVersionID || "-"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFixedTemplateViewOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                关闭
              </button>
            </div>
            <div className="max-h-[calc(88vh-56px)] overflow-y-auto p-5">
              {fixedTemplateViewLoading ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-5 text-sm text-indigo-700">
                  模板详情加载中...
                </div>
              ) : null}
              {!fixedTemplateViewLoading && fixedTemplateViewError ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                    {fixedTemplateViewError}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedVersionID) void loadFixedTemplateDetail(selectedVersionID);
                    }}
                    className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                  >
                    重试
                  </button>
                </div>
              ) : null}
              {!fixedTemplateViewLoading && !fixedTemplateViewError && fixedTemplateViewItem ? (
                <div className="space-y-4">
                  {fixedTemplateViewCompatTip ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      {fixedTemplateViewCompatTip}
                    </div>
                  ) : null}
                  <div className="grid gap-3 text-xs text-slate-600 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="font-semibold text-slate-700">版本：</span>
                      {fixedTemplateViewItem.version || `v-${fixedTemplateViewItem.id}`}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="font-semibold text-slate-700">状态：</span>
                      {fixedTemplateViewItem.is_active ? "当前生效" : "历史版本"}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="font-semibold text-slate-700">作用域：</span>
                      {(fixedTemplateViewItem.format || "-").toUpperCase()}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="font-semibold text-slate-700">阶段：</span>
                      {(fixedTemplateViewItem.stage || "-").toUpperCase()}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="font-semibold text-slate-700">更新时间：</span>
                      {formatTime(fixedTemplateViewItem.updated_at)}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="font-semibold text-slate-700">启用：</span>
                      {fixedTemplateViewItem.enabled ? "是" : "否"}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:col-span-2">
                      <span className="font-semibold text-slate-700">来源链路：</span>
                      <span className="ml-2 inline-flex">
                        <PromptSourceBadge
                          value={fixedTemplateViewItem.resolved_from}
                          expectedFormat={templateFormat}
                          expectedStage={templateTab}
                        />
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-semibold text-slate-700">模板正文</div>
                    <pre className="max-h-[45vh] overflow-auto rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-[11px] leading-5 text-slate-100">
{fixedTemplateViewItem.template_text || "（空）"}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
