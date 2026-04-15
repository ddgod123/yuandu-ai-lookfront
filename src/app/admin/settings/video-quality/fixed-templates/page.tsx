"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PromptSourceBadge from "@/app/admin/_components/PromptSourceBadge";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type PromptTemplateFormat = "all" | "gif" | "webp" | "jpg" | "png" | "live";
type PromptTemplateStage = "ai1" | "ai2" | "scoring" | "ai3" | "default";

type AdminVideoAIPromptTemplateItem = {
  id: number;
  format: PromptTemplateFormat | string;
  stage: PromptTemplateStage | string;
  layer: "fixed" | "editable" | string;
  template_text: string;
  template_json_schema?: Record<string, unknown>;
  enabled: boolean;
  version: string;
  is_active: boolean;
  resolved_from?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

type AdminVideoAIPromptFixedTemplateListResponse = {
  format?: string;
  stage?: string;
  items?: AdminVideoAIPromptTemplateItem[];
};

type AdminVideoAIPromptFixedTemplateDetailResponse = {
  item?: AdminVideoAIPromptTemplateItem;
};

type AdminVideoAIPromptFixedTemplateMutationResponse = {
  item?: AdminVideoAIPromptTemplateItem;
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

const FORMAT_OPTIONS: Array<{ value: "" | PromptTemplateFormat; label: string }> = [
  { value: "", label: "全部作用域" },
  { value: "all", label: "ALL" },
  { value: "gif", label: "GIF" },
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
  { value: "webp", label: "WebP" },
  { value: "live", label: "Live" },
];

const STAGE_OPTIONS: Array<{ value: "" | PromptTemplateStage; label: string }> = [
  { value: "", label: "全部阶段" },
  { value: "ai1", label: "AI1" },
  { value: "ai2", label: "AI2" },
  { value: "scoring", label: "评分系统" },
  { value: "ai3", label: "AI3" },
  { value: "default", label: "Default" },
];

const ACTIVE_OPTIONS: Array<{ value: "all" | "true" | "false"; label: string }> = [
  { value: "all", label: "全部状态" },
  { value: "true", label: "仅当前生效" },
  { value: "false", label: "仅历史版本" },
];

const STAGE_LABEL: Record<string, string> = {
  ai1: "AI1",
  ai2: "AI2",
  scoring: "评分系统",
  ai3: "AI3",
  default: "DEFAULT",
};

const ALL_FORMATS: PromptTemplateFormat[] = ["all", "gif", "webp", "jpg", "png", "live"];
const ALL_STAGES: PromptTemplateStage[] = ["ai1", "ai2", "scoring", "ai3", "default"];

function normalizeFormatFilter(value: string | null): "" | PromptTemplateFormat {
  const lower = (value || "").trim().toLowerCase();
  if (lower === "all" || lower === "gif" || lower === "webp" || lower === "jpg" || lower === "png" || lower === "live") {
    return lower;
  }
  return "";
}

function normalizeStageFilter(value: string | null): "" | PromptTemplateStage {
  const lower = (value || "").trim().toLowerCase();
  if (lower === "ai1" || lower === "ai2" || lower === "scoring" || lower === "ai3" || lower === "default") return lower;
  return "";
}

function normalizeActiveFilter(value: string | null): "all" | "true" | "false" {
  const lower = (value || "").trim().toLowerCase();
  if (lower === "true" || lower === "false") return lower;
  return "all";
}

function formatTime(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("zh-CN");
}

function resolveTemplateSource(item: AdminVideoAIPromptTemplateItem) {
  const direct = String(item.resolved_from || "").trim();
  if (direct) return direct.toLowerCase();
  const legacy = String((item.metadata?.resolved_from as string) || "").trim();
  if (legacy) return legacy.toLowerCase();
  return "";
}

async function parseApiError(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) {
    return { message: fallback, validationIssues: [] as APIValidationIssue[] };
  }
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
    return { message: text, validationIssues: [] as APIValidationIssue[] };
  }
}

