"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type PipelineMode = "light" | "standard" | "hq";
type AIDirectorInputMode = "frames" | "full_video" | "hybrid";

type GlobalThresholdForm = {
  gif_pipeline_short_video_max_sec: number;
  gif_pipeline_long_video_min_sec: number;
  gif_pipeline_short_video_mode: PipelineMode;
  gif_pipeline_default_mode: PipelineMode;
  gif_pipeline_long_video_mode: PipelineMode;
  gif_pipeline_high_priority_enabled: boolean;
  gif_pipeline_high_priority_mode: PipelineMode;
  ai_director_input_mode: AIDirectorInputMode;

  gif_duration_tier_medium_sec: number;
  gif_duration_tier_long_sec: number;
  gif_duration_tier_ultra_sec: number;

  gif_segment_timeout_min_sec: number;
  gif_segment_timeout_max_sec: number;
  gif_segment_timeout_fallback_cap_sec: number;
  gif_segment_timeout_emergency_cap_sec: number;
  gif_segment_timeout_last_resort_cap_sec: number;
  gif_render_retry_max_attempts: number;
  gif_render_retry_primary_colors_floor: number;
  gif_render_retry_primary_colors_step: number;
  gif_render_retry_fps_floor: number;
  gif_render_retry_fps_step: number;
  gif_render_retry_width_trigger: number;
  gif_render_retry_width_scale: number;
  gif_render_retry_width_floor: number;
  gif_render_retry_secondary_colors_floor: number;
  gif_render_retry_secondary_colors_step: number;
  gif_render_initial_size_fps_cap: number;
  gif_render_initial_clarity_fps_floor: number;
  gif_render_initial_size_colors_cap: number;
  gif_render_initial_clarity_colors_floor: number;

  gif_motion_low_score_threshold: number;
  gif_motion_high_score_threshold: number;
  gif_motion_low_fps_delta: number;
  gif_motion_high_fps_delta: number;
  gif_adaptive_fps_min: number;
  gif_adaptive_fps_max: number;
  gif_width_size_low: number;
  gif_width_size_medium: number;
  gif_width_size_high: number;
  gif_width_clarity_low: number;
  gif_width_clarity_medium: number;
  gif_width_clarity_high: number;
  gif_colors_size_low: number;
  gif_colors_size_medium: number;
  gif_colors_size_high: number;
  gif_colors_clarity_low: number;
  gif_colors_clarity_medium: number;
  gif_colors_clarity_high: number;
  gif_duration_low_sec: number;
  gif_duration_medium_sec: number;
  gif_duration_high_sec: number;
  gif_duration_size_profile_max_sec: number;

  gif_candidate_max_outputs: number;
  gif_candidate_long_video_max_outputs: number;
  gif_candidate_ultra_video_max_outputs: number;
  gif_candidate_confidence_threshold: number;
  gif_candidate_dedup_iou_threshold: number;

  gif_render_budget_normal_mult: number;
  gif_render_budget_long_mult: number;
  gif_render_budget_ultra_mult: number;

  gif_downshift_high_res_long_side_threshold: number;
  gif_downshift_early_duration_sec: number;
  gif_downshift_early_long_side_threshold: number;

  gif_downshift_medium_fps_cap: number;
  gif_downshift_medium_width_cap: number;
  gif_downshift_medium_colors_cap: number;
  gif_downshift_medium_duration_cap_sec: number;

  gif_downshift_long_fps_cap: number;
  gif_downshift_long_width_cap: number;
  gif_downshift_long_colors_cap: number;
  gif_downshift_long_duration_cap_sec: number;

  gif_downshift_ultra_fps_cap: number;
  gif_downshift_ultra_width_cap: number;
  gif_downshift_ultra_colors_cap: number;
  gif_downshift_ultra_duration_cap_sec: number;

  gif_downshift_high_res_fps_cap: number;
  gif_downshift_high_res_width_cap: number;
  gif_downshift_high_res_colors_cap: number;
  gif_downshift_high_res_duration_cap_sec: number;

  gif_timeout_fallback_fps_cap: number;
  gif_timeout_fallback_width_cap: number;
  gif_timeout_fallback_colors_cap: number;
  gif_timeout_fallback_min_width: number;

  gif_timeout_fallback_ultra_fps_cap: number;
  gif_timeout_fallback_ultra_width_cap: number;
  gif_timeout_fallback_ultra_colors_cap: number;

  gif_timeout_emergency_fps_cap: number;
  gif_timeout_emergency_width_cap: number;
  gif_timeout_emergency_colors_cap: number;
  gif_timeout_emergency_min_width: number;
  gif_timeout_emergency_duration_trigger_sec: number;
  gif_timeout_emergency_duration_scale: number;
  gif_timeout_emergency_duration_min_sec: number;

  gif_timeout_last_resort_fps_cap: number;
  gif_timeout_last_resort_width_cap: number;
  gif_timeout_last_resort_colors_cap: number;
  gif_timeout_last_resort_min_width: number;
  gif_timeout_last_resort_duration_min_sec: number;
  gif_timeout_last_resort_duration_max_sec: number;

  updated_at?: string;
};

