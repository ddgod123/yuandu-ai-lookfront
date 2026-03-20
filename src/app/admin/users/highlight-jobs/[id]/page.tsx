"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type AdminVideoJobUser = {
  id: number;
  display_name?: string;
  phone?: string;
};

type AdminVideoJobCost = {
  estimated_cost?: number;
  currency?: string;
  output_count?: number;
};

type AdminVideoJobItem = {
  id: number;
  title?: string;
  source_video_key?: string;
  requested_format?: string;
  output_formats?: string[];
  status: string;
  stage: string;
  progress?: number;
  options?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  created_at?: string;
  started_at?: string;
  finished_at?: string;
  user: AdminVideoJobUser;
  cost?: AdminVideoJobCost;
};

type AdminVideoJobEvent = {
  id: number;
  stage?: string;
  level?: string;
  message?: string;
  created_at?: string;
};

type AdminVideoJobArtifact = {
  id: number;
  type?: string;
  qiniu_key?: string;
  url?: string;
  mime_type?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

type AdminVideoJobAIUsage = {
  id: number;
  stage?: string;
  provider?: string;
  model?: string;
  request_status?: string;
  request_error?: string;
  request_duration_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  cached_input_tokens?: number;
  video_tokens?: number;
  cost_usd?: number;
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
  style_direction?: string;
  risk_flags?: string[];
  quality_weights?: Record<string, unknown>;
  brief_version?: string;
  model_version?: string;
  directive_text?: string;
  status?: string;
  fallback_used?: boolean;
  provider?: string;
  model?: string;
  prompt_version?: string;
  input_context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at?: string;
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
  metadata?: Record<string, unknown>;
  created_at?: string;
};

type AdminVideoJobGIFEvaluation = {
  id: number;
  output_id?: number;
  proposal_id?: number;
  candidate_id?: number;
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

type AdminVideoJobGIFAuditChainSummary = {
  candidate_count?: number;
  proposal_count?: number;
  output_count?: number;
  evaluation_count?: number;
  review_count?: number;
  feedback_count?: number;
  hard_gate_blocked_count?: number;
  latest_recommendation?: string;
  latest_recommendation_at?: string;
  pipeline_mode?: string;
  policy_version?: string;
  experiment_bucket?: string;
};

type AdminVideoJobGIFAuditChainResponse = {
  job: AdminVideoJobItem;
  summary?: AdminVideoJobGIFAuditChainSummary;
  events?: AdminVideoJobEvent[];
  outputs?: AdminVideoJobArtifact[];
  ai_usages?: AdminVideoJobAIUsage[];
  ai_gif_directives?: AdminVideoJobAIGIFDirective[];
  ai_gif_proposals?: AdminVideoJobAIGIFProposal[];
  ai_gif_reviews?: AdminVideoJobAIGIFReview[];
  gif_evaluations?: AdminVideoJobGIFEvaluation[];
};

type AdminVideoAIPromptTemplateItem = {
  id: number;
  format?: string;
  stage?: string;
  layer?: string;
  template_text?: string;
  enabled?: boolean;
  version?: string;
  is_active?: boolean;
  resolved_from?: string;
};

type AdminVideoAIPromptTemplatesResponse = {
  format?: string;
  items?: AdminVideoAIPromptTemplateItem[];
};

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

type SubStageRow = {
  key: string;
  label: string;
  status: string;
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
  reason?: string;
  error?: string;
};

type WorkerOutputRow = {
  output: AdminVideoJobArtifact;
  review?: AdminVideoJobAIGIFReview;
  evaluation?: AdminVideoJobGIFEvaluation;
};

type SectionKey = "overview" | "ai1" | "ai2" | "scoring" | "ai3" | "output" | "events";

type StageComparisonRow = {
  key: "ai1" | "ai2" | "scoring" | "ai3";
  label: string;
  input: unknown;
  output: unknown;
  duration_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  status: string;
  error?: string;
};

const REVIEW_STATUS_LABEL: Record<string, string> = {
  deliver: "deliver（用户可见）",
  keep_internal: "keep_internal（后台保留）",
  reject: "reject（弃用）",
  need_manual_review: "need_manual_review（待人工复核）",
};

const SUB_STAGE_META: Array<{ key: string; label: string }> = [
  { key: "briefing", label: "AI1 Briefing" },
  { key: "planning", label: "AI2 Planning" },
  { key: "scoring", label: "评分系统 Scoring" },
  { key: "reviewing", label: "AI3 Reviewing" },
];

const ALL_SECTION_KEYS: SectionKey[] = ["overview", "ai1", "ai2", "scoring", "ai3", "output", "events"];

const AI1_OUTPUT_CONTRACT_TEXT = `{
  "directive": {
    "business_goal": "...",
    "audience": "...",
    "must_capture": ["..."],
    "avoid": ["..."],
    "clip_count_min": 2,
    "clip_count_max": 6,
    "duration_pref_min_sec": 1.8,
    "duration_pref_max_sec": 3.2,
    "loop_preference": 0.2,
    "style_direction": "...",
    "risk_flags": ["..."],
    "quality_weights": {
      "semantic": 0.4,
      "clarity": 0.2,
      "loop": 0.2,
      "efficiency": 0.2
    },
    "directive_text": "..."
  }
}`;

const AI1_INPUT_FIELD_SPECS: Array<{
  path: string;
  label: string;
  note: string;
}> = [
  { path: "job_id", label: "任务ID", note: "视频任务唯一标识，用于串联AI1/AI2/评分/AI3全链路。" },
  { path: "title", label: "任务标题", note: "本次任务的业务标题，辅助语义上下文理解。" },
  { path: "duration_sec", label: "视频时长(秒)", note: "源视频总时长，用于约束候选窗口范围。" },
  { path: "width", label: "视频宽度", note: "源视频宽度（像素）。" },
  { path: "height", label: "视频高度", note: "源视频高度（像素）。" },
  { path: "fps", label: "视频帧率", note: "源视频帧率（fps），影响动作连续性判断。" },
  { path: "gif_profile", label: "GIF质量档位", note: "GIF质量策略档位（如 clarity / balanced / size）。" },
  { path: "gif_target_size_kb", label: "GIF目标体积KB", note: "单GIF目标体积预算（KB）。" },
  {
    path: "source_input_mode_requested",
    label: "输入模式(请求)",
    note: "配置请求模式（frames / full_video / hybrid）。",
  },
  {
    path: "source_input_mode_applied",
    label: "输入模式(实际)",
    note: "运行时实际生效模式（可能因URL可用性回退）。",
  },
  { path: "source_input_type", label: "输入来源类型", note: "本次输入来源标签（如 full_video_url / frame_manifest）。" },
  { path: "frame_count", label: "采样帧数量", note: "帧输入模式下传给AI1的采样帧数量。" },
  {
    path: "frame_manifest",
    label: "采样帧清单",
    note: "采样帧元信息数组；子字段 index(序号) / timestamp_sec(时间点秒) / bytes(帧大小字节)。",
  },
  { path: "source_video_url_available", label: "视频URL可用", note: "是否成功生成可被模型读取的源视频URL。" },
  { path: "source_video_url_error", label: "视频URL错误", note: "当URL不可用时的错误信息；为空表示无错误。" },
  { path: "source_video_url", label: "源视频URL", note: "传给AI1的整段视频访问URL（页面做脱敏展示）。" },
  { path: "operator_instruction.enabled", label: "运营指令启用", note: "是否启用AI1可编辑运营指令模板。" },
  { path: "operator_instruction.version", label: "运营指令版本", note: "当前生效的AI1可编辑运营模板版本号。" },
  {
    path: "operator_instruction.text",
    label: "运营指令正文",
    note: "运营可编辑指令文本，指导AI1生成directive（目标/约束/输出契约）。",
  },
];

function formatTime(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("zh-CN");
}

function formatDurationMs(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  if (n < 1000) return `${Math.round(n)}ms`;
  if (n < 60000) return `${(n / 1000).toFixed(2)}s`;
  return `${(n / 60000).toFixed(2)}m`;
}

function formatBytes(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  if (n < 1024) return `${n.toFixed(0)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatScore(value?: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(3);
}

function formatCurrency(value?: number, currency = "CNY") {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  return `${currency.toUpperCase() === "CNY" ? "¥" : `${currency.toUpperCase()} `}${n.toFixed(4)}`;
}

function reviewStatusLabel(status?: string) {
  const normalized = (status || "").trim().toLowerCase();
  return REVIEW_STATUS_LABEL[normalized] || status || "-";
}

function parseNumberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return {};
}

function parseBoolValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
}

function normalizeAIStage(stage?: string) {
  return (stage || "").trim().toLowerCase();
}

function pickUsageByStage(rows: AdminVideoJobAIUsage[], stage: "director" | "planner" | "judge") {
  const filtered = rows.filter((item) => normalizeAIStage(item.stage) === stage);
  const calls = filtered.length;
  const success = filtered.filter((item) => {
    const status = (item.request_status || "").trim().toLowerCase();
    return status === "ok" || status === "success";
  }).length;
  const durationMs = filtered.reduce((acc, item) => acc + Number(item.request_duration_ms || 0), 0);
  const inputTokens = filtered.reduce((acc, item) => acc + Number(item.input_tokens || 0), 0);
  const outputTokens = filtered.reduce((acc, item) => acc + Number(item.output_tokens || 0), 0);
  const costUSD = filtered.reduce((acc, item) => acc + Number(item.cost_usd || 0), 0);
  const latest = filtered[0];
  return { calls, success, durationMs, inputTokens, outputTokens, costUSD, latest };
}

function resolveSourceProbeSummary(options?: Record<string, unknown>) {
  const raw = options?.source_video_probe;
  if (!raw || typeof raw !== "object") return "-";
  const probe = raw as Record<string, unknown>;
  const width = parseNumberValue(probe.width);
  const height = parseNumberValue(probe.height);
  const fps = parseNumberValue(probe.fps);
  const duration = parseNumberValue(probe.duration_sec);
  const parts: string[] = [];
  if (typeof width === "number" && typeof height === "number") parts.push(`${Math.round(width)}x${Math.round(height)}`);
  if (typeof fps === "number") parts.push(`${fps.toFixed(1)}fps`);
  if (typeof duration === "number") parts.push(`${duration.toFixed(1)}s`);
  return parts.join(" · ") || "-";
}

function resolveSubStages(metrics?: Record<string, unknown>) {
  const raw = metrics?.gif_pipeline_sub_stages_v1;
  const payload = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rows: SubStageRow[] = [];
  for (const item of SUB_STAGE_META) {
    const stageRaw = payload[item.key];
    const stage = stageRaw && typeof stageRaw === "object" ? (stageRaw as Record<string, unknown>) : {};
    rows.push({
      key: item.key,
      label: item.label,
      status: String(stage.status || "-"),
      started_at: String(stage.started_at || ""),
      finished_at: String(stage.finished_at || ""),
      duration_ms: parseNumberValue(stage.duration_ms),
      reason: String(stage.reason || ""),
      error: String(stage.error || ""),
    });
  }
  return rows;
}

function safeJSONStringify(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function formatJSONPreview(value: unknown, maxChars = 220) {
  const raw = safeJSONStringify(value);
  if (raw.length <= maxChars) return raw;
  return `${raw.slice(0, maxChars)}...`;
}

function maskSensitiveString(text: string) {
  if (!text) return text;
  return text
    .replace(/([?&]token=)[^&]+/gi, "$1***")
    .replace(/(authorization[=:]\\s*bearer\\s+)[^\\s]+/gi, "$1***");
}

function maskSensitiveValue(value: unknown): unknown {
  if (typeof value === "string") return maskSensitiveString(value);
  if (Array.isArray(value)) return value.map((item) => maskSensitiveValue(item));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === "string" && k.toLowerCase().includes("token")) {
        out[k] = "***";
        continue;
      }
      out[k] = maskSensitiveValue(v);
    }
    return out;
  }
  return value;
}

function getValueByPath(root: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = root;
  for (const item of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[item];
  }
  return current;
}

function extractUsageInputPayload(row: AdminVideoJobAIUsage | undefined, stage: "director" | "planner" | "judge") {
  if (!row?.metadata || typeof row.metadata !== "object") return null;
  const keyMap: Record<typeof stage, string> = {
    director: "director_input_payload_v1",
    planner: "planner_input_payload_v1",
    judge: "judge_input_payload_v1",
  };
  const key = keyMap[stage];
  const payload = (row.metadata as Record<string, unknown>)[key];
  if (payload && typeof payload === "object") return payload as Record<string, unknown>;
  return null;
}

function resolveMainDurationMs(job?: AdminVideoJobItem | null) {
  const started = job?.started_at ? new Date(job.started_at).getTime() : 0;
  const finished = job?.finished_at ? new Date(job.finished_at).getTime() : 0;
  if (!started || !finished || finished <= started) return undefined;
  return finished - started;
}

function buildSectionState(openKeys: SectionKey[]): Record<SectionKey, boolean> {
  const state: Record<SectionKey, boolean> = {
    overview: false,
    ai1: false,
    ai2: false,
    scoring: false,
    ai3: false,
    output: false,
    events: false,
  };
  for (const key of openKeys) state[key] = true;
  return state;
}

function defaultOpenSectionsByStage(stage?: string): Record<SectionKey, boolean> {
  const normalized = String(stage || "").trim().toLowerCase();
  const open = new Set<SectionKey>(["overview"]);
  switch (normalized) {
    case "briefing":
    case "director":
      open.add("ai1");
      break;
    case "planning":
    case "planner":
      open.add("ai2");
      break;
    case "scoring":
      open.add("scoring");
      break;
    case "reviewing":
    case "judge":
      open.add("ai3");
      break;
    case "analyzing":
      open.add("ai1");
      open.add("ai2");
      break;
    case "rendering":
    case "uploading":
    case "persisting":
      open.add("output");
      break;
    case "done":
    case "failed":
    case "cancelled":
      open.add("ai3");
      open.add("output");
      open.add("events");
      break;
    default:
      open.add("ai1");
      open.add("output");
      break;
  }
  return buildSectionState(Array.from(open));
}

async function parseApiError(response: Response, fallback: string) {
  try {
    const payload = (await response.clone().json()) as ApiErrorPayload;
    return payload.message || payload.error || fallback;
  } catch {
    const text = await response.text();
    return text || fallback;
  }
}

export default function AdminHighlightJobDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminVideoJobGIFAuditChainResponse | null>(null);
  const [ai1PromptTemplates, setAI1PromptTemplates] = useState<AdminVideoAIPromptTemplateItem[]>([]);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(() =>
    defaultOpenSectionsByStage()
  );

  const jobID = useMemo(() => {
    const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const parsed = Number(raw || 0);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.floor(parsed);
  }, [params?.id]);

  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const expandAllSections = useCallback(() => {
    setOpenSections(buildSectionState(ALL_SECTION_KEYS));
  }, []);

  const collapseAllSections = useCallback(() => {
    setOpenSections(buildSectionState(["overview"]));
  }, []);

  const loadDetail = useCallback(async () => {
    if (!jobID) return;
    setLoading(true);
    setError(null);
    setDetail(null);
    setAI1PromptTemplates([]);
    try {
      const [detailRes, promptRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/admin/video-jobs/${jobID}/gif-audit-chain`),
        fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates?format=gif`),
      ]);
      if (!detailRes.ok) throw new Error(await parseApiError(detailRes, "加载任务详情失败"));
      const data = (await detailRes.json()) as AdminVideoJobGIFAuditChainResponse;
      setDetail(data);
      setOpenSections(defaultOpenSectionsByStage(data?.job?.stage));
      if (promptRes.ok) {
        const promptData = (await promptRes.json()) as AdminVideoAIPromptTemplatesResponse;
        const rows = Array.isArray(promptData.items) ? promptData.items : [];
        setAI1PromptTemplates(
          rows.filter(
            (item) =>
              String(item.stage || "").toLowerCase() === "ai1" &&
              (String(item.layer || "").toLowerCase() === "fixed" ||
                String(item.layer || "").toLowerCase() === "editable")
          )
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载任务详情失败");
    } finally {
      setLoading(false);
    }
  }, [jobID]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!jobID) setOpenSections(defaultOpenSectionsByStage());
  }, [jobID]);

  const detailOutputs = useMemo(() => {
    const source = Array.isArray(detail?.outputs) ? detail.outputs : [];
    return source
      .filter((item) => String(item.type || "").toLowerCase() === "main")
      .filter((item) => String(item.qiniu_key || "").toLowerCase().includes("/outputs/gif/"))
      .slice(0, 32);
  }, [detail?.outputs]);

  const detailProposals = useMemo(() => {
    const source = Array.isArray(detail?.ai_gif_proposals) ? detail.ai_gif_proposals : [];
    return [...source].sort((a, b) => {
      const ar = Number(a.proposal_rank || 0);
      const br = Number(b.proposal_rank || 0);
      if (ar > 0 && br > 0 && ar !== br) return ar - br;
      return Number(a.id || 0) - Number(b.id || 0);
    });
  }, [detail?.ai_gif_proposals]);

  const detailReviews = useMemo(() => {
    const source = Array.isArray(detail?.ai_gif_reviews) ? detail.ai_gif_reviews : [];
    return [...source].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  }, [detail?.ai_gif_reviews]);

  const detailEvaluations = useMemo(() => {
    const source = Array.isArray(detail?.gif_evaluations) ? detail.gif_evaluations : [];
    return [...source].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  }, [detail?.gif_evaluations]);

  const reviewByOutputID = useMemo(() => {
    const out = new Map<number, AdminVideoJobAIGIFReview>();
    for (const item of detailReviews) {
      const outputID = Number(item.output_id || 0);
      if (outputID > 0 && !out.has(outputID)) out.set(outputID, item);
    }
    return out;
  }, [detailReviews]);

  const evalByOutputID = useMemo(() => {
    const out = new Map<number, AdminVideoJobGIFEvaluation>();
    for (const item of detailEvaluations) {
      const outputID = Number(item.output_id || 0);
      if (outputID > 0 && !out.has(outputID)) out.set(outputID, item);
    }
    return out;
  }, [detailEvaluations]);

  const aiUsages = useMemo(
    () => (Array.isArray(detail?.ai_usages) ? detail.ai_usages : []),
    [detail?.ai_usages]
  );
  const ai1Usage = useMemo(() => pickUsageByStage(aiUsages, "director"), [aiUsages]);
  const ai2Usage = useMemo(() => pickUsageByStage(aiUsages, "planner"), [aiUsages]);
  const ai3Usage = useMemo(() => pickUsageByStage(aiUsages, "judge"), [aiUsages]);
  const totalAIStageCostUSD = useMemo(
    () => Number(ai1Usage.costUSD || 0) + Number(ai2Usage.costUSD || 0) + Number(ai3Usage.costUSD || 0),
    [ai1Usage.costUSD, ai2Usage.costUSD, ai3Usage.costUSD]
  );
  const totalAIDurationMs = useMemo(
    () => Number(ai1Usage.durationMs || 0) + Number(ai2Usage.durationMs || 0) + Number(ai3Usage.durationMs || 0),
    [ai1Usage.durationMs, ai2Usage.durationMs, ai3Usage.durationMs]
  );

  const ai1Directive = useMemo(() => {
    const source = Array.isArray(detail?.ai_gif_directives) ? detail.ai_gif_directives : [];
    return source[0];
  }, [detail?.ai_gif_directives]);
  const ai1InputPayload = useMemo(
    () => extractUsageInputPayload(ai1Usage.latest, "director"),
    [ai1Usage.latest]
  );
  const ai1FixedTemplate = useMemo(
    () =>
      ai1PromptTemplates.find(
        (item) => String(item.layer || "").toLowerCase() === "fixed"
      ),
    [ai1PromptTemplates]
  );
  const ai1EditableTemplate = useMemo(
    () =>
      ai1PromptTemplates.find(
        (item) => String(item.layer || "").toLowerCase() === "editable"
      ),
    [ai1PromptTemplates]
  );
  const ai1FixedPromptText = useMemo(
    () => String(ai1FixedTemplate?.template_text || "未读取到 fixed 模板（将使用后端内置 fixed prompt）。"),
    [ai1FixedTemplate?.template_text]
  );
  const ai1EditablePromptText = useMemo(
    () => String(ai1EditableTemplate?.template_text || "未读取到 editable 模板。"),
    [ai1EditableTemplate?.template_text]
  );
  const ai1SystemPromptAssembled = useMemo(() => {
    const segments: string[] = [];
    segments.push("【第一段：固定层（fixed）】");
    segments.push(ai1FixedPromptText);
    segments.push("");
    segments.push("【第二段：可编辑层（editable）】");
    if (ai1EditableTemplate?.enabled) {
      segments.push(ai1EditablePromptText);
    } else {
      segments.push("未启用（enabled=false）");
    }
    segments.push("");
    segments.push("【第三段：输出契约（output contract）】");
    segments.push(AI1_OUTPUT_CONTRACT_TEXT);
    segments.push("");
    segments.push('最终补充：无论运营模板如何描述，最终返回必须是 {"directive":{...}}。');
    return segments.join("\n");
  }, [ai1EditablePromptText, ai1EditableTemplate?.enabled, ai1FixedPromptText]);
  const ai2InputPayload = useMemo(
    () => extractUsageInputPayload(ai2Usage.latest, "planner"),
    [ai2Usage.latest]
  );
  const ai1InputForDisplay = useMemo(() => {
    if (ai1InputPayload) return ai1InputPayload;
    if (ai1Directive?.input_context && typeof ai1Directive.input_context === "object") {
      return ai1Directive.input_context;
    }
    return {
      job_id: detail?.job?.id || 0,
      title: detail?.job?.title || "",
      note: "未命中 director_input_payload_v1，使用回退摘要展示。",
    };
  }, [ai1Directive?.input_context, ai1InputPayload, detail?.job?.id, detail?.job?.title]);
  const ai1InputForDisplayMasked = useMemo(
    () => maskSensitiveValue(ai1InputForDisplay),
    [ai1InputForDisplay]
  );
  const ai2InputForDisplay = useMemo(() => {
    if (ai2InputPayload) return ai2InputPayload;
    return {
      job_id: detail?.job?.id || 0,
      title: detail?.job?.title || "",
      director: ai1Directive
        ? {
            business_goal: ai1Directive.business_goal,
            clip_count_min: ai1Directive.clip_count_min,
            clip_count_max: ai1Directive.clip_count_max,
            duration_pref_min_sec: ai1Directive.duration_pref_min_sec,
            duration_pref_max_sec: ai1Directive.duration_pref_max_sec,
            must_capture: ai1Directive.must_capture || [],
            avoid: ai1Directive.avoid || [],
            style_direction: ai1Directive.style_direction || "",
            risk_flags: ai1Directive.risk_flags || [],
            directive_text: ai1Directive.directive_text || "",
          }
        : null,
      note: "未命中 planner_input_payload_v1，使用页面重建摘要展示。",
    };
  }, [ai1Directive, ai2InputPayload, detail?.job?.id, detail?.job?.title]);
  const ai3InputPayload = useMemo(
    () => extractUsageInputPayload(ai3Usage.latest, "judge"),
    [ai3Usage.latest]
  );
  const ai1Metadata = useMemo(() => asRecord(ai1Usage.latest?.metadata), [ai1Usage.latest?.metadata]);
  const ai1InputContextRecord = useMemo(
    () => asRecord(ai1InputForDisplayMasked),
    [ai1InputForDisplayMasked]
  );
  const ai1InputFieldRows = useMemo(
    () =>
      AI1_INPUT_FIELD_SPECS.map((spec) => ({
        path: spec.path,
        label: spec.label,
        note: spec.note,
        value: getValueByPath(ai1InputContextRecord, spec.path),
      })),
    [ai1InputContextRecord]
  );
  const ai1FrameManifestRows = useMemo(() => {
    const raw = ai1InputContextRecord.frame_manifest;
    if (!Array.isArray(raw)) return [] as Array<{ index: number; timestamp_sec?: number; bytes?: number }>;
    const out: Array<{ index: number; timestamp_sec?: number; bytes?: number }> = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const idx = parseNumberValue(row.index);
      if (typeof idx !== "number") continue;
      out.push({
        index: Math.max(1, Math.round(idx)),
        timestamp_sec: parseNumberValue(row.timestamp_sec),
        bytes: parseNumberValue(row.bytes),
      });
    }
    return out;
  }, [ai1InputContextRecord.frame_manifest]);
  const ai1InputModeRequested = useMemo(
    () =>
      String(
        ai1Metadata.director_input_mode_requested ||
          ai1Metadata.source_input_mode_requested ||
          ai1InputContextRecord.source_input_mode_requested ||
          "-"
      ),
    [ai1InputContextRecord.source_input_mode_requested, ai1Metadata.director_input_mode_requested, ai1Metadata.source_input_mode_requested]
  );
  const ai1InputModeApplied = useMemo(
    () =>
      String(
        ai1Metadata.director_input_mode_applied ||
          ai1Metadata.source_input_mode_applied ||
          ai1InputContextRecord.source_input_mode_applied ||
          "-"
      ),
    [ai1InputContextRecord.source_input_mode_applied, ai1Metadata.director_input_mode_applied, ai1Metadata.source_input_mode_applied]
  );
  const ai1InputSource = useMemo(
    () =>
      String(
        ai1Metadata.director_input_source ||
          ai1Metadata.candidate_source ||
          ai1InputContextRecord.source_input_type ||
          "-"
      ),
    [ai1InputContextRecord.source_input_type, ai1Metadata.candidate_source, ai1Metadata.director_input_source]
  );
  const ai1SourceVideoURLAvailable = useMemo(() => {
    const raw =
      ai1Metadata.source_video_url_available ??
      ai1InputContextRecord.source_video_url_available ??
      false;
    if (typeof raw === "boolean") return raw;
    if (typeof raw === "string") return raw === "true" || raw === "1";
    if (typeof raw === "number") return raw > 0;
    return false;
  }, [ai1InputContextRecord.source_video_url_available, ai1Metadata.source_video_url_available]);
  const ai1FrameCount = useMemo(() => {
    const fromMeta = parseNumberValue(ai1Metadata.frame_count);
    if (typeof fromMeta === "number") return Math.max(0, Math.round(fromMeta));
    const fromInput = parseNumberValue(ai1InputContextRecord.frame_count);
    if (typeof fromInput === "number") return Math.max(0, Math.round(fromInput));
    return 0;
  }, [ai1InputContextRecord.frame_count, ai1Metadata.frame_count]);

  const ai1OutputForDisplay = useMemo(
    () => ({
      business_goal: ai1Directive?.business_goal,
      audience: ai1Directive?.audience,
      must_capture: ai1Directive?.must_capture,
      avoid: ai1Directive?.avoid,
      clip_count_min: ai1Directive?.clip_count_min,
      clip_count_max: ai1Directive?.clip_count_max,
      duration_pref_min_sec: ai1Directive?.duration_pref_min_sec,
      duration_pref_max_sec: ai1Directive?.duration_pref_max_sec,
      style_direction: ai1Directive?.style_direction,
      risk_flags: ai1Directive?.risk_flags,
      quality_weights: ai1Directive?.quality_weights || {},
      directive_text: ai1Directive?.directive_text || "",
      status: ai1Directive?.status || "",
      fallback_used: ai1Directive?.fallback_used || false,
      director_input_mode_requested: ai1InputModeRequested,
      director_input_mode_applied: ai1InputModeApplied,
      director_input_source: ai1InputSource,
      source_video_url_available: ai1SourceVideoURLAvailable,
      frame_count: ai1FrameCount,
    }),
    [
      ai1Directive,
      ai1FrameCount,
      ai1InputModeApplied,
      ai1InputModeRequested,
      ai1InputSource,
      ai1SourceVideoURLAvailable,
    ]
  );

  const subStages = useMemo(() => resolveSubStages(detail?.job?.metrics), [detail?.job?.metrics]);
  const mainDurationMs = useMemo(() => resolveMainDurationMs(detail?.job), [detail?.job]);
  const summary = detail?.summary || {};
  const workerRows = useMemo<WorkerOutputRow[]>(() => {
    if (!detailOutputs.length) return [];
    const rows: WorkerOutputRow[] = [];
    for (const output of detailOutputs) {
      rows.push({
        output,
        review: reviewByOutputID.get(output.id),
        evaluation: evalByOutputID.get(output.id),
      });
    }
    return rows;
  }, [detailOutputs, evalByOutputID, reviewByOutputID]);
  const workerRenderElapsedMs = useMemo(
    () =>
      workerRows.reduce((acc, item) => {
        const meta = item.output.metadata || {};
        return acc + Number(meta.render_elapsed_ms || 0);
      }, 0),
    [workerRows]
  );
  const workerUploadElapsedMs = useMemo(
    () =>
      workerRows.reduce((acc, item) => {
        const meta = item.output.metadata || {};
        return acc + Number(meta.upload_elapsed_ms || 0);
      }, 0),
    [workerRows]
  );
  const subStageByKey = useMemo(() => {
    const map = new Map<string, SubStageRow>();
    for (const item of subStages) map.set(item.key, item);
    return map;
  }, [subStages]);
  const ai2OutputForDisplay = useMemo(
    () => ({
      proposal_count: detailProposals.length,
      top_proposals: detailProposals.slice(0, 5).map((item) => ({
        id: item.id,
        rank: item.proposal_rank,
        start_sec: item.start_sec,
        end_sec: item.end_sec,
        duration_sec: item.duration_sec,
        base_score: item.base_score,
        standalone_confidence: item.standalone_confidence,
        semantic_tags: item.semantic_tags || [],
        proposal_reason: item.proposal_reason || "",
      })),
    }),
    [detailProposals]
  );
  const scoringInputForDisplay = useMemo(
    () => ({
      proposal_count: detailProposals.length,
      worker_output_count: workerRows.length,
      expected_stage: "scoring",
    }),
    [detailProposals.length, workerRows.length]
  );
  const scoringOutputForDisplay = useMemo(
    () => ({
      evaluation_count: detailEvaluations.length,
      rows: detailEvaluations.slice(0, 8).map((item) => ({
        id: item.id,
        output_id: item.output_id,
        proposal_id: item.proposal_id,
        overall_score: item.overall_score,
        clarity_score: item.clarity_score,
        loop_score: item.loop_score,
        motion_score: item.motion_score,
      })),
    }),
    [detailEvaluations]
  );
  const ai3OutputForDisplay = useMemo(
    () => ({
      review_count: detailReviews.length,
      rows: detailReviews.slice(0, 8).map((item) => ({
        id: item.id,
        output_id: item.output_id,
        proposal_id: item.proposal_id,
        final_recommendation: item.final_recommendation,
        semantic_verdict: item.semantic_verdict,
        diagnostic_reason: item.diagnostic_reason,
      })),
    }),
    [detailReviews]
  );
  const stageComparisonRows = useMemo<StageComparisonRow[]>(() => {
    const ai1Stage = subStageByKey.get("briefing");
    const ai2Stage = subStageByKey.get("planning");
    const scoringStage = subStageByKey.get("scoring");
    const ai3Stage = subStageByKey.get("reviewing");
    const ai1Status = String(ai1Usage.latest?.request_status || ai1Stage?.status || "-");
    const ai2Status = String(ai2Usage.latest?.request_status || ai2Stage?.status || "-");
    const ai3Status = String(ai3Usage.latest?.request_status || ai3Stage?.status || "-");
    const scoringStatus = String(scoringStage?.status || "-");
    return [
      {
        key: "ai1",
        label: "AI1（Prompt Director）",
        input: ai1InputForDisplayMasked,
        output: ai1OutputForDisplay,
        duration_ms: ai1Stage?.duration_ms || ai1Usage.durationMs,
        input_tokens: ai1Usage.inputTokens,
        output_tokens: ai1Usage.outputTokens,
        cost_usd: ai1Usage.costUSD,
        status: ai1Status,
        error: String(ai1Usage.latest?.request_error || ai1Stage?.error || ""),
      },
      {
        key: "ai2",
        label: "AI2（Planner）",
        input: ai2InputForDisplay,
        output: ai2OutputForDisplay,
        duration_ms: ai2Stage?.duration_ms || ai2Usage.durationMs,
        input_tokens: ai2Usage.inputTokens,
        output_tokens: ai2Usage.outputTokens,
        cost_usd: ai2Usage.costUSD,
        status: ai2Status,
        error: String(ai2Usage.latest?.request_error || ai2Stage?.error || ""),
      },
      {
        key: "scoring",
        label: "系统评分（Scoring）",
        input: scoringInputForDisplay,
        output: scoringOutputForDisplay,
        duration_ms: scoringStage?.duration_ms,
        input_tokens: undefined,
        output_tokens: undefined,
        cost_usd: 0,
        status: scoringStatus,
        error: String(scoringStage?.error || ""),
      },
      {
        key: "ai3",
        label: "AI3（Judge）",
        input:
          ai3InputPayload || {
            job_id: detail?.job?.id || 0,
            sample_size: detailOutputs.length,
            note: "未命中 judge_input_payload_v1，使用页面重建摘要展示。",
          },
        output: ai3OutputForDisplay,
        duration_ms: ai3Stage?.duration_ms || ai3Usage.durationMs,
        input_tokens: ai3Usage.inputTokens,
        output_tokens: ai3Usage.outputTokens,
        cost_usd: ai3Usage.costUSD,
        status: ai3Status,
        error: String(ai3Usage.latest?.request_error || ai3Stage?.error || ""),
      },
    ];
  }, [
    ai1InputForDisplayMasked,
    ai1OutputForDisplay,
    ai1Usage.costUSD,
    ai1Usage.durationMs,
    ai1Usage.inputTokens,
    ai1Usage.latest?.request_error,
    ai1Usage.latest?.request_status,
    ai1Usage.outputTokens,
    ai2InputForDisplay,
    ai2OutputForDisplay,
    ai2Usage.costUSD,
    ai2Usage.durationMs,
    ai2Usage.inputTokens,
    ai2Usage.latest?.request_error,
    ai2Usage.latest?.request_status,
    ai2Usage.outputTokens,
    ai3InputPayload,
    ai3OutputForDisplay,
    ai3Usage.costUSD,
    ai3Usage.durationMs,
    ai3Usage.inputTokens,
    ai3Usage.latest?.request_error,
    ai3Usage.latest?.request_status,
    ai3Usage.outputTokens,
    detail?.job?.id,
    detailOutputs.length,
    scoringInputForDisplay,
    scoringOutputForDisplay,
    subStageByKey,
  ]);

  const sourceReadability = useMemo(
    () => asRecord(detail?.job?.metrics?.source_video_readability_v1),
    [detail?.job?.metrics]
  );
  const sourceReadAttempts = useMemo(() => {
    const raw = sourceReadability.attempts;
    if (!Array.isArray(raw)) return [] as Record<string, unknown>[];
    return raw
      .filter((item) => item && typeof item === "object")
      .map((item) => item as Record<string, unknown>);
  }, [sourceReadability.attempts]);
  const sourceReadSuccess = useMemo(
    () => parseBoolValue(sourceReadability.success),
    [sourceReadability.success]
  );
  const sourceReadPermanent = useMemo(
    () => parseBoolValue(sourceReadability.permanent),
    [sourceReadability.permanent]
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title={jobID ? `视频任务详情 #${jobID}` : "视频任务详情"}
        description="二级页面：单视频任务的 AI1/AI2/系统评分/AI3/GIF 产出全链路详情。"
        actions={
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
              onClick={() => void loadDetail()}
              disabled={loading || !jobID}
            >
              {loading ? "加载中..." : "刷新"}
            </button>
            <Link
              href="/admin/users/highlight-jobs"
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              返回视频任务列表
            </Link>
          </div>
        }
      />

      {!jobID ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          无效任务 ID
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
      ) : null}
      {loading ? (
        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500">详情加载中...</div>
      ) : null}

      {detail ? (
        <>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm text-sm text-slate-700">
            <div>任务 #{detail.job.id} · {detail.job.title || "未命名"}</div>
            <div className="mt-1">状态：{detail.job.status} / {detail.job.stage} / {detail.job.progress || 0}%</div>
            <div className="mt-1">source key：{detail.job.source_video_key || "-"}</div>
            <div className="mt-1">输入探针：{resolveSourceProbeSummary(detail.job.options)}</div>
            <div className="mt-1">
              源视频可读性：{sourceReadSuccess ? "ok" : sourceReadability.success !== undefined ? "failed" : "-"}
              {sourceReadability.reason_code ? ` · ${String(sourceReadability.reason_code)}` : ""}
              {sourceReadability.permanent !== undefined ? ` · permanent=${String(sourceReadPermanent)}` : ""}
            </div>
            <div className="mt-1">
              成本：{formatCurrency(detail.job.cost?.estimated_cost, detail.job.cost?.currency || "CNY")} · output_count {detail.job.cost?.output_count || 0}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">proposal</div>
              <div className="text-2xl font-black text-slate-900">{summary.proposal_count || 0}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">output</div>
              <div className="text-2xl font-black text-slate-900">{summary.output_count || 0}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">evaluation</div>
              <div className="text-2xl font-black text-slate-900">{summary.evaluation_count || 0}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">review</div>
              <div className="text-2xl font-black text-slate-900">{summary.review_count || 0}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">feedback</div>
              <div className="text-2xl font-black text-slate-900">{summary.feedback_count || 0}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">hard gate blocked</div>
              <div className="text-2xl font-black text-rose-600">{summary.hard_gate_blocked_count || 0}</div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">任务总耗时</div>
              <div className="text-xl font-black text-slate-900">{formatDurationMs(mainDurationMs)}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">AI 总耗时</div>
              <div className="text-xl font-black text-slate-900">{formatDurationMs(totalAIDurationMs)}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">AI 总成本（USD）</div>
              <div className="text-xl font-black text-slate-900">{formatCurrency(totalAIStageCostUSD, "USD")}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Worker 渲染耗时累计</div>
              <div className="text-xl font-black text-slate-900">{formatDurationMs(workerRenderElapsedMs)}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Worker 上传耗时累计</div>
              <div className="text-xl font-black text-slate-900">{formatDurationMs(workerUploadElapsedMs)}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Worker 产物数</div>
              <div className="text-xl font-black text-slate-900">{workerRows.length}</div>
            </div>
          </div>

          <section id="stage-overview" className="rounded-2xl border border-cyan-100 bg-cyan-50/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan-700">流程总览（AI1→AI2→系统评分→AI3）</div>
              <button
                type="button"
                className="rounded-lg border border-cyan-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-cyan-700 hover:bg-cyan-50"
                onClick={() => toggleSection("overview")}
              >
                {openSections.overview ? "收起" : "展开"}
              </button>
            </div>
            {openSections.overview ? (
              <>
                <div className="mb-3 rounded-xl border border-cyan-100 bg-white p-3 text-xs text-slate-700">
                  <div className="mb-2 text-[11px] font-semibold text-cyan-700">源视频下载可读性诊断</div>
                  <div className="grid gap-2 md:grid-cols-4">
                    <div className="rounded-lg border border-cyan-100 bg-cyan-50/40 px-2 py-1.5">
                      状态：{sourceReadability.success !== undefined ? (sourceReadSuccess ? "ok" : "failed") : "-"}
                    </div>
                    <div className="rounded-lg border border-cyan-100 bg-cyan-50/40 px-2 py-1.5">
                      reason：{String(sourceReadability.reason_code || "-")}
                    </div>
                    <div className="rounded-lg border border-cyan-100 bg-cyan-50/40 px-2 py-1.5">
                      fallback：{String(sourceReadability.used_fallback ?? "-")}
                    </div>
                    <div className="rounded-lg border border-cyan-100 bg-cyan-50/40 px-2 py-1.5">
                      permanent：{String(sourceReadability.permanent ?? "-")}
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    hint：{String(sourceReadability.hint || "-")}
                  </div>
                  {sourceReadAttempts.length > 0 ? (
                    <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-cyan-100">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-cyan-50 text-cyan-700">
                          <tr>
                            <th className="px-2 py-1.5">step</th>
                            <th className="px-2 py-1.5">kind</th>
                            <th className="px-2 py-1.5">host</th>
                            <th className="px-2 py-1.5">耗时</th>
                            <th className="px-2 py-1.5">结果</th>
                            <th className="px-2 py-1.5">错误</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cyan-50 text-slate-700">
                          {sourceReadAttempts.map((row, idx) => {
                            const success = parseBoolValue(row.success);
                            return (
                              <tr key={`source-read-attempt-${idx}`}>
                                <td className="px-2 py-1.5">{String(row.step || "-")}</td>
                                <td className="px-2 py-1.5">{String(row.kind || "-")}</td>
                                <td className="px-2 py-1.5">{String(row.target_host || "-")}</td>
                                <td className="px-2 py-1.5">{formatDurationMs(parseNumberValue(row.duration_ms))}</td>
                                <td className="px-2 py-1.5">
                                  {success ? "ok" : `failed${row.http_status ? ` (${String(row.http_status)})` : ""}`}
                                </td>
                                <td className="max-w-[360px] truncate px-2 py-1.5" title={String(row.error || "")}>
                                  {String(row.error || "-")}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
                <div className="mb-3 max-h-72 overflow-auto rounded-xl border border-cyan-100 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-cyan-50 text-cyan-700">
                      <tr>
                        <th className="px-3 py-2">阶段</th>
                        <th className="px-3 py-2">输入</th>
                        <th className="px-3 py-2">输出</th>
                        <th className="px-3 py-2">耗时</th>
                        <th className="px-3 py-2">tokens</th>
                        <th className="px-3 py-2">成本(USD)</th>
                        <th className="px-3 py-2">状态/错误</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-50 text-slate-700">
                      {stageComparisonRows.map((row) => (
                        <tr key={`stage-compare-${row.key}`} className="align-top">
                          <td className="px-3 py-2 font-semibold">{row.label}</td>
                          <td className="px-3 py-2">
                            <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-2 text-[10px] text-slate-600">
                              {formatJSONPreview(row.input)}
                            </pre>
                            <details className="mt-1">
                              <summary className="cursor-pointer text-[10px] text-cyan-700">查看完整输入 JSON</summary>
                              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-2 text-[10px] text-slate-600">
                                {safeJSONStringify(row.input)}
                              </pre>
                            </details>
                          </td>
                          <td className="px-3 py-2">
                            <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-2 text-[10px] text-slate-600">
                              {formatJSONPreview(row.output)}
                            </pre>
                            <details className="mt-1">
                              <summary className="cursor-pointer text-[10px] text-cyan-700">查看完整输出 JSON</summary>
                              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-2 text-[10px] text-slate-600">
                                {safeJSONStringify(row.output)}
                              </pre>
                            </details>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatDurationMs(row.duration_ms)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {typeof row.input_tokens === "number" || typeof row.output_tokens === "number"
                              ? `${Number(row.input_tokens || 0)} / ${Number(row.output_tokens || 0)}`
                              : "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(row.cost_usd, "USD")}</td>
                          <td className="px-3 py-2">
                            <div>{row.status || "-"}</div>
                            {row.error ? (
                              <div className="mt-1 max-w-[220px] truncate text-[10px] text-rose-600" title={row.error}>
                                {row.error}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="max-h-64 overflow-auto rounded-xl border border-cyan-100 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-cyan-50 text-cyan-700">
                      <tr>
                        <th className="px-3 py-2">阶段</th>
                        <th className="px-3 py-2">状态</th>
                        <th className="px-3 py-2">开始</th>
                        <th className="px-3 py-2">结束</th>
                        <th className="px-3 py-2">耗时</th>
                        <th className="px-3 py-2">原因/错误</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-50 text-slate-700">
                      {subStages.map((item) => (
                        <tr key={`sub-stage-${item.key}`}>
                          <td className="px-3 py-2">{item.label}</td>
                          <td className="px-3 py-2">{item.status || "-"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatTime(item.started_at)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatTime(item.finished_at)}</td>
                          <td className="px-3 py-2">{formatDurationMs(item.duration_ms)}</td>
                          <td className="px-3 py-2 max-w-[320px] truncate" title={item.error || item.reason || ""}>
                            {item.error || item.reason || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 max-h-52 overflow-auto rounded-xl border border-cyan-100 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-cyan-50 text-cyan-700">
                      <tr>
                        <th className="px-3 py-2">AI 阶段</th>
                        <th className="px-3 py-2">调用/成功</th>
                        <th className="px-3 py-2">tokens</th>
                        <th className="px-3 py-2">耗时</th>
                        <th className="px-3 py-2">成本</th>
                        <th className="px-3 py-2">最后状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-50 text-slate-700">
                      {[
                        { key: "AI1 Director", usage: ai1Usage },
                        { key: "AI2 Planner", usage: ai2Usage },
                        { key: "AI3 Judge", usage: ai3Usage },
                      ].map((row) => (
                        <tr key={`usage-row-${row.key}`}>
                          <td className="px-3 py-2">{row.key}</td>
                          <td className="px-3 py-2">{row.usage.calls} / {row.usage.success}</td>
                          <td className="px-3 py-2">{row.usage.inputTokens} / {row.usage.outputTokens}</td>
                          <td className="px-3 py-2">{formatDurationMs(row.usage.durationMs)}</td>
                          <td className="px-3 py-2">{formatCurrency(row.usage.costUSD, "USD")}</td>
                          <td className="px-3 py-2">{String(row.usage.latest?.request_status || "-")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-xs text-slate-500">该板块已收起</div>
            )}
          </section>

          <div className="sticky top-20 z-20">
            <div className="rounded-2xl border border-slate-200/90 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="hidden shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 md:block">
                    快速跳转
                  </div>
                  <div className="min-w-0 flex-1 overflow-x-auto">
                    <div className="flex min-w-max items-center gap-1.5 pr-2">
                      <a
                        href="#stage-overview"
                        className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                          openSections.overview
                            ? "border-cyan-300 bg-cyan-100 text-cyan-800"
                            : "border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                        }`}
                      >
                        流程总览
                      </a>
                      <a
                        href="#stage-ai1"
                        className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                          openSections.ai1
                            ? "border-indigo-300 bg-indigo-100 text-indigo-800"
                            : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        }`}
                      >
                        AI1
                      </a>
                      <a
                        href="#stage-ai2"
                        className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                          openSections.ai2
                            ? "border-blue-300 bg-blue-100 text-blue-800"
                            : "border-blue-200 text-blue-700 hover:bg-blue-50"
                        }`}
                      >
                        AI2
                      </a>
                      <a
                        href="#stage-scoring"
                        className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                          openSections.scoring
                            ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        系统评分
                      </a>
                      <a
                        href="#stage-ai3"
                        className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                          openSections.ai3
                            ? "border-amber-300 bg-amber-100 text-amber-800"
                            : "border-amber-200 text-amber-700 hover:bg-amber-50"
                        }`}
                      >
                        AI3
                      </a>
                      <a
                        href="#stage-output"
                        className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                          openSections.output
                            ? "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800"
                            : "border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50"
                        }`}
                      >
                        GIF结果产出
                      </a>
                      <a
                        href="#stage-events"
                        className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                          openSections.events
                            ? "border-slate-300 bg-slate-100 text-slate-800"
                            : "border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        事件日志
                      </a>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    onClick={expandAllSections}
                  >
                    展开全部
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    onClick={collapseAllSections}
                  >
                    收起全部
                  </button>
                </div>
              </div>
            </div>
          </div>

          <section id="stage-ai1" className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-indigo-800">AI1（Prompt Director）</div>
              <button
                type="button"
                className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
                onClick={() => toggleSection("ai1")}
              >
                {openSections.ai1 ? "收起" : "展开"}
              </button>
            </div>
            {openSections.ai1 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="grid gap-2 text-xs text-slate-700 md:grid-cols-4">
                    <div className="rounded-xl border border-indigo-100 bg-white px-2 py-1.5">调用：{ai1Usage.calls}（成功 {ai1Usage.success}）</div>
                    <div className="rounded-xl border border-indigo-100 bg-white px-2 py-1.5">tokens：{ai1Usage.inputTokens} / {ai1Usage.outputTokens}</div>
                    <div className="rounded-xl border border-indigo-100 bg-white px-2 py-1.5">耗时：{formatDurationMs(ai1Usage.durationMs)} · 成本 {formatCurrency(ai1Usage.costUSD, "USD")}</div>
                    <div className="rounded-xl border border-indigo-100 bg-white px-2 py-1.5">
                      输入模式：{ai1InputModeRequested} → {ai1InputModeApplied}
                      <div className="text-[10px] text-slate-500">
                        来源 {ai1InputSource} · video_url {ai1SourceVideoURLAvailable ? "可用" : "不可用"} · 帧 {ai1FrameCount}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-white p-2 text-xs text-slate-700">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold text-indigo-700">AI1 输入字段总览（带中文注释）</div>
                      <div className="text-[10px] text-slate-500">来源：director_input_payload_v1</div>
                    </div>
                    <div className="max-h-72 overflow-auto rounded-lg border border-indigo-100">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-indigo-50 text-indigo-700">
                          <tr>
                            <th className="px-2 py-1.5">字段路径</th>
                            <th className="px-2 py-1.5">字段名称</th>
                            <th className="px-2 py-1.5">当前值</th>
                            <th className="px-2 py-1.5">中文注释</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-50 text-slate-700">
                          {ai1InputFieldRows.map((item) => (
                            <tr key={`ai1-input-field-${item.path}`} className="align-top">
                              <td className="px-2 py-1.5 font-mono text-[10px] text-slate-600">{item.path}</td>
                              <td className="px-2 py-1.5">{item.label}</td>
                              <td className="px-2 py-1.5">
                                <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-50 px-1.5 py-1 text-[10px] text-slate-600">
                                  {safeJSONStringify(item.value ?? null)}
                                </pre>
                              </td>
                              <td className="px-2 py-1.5 text-[10px] text-slate-600">{item.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/40 p-2">
                      <div className="text-[11px] font-semibold text-indigo-700">frame_manifest 子字段说明</div>
                      <div className="mt-1 text-[10px] text-slate-600">
                        index：采样帧序号；timestamp_sec：采样时间点（秒）；bytes：帧大小（字节）。
                      </div>
                      {ai1FrameManifestRows.length > 0 ? (
                        <div className="mt-1 max-h-32 overflow-auto rounded border border-indigo-100 bg-white">
                          <table className="w-full text-left text-[10px]">
                            <thead className="bg-indigo-50 text-indigo-700">
                              <tr>
                                <th className="px-2 py-1">index</th>
                                <th className="px-2 py-1">timestamp_sec</th>
                                <th className="px-2 py-1">bytes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-indigo-50">
                              {ai1FrameManifestRows.map((row) => (
                                <tr key={`ai1-frame-${row.index}`}>
                                  <td className="px-2 py-1">{row.index}</td>
                                  <td className="px-2 py-1">{typeof row.timestamp_sec === "number" ? row.timestamp_sec.toFixed(3) : "-"}</td>
                                  <td className="px-2 py-1">{typeof row.bytes === "number" ? Math.round(row.bytes) : "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="mt-1 text-[10px] text-slate-500">本次未使用帧输入（frame_count=0）。</div>
                      )}
                    </div>
                    <details className="mt-2 rounded-lg border border-indigo-100 bg-slate-50/60 p-2">
                      <summary className="cursor-pointer text-[11px] font-medium text-indigo-700">
                        查看 AI1 输入原始 JSON（已脱敏）
                      </summary>
                      <pre className="mt-1 max-h-44 overflow-auto whitespace-pre-wrap break-words text-[10px] text-slate-600">
                        {safeJSONStringify(ai1InputForDisplayMasked)}
                      </pre>
                    </details>
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-white p-2 text-xs text-slate-700">
                    <div className="text-[11px] text-slate-500">AI1 输出（directive）</div>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px] text-slate-600">
                      {safeJSONStringify(ai1OutputForDisplay)}
                    </pre>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="rounded-xl border border-indigo-100 bg-white p-2 text-xs text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold text-indigo-700">第一段：系统提示（固定层 / fixed）</div>
                      <div className="text-[11px] text-slate-500">
                        v{ai1FixedTemplate?.version || "-"} · {ai1FixedTemplate?.resolved_from || "built-in"}
                      </div>
                    </div>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-700">
                      {ai1FixedPromptText}
                    </pre>
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-white p-2 text-xs text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold text-indigo-700">第二段：系统提示（可编辑层 / editable）</div>
                      <div className="text-[11px] text-slate-500">
                        v{ai1EditableTemplate?.version || "-"} · enabled {String(ai1EditableTemplate?.enabled ?? false)}
                      </div>
                    </div>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-700">
                      {ai1EditablePromptText}
                    </pre>
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-white p-2 text-xs text-slate-700">
                    <div className="text-[11px] font-semibold text-indigo-700">第三段：输出契约（output contract）</div>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-700">
                      {AI1_OUTPUT_CONTRACT_TEXT}
                    </pre>
                    <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/40 px-2 py-1 text-[10px] text-slate-600">
                      {'最终补充：无论运营模板如何描述，最终返回必须是 {"directive":{...}}。'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-2 text-xs text-slate-700">
                    <div className="mb-1 text-[11px] font-semibold text-indigo-700">AI1 最终 system prompt（完整三段拼接）</div>
                    <pre className="whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-700">
                      {ai1SystemPromptAssembled}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs text-slate-500">该板块已收起</div>
            )}
          </section>

          <section id="stage-ai2" className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-blue-800">AI2（Planner）</div>
              <button
                type="button"
                className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                onClick={() => toggleSection("ai2")}
              >
                {openSections.ai2 ? "收起" : "展开"}
              </button>
            </div>
            {openSections.ai2 ? (
              <>
                <div className="mb-2 grid gap-2 text-xs text-slate-700 md:grid-cols-3">
                  <div className="rounded-xl border border-blue-100 bg-white px-2 py-1.5">调用：{ai2Usage.calls}（成功 {ai2Usage.success}）</div>
                  <div className="rounded-xl border border-blue-100 bg-white px-2 py-1.5">tokens：{ai2Usage.inputTokens} / {ai2Usage.outputTokens}</div>
                  <div className="rounded-xl border border-blue-100 bg-white px-2 py-1.5">耗时：{formatDurationMs(ai2Usage.durationMs)} · 成本 {formatCurrency(ai2Usage.costUSD, "USD")}</div>
                </div>
                <div className="mb-2 rounded-xl border border-blue-100 bg-white p-2 text-xs text-slate-700">
                  <div>
                    模板版本：{String(ai2Usage.latest?.metadata?.prompt_template_version || "-")} · 模板来源：{String(ai2Usage.latest?.metadata?.prompt_template_source || "-")}
                  </div>
                  <div className="mt-1">
                    输入摘要：target_top_n={String(ai2Usage.latest?.metadata?.target_top_n || "-")} · local_candidate_count={String(ai2Usage.latest?.metadata?.local_candidate_count || "-")} · director_applied={String(ai2Usage.latest?.metadata?.director_applied || "-")}
                  </div>
                </div>
                <div className="mb-2 rounded-xl border border-blue-100 bg-white p-2 text-xs text-slate-700">
                  <div className="text-[11px] text-slate-500">AI2 输入（payload）</div>
                  <pre className="mt-1 max-h-44 overflow-auto whitespace-pre-wrap break-words text-[11px] text-slate-600">
                    {safeJSONStringify(ai2InputForDisplay)}
                  </pre>
                </div>
                <div className="max-h-72 overflow-auto rounded-xl border border-blue-100 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-blue-50 text-blue-700">
                      <tr>
                        <th className="px-3 py-2">rank/id</th>
                        <th className="px-3 py-2">窗口</th>
                        <th className="px-3 py-2">置信度</th>
                        <th className="px-3 py-2">语义标签</th>
                        <th className="px-3 py-2">提名理由</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50 text-slate-700">
                      {detailProposals.map((item) => (
                        <tr key={`proposal-${item.id}`}>
                          <td className="px-3 py-2">#{item.proposal_rank || "-"} / {item.id}</td>
                          <td className="px-3 py-2">
                            {formatScore(item.start_sec)}s ~ {formatScore(item.end_sec)}s
                            <div className="text-[10px] text-slate-500">dur {formatScore(item.duration_sec)}s</div>
                          </td>
                          <td className="px-3 py-2">
                            base {formatScore(item.base_score)}
                            <div className="text-[10px] text-slate-500">standalone {formatScore(item.standalone_confidence)}</div>
                          </td>
                          <td className="px-3 py-2 max-w-[220px] truncate" title={(item.semantic_tags || []).join(", ")}>
                            {(item.semantic_tags || []).join(" / ") || "-"}
                          </td>
                          <td className="px-3 py-2 max-w-[320px] truncate" title={item.proposal_reason || ""}>{item.proposal_reason || "-"}</td>
                        </tr>
                      ))}
                      {!detailProposals.length ? (
                        <tr>
                          <td className="px-3 py-4 text-center text-slate-400" colSpan={5}>暂无 AI2 提名</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs text-slate-500">该板块已收起</div>
            )}
          </section>

          <section id="stage-scoring" className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-emerald-800">系统评分（Scoring）</div>
              <button
                type="button"
                className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                onClick={() => toggleSection("scoring")}
              >
                {openSections.scoring ? "收起" : "展开"}
              </button>
            </div>
            {openSections.scoring ? (
              <div className="max-h-72 overflow-auto rounded-xl border border-emerald-100 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-emerald-50 text-emerald-700">
                    <tr>
                      <th className="px-3 py-2">output/proposal</th>
                      <th className="px-3 py-2">overall</th>
                      <th className="px-3 py-2">clarity</th>
                      <th className="px-3 py-2">loop</th>
                      <th className="px-3 py-2">motion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50 text-slate-700">
                    {detailEvaluations.map((item) => (
                      <tr key={`eval-${item.id}`}>
                        <td className="px-3 py-2">output {item.output_id || "-"}<div className="text-[10px] text-slate-500">proposal {item.proposal_id || "-"}</div></td>
                        <td className="px-3 py-2">{formatScore(item.overall_score)}</td>
                        <td className="px-3 py-2">{formatScore(item.clarity_score)}</td>
                        <td className="px-3 py-2">{formatScore(item.loop_score)}</td>
                        <td className="px-3 py-2">{formatScore(item.motion_score)}</td>
                      </tr>
                    ))}
                    {!detailEvaluations.length ? (
                      <tr>
                        <td className="px-3 py-4 text-center text-slate-400" colSpan={5}>暂无评分数据</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs text-slate-500">该板块已收起</div>
            )}
          </section>

          <section id="stage-ai3" className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-amber-800">AI3（Judge）</div>
              <button
                type="button"
                className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50"
                onClick={() => toggleSection("ai3")}
              >
                {openSections.ai3 ? "收起" : "展开"}
              </button>
            </div>
            {openSections.ai3 ? (
              <>
                <div className="mb-2 grid gap-2 text-xs text-slate-700 md:grid-cols-3">
                  <div className="rounded-xl border border-amber-100 bg-white px-2 py-1.5">调用：{ai3Usage.calls}（成功 {ai3Usage.success}）</div>
                  <div className="rounded-xl border border-amber-100 bg-white px-2 py-1.5">tokens：{ai3Usage.inputTokens} / {ai3Usage.outputTokens}</div>
                  <div className="rounded-xl border border-amber-100 bg-white px-2 py-1.5">耗时：{formatDurationMs(ai3Usage.durationMs)} · 成本 {formatCurrency(ai3Usage.costUSD, "USD")}</div>
                </div>
                <div className="mb-2 rounded-xl border border-amber-100 bg-white p-2 text-xs text-slate-700">
                  <div className="text-[11px] text-slate-500">AI3 输入（payload）</div>
                  <pre className="mt-1 max-h-44 overflow-auto whitespace-pre-wrap break-words text-[11px] text-slate-600">
                    {safeJSONStringify(
                      ai3InputPayload || {
                        job_id: detail?.job?.id || 0,
                        sample_size: detailOutputs.length,
                        note: "未命中 judge_input_payload_v1，使用页面重建摘要展示。",
                      }
                    )}
                  </pre>
                </div>
                <div className="max-h-72 overflow-auto rounded-xl border border-amber-100 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-amber-50 text-amber-700">
                      <tr>
                        <th className="px-3 py-2">状态</th>
                        <th className="px-3 py-2">output/proposal</th>
                        <th className="px-3 py-2">语义分</th>
                        <th className="px-3 py-2">语义说明</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-50 text-slate-700">
                      {detailReviews.map((item) => (
                        <tr key={`review-${item.id}`}>
                          <td className="px-3 py-2">{reviewStatusLabel(item.final_recommendation)}</td>
                          <td className="px-3 py-2">output {item.output_id || "-"}<div className="text-[10px] text-slate-500">proposal {item.proposal_id || "-"}</div></td>
                          <td className="px-3 py-2">{formatScore(item.semantic_verdict)}</td>
                          <td className="px-3 py-2 max-w-[300px] truncate" title={item.diagnostic_reason || ""}>{item.diagnostic_reason || "-"}</td>
                        </tr>
                      ))}
                      {!detailReviews.length ? (
                        <tr>
                          <td className="px-3 py-4 text-center text-slate-400" colSpan={4}>暂无 AI3 复审</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-amber-100 bg-white px-3 py-2 text-xs text-slate-500">该板块已收起</div>
            )}
          </section>

          <section id="stage-output" className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-fuchsia-800">GIF结果产出</div>
              <button
                type="button"
                className="rounded-lg border border-fuchsia-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-fuchsia-700 hover:bg-fuchsia-50"
                onClick={() => toggleSection("output")}
              >
                {openSections.output ? "收起" : "展开"}
              </button>
            </div>
            {openSections.output ? (
              <>
                <div className="mb-3 max-h-72 overflow-auto rounded-xl border border-violet-100 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-violet-50 text-violet-700">
                      <tr>
                        <th className="px-3 py-2">output/proposal</th>
                        <th className="px-3 py-2">窗口</th>
                        <th className="px-3 py-2">render/upload</th>
                        <th className="px-3 py-2">评分</th>
                        <th className="px-3 py-2">AI3 判决</th>
                        <th className="px-3 py-2">文件</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-violet-50 text-slate-700">
                      {workerRows.map((row) => {
                        const meta = row.output.metadata || {};
                        return (
                          <tr key={`worker-row-${row.output.id}`}>
                            <td className="px-3 py-2">
                              output {row.output.id}
                              <div className="text-[10px] text-slate-500">proposal {row.review?.proposal_id || row.evaluation?.proposal_id || "-"}</div>
                            </td>
                            <td className="px-3 py-2">
                              {formatScore(parseNumberValue(meta.start_sec))}s ~ {formatScore(parseNumberValue(meta.end_sec))}s
                              <div className="text-[10px] text-slate-500">index {String(meta.window_index || "-")}</div>
                            </td>
                            <td className="px-3 py-2">
                              <div>render {formatDurationMs(parseNumberValue(meta.render_elapsed_ms))}</div>
                              <div className="text-[10px] text-slate-500">upload {formatDurationMs(parseNumberValue(meta.upload_elapsed_ms))}</div>
                              <div className="text-[10px] text-slate-500">attempt {String(meta.render_attempt_count || "-")}</div>
                            </td>
                            <td className="px-3 py-2">
                              overall {formatScore(row.evaluation?.overall_score)}
                              <div className="text-[10px] text-slate-500">
                                clarity {formatScore(row.evaluation?.clarity_score)} · loop {formatScore(row.evaluation?.loop_score)}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                motion {formatScore(row.evaluation?.motion_score)} · emotion {formatScore(row.evaluation?.emotion_score)}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {reviewStatusLabel(row.review?.final_recommendation)}
                              <div className="text-[10px] text-slate-500">semantic {formatScore(row.review?.semantic_verdict)}</div>
                            </td>
                            <td className="px-3 py-2">
                              <div>{row.output.width || 0}x{row.output.height || 0}</div>
                              <div className="text-[10px] text-slate-500">{formatBytes(row.output.size_bytes)}</div>
                            </td>
                          </tr>
                        );
                      })}
                      {!workerRows.length ? (
                        <tr>
                          <td className="px-3 py-4 text-center text-slate-400" colSpan={6}>暂无 Worker 产出</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {detailOutputs.map((item) => {
                    const review = reviewByOutputID.get(item.id);
                    const evalRow = evalByOutputID.get(item.id);
                    return (
                      <div key={`gif-output-${item.id}`} className="overflow-hidden rounded-xl border border-fuchsia-100 bg-white">
                        {item.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.url} alt={`gif-${item.id}`} className="h-40 w-full bg-slate-100 object-contain" />
                        ) : (
                          <div className="flex h-40 items-center justify-center bg-slate-100 text-xs text-slate-400">无预览地址</div>
                        )}
                        <div className="space-y-1 px-3 py-2 text-[11px] text-slate-700">
                          <div className="font-semibold">output #{item.id}</div>
                          <div>AI3：{reviewStatusLabel(review?.final_recommendation)}</div>
                          <div>语义分：{formatScore(review?.semantic_verdict)} · overall：{formatScore(evalRow?.overall_score)}</div>
                          <div>clarity：{formatScore(evalRow?.clarity_score)} · loop：{formatScore(evalRow?.loop_score)}</div>
                          <div className="text-slate-500">{item.width || 0}x{item.height || 0} · {formatBytes(item.size_bytes)}</div>
                          <div className="truncate text-slate-400" title={item.qiniu_key || ""}>key：{item.qiniu_key || "-"}</div>
                        </div>
                      </div>
                    );
                  })}
                  {!detailOutputs.length ? (
                    <div className="rounded-xl border border-fuchsia-100 bg-white px-3 py-8 text-center text-xs text-slate-400 md:col-span-2 xl:col-span-3">暂无 GIF 产物</div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-fuchsia-100 bg-white px-3 py-2 text-xs text-slate-500">该板块已收起</div>
            )}
          </section>

          <section id="stage-events" className="rounded-2xl border border-slate-100 bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">阶段事件日志</div>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => toggleSection("events")}
              >
                {openSections.events ? "收起" : "展开"}
              </button>
            </div>
            {openSections.events ? (
              <div className="max-h-56 overflow-auto rounded-xl border border-slate-100">
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
                      <tr key={`event-${event.id}`}>
                        <td className="px-3 py-2 whitespace-nowrap">{formatTime(event.created_at)}</td>
                        <td className="px-3 py-2">{event.stage || "-"}</td>
                        <td className="px-3 py-2">{event.level || "-"}</td>
                        <td className="px-3 py-2">{event.message || "-"}</td>
                      </tr>
                    ))}
                    {!(detail.events || []).length ? (
                      <tr>
                        <td className="px-3 py-4 text-center text-slate-400" colSpan={4}>暂无事件日志</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">该板块已收起</div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