async function buildRequestError(response: Response, fallback: string) {
  const parsed = await parseApiError(response, fallback);
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

function parseJSONObjectInput(raw: string, fieldName: string) {
  const text = raw.trim();
  if (!text) return { ok: true as const, value: {} as Record<string, unknown> };
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false as const, error: `${fieldName} 必须是 JSON 对象。` };
    }
    return { ok: true as const, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false as const, error: `${fieldName} 不是合法 JSON。` };
  }
}

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFormat = useMemo(() => normalizeFormatFilter(searchParams.get("format")), [searchParams]);
  const initialStage = useMemo(() => normalizeStageFilter(searchParams.get("stage")), [searchParams]);
  const initialActive = useMemo(() => normalizeActiveFilter(searchParams.get("active_only")), [searchParams]);

  const [formatFilter, setFormatFilter] = useState<"" | PromptTemplateFormat>(initialFormat);
  const [stageFilter, setStageFilter] = useState<"" | PromptTemplateStage>(initialStage);
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">(initialActive);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AdminVideoAIPromptTemplateItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<APIValidationIssue[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [fixedCRUDAPIReady, setFixedCRUDAPIReady] = useState(true);
  const [listTip, setListTip] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createFormat, setCreateFormat] = useState<PromptTemplateFormat>(initialFormat || "all");
  const [createStage, setCreateStage] = useState<PromptTemplateStage>(initialStage || "ai1");
  const [createVersion, setCreateVersion] = useState("");
  const [createEnabled, setCreateEnabled] = useState(true);
  const [createActivate, setCreateActivate] = useState(true);
  const [createTemplateText, setCreateTemplateText] = useState("");
  const [createSchemaJSON, setCreateSchemaJSON] = useState("{}");
  const [createMetadataJSON, setCreateMetadataJSON] = useState("{}");
  const [createReason, setCreateReason] = useState("admin_fixed_template_create");

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editID, setEditID] = useState<number>(0);
  const [editVersion, setEditVersion] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);
  const [editActivate, setEditActivate] = useState(false);
  const [editTemplateText, setEditTemplateText] = useState("");
  const [editSchemaJSON, setEditSchemaJSON] = useState("{}");
  const [editMetadataJSON, setEditMetadataJSON] = useState("{}");
  const [editReason, setEditReason] = useState("admin_fixed_template_update");
  const createVersionRef = useRef<HTMLInputElement | null>(null);
  const createTemplateTextRef = useRef<HTMLTextAreaElement | null>(null);
  const createSchemaRef = useRef<HTMLTextAreaElement | null>(null);
  const createMetadataRef = useRef<HTMLTextAreaElement | null>(null);
  const editVersionRef = useRef<HTMLInputElement | null>(null);
  const editTemplateTextRef = useRef<HTMLTextAreaElement | null>(null);
  const editSchemaRef = useRef<HTMLTextAreaElement | null>(null);
  const editMetadataRef = useRef<HTMLTextAreaElement | null>(null);

  const hasIssueFor = useCallback(
    (matcher: (issue: APIValidationIssue) => boolean) => validationIssues.some((issue) => matcher(issue)),
    [validationIssues]
  );
  const hasVersionIssue = hasIssueFor((issue) => (issue.field_path || "").toLowerCase().includes("version"));
  const hasTemplateTextIssue = hasIssueFor((issue) => (issue.field_path || "").toLowerCase().includes("template_text"));
  const hasSchemaIssue = hasIssueFor((issue) => {
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
  const hasMetadataIssue = hasIssueFor((issue) => (issue.field_path || "").toLowerCase().includes("metadata"));

  const activeCount = useMemo(() => items.filter((item) => !!item.is_active).length, [items]);
  const totalCount = items.length;

  const focusElement = useCallback((node: HTMLElement | null) => {
    if (!node) return false;
    node.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    node.focus();
    return true;
  }, []);

  const focusValidationIssue = useCallback(
    (issue: APIValidationIssue) => {
      const path = (issue.field_path || "").toLowerCase();
      const inEdit = editOpen && !editLoading;
      const refs = inEdit
        ? {
            version: editVersionRef.current,
            templateText: editTemplateTextRef.current,
            schema: editSchemaRef.current,
            metadata: editMetadataRef.current,
          }
        : {
            version: createVersionRef.current,
            templateText: createTemplateTextRef.current,
            schema: createSchemaRef.current,
            metadata: createMetadataRef.current,
          };

      if (path.includes("template_text")) {
        focusElement(refs.templateText);
        return;
      }
      if (
        path.includes("template_json_schema") ||
        path.includes("scene_strategies") ||
        path.includes("quality_weights") ||
        path.includes("candidate_count_bias") ||
        path.includes("technical_reject") ||
        path.includes("must_capture_bias") ||
        path.includes("avoid_bias") ||
        path.includes("risk_flags")
      ) {
        focusElement(refs.schema);
        return;
      }
      if (path.includes("metadata")) {
        focusElement(refs.metadata);
        return;
      }
      if (path.includes("version")) {
        focusElement(refs.version);
      }
    },
    [editLoading, editOpen, focusElement]
  );

  const syncFiltersToURL = useCallback(
    (nextFormat: "" | PromptTemplateFormat, nextStage: "" | PromptTemplateStage, nextActive: "all" | "true" | "false") => {
      const params = new URLSearchParams();
      if (nextFormat) params.set("format", nextFormat);
      if (nextStage) params.set("stage", nextStage);
      if (nextActive !== "all") params.set("active_only", nextActive);
      const query = params.toString();
      router.replace(query ? `/admin/settings/video-quality/fixed-templates?${query}` : "/admin/settings/video-quality/fixed-templates");
    },
    [router]
  );

  const loadLegacyFixedTemplateVersions = useCallback(async () => {
    const formats = formatFilter ? [formatFilter] : ALL_FORMATS;
    const stages = stageFilter ? [stageFilter] : ALL_STAGES;
    const tasks: Array<Promise<AdminVideoAIPromptTemplateItem[]>> = [];

    for (const stage of stages) {
      for (const format of formats) {
        tasks.push(
          (async () => {
            const params = new URLSearchParams();
            params.set("format", format);
            params.set("stage", stage);
            params.set("layer", "fixed");
            const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates/versions?${params.toString()}`);
            if (!res.ok) return [];
            const data = (await res.json()) as AdminVideoAIPromptTemplateVersionsResponse;
            const versions = Array.isArray(data.items) ? data.items : [];
            return versions.map((item) => ({
              id: item.id,
              format: (item.format || format || "all").toLowerCase(),
              stage: (item.stage || stage).toLowerCase(),
              layer: "fixed",
              template_text: "",
              template_json_schema: {},
              enabled: !!item.enabled,
              version: (item.version || "").trim(),
              is_active: !!item.is_active,
              resolved_from: (data.resolved_from || "").toLowerCase(),
              metadata: {
                source: "legacy_versions_api",
                legacy_no_detail: true,
                resolved_from: data.resolved_from || "",
              },
              created_at: item.created_at || "",
              updated_at: item.updated_at || "",
            }));
          })()
        );
      }
    }

    const nested = await Promise.all(tasks);
    const merged = nested.flat();
    const dedup = new Map<number, AdminVideoAIPromptTemplateItem>();
    for (const item of merged) {
      if (!item.id) continue;
      if (!dedup.has(item.id)) dedup.set(item.id, item);
    }
    const rows = Array.from(dedup.values());
    const filtered = rows.filter((item) => {
      if (activeFilter === "all") return true;
      return activeFilter === "true" ? !!item.is_active : !item.is_active;
    });
    filtered.sort((a, b) => {
      const stageA = String(a.stage || "");
      const stageB = String(b.stage || "");
      if (stageA !== stageB) return stageA.localeCompare(stageB);
      const formatA = String(a.format || "");
      const formatB = String(b.format || "");
      if (formatA !== formatB) return formatA.localeCompare(formatB);
      return Number(b.id || 0) - Number(a.id || 0);
    });
    const hasFallbackFromAll = filtered.some((item) => {
      const resolvedFrom = resolveTemplateSource(item);
      return resolvedFrom === "all" || resolvedFrom.startsWith("all/");
    });
    return { items: filtered, hasFallbackFromAll };
  }, [activeFilter, formatFilter, stageFilter]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    setValidationIssues([]);
    setListTip(null);
    try {
      const params = new URLSearchParams();
      if (formatFilter) params.set("format", formatFilter);
      if (stageFilter) params.set("stage", stageFilter);
      if (activeFilter !== "all") params.set("active_only", activeFilter);
      params.set("limit", "1200");
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates/fixed?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 404) {
          const legacyResult = await loadLegacyFixedTemplateVersions();
          setItems(legacyResult.items);
          setFixedCRUDAPIReady(false);
          setListTip("当前后端仍为旧版本：已兼容展示版本列表（基于生效版本查询）。");
          setError(null);
          return;
        }
        throw await buildRequestError(res, "加载固定模板列表失败");
      }
      const data = (await res.json()) as AdminVideoAIPromptFixedTemplateListResponse;
      const list = Array.isArray(data.items) ? data.items : [];
      if (list.length === 0 && !!formatFilter) {
        const legacyResult = await loadLegacyFixedTemplateVersions();
        if (legacyResult.items.length > 0) {
          setItems(legacyResult.items);
          if (legacyResult.hasFallbackFromAll) {
            setListTip(`当前 ${formatFilter.toUpperCase()} 未配置专属 fixed 模板，已展示 all 回退生效版本。`);
          }
        } else {
          setItems([]);
        }
      } else {
        setItems(list);
      }
      setFixedCRUDAPIReady(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载固定模板列表失败";
      setError(message);
      setValidationIssues(extractValidationIssues(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, formatFilter, loadLegacyFixedTemplateVersions, stageFilter]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const resetCreateForm = () => {
    setCreateFormat(formatFilter || "all");
    setCreateStage(stageFilter || "ai1");
    setCreateVersion("");
    setCreateEnabled(true);
    setCreateActivate(true);
    setCreateTemplateText("");
    setCreateSchemaJSON("{}");
    setCreateMetadataJSON("{}");
    setCreateReason("admin_fixed_template_create");
  };

  const openCreateModal = () => {
    if (!fixedCRUDAPIReady) {
      setError("当前后端尚未上线 fixed CRUD 接口，暂仅支持列表查看与版本激活。");
      return;
    }
    resetCreateForm();
    setError(null);
    setValidationIssues([]);
    setSuccess(null);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    const schemaParsed = parseJSONObjectInput(createSchemaJSON, "template_json_schema");
    if (!schemaParsed.ok) {
      setError(schemaParsed.error);
      setValidationIssues([{ field_path: "template_json_schema", code: "invalid_json", message: schemaParsed.error }]);
      return;
    }
    const metadataParsed = parseJSONObjectInput(createMetadataJSON, "metadata");
    if (!metadataParsed.ok) {
      setError(metadataParsed.error);
      setValidationIssues([{ field_path: "metadata", code: "invalid_json", message: metadataParsed.error }]);
      return;
    }
    setCreateSaving(true);
    setError(null);
    setValidationIssues([]);
    setSuccess(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates/fixed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: createFormat,
          stage: createStage,
          version: createVersion.trim(),
          enabled: createEnabled,
          activate: createActivate,
          template_text: createTemplateText,
          template_json_schema: schemaParsed.value,
          metadata: metadataParsed.value,
          reason: createReason.trim(),
        }),
      });
      if (!res.ok) throw await buildRequestError(res, "新建固定模板失败");
      const data = (await res.json()) as AdminVideoAIPromptFixedTemplateMutationResponse;
      const created = data.item;
      setCreateOpen(false);
      setSuccess(`已新建固定模板版本：${created?.version || "未命名版本"}`);
      setValidationIssues([]);
      await loadItems();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "新建固定模板失败";
      setError(message);
      setValidationIssues(extractValidationIssues(err));
    } finally {
      setCreateSaving(false);
    }
  };

  const openEditModal = async (id: number) => {
    if (!id) return;
    if (!fixedCRUDAPIReady) {
      setError("当前后端尚未上线 fixed CRUD 接口，暂仅支持列表查看与版本激活。");
      return;
    }
    setEditOpen(true);
    setEditLoading(true);
    setEditID(id);
    setError(null);
    setValidationIssues([]);
    setSuccess(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates/fixed/${id}`);
      if (!res.ok) throw await buildRequestError(res, "加载模板详情失败");
      const data = (await res.json()) as AdminVideoAIPromptFixedTemplateDetailResponse;
      const item = data.item;
      if (!item) throw new Error("模板详情为空");
      setEditVersion((item.version || "").trim());
      setEditEnabled(!!item.enabled);
      setEditActivate(false);
      setEditTemplateText(item.template_text || "");
      setEditSchemaJSON(JSON.stringify(item.template_json_schema || {}, null, 2));
      setEditMetadataJSON(JSON.stringify(item.metadata || {}, null, 2));
      setEditReason("admin_fixed_template_update");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载模板详情失败";
      setError(message);
      setValidationIssues(extractValidationIssues(err));
      setEditOpen(false);
    } finally {
      setEditLoading(false);
    }
  };

  const submitEdit = async () => {
    if (!editID) return;
    const schemaParsed = parseJSONObjectInput(editSchemaJSON, "template_json_schema");
    if (!schemaParsed.ok) {
      setError(schemaParsed.error);
      setValidationIssues([{ field_path: "template_json_schema", code: "invalid_json", message: schemaParsed.error }]);
      return;
    }
    const metadataParsed = parseJSONObjectInput(editMetadataJSON, "metadata");
    if (!metadataParsed.ok) {
      setError(metadataParsed.error);
      setValidationIssues([{ field_path: "metadata", code: "invalid_json", message: metadataParsed.error }]);
      return;
    }
    setEditSaving(true);
    setError(null);
    setValidationIssues([]);
    setSuccess(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates/fixed/${editID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: editVersion.trim(),
          enabled: editEnabled,
          activate: editActivate,
          template_text: editTemplateText,
          template_json_schema: schemaParsed.value,
          metadata: metadataParsed.value,
          reason: editReason.trim(),
        }),
      });
      if (!res.ok) throw await buildRequestError(res, "更新固定模板失败");
      const data = (await res.json()) as AdminVideoAIPromptFixedTemplateMutationResponse;
      setEditOpen(false);
      setSuccess(`已更新固定模板：${data.item?.version || `ID ${editID}`}`);
      setValidationIssues([]);
      await loadItems();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "更新固定模板失败";
      setError(message);
      setValidationIssues(extractValidationIssues(err));
    } finally {
      setEditSaving(false);
    }
  };

  const activateVersion = async (item: AdminVideoAIPromptTemplateItem) => {
    if (!item.id) return;
    setError(null);
    setValidationIssues([]);
    setSuccess(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: item.format,
          stage: item.stage,
          layer: "fixed",
          template_id: item.id,
          reason: "admin_activate_from_fixed_template_list",
        }),
      });
      if (!res.ok) throw await buildRequestError(res, "切换版本失败");
      setSuccess(`已切换为版本：${item.version || `ID ${item.id}`}`);
      setValidationIssues([]);
      await loadItems();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "切换版本失败";
      setError(message);
      setValidationIssues(extractValidationIssues(err));
    }
  };

  const deleteVersion = async (item: AdminVideoAIPromptTemplateItem) => {
    if (!item.id) return;
    if (!fixedCRUDAPIReady) {
      setError("当前后端尚未上线 fixed CRUD 接口，暂不支持删除。");
      return;
    }
    const confirmed = window.confirm(`确认删除版本「${item.version || `ID ${item.id}`}」？此操作不可恢复。`);
    if (!confirmed) return;
    const reason = window.prompt("请输入删除原因（可选）", "admin_fixed_template_delete") || "";
    setError(null);
    setValidationIssues([]);
    setSuccess(null);
    try {
      const url = `${API_BASE}/api/admin/video-jobs/ai-prompt-templates/fixed/${item.id}?reason=${encodeURIComponent(reason)}`;
      const res = await fetchWithAuth(url, { method: "DELETE" });
      if (!res.ok) throw await buildRequestError(res, "删除固定模板失败");
      setSuccess(`已删除版本：${item.version || `ID ${item.id}`}`);
      setValidationIssues([]);
      await loadItems();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "删除固定模板失败";
      setError(message);
      setValidationIssues(extractValidationIssues(err));
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="固定模板版本列表"
        description="维护 AI1/AI2/评分/AI3 的 fixed 层模板版本，支持新增、编辑、删除、激活，以及跳转版本详情。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!fixedCRUDAPIReady}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              新建固定模板版本
            </button>
            <Link
              href="/admin/settings/video-quality"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              返回质量页
            </Link>
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">作用域</span>
            <select
              value={formatFilter}
              onChange={(e) => {
                const next = normalizeFormatFilter(e.target.value);
                setFormatFilter(next);
                syncFiltersToURL(next, stageFilter, activeFilter);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
            >
              {FORMAT_OPTIONS.map((item) => (
                <option key={item.value || "all-option"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">阶段</span>
            <select
              value={stageFilter}
              onChange={(e) => {
                const next = normalizeStageFilter(e.target.value);
                setStageFilter(next);
                syncFiltersToURL(formatFilter, next, activeFilter);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
            >
              {STAGE_OPTIONS.map((item) => (
                <option key={item.value || "all-option"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">生效状态</span>
            <select
              value={activeFilter}
              onChange={(e) => {
                const next = normalizeActiveFilter(e.target.value);
                setActiveFilter(next);
                syncFiltersToURL(formatFilter, stageFilter, next);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
            >
              {ACTIVE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadItems()}
              className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              刷新列表
            </button>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          总计 {totalCount} 条 · 当前生效版本 {activeCount} 条
        </div>
      </div>

      {!fixedCRUDAPIReady ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          检测到后端仍为旧版本（/fixed 接口未上线）：当前页面已自动降级为兼容模式（可看列表、可激活版本；新增/编辑/删除/详情需后端升级后可用）。
        </div>
      ) : null}
      {listTip ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">{listTip}</div>
      ) : null}

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {validationIssues.length > 0 ? (
        <div className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-xs text-rose-700">
          <div className="mb-2 font-semibold">字段校验详情</div>
          <ul className="space-y-1">
            {validationIssues.map((issue, idx) => (
              <li key={`${issue.field_path || "field"}-${issue.code || "code"}-${idx}`} className="break-all">
                <button
                  type="button"
                  onClick={() => focusValidationIssue(issue)}
                  className="w-full text-left underline decoration-dotted underline-offset-2 hover:text-rose-800"
                >
                  • {normalizeIssueMessage(issue)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">阶段</th>
              <th className="px-3 py-2">作用域</th>
              <th className="px-3 py-2">版本</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2">更新时间</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  列表加载中...
                </td>
              </tr>
            ) : null}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  暂无数据
                </td>
              </tr>
            ) : null}
            {!loading
              ? items.map((item) => {
                  const stageKey = (item.stage || "").toLowerCase();
                  return (
                    <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                      <td className="px-3 py-2 text-xs text-slate-600">{item.id}</td>
                      <td className="px-3 py-2 text-xs text-slate-600">{STAGE_LABEL[stageKey] || (item.stage || "-").toUpperCase()}</td>
                      <td className="px-3 py-2 text-xs text-slate-600">{(item.format || "-").toUpperCase()}</td>
                      <td className="px-3 py-2 text-xs text-slate-900">
                        <span className="font-semibold">{item.version || `v-${item.id}`}</span>
                        <span className="ml-2 text-slate-500">enabled={item.enabled ? "1" : "0"}</span>
                        <div className="mt-1">
                          <PromptSourceBadge
                            value={resolveTemplateSource(item)}
                            expectedFormat={String(item.format || "").toLowerCase()}
                            expectedStage={String(item.stage || "").toLowerCase()}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={
                            item.is_active
                              ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700"
                              : "rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 font-semibold text-slate-600"
                          }
                        >
                          {item.is_active ? "当前生效" : "历史"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{formatTime(item.updated_at)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              fixedCRUDAPIReady
                                ? router.push(`/admin/settings/video-quality/fixed-templates/${item.id}`)
                                : setError("当前后端尚未上线 fixed 详情接口。")
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            详情
                          </button>
                          <button
                            type="button"
                            onClick={() => void openEditModal(item.id)}
                            disabled={!fixedCRUDAPIReady}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => void activateVersion(item)}
                            disabled={item.is_active}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            设为当前
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteVersion(item)}
                            disabled={!fixedCRUDAPIReady}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">新建固定模板版本</h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                关闭
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-xs text-slate-500">
                <span>作用域</span>
                <select
                  value={createFormat}
                  onChange={(e) => setCreateFormat(normalizeFormatFilter(e.target.value) || "all")}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
                >
                  {FORMAT_OPTIONS.filter((item) => !!item.value).map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-slate-500">
                <span>阶段</span>
                <select
                  value={createStage}
                  onChange={(e) => setCreateStage(normalizeStageFilter(e.target.value) || "ai1")}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
                >
                  {STAGE_OPTIONS.filter((item) => !!item.value).map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-slate-500">
                <span>版本（可空，默认自动补位）</span>
                <input
                  ref={createVersionRef}
                  value={createVersion}
                  onChange={(e) => setCreateVersion(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-sm text-slate-700 outline-none ${
                    hasVersionIssue ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
                  }`}
                  placeholder="v1 / v2 / v20260402"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-500">
                <span>变更原因</span>
                <input
                  value={createReason}
                  onChange={(e) => setCreateReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600">
                <input type="checkbox" checked={createEnabled} onChange={(e) => setCreateEnabled(e.target.checked)} />
                enabled = true
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600">
                <input type="checkbox" checked={createActivate} onChange={(e) => setCreateActivate(e.target.checked)} />
                创建后直接设为当前版本
              </label>
            </div>

            <label className="mt-3 block space-y-1 text-xs text-slate-500">
              <span>模板正文</span>
              <textarea
                ref={createTemplateTextRef}
                value={createTemplateText}
                onChange={(e) => setCreateTemplateText(e.target.value)}
                rows={10}
                className={`w-full rounded-xl border px-3 py-2 font-mono text-xs leading-6 text-slate-700 outline-none ${
                  hasTemplateTextIssue ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
                }`}
              />
            </label>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-xs text-slate-500">
                <span>template_json_schema（JSON 对象）</span>
                <textarea
                  ref={createSchemaRef}
                  value={createSchemaJSON}
                  onChange={(e) => setCreateSchemaJSON(e.target.value)}
                  rows={8}
                  className={`w-full rounded-xl border px-3 py-2 font-mono text-xs leading-6 text-slate-700 outline-none ${
                    hasSchemaIssue ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
                  }`}
                />
              </label>
              <label className="space-y-1 text-xs text-slate-500">
                <span>metadata（JSON 对象）</span>
                <textarea
                  ref={createMetadataRef}
                  value={createMetadataJSON}
                  onChange={(e) => setCreateMetadataJSON(e.target.value)}
                  rows={8}
                  className={`w-full rounded-xl border px-3 py-2 font-mono text-xs leading-6 text-slate-700 outline-none ${
                    hasMetadataIssue ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
                  }`}
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={createSaving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {createSaving ? "创建中..." : "创建版本"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">编辑固定模板版本 #{editID}</h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                关闭
              </button>
            </div>

            {editLoading ? <div className="text-sm text-slate-500">详情加载中...</div> : null}
            {!editLoading ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-xs text-slate-500">
                    <span>版本</span>
                    <input
                      ref={editVersionRef}
                      value={editVersion}
                      onChange={(e) => setEditVersion(e.target.value)}
                      className={`w-full rounded-xl border px-3 py-2 text-sm text-slate-700 outline-none ${
                        hasVersionIssue ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
                      }`}
                    />
                  </label>
                  <label className="space-y-1 text-xs text-slate-500">
                    <span>变更原因</span>
                    <input
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
                    />
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600">
                    <input type="checkbox" checked={editEnabled} onChange={(e) => setEditEnabled(e.target.checked)} />
                    enabled = true
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600">
                    <input type="checkbox" checked={editActivate} onChange={(e) => setEditActivate(e.target.checked)} />
                    更新后设为当前版本
                  </label>
                </div>
                <label className="mt-3 block space-y-1 text-xs text-slate-500">
                  <span>模板正文</span>
                  <textarea
                    ref={editTemplateTextRef}
                    value={editTemplateText}
                    onChange={(e) => setEditTemplateText(e.target.value)}
                    rows={10}
                    className={`w-full rounded-xl border px-3 py-2 font-mono text-xs leading-6 text-slate-700 outline-none ${
                      hasTemplateTextIssue ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
                    }`}
                  />
                </label>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-xs text-slate-500">
                    <span>template_json_schema（JSON 对象）</span>
                    <textarea
                      ref={editSchemaRef}
                      value={editSchemaJSON}
                      onChange={(e) => setEditSchemaJSON(e.target.value)}
                      rows={8}
                      className={`w-full rounded-xl border px-3 py-2 font-mono text-xs leading-6 text-slate-700 outline-none ${
                        hasSchemaIssue ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
                      }`}
                    />
                  </label>
                  <label className="space-y-1 text-xs text-slate-500">
                    <span>metadata（JSON 对象）</span>
                    <textarea
                      ref={editMetadataRef}
                      value={editMetadataJSON}
                      onChange={(e) => setEditMetadataJSON(e.target.value)}
                      rows={8}
                      className={`w-full rounded-xl border px-3 py-2 font-mono text-xs leading-6 text-slate-700 outline-none ${
                        hasMetadataIssue ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
                      }`}
                    />
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitEdit()}
                    disabled={editSaving}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {editSaving ? "保存中..." : "保存修改"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