const DEFAULT_FORM: GlobalThresholdForm = {
  gif_pipeline_short_video_max_sec: 18,
  gif_pipeline_long_video_min_sec: 180,
  gif_pipeline_short_video_mode: "light",
  gif_pipeline_default_mode: "standard",
  gif_pipeline_long_video_mode: "light",
  gif_pipeline_high_priority_enabled: true,
  gif_pipeline_high_priority_mode: "hq",
  ai_director_input_mode: "hybrid",

  gif_duration_tier_medium_sec: 60,
  gif_duration_tier_long_sec: 120,
  gif_duration_tier_ultra_sec: 240,

  gif_segment_timeout_min_sec: 30,
  gif_segment_timeout_max_sec: 120,
  gif_segment_timeout_fallback_cap_sec: 60,
  gif_segment_timeout_emergency_cap_sec: 40,
  gif_segment_timeout_last_resort_cap_sec: 30,
  gif_render_retry_max_attempts: 6,
  gif_render_retry_primary_colors_floor: 96,
  gif_render_retry_primary_colors_step: 32,
  gif_render_retry_fps_floor: 8,
  gif_render_retry_fps_step: 2,
  gif_render_retry_width_trigger: 480,
  gif_render_retry_width_scale: 0.85,
  gif_render_retry_width_floor: 360,
  gif_render_retry_secondary_colors_floor: 48,
  gif_render_retry_secondary_colors_step: 16,
  gif_render_initial_size_fps_cap: 10,
  gif_render_initial_clarity_fps_floor: 12,
  gif_render_initial_size_colors_cap: 96,
  gif_render_initial_clarity_colors_floor: 160,

  gif_motion_low_score_threshold: 0.3,
  gif_motion_high_score_threshold: 0.64,
  gif_motion_low_fps_delta: -2,
  gif_motion_high_fps_delta: 2,
  gif_adaptive_fps_min: 6,
  gif_adaptive_fps_max: 18,
  gif_width_size_low: 640,
  gif_width_size_medium: 720,
  gif_width_size_high: 768,
  gif_width_clarity_low: 720,
  gif_width_clarity_medium: 960,
  gif_width_clarity_high: 1080,
  gif_colors_size_low: 72,
  gif_colors_size_medium: 96,
  gif_colors_size_high: 128,
  gif_colors_clarity_low: 128,
  gif_colors_clarity_medium: 176,
  gif_colors_clarity_high: 224,
  gif_duration_low_sec: 2.0,
  gif_duration_medium_sec: 2.4,
  gif_duration_high_sec: 2.8,
  gif_duration_size_profile_max_sec: 2.4,

  gif_candidate_max_outputs: 3,
  gif_candidate_long_video_max_outputs: 3,
  gif_candidate_ultra_video_max_outputs: 2,
  gif_candidate_confidence_threshold: 0.35,
  gif_candidate_dedup_iou_threshold: 0.45,

  gif_render_budget_normal_mult: 1.8,
  gif_render_budget_long_mult: 1.45,
  gif_render_budget_ultra_mult: 1.2,

  gif_downshift_high_res_long_side_threshold: 1600,
  gif_downshift_early_duration_sec: 45,
  gif_downshift_early_long_side_threshold: 1800,

  gif_downshift_medium_fps_cap: 9,
  gif_downshift_medium_width_cap: 720,
  gif_downshift_medium_colors_cap: 128,
  gif_downshift_medium_duration_cap_sec: 2.2,

  gif_downshift_long_fps_cap: 8,
  gif_downshift_long_width_cap: 640,
  gif_downshift_long_colors_cap: 96,
  gif_downshift_long_duration_cap_sec: 2.0,

  gif_downshift_ultra_fps_cap: 8,
  gif_downshift_ultra_width_cap: 560,
  gif_downshift_ultra_colors_cap: 72,
  gif_downshift_ultra_duration_cap_sec: 1.8,

  gif_downshift_high_res_fps_cap: 9,
  gif_downshift_high_res_width_cap: 640,
  gif_downshift_high_res_colors_cap: 96,
  gif_downshift_high_res_duration_cap_sec: 2.1,

  gif_timeout_fallback_fps_cap: 10,
  gif_timeout_fallback_width_cap: 720,
  gif_timeout_fallback_colors_cap: 96,
  gif_timeout_fallback_min_width: 360,

  gif_timeout_fallback_ultra_fps_cap: 8,
  gif_timeout_fallback_ultra_width_cap: 640,
  gif_timeout_fallback_ultra_colors_cap: 64,

  gif_timeout_emergency_fps_cap: 8,
  gif_timeout_emergency_width_cap: 540,
  gif_timeout_emergency_colors_cap: 64,
  gif_timeout_emergency_min_width: 320,
  gif_timeout_emergency_duration_trigger_sec: 2.0,
  gif_timeout_emergency_duration_scale: 0.75,
  gif_timeout_emergency_duration_min_sec: 1.4,

  gif_timeout_last_resort_fps_cap: 6,
  gif_timeout_last_resort_width_cap: 480,
  gif_timeout_last_resort_colors_cap: 48,
  gif_timeout_last_resort_min_width: 320,
  gif_timeout_last_resort_duration_min_sec: 1.2,
  gif_timeout_last_resort_duration_max_sec: 1.8,
};

