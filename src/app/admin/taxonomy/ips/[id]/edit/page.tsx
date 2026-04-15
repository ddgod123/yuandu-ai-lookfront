"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type IPItem = {
  id: number;
  name: string;
  slug: string;
  cover_url?: string;
  cover_thumb_url?: string;
  category_id?: number | null;
  description?: string;
  sort?: number;
  status?: string;
  collection_count?: number;
  created_at?: string;
  updated_at?: string;
};

type IPBindingItem = {
  id: number;
  ip_id: number;
  collection_id: number;
  sort: number;
  status: string;
  note?: string;
  collection?: {
    id: number;
    title?: string;
    cover_url?: string;
    file_count?: number;
    source?: string;
    status?: string;
    visibility?: string;
    updated_at?: string;
  };
};

type IPBindingListResponse = {
  items?: IPBindingItem[];
  total?: number;
};

type IPBindingAuditLogItem = {
  id: number;
  admin_id?: number;
  admin_name?: string;
  action?: string;
  ip_id?: number;
  binding_id?: number;
  collection_id?: number;
  collection_title?: string;
  summary?: string;
  created_at?: string;
};

type IPBindingAuditLogListResponse = {
  total?: number;
  items?: IPBindingAuditLogItem[];
};

const INPUT_CLASS =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
const SELECT_CLASS = INPUT_CLASS;
const PRIMARY_BUTTON_CLASS =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-emerald-600";
const SECONDARY_BUTTON_CLASS =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50";


function mapErrorText(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("name required")) return "请输入IP名称";
  if (lower.includes("slug required")) return "Slug 不能为空";
  if (lower.includes("unique") || lower.includes("duplicate")) return "IP 已存在";
  if (lower.includes("not found")) return "IP 不存在或已删除";
  return text;
}

function normalizeError(raw: string) {
  const text = raw.trim();
  if (!text) return "操作失败";
  try {
    const data = JSON.parse(text) as { error?: string };
    if (data?.error) return mapErrorText(data.error);
  } catch {
    // ignore
  }
  return mapErrorText(text);
}

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN");
}

function formatBindingActionLabel(action?: string) {
  switch ((action || "").trim()) {
    case "admin_ip_binding_upsert":
      return "新增/覆盖绑定";
    case "admin_ip_binding_update":
      return "更新绑定";
    case "admin_ip_binding_delete":
      return "移除绑定";
    case "admin_ip_binding_reorder":
      return "重排绑定";
    case "admin_ip_binding_batch_import":
      return "批量导入";
    default:
      return action || "-";
  }
}

function FormItem({
  label,
  children,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function CoverUploader({
  file,
  uploading,
  progress,
  onFileChange,
  onUpload,
}: {
  file: File | null;
  uploading: boolean;
  progress: number;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
        className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-600 hover:file:bg-slate-200"
      />
      <button
        type="button"
        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
        onClick={onUpload}
        disabled={!file || uploading}
      >
        {uploading ? "上传中..." : "上传图片"}
      </button>
      {uploading && <span className="text-[11px] text-slate-400">{progress}%</span>}
    </div>
  );
}

function normalizeUploadHost(raw: string) {
  const host = (raw || "").trim();
  if (!host) return "https://up.qiniup.com";
  if (host.startsWith("//")) return `https:${host}`;
  if (host.startsWith("http://")) return `https://${host.slice(7)}`;
  if (host.startsWith("https://")) return host;
  return `https://${host}`;
}

async function readImageMeta(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = (img as HTMLImageElement).naturalWidth || 0;
      const height = (img as HTMLImageElement).naturalHeight || 0;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法读取图片尺寸"));
    };
    img.src = url;
  });
}

