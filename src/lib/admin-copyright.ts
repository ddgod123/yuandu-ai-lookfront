"use client";

import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

export type CopyrightCollection = {
  collectionId: number;
  collectionName: string;
  coverUrl?: string;
  imageCount: number;
  sourceChannel?: string;
  latestTaskId?: number;
  latestRunMode?: string;
  latestMachineConclusion?: string;
  latestRiskLevel?: string;
  reviewStatus?: string;
  updatedAt?: string;
};

export type CopyrightTask = {
  id: number;
  task_no: string;
  collection_id: number;
  run_mode: string;
  sample_strategy: string;
  sample_count: number;
  actual_sample_count: number;
  enable_tagging: boolean;
  overwrite_machine_tags: boolean;
  status: string;
  progress: number;
  high_risk_count: number;
  unknown_source_count: number;
  ip_hit_count: number;
  machine_conclusion: string;
  result_summary: string;
  created_at: string;
  updated_at: string;
};

export type ImageCopyrightResult = {
  id: number;
  task_id: number;
  collection_id: number;
  emoji_id: number;
  copyright_owner_guess?: string;
  owner_type?: string;
  is_commercial_ip: boolean;
  ip_name?: string;
  is_brand_related: boolean;
  brand_name?: string;
  rights_status?: string;
  commercial_use_advice?: string;
  risk_level?: string;
  risk_score?: number;
  model_confidence?: number;
  machine_summary?: string;
  created_at: string;
  updated_at: string;
};

export type CopyrightReviewRecord = {
  id: number;
  collection_id: number;
  emoji_id?: number | null;
  task_id?: number | null;
  review_type: string;
  review_status: string;
  review_result: string;
  review_comment: string;
  reviewer_id: number;
  created_at: string;
  updated_at: string;
};

export type TagDimension = {
  id: number;
  dimension_code: string;
  dimension_name: string;
  sort_no: number;
  status: number;
};

export type TagDefinition = {
  id: number;
  tag_code: string;
  tag_name: string;
  dimension_code: string;
  tag_level: "image" | "collection" | "both";
  is_system: boolean;
  sort_no: number;
  status: number;
  remark?: string;
  created_at: string;
  updated_at: string;
};

type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};

function getv<T = unknown>(obj: Record<string, unknown> | null | undefined, ...keys: string[]): T | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return obj[key] as T;
    }
  }
  return undefined;
}

async function parseJSON<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return (await res.json()) as T;
}

function normalizeTask(raw: Record<string, unknown>): CopyrightTask {
  return {
    id: Number(getv(raw, "id", "ID") || 0),
    task_no: String(getv(raw, "task_no", "TaskNo") || ""),
    collection_id: Number(getv(raw, "collection_id", "CollectionID") || 0),
    run_mode: String(getv(raw, "run_mode", "RunMode") || ""),
    sample_strategy: String(getv(raw, "sample_strategy", "SampleStrategy") || ""),
    sample_count: Number(getv(raw, "sample_count", "SampleCount") || 0),
    actual_sample_count: Number(getv(raw, "actual_sample_count", "ActualSampleCount") || 0),
    enable_tagging: Boolean(getv(raw, "enable_tagging", "EnableTagging")),
    overwrite_machine_tags: Boolean(getv(raw, "overwrite_machine_tags", "OverwriteMachineTags")),
    status: String(getv(raw, "status", "Status") || ""),
    progress: Number(getv(raw, "progress", "Progress") || 0),
    high_risk_count: Number(getv(raw, "high_risk_count", "HighRiskCount") || 0),
    unknown_source_count: Number(getv(raw, "unknown_source_count", "UnknownSourceCount") || 0),
    ip_hit_count: Number(getv(raw, "ip_hit_count", "IPHitCount") || 0),
    machine_conclusion: String(getv(raw, "machine_conclusion", "MachineConclusion") || ""),
    result_summary: String(getv(raw, "result_summary", "ResultSummary") || ""),
    created_at: String(getv(raw, "created_at", "CreatedAt") || ""),
    updated_at: String(getv(raw, "updated_at", "UpdatedAt") || ""),
  };
}