const FIELD_HINTS_ZH: Record<string, string> = {
  budget_normal_mult: "普通时长任务的预算倍率（越大越偏质量，越小越偏速度）。",
  budget_long_mult: "长视频任务预算倍率，建议不高于“普通时长预算倍率”。",
  budget_ultra_mult: "超长视频任务预算倍率，建议不高于“长视频预算倍率”。",
  max_outputs: "单任务最多交付 GIF 数量。",
  long_max_outputs: "长视频最多交付 GIF 数量上限。",
  ultra_max_outputs: "超长视频最多交付 GIF 数量上限。",
  confidence_threshold: "候选置信度最低阈值，低于阈值会被淘汰。",
  dedup_iou_threshold: "候选去重重叠度阈值（IoU），越低越严格去重。",
  medium_fps: "中长视频降档后 FPS 上限。",
  medium_width: "中长视频降档后宽度上限。",
  medium_colors: "中长视频降档后色盘上限。",
  medium_duration_sec: "中长视频降档后单段时长上限。",
  long_fps: "长视频降档后 FPS 上限。",
  long_width: "长视频降档后宽度上限。",
  long_colors: "长视频降档后色盘上限。",
  long_duration_sec: "长视频降档后单段时长上限。",
  ultra_fps: "超长视频降档后 FPS 上限。",
  ultra_width: "超长视频降档后宽度上限。",
  ultra_colors: "超长视频降档后色盘上限。",
  ultra_duration_sec: "超长视频降档后单段时长上限。",
  high_res_fps: "高分辨率稳定降档时 FPS 上限。",
  high_res_width: "高分辨率稳定降档时宽度上限。",
  high_res_colors: "高分辨率稳定降档时色盘上限。",
  high_res_duration_sec: "高分辨率稳定降档时单段时长上限。",
  fallback_fps: "超时第1层回退的 FPS 上限。",
  fallback_width: "超时第1层回退的宽度上限。",
  fallback_colors: "超时第1层回退的色盘上限。",
  fallback_min_width: "超时第1层回退的最小宽度。",
  fallback_ultra_fps: "超长视频触发时，第1层回退的 FPS 上限。",
  fallback_ultra_width: "超长视频触发时，第1层回退的宽度上限。",
  fallback_ultra_colors: "超长视频触发时，第1层回退的色盘上限。",
  emergency_fps: "超时第2层（紧急）回退 FPS 上限。",
  emergency_width: "超时第2层（紧急）回退宽度上限。",
  emergency_colors: "超时第2层（紧急）回退色盘上限。",
  emergency_min_width: "超时第2层（紧急）回退最小宽度。",
  emergency_trigger_sec: "当片段时长超过该值，触发紧急时长缩短策略。",
  emergency_duration_scale: "紧急时长缩放比例（原时长 * 该值）。",
  emergency_duration_min_sec: "紧急回退后的最短时长保护值。",
  last_resort_fps: "超时第3层（兜底）回退 FPS 上限。",
  last_resort_width: "超时第3层（兜底）回退宽度上限。",
  last_resort_colors: "超时第3层（兜底）回退色盘上限。",
  last_resort_min_width: "超时第3层（兜底）回退最小宽度。",
  last_resort_duration_min_sec: "第3层（兜底）允许最短时长。",
  last_resort_duration_max_sec: "第3层（兜底）允许最长时长。",
  motion_low_score: "运动分低于该阈值时按低动态模板处理。",
  motion_high_score: "运动分高于该阈值时按高动态模板处理。",
  motion_low_fps_delta: "低动态模板对 FPS 的调整量（可为负数）。",
  motion_high_fps_delta: "高动态模板对 FPS 的调整量（正数提升流畅度）。",
  adaptive_fps_min: "GIF 自适应 FPS 下限。",
  adaptive_fps_max: "GIF 自适应 FPS 上限。",
  width_size_low: "体积档配置下，低动态默认宽度。",
  width_size_medium: "体积档配置下，中动态默认宽度。",
  width_size_high: "体积档配置下，高动态默认宽度。",
  width_clarity_low: "清晰档配置下，低动态默认宽度。",
  width_clarity_medium: "清晰档配置下，中动态默认宽度。",
  width_clarity_high: "清晰档配置下，高动态默认宽度。",
  colors_size_low: "体积档配置下，低动态默认色盘。",
  colors_size_medium: "体积档配置下，中动态默认色盘。",
  colors_size_high: "体积档配置下，高动态默认色盘。",
  colors_clarity_low: "清晰档配置下，低动态默认色盘。",
  colors_clarity_medium: "清晰档配置下，中动态默认色盘。",
  colors_clarity_high: "清晰档配置下，高动态默认色盘。",
  duration_low_sec: "低动态模板目标时长。",
  duration_medium_sec: "中动态模板目标时长。",
  duration_high_sec: "高动态模板目标时长。",
  duration_size_profile_max_sec: "体积档配置下允许的时长上限。",
  retry_max_attempts: "单片段渲染最大重试轮数。",
  retry_primary_colors_floor: "第一轮降色时的最低色盘保护值。",
  retry_primary_colors_step: "第一轮降色步长。",
  retry_fps_floor: "降 FPS 阶段的最低 FPS 保护值。",
  retry_fps_step: "降 FPS 阶段每次下降步长。",
  retry_width_trigger: "当宽度高于此值才触发缩宽。",
  retry_width_scale: "缩宽倍率（新宽度=旧宽度*scale）。",
  retry_width_floor: "缩宽阶段的最小宽度保护值。",
  retry_secondary_colors_floor: "第二轮降色时的最低色盘保护值。",
  retry_secondary_colors_step: "第二轮降色步长。",
  initial_size_fps_cap: "体积档配置下初始 FPS 上限。",
  initial_clarity_fps_floor: "清晰档配置下初始 FPS 下限。",
  initial_size_colors_cap: "体积档配置下初始色盘上限。",
  initial_clarity_colors_floor: "清晰档配置下初始色盘下限。",
  ai_director_input_mode: "AI1 输入模式：frames=仅关键帧，full_video=完整视频，hybrid=优先完整视频失败回退关键帧（推荐）。",
};