export default function EditIPPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const ipID = Number(params?.id || 0);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverHint, setCoverHint] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCover, setFormCover] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<number>(0);
  const [formDesc, setFormDesc] = useState("");
  const [formSort, setFormSort] = useState(0);
  const [formStatus, setFormStatus] = useState("active");

  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [coverQuery, setCoverQuery] = useState("");
  const [coverType, setCoverType] = useState("image");
  const [coverResults, setCoverResults] = useState<{ key: string; url?: string }[]>([]);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverMarker, setCoverMarker] = useState("");
  const [coverHasNext, setCoverHasNext] = useState(false);
  const [coverUrlMap, setCoverUrlMap] = useState<Record<string, string>>({});
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [localPreviewURL, setLocalPreviewURL] = useState("");

  const [bindings, setBindings] = useState<IPBindingItem[]>([]);
  const [bindingsTotal, setBindingsTotal] = useState(0);
  const [bindingsLoading, setBindingsLoading] = useState(false);
  const [bindingSaving, setBindingSaving] = useState(false);
  const [bindingReordering, setBindingReordering] = useState(false);
  const [bindingKeyword, setBindingKeyword] = useState("");
  const [bindingStatusFilter, setBindingStatusFilter] = useState("all");
  const [bindingCollectionID, setBindingCollectionID] = useState("");
  const [bindingSort, setBindingSort] = useState("");
  const [bindingNote, setBindingNote] = useState("");
  const [bindingDrafts, setBindingDrafts] = useState<Record<number, { sort: string; status: string; note: string }>>({});
  const [batchImportIDs, setBatchImportIDs] = useState("");
  const [batchImportStartSort, setBatchImportStartSort] = useState("10");
  const [batchImportSortStep, setBatchImportSortStep] = useState("10");
  const [batchImportNote, setBatchImportNote] = useState("");
  const [batchImportReplace, setBatchImportReplace] = useState(false);
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchImportResult, setBatchImportResult] = useState<string | null>(null);
  const [batchImportFailed, setBatchImportFailed] = useState<Array<{ collection_id: number; error: string }>>([]);

  const [auditLogs, setAuditLogs] = useState<IPBindingAuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);

  const coverPreviewUrl = useMemo(() => {
    if (!formCover) return "";
    if (formCover.startsWith("http")) return formCover;
    return coverUrlMap[formCover] || "";
  }, [formCover, coverUrlMap]);
  const displayPreviewURL = coverPreviewUrl || localPreviewURL;

  useEffect(() => {
    return () => {
      if (localPreviewURL.startsWith("blob:")) {
        URL.revokeObjectURL(localPreviewURL);
      }
    };
  }, [localPreviewURL]);

  const fetchStorageURL = async (key: string) => {
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/storage/url?key=${encodeURIComponent(key)}&style=ip_cover_card`
      );
      if (!res.ok) return "";
      const data = (await res.json()) as { url?: string };
      return data.url || "";
    } catch {
      return "";
    }
  };

  const ensureCoverPreview = async (raw: string) => {
    const val = (raw || "").trim();
    if (!val) return;
    if (val.startsWith("http")) return;
    if (coverUrlMap[val]) return;
    const resolved = await fetchStorageURL(val);
    if (resolved) {
      setCoverUrlMap((prev) => ({ ...prev, [val]: resolved }));
    }
  };

  const loadDetail = async () => {
    if (!ipID || Number.isNaN(ipID)) {
      setError("无效的IP ID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ips/${ipID}`);
      if (!res.ok) throw new Error(await res.text());
      const item = (await res.json()) as IPItem;
      setFormName(item.name || "");
      setFormSlug(item.slug || "");
      setFormCover(item.cover_url || "");
      setFormCategoryId(item.category_id || 0);
      setFormDesc(item.description || "");
      setFormSort(item.sort ?? 0);
      setFormStatus(item.status || "active");
      setLocalPreviewURL("");
      const cover = (item.cover_url || "").trim();
      const thumb = (item.cover_thumb_url || "").trim();
      if (thumb) {
        setCoverUrlMap((prev) => ({ ...prev, [cover || thumb]: thumb }));
      }
      if (cover && !cover.startsWith("http")) {
        const resolved = thumb || (await fetchStorageURL(cover));
        if (resolved) {
          setCoverUrlMap((prev) => ({ ...prev, [cover]: resolved }));
        }
      }
      setUploadNotice(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const buildBindingDrafts = (items: IPBindingItem[]) => {
    const next: Record<number, { sort: string; status: string; note: string }> = {};
    for (const item of items) {
      next[item.id] = {
        sort: String(item.sort ?? 0),
        status: item.status || "active",
        note: item.note || "",
      };
    }
    return next;
  };

  const loadBindings = async (keyword = bindingKeyword, status = bindingStatusFilter) => {
    if (!ipID || Number.isNaN(ipID)) return;
    setBindingsLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        page_size: "100",
      });
      if (keyword.trim()) params.set("q", keyword.trim());
      if (status && status !== "all") params.set("status", status);
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ips/${ipID}/bindings?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as IPBindingListResponse;
      const items = Array.isArray(data.items) ? data.items : [];
      setBindings(items);
      setBindingsTotal(Number(data.total || items.length));
      setBindingDrafts(buildBindingDrafts(items));
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "加载绑定失败";
      setError(message);
      setBindings([]);
      setBindingsTotal(0);
      setBindingDrafts({});
    } finally {
      setBindingsLoading(false);
    }
  };

  const addBinding = async () => {
    if (!ipID || Number.isNaN(ipID)) return;
    const collectionID = Number(bindingCollectionID.trim());
    if (!Number.isFinite(collectionID) || collectionID <= 0) {
      setError("请输入有效合集ID");
      return;
    }
    const payload: {
      collection_id: number;
      sort?: number;
      status: string;
      note: string;
    } = {
      collection_id: collectionID,
      status: "active",
      note: bindingNote.trim(),
    };
    if (bindingSort.trim()) {
      const parsedSort = Number(bindingSort.trim());
      if (!Number.isFinite(parsedSort)) {
        setError("排序必须是数字");
        return;
      }
      payload.sort = parsedSort;
    }

    setBindingSaving(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ips/${ipID}/bindings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setBindingCollectionID("");
      setBindingSort("");
      setBindingNote("");
      await loadBindings();
      await loadAuditLogs();
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "新增绑定失败";
      setError(message);
    } finally {
      setBindingSaving(false);
    }
  };

  const saveBinding = async (bindingID: number) => {
    if (!ipID || Number.isNaN(ipID)) return;
    const draft = bindingDrafts[bindingID];
    if (!draft) return;

    const payload: {
      sort?: number;
      status?: string;
      note?: string;
    } = {
      status: draft.status,
      note: draft.note.trim(),
    };
    if (draft.sort.trim()) {
      const parsedSort = Number(draft.sort.trim());
      if (!Number.isFinite(parsedSort)) {
        setError("排序必须是数字");
        return;
      }
      payload.sort = parsedSort;
    }

    setBindingSaving(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ips/${ipID}/bindings/${bindingID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadBindings();
      await loadAuditLogs();
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "更新绑定失败";
      setError(message);
    } finally {
      setBindingSaving(false);
    }
  };

  const removeBinding = async (binding: IPBindingItem) => {
    if (!ipID || Number.isNaN(ipID)) return;
    const confirmed = window.confirm(`确认移除绑定？\n合集：${binding.collection?.title || binding.collection_id}`);
    if (!confirmed) return;
    setBindingSaving(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ips/${ipID}/bindings/${binding.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      await loadBindings();
      await loadAuditLogs();
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "删除绑定失败";
      setError(message);
    } finally {
      setBindingSaving(false);
    }
  };

  const moveBinding = async (index: number, direction: "up" | "down") => {
    if (!ipID || Number.isNaN(ipID)) return;
    if (bindings.length <= 1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= bindings.length) return;

    const ordered = [...bindings];
    const tmp = ordered[index];
    ordered[index] = ordered[targetIndex];
    ordered[targetIndex] = tmp;
    const bindingIDs = ordered.map((item) => item.id);

    setBindingReordering(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ips/${ipID}/bindings/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ binding_ids: bindingIDs }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadBindings();
      await loadAuditLogs();
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "排序失败";
      setError(message);
    } finally {
      setBindingReordering(false);
    }
  };

  const loadAuditLogs = async () => {
    if (!ipID || Number.isNaN(ipID)) return;
    setAuditLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ips/${ipID}/bindings/logs?limit=50`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as IPBindingAuditLogListResponse;
      const items = Array.isArray(data.items) ? data.items : [];
      setAuditLogs(items);
      setAuditTotal(Number(data.total || items.length));
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "加载审计日志失败";
      setError(message);
      setAuditLogs([]);
      setAuditTotal(0);
    } finally {
      setAuditLoading(false);
    }
  };

  const batchImportBindings = async () => {
    if (!ipID || Number.isNaN(ipID)) return;
    const raw = batchImportIDs.trim();
    if (!raw && !batchImportReplace) {
      setError("请先输入合集ID（逗号/空格/换行分隔）");
      return;
    }
    const ids = raw
      .split(/[\s,，;；]+/)
      .map((item) => Number(item.trim()))
      .filter((num) => Number.isFinite(num) && num > 0)
      .map((num) => Number(num));
    const uniqueIDs = Array.from(new Set(ids));
    if (!uniqueIDs.length && !batchImportReplace) {
      setError("未识别到有效合集ID");
      return;
    }

    const payload: {
      collection_ids: number[];
      start_sort?: number;
      sort_step?: number;
      note?: string;
      replace: boolean;
    } = {
      collection_ids: uniqueIDs,
      replace: batchImportReplace,
    };
    if (batchImportStartSort.trim()) {
      const value = Number(batchImportStartSort.trim());
      if (Number.isFinite(value)) payload.start_sort = value;
    }
    if (batchImportSortStep.trim()) {
      const value = Number(batchImportSortStep.trim());
      if (Number.isFinite(value) && value > 0) payload.sort_step = value;
    }
    if (batchImportNote.trim()) payload.note = batchImportNote.trim();

    setBatchImporting(true);
    setBatchImportResult(null);
    setBatchImportFailed([]);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ips/${ipID}/bindings/batch-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as {
        total?: number;
        success_count?: number;
        failed?: Array<{ collection_id: number; error: string }>;
      };
      const failed = Array.isArray(data.failed) ? data.failed : [];
      const successCount = Number(data.success_count || 0);
      setBatchImportFailed(failed);
      setBatchImportResult(
        failed.length > 0
          ? `批量导入完成：成功 ${successCount} 条，失败 ${failed.length} 条`
          : `批量导入完成：成功 ${successCount} 条`
      );
      await loadBindings();
      await loadAuditLogs();
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "批量导入失败";
      setError(message);
      setBatchImportFailed([]);
    } finally {
      setBatchImporting(false);
    }
  };

  useEffect(() => {
    loadDetail();
    void loadBindings("", "all");
    void loadAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ipID]);

  const sanitizeFileName = (name: string) => {
    const cleaned = name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
    return cleaned || "ip-cover";
  };

  const validateCoverFile = async (file: File) => {
    try {
      const meta = await readImageMeta(file);
      const { width, height } = meta;
      if (width < 900 || height < 480) {
        return { ok: false, message: `图片尺寸过小（${width}×${height}），建议至少 900×480` };
      }
      const ratio = width / height;
      if (ratio < 1.65 || ratio > 2.1) {
        return {
          ok: true,
          hint: `当前比例 ${ratio.toFixed(2)}，建议接近 1.88（推荐 1200×640）`,
        };
      }
      return { ok: true, hint: `尺寸 ${width}×${height}，比例 ${ratio.toFixed(2)}（建议区间内）` };
    } catch {
      return { ok: true };
    }
  };

  const uploadCoverFile = async () => {
    if (!coverFile) {
      setError("请选择图片文件");
      return;
    }
    setError(null);
    setUploadNotice(null);
    setCoverUploading(true);
    setCoverProgress(0);
    try {
      const fileName = sanitizeFileName(coverFile.name);
      const key = `emoji/ip/${Date.now()}-${fileName}`;
      const tokenRes = await fetchWithAuth(`${API_BASE}/api/storage/upload-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!tokenRes.ok) throw new Error(await tokenRes.text());
      const tokenData = (await tokenRes.json()) as { token: string; key?: string; up_host?: string };
      const uploadKey = tokenData.key || key;
      const upHost = normalizeUploadHost(tokenData.up_host || "https://up.qiniup.com");

      await new Promise<void>((resolve, reject) => {
        const form = new FormData();
        form.append("file", coverFile);
        form.append("token", tokenData.token);
        form.append("key", uploadKey);
        const xhr = new XMLHttpRequest();
        xhr.open("POST", upHost, true);
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          setCoverProgress(percent);
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(xhr.responseText || "upload failed"));
        };
        xhr.onerror = () => reject(new Error("upload failed"));
        xhr.send(form);
      });

      // 固定保存 key，避免保存临时签名URL导致过期。
      setFormCover(uploadKey);
      const previewURL = await fetchStorageURL(uploadKey);
      if (previewURL) {
        setCoverUrlMap((prev) => ({ ...prev, [uploadKey]: previewURL }));
      }
      setCoverFile(null);
      setCoverProgress(100);
      setUploadNotice(`封面已上传：${uploadKey}（点击“保存修改”后正式生效）`);
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "上传失败";
      setError(message);
    } finally {
      setCoverUploading(false);
    }
  };

  const searchCoverAssets = async (keyword: string, type: string, marker: string, append = false) => {
    setCoverLoading(true);
    try {
      const query = new URLSearchParams();
      query.set("prefix", "emoji/");
      if (keyword.trim()) query.set("keyword", keyword.trim());
      if (type && type !== "all") query.set("type", type);
      query.set("limit", "24");
      if (marker) query.set("marker", marker);
      const res = await fetchWithAuth(`${API_BASE}/api/admin/storage/search?${query.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as {
        items: { key: string; url?: string }[];
        next_marker: string;
        has_next: boolean;
      };
      setCoverResults((prev) => (append ? [...prev, ...data.items] : data.items));
      setCoverMarker(data.next_marker || "");
      setCoverHasNext(Boolean(data.has_next));
      const map: Record<string, string> = {};
      for (const item of data.items || []) {
        if (item.url) map[item.key] = item.url;
      }
      if (Object.keys(map).length) {
        setCoverUrlMap((prev) => ({ ...prev, ...map }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "搜索失败";
      setError(message);
    } finally {
      setCoverLoading(false);
    }
  };

  const selectCover = async (item: { key: string; url?: string }) => {
    setFormCover(item.key);
    if (item.url) {
      setCoverUrlMap((prev) => ({ ...prev, [item.key]: item.url || "" }));
      return;
    }
    const resolved = await fetchStorageURL(item.key);
    if (resolved) {
      setCoverUrlMap((prev) => ({ ...prev, [item.key]: resolved }));
    }
  };

  const handleSave = async () => {
    if (!ipID || Number.isNaN(ipID)) {
      setError("无效的IP ID");
      return;
    }
    if (!formName.trim()) {
      setError("请输入IP名称");
      return;
    }
    setSaving(true);
    setError(null);
    setUploadNotice(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ips/${ipID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          slug: formSlug.trim(),
          cover_url: formCover.trim(),
          category_id: formCategoryId || null,
          description: formDesc.trim(),
          sort: formSort,
          status: formStatus,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/admin/taxonomy/ips");
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "更新失败";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="编辑 IP"
        description="编辑 IP 基础信息与关联合集。保存基础信息不会影响已维护的绑定关系。"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/taxonomy/ips" className={SECONDARY_BUTTON_CLASS}>
              <ArrowLeft className="h-3.5 w-3.5" />
              返回列表
            </Link>
            <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={loadDetail} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              刷新
            </button>
            <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存修改"}
            </button>
          </div>
        }
      />

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div>}
      {coverHint && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">{coverHint}</div>
      )}
      {uploadNotice && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
          {uploadNotice}
        </div>
      )}

      <div id="bindings-panel" className="rounded-3xl border border-slate-100 bg-white p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <FormItem label="IP名称" required>
            <input className={INPUT_CLASS} value={formName} onChange={(e) => setFormName(e.target.value)} />
          </FormItem>
          <FormItem label="Slug">
            <input className={INPUT_CLASS} value={formSlug} onChange={(e) => setFormSlug(e.target.value)} />
          </FormItem>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FormItem label="状态">
            <select className={SELECT_CLASS} value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </FormItem>
        </div>

        <div className="mt-4">
          <FormItem label="简介">
            <textarea className={`${INPUT_CLASS} h-28 py-2`} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
          </FormItem>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FormItem label="排序">
            <input type="number" className={INPUT_CLASS} value={formSort} onChange={(e) => setFormSort(Number(e.target.value))} />
          </FormItem>
          <FormItem label="封面（URL 或 七牛Key）">
            <input
              className={INPUT_CLASS}
              value={formCover}
              onChange={(e) => setFormCover(e.target.value)}
              onBlur={() => {
                void ensureCoverPreview(formCover);
              }}
              placeholder="https://... 或 emoji/ip/xxx.jpg"
            />
            <div className="mt-2 text-xs text-slate-500">
              推荐尺寸：<span className="font-semibold text-slate-700">1200 × 640</span>（约 1.88:1，居中主体）
            </div>
            <CoverUploader
              file={coverFile}
              uploading={coverUploading}
              progress={coverProgress}
              onFileChange={async (file) => {
                setCoverFile(file);
                setCoverHint(null);
                setError(null);
                if (localPreviewURL.startsWith("blob:")) {
                  URL.revokeObjectURL(localPreviewURL);
                }
                if (file) {
                  setLocalPreviewURL(URL.createObjectURL(file));
                } else {
                  setLocalPreviewURL("");
                }
                if (!file) return;
                const result = await validateCoverFile(file);
                if (!result.ok) {
                  setCoverFile(null);
                  setError(result.message || "封面图片不符合要求");
                  return;
                }
                if (result.hint) setCoverHint(result.hint);
              }}
              onUpload={uploadCoverFile}
            />
            <div className="mt-2 space-y-3">
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:border-slate-300"
                onClick={() => setCoverPickerOpen((prev) => !prev)}
                type="button"
              >
                {coverPickerOpen ? "收起选择" : "从七牛选择"}
              </button>
              {displayPreviewURL ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-2">
                    <div className="mb-1 text-[11px] font-semibold text-slate-500">原图预览</div>
                    <div className="h-24 overflow-hidden rounded-lg bg-slate-50">
                      <img src={displayPreviewURL} alt="cover-raw" className="h-full w-full object-contain" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-2">
                    <div className="mb-1 text-[11px] font-semibold text-slate-500">IP卡片裁剪效果（通用）</div>
                    <div className="aspect-[15/8] overflow-hidden rounded-lg bg-slate-50">
                      <img src={displayPreviewURL} alt="cover-cropped" className="h-full w-full object-cover object-center" />
                    </div>
                  </div>
                </div>
              ) : null}
              {coverPickerOpen && (
                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                      placeholder="搜索关键词"
                      value={coverQuery}
                      onChange={(e) => setCoverQuery(e.target.value)}
                    />
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                      value={coverType}
                      onChange={(e) => setCoverType(e.target.value)}
                    >
                      <option value="image">图片</option>
                      <option value="gif">GIF</option>
                      <option value="video">视频</option>
                      <option value="all">全部</option>
                    </select>
                    <button
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 hover:bg-emerald-100"
                      onClick={() => searchCoverAssets(coverQuery, coverType, "", false)}
                      type="button"
                    >
                      搜索
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {coverResults.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className="group relative h-20 w-full overflow-hidden rounded-lg border border-slate-200 bg-white"
                        onClick={() => selectCover(item)}
                      >
                        {item.url ? (
                          <img src={item.url} alt={item.key} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">无预览</div>
                        )}
                      </button>
                    ))}
                    {!coverResults.length && <div className="col-span-4 text-center text-xs text-slate-400">暂无结果</div>}
                  </div>
                  {coverHasNext && (
                    <button
                      className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:border-slate-300"
                      onClick={() => searchCoverAssets(coverQuery, coverType, coverMarker, true)}
                      type="button"
                      disabled={coverLoading}
                    >
                      {coverLoading ? "加载中..." : "加载更多"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </FormItem>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-black text-slate-900">关联合集维护</div>
            <div className="mt-1 text-xs text-slate-500">
              可在此维护当前 IP 绑定的合集（新增、编辑、排序、移除）。
            </div>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            共 {bindingsTotal} 条
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <input
            className={INPUT_CLASS}
            value={bindingKeyword}
            onChange={(e) => setBindingKeyword(e.target.value)}
            placeholder="搜索绑定合集（标题/ID）"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void loadBindings(bindingKeyword, bindingStatusFilter);
              }
            }}
          />
          <select
            className={SELECT_CLASS}
            value={bindingStatusFilter}
            onChange={(e) => {
              const next = e.target.value;
              setBindingStatusFilter(next);
              void loadBindings(bindingKeyword, next);
            }}
          >
            <option value="all">全部状态</option>
            <option value="active">仅启用</option>
            <option value="inactive">仅停用</option>
          </select>
          <button
            type="button"
            className={SECONDARY_BUTTON_CLASS}
            onClick={() => void loadBindings(bindingKeyword, bindingStatusFilter)}
            disabled={bindingsLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${bindingsLoading ? "animate-spin" : ""}`} />
            刷新绑定
          </button>
          <div className="text-xs text-slate-400 flex items-center">
            提示：合集编辑页设置 ip_id 会自动同步到这里。
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 lg:grid-cols-5">
          <input
            className={INPUT_CLASS}
            value={bindingCollectionID}
            onChange={(e) => setBindingCollectionID(e.target.value)}
            placeholder="合集ID（必填）"
          />
          <input
            className={INPUT_CLASS}
            value={bindingSort}
            onChange={(e) => setBindingSort(e.target.value)}
            placeholder="排序（可选）"
          />
          <input
            className={`${INPUT_CLASS} lg:col-span-2`}
            value={bindingNote}
            onChange={(e) => setBindingNote(e.target.value)}
            placeholder="备注（可选）"
          />
          <button
            type="button"
            className={PRIMARY_BUTTON_CLASS}
            onClick={addBinding}
            disabled={bindingSaving}
          >
            {bindingSaving ? "保存中..." : "新增绑定"}
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3 font-semibold">排序</th>
                <th className="px-3 py-3 font-semibold">合集</th>
                <th className="px-3 py-3 font-semibold">状态</th>
                <th className="px-3 py-3 font-semibold">备注</th>
                <th className="px-3 py-3 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bindingsLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                    加载中...
                  </td>
                </tr>
              ) : bindings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                    暂无绑定
                  </td>
                </tr>
              ) : (
                bindings.map((item, index) => {
                  const draft = bindingDrafts[item.id] || {
                    sort: String(item.sort ?? 0),
                    status: item.status || "active",
                    note: item.note || "",
                  };
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-3 align-top">
                        <input
                          className="h-9 w-24 rounded-lg border border-slate-200 px-2 text-xs"
                          value={draft.sort}
                          onChange={(e) =>
                            setBindingDrafts((prev) => ({
                              ...prev,
                              [item.id]: { ...draft, sort: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                            {item.collection?.cover_url ? (
                              <img src={item.collection.cover_url} alt={item.collection?.title || String(item.collection_id)} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-300">无图</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">{item.collection?.title || `#${item.collection_id}`}</div>
                            <div className="text-xs text-slate-400">
                              ID: {item.collection_id} · {item.collection?.file_count || 0} 张
                            </div>
                            <Link href={`/admin/archive/collections/${item.collection_id}/emojis`} className="text-xs font-semibold text-emerald-600 hover:underline">
                              查看合集
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <select
                          className="h-9 rounded-lg border border-slate-200 px-2 text-xs"
                          value={draft.status}
                          onChange={(e) =>
                            setBindingDrafts((prev) => ({
                              ...prev,
                              [item.id]: { ...draft, status: e.target.value },
                            }))
                          }
                        >
                          <option value="active">启用</option>
                          <option value="inactive">停用</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <input
                          className="h-9 w-full rounded-lg border border-slate-200 px-2 text-xs"
                          value={draft.note}
                          onChange={(e) =>
                            setBindingDrafts((prev) => ({
                              ...prev,
                              [item.id]: { ...draft, note: e.target.value },
                            }))
                          }
                          placeholder="备注"
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            onClick={() => void moveBinding(index, "up")}
                            disabled={index === 0 || bindingReordering}
                          >
                            上移
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            onClick={() => void moveBinding(index, "down")}
                            disabled={index === bindings.length - 1 || bindingReordering}
                          >
                            下移
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            onClick={() => void saveBinding(item.id)}
                            disabled={bindingSaving}
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                            onClick={() => void removeBinding(item)}
                            disabled={bindingSaving}
                          >
                            移除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-black text-slate-900">批量导入绑定</div>
            <div className="mt-1 text-xs text-slate-500">
              支持逗号/空格/换行分隔合集ID，可用于快速初始化 IP 关联合集。
            </div>
          </div>
          <button
            type="button"
            className={SECONDARY_BUTTON_CLASS}
            onClick={() => {
              setBatchImportIDs("");
              setBatchImportResult(null);
              setBatchImportFailed([]);
            }}
            disabled={batchImporting}
          >
            清空输入
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          <textarea
            className={`${INPUT_CLASS} h-36 py-2 lg:col-span-2`}
            value={batchImportIDs}
            onChange={(e) => setBatchImportIDs(e.target.value)}
            placeholder={"例如：\n101, 102, 103\n204\n305"}
          />
          <div className="space-y-3">
            <input
              className={INPUT_CLASS}
              value={batchImportStartSort}
              onChange={(e) => setBatchImportStartSort(e.target.value)}
              placeholder="起始排序（默认10）"
            />
            <input
              className={INPUT_CLASS}
              value={batchImportSortStep}
              onChange={(e) => setBatchImportSortStep(e.target.value)}
              placeholder="排序步长（默认10）"
            />
            <input
              className={INPUT_CLASS}
              value={batchImportNote}
              onChange={(e) => setBatchImportNote(e.target.value)}
              placeholder="批量备注（可选）"
            />
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={batchImportReplace}
                onChange={(e) => setBatchImportReplace(e.target.checked)}
              />
              清空当前IP已有绑定后再导入
            </label>
            <button
              type="button"
              className={`${PRIMARY_BUTTON_CLASS} w-full`}
              onClick={batchImportBindings}
              disabled={batchImporting}
            >
              {batchImporting ? "导入中..." : "开始批量导入"}
            </button>
            <div className="text-[11px] text-slate-500">
              注意：导入会把这些合集的主IP同步为当前 IP。
            </div>
          </div>
        </div>
        {batchImportResult && (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
            {batchImportResult}
          </div>
        )}
        {batchImportFailed.length > 0 && (
          <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3">
            <div className="text-xs font-semibold text-amber-700">失败明细（最多展示20条）</div>
            <div className="mt-2 space-y-1 text-xs text-amber-700">
              {batchImportFailed.slice(0, 20).map((item) => (
                <div key={`${item.collection_id}-${item.error}`}>
                  #{item.collection_id}：{item.error}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-black text-slate-900">绑定操作审计日志</div>
            <div className="mt-1 text-xs text-slate-500">记录绑定新增/修改/删除/重排/批量导入动作。</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              共 {auditTotal} 条
            </div>
            <button
              type="button"
              className={SECONDARY_BUTTON_CLASS}
              onClick={() => void loadAuditLogs()}
              disabled={auditLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${auditLoading ? "animate-spin" : ""}`} />
              刷新日志
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3 font-semibold">时间</th>
                <th className="px-3 py-3 font-semibold">动作</th>
                <th className="px-3 py-3 font-semibold">管理员</th>
                <th className="px-3 py-3 font-semibold">合集</th>
                <th className="px-3 py-3 font-semibold">摘要</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                    加载中...
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                    暂无日志
                  </td>
                </tr>
              ) : (
                auditLogs.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 text-xs text-slate-500">{formatDate(item.created_at)}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-slate-700">
                      {formatBindingActionLabel(item.action)}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {item.admin_name || (item.admin_id ? `#${item.admin_id}` : "-")}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {item.collection_id ? (
                        <Link
                          href={`/admin/archive/collections/${item.collection_id}/emojis`}
                          className="font-semibold text-emerald-600 hover:underline"
                        >
                          {item.collection_title || `#${item.collection_id}`}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">{item.summary || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