function normalizeImage(raw: Record<string, unknown>): ImageCopyrightResult {
  return {
    id: Number(getv(raw, "id", "ID") || 0),
    task_id: Number(getv(raw, "task_id", "TaskID") || 0),
    collection_id: Number(getv(raw, "collection_id", "CollectionID") || 0),
    emoji_id: Number(getv(raw, "emoji_id", "EmojiID") || 0),
    copyright_owner_guess: String(getv(raw, "copyright_owner_guess", "CopyrightOwnerGuess") || ""),
    owner_type: String(getv(raw, "owner_type", "OwnerType") || ""),
    is_commercial_ip: Boolean(getv(raw, "is_commercial_ip", "IsCommercialIP")),
    ip_name: String(getv(raw, "ip_name", "IPName") || ""),
    is_brand_related: Boolean(getv(raw, "is_brand_related", "IsBrandRelated")),
    brand_name: String(getv(raw, "brand_name", "BrandName") || ""),
    rights_status: String(getv(raw, "rights_status", "RightsStatus") || ""),
    commercial_use_advice: String(getv(raw, "commercial_use_advice", "CommercialUseAdvice") || ""),
    risk_level: String(getv(raw, "risk_level", "RiskLevel") || ""),
    risk_score: Number(getv(raw, "risk_score", "RiskScore") || 0),
    model_confidence: Number(getv(raw, "model_confidence", "ModelConfidence") || 0),
    machine_summary: String(getv(raw, "machine_summary", "MachineSummary") || ""),
    created_at: String(getv(raw, "created_at", "CreatedAt") || ""),
    updated_at: String(getv(raw, "updated_at", "UpdatedAt") || ""),
  };
}

function normalizeReview(raw: Record<string, unknown>): CopyrightReviewRecord {
  return {
    id: Number(getv(raw, "id", "ID") || 0),
    collection_id: Number(getv(raw, "collection_id", "CollectionID") || 0),
    emoji_id: Number(getv(raw, "emoji_id", "EmojiID") || 0) || null,
    task_id: Number(getv(raw, "task_id", "TaskID") || 0) || null,
    review_type: String(getv(raw, "review_type", "ReviewType") || ""),
    review_status: String(getv(raw, "review_status", "ReviewStatus") || ""),
    review_result: String(getv(raw, "review_result", "ReviewResult") || ""),
    review_comment: String(getv(raw, "review_comment", "ReviewComment") || ""),
    reviewer_id: Number(getv(raw, "reviewer_id", "ReviewerID") || 0),
    created_at: String(getv(raw, "created_at", "CreatedAt") || ""),
    updated_at: String(getv(raw, "updated_at", "UpdatedAt") || ""),
  };
}

function normalizeTagDimension(raw: Record<string, unknown>): TagDimension {
  return {
    id: Number(getv(raw, "id", "ID") || 0),
    dimension_code: String(getv(raw, "dimension_code", "DimensionCode") || ""),
    dimension_name: String(getv(raw, "dimension_name", "DimensionName") || ""),
    sort_no: Number(getv(raw, "sort_no", "SortNo") || 0),
    status: Number(getv(raw, "status", "Status") || 0),
  };
}

function normalizeTagDefinition(raw: Record<string, unknown>): TagDefinition {
  return {
    id: Number(getv(raw, "id", "ID") || 0),
    tag_code: String(getv(raw, "tag_code", "TagCode") || ""),
    tag_name: String(getv(raw, "tag_name", "TagName") || ""),
    dimension_code: String(getv(raw, "dimension_code", "DimensionCode") || ""),
    tag_level: (String(getv(raw, "tag_level", "TagLevel") || "both") as "image" | "collection" | "both"),
    is_system: Boolean(getv(raw, "is_system", "IsSystem")),
    sort_no: Number(getv(raw, "sort_no", "SortNo") || 0),
    status: Number(getv(raw, "status", "Status") || 0),
    remark: String(getv(raw, "remark", "Remark") || ""),
    created_at: String(getv(raw, "created_at", "CreatedAt") || ""),
    updated_at: String(getv(raw, "updated_at", "UpdatedAt") || ""),
  };
}