function toNumber(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function modeBadge(mode: string) {
  switch (mode) {
    case "hq":
      return "bg-violet-100 text-violet-700";
    case "standard":
      return "bg-cyan-100 text-cyan-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function modeText(mode: PipelineMode) {
  if (mode === "light") return "轻量";
  if (mode === "standard") return "标准";
  return "高质量";
}

function NumberField({
  label,
  fieldKey,
  hint,
  value,
  step,
  onChange,
}: {
  label: string;
  fieldKey?: string;
  hint?: string;
  value: number;
  step?: number | string;
  onChange: (next: number) => void;
}) {
  const key = fieldKey || label;
  const finalHint = hint || FIELD_HINTS_ZH[key];
  return (
    <label className="space-y-1 text-sm">
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {finalHint ? (
          <span
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-500"
            title={finalHint}
          >
            i
          </span>
        ) : null}
      </div>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(toNumber(e.target.value, value))}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

function ModeField({
  label,
  fieldKey,
  hint,
  value,
  onChange,
}: {
  label: string;
  fieldKey?: string;
  hint?: string;
  value: PipelineMode;
  onChange: (next: PipelineMode) => void;
}) {
  return (
    <label className="space-y-1 text-sm">
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {hint ? (
          <span
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-500"
            title={hint}
          >
            i
          </span>
        ) : null}
      </div>
      <select
        data-field-key={fieldKey || undefined}
        value={value}
        onChange={(e) => onChange(e.target.value as PipelineMode)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      >
        <option value="light">轻量（light）</option>
        <option value="standard">标准（standard）</option>
        <option value="hq">高质量（hq）</option>
      </select>
    </label>
  );
}

function AIDirectorInputModeField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: AIDirectorInputMode;
  onChange: (next: AIDirectorInputMode) => void;
}) {
  return (
    <label className="space-y-1 text-sm">
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {hint ? (
          <span
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-500"
            title={hint}
          >
            i
          </span>
        ) : null}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AIDirectorInputMode)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      >
        <option value="hybrid">hybrid（推荐：完整视频优先，失败回退帧）</option>
        <option value="full_video">full_video（完整视频）</option>
        <option value="frames">frames（仅关键帧）</option>
      </select>
    </label>
  );
}

export default function AdminGlobalThresholdsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [form, setForm] = useState<GlobalThresholdForm>(DEFAULT_FORM);
  const [baseForm, setBaseForm] = useState<GlobalThresholdForm | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/quality-settings`);
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as GlobalThresholdForm;
        const merged = { ...DEFAULT_FORM, ...data };
        setForm(merged);
        setBaseForm(merged);
        setUpdatedAt(data.updated_at || "");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const dirtyKeys = useMemo(() => {
    if (!baseForm) return [] as Array<keyof GlobalThresholdForm>;
    return (Object.keys(DEFAULT_FORM) as Array<keyof GlobalThresholdForm>).filter((key) => {
      return JSON.stringify(form[key]) !== JSON.stringify(baseForm[key]);
    });
  }, [baseForm, form]);

  const save = async () => {
    if (!baseForm) return;
    if (dirtyKeys.length === 0) {
      setError(null);
      setSuccess("当前没有变更项。");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const key of dirtyKeys) payload[key] = form[key];
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/quality-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as GlobalThresholdForm;
      const merged = { ...DEFAULT_FORM, ...data };
      setForm(merged);
      setBaseForm(merged);
      setUpdatedAt(data.updated_at || "");
      setSuccess(`已保存全局阈值（${dirtyKeys.length} 项变更）。`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="全局阈值设置" description="加载中..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="全局阈值设置"
        description="集中管理影响视频转 GIF 结果的全局策略参数（分流、候选、降档、超时回退）。"
        actions={
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            onClick={() => void save()}
            disabled={saving || !baseForm}
          >
            {saving ? "保存中..." : dirtyKeys.length > 0 ? `保存配置（${dirtyKeys.length}）` : "保存配置"}
          </button>
        }
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
        <div>最后更新：{updatedAt || "-"}</div>
        <div className="mt-1">说明：仅影响新创建任务，已入队/已完成任务不回溯。</div>
        <div className="mt-1">提示：参数名右侧 i 图标可悬浮查看中文解释。</div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 text-sm font-semibold text-slate-900">A. 分流阈值与处理模式</div>
        <div className="grid gap-4 md:grid-cols-4">
          <NumberField
            label="短视频阈值（秒）"
            fieldKey="gif_pipeline_short_video_max_sec"
            hint="视频时长小于等于该值时走“短视频模式”。"
            value={form.gif_pipeline_short_video_max_sec}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_pipeline_short_video_max_sec: v }))}
          />
          <NumberField
            label="长视频阈值（秒）"
            fieldKey="gif_pipeline_long_video_min_sec"
            hint="视频时长大于等于该值时走“长视频模式”。"
            value={form.gif_pipeline_long_video_min_sec}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_pipeline_long_video_min_sec: v }))}
          />
          <ModeField
            label="高优先级强制模式"
            fieldKey="gif_pipeline_high_priority_mode"
            hint="高优先级任务（高/紧急）强制走该模式。"
            value={form.gif_pipeline_high_priority_mode}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_pipeline_high_priority_mode: v }))}
          />
          <AIDirectorInputModeField
            label="AI1 输入模式"
            hint={FIELD_HINTS_ZH.ai_director_input_mode}
            value={form.ai_director_input_mode}
            onChange={(v) => setForm((prev) => ({ ...prev, ai_director_input_mode: v }))}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <ModeField
            label="短视频命中模式"
            fieldKey="gif_pipeline_short_video_mode"
            hint="视频时长小于等于短视频阈值时命中。"
            value={form.gif_pipeline_short_video_mode}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_pipeline_short_video_mode: v }))}
          />
          <ModeField
            label="默认模式"
            fieldKey="gif_pipeline_default_mode"
            hint="不命中短视频/长视频时使用。"
            value={form.gif_pipeline_default_mode}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_pipeline_default_mode: v }))}
          />
          <ModeField
            label="长视频命中模式"
            fieldKey="gif_pipeline_long_video_mode"
            hint="视频时长大于等于长视频阈值时命中。"
            value={form.gif_pipeline_long_video_mode}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_pipeline_long_video_mode: v }))}
          />
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.gif_pipeline_high_priority_enabled}
            onChange={(e) => setForm((prev) => ({ ...prev, gif_pipeline_high_priority_enabled: e.target.checked }))}
          />
          启用高优先级任务强制模式（优先级为高/紧急）
        </label>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-2 py-1 ${modeBadge(form.gif_pipeline_short_video_mode)}`}>短视频：{modeText(form.gif_pipeline_short_video_mode)}</span>
          <span className={`rounded-full px-2 py-1 ${modeBadge(form.gif_pipeline_default_mode)}`}>默认：{modeText(form.gif_pipeline_default_mode)}</span>
          <span className={`rounded-full px-2 py-1 ${modeBadge(form.gif_pipeline_long_video_mode)}`}>长视频：{modeText(form.gif_pipeline_long_video_mode)}</span>
          <span className={`rounded-full px-2 py-1 ${modeBadge(form.gif_pipeline_high_priority_mode)}`}>高优先级：{modeText(form.gif_pipeline_high_priority_mode)}</span>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">AI1输入：{form.ai_director_input_mode}</span>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 text-sm font-semibold text-slate-900">B. 时长档位阈值（影响候选上限/降档）</div>
        <div className="grid gap-4 md:grid-cols-3">
          <NumberField
            label="中档阈值（秒）"
            fieldKey="gif_duration_tier_medium_sec"
            value={form.gif_duration_tier_medium_sec}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_duration_tier_medium_sec: v }))}
          />
          <NumberField
            label="长档阈值（秒）"
            fieldKey="gif_duration_tier_long_sec"
            value={form.gif_duration_tier_long_sec}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_duration_tier_long_sec: v }))}
          />
          <NumberField
            label="超长档阈值（秒）"
            fieldKey="gif_duration_tier_ultra_sec"
            value={form.gif_duration_tier_ultra_sec}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_duration_tier_ultra_sec: v }))}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 text-sm font-semibold text-slate-900">C. 单片段超时上限（外层）</div>
        <div className="grid gap-4 md:grid-cols-5">
          <NumberField
            label="最小时限"
            fieldKey="gif_segment_timeout_min_sec"
            hint="单片段渲染动态时限的最小值。"
            value={form.gif_segment_timeout_min_sec}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_segment_timeout_min_sec: v }))}
          />
          <NumberField
            label="最大时限"
            fieldKey="gif_segment_timeout_max_sec"
            hint="单片段渲染动态时限的最大值。"
            value={form.gif_segment_timeout_max_sec}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_segment_timeout_max_sec: v }))}
          />
          <NumberField
            label="一级回退上限"
            fieldKey="gif_segment_timeout_fallback_cap_sec"
            hint="第一层回退允许使用的时限上限。"
            value={form.gif_segment_timeout_fallback_cap_sec}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_segment_timeout_fallback_cap_sec: v }))}
          />
          <NumberField
            label="二级回退上限"
            fieldKey="gif_segment_timeout_emergency_cap_sec"
            hint="第二层回退允许使用的时限上限。"
            value={form.gif_segment_timeout_emergency_cap_sec}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_segment_timeout_emergency_cap_sec: v }))}
          />
          <NumberField
            label="三级兜底上限"
            fieldKey="gif_segment_timeout_last_resort_cap_sec"
            hint="第三层兜底回退允许使用的时限上限。"
            value={form.gif_segment_timeout_last_resort_cap_sec}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_segment_timeout_last_resort_cap_sec: v }))}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 text-sm font-semibold text-slate-900">D. 渲染回退与重试细节（原硬编码）</div>
        <div className="mb-4 grid gap-4 md:grid-cols-4">
          <NumberField label="最大重试轮数" fieldKey="retry_max_attempts" value={form.gif_render_retry_max_attempts} onChange={(v) => setForm((prev) => ({ ...prev, gif_render_retry_max_attempts: v }))} />
          <NumberField label="第一轮降色最低值" fieldKey="retry_primary_colors_floor" value={form.gif_render_retry_primary_colors_floor} onChange={(v) => setForm((prev) => ({ ...prev, gif_render_retry_primary_colors_floor: v }))} />
          <NumberField label="第一轮降色步长" fieldKey="retry_primary_colors_step" value={form.gif_render_retry_primary_colors_step} onChange={(v) => setForm((prev) => ({ ...prev, gif_render_retry_primary_colors_step: v }))} />
          <NumberField label="降 FPS 最低值" fieldKey="retry_fps_floor" value={form.gif_render_retry_fps_floor} onChange={(v) => setForm((prev) => ({ ...prev, gif_render_retry_fps_floor: v }))} />
          <NumberField label="降 FPS 步长" fieldKey="retry_fps_step" value={form.gif_render_retry_fps_step} onChange={(v) => setForm((prev) => ({ ...prev, gif_render_retry_fps_step: v }))} />
          <NumberField label="缩宽触发阈值" fieldKey="retry_width_trigger" value={form.gif_render_retry_width_trigger} onChange={(v) => setForm((prev) => ({ ...prev, gif_render_retry_width_trigger: v }))} />
          <NumberField label="缩宽倍率" fieldKey="retry_width_scale" step={0.01} value={form.gif_render_retry_width_scale} onChange={(v) => setForm((prev) => ({ ...prev, gif_render_retry_width_scale: v }))} />
          <NumberField label="缩宽最小值" fieldKey="retry_width_floor" value={form.gif_render_retry_width_floor} onChange={(v) => setForm((prev) => ({ ...prev, gif_render_retry_width_floor: v }))} />
          <NumberField label="第二轮降色最低值" fieldKey="retry_secondary_colors_floor" value={form.gif_render_retry_secondary_colors_floor} onChange={(v) => setForm((prev) => ({ ...prev, gif_render_retry_secondary_colors_floor: v }))} />
          <NumberField label="第二轮降色步长" fieldKey="retry_secondary_colors_step" value={form.gif_render_retry_secondary_colors_step} onChange={(v) => setForm((prev) => ({ ...prev, gif_render_retry_secondary_colors_step: v }))} />
          <NumberField label="体积档初始 FPS 上限" fieldKey="initial_size_fps_cap" value={form.gif_render_initial_size_fps_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_render_initial_size_fps_cap: v }))} />
          <NumberField label="清晰档初始 FPS 下限" fieldKey="initial_clarity_fps_floor" value={form.gif_render_initial_clarity_fps_floor} onChange={(v) => setForm((prev) => ({ ...prev, gif_render_initial_clarity_fps_floor: v }))} />
          <NumberField label="体积档初始色盘上限" fieldKey="initial_size_colors_cap" value={form.gif_render_initial_size_colors_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_render_initial_size_colors_cap: v }))} />
          <NumberField label="清晰档初始色盘下限" fieldKey="initial_clarity_colors_floor" value={form.gif_render_initial_clarity_colors_floor} onChange={(v) => setForm((prev) => ({ ...prev, gif_render_initial_clarity_colors_floor: v }))} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 text-sm font-semibold text-slate-900">E. GIF 自适应基础模板（原硬编码）</div>
        <div className="mb-4 grid gap-4 md:grid-cols-6">
          <NumberField
            label="低动态阈值"
            fieldKey="motion_low_score"
            step={0.01}
            value={form.gif_motion_low_score_threshold}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_motion_low_score_threshold: v }))}
          />
          <NumberField
            label="高动态阈值"
            fieldKey="motion_high_score"
            step={0.01}
            value={form.gif_motion_high_score_threshold}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_motion_high_score_threshold: v }))}
          />
          <NumberField
            label="低动态 FPS 调整"
            fieldKey="motion_low_fps_delta"
            value={form.gif_motion_low_fps_delta}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_motion_low_fps_delta: v }))}
          />
          <NumberField
            label="高动态 FPS 调整"
            fieldKey="motion_high_fps_delta"
            value={form.gif_motion_high_fps_delta}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_motion_high_fps_delta: v }))}
          />
          <NumberField
            label="自适应 FPS 下限"
            fieldKey="adaptive_fps_min"
            value={form.gif_adaptive_fps_min}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_adaptive_fps_min: v }))}
          />
          <NumberField
            label="自适应 FPS 上限"
            fieldKey="adaptive_fps_max"
            value={form.gif_adaptive_fps_max}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_adaptive_fps_max: v }))}
          />
        </div>

        <div className="mb-3 text-xs font-semibold text-slate-500">宽度模板（体积档）</div>
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <NumberField label="低动态宽度" fieldKey="width_size_low" value={form.gif_width_size_low} onChange={(v) => setForm((prev) => ({ ...prev, gif_width_size_low: v }))} />
          <NumberField label="中动态宽度" fieldKey="width_size_medium" value={form.gif_width_size_medium} onChange={(v) => setForm((prev) => ({ ...prev, gif_width_size_medium: v }))} />
          <NumberField label="高动态宽度" fieldKey="width_size_high" value={form.gif_width_size_high} onChange={(v) => setForm((prev) => ({ ...prev, gif_width_size_high: v }))} />
        </div>

        <div className="mb-3 text-xs font-semibold text-slate-500">宽度模板（清晰档）</div>
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <NumberField label="低动态宽度" fieldKey="width_clarity_low" value={form.gif_width_clarity_low} onChange={(v) => setForm((prev) => ({ ...prev, gif_width_clarity_low: v }))} />
          <NumberField label="中动态宽度" fieldKey="width_clarity_medium" value={form.gif_width_clarity_medium} onChange={(v) => setForm((prev) => ({ ...prev, gif_width_clarity_medium: v }))} />
          <NumberField label="高动态宽度" fieldKey="width_clarity_high" value={form.gif_width_clarity_high} onChange={(v) => setForm((prev) => ({ ...prev, gif_width_clarity_high: v }))} />
        </div>

        <div className="mb-3 text-xs font-semibold text-slate-500">色盘模板（体积档）</div>
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <NumberField label="低动态色盘" fieldKey="colors_size_low" value={form.gif_colors_size_low} onChange={(v) => setForm((prev) => ({ ...prev, gif_colors_size_low: v }))} />
          <NumberField label="中动态色盘" fieldKey="colors_size_medium" value={form.gif_colors_size_medium} onChange={(v) => setForm((prev) => ({ ...prev, gif_colors_size_medium: v }))} />
          <NumberField label="高动态色盘" fieldKey="colors_size_high" value={form.gif_colors_size_high} onChange={(v) => setForm((prev) => ({ ...prev, gif_colors_size_high: v }))} />
        </div>

        <div className="mb-3 text-xs font-semibold text-slate-500">色盘模板（清晰档）</div>
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <NumberField label="低动态色盘" fieldKey="colors_clarity_low" value={form.gif_colors_clarity_low} onChange={(v) => setForm((prev) => ({ ...prev, gif_colors_clarity_low: v }))} />
          <NumberField label="中动态色盘" fieldKey="colors_clarity_medium" value={form.gif_colors_clarity_medium} onChange={(v) => setForm((prev) => ({ ...prev, gif_colors_clarity_medium: v }))} />
          <NumberField label="高动态色盘" fieldKey="colors_clarity_high" value={form.gif_colors_clarity_high} onChange={(v) => setForm((prev) => ({ ...prev, gif_colors_clarity_high: v }))} />
        </div>

        <div className="mb-3 text-xs font-semibold text-slate-500">时长模板（秒）</div>
        <div className="grid gap-4 md:grid-cols-4">
          <NumberField label="低动态时长" fieldKey="duration_low_sec" step={0.1} value={form.gif_duration_low_sec} onChange={(v) => setForm((prev) => ({ ...prev, gif_duration_low_sec: v }))} />
          <NumberField label="中动态时长" fieldKey="duration_medium_sec" step={0.1} value={form.gif_duration_medium_sec} onChange={(v) => setForm((prev) => ({ ...prev, gif_duration_medium_sec: v }))} />
          <NumberField label="高动态时长" fieldKey="duration_high_sec" step={0.1} value={form.gif_duration_high_sec} onChange={(v) => setForm((prev) => ({ ...prev, gif_duration_high_sec: v }))} />
          <NumberField label="体积档时长上限" fieldKey="duration_size_profile_max_sec" step={0.1} value={form.gif_duration_size_profile_max_sec} onChange={(v) => setForm((prev) => ({ ...prev, gif_duration_size_profile_max_sec: v }))} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 text-sm font-semibold text-slate-900">F. 候选门禁与预算倍率</div>
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <NumberField
            label="普通时长预算倍率"
            fieldKey="budget_normal_mult"
            step={0.05}
            value={form.gif_render_budget_normal_mult}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_render_budget_normal_mult: v }))}
          />
          <NumberField
            label="长视频预算倍率"
            fieldKey="budget_long_mult"
            step={0.05}
            value={form.gif_render_budget_long_mult}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_render_budget_long_mult: v }))}
          />
          <NumberField
            label="超长视频预算倍率"
            fieldKey="budget_ultra_mult"
            step={0.05}
            value={form.gif_render_budget_ultra_mult}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_render_budget_ultra_mult: v }))}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          <NumberField
            label="单任务最大产出"
            fieldKey="max_outputs"
            value={form.gif_candidate_max_outputs}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_candidate_max_outputs: v }))}
          />
          <NumberField
            label="长视频最大产出"
            fieldKey="long_max_outputs"
            value={form.gif_candidate_long_video_max_outputs}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_candidate_long_video_max_outputs: v }))}
          />
          <NumberField
            label="超长视频最大产出"
            fieldKey="ultra_max_outputs"
            value={form.gif_candidate_ultra_video_max_outputs}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_candidate_ultra_video_max_outputs: v }))}
          />
          <NumberField
            label="候选置信度阈值"
            fieldKey="confidence_threshold"
            step={0.01}
            value={form.gif_candidate_confidence_threshold}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_candidate_confidence_threshold: v }))}
          />
          <NumberField
            label="候选去重重叠度阈值（IoU）"
            fieldKey="dedup_iou_threshold"
            step={0.01}
            value={form.gif_candidate_dedup_iou_threshold}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_candidate_dedup_iou_threshold: v }))}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 text-sm font-semibold text-slate-900">G. 长视频稳态降档参数</div>

        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <NumberField
            label="高分辨率长边触发阈值"
            fieldKey="gif_downshift_high_res_long_side_threshold"
            hint="当视频长边超过该值时，触发高分辨率稳定降档。"
            value={form.gif_downshift_high_res_long_side_threshold}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_high_res_long_side_threshold: v }))}
          />
          <NumberField
            label="提前降档时长阈值（秒）"
            fieldKey="gif_downshift_early_duration_sec"
            hint="达到该时长后，若分辨率也偏高会提前触发降档。"
            value={form.gif_downshift_early_duration_sec}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_early_duration_sec: v }))}
          />
          <NumberField
            label="提前降档长边阈值"
            fieldKey="gif_downshift_early_long_side_threshold"
            hint="与提前降档时长配合使用的分辨率门槛。"
            value={form.gif_downshift_early_long_side_threshold}
            onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_early_long_side_threshold: v }))}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <NumberField label="中长视频 FPS 上限" fieldKey="medium_fps" value={form.gif_downshift_medium_fps_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_medium_fps_cap: v }))} />
          <NumberField label="中长视频宽度上限" fieldKey="medium_width" value={form.gif_downshift_medium_width_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_medium_width_cap: v }))} />
          <NumberField label="中长视频色盘上限" fieldKey="medium_colors" value={form.gif_downshift_medium_colors_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_medium_colors_cap: v }))} />
          <NumberField label="中长视频时长上限" fieldKey="medium_duration_sec" step={0.1} value={form.gif_downshift_medium_duration_cap_sec} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_medium_duration_cap_sec: v }))} />

          <NumberField label="长视频 FPS 上限" fieldKey="long_fps" value={form.gif_downshift_long_fps_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_long_fps_cap: v }))} />
          <NumberField label="长视频宽度上限" fieldKey="long_width" value={form.gif_downshift_long_width_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_long_width_cap: v }))} />
          <NumberField label="长视频色盘上限" fieldKey="long_colors" value={form.gif_downshift_long_colors_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_long_colors_cap: v }))} />
          <NumberField label="长视频时长上限" fieldKey="long_duration_sec" step={0.1} value={form.gif_downshift_long_duration_cap_sec} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_long_duration_cap_sec: v }))} />

          <NumberField label="超长视频 FPS 上限" fieldKey="ultra_fps" value={form.gif_downshift_ultra_fps_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_ultra_fps_cap: v }))} />
          <NumberField label="超长视频宽度上限" fieldKey="ultra_width" value={form.gif_downshift_ultra_width_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_ultra_width_cap: v }))} />
          <NumberField label="超长视频色盘上限" fieldKey="ultra_colors" value={form.gif_downshift_ultra_colors_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_ultra_colors_cap: v }))} />
          <NumberField label="超长视频时长上限" fieldKey="ultra_duration_sec" step={0.1} value={form.gif_downshift_ultra_duration_cap_sec} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_ultra_duration_cap_sec: v }))} />

          <NumberField label="高分辨率 FPS 上限" fieldKey="high_res_fps" value={form.gif_downshift_high_res_fps_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_high_res_fps_cap: v }))} />
          <NumberField label="高分辨率宽度上限" fieldKey="high_res_width" value={form.gif_downshift_high_res_width_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_high_res_width_cap: v }))} />
          <NumberField label="高分辨率色盘上限" fieldKey="high_res_colors" value={form.gif_downshift_high_res_colors_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_high_res_colors_cap: v }))} />
          <NumberField label="高分辨率时长上限" fieldKey="high_res_duration_sec" step={0.1} value={form.gif_downshift_high_res_duration_cap_sec} onChange={(v) => setForm((prev) => ({ ...prev, gif_downshift_high_res_duration_cap_sec: v }))} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 text-sm font-semibold text-slate-900">H. 超时回退档位参数</div>
        <div className="grid gap-4 md:grid-cols-4">
          <NumberField label="一级回退 FPS 上限" fieldKey="fallback_fps" value={form.gif_timeout_fallback_fps_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_fallback_fps_cap: v }))} />
          <NumberField label="一级回退宽度上限" fieldKey="fallback_width" value={form.gif_timeout_fallback_width_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_fallback_width_cap: v }))} />
          <NumberField label="一级回退色盘上限" fieldKey="fallback_colors" value={form.gif_timeout_fallback_colors_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_fallback_colors_cap: v }))} />
          <NumberField label="一级回退最小宽度" fieldKey="fallback_min_width" value={form.gif_timeout_fallback_min_width} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_fallback_min_width: v }))} />

          <NumberField label="一级回退(超长) FPS" fieldKey="fallback_ultra_fps" value={form.gif_timeout_fallback_ultra_fps_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_fallback_ultra_fps_cap: v }))} />
          <NumberField label="一级回退(超长) 宽度" fieldKey="fallback_ultra_width" value={form.gif_timeout_fallback_ultra_width_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_fallback_ultra_width_cap: v }))} />
          <NumberField label="一级回退(超长) 色盘" fieldKey="fallback_ultra_colors" value={form.gif_timeout_fallback_ultra_colors_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_fallback_ultra_colors_cap: v }))} />
          <div />

          <NumberField label="二级回退 FPS 上限" fieldKey="emergency_fps" value={form.gif_timeout_emergency_fps_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_emergency_fps_cap: v }))} />
          <NumberField label="二级回退宽度上限" fieldKey="emergency_width" value={form.gif_timeout_emergency_width_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_emergency_width_cap: v }))} />
          <NumberField label="二级回退色盘上限" fieldKey="emergency_colors" value={form.gif_timeout_emergency_colors_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_emergency_colors_cap: v }))} />
          <NumberField label="二级回退最小宽度" fieldKey="emergency_min_width" value={form.gif_timeout_emergency_min_width} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_emergency_min_width: v }))} />

          <NumberField label="二级回退触发时长" fieldKey="emergency_trigger_sec" step={0.1} value={form.gif_timeout_emergency_duration_trigger_sec} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_emergency_duration_trigger_sec: v }))} />
          <NumberField label="二级回退时长缩放" fieldKey="emergency_duration_scale" step={0.05} value={form.gif_timeout_emergency_duration_scale} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_emergency_duration_scale: v }))} />
          <NumberField label="二级回退最短时长" fieldKey="emergency_duration_min_sec" step={0.1} value={form.gif_timeout_emergency_duration_min_sec} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_emergency_duration_min_sec: v }))} />
          <div />

          <NumberField label="兜底 FPS 上限" fieldKey="last_resort_fps" value={form.gif_timeout_last_resort_fps_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_last_resort_fps_cap: v }))} />
          <NumberField label="兜底宽度上限" fieldKey="last_resort_width" value={form.gif_timeout_last_resort_width_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_last_resort_width_cap: v }))} />
          <NumberField label="兜底色盘上限" fieldKey="last_resort_colors" value={form.gif_timeout_last_resort_colors_cap} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_last_resort_colors_cap: v }))} />
          <NumberField label="兜底最小宽度" fieldKey="last_resort_min_width" value={form.gif_timeout_last_resort_min_width} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_last_resort_min_width: v }))} />

          <NumberField label="兜底最短时长" fieldKey="last_resort_duration_min_sec" step={0.1} value={form.gif_timeout_last_resort_duration_min_sec} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_last_resort_duration_min_sec: v }))} />
          <NumberField label="兜底最长时长" fieldKey="last_resort_duration_max_sec" step={0.1} value={form.gif_timeout_last_resort_duration_max_sec} onChange={(v) => setForm((prev) => ({ ...prev, gif_timeout_last_resort_duration_max_sec: v }))} />
        </div>
      </section>
    </div>
  );
}
