"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type AdminVideoJobUser = {
  id: number;
  display_name?: string;
  phone?: string;
  user_level?: string;
  subscription_plan?: string;
  subscription_status?: string;
};

type AdminVideoJobCollection = {
  id: number;
  title: string;
  cover_url?: string;
  status?: string;
  is_sample?: boolean;
};

type AdminVideoJobCost = {
  estimated_cost?: number;
  currency?: string;
  pricing_version?: string;
  cpu_ms?: number;
  gpu_ms?: number;
  storage_bytes_raw?: number;
  storage_bytes_output?: number;
  output_count?: number;
};

type AdminVideoJobPointHold = {
  status?: string;
  reserved_points?: number;
  settled_points?: number;
};

type AdminVideoJobItem = {
  id: number;
  title: string;
  source_video_key: string;
  source_video_url?: string;
  status: string;
  stage: string;
  progress: number;
  priority?: string;
  error_message?: string;
  result_collection_id?: number;
  output_formats?: string[];
  options?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  cost?: AdminVideoJobCost;
  point_hold?: AdminVideoJobPointHold;
  created_at?: string;
  started_at?: string;
  finished_at?: string;
  user: AdminVideoJobUser;
  collection?: AdminVideoJobCollection;
};

type AdminVideoJobListResponse = {
  items?: AdminVideoJobItem[];
  total?: number;
  page?: number;
  page_size?: number;
};

type AdminVideoJobEvent = {
  id: number;
  stage: string;
  level: string;
  message: string;
  created_at: string;
};