export async function listCopyrightCollections(params: { page?: number; pageSize?: number; keyword?: string }) {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("page_size", String(params.pageSize ?? 20));
  if (params.keyword?.trim()) search.set("keyword", params.keyword.trim());
  const res = await fetchWithAuth(`${API_BASE}/api/admin/copyright/collections?${search.toString()}`);
  return parseJSON<Paged<CopyrightCollection>>(res);
}

export async function createCopyrightTask(payload: {
  collectionId: number;
  runMode: "first" | "five" | "all";
  sampleStrategy?: "first" | "even" | "random" | "all";
  enableTagging?: boolean;
  overwriteMachineTags?: boolean;
}) {
  const res = await fetchWithAuth(`${API_BASE}/api/admin/copyright/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJSON<{ taskId: number; taskNo: string }>(res);
}

export async function listCopyrightTasks(params: { page?: number; pageSize?: number; collectionId?: number; status?: string }) {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("page_size", String(params.pageSize ?? 20));
  if (params.collectionId) search.set("collection_id", String(params.collectionId));
  if (params.status?.trim()) search.set("status", params.status.trim());
  const res = await fetchWithAuth(`${API_BASE}/api/admin/copyright/tasks?${search.toString()}`);
  const raw = await parseJSON<Paged<Record<string, unknown>>>(res);
  return { ...raw, items: (raw.items || []).map(normalizeTask) } as Paged<CopyrightTask>;
}

export async function getTaskLogs(taskId: number, page = 1, pageSize = 50) {
  const search = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  const res = await fetchWithAuth(`${API_BASE}/api/admin/copyright/tasks/${taskId}/logs?${search.toString()}`);
  const raw = await parseJSON<Paged<Record<string, unknown>>>(res);
  return {
    ...raw,
    items: (raw.items || []).map((it) => ({
      id: Number(getv(it, "id", "ID") || 0),
      stage: String(getv(it, "stage", "Stage") || ""),
      status: String(getv(it, "status", "Status") || ""),
      message: String(getv(it, "message", "Message") || ""),
      created_at: String(getv(it, "created_at", "CreatedAt") || ""),
    })),
  };
}

export async function listCollectionImages(params: {
  collectionId: number;
  taskId?: number;
  page?: number;
  pageSize?: number;
  riskLevel?: string;
}) {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("page_size", String(params.pageSize ?? 20));
  if (params.taskId) search.set("task_id", String(params.taskId));
  if (params.riskLevel?.trim()) search.set("risk_level", params.riskLevel.trim());
  const res = await fetchWithAuth(`${API_BASE}/api/admin/copyright/collections/${params.collectionId}/images?${search.toString()}`);
  const raw = await parseJSON<Paged<Record<string, unknown>>>(res);
  return { ...raw, items: (raw.items || []).map(normalizeImage) } as Paged<ImageCopyrightResult>;
}

export async function getImageDetail(emojiId: number, taskId?: number) {
  const search = new URLSearchParams();
  if (taskId) search.set("task_id", String(taskId));
  const suffix = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/api/admin/copyright/images/${emojiId}${suffix ? `?${suffix}` : ""}`);
  const raw = await parseJSON<Record<string, unknown>>(res);

  const emojiRaw = (getv(raw, "emoji") as Record<string, unknown>) || {};
  const resultRaw = (getv(raw, "result") as Record<string, unknown>) || {};
  const tagsRaw = (getv(raw, "tags") as Record<string, unknown>[] | null) || [];
  const evidencesRaw = (getv(raw, "evidences") as Record<string, unknown>[] | null) || [];
  const reviewsRaw = (getv(raw, "reviews") as Record<string, unknown>[] | null) || [];

  return {
    emoji: {
      id: Number(getv(emojiRaw, "id", "ID") || 0),
      collection_id: Number(getv(emojiRaw, "collection_id", "CollectionID") || 0),
      image_url: String(getv(emojiRaw, "image_url", "ImageURL", "ThumbURL", "FileURL") || ""),
      animated_url: String(getv(emojiRaw, "animated_url", "AnimatedURL", "FileURL", "ThumbURL") || ""),
      display_name: String(getv(emojiRaw, "display_name", "DisplayName", "Title") || ""),
    },
    result: normalizeImage(resultRaw),
    tags: tagsRaw.map((t) => ({
      id: Number(getv(t, "id", "ID") || 0),
      tagId: Number(getv(t, "tagId", "tag_id", "TagID") || 0),
      tagCode: String(getv(t, "tagCode", "tag_code", "TagCode") || ""),
      tagName: String(getv(t, "tagName", "tag_name", "TagName") || ""),
      dimensionCode: String(getv(t, "dimensionCode", "dimension_code", "DimensionCode") || ""),
      source: String(getv(t, "source", "Source") || ""),
    })),
    evidences: evidencesRaw.map((e) => ({
      id: Number(getv(e, "id", "ID") || 0),
      evidence_type: String(getv(e, "evidence_type", "EvidenceType") || ""),
      evidence_title: String(getv(e, "evidence_title", "EvidenceTitle") || ""),
      evidence_url: String(getv(e, "evidence_url", "EvidenceURL") || ""),
      created_at: String(getv(e, "created_at", "CreatedAt") || ""),
    })),
    reviews: reviewsRaw.map(normalizeReview),
  };
}

