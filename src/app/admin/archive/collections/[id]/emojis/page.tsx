"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import {
  API_BASE,
  ensureValidSession,
  fetchWithAuth,
  getAccessToken,
} from "@/lib/admin-auth";

type Emoji = {
  id: number;
  collection_id: number;
  title: string;
  file_url: string;
  preview_url?: string;
  format?: string;
  size_bytes?: number;
  status: string;
  created_at: string;
};

type EmojiListResponse = {
  items: Emoji[];
  total: number;
};

type CollectionBrief = {
  id: number;
  title: string;
  file_count?: number;
};

export default function Page() {
  const params = useParams();
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const collectionId = Number(idParam);
  const pageSize = 48;

  const [collectionTitle, setCollectionTitle] = useState("");
  const [items, setItems] = useState<Emoji[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadSetCover, setUploadSetCover] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [editing, setEditing] = useState<Emoji | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activePreviewId, setActivePreviewId] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const loadCollectionTitle = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/collections?page=1&page_size=200`);
      if (!res.ok) return;
      const data = (await res.json()) as { items?: CollectionBrief[] };
      const hit = data.items?.find((item) => item.id === collectionId);
      if (hit) setCollectionTitle(hit.title || "");
    } catch {
      // ignore
    }
  };

  const loadEmojis = async (pageValue = 1, reset = false) => {
    if (!collectionId || Number.isNaN(collectionId)) return;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set("collection_id", String(collectionId));
      query.set("page", String(pageValue));
      query.set("page_size", String(pageSize));
      const res = await fetchWithAuth(`${API_BASE}/api/emojis?${query.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as EmojiListResponse;
      setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
      setTotal(data.total || 0);
      setPage(pageValue);
      if (reset) {
        setSelectedIds([]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // collectionId 变化时重新加载，函数本身不作为依赖以避免重复请求
  useEffect(() => {
    if (!collectionId || Number.isNaN(collectionId)) return;
    loadCollectionTitle();
    loadEmojis(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId]);

  const startEdit = (emoji: Emoji) => {
    setEditing(emoji);
    setEditTitle(emoji.title || "");
    setEditStatus(emoji.status || "active");
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editTitle.trim()) {
      setError("请输入表情标题");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/emojis/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          status: editStatus,
          collection_id: editing.collection_id,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setItems((prev) =>
        prev.map((item) =>
          item.id === editing.id
            ? { ...item, title: editTitle.trim(), status: editStatus }
            : item
        )
      );
      setEditing(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "更新失败";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emoji: Emoji) => {
    if (!confirm(`确定删除表情：${emoji.title || emoji.id}?`)) return;
    setDeletingId(emoji.id);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/emojis/${emoji.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      setItems((prev) => prev.filter((item) => item.id !== emoji.id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (editing?.id === emoji.id) {
        setEditing(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "删除失败";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedIds([]);
      }
      return !prev;
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllCurrent = () => {
    setSelectedIds(items.map((item) => item.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleBatchDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`确定删除选中的 ${selectedIds.length} 个表情吗？`)) return;
    setBatchDeleting(true);
    setError(null);
    let failed = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/emojis/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          failed++;
          continue;
        }
        setItems((prev) => prev.filter((item) => item.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
      } catch {
        failed++;
      }
    }
    if (failed > 0) {
      setError(`批量删除完成，但有 ${failed} 个失败`);
    } else {
      setError(null);
    }
    setSelectedIds([]);
    setBatchDeleting(false);
  };

  const handleUpload = async () => {
    if (!collectionId || Number.isNaN(collectionId)) return;
    if (uploadFiles.length === 0) {
      setError("请选择要上传的表情文件");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      await ensureValidSession();
      const token = getAccessToken();
      const form = new FormData();
      uploadFiles.forEach((file) => form.append("files", file));
      if (uploadSetCover) {
        form.append("set_cover", "1");
      }
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/api/admin/collections/${collectionId}/emojis/upload`, true);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
            return;
          }
          reject(new Error(xhr.responseText || "上传失败"));
        };
        xhr.onerror = () => reject(new Error("上传失败"));
        xhr.send(form);
      });
      setUploadFiles([]);
      setUploadProgress(0);
      setUploadOpen(false);
      await loadEmojis(1, true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "上传失败";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`表情管理${collectionTitle ? ` · ${collectionTitle}` : ""}`}
        description={`合集 ID：${collectionId || "-"} · 共 ${total} 个表情`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
              href="/admin/archive/collections"
            >
              返回合集
            </Link>
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
              onClick={() => loadEmojis(1, true)}
              disabled={loading}
            >
              {loading ? "加载中..." : "刷新"}
            </button>
            <button
              className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                selectionMode
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
              onClick={toggleSelectionMode}
            >
              {selectionMode ? "退出批量" : "批量删除"}
            </button>
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              onClick={() => setUploadOpen((prev) => !prev)}
            >
              {uploadOpen ? "收起上传" : "补充上传"}
            </button>
          </div>
        }
      />

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {uploadOpen && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6">
          <div className="text-sm font-semibold text-slate-700">补充上传表情</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <input
                type="file"
                multiple
                className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
              />
              {uploadFiles.length > 0 && (
                <div className="mt-2 text-xs text-slate-500">
                  已选择 {uploadFiles.length} 个文件
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={uploadSetCover}
                onChange={(e) => setUploadSetCover(e.target.checked)}
              />
              首张作为封面
            </label>
          </div>
          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>上传进度</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? "上传中..." : "开始上传"}
            </button>
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:border-slate-300"
              onClick={() => setUploadOpen(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6">
          <div className="text-sm font-semibold text-slate-700">编辑表情</div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <PreviewImage
                src={editing.preview_url || editing.file_url}
                alt={editing.title || `emoji-${editing.id}`}
              />
            </div>
            <div className="min-w-[220px] flex-1 space-y-3">
              <div>
                <div className="text-xs text-slate-400">标题</div>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-slate-400">状态</div>
                <select
                  className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
              </div>
              <div className="text-xs text-slate-400">
                文件：{editing.file_url?.split("/").pop() || "-"}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? "保存中..." : "保存"}
              </button>
              <button
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:border-slate-300"
                onClick={cancelEdit}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-100 bg-white p-6">
        <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
          <span>表情列表</span>
          <span className="text-xs text-slate-500">
            第 {page} / {totalPages} 页
          </span>
        </div>
        {selectionMode && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-700">
            <span>已选 {selectedIds.length} 个</span>
            <button
              className="rounded-lg border border-emerald-200 bg-white px-3 py-1 text-[11px] text-emerald-700 hover:border-emerald-300"
              onClick={selectAllCurrent}
            >
              全选本页
            </button>
            <button
              className="rounded-lg border border-emerald-200 bg-white px-3 py-1 text-[11px] text-emerald-700 hover:border-emerald-300"
              onClick={clearSelection}
            >
              清空
            </button>
            <button
              className="rounded-lg border border-red-200 bg-red-500 px-3 py-1 text-[11px] text-white hover:bg-red-400 disabled:opacity-60"
              onClick={handleBatchDelete}
              disabled={!selectedIds.length || batchDeleting}
            >
              {batchDeleting ? "删除中..." : "删除已选"}
            </button>
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((emoji) => {
            const previewUrl = emoji.preview_url || emoji.file_url;
            const fileName = emoji.file_url?.split("/").pop() || "-";
            const titleValue = (emoji.title || "").trim();
            const displayTitle =
              titleValue && titleValue.length <= 18 ? titleValue : fileName;
            const isGif = isGifEmoji(emoji, previewUrl);
            const staticUrl = isGif ? buildStaticPreview(previewUrl) : "";
            const shouldPlay = activePreviewId === emoji.id;
            // 私有空间签名 URL 无法直接拼接静态预览参数时，回退到原图，避免出现“无预览”。
            const displayUrl = isGif
              ? shouldPlay
                ? previewUrl
                : staticUrl || previewUrl
              : previewUrl;

            return (
              <div
                key={emoji.id}
                className="group relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                onMouseEnter={() => setActivePreviewId(emoji.id)}
                onMouseLeave={() =>
                  setActivePreviewId((prev) => (prev === emoji.id ? null : prev))
                }
              >
                {selectionMode && (
                  <button
                    type="button"
                    className="absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] text-slate-500 shadow-sm"
                    onClick={() => toggleSelect(emoji.id)}
                  >
                    {selectedIds.includes(emoji.id) ? "✓" : ""}
                  </button>
                )}
                <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                  <PreviewImage
                    src={displayUrl}
                    alt={emoji.title || `emoji-${emoji.id}`}
                  />
                  {isGif && !shouldPlay && (
                    <div className="absolute bottom-2 right-2 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] text-white">
                      GIF
                    </div>
                  )}
                </div>
                <div className="mt-2 truncate text-xs font-medium text-slate-700">
                  {displayTitle || "—"}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">#{emoji.id}</div>
                {!selectionMode && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/55 opacity-0 transition group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs text-white backdrop-blur"
                        onClick={() => startEdit(emoji)}
                      >
                        编辑
                      </button>
                      <button
                        className="rounded-full border border-red-200/60 bg-red-500/70 px-3 py-1 text-xs text-white"
                        onClick={() => handleDelete(emoji)}
                        disabled={deletingId === emoji.id}
                      >
                        {deletingId === emoji.id ? "删除中" : "删除"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!items.length && !loading && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-400">
              暂无表情
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-slate-500">
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => loadEmojis(page - 1, true)}
            disabled={page <= 1 || loading}
          >
            上一页
          </button>
          <span>
            第 {page} / {totalPages} 页
          </span>
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => loadEmojis(page + 1, true)}
            disabled={page >= totalPages || loading}
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewImage({ src, alt }: { src?: string; alt: string }) {
  const [currentSrc, setCurrentSrc] = useState("");
  const [swapped, setSwapped] = useState(false);

  const isImageFile = (u: string) =>
    /\.(jpe?g|png|gif|webp)$/i.test(u.split("?")[0].split("#")[0]);

  useEffect(() => {
    let cancelled = false;
    const next = (src || "").trim();
    const isUrl = next.startsWith("http://") || next.startsWith("https://");

    const assign = (value: string) => {
      if (!cancelled) {
        setCurrentSrc(value);
        setSwapped(false);
      }
    };

    if (!isImageFile(next)) {
      assign("");
      return () => {
        cancelled = true;
      };
    }

    if (isUrl) {
      assign(next);
      return () => {
        cancelled = true;
      };
    }

    const fetchDirectUrl = async () => {
      try {
        const res = await fetchWithAuth(
          `${API_BASE}/api/storage/url?key=${encodeURIComponent(next)}`
        );
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { url?: string };
        assign(data.url || "");
      } catch {
        assign("");
      }
    };

    fetchDirectUrl();

    return () => {
      cancelled = true;
    };
  }, [src]);

  const handleError = () => {
    if (!currentSrc) return;
    if (!swapped) {
      if (currentSrc.startsWith("http://")) {
        setCurrentSrc(`https://${currentSrc.slice(7)}`);
        setSwapped(true);
        return;
      }
      if (currentSrc.startsWith("https://")) {
        setCurrentSrc(`http://${currentSrc.slice(8)}`);
        setSwapped(true);
        return;
      }
    }
    setCurrentSrc("");
  };

  const hasPreview =
    currentSrc &&
    (currentSrc.startsWith("http://") || currentSrc.startsWith("https://"));

  if (!hasPreview) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
        无预览
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className="h-full w-full object-contain"
      loading="lazy"
      onError={handleError}
    />
  );
}

function isGifEmoji(emoji: Emoji, url: string) {
  const format = (emoji.format || "").toLowerCase();
  if (format.includes("gif")) return true;
  const clean = url.split("?")[0].split("#")[0];
  return clean.toLowerCase().endsWith(".gif");
}

function buildStaticPreview(url: string) {
  const val = (url || "").trim();
  if (!val.startsWith("http://") && !val.startsWith("https://")) return "";
  if (val.includes("token=") || val.includes("e=")) return "";
  const separator = val.includes("?") ? "&" : "?";
  return `${val}${separator}imageMogr2/format/png`;
}