type AdminVideoJobArtifact = {
  id: number;
  type: string;
  qiniu_key: string;
  url?: string;
  mime_type?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

type AdminVideoJobGIFCandidate = {
  id: number;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  base_score: number;
  confidence_score: number;
  final_rank: number;
  is_selected: boolean;
  reject_reason?: string;
  feature_json?: Record<string, unknown>;
  created_at?: string;
};

type AdminVideoJobAIUsage = {
  id: number;
  stage?: string;
  provider?: string;
  model?: string;
  endpoint?: string;
  request_status?: string;
  request_error?: string;
  request_duration_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  cached_input_tokens?: number;
  image_tokens?: number;
  video_tokens?: number;
  audio_seconds?: number;
  cost_usd?: number;
  currency?: string;
  pricing_version?: string;
  pricing_source_url?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

type AdminVideoJobAIGIFDirective = {
  id: number;
  business_goal?: string;
  audience?: string;
  must_capture?: string[];
  avoid?: string[];
  clip_count_min?: number;
  clip_count_max?: number;
  duration_pref_min_sec?: number;
  duration_pref_max_sec?: number;
  loop_preference?: number;
  style_direction?: string;
  risk_flags?: string[];
  quality_weights?: Record<string, unknown>;
  brief_version?: string;
  model_version?: string;
  directive_text?: string;
  status?: string;
  fallback_used?: boolean;
  input_context?: Record<string, unknown>;
  provider?: string;
  model?: string;
  prompt_version?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

type AdminVideoJobDetailResponse = {
  job: AdminVideoJobItem;
  events?: AdminVideoJobEvent[];
  artifacts?: AdminVideoJobArtifact[];
  gif_candidates?: AdminVideoJobGIFCandidate[];
  ai_usages?: AdminVideoJobAIUsage[];
  ai_gif_directives?: AdminVideoJobAIGIFDirective[];
  ai_gif_proposals?: AdminVideoJobAIGIFProposal[];
  ai_gif_reviews?: AdminVideoJobAIGIFReview[];
  ai_gif_review_status_counts?: Record<string, number>;
  ai_gif_review_status_filter?: string[];
};

type AdminVideoJobGIFEvaluation = {
  id: number;
  output_id?: number;
  proposal_id?: number;
  candidate_id?: number;
  object_key?: string;
  preview_url?: string;
  window_start_ms?: number;
  window_end_ms?: number;
  emotion_score?: number;
  clarity_score?: number;
  motion_score?: number;
  loop_score?: number;
  efficiency_score?: number;
  overall_score?: number;
  feature_json?: Record<string, unknown>;
  created_at?: string;
};

type AdminVideoJobGIFFeedback = {
  id: number;
  output_id?: number;
  user_id?: number;
  action?: string;
  weight?: number;
  scene_tag?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

type AdminVideoJobGIFRerenderRecord = {
  review_id?: number;
  output_id?: number;
  proposal_id?: number;
  proposal_rank?: number;
  recommendation?: string;
  diagnostic?: string;
  suggested_action?: string;
  trigger?: string;
  actor_id?: number;
  actor_role?: string;
  output_object_key?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

type AdminVideoJobGIFAuditChainSummary = {
  candidate_count?: number;
  directive_count?: number;
  proposal_count?: number;
  output_count?: number;
  evaluation_count?: number;
  review_count?: number;
  feedback_count?: number;
  rerender_count?: number;
  ai_usage_count?: number;
  event_count?: number;
  hard_gate_blocked_count?: number;
  latest_recommendation?: string;
  latest_recommendation_at?: string;
  review_status_counts?: Record<string, number>;
  policy_version?: string;
  experiment_bucket?: string;
  pipeline_mode?: string;
};

type AdminVideoJobGIFAuditChainResponse = {
  job?: AdminVideoJobItem;
  summary?: AdminVideoJobGIFAuditChainSummary;
  events?: AdminVideoJobEvent[];
  outputs?: AdminVideoJobArtifact[];
  gif_candidates?: AdminVideoJobGIFCandidate[];
  ai_usages?: AdminVideoJobAIUsage[];
  ai_gif_directives?: AdminVideoJobAIGIFDirective[];
  ai_gif_proposals?: AdminVideoJobAIGIFProposal[];
  ai_gif_reviews?: AdminVideoJobAIGIFReview[];
  gif_evaluations?: AdminVideoJobGIFEvaluation[];
  feedbacks?: AdminVideoJobGIFFeedback[];
  rerenders?: AdminVideoJobGIFRerenderRecord[];
  review_status_filter?: string[];
};

type AdminVideoJobGIFReviewDecisionResponse = {
  job_id?: number;
  request_id?: string;
  applied?: number;
  skipped?: number;
};

type AdminVideoJobGIFBatchRerenderItemResult = {
  proposal_id?: number;
  proposal_rank?: number;
  status?: string;
  error_code?: string;
  error?: string;
  result?: {
    output_id?: number;
    output_object_key?: string;
    proposal_id?: number;
    proposal_rank?: number;
    cost_delta_cny?: number;
    zip_invalidated?: boolean;
  };
};

type AdminVideoJobGIFBatchRerenderResponse = {
  job_id?: number;
  request_id?: string;
  strategy?: string;
  force?: boolean;
  total?: number;
  succeeded?: number;
  failed?: number;
  idempotent?: boolean;
  message?: string;
  items?: AdminVideoJobGIFBatchRerenderItemResult[];
};

type ManualGIFReviewDecisionBatchItem = {
  output_id: number;
  proposal_id?: number;
  decision: string;
  reason?: string;
  notes?: string;
};

type ManualGIFReviewDecisionBatchParseResult = {
  items: ManualGIFReviewDecisionBatchItem[];
  errors: string[];
};

type AdminVideoJobAIGIFProposal = {
  id: number;
  proposal_rank?: number;
  start_sec?: number;
  end_sec?: number;
  duration_sec?: number;
  base_score?: number;
  proposal_reason?: string;
  semantic_tags?: string[];
  expected_value_level?: string;
  standalone_confidence?: number;
  loop_friendliness_hint?: number;
  status?: string;
  provider?: string;
  model?: string;
  prompt_version?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

type AdminVideoJobAIGIFReview = {
  id: number;
  output_id?: number;
  proposal_id?: number;
  final_recommendation?: string;
  semantic_verdict?: number;
  diagnostic_reason?: string;
  suggested_action?: string;
  provider?: string;
  model?: string;
  prompt_version?: string;
  created_at?: string;
};

type AdminVideoJobSimpleCount = {
  key: string;
  count: number;
};

type AdminVideoJobSourceProbeQualityStat = {
  bucket: string;
  jobs: number;
  done_jobs: number;
  failed_jobs: number;
  pending_jobs: number;
  cancelled_jobs: number;
  terminal_jobs: number;
  success_rate: number;
  failure_rate: number;
  duration_p50_sec: number;
  duration_p95_sec: number;
};

type AdminVideoJobFailureReason = {
  reason: string;
  count: number;
};

type AdminVideoJobStageDuration = {
  from_stage: string;
  to_stage: string;
  transition: string;
  count: number;
  avg_sec: number;
  p95_sec: number;
};

type AdminVideoJobGIFSubStageAnomalyStat = {
  sub_stage: string;
  sub_stage_label: string;
  samples: number;
  done_jobs: number;
  running_jobs: number;
  pending_jobs: number;
  degraded_jobs: number;
  failed_jobs: number;
  anomaly_jobs: number;
  anomaly_rate: number;
  top_reason?: string;
  top_reason_count?: number;
};

type AdminVideoJobGIFSubStageAnomalyReasonStat = {
  sub_stage: string;
  sub_stage_label: string;
  status: string;
  reason: string;
  count: number;
};

type AdminVideoJobFormatStat = {
  format: string;
  requested_jobs: number;
  generated_jobs: number;
  success_rate: number;
  artifact_count: number;
  avg_artifact_size_bytes: number;
  size_profile_jobs?: number;
  size_profile_rate?: number;
  size_profile_avg_artifact_size_bytes?: number;
  size_budget_samples?: number;
  size_budget_hits?: number;
  size_budget_hit_rate?: number;
  engaged_jobs: number;
  feedback_signals: number;
  avg_engagement_score: number;
};

type AdminVideoJobFeedbackSceneStat = {
  scene_tag: string;
  signals: number;
};

type AdminVideoJobFeedbackActionStat = {
  action: string;
  count: number;
  ratio: number;
  weight_sum: number;
};

type AdminVideoJobFeedbackTrendPoint = {
  bucket: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  top_pick: number;
};

type AdminVideoJobFeedbackNegativeGuardOverview = {
  samples: number;
  treatment_jobs: number;
  guard_enabled_jobs: number;
  guard_reason_hit_jobs: number;
  selection_shift_jobs: number;
  blocked_reason_jobs: number;
  guard_hit_rate: number;
  selection_shift_rate: number;
  blocked_reason_rate: number;
  avg_negative_signals: number;
  avg_positive_signals: number;
};

type AdminVideoJobFeedbackIntegrityOverview = {
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

type AdminVideoJobFeedbackIntegrityAlert = {
  level?: string;
  code?: string;
  message?: string;
};

type AdminVideoJobFeedbackIntegrityHealthTrendPoint = {
  bucket?: string;
  samples?: number;
  health?: string;
  alert_count?: number;
  output_coverage_rate?: number;
  output_resolved_rate?: number;
  output_job_consistency_rate?: number;
  top_pick_multi_hit_users?: number;
};

type AdminVideoJobFeedbackIntegrityRecommendation = {
  category?: string;
  severity?: string;
  title?: string;
  message?: string;
  suggested_quick?: string;
  suggested_action?: string;
  alert_codes?: string[];
};

type AdminVideoJobFeedbackIntegrityAlertCodeStat = {
  code?: string;
  days_hit?: number;
  latest_level?: string;
  latest_bucket?: string;
};

type AdminVideoJobFeedbackIntegrityDelta = {
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

type AdminVideoJobFeedbackIntegrityStreaks = {
  consecutive_red_days?: number;
  consecutive_non_green_days?: number;
  consecutive_green_days?: number;
  recent_7d_red_days?: number;
  recent_7d_non_green_days?: number;
  last_non_green_bucket?: string;
  last_red_bucket?: string;
};

type AdminVideoJobFeedbackIntegrityEscalation = {
  required?: boolean;
  level?: string;
  reason?: string;
  triggered_rules?: string[];
};

type AdminVideoJobFeedbackIntegrityEscalationTrendPoint = {
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

type AdminVideoJobFeedbackIntegrityEscalationStats = {
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

type AdminVideoJobFeedbackIntegrityEscalationIncident = {
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

type AdminVideoJobFeedbackIntegrityAlertThresholds = {
  feedback_integrity_output_coverage_rate_warn?: number;
  feedback_integrity_output_coverage_rate_critical?: number;
  feedback_integrity_output_resolved_rate_warn?: number;
  feedback_integrity_output_resolved_rate_critical?: number;
  feedback_integrity_output_job_consistency_rate_warn?: number;
  feedback_integrity_output_job_consistency_rate_critical?: number;
  feedback_integrity_top_pick_conflict_users_warn?: number;
  feedback_integrity_top_pick_conflict_users_critical?: number;
};

type AdminVideoJobFeedbackNegativeGuardReasonStat = {
  reason: string;
  jobs: number;
  blocked_jobs: number;
  avg_weight: number;
};

type ToastRetryAction =
  | { kind: "reload_list" }
  | { kind: "reload_overview" }
  | { kind: "reload_sample_diff" }
  | { kind: "reload_detail"; job_id: number }
  | { kind: "apply_rollout_suggestion" }
  | { kind: "export_sample_baseline" }
  | { kind: "export_feedback_report" }
  | { kind: "export_feedback_integrity_report" }
  | { kind: "export_feedback_integrity_trend_report" }
  | { kind: "export_feedback_integrity_anomalies_report" }
  | { kind: "export_gif_sub_stage_anomalies_report" }
  | { kind: "export_blocked_feedback_report" }
  | { kind: "export_sample_baseline_diff" };

type ToastNotice = {
  id: number;
  level: "success" | "error";
  message: string;
  duplicate_count: number;
  code?: string;
  retry_action?: ToastRetryAction;
};

function toastRetryActionKey(action?: ToastRetryAction) {
  if (!action) return "none";
  switch (action.kind) {
    case "reload_detail":
      return `reload_detail:${action.job_id}`;
    default:
      return action.kind;
  }
}

function toastNoticeKey(level: "success" | "error", message: string, action?: ToastRetryAction, code?: string) {
  return `${level}|${toastRetryActionKey(action)}|${(code || "").trim()}|${(message || "").trim()}`;
}

type AdminVideoJobLiveCoverSceneStat = {
  scene_tag: string;
  samples: number;
  avg_cover_score: number;
  avg_cover_portrait: number;
  avg_cover_exposure: number;
  avg_cover_face: number;
  low_sample?: boolean;
};

type AdminVideoJobGIFLoopTuneOverview = {
  samples: number;
  applied: number;
  effective_applied: number;
  fallback_to_base: number;
  applied_rate: number;
  effective_applied_rate: number;
  fallback_rate: number;
  avg_score: number;
  avg_loop_closure: number;
  avg_motion_mean: number;
  avg_effective_sec: number;
};

type AdminVideoJobFeedbackGroupStat = {
  group: string;
  jobs: number;
  engaged_jobs: number;
  feedback_signals: number;
  avg_engagement_score: number;
  applied_jobs: number;
};

type AdminVideoJobFeedbackGroupFormatStat = {
  format: string;
  group: string;
  jobs: number;
  engaged_jobs: number;
  feedback_signals: number;
  avg_engagement_score: number;
  applied_jobs: number;
};

type AdminVideoJobFeedbackRolloutAudit = {
  id: number;
  admin_id: number;
  from_rollout_percent: number;
  to_rollout_percent: number;
  window: string;
  confirm_windows: number;
  recommendation_state: string;
  recommendation_reason: string;
  created_at: string;
};

type AdminVideoJobFeedbackRolloutRecommendation = {
  state: string;
  reason: string;
  current_rollout_percent: number;
  suggested_rollout_percent: number;
  consecutive_required: number;
  consecutive_matched: number;
  consecutive_passed: boolean;
  recent_states?: string[];
  treatment_jobs: number;
  control_jobs: number;
  treatment_signals_per_job: number;
  control_signals_per_job: number;
  signals_uplift: number;
  treatment_avg_score: number;
  control_avg_score: number;
  score_uplift: number;
  live_guard_triggered?: boolean;
  live_guard_min_samples?: number;
  live_guard_eligible_total?: number;
  live_guard_score_floor?: number;
  live_guard_risk_scenes?: string[];
};

type ApplyRolloutSuggestionResponse = {
  applied?: boolean;
  applied_at?: string;
  cooldown_seconds?: number;
  next_allowed_at?: string;
  message?: string;
  confirm_windows?: number;
  recommendation?: AdminVideoJobFeedbackRolloutRecommendation;
  setting?: {
    highlight_feedback_rollout_percent?: number;
  };
};

type AdminVideoJobOverviewResponse = {
  window?: string;
  window_start?: string;
  window_end?: string;
  total?: number;
  queued?: number;
  running?: number;
  done?: number;
  failed?: number;
  cancelled?: number;
  retrying?: number;
  created_window?: number;
  done_window?: number;
  failed_window?: number;
  source_probe_jobs_window?: number;
  source_probe_duration_buckets?: AdminVideoJobSimpleCount[];
  source_probe_resolution_buckets?: AdminVideoJobSimpleCount[];
  source_probe_fps_buckets?: AdminVideoJobSimpleCount[];
  source_probe_duration_quality?: AdminVideoJobSourceProbeQualityStat[];
  source_probe_resolution_quality?: AdminVideoJobSourceProbeQualityStat[];
  source_probe_fps_quality?: AdminVideoJobSourceProbeQualityStat[];
  sample_jobs_window?: number;
  sample_done_window?: number;
  sample_failed_window?: number;
  sample_success_rate_window?: number;
  created_24h?: number;
  done_24h?: number;
  failed_24h?: number;
  duration_p50_sec?: number;
  duration_p95_sec?: number;
  sample_duration_p50_sec?: number;
  sample_duration_p95_sec?: number;
  cost_window?: number;
  cost_avg_window?: number;
  cost_total?: number;
  cost_24h?: number;
  cost_avg_24h?: number;
  feedback_signals_window?: number;
  feedback_downloads_window?: number;
  feedback_favorites_window?: number;
  feedback_engaged_jobs_window?: number;
  feedback_avg_score_window?: number;
  feedback_integrity_overview?: AdminVideoJobFeedbackIntegrityOverview;
  feedback_integrity_alert_thresholds?: AdminVideoJobFeedbackIntegrityAlertThresholds;
  feedback_integrity_health?: string;
  feedback_integrity_alerts?: AdminVideoJobFeedbackIntegrityAlert[];
  feedback_integrity_health_trend?: AdminVideoJobFeedbackIntegrityHealthTrendPoint[];
  feedback_integrity_recovery_status?: string;
  feedback_integrity_recovered?: boolean;
  feedback_integrity_previous_health?: string;
  feedback_integrity_alert_code_stats?: AdminVideoJobFeedbackIntegrityAlertCodeStat[];
  feedback_integrity_delta?: AdminVideoJobFeedbackIntegrityDelta;
  feedback_integrity_streaks?: AdminVideoJobFeedbackIntegrityStreaks;
  feedback_integrity_escalation?: AdminVideoJobFeedbackIntegrityEscalation;
  feedback_integrity_escalation_trend?: AdminVideoJobFeedbackIntegrityEscalationTrendPoint[];
  feedback_integrity_escalation_stats?: AdminVideoJobFeedbackIntegrityEscalationStats;
  feedback_integrity_escalation_incidents?: AdminVideoJobFeedbackIntegrityEscalationIncident[];
  feedback_integrity_recommendations?: AdminVideoJobFeedbackIntegrityRecommendation[];
  feedback_integrity_anomaly_jobs_window?: number;
  feedback_integrity_top_pick_conflict_jobs_window?: number;
  live_cover_scene_min_samples?: number;
  live_cover_scene_guard_min_total?: number;
  live_cover_scene_guard_score_floor?: number;
  feedback_scene_stats?: AdminVideoJobFeedbackSceneStat[];
  feedback_action_stats?: AdminVideoJobFeedbackActionStat[];
  feedback_top_scene_tags?: AdminVideoJobFeedbackSceneStat[];
  feedback_trend?: AdminVideoJobFeedbackTrendPoint[];
  feedback_negative_guard_overview?: AdminVideoJobFeedbackNegativeGuardOverview;
  feedback_negative_guard_reasons?: AdminVideoJobFeedbackNegativeGuardReasonStat[];
  live_cover_scene_stats?: AdminVideoJobLiveCoverSceneStat[];
  gif_loop_tune_overview?: AdminVideoJobGIFLoopTuneOverview;
  feedback_group_stats?: AdminVideoJobFeedbackGroupStat[];
  feedback_group_format_stats?: AdminVideoJobFeedbackGroupFormatStat[];
  feedback_rollout_recommendation?: AdminVideoJobFeedbackRolloutRecommendation;
  feedback_rollout_audit_logs?: AdminVideoJobFeedbackRolloutAudit[];
  stage_counts?: AdminVideoJobSimpleCount[];
  top_failures?: AdminVideoJobFailureReason[];
  stage_durations?: AdminVideoJobStageDuration[];
  gif_sub_stage_anomaly_jobs_window?: number;
  gif_sub_stage_anomaly_overview?: AdminVideoJobGIFSubStageAnomalyStat[];
  gif_sub_stage_anomaly_reasons?: AdminVideoJobGIFSubStageAnomalyReasonStat[];
  format_stats_24h?: AdminVideoJobFormatStat[];
};

type AdminSampleVideoJobsBaselineDiffSummary = {
  base_jobs_window: number;
  target_jobs_window: number;
  jobs_window_delta: number;
  jobs_window_uplift: number;
  base_done_window: number;
  target_done_window: number;
  done_window_delta: number;
  done_window_uplift: number;
  base_failed_window: number;
  target_failed_window: number;
  failed_window_delta: number;
  failed_window_uplift: number;
  base_success_rate: number;
  target_success_rate: number;
  success_rate_delta: number;
  success_rate_uplift: number;
  base_duration_p50_sec: number;
  target_duration_p50_sec: number;
  duration_p50_delta: number;
  duration_p50_uplift: number;
  base_duration_p95_sec: number;
  target_duration_p95_sec: number;
  duration_p95_delta: number;
  duration_p95_uplift: number;
};

type AdminSampleVideoJobsBaselineDiffFormatStat = {
  format: string;
  base_requested_jobs: number;
  target_requested_jobs: number;
  base_generated_jobs: number;
  target_generated_jobs: number;
  base_success_rate: number;
  target_success_rate: number;
  success_rate_delta: number;
  success_rate_uplift: number;
  base_avg_artifact_size_bytes: number;
  target_avg_artifact_size_bytes: number;
  avg_artifact_size_delta: number;
  avg_artifact_size_uplift: number;
  base_duration_p50_sec: number;
  target_duration_p50_sec: number;
  duration_p50_delta: number;
  duration_p50_uplift: number;
  base_duration_p95_sec: number;
  target_duration_p95_sec: number;
  duration_p95_delta: number;
  duration_p95_uplift: number;
};

type AdminSampleVideoJobsBaselineDiffResponse = {
  base_window: string;
  target_window: string;
  generated_at: string;
  summary?: AdminSampleVideoJobsBaselineDiffSummary;
  formats?: AdminSampleVideoJobsBaselineDiffFormatStat[];
};

type SourceVideoProbe = {
  duration_sec?: number;
  width?: number;
  height?: number;
  fps?: number;
};

type HighlightFeedbackSelection = {
  reason: string;
  start_sec?: number;
  end_sec?: number;
  score?: number;
};

type HighlightFeedbackNegativeReason = {
  reason: string;
  weight: number;
};

type HighlightFeedbackDrilldown = {
  group: string;
  enabled: boolean;
  applied: boolean;
  negative_guard_enabled: boolean;
  engaged_jobs?: number;
  weighted_signals?: number;
  public_negative_signals?: number;
  public_positive_signals?: number;
  selected_before: HighlightFeedbackSelection | null;
  selected_after: HighlightFeedbackSelection | null;
  reason_negative_guard: HighlightFeedbackNegativeReason[];
  selection_changed: boolean;
  blocked_reason: boolean;
  blocked_reason_label?: string;
};

type GIFPipelineSubStageRow = {
  key: string;
  label: string;
  status: string;
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
  reason?: string;
  error?: string;
};

type GIFRenderSelectionSnapshot = {
  enabled: boolean;
  version: string;
  duration_tier: string;
  candidate_pool_count: number;
  eligible_candidate_count: number;
  selected_window_count: number;
  base_max_outputs: number;
  tier_max_outputs: number;
  confidence_threshold: number;
  estimated_budget_limit_kb: number;
  estimated_selected_kb: number;
  dropped_low_confidence: number;
  dropped_size_budget: number;
  dropped_output_limit: number;
  fallback_applied: boolean;
  fallback_reason: string;
};

type SampleBaselineDiffDecisionState = "insufficient_data" | "hold" | "scale_up" | "scale_down";

type SampleBaselineDiffDecision = {
  state: SampleBaselineDiffDecisionState;
  label: string;
  reason: string;
  panelClass: string;
  badgeClass: string;
  reasonClass: string;
};

const STATUS_LABEL: Record<string, string> = {
  queued: "排队中",
  running: "处理中",
  done: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

const STAGE_LABEL: Record<string, string> = {
  queued: "排队",
  preprocessing: "预处理",
  analyzing: "分析",
  rendering: "渲染",
  uploading: "上传",
  indexing: "入库",
  done: "完成",
  failed: "失败",
  cancelled: "取消",
  retrying: "重试",
};

const FORMAT_FILTER_OPTIONS = ["all", "gif", "jpg", "png", "webp", "mp4", "live"] as const;
const REVIEW_STATUS_FILTER_OPTIONS = ["all", "deliver", "keep_internal", "reject", "need_manual_review"] as const;
const GIF_PIPELINE_STAGE_ORDER = ["briefing", "planning", "scoring", "reviewing"] as const;
const GIF_PIPELINE_STAGE_LABEL: Record<string, string> = {
  briefing: "Briefing（AI1）",
  planning: "Planning（AI2）",
  scoring: "Scoring（评分）",
  reviewing: "Reviewing（AI3）",
};
const GIF_SUB_STAGE_QUICK_TO_STAGE: Record<string, string> = {
  sub_stage_briefing_anomaly: "briefing",
  sub_stage_planning_anomaly: "planning",
  sub_stage_scoring_anomaly: "scoring",
  sub_stage_reviewing_anomaly: "reviewing",
};
const AI_STAGE_LABEL: Record<string, string> = {
  director: "AI1 Prompt Director",
  planner: "AI2 Planner",
  judge: "AI3 Judge",
};

type AIUsageStageSummary = {
  stage: string;
  label: string;
  calls: number;
  success_calls: number;
  error_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cached_tokens: number;
  total_image_tokens: number;
  total_video_tokens: number;
  total_audio_seconds: number;
  total_duration_ms: number;
  avg_duration_ms: number;
  total_cost_usd: number;
};

function normalizeAIStage(value?: string) {
  const stage = (value || "").trim().toLowerCase();
  return stage || "unknown";
}

function summarizeAIUsageByStage(usages?: AdminVideoJobAIUsage[]) {
  const source = Array.isArray(usages) ? usages : [];
  if (!source.length) return [] as AIUsageStageSummary[];
  const grouped = new Map<string, AIUsageStageSummary>();
  for (const item of source) {
    const stage = normalizeAIStage(item.stage);
    const current =
      grouped.get(stage) ||
      {
        stage,
        label: AI_STAGE_LABEL[stage] || stage,
        calls: 0,
        success_calls: 0,
        error_calls: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cached_tokens: 0,
        total_image_tokens: 0,
        total_video_tokens: 0,
        total_audio_seconds: 0,
        total_duration_ms: 0,
        avg_duration_ms: 0,
        total_cost_usd: 0,
      };
    current.calls += 1;
    const status = (item.request_status || "").trim().toLowerCase();
    if (status === "ok" || status === "success") {
      current.success_calls += 1;
    } else {
      current.error_calls += 1;
    }
    current.total_input_tokens += Number(item.input_tokens || 0);
    current.total_output_tokens += Number(item.output_tokens || 0);
    current.total_cached_tokens += Number(item.cached_input_tokens || 0);
    current.total_image_tokens += Number(item.image_tokens || 0);
    current.total_video_tokens += Number(item.video_tokens || 0);
    current.total_audio_seconds += Number(item.audio_seconds || 0);
    current.total_duration_ms += Number(item.request_duration_ms || 0);
    current.total_cost_usd += Number(item.cost_usd || 0);
    grouped.set(stage, current);
  }
  const stageOrder = ["director", "planner", "judge"];
  const rows = Array.from(grouped.values()).map((item) => ({
    ...item,
    avg_duration_ms: item.calls > 0 ? item.total_duration_ms / item.calls : 0,
  }));
  rows.sort((a, b) => {
    const ai = stageOrder.indexOf(a.stage);
    const bi = stageOrder.indexOf(b.stage);
    if (ai >= 0 || bi >= 0) {
      if (ai < 0) return 1;
      if (bi < 0) return -1;
      return ai - bi;
    }
    return a.stage.localeCompare(b.stage);
  });
  return rows;
}

function normalizeReviewStatus(value?: string) {
  const status = (value || "").trim().toLowerCase();
  switch (status) {
    case "deliver":
      return "deliver";
    case "keep_internal":
      return "keep_internal";
    case "reject":
      return "reject";
    case "need_manual_review":
      return "need_manual_review";
    default:
      return status || "";
  }
}

function reviewStatusLabel(value?: string) {
  switch (normalizeReviewStatus(value)) {
    case "deliver":
      return "deliver（用户可见）";
    case "keep_internal":
      return "keep_internal（后台保留）";
    case "reject":
      return "reject（弃用）";
    case "need_manual_review":
      return "need_manual_review（待人工复核）";
    default:
      return value || "-";
  }
}

function reviewStatusBadgeClass(value?: string) {
  switch (normalizeReviewStatus(value)) {
    case "deliver":
      return "bg-emerald-100 text-emerald-700";
    case "keep_internal":
      return "bg-sky-100 text-sky-700";
    case "reject":
      return "bg-rose-100 text-rose-700";
    case "need_manual_review":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatTime(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN");
}

function formatBytes(value?: number) {
  if (!value || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function parseFormatList(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const format = item.trim().toLowerCase();
    if (!format || seen.has(format)) continue;
    seen.add(format);
    out.push(format);
  }
  return out;
}

function resolveRequestedFormats(item: AdminVideoJobItem) {
  const fromMetrics = parseFormatList(item.metrics?.output_formats_requested);
  if (fromMetrics.length) return fromMetrics;
  return parseFormatList(item.output_formats);
}

function resolveGeneratedFormats(item: AdminVideoJobItem) {
  const fromMetrics = parseFormatList(item.metrics?.output_formats);
  if (fromMetrics.length) return fromMetrics;
  return parseFormatList(item.output_formats);
}

function formatSeconds(value?: number) {
  if (!value || value <= 0) return "-";
  if (value < 60) return `${value.toFixed(1)}s`;
  return `${(value / 60).toFixed(1)}m`;
}

function formatCurrency(value?: number, currency = "CNY") {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "-";
  const prefix = currency.toUpperCase() === "CNY" ? "¥" : `${currency.toUpperCase()} `;
  return `${prefix}${value.toFixed(4)}`;
}

function formatInteger(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "-";
  return Math.round(n).toLocaleString("zh-CN");
}

function formatDurationMs(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  if (n < 1000) return `${Math.round(n)}ms`;
  if (n < 60000) return `${(n / 1000).toFixed(2)}s`;
  return `${(n / 60000).toFixed(2)}m`;
}

function formatPercent(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function formatScore(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "-";
  return value.toFixed(2);
}

function formatSignedPercent(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${(value * 100).toFixed(1)}%`;
}

function formatSignedSeconds(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const prefix = value > 0 ? "+" : "";
  if (Math.abs(value) < 60) return `${prefix}${value.toFixed(1)}s`;
  return `${prefix}${(value / 60).toFixed(2)}m`;
}

function formatSignedBytes(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const prefix = value > 0 ? "+" : "";
  const abs = Math.abs(value);
  if (abs < 1024) return `${prefix}${value.toFixed(0)} B`;
  if (abs < 1024 * 1024) return `${prefix}${(value / 1024).toFixed(1)} KB`;
  if (abs < 1024 * 1024 * 1024) return `${prefix}${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${prefix}${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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

function resolveErrorCodeLabel(raw?: string) {
  const text = (raw || "").trim();
  if (!text) return "";
  const sqlState = text.match(/SQLSTATE\s*([0-9A-Z]{5})/i);
  if (sqlState?.[1]) {
    return `SQLSTATE ${sqlState[1].toUpperCase()}`;
  }
  const httpCode = text.match(/(?:^|\\b)(?:HTTP\\s*)?(4\\d\\d|5\\d\\d)(?:\\b|$)/i);
  if (httpCode?.[1]) {
    return `HTTP ${httpCode[1]}`;
  }
  return "";
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
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }
  return fallback;
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

function rolloutApplyHint(
  recommendation: AdminVideoJobFeedbackRolloutRecommendation | null,
  canApply: boolean
) {
  if (!recommendation) return "";
  const state = String(recommendation.state || "").toLowerCase();
  if (canApply) return "已满足连续确认，可直接应用建议档位。";
  if (state === "pending_confirmation") {
    return `仍在连续确认中（${recommendation.consecutive_matched ?? 0}/${recommendation.consecutive_required ?? 0}）。`;
  }
  if (state === "scale_up" || state === "scale_down") {
    if (!recommendation.consecutive_passed) {
      return `建议方向已出现，但未通过连续确认（${recommendation.consecutive_matched ?? 0}/${recommendation.consecutive_required ?? 0}）。`;
    }
    if (recommendation.suggested_rollout_percent === recommendation.current_rollout_percent) {
      return "建议档位与当前一致，无需重复应用。";
    }
  }
  if (state === "insufficient_data") {
    return "样本不足，继续观察后再自动建议。";
  }
  if (state === "hold") {
    return "当前无需变更 rollout。";
  }
  if (state === "disabled") {
    return "反馈重排开关未启用。";
  }
  return "当前建议不可直接应用。";
}

function resolveSourceVideoProbe(options?: Record<string, unknown>) {
  const raw = options?.source_video_probe;
  if (!raw || typeof raw !== "object") return null;
  const probe = raw as Record<string, unknown>;
  const out: SourceVideoProbe = {};
  if (typeof probe.duration_sec === "number" && Number.isFinite(probe.duration_sec) && probe.duration_sec > 0) {
    out.duration_sec = probe.duration_sec;
  }
  if (typeof probe.width === "number" && Number.isFinite(probe.width) && probe.width > 0) {
    out.width = Math.round(probe.width);
  }
  if (typeof probe.height === "number" && Number.isFinite(probe.height) && probe.height > 0) {
    out.height = Math.round(probe.height);
  }
  if (typeof probe.fps === "number" && Number.isFinite(probe.fps) && probe.fps > 0) {
    out.fps = probe.fps;
  }
  if (!out.duration_sec && !out.width && !out.height && !out.fps) return null;
  return out;
}

function formatSourceVideoProbe(probe: SourceVideoProbe | null) {
  if (!probe) return "-";
  const parts: string[] = [];
  if (probe.width && probe.height) {
    parts.push(`${probe.width}x${probe.height}`);
  }
  if (probe.fps) {
    parts.push(`${probe.fps.toFixed(1)}fps`);
  }
  if (probe.duration_sec) {
    parts.push(`${probe.duration_sec.toFixed(1)}s`);
  }
  return parts.join(" · ") || "-";
}

function parseBooleanValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y" || normalized === "t";
  }
  return false;
}

function parseNumberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseIntegerListInput(raw: string) {
  const text = (raw || "").trim();
  if (!text) return [] as number[];
  const tokens = text.split(/[,\s，]+/).map((item) => item.trim()).filter(Boolean);
  if (!tokens.length) return [] as number[];
  const seen = new Set<number>();
  const rows: number[] = [];
  for (const token of tokens) {
    const value = Number(token);
    if (!Number.isFinite(value) || value <= 0) continue;
    const n = Math.trunc(value);
    if (seen.has(n)) continue;
    seen.add(n);
    rows.push(n);
  }
  return rows;
}

function parseManualGIFReviewDecisionBatchInput(raw: string): ManualGIFReviewDecisionBatchParseResult {
  const text = (raw || "").trim();
  if (!text) return { items: [], errors: [] };
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  if (!lines.length) return { items: [], errors: [] };

  const normalizedHeaderKey = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  const splitLine = (line: string) => line.split(/[,\t]/).map((token) => token.trim());
  const firstTokens = splitLine(lines[0]).map((token) => normalizedHeaderKey(token));
  const headerMode = firstTokens.includes("output_id") && firstTokens.includes("decision");
  const headerMap = new Map<string, number>();
  if (headerMode) {
    for (let i = 0; i < firstTokens.length; i += 1) {
      const key = firstTokens[i];
      if (!key) continue;
      if (!headerMap.has(key)) headerMap.set(key, i);
    }
  }

  const out: ManualGIFReviewDecisionBatchItem[] = [];
  const errors: string[] = [];
  const startLine = headerMode ? 1 : 0;
  for (let idx = startLine; idx < lines.length; idx += 1) {
    const rawLine = lines[idx];
    const tokens = splitLine(rawLine);
    const lineNo = idx + 1;
    if (!tokens.length) continue;

    const pick = (name: string, fallbackIndex: number) => {
      const mapped = headerMap.get(name);
      if (typeof mapped === "number") return tokens[mapped] || "";
      return tokens[fallbackIndex] || "";
    };

    const outputRaw = pick("output_id", 0);
    const proposalRaw = pick("proposal_id", 1);
    const decisionRaw = pick("decision", 2);
    const reasonRaw = pick("reason", 3);
    const notesRaw = pick("notes", 4);

    const outputID = Number(outputRaw);
    if (!Number.isFinite(outputID) || outputID <= 0) {
      errors.push(`第 ${lineNo} 行 output_id 非法`);
      continue;
    }

    const decision = normalizeReviewStatus(decisionRaw);
    if (!decision || decision === "all") {
      errors.push(`第 ${lineNo} 行 decision 非法（支持 deliver/keep_internal/reject/need_manual_review）`);
      continue;
    }

    const proposalID = Number(proposalRaw);
    const item: ManualGIFReviewDecisionBatchItem = {
      output_id: Math.trunc(outputID),
      decision,
    };
    if (Number.isFinite(proposalID) && proposalID > 0) {
      item.proposal_id = Math.trunc(proposalID);
    }
    if (reasonRaw) item.reason = reasonRaw;
    if (notesRaw) item.notes = notesRaw;
    out.push(item);
  }

  const seenOutput = new Set<number>();
  for (const item of out) {
    if (seenOutput.has(item.output_id)) {
      errors.push(`output_id ${item.output_id} 重复`);
      break;
    }
    seenOutput.add(item.output_id);
  }
  return { items: out, errors };
}

function csvEscapeValue(value: unknown) {
  if (value === null || typeof value === "undefined") return "";
  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function buildCSVText(headers: string[], rows: Array<Record<string, unknown>>) {
  const lines: string[] = [];
  lines.push(headers.map(csvEscapeValue).join(","));
  for (const row of rows) {
    lines.push(headers.map((key) => csvEscapeValue(row[key])).join(","));
  }
  return `\uFEFF${lines.join("\n")}`;
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function parseHighlightSelection(raw: unknown): HighlightFeedbackSelection | null {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as Record<string, unknown>;
  const reasonRaw = payload.reason;
  const reason = typeof reasonRaw === "string" ? reasonRaw.trim() : "";
  const startSec = parseNumberValue(payload.start_sec);
  const endSec = parseNumberValue(payload.end_sec);
  const score = parseNumberValue(payload.score);
  if (!reason && typeof startSec !== "number" && typeof endSec !== "number" && typeof score !== "number") {
    return null;
  }
  return {
    reason: reason || "-",
    start_sec: startSec,
    end_sec: endSec,
    score,
  };
}

function parseHighlightNegativeReasons(raw: unknown): HighlightFeedbackNegativeReason[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const payload = raw as Record<string, unknown>;
  const rows: HighlightFeedbackNegativeReason[] = [];
  for (const [reason, weightRaw] of Object.entries(payload)) {
    const key = reason.trim();
    if (!key) continue;
    const weight = parseNumberValue(weightRaw);
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) continue;
    rows.push({ reason: key, weight });
  }
  rows.sort((a, b) => b.weight - a.weight);
  return rows;
}

function resolveHighlightFeedbackDrilldown(
  metrics?: Record<string, unknown> | null
): HighlightFeedbackDrilldown | null {
  const raw = metrics?.highlight_feedback_v1;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const payload = raw as Record<string, unknown>;
  const groupRaw = payload.group;
  const group = typeof groupRaw === "string" && groupRaw.trim() ? groupRaw.trim().toLowerCase() : "unknown";
  const enabled = parseBooleanValue(payload.enabled);
  const applied = parseBooleanValue(payload.applied);
  const negativeGuardEnabled = parseBooleanValue(payload.negative_guard_enabled);
  const selectedBefore = parseHighlightSelection(payload.selected_before);
  const selectedAfter = parseHighlightSelection(payload.selected_after);
  const reasonNegativeGuard = parseHighlightNegativeReasons(payload.reason_negative_guard);

  const beforeStart = selectedBefore?.start_sec;
  const beforeEnd = selectedBefore?.end_sec;
  const afterStart = selectedAfter?.start_sec;
  const afterEnd = selectedAfter?.end_sec;
  const beforeReason = (selectedBefore?.reason || "").trim().toLowerCase();
  const afterReason = (selectedAfter?.reason || "").trim().toLowerCase();

  const selectionChangedByWindow =
    typeof beforeStart === "number" &&
    typeof beforeEnd === "number" &&
    typeof afterStart === "number" &&
    typeof afterEnd === "number" &&
    (Math.abs(beforeStart - afterStart) > 0.0001 || Math.abs(beforeEnd - afterEnd) > 0.0001);
  const selectionChangedByReason = beforeReason !== "" && afterReason !== "" && beforeReason !== afterReason;
  const selectionChanged = selectionChangedByWindow || selectionChangedByReason;

  let blockedReason = false;
  let blockedReasonLabel = "";
  if (selectionChanged && beforeReason) {
    const blocked = reasonNegativeGuard.find((item) => item.reason.trim().toLowerCase() === beforeReason);
    if (blocked) {
      blockedReason = true;
      blockedReasonLabel = `${blocked.reason} (${blocked.weight.toFixed(2)})`;
    }
  }

  const engagedJobs = parseNumberValue(payload.engaged_jobs);
  const weightedSignals = parseNumberValue(payload.weighted_signals);
  const publicNegativeSignals = parseNumberValue(payload.public_negative_signals);
  const publicPositiveSignals = parseNumberValue(payload.public_positive_signals);

  return {
    group,
    enabled,
    applied,
    negative_guard_enabled: negativeGuardEnabled,
    engaged_jobs: engagedJobs,
    weighted_signals: weightedSignals,
    public_negative_signals: publicNegativeSignals,
    public_positive_signals: publicPositiveSignals,
    selected_before: selectedBefore,
    selected_after: selectedAfter,
    reason_negative_guard: reasonNegativeGuard,
    selection_changed: selectionChanged,
    blocked_reason: blockedReason,
    blocked_reason_label: blockedReasonLabel,
  };
}

function formatHighlightSelection(selection: HighlightFeedbackSelection | null) {
  if (!selection) return "-";
  const startText = typeof selection.start_sec === "number" ? `${selection.start_sec.toFixed(2)}s` : "-";
  const endText = typeof selection.end_sec === "number" ? `${selection.end_sec.toFixed(2)}s` : "-";
  const scoreText = typeof selection.score === "number" ? selection.score.toFixed(2) : "-";
  return `${selection.reason || "-"} · ${startText}~${endText} · score ${scoreText}`;
}

function resolveGIFPipelineSubStages(metrics?: Record<string, unknown> | null): GIFPipelineSubStageRow[] {
  const payloadRaw = metrics?.gif_pipeline_sub_stages_v1;
  const payload = payloadRaw && typeof payloadRaw === "object" && !Array.isArray(payloadRaw)
    ? (payloadRaw as Record<string, unknown>)
    : {};
  const statusRaw = metrics?.gif_pipeline_sub_stage_status_v1;
  const statusMap = statusRaw && typeof statusRaw === "object" && !Array.isArray(statusRaw)
    ? (statusRaw as Record<string, unknown>)
    : {};

  const rows = GIF_PIPELINE_STAGE_ORDER.map((key): GIFPipelineSubStageRow => {
    const itemRaw = payload[key];
    const item = itemRaw && typeof itemRaw === "object" && !Array.isArray(itemRaw)
      ? (itemRaw as Record<string, unknown>)
      : {};
    const statusFromItem = typeof item.status === "string" ? item.status.trim().toLowerCase() : "";
    const statusFromSummary = typeof statusMap[key] === "string" ? String(statusMap[key]).trim().toLowerCase() : "";
    const status = statusFromItem || statusFromSummary || "pending";
    return {
      key,
      label: GIF_PIPELINE_STAGE_LABEL[key] || key,
      status,
      started_at: typeof item.started_at === "string" ? item.started_at : "",
      finished_at: typeof item.finished_at === "string" ? item.finished_at : "",
      duration_ms: parseNumberValue(item.duration_ms),
      reason: typeof item.reason === "string" ? item.reason : "",
      error: typeof item.error === "string" ? item.error : "",
    };
  });
  return rows;
}

function resolveGIFRenderSelection(metrics?: Record<string, unknown> | null): GIFRenderSelectionSnapshot | null {
  const raw = metrics?.gif_render_selection_v1;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const payload = raw as Record<string, unknown>;
  const enabled = parseBooleanValue(payload.enabled);
  const version = typeof payload.version === "string" ? payload.version.trim() : "";
  const durationTier = typeof payload.duration_tier === "string" ? payload.duration_tier.trim().toLowerCase() : "";
  const fallbackReason = typeof payload.fallback_reason === "string" ? payload.fallback_reason.trim() : "";
  return {
    enabled,
    version,
    duration_tier: durationTier,
    candidate_pool_count: Number(parseNumberValue(payload.candidate_pool_count) || 0),
    eligible_candidate_count: Number(parseNumberValue(payload.eligible_candidate_count) || 0),
    selected_window_count: Number(parseNumberValue(payload.selected_window_count) || 0),
    base_max_outputs: Number(parseNumberValue(payload.base_max_outputs) || 0),
    tier_max_outputs: Number(parseNumberValue(payload.tier_max_outputs) || 0),
    confidence_threshold: Number(parseNumberValue(payload.confidence_threshold) || 0),
    estimated_budget_limit_kb: Number(parseNumberValue(payload.estimated_budget_limit_kb) || 0),
    estimated_selected_kb: Number(parseNumberValue(payload.estimated_selected_kb) || 0),
    dropped_low_confidence: Number(parseNumberValue(payload.dropped_low_confidence) || 0),
    dropped_size_budget: Number(parseNumberValue(payload.dropped_size_budget) || 0),
    dropped_output_limit: Number(parseNumberValue(payload.dropped_output_limit) || 0),
    fallback_applied: parseBooleanValue(payload.fallback_applied),
    fallback_reason: fallbackReason,
  };
}

function gifPipelineStatusBadgeClass(status?: string) {
  switch ((status || "").trim().toLowerCase()) {
    case "done":
      return "bg-emerald-100 text-emerald-700";
    case "degraded":
      return "bg-amber-100 text-amber-700";
    case "failed":
      return "bg-rose-100 text-rose-700";
    case "skipped":
      return "bg-slate-100 text-slate-600";
    case "running":
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function resolveQuickGIFSubStage(quick: string) {
  const normalized = String(quick || "").trim().toLowerCase();
  return GIF_SUB_STAGE_QUICK_TO_STAGE[normalized] || "";
}

function isGIFSubStageQuick(quick: string) {
  const normalized = String(quick || "").trim().toLowerCase();
  return normalized === "sub_stage_anomaly" || !!resolveQuickGIFSubStage(normalized);
}

function resolveGIFSubStageExportFilter(quick: string) {
  const normalized = String(quick || "").trim().toLowerCase();
  if (normalized === "sub_stage_anomaly") {
    return { subStage: "", subStatus: "" };
  }
  const subStage = resolveQuickGIFSubStage(normalized);
  if (!subStage) {
    return null;
  }
  return { subStage, subStatus: "" };
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

function resolveSampleBaselineDiffDecision(
  summary?: AdminSampleVideoJobsBaselineDiffSummary,
  formats: AdminSampleVideoJobsBaselineDiffFormatStat[] = []
): SampleBaselineDiffDecision {
  if (!summary) {
    return {
      state: "insufficient_data",
      label: "insufficient_data",
      reason: "当前窗口暂无样本Diff数据，先积累样本后再判断是否放量。",
      panelClass: "border-slate-200 bg-slate-50",
      badgeClass: "bg-slate-600 text-white",
      reasonClass: "text-slate-600",
    };
  }

  if ((summary.target_jobs_window || 0) < 12) {
    return {
      state: "insufficient_data",
      label: "insufficient_data",
      reason: `目标窗口样本量仅 ${summary.target_jobs_window || 0}，建议至少 12 个样本后再执行放量判断。`,
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
    if (successRegressed) reasons.push(`成功率Uplift ${formatSignedPercent(summary.success_rate_uplift)}`);
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
      reason: `建议放量：成功率Uplift ${formatSignedPercent(summary.success_rate_uplift)}，且耗时保持稳定。`,
      panelClass: "border-emerald-200 bg-emerald-50/70",
      badgeClass: "bg-emerald-600 text-white",
      reasonClass: "text-emerald-700",
    };
  }

  return {
    state: "hold",
    label: "hold",
    reason: "建议继续观察：当前波动未达到明确放量或回退阈值。",
    panelClass: "border-amber-200 bg-amber-50/70",
    badgeClass: "bg-amber-500 text-white",
    reasonClass: "text-amber-700",
  };
}

export default function AdminUserVideoJobsPage() {
  const [items, setItems] = useState<AdminVideoJobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<AdminVideoJobOverviewResponse | null>(null);
  const [sampleBaselineDiff, setSampleBaselineDiff] = useState<AdminSampleVideoJobsBaselineDiffResponse | null>(null);
  const [sampleBaselineDiffLoading, setSampleBaselineDiffLoading] = useState(false);
  const [applyingRollout, setApplyingRollout] = useState(false);
  const [exportingFeedbackReport, setExportingFeedbackReport] = useState(false);
  const [exportingFeedbackIntegrityReport, setExportingFeedbackIntegrityReport] = useState(false);
  const [exportingFeedbackIntegrityTrendReport, setExportingFeedbackIntegrityTrendReport] = useState(false);
  const [exportingFeedbackIntegrityAnomalyReport, setExportingFeedbackIntegrityAnomalyReport] = useState(false);
  const [exportingGIFSubStageAnomalyReport, setExportingGIFSubStageAnomalyReport] = useState(false);
  const [exportingBlockedFeedbackReport, setExportingBlockedFeedbackReport] = useState(false);
  const [exportingSampleBaseline, setExportingSampleBaseline] = useState(false);
  const [exportingSampleBaselineDiff, setExportingSampleBaselineDiff] = useState(false);
  const [toastNotices, setToastNotices] = useState<ToastNotice[]>([]);
  const toastNoticesRef = useRef<ToastNotice[]>([]);
  const toastTimersRef = useRef<Record<number, number>>({});
  const listRequestSeqRef = useRef(0);
  const overviewRequestSeqRef = useRef(0);
  const sampleDiffRequestSeqRef = useRef(0);
  const detailRequestSeqRef = useRef(0);
  const detailTargetJobRef = useRef<number>(0);
  const exportNoticeLevelRef = useRef<"success" | "error">("success");
  const exportNoticeCodeRef = useRef<string>("");
  const exportNoticeRetryActionRef = useRef<ToastRetryAction | null>(null);

  const [userID, setUserID] = useState("");
  const [status, setStatus] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [guardReason, setGuardReason] = useState("");
  const [quick, setQuick] = useState("all");
  const [sampleFilter, setSampleFilter] = useState<"all" | "sample">("all");
  const [q, setQ] = useState("");
  const [draftUserID, setDraftUserID] = useState("");
  const [draftStatus, setDraftStatus] = useState("all");
  const [draftFormatFilter, setDraftFormatFilter] = useState("all");
  const [draftGuardReason, setDraftGuardReason] = useState("");
  const [draftQ, setDraftQ] = useState("");
  const [overviewWindow, setOverviewWindow] = useState("24h");
  const [sampleBaselineBaseWindow, setSampleBaselineBaseWindow] = useState("7d");

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminVideoJobDetailResponse | null>(null);
  const [auditChain, setAuditChain] = useState<AdminVideoJobGIFAuditChainResponse | null>(null);
  const [auditChainLoading, setAuditChainLoading] = useState(false);
  const [auditChainError, setAuditChainError] = useState<string | null>(null);
  const [detailJobID, setDetailJobID] = useState<number | null>(null);
  const [detailReviewStatusFilter, setDetailReviewStatusFilter] = useState<(typeof REVIEW_STATUS_FILTER_OPTIONS)[number]>("all");
  const [manualDecisionOutputIDInput, setManualDecisionOutputIDInput] = useState("");
  const [manualDecisionProposalIDInput, setManualDecisionProposalIDInput] = useState("");
  const [manualDecisionStatus, setManualDecisionStatus] = useState<(typeof REVIEW_STATUS_FILTER_OPTIONS)[number]>("deliver");
  const [manualDecisionReason, setManualDecisionReason] = useState("");
  const [manualDecisionNotes, setManualDecisionNotes] = useState("");
  const [manualDecisionSubmitting, setManualDecisionSubmitting] = useState(false);
  const [manualDecisionBatchInput, setManualDecisionBatchInput] = useState("");
  const [manualDecisionBatchSubmitting, setManualDecisionBatchSubmitting] = useState(false);
  const [rerenderProposalIDInput, setRerenderProposalIDInput] = useState("");
  const [rerenderProposalRankInput, setRerenderProposalRankInput] = useState("");
  const [rerenderSubmitting, setRerenderSubmitting] = useState(false);
  const [batchRerenderProposalIDsInput, setBatchRerenderProposalIDsInput] = useState("");
  const [batchRerenderProposalRanksInput, setBatchRerenderProposalRanksInput] = useState("");
  const [batchRerenderStrategy, setBatchRerenderStrategy] = useState("default");
  const [batchRerenderForce, setBatchRerenderForce] = useState(false);
  const [batchRerenderSubmitting, setBatchRerenderSubmitting] = useState(false);
  const [batchRerenderResult, setBatchRerenderResult] = useState<AdminVideoJobGIFBatchRerenderResponse | null>(null);
  const [exportingAuditChainCSV, setExportingAuditChainCSV] = useState(false);

  const removeToastNotice = useCallback((id: number) => {
    setToastNotices((prev) => prev.filter((item) => item.id !== id));
    const timer = toastTimersRef.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete toastTimersRef.current[id];
    }
  }, []);

  const setExportNoticeLevel = useCallback((level: "success" | "error") => {
    exportNoticeLevelRef.current = level;
  }, []);

  const setExportNoticeRetryAction = useCallback((action: ToastRetryAction | null) => {
    exportNoticeRetryActionRef.current = action;
  }, []);

  const setExportNoticeCode = useCallback((code: string | null) => {
    exportNoticeCodeRef.current = (code || "").trim();
  }, []);

  const scheduleToastDismiss = useCallback((id: number) => {
    const existed = toastTimersRef.current[id];
    if (existed) {
      window.clearTimeout(existed);
    }
    toastTimersRef.current[id] = window.setTimeout(() => {
      setToastNotices((prev) => prev.filter((item) => item.id !== id));
      delete toastTimersRef.current[id];
    }, 4500);
  }, []);

  const setExportNotice = useCallback(
    (message: string | null) => {
      if (!message) return;
      const id = Date.now() + Math.floor(Math.random() * 100000);
      const level = exportNoticeLevelRef.current;
      const code = exportNoticeCodeRef.current || undefined;
      const retryAction = exportNoticeRetryActionRef.current || undefined;
      exportNoticeCodeRef.current = "";
      exportNoticeRetryActionRef.current = null;
      const key = toastNoticeKey(level, message, retryAction, code);
      const duplicated = toastNoticesRef.current.find(
        (item) => toastNoticeKey(item.level, item.message, item.retry_action, item.code) === key
      );
      if (duplicated) {
        setToastNotices((prev) =>
          prev.map((item) => {
            if (item.id !== duplicated.id) return item;
            return {
              ...item,
              duplicate_count: (item.duplicate_count || 1) + 1,
            };
          })
        );
        scheduleToastDismiss(duplicated.id);
        return;
      }
      setToastNotices((prev) => {
        const next = [...prev, { id, level, message, code, duplicate_count: 1, retry_action: retryAction }];
        if (next.length <= 4) return next;
        const overflow = next.length - 4;
        const dropped = next.slice(0, overflow);
        for (const item of dropped) {
          const timer = toastTimersRef.current[item.id];
          if (timer) {
            window.clearTimeout(timer);
            delete toastTimersRef.current[item.id];
          }
        }
        return next.slice(overflow);
      });
      scheduleToastDismiss(id);
    },
    [scheduleToastDismiss]
  );

  const copyToastMessage = useCallback(
    async (message: string) => {
      const text = (message || "").trim();
      if (!text) return;
      const fallbackCopy = () => {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.top = "-1000px";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        return ok;
      };
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else if (!fallbackCopy()) {
          throw new Error("copy_not_supported");
        }
        setExportNoticeLevel("success");
        setExportNotice("已复制提示内容");
      } catch {
        if (fallbackCopy()) {
          setExportNoticeLevel("success");
          setExportNotice("已复制提示内容");
        } else {
          setExportNoticeLevel("error");
          setExportNotice("复制失败，请手动复制");
        }
      }
    },
    [setExportNotice, setExportNoticeLevel]
  );

  const totalPages = useMemo(() => {
    if (total <= 0) return 1;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [pageSize, total]);

  const load = useCallback(async () => {
    const requestSeq = listRequestSeqRef.current + 1;
    listRequestSeqRef.current = requestSeq;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (userID.trim()) params.set("user_id", userID.trim());
      if (status !== "all") params.set("status", status);
      if (formatFilter !== "all") params.set("format", formatFilter);
      if (guardReason.trim()) params.set("guard_reason", guardReason.trim().toLowerCase());
      if (quick !== "all") params.set("quick", quick);
      if (sampleFilter === "sample") params.set("is_sample", "1");
      if (q.trim()) params.set("q", q.trim());

      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs?${params.toString()}`);
      if (!res.ok) throw new Error(await parseApiError(res, "加载失败"));
      const data = (await res.json()) as AdminVideoJobListResponse;
      if (requestSeq !== listRequestSeqRef.current) return;
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch (err: unknown) {
      if (requestSeq !== listRequestSeqRef.current) return;
      const message = err instanceof Error ? err.message : "加载失败";
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "reload_list" });
      setExportNotice(`加载任务列表失败：${message}`);
    } finally {
      if (requestSeq === listRequestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [formatFilter, guardReason, page, pageSize, q, quick, sampleFilter, setExportNotice, setExportNoticeCode, setExportNoticeLevel, setExportNoticeRetryAction, status, userID]);

  const applyListFilters = useCallback(() => {
    const nextUserID = draftUserID.trim();
    const nextStatus = draftStatus.trim() || "all";
    const nextFormat = draftFormatFilter.trim() || "all";
    const nextGuardReason = draftGuardReason.trim().toLowerCase();
    const nextQ = draftQ.trim();
    const unchanged =
      nextUserID === userID &&
      nextStatus === status &&
      nextFormat === formatFilter &&
      nextGuardReason === guardReason &&
      nextQ === q;

    setUserID(nextUserID);
    setStatus(nextStatus);
    setFormatFilter(nextFormat);
    setGuardReason(nextGuardReason);
    setQ(nextQ);
    if (page !== 1) {
      setPage(1);
      return;
    }
    if (unchanged) {
      void load();
    }
  }, [
    draftFormatFilter,
    draftGuardReason,
    draftQ,
    draftStatus,
    draftUserID,
    formatFilter,
    guardReason,
    load,
    page,
    q,
    status,
    userID,
  ]);

  const loadOverview = useCallback(async () => {
    const requestSeq = overviewRequestSeqRef.current + 1;
    overviewRequestSeqRef.current = requestSeq;
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/overview?window=${encodeURIComponent(overviewWindow)}`
      );
      if (!res.ok) throw new Error(await parseApiError(res, "加载概览失败"));
      const data = (await res.json()) as AdminVideoJobOverviewResponse;
      if (requestSeq !== overviewRequestSeqRef.current) return;
      setOverview(data);
    } catch (err: unknown) {
      if (requestSeq !== overviewRequestSeqRef.current) return;
      const message = err instanceof Error ? err.message : "加载概览失败";
      setOverview(null);
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "reload_overview" });
      setExportNotice(`加载概览失败：${message}`);
    }
  }, [overviewWindow, setExportNotice, setExportNoticeCode, setExportNoticeLevel, setExportNoticeRetryAction]);

  const loadSampleBaselineDiff = useCallback(async () => {
    const requestSeq = sampleDiffRequestSeqRef.current + 1;
    sampleDiffRequestSeqRef.current = requestSeq;
    setSampleBaselineDiffLoading(true);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/samples/baseline-diff?base_window=${encodeURIComponent(sampleBaselineBaseWindow)}&target_window=${encodeURIComponent(overviewWindow)}`
      );
      if (!res.ok) throw new Error(await parseApiError(res, "加载样本基线Diff失败"));
      const data = (await res.json()) as AdminSampleVideoJobsBaselineDiffResponse;
      if (requestSeq !== sampleDiffRequestSeqRef.current) return;
      setSampleBaselineDiff(data);
    } catch (err: unknown) {
      if (requestSeq !== sampleDiffRequestSeqRef.current) return;
      const message = err instanceof Error ? err.message : "加载样本基线Diff失败";
      setSampleBaselineDiff(null);
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "reload_sample_diff" });
      setExportNotice(`加载样本基线Diff失败：${message}`);
    } finally {
      if (requestSeq === sampleDiffRequestSeqRef.current) {
        setSampleBaselineDiffLoading(false);
      }
    }
  }, [overviewWindow, sampleBaselineBaseWindow, setExportNotice, setExportNoticeCode, setExportNoticeLevel, setExportNoticeRetryAction]);

  const applyRolloutSuggestion = useCallback(async () => {
    setApplyingRollout(true);
    setExportNotice(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/quality-settings/apply-rollout-suggestion?window=${encodeURIComponent(overviewWindow)}&confirm_windows=3`,
        { method: "POST" }
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "应用建议失败"));
      }
      const data = (await res.json()) as ApplyRolloutSuggestionResponse;
      const rollout = data.setting?.highlight_feedback_rollout_percent;
      const appliedAtText = formatTime(data.applied_at);
      if (data.applied) {
        let message = data.message || "已执行建议";
        if (typeof rollout === "number") {
          message += `（当前 rollout=${rollout}%）`;
        }
        if (appliedAtText !== "-") {
          message += ` · 生效时间 ${appliedAtText}`;
        }
        setExportNoticeLevel("success");
        setExportNotice(`rollout应用成功：${message}`);
      } else {
        let message = data.message || "当前建议不可应用";
        const nextAllowedAt = formatTime(data.next_allowed_at);
        if ((data.cooldown_seconds || 0) > 0 && nextAllowedAt !== "-") {
          message += `（冷却剩余 ${data.cooldown_seconds}s，预计 ${nextAllowedAt} 可再次调整）`;
        }
        setExportNoticeLevel("success");
        setExportNotice(`rollout提示：${message}`);
      }
      await loadOverview();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "应用建议失败";
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "apply_rollout_suggestion" });
      setExportNotice(`rollout应用失败：${message}`);
    } finally {
      setApplyingRollout(false);
    }
  }, [loadOverview, overviewWindow, setExportNotice, setExportNoticeCode, setExportNoticeLevel, setExportNoticeRetryAction]);

  const exportSampleBaseline = useCallback(async () => {
    setExportingSampleBaseline(true);
    setExportNotice(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/samples/baseline.csv?window=${encodeURIComponent(overviewWindow)}`
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "导出样本基线失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const fallbackName = `video_jobs_sample_baseline_${overviewWindow}.csv`;
      const fileName = resolveDownloadFilename(res, fallbackName);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setExportNoticeLevel("success");
      setExportNotice(`导出成功：${fileName}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "导出样本基线失败";
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "export_sample_baseline" });
      setExportNotice(`导出失败：${message}`);
    } finally {
      setExportingSampleBaseline(false);
    }
  }, [overviewWindow, setExportNotice, setExportNoticeCode, setExportNoticeLevel, setExportNoticeRetryAction]);

  const exportFeedbackReport = useCallback(async () => {
    setExportingFeedbackReport(true);
    setExportNotice(null);
    try {
      const params = new URLSearchParams({ window: overviewWindow });
      if (userID.trim()) params.set("user_id", userID.trim());
      if (formatFilter !== "all") params.set("format", formatFilter);
      if (guardReason.trim()) params.set("guard_reason", guardReason.trim().toLowerCase());
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/feedback-report.csv?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "导出反馈报表失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const fallbackName = `video_jobs_feedback_report_${overviewWindow}.csv`;
      const fileName = resolveDownloadFilename(res, fallbackName);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      const filters: string[] = [];
      if (userID.trim()) filters.push(`用户#${userID.trim()}`);
      if (formatFilter !== "all") filters.push(`格式:${formatFilter}`);
      if (guardReason.trim()) filters.push(`原因:${guardReason.trim()}`);
      const summary = filters.length ? filters.join(" / ") : "全量";
      setExportNoticeLevel("success");
      setExportNotice(`导出成功：${fileName}（${summary}）`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "导出反馈报表失败";
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "export_feedback_report" });
      setExportNotice(`导出失败：${message}`);
    } finally {
      setExportingFeedbackReport(false);
    }
  }, [formatFilter, guardReason, overviewWindow, setExportNotice, setExportNoticeCode, setExportNoticeLevel, setExportNoticeRetryAction, userID]);

  const exportFeedbackIntegrityReport = useCallback(async () => {
    setExportingFeedbackIntegrityReport(true);
    setExportNotice(null);
    try {
      const params = new URLSearchParams({ window: overviewWindow });
      if (userID.trim()) params.set("user_id", userID.trim());
      if (formatFilter !== "all") params.set("format", formatFilter);
      if (guardReason.trim()) params.set("guard_reason", guardReason.trim().toLowerCase());
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/feedback-integrity.csv?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "导出反馈完整性报表失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const fallbackName = `video_jobs_feedback_integrity_${overviewWindow}.csv`;
      const fileName = resolveDownloadFilename(res, fallbackName);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      const filters: string[] = [];
      if (userID.trim()) filters.push(`用户#${userID.trim()}`);
      if (formatFilter !== "all") filters.push(`格式:${formatFilter}`);
      if (guardReason.trim()) filters.push(`原因:${guardReason.trim()}`);
      const summary = filters.length ? filters.join(" / ") : "全量";
      setExportNoticeLevel("success");
      setExportNotice(`导出成功：${fileName}（${summary}）`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "导出反馈完整性报表失败";
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "export_feedback_integrity_report" });
      setExportNotice(`导出失败：${message}`);
    } finally {
      setExportingFeedbackIntegrityReport(false);
    }
  }, [formatFilter, guardReason, overviewWindow, setExportNotice, setExportNoticeCode, setExportNoticeLevel, setExportNoticeRetryAction, userID]);

  const exportFeedbackIntegrityTrendReport = useCallback(async () => {
    setExportingFeedbackIntegrityTrendReport(true);
    setExportNotice(null);
    try {
      const params = new URLSearchParams({ window: overviewWindow });
      if (userID.trim()) params.set("user_id", userID.trim());
      if (formatFilter !== "all") params.set("format", formatFilter);
      if (guardReason.trim()) params.set("guard_reason", guardReason.trim().toLowerCase());
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/feedback-integrity-trend.csv?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "导出反馈完整性趋势失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const fallbackName = `video_jobs_feedback_integrity_trend_${overviewWindow}.csv`;
      const fileName = resolveDownloadFilename(res, fallbackName);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setExportNoticeLevel("success");
      setExportNotice(`导出成功：${fileName}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "导出反馈完整性趋势失败";
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "export_feedback_integrity_trend_report" });
      setExportNotice(`导出失败：${message}`);
    } finally {
      setExportingFeedbackIntegrityTrendReport(false);
    }
  }, [
    formatFilter,
    guardReason,
    overviewWindow,
    setExportNotice,
    setExportNoticeCode,
    setExportNoticeLevel,
    setExportNoticeRetryAction,
    userID,
  ]);

  const exportFeedbackIntegrityAnomalyReport = useCallback(async () => {
    setExportingFeedbackIntegrityAnomalyReport(true);
    setExportNotice(null);
    try {
      const params = new URLSearchParams({ window: overviewWindow, limit: "500" });
      if (userID.trim()) params.set("user_id", userID.trim());
      if (formatFilter !== "all") params.set("format", formatFilter);
      if (guardReason.trim()) params.set("guard_reason", guardReason.trim().toLowerCase());
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/feedback-integrity-anomalies.csv?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "导出反馈完整性异常明细失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const fallbackName = `video_jobs_feedback_integrity_anomalies_${overviewWindow}.csv`;
      const fileName = resolveDownloadFilename(res, fallbackName);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      const filters: string[] = [];
      if (userID.trim()) filters.push(`用户#${userID.trim()}`);
      if (formatFilter !== "all") filters.push(`格式:${formatFilter}`);
      if (guardReason.trim()) filters.push(`原因:${guardReason.trim()}`);
      const summary = filters.length ? filters.join(" / ") : "全量";
      setExportNoticeLevel("success");
      setExportNotice(`导出成功：${fileName}（异常明细 · ${summary}）`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "导出反馈完整性异常明细失败";
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "export_feedback_integrity_anomalies_report" });
      setExportNotice(`导出失败：${message}`);
    } finally {
      setExportingFeedbackIntegrityAnomalyReport(false);
    }
  }, [
    formatFilter,
    guardReason,
    overviewWindow,
    setExportNotice,
    setExportNoticeCode,
    setExportNoticeLevel,
    setExportNoticeRetryAction,
    userID,
  ]);

  const exportGIFSubStageAnomalyReport = useCallback(async () => {
    setExportingGIFSubStageAnomalyReport(true);
    setExportNotice(null);
    try {
      const params = new URLSearchParams({ window: overviewWindow, limit: "1000" });
      const exportFilter = resolveGIFSubStageExportFilter(quick);
      if (exportFilter?.subStage) params.set("sub_stage", exportFilter.subStage);
      if (exportFilter?.subStatus) params.set("sub_status", exportFilter.subStatus);
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/gif-sub-stage-anomalies.csv?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "导出细分阶段异常失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const fallbackName = `video_jobs_gif_sub_stage_anomalies_${overviewWindow}.csv`;
      const fileName = resolveDownloadFilename(res, fallbackName);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      const summaryParts: string[] = [];
      if (exportFilter?.subStage) {
        summaryParts.push(GIF_PIPELINE_STAGE_LABEL[exportFilter.subStage] || exportFilter.subStage);
      } else {
        summaryParts.push("全部细分阶段");
      }
      summaryParts.push(formatWindowLabel(overviewWindow));
      setExportNoticeLevel("success");
      setExportNotice(`导出成功：${fileName}（${summaryParts.join(" / ")}）`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "导出细分阶段异常失败";
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "export_gif_sub_stage_anomalies_report" });
      setExportNotice(`导出失败：${message}`);
    } finally {
      setExportingGIFSubStageAnomalyReport(false);
    }
  }, [
    overviewWindow,
    quick,
    setExportNotice,
    setExportNoticeCode,
    setExportNoticeLevel,
    setExportNoticeRetryAction,
  ]);

  const exportBlockedFeedbackReport = useCallback(async () => {
    setExportingBlockedFeedbackReport(true);
    setExportNotice(null);
    try {
      const params = new URLSearchParams({ window: overviewWindow, blocked_only: "1" });
      if (userID.trim()) params.set("user_id", userID.trim());
      if (formatFilter !== "all") params.set("format", formatFilter);
      if (guardReason.trim()) params.set("guard_reason", guardReason.trim().toLowerCase());
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/feedback-report.csv?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "导出原因阻断名单失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const fallbackName = `video_jobs_feedback_blocked_report_${overviewWindow}.csv`;
      const fileName = resolveDownloadFilename(res, fallbackName);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      const filters: string[] = [];
      if (userID.trim()) filters.push(`用户#${userID.trim()}`);
      if (formatFilter !== "all") filters.push(`格式:${formatFilter}`);
      if (guardReason.trim()) filters.push(`原因:${guardReason.trim()}`);
      const summary = filters.length ? filters.join(" / ") : "全量";
      setExportNoticeLevel("success");
      setExportNotice(`导出成功：${fileName}（阻断名单 · ${summary}）`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "导出原因阻断名单失败";
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "export_blocked_feedback_report" });
      setExportNotice(`导出失败：${message}`);
    } finally {
      setExportingBlockedFeedbackReport(false);
    }
  }, [formatFilter, guardReason, overviewWindow, setExportNotice, setExportNoticeCode, setExportNoticeLevel, setExportNoticeRetryAction, userID]);

  const exportSampleBaselineDiff = useCallback(async () => {
    setExportingSampleBaselineDiff(true);
    setExportNotice(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/video-jobs/samples/baseline-diff.csv?base_window=${encodeURIComponent(sampleBaselineBaseWindow)}&target_window=${encodeURIComponent(overviewWindow)}`
      );
      if (!res.ok) {
        throw new Error(await parseApiError(res, "导出样本基线Diff失败"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const fallbackName = `video_jobs_sample_baseline_diff_${overviewWindow}_vs_${sampleBaselineBaseWindow}.csv`;
      const fileName = resolveDownloadFilename(res, fallbackName);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setExportNoticeLevel("success");
      setExportNotice(`导出成功：${fileName}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "导出样本基线Diff失败";
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "export_sample_baseline_diff" });
      setExportNotice(`导出失败：${message}`);
    } finally {
      setExportingSampleBaselineDiff(false);
    }
  }, [overviewWindow, sampleBaselineBaseWindow, setExportNotice, setExportNoticeCode, setExportNoticeLevel, setExportNoticeRetryAction]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadSampleBaselineDiff();
  }, [loadSampleBaselineDiff]);

  useEffect(() => {
    toastNoticesRef.current = toastNotices;
  }, [toastNotices]);

  useEffect(() => {
    return () => {
      const timerIDs = Object.values(toastTimersRef.current);
      for (const timerID of timerIDs) {
        window.clearTimeout(timerID);
      }
      toastTimersRef.current = {};
    };
  }, []);

  const loadDetail = useCallback(async (jobID: number) => {
    detailTargetJobRef.current = jobID;
    setDetailJobID(jobID);
    const requestSeq = detailRequestSeqRef.current + 1;
    detailRequestSeqRef.current = requestSeq;
    setDetailLoading(true);
    setAuditChainLoading(true);
    setDetailError(null);
    setAuditChainError(null);
    setDetail(null);
    setAuditChain(null);
    try {
      const params = new URLSearchParams();
      if (detailReviewStatusFilter !== "all") {
        params.set("review_status", detailReviewStatusFilter);
      }
      const query = params.toString();
      const detailURL = `${API_BASE}/api/admin/video-jobs/${jobID}${query ? `?${query}` : ""}`;
      const auditURL = `${API_BASE}/api/admin/video-jobs/${jobID}/gif-audit-chain${query ? `?${query}` : ""}`;
      const [res, auditRes] = await Promise.all([fetchWithAuth(detailURL), fetchWithAuth(auditURL)]);
      if (!res.ok) throw new Error(await parseApiError(res, "加载详情失败"));
      const data = (await res.json()) as AdminVideoJobDetailResponse;
      if (requestSeq !== detailRequestSeqRef.current || detailTargetJobRef.current !== jobID) return;
      setDetail(data);

      if (auditRes.ok) {
        const auditData = (await auditRes.json()) as AdminVideoJobGIFAuditChainResponse;
        if (requestSeq !== detailRequestSeqRef.current || detailTargetJobRef.current !== jobID) return;
        setAuditChain(auditData);
      } else {
        const auditMessage = await parseApiError(auditRes, "加载审计链失败");
        if (requestSeq !== detailRequestSeqRef.current || detailTargetJobRef.current !== jobID) return;
        setAuditChainError(auditMessage);
      }
    } catch (err: unknown) {
      if (requestSeq !== detailRequestSeqRef.current || detailTargetJobRef.current !== jobID) return;
      const message = err instanceof Error ? err.message : "加载详情失败";
      setDetailError(message);
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "reload_detail", job_id: jobID });
      setExportNotice(`加载任务详情失败：${message}`);
    } finally {
      if (requestSeq === detailRequestSeqRef.current && detailTargetJobRef.current === jobID) {
        setDetailLoading(false);
        setAuditChainLoading(false);
      }
    }
  }, [detailReviewStatusFilter, setExportNotice, setExportNoticeCode, setExportNoticeLevel, setExportNoticeRetryAction]);

  useEffect(() => {
    const activeJobID = detailTargetJobRef.current;
    if (!activeJobID) return;
    void loadDetail(activeJobID);
  }, [detailReviewStatusFilter, loadDetail]);

  useEffect(() => {
    setRerenderProposalIDInput("");
    setRerenderProposalRankInput("");
    setRerenderSubmitting(false);
    setManualDecisionOutputIDInput("");
    setManualDecisionProposalIDInput("");
    setManualDecisionStatus("deliver");
    setManualDecisionReason("");
    setManualDecisionNotes("");
    setManualDecisionSubmitting(false);
    setManualDecisionBatchInput("");
    setManualDecisionBatchSubmitting(false);
    setBatchRerenderProposalIDsInput("");
    setBatchRerenderProposalRanksInput("");
    setBatchRerenderStrategy("default");
    setBatchRerenderForce(false);
    setBatchRerenderSubmitting(false);
    setBatchRerenderResult(null);
    setExportingAuditChainCSV(false);
  }, [detail?.job?.id]);

  const triggerGIFRerender = useCallback(async () => {
    const activeJobID = detail?.job?.id;
    if (!activeJobID) return;
    const proposalID = Number((rerenderProposalIDInput || "").trim());
    const proposalRank = Number((rerenderProposalRankInput || "").trim());
    const payload: Record<string, unknown> = {};
    if (Number.isFinite(proposalID) && proposalID > 0) {
      payload.proposal_id = Math.trunc(proposalID);
    }
    if (Number.isFinite(proposalRank) && proposalRank > 0) {
      payload.proposal_rank = Math.trunc(proposalRank);
    }
    if (!payload.proposal_id && !payload.proposal_rank) {
      setExportNoticeLevel("error");
      setExportNoticeCode("proposal_required");
      setExportNotice("补渲染失败：请填写 proposal_id 或 proposal_rank");
      return;
    }

    setRerenderSubmitting(true);
    setExportNotice(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/${activeJobID}/rerender-gif`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await parseApiError(res, "补渲染失败"));
      const data = (await res.json()) as {
        result?: {
          output_id?: number;
          output_object_key?: string;
          proposal_id?: number;
          proposal_rank?: number;
          cost_delta_cny?: number;
          zip_invalidated?: boolean;
        };
      };
      const outputID = Number(data?.result?.output_id || 0);
      const proposalText = data?.result?.proposal_id
        ? `proposal #${data.result.proposal_id}`
        : data?.result?.proposal_rank
          ? `proposal_rank #${data.result.proposal_rank}`
          : "proposal";
      const costDelta = parseNumberValue(data?.result?.cost_delta_cny);
      const zipInvalidated = Boolean(data?.result?.zip_invalidated);
      setExportNoticeLevel("success");
      setExportNotice(
        `补渲染完成：${proposalText} -> output #${outputID || "-"}${typeof costDelta === "number" ? `，成本增量 ${costDelta.toFixed(4)} CNY` : ""}${zipInvalidated ? "，ZIP已失效待重建" : ""}`
      );
      await loadDetail(activeJobID);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "补渲染失败";
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "reload_detail", job_id: activeJobID });
      setExportNotice(`补渲染失败：${message}`);
    } finally {
      setRerenderSubmitting(false);
    }
  }, [
    detail?.job?.id,
    loadDetail,
    rerenderProposalIDInput,
    rerenderProposalRankInput,
    setExportNotice,
    setExportNoticeCode,
    setExportNoticeLevel,
    setExportNoticeRetryAction,
  ]);

  const submitManualGIFReviewDecision = useCallback(async () => {
    const activeJobID = detail?.job?.id;
    if (!activeJobID) return;
    const outputID = Number((manualDecisionOutputIDInput || "").trim());
    const proposalID = Number((manualDecisionProposalIDInput || "").trim());
    const decision = normalizeReviewStatus(manualDecisionStatus);
    if (!Number.isFinite(outputID) || outputID <= 0) {
      setExportNoticeLevel("error");
      setExportNoticeCode("output_required");
      setExportNotice("人工决策失败：请填写 output_id");
      return;
    }
    if (!decision || decision === "all") {
      setExportNoticeLevel("error");
      setExportNoticeCode("invalid_decision");
      setExportNotice("人工决策失败：请选择有效决策状态");
      return;
    }

    const item: Record<string, unknown> = {
      output_id: Math.trunc(outputID),
      decision,
      reason: (manualDecisionReason || "").trim(),
      notes: (manualDecisionNotes || "").trim(),
    };
    if (Number.isFinite(proposalID) && proposalID > 0) {
      item.proposal_id = Math.trunc(proposalID);
    }

    setManualDecisionSubmitting(true);
    setExportNotice(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/${activeJobID}/gif-review-decisions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: `manual-${Date.now()}`,
          items: [item],
        }),
      });
      if (!res.ok) throw new Error(await parseApiError(res, "人工决策失败"));
      const data = (await res.json()) as AdminVideoJobGIFReviewDecisionResponse;
      const applied = Number(data.applied || 0);
      const skipped = Number(data.skipped || 0);
      setExportNoticeLevel("success");
      setExportNotice(`人工决策已提交：applied ${applied} / skipped ${skipped}`);
      setManualDecisionReason("");
      setManualDecisionNotes("");
      await loadDetail(activeJobID);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "人工决策失败";
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "reload_detail", job_id: activeJobID });
      setExportNotice(`人工决策失败：${message}`);
    } finally {
      setManualDecisionSubmitting(false);
    }
  }, [
    detail?.job?.id,
    loadDetail,
    manualDecisionNotes,
    manualDecisionOutputIDInput,
    manualDecisionProposalIDInput,
    manualDecisionReason,
    manualDecisionStatus,
    setExportNotice,
    setExportNoticeCode,
    setExportNoticeLevel,
    setExportNoticeRetryAction,
  ]);

  const submitBatchManualGIFReviewDecisions = useCallback(async () => {
    const activeJobID = detail?.job?.id;
    if (!activeJobID) return;
    const parsed = parseManualGIFReviewDecisionBatchInput(manualDecisionBatchInput);
    if (parsed.errors.length) {
      setExportNoticeLevel("error");
      setExportNoticeCode("batch_parse_error");
      setExportNotice(`批量人工决策失败：${parsed.errors[0]}`);
      return;
    }
    if (!parsed.items.length) {
      setExportNoticeLevel("error");
      setExportNoticeCode("batch_items_required");
      setExportNotice("批量人工决策失败：请输入有效内容");
      return;
    }

    setManualDecisionBatchSubmitting(true);
    setExportNotice(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/${activeJobID}/gif-review-decisions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: `manual-batch-${Date.now()}`,
          items: parsed.items,
        }),
      });
      if (!res.ok) throw new Error(await parseApiError(res, "批量人工决策失败"));
      const data = (await res.json()) as AdminVideoJobGIFReviewDecisionResponse;
      const applied = Number(data.applied || 0);
      const skipped = Number(data.skipped || 0);
      setExportNoticeLevel("success");
      setExportNotice(`批量人工决策完成：applied ${applied} / skipped ${skipped}`);
      setManualDecisionBatchInput("");
      await loadDetail(activeJobID);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "批量人工决策失败";
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "reload_detail", job_id: activeJobID });
      setExportNotice(`批量人工决策失败：${message}`);
    } finally {
      setManualDecisionBatchSubmitting(false);
    }
  }, [
    detail?.job?.id,
    loadDetail,
    manualDecisionBatchInput,
    setExportNotice,
    setExportNoticeCode,
    setExportNoticeLevel,
    setExportNoticeRetryAction,
  ]);

  const exportAuditChainCSV = useCallback(async () => {
    const activeJobID = detail?.job?.id;
    if (!activeJobID) return;
    if (!auditChain) {
      setExportNoticeLevel("error");
      setExportNoticeCode("audit_chain_missing");
      setExportNotice("导出失败：当前任务审计链尚未加载完成");
      return;
    }
    setExportingAuditChainCSV(true);
    setExportNotice(null);
    try {
      const summary = auditChain.summary || {};
      const evaluationRows = Array.isArray(auditChain.gif_evaluations) ? auditChain.gif_evaluations : [];
      const feedbackRows = Array.isArray(auditChain.feedbacks) ? auditChain.feedbacks : [];
      const rerenderRows = Array.isArray(auditChain.rerenders) ? auditChain.rerenders : [];
      const reviewRows = Array.isArray(auditChain.ai_gif_reviews)
        ? auditChain.ai_gif_reviews
        : Array.isArray(detail?.ai_gif_reviews)
          ? detail.ai_gif_reviews
          : [];
      const rows: Array<Record<string, unknown>> = [];
      rows.push({
        record_type: "summary",
        job_id: activeJobID,
        record_id: "",
        output_id: "",
        proposal_id: "",
        recommendation: summary.latest_recommendation || "",
        decision: "",
        action: "",
        stage: "",
        score_overall: "",
        score_semantic: "",
        score_clarity: "",
        score_loop: "",
        score_motion: "",
        score_efficiency: "",
        hard_gate_blocked_count: summary.hard_gate_blocked_count || 0,
        candidate_count: summary.candidate_count || 0,
        proposal_count: summary.proposal_count || 0,
        output_count: summary.output_count || 0,
        evaluation_count: summary.evaluation_count || 0,
        review_count: summary.review_count || 0,
        feedback_count: summary.feedback_count || 0,
        rerender_count: summary.rerender_count || 0,
        ai_usage_count: summary.ai_usage_count || 0,
        pipeline_mode: summary.pipeline_mode || "",
        policy_version: summary.policy_version || "",
        experiment_bucket: summary.experiment_bucket || "",
        trigger: "",
        reason: "",
        notes: "",
        created_at: summary.latest_recommendation_at || "",
      });

      for (const item of evaluationRows) {
        rows.push({
          record_type: "evaluation",
          job_id: activeJobID,
          record_id: item.id || "",
          output_id: item.output_id || "",
          proposal_id: item.proposal_id || "",
          recommendation: "",
          decision: "",
          action: "",
          stage: "scoring",
          score_overall: item.overall_score ?? "",
          score_semantic: item.emotion_score ?? "",
          score_clarity: item.clarity_score ?? "",
          score_loop: item.loop_score ?? "",
          score_motion: item.motion_score ?? "",
          score_efficiency: item.efficiency_score ?? "",
          hard_gate_blocked_count: "",
          candidate_count: "",
          proposal_count: "",
          output_count: "",
          evaluation_count: "",
          review_count: "",
          feedback_count: "",
          rerender_count: "",
          ai_usage_count: "",
          pipeline_mode: "",
          policy_version: "",
          experiment_bucket: "",
          trigger: "",
          reason: "",
          notes: "",
          created_at: item.created_at || "",
        });
      }

      for (const item of reviewRows) {
        rows.push({
          record_type: "review",
          job_id: activeJobID,
          record_id: item.id || "",
          output_id: item.output_id || "",
          proposal_id: item.proposal_id || "",
          recommendation: item.final_recommendation || "",
          decision: item.final_recommendation || "",
          action: "",
          stage: "reviewing",
          score_overall: item.semantic_verdict ?? "",
          score_semantic: item.semantic_verdict ?? "",
          score_clarity: "",
          score_loop: "",
          score_motion: "",
          score_efficiency: "",
          hard_gate_blocked_count: "",
          candidate_count: "",
          proposal_count: "",
          output_count: "",
          evaluation_count: "",
          review_count: "",
          feedback_count: "",
          rerender_count: "",
          ai_usage_count: "",
          pipeline_mode: "",
          policy_version: "",
          experiment_bucket: "",
          trigger: "",
          reason: item.diagnostic_reason || "",
          notes: item.suggested_action || "",
          created_at: item.created_at || "",
        });
      }

      for (const item of feedbackRows) {
        rows.push({
          record_type: "feedback",
          job_id: activeJobID,
          record_id: item.id || "",
          output_id: item.output_id || "",
          proposal_id: "",
          recommendation: "",
          decision: "",
          action: item.action || "",
          stage: "feedback",
          score_overall: item.weight ?? "",
          score_semantic: "",
          score_clarity: "",
          score_loop: "",
          score_motion: "",
          score_efficiency: "",
          hard_gate_blocked_count: "",
          candidate_count: "",
          proposal_count: "",
          output_count: "",
          evaluation_count: "",
          review_count: "",
          feedback_count: "",
          rerender_count: "",
          ai_usage_count: "",
          pipeline_mode: "",
          policy_version: "",
          experiment_bucket: "",
          trigger: "",
          reason: item.scene_tag || "",
          notes: "",
          created_at: item.created_at || "",
        });
      }

      for (const item of rerenderRows) {
        rows.push({
          record_type: "rerender",
          job_id: activeJobID,
          record_id: item.review_id || "",
          output_id: item.output_id || "",
          proposal_id: item.proposal_id || "",
          recommendation: item.recommendation || "",
          decision: item.recommendation || "",
          action: "rerender",
          stage: "rendering",
          score_overall: "",
          score_semantic: "",
          score_clarity: "",
          score_loop: "",
          score_motion: "",
          score_efficiency: "",
          hard_gate_blocked_count: "",
          candidate_count: "",
          proposal_count: "",
          output_count: "",
          evaluation_count: "",
          review_count: "",
          feedback_count: "",
          rerender_count: "",
          ai_usage_count: "",
          pipeline_mode: "",
          policy_version: "",
          experiment_bucket: "",
          trigger: item.trigger || "",
          reason: item.diagnostic || "",
          notes: item.suggested_action || "",
          created_at: item.created_at || "",
        });
      }

      const headers = [
        "record_type",
        "job_id",
        "record_id",
        "output_id",
        "proposal_id",
        "recommendation",
        "decision",
        "action",
        "stage",
        "score_overall",
        "score_semantic",
        "score_clarity",
        "score_loop",
        "score_motion",
        "score_efficiency",
        "hard_gate_blocked_count",
        "candidate_count",
        "proposal_count",
        "output_count",
        "evaluation_count",
        "review_count",
        "feedback_count",
        "rerender_count",
        "ai_usage_count",
        "pipeline_mode",
        "policy_version",
        "experiment_bucket",
        "trigger",
        "reason",
        "notes",
        "created_at",
      ];
      const csv = buildCSVText(headers, rows);
      const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
      const filename = `video_job_${activeJobID}_gif_audit_chain_${stamp}.csv`;
      downloadTextFile(filename, csv, "text/csv;charset=utf-8;");
      setExportNoticeLevel("success");
      setExportNotice(`导出成功：${filename}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "导出审计链失败";
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNotice(`导出失败：${message}`);
    } finally {
      setExportingAuditChainCSV(false);
    }
  }, [
    auditChain,
    detail?.job?.id,
    detail?.ai_gif_reviews,
    setExportNotice,
    setExportNoticeCode,
    setExportNoticeLevel,
  ]);

  const triggerGIFBatchRerender = useCallback(async () => {
    const activeJobID = detail?.job?.id;
    if (!activeJobID) return;
    const proposalIDs = parseIntegerListInput(batchRerenderProposalIDsInput);
    const proposalRanks = parseIntegerListInput(batchRerenderProposalRanksInput);
    if (!proposalIDs.length && !proposalRanks.length) {
      setExportNoticeLevel("error");
      setExportNoticeCode("proposal_required");
      setExportNotice("批量补渲染失败：请填写 proposal_ids 或 proposal_ranks");
      return;
    }

    setBatchRerenderSubmitting(true);
    setExportNotice(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/${activeJobID}/rerender-gif/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: `batch-${Date.now()}`,
          proposal_ids: proposalIDs,
          proposal_ranks: proposalRanks,
          strategy: batchRerenderStrategy,
          force: batchRerenderForce,
        }),
      });
      if (!res.ok) throw new Error(await parseApiError(res, "批量补渲染失败"));
      const data = (await res.json()) as AdminVideoJobGIFBatchRerenderResponse;
      const succeeded = Number(data.succeeded || 0);
      const total = Number(data.total || 0);
      const failed = Number(data.failed || 0);
      setBatchRerenderResult(data);
      setExportNoticeLevel("success");
      setExportNotice(`批量补渲染完成：${succeeded}/${total} 成功${failed > 0 ? `，失败 ${failed}` : ""}`);
      await loadDetail(activeJobID);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "批量补渲染失败";
      setExportNoticeLevel("error");
      setExportNoticeCode(resolveErrorCodeLabel(message));
      setExportNoticeRetryAction({ kind: "reload_detail", job_id: activeJobID });
      setExportNotice(`批量补渲染失败：${message}`);
    } finally {
      setBatchRerenderSubmitting(false);
    }
  }, [
    batchRerenderForce,
    batchRerenderProposalIDsInput,
    batchRerenderProposalRanksInput,
    batchRerenderStrategy,
    detail?.job?.id,
    loadDetail,
    setExportNotice,
    setExportNoticeCode,
    setExportNoticeLevel,
    setExportNoticeRetryAction,
  ]);

  const retryToastNotice = useCallback((notice: ToastNotice) => {
    const action = notice.retry_action;
    if (!action) return;
    removeToastNotice(notice.id);
    switch (action.kind) {
      case "reload_list":
        void load();
        break;
      case "reload_overview":
        void loadOverview();
        break;
      case "reload_sample_diff":
        void loadSampleBaselineDiff();
        break;
      case "reload_detail":
        if (action.job_id > 0) {
          void loadDetail(action.job_id);
        }
        break;
      case "apply_rollout_suggestion":
        void applyRolloutSuggestion();
        break;
      case "export_sample_baseline":
        void exportSampleBaseline();
        break;
      case "export_feedback_report":
        void exportFeedbackReport();
        break;
      case "export_feedback_integrity_report":
        void exportFeedbackIntegrityReport();
        break;
      case "export_feedback_integrity_trend_report":
        void exportFeedbackIntegrityTrendReport();
        break;
      case "export_feedback_integrity_anomalies_report":
        void exportFeedbackIntegrityAnomalyReport();
        break;
      case "export_gif_sub_stage_anomalies_report":
        void exportGIFSubStageAnomalyReport();
        break;
      case "export_blocked_feedback_report":
        void exportBlockedFeedbackReport();
        break;
      case "export_sample_baseline_diff":
        void exportSampleBaselineDiff();
        break;
      default:
        break;
    }
  }, [
    applyRolloutSuggestion,
    exportBlockedFeedbackReport,
    exportFeedbackReport,
    exportFeedbackIntegrityAnomalyReport,
    exportFeedbackIntegrityReport,
    exportFeedbackIntegrityTrendReport,
    exportGIFSubStageAnomalyReport,
    exportSampleBaseline,
    exportSampleBaselineDiff,
    load,
    loadDetail,
    loadOverview,
    loadSampleBaselineDiff,
    removeToastNotice,
  ]);

  const stageSummary = useMemo(() => {
    const source = Array.isArray(overview?.stage_counts) ? overview.stage_counts : [];
    if (!source.length) return [];
    const max = source.reduce((acc, item) => Math.max(acc, item.count || 0), 0);
    const safeMax = max > 0 ? max : 1;
    return source.slice(0, 8).map((item) => ({
      ...item,
      ratio: Math.max(8, Math.round(((item.count || 0) / safeMax) * 100)),
    }));
  }, [overview?.stage_counts]);

  const stageDurations = useMemo(() => {
    const source = Array.isArray(overview?.stage_durations) ? overview.stage_durations : [];
    if (!source.length) return [];
    return source.slice(0, 12);
  }, [overview?.stage_durations]);

  const formatStats = useMemo(() => {
    const source = Array.isArray(overview?.format_stats_24h) ? overview.format_stats_24h : [];
    if (!source.length) return [];
    return source.slice(0, 12);
  }, [overview?.format_stats_24h]);
  const sourceProbeDurationBuckets = useMemo(() => {
    const source = Array.isArray(overview?.source_probe_duration_buckets) ? overview.source_probe_duration_buckets : [];
    if (!source.length) return [];
    return source.slice(0, 12);
  }, [overview?.source_probe_duration_buckets]);
  const sourceProbeResolutionBuckets = useMemo(() => {
    const source = Array.isArray(overview?.source_probe_resolution_buckets)
      ? overview.source_probe_resolution_buckets
      : [];
    if (!source.length) return [];
    return source.slice(0, 12);
  }, [overview?.source_probe_resolution_buckets]);
  const sourceProbeFpsBuckets = useMemo(() => {
    const source = Array.isArray(overview?.source_probe_fps_buckets) ? overview.source_probe_fps_buckets : [];
    if (!source.length) return [];
    return source.slice(0, 12);
  }, [overview?.source_probe_fps_buckets]);
  const sourceProbeDurationQuality = useMemo(() => {
    const source = Array.isArray(overview?.source_probe_duration_quality) ? overview.source_probe_duration_quality : [];
    if (!source.length) return [];
    return source.slice(0, 12);
  }, [overview?.source_probe_duration_quality]);
  const sourceProbeResolutionQuality = useMemo(() => {
    const source = Array.isArray(overview?.source_probe_resolution_quality)
      ? overview.source_probe_resolution_quality
      : [];
    if (!source.length) return [];
    return source.slice(0, 12);
  }, [overview?.source_probe_resolution_quality]);
  const sourceProbeFpsQuality = useMemo(() => {
    const source = Array.isArray(overview?.source_probe_fps_quality) ? overview.source_probe_fps_quality : [];
    if (!source.length) return [];
    return source.slice(0, 12);
  }, [overview?.source_probe_fps_quality]);

  const feedbackSceneStats = useMemo(() => {
    const source = Array.isArray(overview?.feedback_scene_stats) ? overview.feedback_scene_stats : [];
    if (!source.length) return [];
    return source.slice(0, 12);
  }, [overview?.feedback_scene_stats]);
  const feedbackAnomalyJobsWindow = Number(overview?.feedback_integrity_anomaly_jobs_window || 0);
  const feedbackTopPickConflictJobsWindow = Number(overview?.feedback_integrity_top_pick_conflict_jobs_window || 0);
  const feedbackNegativeGuardOverview = overview?.feedback_negative_guard_overview || null;
  const gifSubStageAnomalyJobsWindow = Number(overview?.gif_sub_stage_anomaly_jobs_window || 0);
  const gifSubStageAnomalyOverview = useMemo(() => {
    const source = Array.isArray(overview?.gif_sub_stage_anomaly_overview) ? overview.gif_sub_stage_anomaly_overview : [];
    if (!source.length) return [];
    return source.slice(0, 8);
  }, [overview?.gif_sub_stage_anomaly_overview]);
  const gifSubStageAnomalyReasons = useMemo(() => {
    const source = Array.isArray(overview?.gif_sub_stage_anomaly_reasons) ? overview.gif_sub_stage_anomaly_reasons : [];
    if (!source.length) return [];
    return source.slice(0, 12);
  }, [overview?.gif_sub_stage_anomaly_reasons]);
  const gifSubStageAnomalyByStage = useMemo(() => {
    const map = new Map<string, AdminVideoJobGIFSubStageAnomalyStat>();
    for (const item of gifSubStageAnomalyOverview) {
      const key = String(item.sub_stage || "").trim().toLowerCase();
      if (!key) continue;
      map.set(key, item);
    }
    return map;
  }, [gifSubStageAnomalyOverview]);
  const activeQuickGIFSubStage = useMemo(() => resolveQuickGIFSubStage(quick), [quick]);
  const activeQuickGIFSubStageLabel = useMemo(() => {
    if (!activeQuickGIFSubStage) return "全部细分阶段";
    return GIF_PIPELINE_STAGE_LABEL[activeQuickGIFSubStage] || activeQuickGIFSubStage;
  }, [activeQuickGIFSubStage]);
  const liveCoverSceneStats = useMemo(() => {
    const source = Array.isArray(overview?.live_cover_scene_stats) ? overview.live_cover_scene_stats : [];
    if (!source.length) return [];
    return source.slice(0, 12);
  }, [overview?.live_cover_scene_stats]);

  const feedbackGroupStats = useMemo(() => {
    const source = Array.isArray(overview?.feedback_group_stats) ? overview.feedback_group_stats : [];
    if (!source.length) return [];
    return source.slice(0, 8);
  }, [overview?.feedback_group_stats]);

  const feedbackGroupFormatStats = useMemo(() => {
    const source = Array.isArray(overview?.feedback_group_format_stats) ? overview.feedback_group_format_stats : [];
    if (!source.length) return [];
    return source.slice(0, 40);
  }, [overview?.feedback_group_format_stats]);
  const feedbackRolloutAuditLogs = useMemo(() => {
    const source = Array.isArray(overview?.feedback_rollout_audit_logs) ? overview.feedback_rollout_audit_logs : [];
    if (!source.length) return [];
    return source.slice(0, 12);
  }, [overview?.feedback_rollout_audit_logs]);

  const feedbackABInsight = useMemo(() => {
    if (!feedbackGroupStats.length) return null;
    const byGroup = new Map(feedbackGroupStats.map((item) => [String(item.group || "").toLowerCase(), item]));
    const treatment = byGroup.get("treatment");
    const control = byGroup.get("control");
    if (!treatment || !control) return null;

    const treatmentSignalsPerJob = treatment.jobs > 0 ? treatment.feedback_signals / treatment.jobs : 0;
    const controlSignalsPerJob = control.jobs > 0 ? control.feedback_signals / control.jobs : 0;
    const upliftSignals =
      controlSignalsPerJob > 0 ? (treatmentSignalsPerJob - controlSignalsPerJob) / controlSignalsPerJob : 0;

    const treatmentAvgScore = treatment.avg_engagement_score || 0;
    const controlAvgScore = control.avg_engagement_score || 0;
    const upliftScore = controlAvgScore > 0 ? (treatmentAvgScore - controlAvgScore) / controlAvgScore : 0;
    return {
      treatmentSignalsPerJob,
      controlSignalsPerJob,
      upliftSignals,
      treatmentAvgScore,
      controlAvgScore,
      upliftScore,
    };
  }, [feedbackGroupStats]);

  const feedbackABByFormat = useMemo(() => {
    if (!feedbackGroupFormatStats.length) return [];
    const grouped = new Map<string, { treatment?: AdminVideoJobFeedbackGroupFormatStat; control?: AdminVideoJobFeedbackGroupFormatStat }>();
    for (const item of feedbackGroupFormatStats) {
      const format = String(item.format || "").toLowerCase().trim();
      if (!format) continue;
      const key = format;
      const bucket = grouped.get(key) || {};
      const group = String(item.group || "").toLowerCase().trim();
      if (group === "treatment") bucket.treatment = item;
      if (group === "control") bucket.control = item;
      grouped.set(key, bucket);
    }

    const rows: Array<{
      format: string;
      treatmentSignalsPerJob: number;
      controlSignalsPerJob: number;
      signalUplift: number;
      treatmentScore: number;
      controlScore: number;
      scoreUplift: number;
    }> = [];
    for (const [format, item] of grouped.entries()) {
      if (!item.treatment || !item.control) continue;
      const treatmentSignalsPerJob =
        item.treatment.jobs > 0 ? item.treatment.feedback_signals / item.treatment.jobs : 0;
      const controlSignalsPerJob = item.control.jobs > 0 ? item.control.feedback_signals / item.control.jobs : 0;
      const signalUplift =
        controlSignalsPerJob > 0 ? (treatmentSignalsPerJob - controlSignalsPerJob) / controlSignalsPerJob : 0;
      const treatmentScore = item.treatment.avg_engagement_score || 0;
      const controlScore = item.control.avg_engagement_score || 0;
      const scoreUplift = controlScore > 0 ? (treatmentScore - controlScore) / controlScore : 0;
      rows.push({
        format,
        treatmentSignalsPerJob,
        controlSignalsPerJob,
        signalUplift,
        treatmentScore,
        controlScore,
        scoreUplift,
      });
    }
    rows.sort((a, b) => a.format.localeCompare(b.format));
    return rows;
  }, [feedbackGroupFormatStats]);

  const rolloutRecommendation = overview?.feedback_rollout_recommendation || null;
  const canApplyRolloutSuggestion = useMemo(() => {
    if (!rolloutRecommendation) return false;
    const state = String(rolloutRecommendation.state || "").toLowerCase();
    const isActionable = state === "scale_up" || state === "scale_down";
    if (!isActionable) return false;
    if (!rolloutRecommendation.consecutive_passed) return false;
    return rolloutRecommendation.suggested_rollout_percent !== rolloutRecommendation.current_rollout_percent;
  }, [rolloutRecommendation]);
  const rolloutApplyHintText = useMemo(
    () => rolloutApplyHint(rolloutRecommendation, canApplyRolloutSuggestion),
    [canApplyRolloutSuggestion, rolloutRecommendation]
  );

  const windowLabel = formatWindowLabel(overview?.window || overviewWindow);
  const feedbackFilterLabel = useMemo(() => {
    const parts: string[] = [];
    if (userID.trim()) parts.push(`用户#${userID.trim()}`);
    if (formatFilter !== "all") parts.push(`格式:${formatFilter}`);
    if (guardReason.trim()) parts.push(`原因:${guardReason.trim()}`);
    if (!parts.length) return "全量";
    return parts.join(" / ");
  }, [formatFilter, guardReason, userID]);
  const blockedExportLabel = useMemo(() => {
    const reasonText = guardReason.trim();
    if (reasonText && quick === "guard_blocked") {
      return `导出当前阻断名单(${reasonText})`;
    }
    if (quick === "guard_blocked") {
      return `导出当前阻断名单(${overviewWindow})`;
    }
    if (reasonText) {
      return `导出原因阻断名单(${reasonText})`;
    }
    return `导出原因阻断名单(${overviewWindow})`;
  }, [guardReason, overviewWindow, quick]);
  const gifSubStageExportLabel = useMemo(() => {
    if (!isGIFSubStageQuick(quick)) {
      return `导出细分阶段异常(${overviewWindow})`;
    }
    return `导出细分阶段异常(${activeQuickGIFSubStageLabel})`;
  }, [activeQuickGIFSubStageLabel, overviewWindow, quick]);
  const sourceProbeJobsWindow = overview?.source_probe_jobs_window ?? 0;
  const createdWindow = overview?.created_window ?? 0;
  const sourceProbeCoverageRate =
    sourceProbeJobsWindow > 0 && createdWindow > 0 ? sourceProbeJobsWindow / createdWindow : undefined;
  const sourceProbeInsights = useMemo(() => {
    const hints: string[] = [];
    if (sourceProbeJobsWindow <= 0) return hints;

    const sumBuckets = (rows: AdminVideoJobSimpleCount[], keys: string[]) =>
      rows.reduce((acc, item) => (keys.includes(item.key) ? acc + (item.count || 0) : acc), 0);
    const ratioText = (value: number) => formatPercent(value) || "0%";

    const longVideoCount = sumBuckets(sourceProbeDurationBuckets, ["3-10m", "10m+"]);
    if (sourceProbeJobsWindow >= 20 && longVideoCount/sourceProbeJobsWindow >= 0.35) {
      hints.push(`长视频输入占比 ${ratioText(longVideoCount / sourceProbeJobsWindow)}，建议优先优化长视频抽帧密度与并发上传。`);
    }

    const lowResCount = sumBuckets(sourceProbeResolutionBuckets, ["<480p", "480p"]);
    if (sourceProbeJobsWindow >= 20 && lowResCount/sourceProbeJobsWindow >= 0.35) {
      hints.push(`低分辨率输入占比 ${ratioText(lowResCount / sourceProbeJobsWindow)}，建议默认使用“体积优先+轻锐化”模板。`);
    }

    const highResCount = sumBuckets(sourceProbeResolutionBuckets, ["4k+", "2k"]);
    if (sourceProbeJobsWindow >= 20 && highResCount/sourceProbeJobsWindow >= 0.3) {
      hints.push(`高分辨率输入占比 ${ratioText(highResCount / sourceProbeJobsWindow)}，建议优先优化清晰优先模板与压缩预算策略。`);
    }

    const pickWorstFailure = (rows: AdminVideoJobSourceProbeQualityStat[]) => {
      const candidates = rows.filter((item) => (item.terminal_jobs || 0) >= 5);
      if (!candidates.length) return null;
      return [...candidates].sort((a, b) => {
        if ((b.failure_rate || 0) !== (a.failure_rate || 0)) return (b.failure_rate || 0) - (a.failure_rate || 0);
        return (b.jobs || 0) - (a.jobs || 0);
      })[0];
    };

    const worstDuration = pickWorstFailure(sourceProbeDurationQuality);
    if (worstDuration && (worstDuration.failure_rate || 0) >= 0.2) {
      hints.push(
        `时长桶 ${worstDuration.bucket} 失败率 ${formatPercent(worstDuration.failure_rate)}，建议优先做该桶的参数回归与降档保护。`
      );
    }

    const worstResolution = pickWorstFailure(sourceProbeResolutionQuality);
    if (worstResolution && (worstResolution.failure_rate || 0) >= 0.2) {
      hints.push(
        `分辨率桶 ${worstResolution.bucket} 失败率 ${formatPercent(worstResolution.failure_rate)}，建议加该桶专项模板与兜底策略。`
      );
    }

    const slowDuration = [...sourceProbeDurationQuality]
      .filter((item) => (item.terminal_jobs || 0) >= 5)
      .sort((a, b) => (b.duration_p95_sec || 0) - (a.duration_p95_sec || 0))[0];
    if (slowDuration && (slowDuration.duration_p95_sec || 0) >= 120) {
      hints.push(
        `时长桶 ${slowDuration.bucket} P95 耗时 ${formatSeconds(slowDuration.duration_p95_sec)}，建议作为下一轮性能优化优先对象。`
      );
    }

    return hints.slice(0, 4);
  }, [
    sourceProbeDurationBuckets,
    sourceProbeDurationQuality,
    sourceProbeJobsWindow,
    sourceProbeResolutionBuckets,
    sourceProbeResolutionQuality,
  ]);
  const sampleDiffSummary = sampleBaselineDiff?.summary;
  const sampleDiffFormats = useMemo(() => {
    const source = Array.isArray(sampleBaselineDiff?.formats) ? sampleBaselineDiff?.formats : [];
    return [...source].sort((a, b) => {
      if ((b.target_requested_jobs || 0) !== (a.target_requested_jobs || 0)) {
        return (b.target_requested_jobs || 0) - (a.target_requested_jobs || 0);
      }
      if ((b.target_generated_jobs || 0) !== (a.target_generated_jobs || 0)) {
        return (b.target_generated_jobs || 0) - (a.target_generated_jobs || 0);
      }
      return (a.format || "").localeCompare(b.format || "");
    });
  }, [sampleBaselineDiff?.formats]);
  const sampleDiffDecision = useMemo(
    () => resolveSampleBaselineDiffDecision(sampleDiffSummary, sampleDiffFormats),
    [sampleDiffFormats, sampleDiffSummary]
  );
  const detailHighlightFeedback = useMemo(
    () => resolveHighlightFeedbackDrilldown(detail?.job?.metrics),
    [detail?.job?.metrics]
  );
  const detailGIFPipelineSubStages = useMemo(
    () => resolveGIFPipelineSubStages(detail?.job?.metrics),
    [detail?.job?.metrics]
  );
  const detailGIFRenderSelection = useMemo(
    () => resolveGIFRenderSelection(detail?.job?.metrics),
    [detail?.job?.metrics]
  );
  const detailSourceVideoDeleted = useMemo(
    () => parseBooleanValue(detail?.job?.metrics?.source_video_deleted),
    [detail?.job?.metrics]
  );
  const detailAIUsageRows = useMemo(() => {
    const source = Array.isArray(detail?.ai_usages) ? detail.ai_usages : [];
    return [...source].sort((a, b) => {
      const at = new Date(a.created_at || "").getTime();
      const bt = new Date(b.created_at || "").getTime();
      if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) {
        return bt - at;
      }
      return (b.id || 0) - (a.id || 0);
    });
  }, [detail?.ai_usages]);
  const detailAIUsageStageSummary = useMemo(
    () => summarizeAIUsageByStage(detailAIUsageRows),
    [detailAIUsageRows]
  );
  const detailAIDirectives = useMemo(() => {
    const source = Array.isArray(detail?.ai_gif_directives) ? detail.ai_gif_directives : [];
    return [...source].sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [detail?.ai_gif_directives]);
  const detailAIProposals = useMemo(() => {
    const source = Array.isArray(detail?.ai_gif_proposals) ? detail.ai_gif_proposals : [];
    return [...source].sort((a, b) => {
      const ar = Number(a.proposal_rank || 0);
      const br = Number(b.proposal_rank || 0);
      if (ar > 0 && br > 0 && ar !== br) return ar - br;
      return (a.id || 0) - (b.id || 0);
    });
  }, [detail?.ai_gif_proposals]);
  const detailRenderedProposalIDs = useMemo(() => {
    const rendered = new Set<number>();
    for (const artifact of detail?.artifacts || []) {
      if ((artifact.type || "").toLowerCase() !== "main") continue;
      const key = String(artifact.qiniu_key || "").toLowerCase();
      if (!key.includes("/outputs/gif/")) continue;
      const proposalID = parseNumberValue(artifact.metadata?.proposal_id);
      if (typeof proposalID === "number" && proposalID > 0) {
        rendered.add(Math.trunc(proposalID));
      }
    }
    return rendered;
  }, [detail?.artifacts]);
  const detailPendingGIFProposals = useMemo(() => {
    return detailAIProposals.filter((item) => {
      const pid = Number(item.id || 0);
      return pid > 0 && !detailRenderedProposalIDs.has(pid);
    });
  }, [detailAIProposals, detailRenderedProposalIDs]);
  const manualDecisionBatchParsed = useMemo(
    () => parseManualGIFReviewDecisionBatchInput(manualDecisionBatchInput),
    [manualDecisionBatchInput]
  );
  const detailAuditSummary = useMemo(() => auditChain?.summary || null, [auditChain?.summary]);
  const detailAuditEvaluationRows = useMemo(() => {
    const source = Array.isArray(auditChain?.gif_evaluations) ? auditChain.gif_evaluations : [];
    return [...source].sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [auditChain?.gif_evaluations]);
  const detailAuditFeedbackRows = useMemo(() => {
    const source = Array.isArray(auditChain?.feedbacks) ? auditChain.feedbacks : [];
    return [...source].sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [auditChain?.feedbacks]);
  const detailAuditRerenderRows = useMemo(() => {
    const source = Array.isArray(auditChain?.rerenders) ? auditChain.rerenders : [];
    return [...source].sort((a, b) => {
      const at = new Date(a.created_at || "").getTime();
      const bt = new Date(b.created_at || "").getTime();
      if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return bt - at;
      return (Number(b.review_id || 0) || 0) - (Number(a.review_id || 0) || 0);
    });
  }, [auditChain?.rerenders]);
  const detailAIReviewByOutputID = useMemo(() => {
    const out = new Map<number, AdminVideoJobAIGIFReview>();
    for (const item of detail?.ai_gif_reviews || []) {
      const outputID = Number(item.output_id || 0);
      if (!Number.isFinite(outputID) || outputID <= 0) continue;
      if (!out.has(outputID)) {
        out.set(outputID, item);
      }
    }
    return out;
  }, [detail?.ai_gif_reviews]);
  const detailEvaluationByOutputID = useMemo(() => {
    const out = new Map<number, AdminVideoJobGIFEvaluation>();
    for (const item of detailAuditEvaluationRows) {
      const outputID = Number(item.output_id || 0);
      if (!Number.isFinite(outputID) || outputID <= 0) continue;
      if (!out.has(outputID)) {
        out.set(outputID, item);
      }
    }
    return out;
  }, [detailAuditEvaluationRows]);
  const detailGIFMainOutputs = useMemo(() => {
    const source = Array.isArray(auditChain?.outputs)
      ? auditChain.outputs
      : Array.isArray(detail?.artifacts)
        ? detail.artifacts
        : [];
    const rows = source
      .filter((item) => String(item.type || "").toLowerCase() === "main")
      .filter((item) => String(item.qiniu_key || "").toLowerCase().includes("/outputs/gif/"))
      .map((item) => {
        const outputID = Number(item.id || 0);
        const proposalID = parseNumberValue(item.metadata?.proposal_id);
        const optimizationPayload =
          item.metadata && typeof item.metadata === "object"
            ? (item.metadata.gif_optimization_v1 as Record<string, unknown> | undefined)
            : undefined;
        const optimization = optimizationPayload
          ? {
              enabled: parseBooleanValue(optimizationPayload.enabled),
              attempted: parseBooleanValue(optimizationPayload.attempted),
              applied: parseBooleanValue(optimizationPayload.applied),
              level: parseNumberValue(optimizationPayload.level),
              before_size_bytes: parseNumberValue(optimizationPayload.before_size_bytes),
              after_size_bytes: parseNumberValue(optimizationPayload.after_size_bytes),
              saved_bytes: parseNumberValue(optimizationPayload.saved_bytes),
              saved_ratio: parseNumberValue(optimizationPayload.saved_ratio),
              reason: String(optimizationPayload.reason || ""),
              error: String(optimizationPayload.error || ""),
            }
          : undefined;
        return {
          id: outputID,
          proposal_id: typeof proposalID === "number" && proposalID > 0 ? Math.trunc(proposalID) : undefined,
          qiniu_key: String(item.qiniu_key || ""),
          url: String(item.url || ""),
          size_bytes: Number(item.size_bytes || 0),
          width: Number(item.width || 0),
          height: Number(item.height || 0),
          created_at: String(item.created_at || ""),
          optimization,
        };
      })
      .filter((item) => item.id > 0);
    rows.sort((a, b) => b.id - a.id);
    return rows;
  }, [auditChain?.outputs, detail?.artifacts]);
  const detailGIFPreviewCards = useMemo(() => {
    return detailGIFMainOutputs
      .map((item) => ({
        ...item,
        review: detailAIReviewByOutputID.get(item.id),
        evaluation: detailEvaluationByOutputID.get(item.id),
      }))
      .slice(0, 24);
  }, [detailAIReviewByOutputID, detailEvaluationByOutputID, detailGIFMainOutputs]);
  const renderProbeQualityTable = (
    title: string,
    rows: AdminVideoJobSourceProbeQualityStat[],
    keyPrefix: string
  ) => (
    <div className="rounded-2xl border border-cyan-100 bg-white p-3">
      <div className="mb-2 text-xs font-semibold text-cyan-700">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="bg-cyan-50 text-cyan-700">
            <tr>
              <th className="px-2 py-1.5">桶</th>
              <th className="px-2 py-1.5">任务数</th>
              <th className="px-2 py-1.5">完成/失败</th>
              <th className="px-2 py-1.5">失败率</th>
              <th className="px-2 py-1.5">P50</th>
              <th className="px-2 py-1.5">P95</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-50 text-slate-700">
            {rows.map((item) => (
              <tr key={`${keyPrefix}-${item.bucket}`}>
                <td className="px-2 py-1.5 font-semibold">{item.bucket}</td>
                <td className="px-2 py-1.5">{item.jobs || 0}</td>
                <td className="px-2 py-1.5">
                  {item.done_jobs || 0} / {item.failed_jobs || 0}
                  {item.pending_jobs > 0 ? <span className="text-slate-400">（进行中 {item.pending_jobs}）</span> : null}
                </td>
                <td
                  className={`px-2 py-1.5 ${
                    (item.failure_rate || 0) >= 0.2
                      ? "font-semibold text-rose-700"
                      : (item.failure_rate || 0) >= 0.1
                        ? "text-amber-700"
                        : "text-emerald-700"
                  }`}
                >
                  {formatPercent(item.failure_rate)}
                </td>
                <td className="px-2 py-1.5">{formatSeconds(item.duration_p50_sec)}</td>
                <td className="px-2 py-1.5">{formatSeconds(item.duration_p95_sec)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-slate-400">
                  暂无数据
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="用户创作任务"
        description="按用户查看视频转表情包任务，追踪处理进度与产物。"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/users/gif-baselines"
              className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-700 hover:border-violet-300"
            >
              样本基线页
            </Link>
            <Link
              href="/admin/users/feedback-integrity?format=all"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-300"
            >
              反馈完整性页
            </Link>
            <button
              className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-2 text-xs font-semibold text-fuchsia-700 hover:border-fuchsia-300"
              onClick={() => void exportSampleBaseline()}
              disabled={exportingSampleBaseline}
            >
              {exportingSampleBaseline ? "导出中..." : `导出样本基线(${overviewWindow})`}
            </button>
            <button
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:border-rose-300"
              onClick={() => void exportFeedbackReport()}
              disabled={exportingFeedbackReport}
            >
              {exportingFeedbackReport ? "导出中..." : `导出反馈报表(${overviewWindow})`}
            </button>
            <button
              className="rounded-xl border border-pink-200 bg-pink-50 px-4 py-2 text-xs font-semibold text-pink-700 hover:border-pink-300"
              onClick={() => void exportFeedbackIntegrityReport()}
              disabled={exportingFeedbackIntegrityReport}
              title={`当前筛选：${feedbackFilterLabel}`}
            >
              {exportingFeedbackIntegrityReport ? "导出中..." : `导出反馈完整性(${overviewWindow})`}
            </button>
            <button
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-300"
              onClick={() => void exportFeedbackIntegrityTrendReport()}
              disabled={exportingFeedbackIntegrityTrendReport}
              title={`当前筛选：${feedbackFilterLabel}`}
            >
              {exportingFeedbackIntegrityTrendReport ? "导出中..." : `导出完整性趋势(${overviewWindow})`}
            </button>
            <button
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 hover:border-amber-300"
              onClick={() => void exportFeedbackIntegrityAnomalyReport()}
              disabled={exportingFeedbackIntegrityAnomalyReport}
              title={`当前筛选：${feedbackFilterLabel}`}
            >
              {exportingFeedbackIntegrityAnomalyReport ? "导出中..." : `导出完整性异常(${overviewWindow})`}
            </button>
            <button
              className="rounded-xl border border-rose-300 bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-800 hover:border-rose-400"
              onClick={() => void exportBlockedFeedbackReport()}
              disabled={exportingBlockedFeedbackReport}
              title={`当前筛选：${feedbackFilterLabel}`}
            >
              {exportingBlockedFeedbackReport ? "导出中..." : blockedExportLabel}
            </button>
            <button
              className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700 hover:border-cyan-300"
              onClick={() => void exportGIFSubStageAnomalyReport()}
              disabled={exportingGIFSubStageAnomalyReport}
              title={isGIFSubStageQuick(quick) ? `当前子阶段筛选：${activeQuickGIFSubStageLabel}` : "建议先切换到子阶段异常快捷筛选后导出"}
            >
              {exportingGIFSubStageAnomalyReport ? "导出中..." : gifSubStageExportLabel}
            </button>
            <button
              className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-700 hover:border-violet-300"
              onClick={() => void exportSampleBaselineDiff()}
              disabled={exportingSampleBaselineDiff}
            >
              {exportingSampleBaselineDiff
                ? "导出中..."
                : `导出样本Diff(${sampleBaselineBaseWindow}→${overviewWindow})`}
            </button>
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
              onClick={() => {
                void load();
                void loadOverview();
                void loadSampleBaselineDiff();
              }}
              disabled={loading}
            >
              {loading ? "加载中..." : "刷新"}
            </button>
          </div>
        }
      />

      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-8">
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
            value={draftFormatFilter}
            onChange={(e) => setDraftFormatFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            {FORMAT_FILTER_OPTIONS.map((item) => (
              <option key={item} value={item}>
                格式：{item}
              </option>
            ))}
          </select>
          <input
            value={draftGuardReason}
            onChange={(e) => setDraftGuardReason(e.target.value)}
            placeholder="负反馈原因(可选)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-500"
          />
          <input
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="任务标题 / source key"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 md:col-span-2"
          />
          <select
            value={overviewWindow}
            onChange={(e) => setOverviewWindow(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="24h">概览窗口：24h</option>
            <option value="7d">概览窗口：7d</option>
            <option value="30d">概览窗口：30d</option>
          </select>
          <select
            value={sampleBaselineBaseWindow}
            onChange={(e) => setSampleBaselineBaseWindow(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500"
          >
            <option value="24h">样本基线对照：24h</option>
            <option value="7d">样本基线对照：7d</option>
            <option value="30d">样本基线对照：30d</option>
          </select>
          <button
            onClick={() => void applyListFilters()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            查询
          </button>
        </div>
      </div>

      {toastNotices.length ? (
        <div className="fixed right-5 top-5 z-50 space-y-2">
          {toastNotices.map((item) => (
            <div
              key={item.id}
              className={`max-w-[520px] rounded-2xl border bg-white/95 px-4 py-3 text-xs shadow-lg backdrop-blur ${
                item.level === "error" ? "border-rose-200" : "border-emerald-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`min-w-0 flex-1 ${item.level === "error" ? "text-rose-700" : "text-emerald-700"}`}>
                  {item.code ? (
                    <span className="mr-2 inline-flex rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                      {item.code}
                    </span>
                  ) : null}
                  {item.message}
                  {item.duplicate_count > 1 ? (
                    <span className="ml-2 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                      x{item.duplicate_count}
                    </span>
                  ) : null}
                </div>
                {item.level === "error" && item.retry_action ? (
                  <button
                    type="button"
                    onClick={() => retryToastNotice(item)}
                    className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 hover:border-amber-300"
                  >
                    重试
                  </button>
                ) : null}
                {item.level === "error" ? (
                  <button
                    type="button"
                    onClick={() => void copyToastMessage(item.message)}
                    className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:border-rose-300"
                  >
                    复制
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeToastNotice(item.id)}
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                    item.level === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300"
                  }`}
                >
                  关闭
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-400">任务总量</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{overview?.total ?? "-"}</div>
          <div className="mt-2 text-xs text-slate-500">{windowLabel}新增：{overview?.created_window ?? "-"}</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
          <div className="text-xs text-emerald-600">运行中 / 排队中</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">
            {(overview?.running ?? 0) + (overview?.queued ?? 0)}
          </div>
          <div className="mt-2 text-xs text-emerald-700">
            running: {overview?.running ?? 0} · queued: {overview?.queued ?? 0}
          </div>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 shadow-sm">
          <div className="text-xs text-sky-600">{windowLabel}完成 / 失败</div>
          <div className="mt-1 text-2xl font-black text-sky-700">
            {overview?.done_window ?? 0} / {overview?.failed_window ?? 0}
          </div>
          <div className="mt-2 text-xs text-sky-700">
            done 总量: {overview?.done ?? 0} · failed 总量: {overview?.failed ?? 0}
          </div>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 shadow-sm">
          <div className="text-xs text-violet-600">处理耗时（{windowLabel}）</div>
          <div className="mt-1 text-2xl font-black text-violet-700">{formatSeconds(overview?.duration_p50_sec)}</div>
          <div className="mt-2 text-xs text-violet-700">P95: {formatSeconds(overview?.duration_p95_sec)}</div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
          <div className="text-xs text-amber-700">估算成本（{windowLabel}）</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{formatCurrency(overview?.cost_window)}</div>
          <div className="mt-2 text-xs text-amber-700">
            总成本: {formatCurrency(overview?.cost_total)} · 均价: {formatCurrency(overview?.cost_avg_window)}
          </div>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 shadow-sm">
          <div className="text-xs text-rose-700">用户反馈（{windowLabel}）</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{overview?.feedback_signals_window ?? 0}</div>
          <div className="mt-2 text-xs text-rose-700">
            下载 {overview?.feedback_downloads_window ?? 0} · 收藏 {overview?.feedback_favorites_window ?? 0}
          </div>
          <div className="mt-1 text-xs text-rose-700">
            参与任务 {overview?.feedback_engaged_jobs_window ?? 0} · 均分 {formatScore(overview?.feedback_avg_score_window)}
          </div>
        </div>
        <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/50 p-4 shadow-sm">
          <div className="text-xs text-fuchsia-700">样本合集基线（{windowLabel}）</div>
          <div className="mt-1 text-2xl font-black text-fuchsia-700">
            {overview?.sample_done_window ?? 0} / {overview?.sample_jobs_window ?? 0}
          </div>
          <div className="mt-2 text-xs text-fuchsia-700">
            成功率 {formatPercent(overview?.sample_success_rate_window)}
            {" · "}
            失败 {overview?.sample_failed_window ?? 0}
          </div>
          <div className="mt-1 text-xs text-fuchsia-700">
            P50 {formatSeconds(overview?.sample_duration_p50_sec)} · P95 {formatSeconds(overview?.sample_duration_p95_sec)}
          </div>
        </div>
      </div>

      {(sourceProbeDurationBuckets.length || sourceProbeResolutionBuckets.length || sourceProbeFpsBuckets.length) ? (
        <div className="rounded-3xl border border-cyan-100 bg-cyan-50/30 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-bold text-cyan-700">输入视频分布（{windowLabel}）</div>
            <div className="text-xs text-cyan-700">
              已探测 {sourceProbeJobsWindow}
              {createdWindow > 0 ? (
                <>
                  {" / "}
                  新增 {createdWindow}（覆盖率 {formatPercent(sourceProbeCoverageRate)}）
                </>
              ) : null}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-cyan-100 bg-white p-3">
              <div className="mb-2 text-xs font-semibold text-cyan-700">时长分布</div>
              <div className="space-y-1">
                {sourceProbeDurationBuckets.map((item) => (
                  <div key={`duration-${item.key}`} className="flex items-center justify-between text-xs text-slate-600">
                    <span>{item.key}</span>
                    <span className="font-semibold text-slate-700">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-white p-3">
              <div className="mb-2 text-xs font-semibold text-cyan-700">分辨率分布</div>
              <div className="space-y-1">
                {sourceProbeResolutionBuckets.map((item) => (
                  <div
                    key={`resolution-${item.key}`}
                    className="flex items-center justify-between text-xs text-slate-600"
                  >
                    <span>{item.key}</span>
                    <span className="font-semibold text-slate-700">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-white p-3">
              <div className="mb-2 text-xs font-semibold text-cyan-700">帧率分布</div>
              <div className="space-y-1">
                {sourceProbeFpsBuckets.map((item) => (
                  <div key={`fps-${item.key}`} className="flex items-center justify-between text-xs text-slate-600">
                    <span>{item.key}</span>
                    <span className="font-semibold text-slate-700">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {(sourceProbeDurationQuality.length || sourceProbeResolutionQuality.length || sourceProbeFpsQuality.length) ? (
        <div className="rounded-3xl border border-cyan-100 bg-cyan-50/30 p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-cyan-700">输入桶质量表现（{windowLabel}）</div>
          <div className="grid gap-3">
            {sourceProbeDurationQuality.length
              ? renderProbeQualityTable("按时长", sourceProbeDurationQuality, "duration-quality")
              : null}
            {sourceProbeResolutionQuality.length
              ? renderProbeQualityTable("按分辨率", sourceProbeResolutionQuality, "resolution-quality")
              : null}
            {sourceProbeFpsQuality.length ? renderProbeQualityTable("按帧率", sourceProbeFpsQuality, "fps-quality") : null}
          </div>
        </div>
      ) : null}

      {sourceProbeInsights.length ? (
        <div className="rounded-3xl border border-cyan-100 bg-cyan-50/30 p-4 shadow-sm">
          <div className="mb-2 text-sm font-bold text-cyan-700">输入结构优化建议（自动）</div>
          <div className="space-y-1.5 text-xs text-cyan-800">
            {sourceProbeInsights.map((item, index) => (
              <div key={`source-insight-${index}`} className="rounded-xl border border-cyan-100 bg-white px-3 py-2">
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-violet-100 bg-violet-50/30 p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-bold text-violet-700">
            样本基线 Diff（目标 {formatWindowLabel(sampleBaselineDiff?.target_window || overviewWindow)} vs 对照{" "}
            {formatWindowLabel(sampleBaselineDiff?.base_window || sampleBaselineBaseWindow)}）
          </div>
          {sampleBaselineDiffLoading ? (
            <span className="text-xs text-violet-500">加载中...</span>
        ) : (
            <span className="text-xs text-violet-500">
              更新时间：{formatTime(sampleBaselineDiff?.generated_at)}
            </span>
          )}
        </div>

        <div className={`mb-3 rounded-xl border px-3 py-2 ${sampleDiffDecision.panelClass}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${sampleDiffDecision.badgeClass}`}>
              {sampleDiffDecision.label}
            </span>
            <span className="text-xs text-slate-500">样本决策建议</span>
          </div>
          <div className={`mt-1 text-xs ${sampleDiffDecision.reasonClass}`}>{sampleDiffDecision.reason}</div>
        </div>

        {sampleDiffSummary ? (
          <div className="mb-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-violet-100 bg-white px-3 py-2">
              <div className="text-[11px] text-slate-500">成功率</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">
                {formatPercent(sampleDiffSummary.base_success_rate)} → {formatPercent(sampleDiffSummary.target_success_rate)}
              </div>
              <div className={`mt-1 text-xs ${upliftTextClass(sampleDiffSummary.success_rate_uplift)}`}>
                Δ {formatSignedPercent(sampleDiffSummary.success_rate_delta)} · Uplift {formatSignedPercent(sampleDiffSummary.success_rate_uplift)}
              </div>
            </div>
            <div className="rounded-xl border border-violet-100 bg-white px-3 py-2">
              <div className="text-[11px] text-slate-500">耗时 P50</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">
                {formatSeconds(sampleDiffSummary.base_duration_p50_sec)} → {formatSeconds(sampleDiffSummary.target_duration_p50_sec)}
              </div>
              <div className={`mt-1 text-xs ${upliftTextClass(sampleDiffSummary.duration_p50_uplift, { inverse: true })}`}>
                Δ {formatSignedSeconds(sampleDiffSummary.duration_p50_delta)} · Uplift {formatSignedPercent(sampleDiffSummary.duration_p50_uplift)}
              </div>
            </div>
            <div className="rounded-xl border border-violet-100 bg-white px-3 py-2">
              <div className="text-[11px] text-slate-500">耗时 P95</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">
                {formatSeconds(sampleDiffSummary.base_duration_p95_sec)} → {formatSeconds(sampleDiffSummary.target_duration_p95_sec)}
              </div>
              <div className={`mt-1 text-xs ${upliftTextClass(sampleDiffSummary.duration_p95_uplift, { inverse: true })}`}>
                Δ {formatSignedSeconds(sampleDiffSummary.duration_p95_delta)} · Uplift {formatSignedPercent(sampleDiffSummary.duration_p95_uplift)}
              </div>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-violet-100 bg-white">
          <table className="w-full min-w-[1180px] text-left text-xs">
            <thead className="bg-violet-50 text-violet-700">
              <tr>
                <th className="px-3 py-2">格式</th>
                <th className="px-3 py-2">目标请求/成功</th>
                <th className="px-3 py-2">成功率 (对照→目标)</th>
                <th className="px-3 py-2">成功率 Uplift</th>
                <th className="px-3 py-2">平均体积 (对照→目标)</th>
                <th className="px-3 py-2">体积 Δ / Uplift</th>
                <th className="px-3 py-2">P50 (对照→目标)</th>
                <th className="px-3 py-2">P95 (对照→目标)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50 text-slate-700">
              {sampleDiffFormats.map((item) => (
                <tr key={item.format}>
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
              {!sampleDiffFormats.length && !sampleBaselineDiffLoading ? (
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

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <button
          onClick={() => {
            setQuick("all");
            setPage(1);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            quick === "all" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          全部任务
        </button>
        <button
          onClick={() => {
            setQuick("retrying");
            setPage(1);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            quick === "retrying" ? "bg-amber-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          重试中（{overview?.retrying ?? 0}）
        </button>
        <button
          onClick={() => {
            setQuick("failed_24h");
            setPage(1);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            quick === "failed_24h" ? "bg-rose-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          24h 失败（{overview?.failed_24h ?? 0}）
        </button>
        <button
          onClick={() => {
            setQuick("sub_stage_anomaly");
            setPage(1);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            quick === "sub_stage_anomaly"
              ? "bg-cyan-700 text-white"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          子阶段异常（{gifSubStageAnomalyJobsWindow}）
        </button>
        <button
          onClick={() => {
            setQuick("sub_stage_briefing_anomaly");
            setPage(1);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            quick === "sub_stage_briefing_anomaly"
              ? "bg-cyan-600 text-white"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Briefing异常（{gifSubStageAnomalyByStage.get("briefing")?.anomaly_jobs ?? 0}）
        </button>
        <button
          onClick={() => {
            setQuick("sub_stage_planning_anomaly");
            setPage(1);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            quick === "sub_stage_planning_anomaly"
              ? "bg-cyan-600 text-white"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Planning异常（{gifSubStageAnomalyByStage.get("planning")?.anomaly_jobs ?? 0}）
        </button>
        <button
          onClick={() => {
            setQuick("sub_stage_scoring_anomaly");
            setPage(1);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            quick === "sub_stage_scoring_anomaly"
              ? "bg-cyan-600 text-white"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Scoring异常（{gifSubStageAnomalyByStage.get("scoring")?.anomaly_jobs ?? 0}）
        </button>
        <button
          onClick={() => {
            setQuick("sub_stage_reviewing_anomaly");
            setPage(1);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            quick === "sub_stage_reviewing_anomaly"
              ? "bg-cyan-600 text-white"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Reviewing异常（{gifSubStageAnomalyByStage.get("reviewing")?.anomaly_jobs ?? 0}）
        </button>
        <button
          onClick={() => {
            setQuick("feedback_anomaly");
            setPage(1);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            quick === "feedback_anomaly"
              ? "bg-rose-700 text-white"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          反馈异常（{feedbackAnomalyJobsWindow}）
        </button>
        <button
          onClick={() => {
            setQuick("top_pick_conflict");
            setPage(1);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            quick === "top_pick_conflict"
              ? "bg-amber-600 text-white"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          top_pick冲突（{feedbackTopPickConflictJobsWindow}）
        </button>
        <button
          onClick={() => {
            setQuick("guard_hit");
            setPage(1);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            quick === "guard_hit"
              ? "bg-rose-600 text-white"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          负反馈命中（{feedbackNegativeGuardOverview?.guard_reason_hit_jobs ?? 0}）
        </button>
        <button
          onClick={() => {
            setQuick("guard_blocked");
            setPage(1);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            quick === "guard_blocked"
              ? "bg-rose-700 text-white"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          原因阻断（{feedbackNegativeGuardOverview?.blocked_reason_jobs ?? 0}）
        </button>
        {guardReason.trim() ? (
          <button
            onClick={() => {
              setGuardReason("");
              setDraftGuardReason("");
              setPage(1);
            }}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:border-rose-300"
          >
            清除原因：{guardReason.trim()}
          </button>
        ) : null}
        {quick === "guard_blocked" ? (
          <button
            onClick={() => void exportBlockedFeedbackReport()}
            disabled={exportingBlockedFeedbackReport}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
            title={`当前筛选：${feedbackFilterLabel}`}
          >
            {exportingBlockedFeedbackReport ? "导出中..." : "导出当前筛选阻断名单"}
          </button>
        ) : null}
        {isGIFSubStageQuick(quick) ? (
          <button
            onClick={() => void exportGIFSubStageAnomalyReport()}
            disabled={exportingGIFSubStageAnomalyReport}
            className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            title={`当前子阶段筛选：${activeQuickGIFSubStageLabel}`}
          >
            {exportingGIFSubStageAnomalyReport ? "导出中..." : `导出当前子阶段异常(${activeQuickGIFSubStageLabel})`}
          </button>
        ) : null}
        <button
          onClick={() => {
            setSampleFilter((prev) => (prev === "sample" ? "all" : "sample"));
            setPage(1);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            sampleFilter === "sample"
              ? "bg-fuchsia-600 text-white"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          样本合集任务（{overview?.sample_jobs_window ?? 0}）
        </button>
      </div>

      {stageSummary.length ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-slate-800">阶段分布</div>
          <div className="grid gap-2 md:grid-cols-2">
            {stageSummary.map((item) => (
              <div key={item.key} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{STAGE_LABEL[item.key] || item.key}</span>
                  <span>{item.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${item.ratio}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {stageDurations.length ? (
        <div className="rounded-3xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-indigo-700">阶段耗时（{windowLabel}）</div>
          <div className="overflow-x-auto rounded-2xl border border-indigo-100 bg-white">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-indigo-50 text-indigo-700">
                <tr>
                  <th className="px-3 py-2">阶段流转</th>
                  <th className="px-3 py-2">样本数</th>
                  <th className="px-3 py-2">平均耗时</th>
                  <th className="px-3 py-2">P95 耗时</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50 text-slate-700">
                {stageDurations.map((item, index) => {
                  const fromLabel = STAGE_LABEL[item.from_stage] || item.from_stage;
                  const toLabel = STAGE_LABEL[item.to_stage] || item.to_stage;
                  return (
                    <tr key={`${item.transition}-${index}`}>
                      <td className="px-3 py-2 font-semibold text-slate-700">
                        {fromLabel} → {toLabel}
                      </td>
                      <td className="px-3 py-2">{item.count || 0}</td>
                      <td className="px-3 py-2">{formatSeconds(item.avg_sec)}</td>
                      <td className="px-3 py-2">{formatSeconds(item.p95_sec)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {gifSubStageAnomalyOverview.length ? (
        <div className="rounded-3xl border border-cyan-100 bg-cyan-50/30 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-bold text-cyan-700">GIF 细分阶段异常定位（{windowLabel}）</div>
            <div className="text-xs text-cyan-700">异常任务数：{gifSubStageAnomalyJobsWindow}</div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-2xl border border-cyan-100 bg-white">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="bg-cyan-50 text-cyan-700">
                  <tr>
                    <th className="px-3 py-2">细分阶段</th>
                    <th className="px-3 py-2">样本</th>
                    <th className="px-3 py-2">degraded</th>
                    <th className="px-3 py-2">failed</th>
                    <th className="px-3 py-2">异常率</th>
                    <th className="px-3 py-2">Top 原因</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-50 text-slate-700">
                  {gifSubStageAnomalyOverview.map((item) => (
                    <tr key={`gif-sub-stage-anomaly-${item.sub_stage}`}>
                      <td className="px-3 py-2 font-semibold text-slate-700">
                        {item.sub_stage_label || GIF_PIPELINE_STAGE_LABEL[item.sub_stage] || item.sub_stage}
                      </td>
                      <td className="px-3 py-2">{item.samples || 0}</td>
                      <td className="px-3 py-2 text-amber-700">{item.degraded_jobs || 0}</td>
                      <td className="px-3 py-2 text-rose-700">{item.failed_jobs || 0}</td>
                      <td className="px-3 py-2">{formatPercent(item.anomaly_rate)}</td>
                      <td className="px-3 py-2 max-w-[260px] truncate" title={item.top_reason || ""}>
                        {item.top_reason ? `${item.top_reason} (${item.top_reason_count || 0})` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-cyan-100 bg-white">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-cyan-50 text-cyan-700">
                  <tr>
                    <th className="px-3 py-2">阶段</th>
                    <th className="px-3 py-2">状态</th>
                    <th className="px-3 py-2">异常原因</th>
                    <th className="px-3 py-2">次数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-50 text-slate-700">
                  {gifSubStageAnomalyReasons.map((item, index) => (
                    <tr key={`gif-sub-stage-reason-${item.sub_stage}-${item.status}-${index}`}>
                      <td className="px-3 py-2 font-semibold text-slate-700">
                        {item.sub_stage_label || GIF_PIPELINE_STAGE_LABEL[item.sub_stage] || item.sub_stage}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.status === "failed"
                              ? "bg-rose-100 text-rose-700"
                              : item.status === "degraded"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.status || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-[240px] truncate" title={item.reason || ""}>
                        {item.reason || "-"}
                      </td>
                      <td className="px-3 py-2">{item.count || 0}</td>
                    </tr>
                  ))}
                  {!gifSubStageAnomalyReasons.length ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                        当前窗口暂无细分阶段异常原因样本
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {formatStats.length ? (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/30 p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-emerald-700">格式成功率与体积（{windowLabel}）</div>
          <div className="overflow-x-auto rounded-2xl border border-emerald-100 bg-white">
            <table className="w-full min-w-[1460px] text-left text-xs">
              <thead className="bg-emerald-50 text-emerald-700">
                <tr>
                  <th className="px-3 py-2">格式</th>
                  <th className="px-3 py-2">请求任务数</th>
                  <th className="px-3 py-2">成功生成任务数</th>
                  <th className="px-3 py-2">成功率</th>
                  <th className="px-3 py-2">产物数</th>
                  <th className="px-3 py-2">平均产物体积</th>
                  <th className="px-3 py-2">体积模板任务数</th>
                  <th className="px-3 py-2">体积模板命中率</th>
                  <th className="px-3 py-2">体积模板平均体积</th>
                  <th className="px-3 py-2">预算样本数</th>
                  <th className="px-3 py-2">预算命中数</th>
                  <th className="px-3 py-2">预算命中率</th>
                  <th className="px-3 py-2">反馈信号数</th>
                  <th className="px-3 py-2">有反馈任务数</th>
                  <th className="px-3 py-2">平均参与分</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 text-slate-700">
                {formatStats.map((item) => (
                  <tr key={item.format}>
                    <td className="px-3 py-2 font-semibold uppercase text-slate-700">{item.format || "-"}</td>
                    <td className="px-3 py-2">{item.requested_jobs || 0}</td>
                    <td className="px-3 py-2">{item.generated_jobs || 0}</td>
                    <td className="px-3 py-2">{formatPercent(item.success_rate)}</td>
                    <td className="px-3 py-2">{item.artifact_count || 0}</td>
                    <td className="px-3 py-2">{formatBytes(item.avg_artifact_size_bytes)}</td>
                    <td className="px-3 py-2">{item.size_profile_jobs || 0}</td>
                    <td className="px-3 py-2">{formatPercent(item.size_profile_rate)}</td>
                    <td className="px-3 py-2">{formatBytes(item.size_profile_avg_artifact_size_bytes)}</td>
                    <td className="px-3 py-2">{item.size_budget_samples || 0}</td>
                    <td className="px-3 py-2">{item.size_budget_hits || 0}</td>
                    <td className="px-3 py-2">{formatPercent(item.size_budget_hit_rate)}</td>
                    <td className="px-3 py-2">{item.feedback_signals || 0}</td>
                    <td className="px-3 py-2">{item.engaged_jobs || 0}</td>
                    <td className="px-3 py-2">{formatScore(item.avg_engagement_score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {(overview?.gif_loop_tune_overview?.samples ?? 0) > 0 ? (
        <div className="rounded-3xl border border-indigo-100 bg-indigo-50/30 p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-indigo-700">GIF 循环调优质量（{windowLabel}）</div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-indigo-100 bg-white p-3">
              <div className="text-[11px] text-indigo-500">样本 / 调优触发</div>
              <div className="mt-1 text-lg font-black text-indigo-700">
                {overview?.gif_loop_tune_overview?.applied ?? 0} / {overview?.gif_loop_tune_overview?.samples ?? 0}
              </div>
              <div className="mt-1 text-xs text-indigo-600">
                触发率 {formatPercent(overview?.gif_loop_tune_overview?.applied_rate)}
              </div>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-white p-3">
              <div className="text-[11px] text-indigo-500">有效生效 / 回退</div>
              <div className="mt-1 text-lg font-black text-indigo-700">
                {overview?.gif_loop_tune_overview?.effective_applied ?? 0} /{" "}
                {overview?.gif_loop_tune_overview?.fallback_to_base ?? 0}
              </div>
              <div className="mt-1 text-xs text-indigo-600">
                生效率 {formatPercent(overview?.gif_loop_tune_overview?.effective_applied_rate)} · 回退率{" "}
                {formatPercent(overview?.gif_loop_tune_overview?.fallback_rate)}
              </div>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-white p-3">
              <div className="text-[11px] text-indigo-500">首尾闭合 / 运动</div>
              <div className="mt-1 text-lg font-black text-indigo-700">
                {formatScore(overview?.gif_loop_tune_overview?.avg_loop_closure)} /{" "}
                {formatScore(overview?.gif_loop_tune_overview?.avg_motion_mean)}
              </div>
              <div className="mt-1 text-xs text-indigo-600">
                调优评分 {formatScore(overview?.gif_loop_tune_overview?.avg_score)}
              </div>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-white p-3">
              <div className="text-[11px] text-indigo-500">GIF 生效时长</div>
              <div className="mt-1 text-lg font-black text-indigo-700">
                {formatSeconds(overview?.gif_loop_tune_overview?.avg_effective_sec)}
              </div>
              <div className="mt-1 text-xs text-indigo-600">用于观察窗口裁剪是否稳定</div>
            </div>
          </div>
        </div>
      ) : null}

      {feedbackSceneStats.length ? (
        <div className="rounded-3xl border border-violet-100 bg-violet-50/30 p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-violet-700">反馈场景分布（{windowLabel}）</div>
          <div className="flex flex-wrap gap-2">
            {feedbackSceneStats.map((item) => (
              <span
                key={item.scene_tag}
                className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs text-violet-700"
              >
                <span className="font-semibold">{item.scene_tag}</span>
                <span>{item.signals || 0}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {liveCoverSceneStats.length ? (
        <div className="rounded-3xl border border-fuchsia-100 bg-fuchsia-50/30 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-bold text-fuchsia-700">
            <span>Live 封面质量（按场景，{windowLabel}）</span>
            <span className="rounded-full border border-fuchsia-200 bg-white px-2 py-0.5 text-[11px] font-medium text-fuchsia-600">
              低样本阈值：{overview?.live_cover_scene_min_samples ?? 5}
            </span>
            <span className="rounded-full border border-fuchsia-200 bg-white px-2 py-0.5 text-[11px] font-medium text-fuchsia-600">
              护栏样本：{overview?.live_cover_scene_guard_min_total ?? 20}
            </span>
            <span className="rounded-full border border-fuchsia-200 bg-white px-2 py-0.5 text-[11px] font-medium text-fuchsia-600">
              护栏底线：
              {typeof overview?.live_cover_scene_guard_score_floor === "number"
                ? overview.live_cover_scene_guard_score_floor.toFixed(2)
                : "0.58"}
            </span>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-fuchsia-100 bg-white">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-fuchsia-50 text-fuchsia-700">
                <tr>
                  <th className="px-3 py-2">场景</th>
                  <th className="px-3 py-2">样本数</th>
                  <th className="px-3 py-2">封面综合分</th>
                  <th className="px-3 py-2">竖图倾向分</th>
                  <th className="px-3 py-2">曝光稳定分</th>
                  <th className="px-3 py-2">人脸质量分</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fuchsia-50 text-slate-700">
                {liveCoverSceneStats.map((item) => (
                  <tr key={item.scene_tag}>
                    <td className="px-3 py-2 font-semibold">
                      <span>{item.scene_tag || "-"}</span>
                      {item.low_sample ? (
                        <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          低样本
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{item.samples || 0}</td>
                    <td className="px-3 py-2">{formatScore(item.avg_cover_score)}</td>
                    <td className="px-3 py-2">{formatScore(item.avg_cover_portrait)}</td>
                    <td className="px-3 py-2">{formatScore(item.avg_cover_exposure)}</td>
                    <td className="px-3 py-2">{formatScore(item.avg_cover_face)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {feedbackGroupStats.length ? (
        <div className="rounded-3xl border border-sky-100 bg-sky-50/30 p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-sky-700">反馈重排 A/B 分组（{windowLabel}）</div>
          <div className="overflow-x-auto rounded-2xl border border-sky-100 bg-white">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-sky-50 text-sky-700">
                <tr>
                  <th className="px-3 py-2">分组</th>
                  <th className="px-3 py-2">任务数</th>
                  <th className="px-3 py-2">有反馈任务数</th>
                  <th className="px-3 py-2">反馈信号数</th>
                  <th className="px-3 py-2">平均参与分</th>
                  <th className="px-3 py-2">已应用重排</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50 text-slate-700">
                {feedbackGroupStats.map((item) => (
                  <tr key={item.group}>
                    <td className="px-3 py-2 font-semibold uppercase">{item.group || "-"}</td>
                    <td className="px-3 py-2">{item.jobs || 0}</td>
                    <td className="px-3 py-2">{item.engaged_jobs || 0}</td>
                    <td className="px-3 py-2">{item.feedback_signals || 0}</td>
                    <td className="px-3 py-2">{formatScore(item.avg_engagement_score)}</td>
                    <td className="px-3 py-2">{item.applied_jobs || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {feedbackABInsight ? (
            <div className="mt-3 rounded-2xl border border-sky-100 bg-white px-3 py-2 text-xs text-sky-700">
              treatment 信号/任务 {feedbackABInsight.treatmentSignalsPerJob.toFixed(2)} vs control{" "}
              {feedbackABInsight.controlSignalsPerJob.toFixed(2)}（{formatSignedPercent(feedbackABInsight.upliftSignals)}）；
              平均参与分 {feedbackABInsight.treatmentAvgScore.toFixed(2)} vs {feedbackABInsight.controlAvgScore.toFixed(2)}（
              {formatSignedPercent(feedbackABInsight.upliftScore)}）
            </div>
          ) : null}
          {rolloutRecommendation ? (
            <div className="mt-3 rounded-2xl border border-sky-100 bg-white px-3 py-2 text-xs text-sky-700">
              <div>
                自动建议：{rolloutRecommendation.state || "hold"}（当前
                {rolloutRecommendation.current_rollout_percent ?? 0}% → 建议
                {rolloutRecommendation.suggested_rollout_percent ?? 0}%） · {rolloutRecommendation.reason || "-"}
              </div>
              <div className="mt-1">
                连续确认：{rolloutRecommendation.consecutive_matched ?? 0}/
                {rolloutRecommendation.consecutive_required ?? 0} ·{" "}
                {rolloutRecommendation.consecutive_passed ? "已通过" : "未通过"}
                {Array.isArray(rolloutRecommendation.recent_states) && rolloutRecommendation.recent_states.length
                  ? ` · 最近状态: ${rolloutRecommendation.recent_states.join(" / ")}`
                  : ""}
              </div>
              {rolloutRecommendation.live_guard_triggered ? (
                <div className="mt-1 text-[11px] text-amber-700">
                  Live 护栏：样本阈值 {rolloutRecommendation.live_guard_min_samples ?? 0}，有效样本{" "}
                  {rolloutRecommendation.live_guard_eligible_total ?? 0}，质量底线{" "}
                  {typeof rolloutRecommendation.live_guard_score_floor === "number"
                    ? rolloutRecommendation.live_guard_score_floor.toFixed(2)
                    : "-"}
                  {Array.isArray(rolloutRecommendation.live_guard_risk_scenes) &&
                  rolloutRecommendation.live_guard_risk_scenes.length
                    ? `，风险场景 ${rolloutRecommendation.live_guard_risk_scenes.join(" / ")}`
                    : ""}
                </div>
              ) : null}
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => void applyRolloutSuggestion()}
                  disabled={!canApplyRolloutSuggestion || applyingRollout}
                  className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {applyingRollout ? "应用中..." : "一键应用建议 rollout"}
                </button>
                {rolloutApplyHintText ? <span className="text-[11px] text-sky-500">{rolloutApplyHintText}</span> : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {feedbackABByFormat.length ? (
        <div className="rounded-3xl border border-cyan-100 bg-cyan-50/30 p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-cyan-700">A/B 按格式表现（{windowLabel}）</div>
          <div className="overflow-x-auto rounded-2xl border border-cyan-100 bg-white">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead className="bg-cyan-50 text-cyan-700">
                <tr>
                  <th className="px-3 py-2">格式</th>
                  <th className="px-3 py-2">treatment 信号/任务</th>
                  <th className="px-3 py-2">control 信号/任务</th>
                  <th className="px-3 py-2">信号 uplift</th>
                  <th className="px-3 py-2">treatment 参与分</th>
                  <th className="px-3 py-2">control 参与分</th>
                  <th className="px-3 py-2">参与分 uplift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-50 text-slate-700">
                {feedbackABByFormat.map((item) => (
                  <tr key={item.format}>
                    <td className="px-3 py-2 font-semibold uppercase">{item.format}</td>
                    <td className="px-3 py-2">{item.treatmentSignalsPerJob.toFixed(2)}</td>
                    <td className="px-3 py-2">{item.controlSignalsPerJob.toFixed(2)}</td>
                    <td className="px-3 py-2">{formatSignedPercent(item.signalUplift)}</td>
                    <td className="px-3 py-2">{item.treatmentScore.toFixed(2)}</td>
                    <td className="px-3 py-2">{item.controlScore.toFixed(2)}</td>
                    <td className="px-3 py-2">{formatSignedPercent(item.scoreUplift)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {feedbackRolloutAuditLogs.length ? (
        <div className="rounded-3xl border border-indigo-100 bg-indigo-50/30 p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-indigo-700">rollout 变更审计日志（最近）</div>
          <div className="overflow-x-auto rounded-2xl border border-indigo-100 bg-white">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead className="bg-indigo-50 text-indigo-700">
                <tr>
                  <th className="px-3 py-2">时间</th>
                  <th className="px-3 py-2">管理员</th>
                  <th className="px-3 py-2">窗口/连续确认</th>
                  <th className="px-3 py-2">变更</th>
                  <th className="px-3 py-2">状态</th>
                  <th className="px-3 py-2">说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50 text-slate-700">
                {feedbackRolloutAuditLogs.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">{formatTime(item.created_at)}</td>
                    <td className="px-3 py-2">#{item.admin_id || 0}</td>
                    <td className="px-3 py-2">
                      {item.window || "-"} / {item.confirm_windows || 0}
                    </td>
                    <td className="px-3 py-2">
                      {item.from_rollout_percent ?? 0}% → {item.to_rollout_percent ?? 0}%
                    </td>
                    <td className="px-3 py-2 uppercase">{item.recommendation_state || "-"}</td>
                    <td className="px-3 py-2">{item.recommendation_reason || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {overview?.top_failures?.length ? (
        <div className="rounded-3xl border border-amber-100 bg-amber-50/40 p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-amber-700">高频失败原因（Top）</div>
          <div className="grid gap-2 md:grid-cols-2">
            {overview.top_failures.map((item, index) => (
              <div key={`${item.reason}-${index}`} className="rounded-xl border border-amber-100 bg-white px-3 py-2 text-xs text-slate-600">
                <div className="font-semibold text-slate-700">#{index + 1} · {item.count} 次</div>
                <div className="mt-1 line-clamp-2" title={item.reason}>{item.reason || "-"}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">任务</th>
                <th className="px-4 py-3">用户</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">结果合集</th>
                <th className="px-4 py-3">创建时间</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((item) => {
                const requestedFormats = resolveRequestedFormats(item);
                const generatedFormats = resolveGeneratedFormats(item);
                const missingFormats = requestedFormats.filter((format) => !generatedFormats.includes(format));
                const sourceProbeSummary = formatSourceVideoProbe(resolveSourceVideoProbe(item.options));
                const rowHighlightFeedback = resolveHighlightFeedbackDrilldown(item.metrics);
                return (
                <tr key={item.id}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-semibold text-slate-800">#{item.id} {item.title || "未命名"}</div>
                    <div className="mt-1 max-w-[340px] truncate text-xs text-slate-400" title={item.source_video_key}>
                      {item.source_video_key}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">输入：{sourceProbeSummary}</div>
                    <div className="mt-1 text-xs text-slate-500">请求：{requestedFormats.join(",") || "-"}</div>
                    {item.status === "done" ? (
                      <div className="mt-1 text-xs text-emerald-600">生成：{generatedFormats.join(",") || "-"}</div>
                    ) : null}
                    {item.status === "done" && missingFormats.length ? (
                      <div className="mt-1 text-xs text-amber-600">缺失：{missingFormats.join(",")}</div>
                    ) : null}
                    {rowHighlightFeedback?.group === "treatment" ? (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        {rowHighlightFeedback.reason_negative_guard.length ? (
                          <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                            负反馈命中
                          </span>
                        ) : null}
                        {rowHighlightFeedback.blocked_reason ? (
                          <span className="inline-flex rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">
                            原因阻断
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-semibold text-slate-800">#{item.user?.id || 0} {item.user?.display_name || "-"}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.user?.phone || "-"}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      等级：{item.user?.user_level || "free"} · 计划：{item.user?.subscription_plan || "none"}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {STATUS_LABEL[item.status] || item.status}
                    </span>
                    <div className="mt-1 text-xs text-slate-500">{item.stage} · {item.progress || 0}%</div>
                    <div className="mt-1 text-xs text-amber-700">
                      成本：{formatCurrency(item.cost?.estimated_cost, item.cost?.currency || "CNY")}
                    </div>
                    {item.point_hold ? (
                      <div className="mt-1 text-xs text-indigo-600">
                        点数：预扣 {item.point_hold.reserved_points ?? 0} · 结算 {item.point_hold.settled_points ?? 0} ({item.point_hold.status || "-"})
                      </div>
                    ) : null}
                    {item.error_message ? (
                      <div className="mt-1 max-w-[280px] truncate text-xs text-rose-500" title={item.error_message}>
                        {item.error_message}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {item.result_collection_id ? (
                      <div>
                        <div className="text-xs font-semibold text-emerald-700">#{item.result_collection_id}</div>
                        <div className="mt-1 max-w-[220px] truncate text-xs text-slate-500" title={item.collection?.title}>
                          {item.collection?.title || "-"}
                        </div>
                        {item.collection?.is_sample ? (
                          <div className="mt-1 inline-flex rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-700">
                            样本
                          </div>
                        ) : null}
                        <Link
                          href={`/admin/archive/collections/${item.result_collection_id}/emojis`}
                          className="mt-1 inline-flex text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          查看合集
                        </Link>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-500">
                    <div>{formatTime(item.created_at)}</div>
                    <div className="mt-1">开始：{formatTime(item.started_at)}</div>
                    <div className="mt-1">结束：{formatTime(item.finished_at)}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <button
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => void loadDetail(item.id)}
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              )})}
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
        <div>
          共 {total} 条，当前第 {page} / {totalPages} 页
        </div>
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

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-3 text-sm font-bold text-slate-800">任务详情</div>
        {detailJobID ? <div className="mb-2 text-xs text-slate-400">当前选中任务：#{detailJobID}</div> : null}
        {detailLoading ? <div className="text-sm text-slate-400">加载中...</div> : null}
        {detailError ? <div className="text-sm text-rose-500">{detailError}</div> : null}
        {!detailLoading && !detailError && !detail ? (
          <div className="text-sm text-slate-400">请选择任务查看事件与产物。</div>
        ) : null}

        {detail ? (
          <div className="space-y-5">
            {(() => {
              const sourceProbeSummary = formatSourceVideoProbe(resolveSourceVideoProbe(detail.job.options));
              return (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
              <div>任务 #{detail.job.id} · {detail.job.title}</div>
              <div className="mt-1">状态：{detail.job.status} / {detail.job.stage} / {detail.job.progress}%</div>
              <div className="mt-1">source key：{detail.job.source_video_key}</div>
              <div className="mt-1">source probe：{sourceProbeSummary}</div>
              <div className="mt-1">估算成本：{formatCurrency(detail.job.cost?.estimated_cost, detail.job.cost?.currency || "CNY")}</div>
              <div className="mt-1">CPU：{formatSeconds((detail.job.cost?.cpu_ms || 0) / 1000)} · 输出体积：{formatBytes(detail.job.cost?.storage_bytes_output)}</div>
            </div>
              );
            })()}

            <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-violet-700">
                  GIF 审计链概览（ABC-A）
                </div>
                <button
                  type="button"
                  disabled={exportingAuditChainCSV || auditChainLoading || !auditChain}
                  onClick={() => {
                    void exportAuditChainCSV();
                  }}
                  className="rounded-lg border border-violet-200 bg-white px-2 py-1 text-[11px] text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exportingAuditChainCSV ? "导出中..." : "导出审计链CSV"}
                </button>
              </div>
              {auditChainLoading ? <div className="text-xs text-slate-500">审计链加载中...</div> : null}
              {auditChainError ? (
                <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  审计链加载失败：{auditChainError}
                </div>
              ) : null}
              {detailAuditSummary ? (
                <div className="grid gap-2 text-xs text-slate-700 md:grid-cols-3">
                  <div className="rounded-xl border border-violet-100 bg-white px-3 py-2">
                    <div>候选/提案：{detailAuditSummary.candidate_count || 0} / {detailAuditSummary.proposal_count || 0}</div>
                    <div className="mt-1">产物/评测：{detailAuditSummary.output_count || 0} / {detailAuditSummary.evaluation_count || 0}</div>
                    <div className="mt-1">复审/反馈：{detailAuditSummary.review_count || 0} / {detailAuditSummary.feedback_count || 0}</div>
                  </div>
                  <div className="rounded-xl border border-violet-100 bg-white px-3 py-2">
                    <div>重渲染：{detailAuditSummary.rerender_count || 0}</div>
                    <div className="mt-1">硬闸门阻断：{detailAuditSummary.hard_gate_blocked_count || 0}</div>
                    <div className="mt-1">AI调用：{detailAuditSummary.ai_usage_count || 0}</div>
                  </div>
                  <div className="rounded-xl border border-violet-100 bg-white px-3 py-2">
                    <div>pipeline_mode：{detailAuditSummary.pipeline_mode || "-"}</div>
                    <div className="mt-1">policy_version：{detailAuditSummary.policy_version || "-"}</div>
                    <div className="mt-1">experiment_bucket：{detailAuditSummary.experiment_bucket || "-"}</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">暂无审计链摘要</div>
              )}
              {detailAuditSummary?.latest_recommendation ? (
                <div className="mt-2 rounded-xl border border-violet-100 bg-white px-3 py-2 text-xs text-slate-700">
                  最新推荐：{reviewStatusLabel(detailAuditSummary.latest_recommendation)} · {formatTime(detailAuditSummary.latest_recommendation_at)}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                GIF 细分阶段（M49 兼容态）
              </div>
              <div className="max-h-72 overflow-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">子阶段</th>
                      <th className="px-3 py-2">状态</th>
                      <th className="px-3 py-2">开始</th>
                      <th className="px-3 py-2">结束</th>
                      <th className="px-3 py-2">耗时</th>
                      <th className="px-3 py-2">原因/错误</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {detailGIFPipelineSubStages.map((item) => (
                      <tr key={`gif-sub-stage-${item.key}`}>
                        <td className="px-3 py-2">{item.label}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${gifPipelineStatusBadgeClass(item.status)}`}>
                            {item.status || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatTime(item.started_at)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatTime(item.finished_at)}</td>
                        <td className="px-3 py-2">{formatDurationMs(item.duration_ms)}</td>
                        <td className="px-3 py-2 max-w-[260px] truncate" title={item.error || item.reason || ""}>
                          {item.error || item.reason || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {detailGIFRenderSelection ? (
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-700">
                  GIF 渲染策略（M50 主线）
                </div>
                <div className="grid gap-2 text-xs text-slate-700 md:grid-cols-3">
                  <div className="rounded-xl border border-cyan-100 bg-white px-3 py-2">
                    <div>版本：{detailGIFRenderSelection.version || "-"}</div>
                    <div className="mt-1">启用：{detailGIFRenderSelection.enabled ? "是" : "否"}</div>
                    <div className="mt-1">时长档位：{detailGIFRenderSelection.duration_tier || "-"}</div>
                  </div>
                  <div className="rounded-xl border border-cyan-100 bg-white px-3 py-2">
                    <div>候选池：{detailGIFRenderSelection.candidate_pool_count}</div>
                    <div className="mt-1">可渲染：{detailGIFRenderSelection.eligible_candidate_count}</div>
                    <div className="mt-1">最终渲染窗口：{detailGIFRenderSelection.selected_window_count}</div>
                  </div>
                  <div className="rounded-xl border border-cyan-100 bg-white px-3 py-2">
                    <div>
                      上限：{detailGIFRenderSelection.base_max_outputs} → {detailGIFRenderSelection.tier_max_outputs}
                    </div>
                    <div className="mt-1">置信阈值：{detailGIFRenderSelection.confidence_threshold.toFixed(2)}</div>
                    <div className="mt-1">
                      预算KB：{formatInteger(detailGIFRenderSelection.estimated_selected_kb)} /{" "}
                      {formatInteger(detailGIFRenderSelection.estimated_budget_limit_kb)}
                    </div>
                  </div>
                </div>
                <div className="mt-2 rounded-xl border border-cyan-100 bg-white px-3 py-2 text-xs text-slate-700">
                  <div>
                    dropped：low_conf={detailGIFRenderSelection.dropped_low_confidence} · size_budget=
                    {detailGIFRenderSelection.dropped_size_budget} · output_limit=
                    {detailGIFRenderSelection.dropped_output_limit}
                  </div>
                  <div className="mt-1">
                    fallback：{detailGIFRenderSelection.fallback_applied ? "是" : "否"} · reason：
                    {detailGIFRenderSelection.fallback_reason || "-"}
                  </div>
                </div>
                <div className="mt-2 rounded-xl border border-cyan-100 bg-white px-3 py-2 text-xs text-slate-700">
                  <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span>AI2 proposals：{detailAIProposals.length}</span>
                    <span>已渲染 proposal：{detailRenderedProposalIDs.size}</span>
                    <span>待补渲染 proposal：{detailPendingGIFProposals.length}</span>
                  </div>
                  {detailPendingGIFProposals.length ? (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {detailPendingGIFProposals.slice(0, 4).map((item) => (
                        <button
                          key={`pending-proposal-${item.id}`}
                          type="button"
                          className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[11px] text-cyan-700 hover:bg-cyan-100"
                          onClick={() => {
                            setRerenderProposalIDInput(String(item.id || ""));
                            setRerenderProposalRankInput(String(item.proposal_rank || ""));
                          }}
                        >
                          # {item.id} / rank {item.proposal_rank || "-"}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <input
                      value={rerenderProposalIDInput}
                      onChange={(e) => setRerenderProposalIDInput(e.target.value)}
                      placeholder="proposal_id（优先）"
                      className="rounded-lg border border-cyan-200 bg-white px-2 py-1 text-xs outline-none focus:border-cyan-400"
                    />
                    <input
                      value={rerenderProposalRankInput}
                      onChange={(e) => setRerenderProposalRankInput(e.target.value)}
                      placeholder="proposal_rank（兜底）"
                      className="rounded-lg border border-cyan-200 bg-white px-2 py-1 text-xs outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      disabled={rerenderSubmitting || detailSourceVideoDeleted}
                      onClick={() => {
                        void triggerGIFRerender();
                      }}
                      className="rounded-lg border border-cyan-200 bg-cyan-600 px-3 py-1 text-xs text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {detailSourceVideoDeleted ? "源视频已清理" : rerenderSubmitting ? "补渲染中..." : "按需补渲染 GIF"}
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    说明：新补渲染 GIF 默认标记为 need_manual_review；同时 ZIP 会失效，后续下载时按当前产物自动重建。
                    {detailSourceVideoDeleted ? " 当前任务源视频已清理，需重新上传重跑任务才能补渲染。" : ""}
                  </div>
                </div>
                <div className="mt-2 rounded-xl border border-cyan-100 bg-white px-3 py-2 text-xs text-slate-700">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-700">
                    批量补渲染（ABC-C1）
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      value={batchRerenderProposalIDsInput}
                      onChange={(e) => setBatchRerenderProposalIDsInput(e.target.value)}
                      placeholder="proposal_ids（逗号分隔）"
                      className="rounded-lg border border-cyan-200 bg-white px-2 py-1 text-xs outline-none focus:border-cyan-400"
                    />
                    <input
                      value={batchRerenderProposalRanksInput}
                      onChange={(e) => setBatchRerenderProposalRanksInput(e.target.value)}
                      placeholder="proposal_ranks（逗号分隔）"
                      className="rounded-lg border border-cyan-200 bg-white px-2 py-1 text-xs outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      value={batchRerenderStrategy}
                      onChange={(event) => setBatchRerenderStrategy(event.target.value)}
                      className="rounded-lg border border-cyan-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-cyan-400"
                    >
                      <option value="default">default</option>
                      <option value="loop_first">loop_first</option>
                      <option value="size_first">size_first</option>
                      <option value="clarity_first">clarity_first</option>
                      <option value="viral_first">viral_first</option>
                    </select>
                    <label className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={batchRerenderForce}
                        onChange={(event) => setBatchRerenderForce(event.target.checked)}
                      />
                      force
                    </label>
                    <button
                      type="button"
                      disabled={batchRerenderSubmitting || !detailPendingGIFProposals.length}
                      onClick={() => {
                        const proposalIDs = detailPendingGIFProposals.map((item) => Number(item.id || 0)).filter((id) => id > 0);
                        setBatchRerenderProposalIDsInput(proposalIDs.join(","));
                      }}
                      className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-700 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      填充待补渲染
                    </button>
                    <button
                      type="button"
                      disabled={batchRerenderSubmitting || detailSourceVideoDeleted}
                      onClick={() => {
                        void triggerGIFBatchRerender();
                      }}
                      className="rounded-lg border border-cyan-200 bg-cyan-600 px-3 py-1 text-xs text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {detailSourceVideoDeleted ? "源视频已清理" : batchRerenderSubmitting ? "批量补渲染中..." : "批量补渲染"}
                    </button>
                  </div>
                  {batchRerenderResult ? (
                    <div className="mt-2 rounded-lg border border-cyan-100 bg-cyan-50 px-2 py-1.5 text-[11px] text-cyan-800">
                      request_id：{batchRerenderResult.request_id || "-"} · total {batchRerenderResult.total || 0} · succeeded{" "}
                      {batchRerenderResult.succeeded || 0} · failed {batchRerenderResult.failed || 0}
                      {batchRerenderResult.idempotent ? " · idempotent" : ""}
                    </div>
                  ) : null}
                  {Array.isArray(batchRerenderResult?.items) && batchRerenderResult?.items?.length ? (
                    <div className="mt-2 max-h-44 overflow-auto rounded-lg border border-cyan-100">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-cyan-50 text-cyan-700">
                          <tr>
                            <th className="px-2 py-1">proposal</th>
                            <th className="px-2 py-1">状态</th>
                            <th className="px-2 py-1">output</th>
                            <th className="px-2 py-1">错误</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cyan-50 text-slate-700">
                          {(batchRerenderResult.items || []).map((item, idx) => (
                            <tr key={`batch-rerender-item-${idx}-${item.proposal_id || 0}`}>
                              <td className="px-2 py-1">
                                #{item.proposal_id || "-"} / rank {item.proposal_rank || "-"}
                              </td>
                              <td className="px-2 py-1">{item.status || "-"}</td>
                              <td className="px-2 py-1">{item.result?.output_id || "-"}</td>
                              <td className="px-2 py-1 max-w-[240px] truncate" title={item.error || ""}>
                                {item.error_code || item.error || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {detailAIDirectives.length ? (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
                  AI1 任务简报快照（Prompt Director）
                </div>
                <div className="grid gap-2 text-xs text-slate-700 md:grid-cols-2">
                  <div className="rounded-xl border border-indigo-100 bg-white px-3 py-2">
                    <div>状态：{detailAIDirectives[0].status || "-"}</div>
                    <div className="mt-1">fallback：{detailAIDirectives[0].fallback_used ? "是" : "否"}</div>
                    <div className="mt-1">brief_version：{detailAIDirectives[0].brief_version || "-"}</div>
                    <div className="mt-1">model_version：{detailAIDirectives[0].model_version || "-"}</div>
                    <div className="mt-1">style_direction：{detailAIDirectives[0].style_direction || "-"}</div>
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-white px-3 py-2">
                    <div>business_goal：{detailAIDirectives[0].business_goal || "-"}</div>
                    <div className="mt-1">clip_count：{detailAIDirectives[0].clip_count_min || 0} ~ {detailAIDirectives[0].clip_count_max || 0}</div>
                    <div className="mt-1">
                      duration_pref：{formatScore(detailAIDirectives[0].duration_pref_min_sec)}s ~ {formatScore(detailAIDirectives[0].duration_pref_max_sec)}s
                    </div>
                    <div className="mt-1">risk_flags：{(detailAIDirectives[0].risk_flags || []).join(" / ") || "-"}</div>
                  </div>
                </div>
                <div className="mt-2 rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs text-slate-700">
                  <div className="text-[11px] text-slate-500">directive_text</div>
                  <div className="mt-1 whitespace-pre-wrap break-words">{detailAIDirectives[0].directive_text || "-"}</div>
                </div>
              </div>
            ) : null}

            {detailAIProposals.length ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
                  AI2 方案提名详情（Planner）
                </div>
                <div className="max-h-72 overflow-auto rounded-2xl border border-blue-100 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-blue-50 text-blue-700">
                      <tr>
                        <th className="px-3 py-2">rank/id</th>
                        <th className="px-3 py-2">窗口</th>
                        <th className="px-3 py-2">置信度</th>
                        <th className="px-3 py-2">预期价值</th>
                        <th className="px-3 py-2">语义标签</th>
                        <th className="px-3 py-2">理由</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50 text-slate-700">
                      {detailAIProposals.map((item) => (
                        <tr key={`ai2-proposal-${item.id}`}>
                          <td className="px-3 py-2">
                            <div>#{item.proposal_rank || "-"}</div>
                            <div className="text-[10px] text-slate-500">id: {item.id}</div>
                          </td>
                          <td className="px-3 py-2">
                            {formatScore(item.start_sec)}s ~ {formatScore(item.end_sec)}s
                            <div className="text-[10px] text-slate-500">dur {formatScore(item.duration_sec)}s</div>
                          </td>
                          <td className="px-3 py-2">
                            <div>base {formatScore(item.base_score)}</div>
                            <div className="text-[10px] text-slate-500">
                              standalone {formatScore(item.standalone_confidence)} / loop {formatScore(item.loop_friendliness_hint)}
                            </div>
                          </td>
                          <td className="px-3 py-2">{item.expected_value_level || "-"}</td>
                          <td className="px-3 py-2 max-w-[220px] truncate" title={(item.semantic_tags || []).join(", ")}>
                            {(item.semantic_tags || []).join(" / ") || "-"}
                          </td>
                          <td className="px-3 py-2 max-w-[280px] truncate" title={item.proposal_reason || ""}>
                            {item.proposal_reason || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {detailGIFPreviewCards.length ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  GIF 产物预览 + 语义/评分
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {detailGIFPreviewCards.map((item) => (
                    <div key={`gif-card-${item.id}`} className="overflow-hidden rounded-xl border border-emerald-100 bg-white">
                      {item.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.url} alt={`gif-${item.id}`} className="h-40 w-full bg-slate-100 object-contain" />
                      ) : (
                        <div className="flex h-40 items-center justify-center bg-slate-100 text-xs text-slate-400">
                          无预览地址
                        </div>
                      )}
                      <div className="space-y-1.5 px-3 py-2 text-[11px] text-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">output #{item.id}</span>
                          <span className="text-slate-500">
                            {item.width > 0 && item.height > 0 ? `${item.width}x${item.height}` : "-"} · {formatBytes(item.size_bytes)}
                          </span>
                        </div>
                        <div className="text-slate-500">proposal #{item.proposal_id || "-"}</div>
                        <div>
                          AI3：{reviewStatusLabel(item.review?.final_recommendation)}
                          {typeof item.review?.semantic_verdict === "number"
                            ? ` · semantic ${formatScore(item.review.semantic_verdict)}`
                            : ""}
                        </div>
                        <div>
                          Eval：overall {formatScore(item.evaluation?.overall_score)} · clarity {formatScore(item.evaluation?.clarity_score)} · loop{" "}
                          {formatScore(item.evaluation?.loop_score)}
                        </div>
                        <div className="truncate text-slate-500" title={item.review?.diagnostic_reason || ""}>
                          语义说明：{item.review?.diagnostic_reason || "-"}
                        </div>
                        <div className="text-slate-500">
                          Gifsicle：
                          {item.optimization?.attempted
                            ? item.optimization?.applied
                              ? `已应用 · ${(Number(item.optimization.saved_ratio || 0) * 100).toFixed(2)}% · ${formatBytes(item.optimization.saved_bytes)}`
                              : `尝试未生效${item.optimization?.reason ? ` · ${item.optimization.reason}` : ""}${
                                  item.optimization?.error ? ` · ${item.optimization.error}` : ""
                                }`
                            : item.optimization?.enabled
                              ? "已启用（本产物未触发）"
                              : "未启用"}
                        </div>
                        <div className="truncate text-slate-400" title={item.qiniu_key}>
                          key：{item.qiniu_key}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                AI 阶段调用与成本（AI1/AI2/AI3）
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {detailAIUsageStageSummary.map((item) => (
                  <div key={`ai-stage-${item.stage}`} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <div className="font-semibold text-slate-800">{item.label}</div>
                    <div className="mt-1">调用：{item.calls}（成功 {item.success_calls} / 失败 {item.error_calls}）</div>
                    <div className="mt-1">Input/Output：{formatInteger(item.total_input_tokens)} / {formatInteger(item.total_output_tokens)}</div>
                    <div className="mt-1">Cached/Image/Video：{formatInteger(item.total_cached_tokens)} / {formatInteger(item.total_image_tokens)} / {formatInteger(item.total_video_tokens)}</div>
                    <div className="mt-1">耗时：{formatDurationMs(item.total_duration_ms)}（均值 {formatDurationMs(item.avg_duration_ms)}）</div>
                    <div className="mt-1">成本（USD）：{formatCurrency(item.total_cost_usd, "USD")}</div>
                  </div>
                ))}
                {!detailAIUsageStageSummary.length ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-6 text-center text-xs text-slate-400 md:col-span-3">
                    暂无 AI 调用记录
                  </div>
                ) : null}
              </div>

              {detailAIUsageRows.length ? (
                <div className="mt-3 max-h-72 overflow-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-3 py-2">阶段</th>
                        <th className="px-3 py-2">状态</th>
                        <th className="px-3 py-2">tokens</th>
                        <th className="px-3 py-2">耗时</th>
                        <th className="px-3 py-2">成本</th>
                        <th className="px-3 py-2">模型</th>
                        <th className="px-3 py-2">时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {detailAIUsageRows.map((item) => {
                        const stage = normalizeAIStage(item.stage);
                        const stageLabel = AI_STAGE_LABEL[stage] || stage;
                        const status = (item.request_status || "-").trim() || "-";
                        return (
                          <tr key={item.id}>
                            <td className="px-3 py-2">{stageLabel}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  status === "ok" || status === "success"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-rose-100 text-rose-700"
                                }`}
                                title={item.request_error || ""}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              in {formatInteger(item.input_tokens)} / out {formatInteger(item.output_tokens)}
                              <div className="text-[10px] text-slate-500">
                                cache {formatInteger(item.cached_input_tokens)} · video {formatInteger(item.video_tokens)}
                              </div>
                            </td>
                            <td className="px-3 py-2">{formatDurationMs(item.request_duration_ms)}</td>
                            <td className="px-3 py-2">{formatCurrency(item.cost_usd, "USD")}</td>
                            <td className="px-3 py-2 max-w-[220px] truncate" title={`${item.provider || "-"} / ${item.model || "-"}`}>
                              {item.provider || "-"} / {item.model || "-"}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">{item.created_at || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            {detailHighlightFeedback ? (
              <div
                className={`rounded-2xl border p-4 text-sm ${
                  detailHighlightFeedback.blocked_reason
                    ? "border-rose-200 bg-rose-50/60"
                    : "border-sky-100 bg-sky-50/50"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    反馈重排下钻（highlight_feedback_v1）
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    group: {detailHighlightFeedback.group || "unknown"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      detailHighlightFeedback.applied ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {detailHighlightFeedback.applied ? "已应用重排" : "未应用重排"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      detailHighlightFeedback.negative_guard_enabled
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    负反馈保护：{detailHighlightFeedback.negative_guard_enabled ? "开启" : "关闭"}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs text-slate-600">
                    <div className="text-[11px] text-slate-500">重排前选中片段</div>
                    <div className="mt-1 text-slate-700">{formatHighlightSelection(detailHighlightFeedback.selected_before)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs text-slate-600">
                    <div className="text-[11px] text-slate-500">重排后选中片段</div>
                    <div className="mt-1 text-slate-700">{formatHighlightSelection(detailHighlightFeedback.selected_after)}</div>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span>位移变化：{detailHighlightFeedback.selection_changed ? "是" : "否"}</span>
                  <span>负向信号：{formatScore(detailHighlightFeedback.public_negative_signals)}</span>
                  <span>正向信号：{formatScore(detailHighlightFeedback.public_positive_signals)}</span>
                  <span>weighted_signals：{formatScore(detailHighlightFeedback.weighted_signals)}</span>
                  <span>engaged_jobs：{detailHighlightFeedback.engaged_jobs ?? 0}</span>
                </div>

                {detailHighlightFeedback.reason_negative_guard.length ? (
                  <div className="mt-3">
                    <div className="mb-1 text-[11px] text-slate-500">命中的负反馈原因权重</div>
                    <div className="flex flex-wrap gap-1.5">
                      {detailHighlightFeedback.reason_negative_guard.map((item) => (
                        <span
                          key={`detail-reason-guard-${item.reason}`}
                          className="inline-flex rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[11px] text-rose-700"
                        >
                          {item.reason} · {item.weight.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {detailHighlightFeedback.blocked_reason ? (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">
                    已触发原因阻断：{detailHighlightFeedback.blocked_reason_label || "命中原因被拦截"}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  AI3 复审状态（后台全量，可筛选）
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-500">状态筛选</label>
                  <select
                    value={detailReviewStatusFilter}
                    onChange={(event) =>
                      setDetailReviewStatusFilter(
                        (event.target.value as (typeof REVIEW_STATUS_FILTER_OPTIONS)[number]) || "all"
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-emerald-500"
                  >
                    {REVIEW_STATUS_FILTER_OPTIONS.map((item) => (
                      <option key={`detail-review-filter-${item}`} value={item}>
                        {item === "all" ? "全部" : item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
                  deliver: {detail.ai_gif_review_status_counts?.deliver || 0}
                </span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-sky-700">
                  keep_internal: {detail.ai_gif_review_status_counts?.keep_internal || 0}
                </span>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">
                  reject: {detail.ai_gif_review_status_counts?.reject || 0}
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                  need_manual_review: {detail.ai_gif_review_status_counts?.need_manual_review || 0}
                </span>
              </div>
              <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  人工复核决策（ABC-B）
                </div>
                <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr]">
                  <input
                    value={manualDecisionOutputIDInput}
                    onChange={(event) => setManualDecisionOutputIDInput(event.target.value)}
                    placeholder="output_id"
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  />
                  <input
                    value={manualDecisionProposalIDInput}
                    onChange={(event) => setManualDecisionProposalIDInput(event.target.value)}
                    placeholder="proposal_id（可选）"
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  />
                  <select
                    value={manualDecisionStatus}
                    onChange={(event) =>
                      setManualDecisionStatus(
                        (event.target.value as (typeof REVIEW_STATUS_FILTER_OPTIONS)[number]) || "deliver"
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-emerald-500"
                  >
                    <option value="deliver">deliver</option>
                    <option value="keep_internal">keep_internal</option>
                    <option value="reject">reject</option>
                    <option value="need_manual_review">need_manual_review</option>
                  </select>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
                  <input
                    value={manualDecisionReason}
                    onChange={(event) => setManualDecisionReason(event.target.value)}
                    placeholder="reason（可选）"
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  />
                  <input
                    value={manualDecisionNotes}
                    onChange={(event) => setManualDecisionNotes(event.target.value)}
                    placeholder="notes（可选）"
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    disabled={manualDecisionSubmitting}
                    onClick={() => {
                      void submitManualGIFReviewDecision();
                    }}
                    className="rounded-lg border border-emerald-200 bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {manualDecisionSubmitting ? "提交中..." : "提交人工决策"}
                  </button>
                </div>
                {detailGIFMainOutputs.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {detailGIFMainOutputs.slice(0, 12).map((item) => (
                      <button
                        key={`manual-output-${item.id}`}
                        type="button"
                        onClick={() => {
                          setManualDecisionOutputIDInput(String(item.id));
                          if (item.proposal_id && item.proposal_id > 0) {
                            setManualDecisionProposalIDInput(String(item.proposal_id));
                          }
                        }}
                        className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
                        title={item.qiniu_key}
                      >
                        output #{item.id}{item.proposal_id ? ` / proposal #${item.proposal_id}` : ""}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold text-slate-600">批量人工决策（一次多 output）</div>
                    <button
                      type="button"
                      disabled={manualDecisionBatchSubmitting || !detailGIFMainOutputs.length}
                      onClick={() => {
                        const lines = detailGIFMainOutputs
                          .slice(0, 50)
                          .map(
                            (item) =>
                              `${item.id},${item.proposal_id || ""},need_manual_review,manual_batch_seed,`
                          );
                        setManualDecisionBatchInput(
                          ["output_id,proposal_id,decision,reason,notes", ...lines].join("\n")
                        );
                      }}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      用当前产物填充模板
                    </button>
                  </div>
                  <textarea
                    value={manualDecisionBatchInput}
                    onChange={(event) => setManualDecisionBatchInput(event.target.value)}
                    placeholder={
                      "支持 CSV/TSV，每行一个决策：\noutput_id,proposal_id,decision,reason,notes\n123,88,deliver,manual_keep,ok"
                    }
                    className="h-24 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  />
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <div>
                      解析：{manualDecisionBatchParsed.items.length} 条
                      {manualDecisionBatchParsed.errors.length ? (
                        <span className="ml-2 text-rose-600">错误：{manualDecisionBatchParsed.errors[0]}</span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={manualDecisionBatchSubmitting}
                      onClick={() => {
                        void submitBatchManualGIFReviewDecisions();
                      }}
                      className="rounded-lg border border-emerald-200 bg-emerald-600 px-3 py-1 text-[11px] text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {manualDecisionBatchSubmitting ? "批量提交中..." : "提交批量人工决策"}
                    </button>
                  </div>
                </div>
              </div>
              <div className="max-h-72 overflow-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">状态</th>
                      <th className="px-3 py-2">output/proposal</th>
                      <th className="px-3 py-2">语义分</th>
                      <th className="px-3 py-2">诊断</th>
                      <th className="px-3 py-2">建议动作</th>
                      <th className="px-3 py-2">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(detail.ai_gif_reviews || []).map((review) => (
                      <tr key={review.id}>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${reviewStatusBadgeClass(review.final_recommendation)}`}>
                            {reviewStatusLabel(review.final_recommendation)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div>output: {review.output_id || "-"}</div>
                          <div className="text-[10px] text-slate-500">proposal: {review.proposal_id || "-"}</div>
                        </td>
                        <td className="px-3 py-2">{formatScore(review.semantic_verdict)}</td>
                        <td className="px-3 py-2 max-w-[280px] truncate" title={review.diagnostic_reason || ""}>
                          {review.diagnostic_reason || "-"}
                        </td>
                        <td className="px-3 py-2 max-w-[220px] truncate" title={review.suggested_action || ""}>
                          {review.suggested_action || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{review.created_at || "-"}</td>
                      </tr>
                    ))}
                    {!(detail.ai_gif_reviews || []).length ? (
                      <tr>
                        <td className="px-3 py-4 text-center text-slate-400" colSpan={6}>暂无 AI3 复审记录</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-violet-50/30 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-700">
                审计链明细（评测 / 反馈 / 重渲染）
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-violet-100 bg-white p-2">
                  <div className="mb-1 text-[11px] font-semibold text-slate-600">评测（最近）</div>
                  <div className="max-h-44 overflow-auto rounded border border-slate-100">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-2 py-1">output</th>
                          <th className="px-2 py-1">overall</th>
                          <th className="px-2 py-1">时间</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {detailAuditEvaluationRows.slice(0, 10).map((item) => (
                          <tr key={`audit-eval-${item.id}`}>
                            <td className="px-2 py-1">{item.output_id || "-"}</td>
                            <td className="px-2 py-1">{formatScore(item.overall_score)}</td>
                            <td className="px-2 py-1 whitespace-nowrap">{formatTime(item.created_at)}</td>
                          </tr>
                        ))}
                        {!detailAuditEvaluationRows.length ? (
                          <tr>
                            <td className="px-2 py-3 text-center text-slate-400" colSpan={3}>暂无</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="rounded-xl border border-violet-100 bg-white p-2">
                  <div className="mb-1 text-[11px] font-semibold text-slate-600">反馈（最近）</div>
                  <div className="max-h-44 overflow-auto rounded border border-slate-100">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-2 py-1">output</th>
                          <th className="px-2 py-1">action</th>
                          <th className="px-2 py-1">时间</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {detailAuditFeedbackRows.slice(0, 10).map((item) => (
                          <tr key={`audit-feedback-${item.id}`}>
                            <td className="px-2 py-1">{item.output_id || "-"}</td>
                            <td className="px-2 py-1">{item.action || "-"}</td>
                            <td className="px-2 py-1 whitespace-nowrap">{formatTime(item.created_at)}</td>
                          </tr>
                        ))}
                        {!detailAuditFeedbackRows.length ? (
                          <tr>
                            <td className="px-2 py-3 text-center text-slate-400" colSpan={3}>暂无</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="rounded-xl border border-violet-100 bg-white p-2">
                  <div className="mb-1 text-[11px] font-semibold text-slate-600">重渲染记录（最近）</div>
                  <div className="max-h-44 overflow-auto rounded border border-slate-100">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-2 py-1">proposal</th>
                          <th className="px-2 py-1">状态</th>
                          <th className="px-2 py-1">时间</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {detailAuditRerenderRows.slice(0, 10).map((item, idx) => (
                          <tr key={`audit-rerender-${idx}-${item.review_id || 0}`}>
                            <td className="px-2 py-1">{item.proposal_id || "-"}</td>
                            <td className="px-2 py-1">{reviewStatusLabel(item.recommendation)}</td>
                            <td className="px-2 py-1 whitespace-nowrap">{formatTime(item.created_at)}</td>
                          </tr>
                        ))}
                        {!detailAuditRerenderRows.length ? (
                          <tr>
                            <td className="px-2 py-3 text-center text-slate-400" colSpan={3}>暂无</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">阶段事件</div>
              <div className="max-h-64 overflow-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">时间</th>
                      <th className="px-3 py-2">阶段</th>
                      <th className="px-3 py-2">级别</th>
                      <th className="px-3 py-2">消息</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(detail.events || []).map((event) => (
                      <tr key={event.id}>
                        <td className="px-3 py-2 whitespace-nowrap">{event.created_at}</td>
                        <td className="px-3 py-2">{event.stage}</td>
                        <td className="px-3 py-2">{event.level}</td>
                        <td className="px-3 py-2">{event.message}</td>
                      </tr>
                    ))}
                    {!(detail.events || []).length ? (
                      <tr>
                        <td className="px-3 py-4 text-center text-slate-400" colSpan={4}>暂无事件</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">产物列表</div>
              <div className="max-h-72 overflow-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">类型</th>
                      <th className="px-3 py-2">key</th>
                      <th className="px-3 py-2">尺寸</th>
                      <th className="px-3 py-2">大小</th>
                      <th className="px-3 py-2">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(detail.artifacts || []).map((artifact) => (
                      <tr key={artifact.id}>
                        <td className="px-3 py-2">{artifact.type}</td>
                        <td className="px-3 py-2 max-w-[320px] truncate" title={artifact.qiniu_key}>{artifact.qiniu_key}</td>
                        <td className="px-3 py-2">{artifact.width || 0}x{artifact.height || 0}</td>
                        <td className="px-3 py-2">{formatBytes(artifact.size_bytes)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{artifact.created_at || "-"}</td>
                      </tr>
                    ))}
                    {!(detail.artifacts || []).length ? (
                      <tr>
                        <td className="px-3 py-4 text-center text-slate-400" colSpan={5}>暂无产物</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">GIF 候选片段</div>
              <div className="max-h-72 overflow-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">状态</th>
                      <th className="px-3 py-2">窗口</th>
                      <th className="px-3 py-2">得分</th>
                      <th className="px-3 py-2">置信度</th>
                      <th className="px-3 py-2">淘汰原因</th>
                      <th className="px-3 py-2">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(detail.gif_candidates || []).map((candidate) => (
                      <tr key={candidate.id}>
                        <td className="px-3 py-2">
                          {candidate.is_selected ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              入选 #{candidate.final_rank || "-"}
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              淘汰
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {((candidate.start_ms || 0) / 1000).toFixed(2)}s ~ {((candidate.end_ms || 0) / 1000).toFixed(2)}s
                          <div className="text-[10px] text-slate-400">
                            时长 {((candidate.duration_ms || 0) / 1000).toFixed(2)}s
                          </div>
                        </td>
                        <td className="px-3 py-2">{formatScore(candidate.base_score)}</td>
                        <td className="px-3 py-2">{formatScore(candidate.confidence_score)}</td>
                        <td className="px-3 py-2">{candidate.reject_reason || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{candidate.created_at || "-"}</td>
                      </tr>
                    ))}
                    {!(detail.gif_candidates || []).length ? (
                      <tr>
                        <td className="px-3 py-4 text-center text-slate-400" colSpan={6}>暂无候选数据</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