export async function listPendingReviews(page = 1, pageSize = 20) {
  const search = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  const res = await fetchWithAuth(`${API_BASE}/api/admin/copyright/reviews/pending?${search.toString()}`);
  const raw = await parseJSON<Paged<Record<string, unknown>>>(res);
  return { ...raw, items: (raw.items || []).map(normalizeReview) } as Paged<CopyrightReviewRecord>;
}

export async function submitReview(payload: {
  taskId?: number;
  collectionId: number;
  emojiId?: number;
  reviewType: "collection" | "image";
  reviewResult: string;
  reviewComment: string;
  attachmentUrls?: string[];
}) {
  const res = await fetchWithAuth(`${API_BASE}/api/admin/copyright/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJSON<{ message: string }>(res);
}

export async function listTagDimensions() {
  const res = await fetchWithAuth(`${API_BASE}/api/admin/copyright/tag-dimensions`);
  const raw = await parseJSON<Record<string, unknown>[]>(res);
  return (raw || []).map(normalizeTagDimension);
}

export async function listTagDefinitions(params: { page?: number; pageSize?: number; keyword?: string; dimensionCode?: string }) {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("page_size", String(params.pageSize ?? 50));
  if (params.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params.dimensionCode?.trim()) search.set("dimension_code", params.dimensionCode.trim());
  const res = await fetchWithAuth(`${API_BASE}/api/admin/copyright/tag-definitions?${search.toString()}`);
  const raw = await parseJSON<Paged<Record<string, unknown>>>(res);
  return { ...raw, items: (raw.items || []).map(normalizeTagDefinition) } as Paged<TagDefinition>;
}

export async function createTagDefinition(payload: {
  tagCode: string;
  tagName: string;
  dimensionCode: string;
  tagLevel: "image" | "collection" | "both";
  isSystem?: boolean;
  sortNo?: number;
  status?: number;
  remark?: string;
}) {
  const res = await fetchWithAuth(`${API_BASE}/api/admin/copyright/tag-definitions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await parseJSON<Record<string, unknown>>(res);
  return normalizeTagDefinition(raw);
}

export async function updateTagDefinition(
  id: number,
  payload: {
    tagName?: string;
    dimensionCode?: string;
    tagLevel?: "image" | "collection" | "both";
    isSystem?: boolean;
    sortNo?: number;
    status?: number;
    remark?: string;
  }
) {
  const res = await fetchWithAuth(`${API_BASE}/api/admin/copyright/tag-definitions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await parseJSON<Record<string, unknown>>(res);
  return normalizeTagDefinition(raw);
}

export async function updateImageTags(emojiId: number, payload: { addTagIds?: number[]; removeTagIds?: number[] }) {
  const res = await fetchWithAuth(`${API_BASE}/api/admin/copyright/images/${emojiId}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJSON<{ message: string }>(res);
}
