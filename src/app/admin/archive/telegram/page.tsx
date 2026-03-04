"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type Category = {
  id: number;
  name: string;
  slug: string;
  prefix: string;
  description?: string;
  cover_url?: string;
  icon?: string;
  sort: number;
  status: string;
  parent_id?: number | null;
};

type StorageItem = {
  key: string;
  put_time: number;
  fsize: number;
  mime_type: string;
  md5: string;
  status: number;
  url?: string;
};

type ListObjectsResponse = {
  items: StorageItem[];
  next_marker: string;
  has_next: boolean;
  prefix: string;
};

type TreeItem = {
  category: Category;
  depth: number;
};

export default function DirectoryManagerPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [objects, setObjects] = useState<StorageItem[]>([]);
  const [marker, setMarker] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formPrefix, setFormPrefix] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formParentId, setFormParentId] = useState<number>(0);
  const [formCover, setFormCover] = useState("");
  const [formIcon, setFormIcon] = useState("");

  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSort, setEditSort] = useState(0);
  const [editStatus, setEditStatus] = useState("active");
  const [editParentId, setEditParentId] = useState<number>(0);
  const [editCover, setEditCover] = useState("");
  const [editIcon, setEditIcon] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconUrlMap, setIconUrlMap] = useState<Record<string, string>>({});
  const [coverUrlMap, setCoverUrlMap] = useState<Record<string, string>>({});
  const [coverSource, setCoverSource] = useState<"current" | "global">("current");
  const [iconSource, setIconSource] = useState<"current" | "global">("current");
  const [coverQuery, setCoverQuery] = useState("");
  const [iconQuery, setIconQuery] = useState("");
  const [coverResults, setCoverResults] = useState<StorageItem[]>([]);
  const [iconResults, setIconResults] = useState<StorageItem[]>([]);
  const [coverLoading, setCoverLoading] = useState(false);
  const [iconLoading, setIconLoading] = useState(false);
  const [coverMarker, setCoverMarker] = useState("");
  const [iconMarker, setIconMarker] = useState("");
  const [coverHasNext, setCoverHasNext] = useState(false);
  const [iconHasNext, setIconHasNext] = useState(false);
  const [coverType, setCoverType] = useState("all");
  const [iconType, setIconType] = useState("image");
  const [sortField, setSortField] = useState("time");
  const [sortOrder, setSortOrder] = useState("desc");
  const [pageSize, setPageSize] = useState(50);

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const enableCategoryOps = false;

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === selectedId) || null,
    [categories, selectedId]
  );

  const treeItems = useMemo(() => buildTree(categories), [categories]);

  const loadCategories = async (selectFirst = false) => {
    setLoadingCategories(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/categories`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Category[];
      setCategories(data);
      if (selectFirst && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadObjects = async (reset = true) => {
    if (!selectedCategory) return;
    setLoadingObjects(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set("limit", String(pageSize));
      if (searchTerm.trim()) query.set("keyword", searchTerm.trim());
      if (typeFilter && typeFilter !== "all") query.set("type", typeFilter);
      if (sortField) query.set("sort", sortField);
      if (sortOrder) query.set("order", sortOrder);
      if (!reset && marker) query.set("marker", marker);
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/categories/${selectedCategory.id}/objects?${query.toString()}`
      );
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as ListObjectsResponse;
      setObjects((prev) => (reset ? data.items : [...prev, ...data.items]));
      setMarker(data.next_marker || "");
      setHasNext(data.has_next);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
    } finally {
      setLoadingObjects(false);
    }
  };

  const createCategory = async () => {
    if (!formName.trim()) {
      setError("请输入分类名称");
      return;
    }
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          slug: formSlug.trim(),
          prefix: formPrefix.trim(),
          description: formDesc.trim(),
          cover_url: formCover.trim(),
          icon: formIcon.trim(),
          parent_id: formParentId > 0 ? formParentId : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setFormName("");
      setFormSlug("");
      setFormPrefix("");
      setFormDesc("");
      setFormParentId(0);
      setFormCover("");
      setFormIcon("");
      setFormOpen(false);
      await loadCategories(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "创建失败";
      setError(message);
    }
  };

  const updateCategory = async () => {
    if (!selectedCategory) return;
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/categories/${selectedCategory.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            description: editDesc.trim(),
            cover_url: editCover.trim(),
            icon: editIcon.trim(),
            sort: editSort,
            status: editStatus,
            parent_id: editParentId > 0 ? editParentId : null,
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      await loadCategories(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "更新失败";
      setError(message);
    }
  };

  const deleteCategory = async (mode: "empty" | "trash") => {
    if (!selectedCategory) return;
    const confirmName = window.prompt(`输入分类名称确认删除：${selectedCategory.name}`);
    if (confirmName !== selectedCategory.name) {
      setError("名称不匹配，已取消删除");
      return;
    }
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/categories/${selectedCategory.id}?mode=${mode}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(await res.text());
      await loadCategories(true);
      setObjects([]);
      setMarker("");
      setHasNext(false);
      setSelectedKeys([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "删除失败";
      setError(message);
    }
  };

  const deleteObject = async (key: string, mode: "trash" | "delete") => {
    const tip = mode === "trash" ? "确认移动到回收站？" : "确认彻底删除？";
    if (!window.confirm(tip)) return;
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/storage/object?key=${encodeURIComponent(key)}&mode=${mode}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(await res.text());
      await loadObjects(true);
      setSelectedKeys((prev) => prev.filter((item) => item !== key));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "操作失败";
      setError(message);
    }
  };

  const bulkOperate = async (mode: "trash" | "delete") => {
    if (selectedKeys.length === 0) return;
    const tip =
      mode === "trash" ? "确认批量移动到回收站？" : "确认批量彻底删除？";
    if (!window.confirm(tip)) return;
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/storage/batch-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: selectedKeys, mode }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSelectedKeys([]);
      await loadObjects(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "批量操作失败";
      setError(message);
    }
  };

  const openPreview = async (item: StorageItem) => {
    if (item.url) {
      window.open(item.url, "_blank");
      return;
    }
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/storage/url?key=${encodeURIComponent(item.key)}&private=1`
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "预览失败";
      setError(message);
    }
  };

  const searchGlobalAssets = async (
    keyword: string,
    type: string,
    marker: string,
    setResult: Dispatch<SetStateAction<StorageItem[]>>,
    setLoading: (val: boolean) => void,
    setMarker: (val: string) => void,
    setHasNext: (val: boolean) => void,
    append = false
  ) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set("prefix", "emoji/");
      if (keyword.trim()) query.set("keyword", keyword.trim());
      query.set("limit", "60");
      query.set("sort", "put_time");
      query.set("order", "desc");
      if (marker) query.set("marker", marker);
      if (type) query.set("type", type);
      const res = await fetchWithAuth(`${API_BASE}/api/admin/storage/search?${query.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const items = Array.isArray(data?.items) ? (data.items as StorageItem[]) : [];
      setResult((prev) => (append ? [...prev, ...items] : items));
      setMarker(data?.next_marker || "");
      setHasNext(Boolean(data?.has_next));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "搜索失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // 首次加载分类树
  useEffect(() => {
    loadCategories(true);
  }, []);

  // 分类切换时刷新对象列表
  useEffect(() => {
    if (selectedCategory) {
      setMarker("");
      setHasNext(false);
      loadObjects(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory?.id]);

  useEffect(() => {
    setCoverPickerOpen(false);
    setIconPickerOpen(false);
    setCoverSource("current");
    setIconSource("current");
    setCoverResults([]);
    setIconResults([]);
    setCoverMarker("");
    setIconMarker("");
    setCoverHasNext(false);
    setIconHasNext(false);
  }, [selectedCategory?.id]);

  useEffect(() => {
    setCoverResults([]);
    setCoverMarker("");
    setCoverHasNext(false);
  }, [coverType]);

  useEffect(() => {
    setIconResults([]);
    setIconMarker("");
    setIconHasNext(false);
  }, [iconType]);

  // 筛选项变化后进行防抖查询
  useEffect(() => {
    if (!selectedCategory) return;
    const timer = window.setTimeout(() => {
      setMarker("");
      setHasNext(false);
      loadObjects(true);
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, typeFilter, sortField, sortOrder, pageSize, selectedCategory?.id]);

  useEffect(() => {
    if (!selectedCategory) return;
    setEditName(selectedCategory.name || "");
    setEditDesc(selectedCategory.description || "");
    setEditCover(selectedCategory.cover_url || "");
    setEditIcon(selectedCategory.icon || "");
    setEditSort(selectedCategory.sort || 0);
    setEditStatus(selectedCategory.status || "active");
    setEditParentId(selectedCategory.parent_id || 0);
  }, [selectedCategory]);

  useEffect(() => {
    const icons = categories
      .map((item) => item.icon || "")
      .filter((icon) => icon.startsWith("emoji/") && !iconUrlMap[icon]);
    if (icons.length === 0) return;
    icons.forEach(async (icon) => {
      try {
        const res = await fetchWithAuth(
          `${API_BASE}/api/storage/url?key=${encodeURIComponent(icon)}&private=1`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.url) {
          setIconUrlMap((prev) => ({ ...prev, [icon]: data.url }));
        }
      } catch {
        // ignore preview errors
      }
    });
  }, [categories, iconUrlMap]);

  useEffect(() => {
    const key = editCover.trim();
    if (!key || key.startsWith("http")) return;
    if (!key.startsWith("emoji/")) return;
    if (coverUrlMap[key]) return;
    const fetchUrl = async () => {
      try {
        const res = await fetchWithAuth(
          `${API_BASE}/api/storage/url?key=${encodeURIComponent(key)}&private=1`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.url) {
          setCoverUrlMap((prev) => ({ ...prev, [key]: data.url }));
        }
      } catch {
        // ignore
      }
    };
    fetchUrl();
  }, [editCover, coverUrlMap]);

  useEffect(() => {
    const key = editIcon.trim();
    if (!key || key.startsWith("http")) return;
    if (!key.startsWith("emoji/")) return;
    if (iconUrlMap[key]) return;
    const fetchUrl = async () => {
      try {
        const res = await fetchWithAuth(
          `${API_BASE}/api/storage/url?key=${encodeURIComponent(key)}&private=1`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.url) {
          setIconUrlMap((prev) => ({ ...prev, [key]: data.url }));
        }
      } catch {
        // ignore
      }
    };
    fetchUrl();
  }, [editIcon, iconUrlMap]);

  useEffect(() => {
    setSelectedKeys((prev) => prev.filter((key) => objects.some((o) => o.key === key)));
  }, [objects]);

  const formatSize = (size: number) => {
    if (!size && size !== 0) return "-";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const formatTime = (putTime: number) => {
    if (!putTime) return "-";
    const ms = Math.floor(putTime / 10000);
    return new Date(ms).toLocaleString();
  };

  function isImage(item: StorageItem) {
    if (item.mime_type?.startsWith("image/")) return true;
    const ext = getExt(item.key);
    return ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);
  }

  function isVideo(item: StorageItem) {
    if (item.mime_type?.startsWith("video/")) return true;
    const ext = getExt(item.key);
    return ["webm", "mp4"].includes(ext);
  }

  function isGif(item: StorageItem) {
    const ext = getExt(item.key);
    if (ext === "gif") return true;
    return item.mime_type?.includes("gif");
  }

  const visibleObjects = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return objects.filter((item) => {
      if (keyword && !item.key.toLowerCase().includes(keyword)) {
        return false;
      }
      switch (typeFilter) {
        case "image":
          return isImage(item);
        case "gif":
          return isGif(item);
        case "video":
          return isVideo(item);
        case "other":
          return !isImage(item) && !isVideo(item);
        default:
          return true;
      }
    });
  }, [objects, searchTerm, typeFilter]);

  const coverCandidates = useMemo(
    () => objects.filter((item) => isImage(item) || isGif(item)),
    [objects]
  );

  const globalCoverCandidates = useMemo(() => {
    if (coverType === "video") return coverResults.filter((item) => isVideo(item));
    if (coverType === "gif") return coverResults.filter((item) => isGif(item));
    if (coverType === "image") return coverResults.filter((item) => isImage(item));
    return coverResults.filter((item) => isImage(item) || isGif(item) || isVideo(item));
  }, [coverResults, coverType]);

  const globalIconCandidates = useMemo(() => {
    if (iconType === "gif") return iconResults.filter((item) => isGif(item));
    if (iconType === "all") return iconResults;
    return iconResults.filter((item) => isImage(item));
  }, [iconResults, iconType]);

  const coverPreviewUrl = useMemo(() => {
    const value = editCover.trim();
    if (!value) return "";
    if (value.startsWith("http")) return value;
    if (coverUrlMap[value]) return coverUrlMap[value];
    const match = objects.find((item) => item.key === value);
    return match?.url || "";
  }, [editCover, objects, coverUrlMap]);

  const iconPreviewUrl = useMemo(() => {
    const value = editIcon.trim();
    if (!value) return "";
    if (value.startsWith("http")) return value;
    if (value.startsWith("emoji/")) return iconUrlMap[value] || "";
    return "";
  }, [editIcon, iconUrlMap]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const visibleKeys = visibleObjects.map((item) => item.key);
      setSelectedKeys((prev) => Array.from(new Set([...prev, ...visibleKeys])));
    } else {
      const visibleKeys = new Set(visibleObjects.map((item) => item.key));
      setSelectedKeys((prev) => prev.filter((key) => !visibleKeys.has(key)));
    }
  };

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const selectedAll =
    visibleObjects.length > 0 &&
    visibleObjects.every((item) => selectedKeys.includes(item.key));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="资源目录管理"
        description="综合展示七牛云 emoji/ 前缀下的目录与文件。"
        actions={
          enableCategoryOps ? (
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-slate-800"
              onClick={() => setFormOpen((prev) => !prev)}
            >
              {formOpen ? "收起新建" : "新建目录"}
            </button>
          ) : null
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {enableCategoryOps && formOpen && (
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-2">
            <label className="text-xs text-slate-500">目录名称</label>
            <input
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400"
              placeholder="例如：可爱猫猫"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-slate-500">Slug（可选）</label>
            <input
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400"
              placeholder="例如：cute-cats"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
            />
            <div className="text-[11px] text-slate-400">
              为空时自动从名称生成，建议使用英文短横线。
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-slate-500">图标（可选）</label>
            <input
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400"
              placeholder="例如：😺 或 icon-key"
              value={formIcon}
              onChange={(e) => setFormIcon(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-slate-500">父级目录（可选）</label>
            <select
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400"
              value={formParentId}
              onChange={(e) => setFormParentId(Number(e.target.value))}
            >
              <option value={0}>根目录</option>
              {treeItems.map((item) => (
                <option key={item.category.id} value={item.category.id}>
                  {"—".repeat(item.depth)} {item.category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-slate-500">目录前缀（可选）</label>
            <input
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400"
              placeholder="emoji/collections/cat/"
              value={formPrefix}
              onChange={(e) => setFormPrefix(e.target.value)}
            />
            <div className="text-[11px] text-slate-400">
              为空时自动使用父级前缀 + 分类 slug（根目录为 emoji/collections/&lt;分类slug&gt;/）。
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-slate-500">封面 URL（可选）</label>
            <input
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400"
              placeholder="https://..."
              value={formCover}
              onChange={(e) => setFormCover(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-slate-500">备注（可选）</label>
            <textarea
              className="min-h-[80px] rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400"
              placeholder="用于说明该目录的用途"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-400"
              onClick={createCategory}
            >
              创建目录
            </button>
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
              onClick={() => setFormOpen(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3">
            <div className="text-sm font-semibold text-slate-700">目录列表</div>
            <button
              className="text-xs text-slate-400 hover:text-slate-600"
              onClick={() => loadCategories(false)}
              disabled={loadingCategories}
            >
              {loadingCategories ? "刷新中" : "刷新"}
            </button>
          </div>
          <div className="space-y-2">
            {treeItems.map((item) => {
              const active = item.category.id === selectedId;
              return (
                <button
                  key={item.category.id}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                    active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  onClick={() => setSelectedId(item.category.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold" style={{ paddingLeft: item.depth * 12 }}>
                      {item.category.icon && (
                        <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xs">
                          {item.category.icon.startsWith("emoji/") || item.category.icon.startsWith("http") ? (
                            <img
                              src={iconUrlMap[item.category.icon] || item.category.icon}
                              alt="icon"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            item.category.icon
                          )}
                        </span>
                      )}
                      {item.category.name}
                    </div>
                    <span className="text-[10px] uppercase text-slate-400">
                      {item.category.status}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {item.category.prefix}
                  </div>
                </button>
              );
            })}
            {treeItems.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
                暂无目录
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-700">目录详情</div>
                <div className="text-xs text-slate-400">
                  {selectedCategory ? selectedCategory.prefix : "请选择目录"}
                </div>
              </div>
              {enableCategoryOps && selectedCategory && (
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                    onClick={() => deleteCategory("empty")}
                  >
                    删除空目录
                  </button>
                  <button
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                    onClick={() => deleteCategory("trash")}
                  >
                    移到回收站删除
                  </button>
                </div>
              )}
            </div>
            {selectedCategory ? (
              enableCategoryOps ? (
                <div className="mt-4 grid gap-3">
                <div className="grid gap-2">
                  <label className="text-xs text-slate-500">目录名称</label>
                  <input
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs text-slate-500">图标</label>
                  <input
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400"
                    value={editIcon}
                    onChange={(e) => setEditIcon(e.target.value)}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <button
                      className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:border-slate-300"
                      onClick={() => setIconPickerOpen((prev) => !prev)}
                    >
                      {iconPickerOpen ? "收起选择" : "从当前目录选择"}
                    </button>
                    {iconPickerOpen && (
                      <div className="flex items-center gap-1 rounded-full border border-slate-200 p-1">
                        <button
                          className={`rounded-full px-2 py-1 text-[11px] ${
                            iconSource === "current"
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-slate-500"
                          }`}
                          onClick={() => setIconSource("current")}
                        >
                          当前目录
                        </button>
                        <button
                          className={`rounded-full px-2 py-1 text-[11px] ${
                            iconSource === "global"
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-slate-500"
                          }`}
                          onClick={() => setIconSource("global")}
                        >
                          全局搜索
                        </button>
                      </div>
                    )}
                  </div>
                  {iconPreviewUrl && (
                    <div className="mt-2 h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-white">
                      <img
                        src={iconPreviewUrl}
                        alt="图标预览"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  {editIcon.trim() && !iconPreviewUrl && (
                    <div className="mt-2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-emerald-50 text-lg">
                      {editIcon.trim()}
                    </div>
                  )}
                  {iconPickerOpen && iconSource === "global" && (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                          placeholder="搜索全局图标"
                          value={iconQuery}
                          onChange={(e) => setIconQuery(e.target.value)}
                        />
                        <select
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                          value={iconType}
                          onChange={(e) => setIconType(e.target.value)}
                        >
                          <option value="image">图片</option>
                          <option value="gif">GIF</option>
                          <option value="all">全部</option>
                        </select>
                        <button
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 hover:bg-emerald-100"
                          onClick={() =>
                            searchGlobalAssets(
                              iconQuery,
                              iconType === "all" ? "all" : iconType,
                              "",
                              setIconResults,
                              setIconLoading,
                              setIconMarker,
                              setIconHasNext
                            )
                          }
                          disabled={iconLoading}
                        >
                          {iconLoading ? "搜索中" : "搜索"}
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {globalIconCandidates.slice(0, 20).map((item) => (
                          <button
                            key={item.key}
                            className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                            onClick={() => {
                              setEditIcon(item.key);
                              if (item.url) {
                                setIconUrlMap((prev) => ({ ...prev, [item.key]: item.url || "" }));
                              }
                              setIconPickerOpen(false);
                            }}
                          >
                            {item.url ? (
                              isVideo(item) ? (
                                <video
                                  src={item.url}
                                  className="h-full w-full object-cover"
                                  muted
                                  playsInline
                                />
                              ) : (
                                <img
                                  src={item.url}
                                  alt={item.key}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                              )
                            ) : (
                              <span className="px-2 text-[10px] text-slate-500">
                                {item.key.split("/").pop()}
                              </span>
                            )}
                            {item.url && (
                              <button
                                className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPreview(item);
                                }}
                              >
                                预览
                              </button>
                            )}
                          </button>
                        ))}
                        {globalIconCandidates.length === 0 && (
                          <div className="col-span-4 rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] text-slate-400">
                            没有找到合适的图标
                          </div>
                        )}
                      </div>
                      {iconHasNext && (
                        <div className="pt-2">
                          <button
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px] text-slate-600 hover:border-slate-300"
                            onClick={() =>
                              searchGlobalAssets(
                                iconQuery,
                                iconType === "all" ? "all" : iconType,
                                iconMarker,
                                setIconResults,
                                setIconLoading,
                                setIconMarker,
                                setIconHasNext,
                                true
                              )
                            }
                            disabled={iconLoading}
                          >
                            {iconLoading ? "加载中" : "加载更多"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {iconPickerOpen && iconSource === "current" && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {coverCandidates.slice(0, 20).map((item) => (
                        <button
                          key={item.key}
                          className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                          onClick={() => {
                            setEditIcon(item.key);
                            if (item.url) {
                              setIconUrlMap((prev) => ({ ...prev, [item.key]: item.url || "" }));
                            }
                            setIconPickerOpen(false);
                          }}
                        >
                          {item.url ? (
                            isVideo(item) ? (
                              <video
                                src={item.url}
                                className="h-full w-full object-cover"
                                muted
                                playsInline
                              />
                            ) : (
                              <img
                                src={item.url}
                                alt={item.key}
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                            )
                          ) : (
                            <span className="px-2 text-[10px] text-slate-500">
                              {item.key.split("/").pop()}
                            </span>
                          )}
                          {item.url && (
                            <button
                              className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPreview(item);
                              }}
                            >
                              预览
                            </button>
                          )}
                        </button>
                      ))}
                      {coverCandidates.length === 0 && (
                        <div className="col-span-4 rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] text-slate-400">
                          当前目录暂无可选图标
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <label className="text-xs text-slate-500">父级目录</label>
                  <select
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400"
                    value={editParentId}
                    onChange={(e) => setEditParentId(Number(e.target.value))}
                  >
                    <option value={0}>根目录</option>
                    {treeItems
                      .filter((item) => item.category.id !== selectedCategory.id)
                      .map((item) => (
                        <option key={item.category.id} value={item.category.id}>
                          {"—".repeat(item.depth)} {item.category.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-xs text-slate-500">状态</label>
                  <select
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="active">启用</option>
                    <option value="archived">归档</option>
                    <option value="disabled">停用</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-xs text-slate-500">封面 URL</label>
                  <input
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400"
                    value={editCover}
                    onChange={(e) => setEditCover(e.target.value)}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <button
                      className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:border-slate-300"
                      onClick={() => setCoverPickerOpen((prev) => !prev)}
                    >
                      {coverPickerOpen ? "收起选择" : "从当前目录选择"}
                    </button>
                    {coverPickerOpen && (
                      <div className="flex items-center gap-1 rounded-full border border-slate-200 p-1">
                        <button
                          className={`rounded-full px-2 py-1 text-[11px] ${
                            coverSource === "current"
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-slate-500"
                          }`}
                          onClick={() => setCoverSource("current")}
                        >
                          当前目录
                        </button>
                        <button
                          className={`rounded-full px-2 py-1 text-[11px] ${
                            coverSource === "global"
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-slate-500"
                          }`}
                          onClick={() => setCoverSource("global")}
                        >
                          全局搜索
                        </button>
                      </div>
                    )}
                    {editCover.trim() && (
                      <button
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700 hover:bg-emerald-100"
                        onClick={() =>
                          openPreview({
                            key: editCover.trim(),
                            url: coverPreviewUrl || undefined,
                          } as StorageItem)
                        }
                      >
                        预览封面
                      </button>
                    )}
                  </div>
                  {coverPreviewUrl && (
                    <div className="mt-2 h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <img
                        src={coverPreviewUrl}
                        alt="封面预览"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  {coverPickerOpen && coverSource === "global" && (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                          placeholder="搜索全局封面"
                          value={coverQuery}
                          onChange={(e) => setCoverQuery(e.target.value)}
                        />
                        <select
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                          value={coverType}
                          onChange={(e) => setCoverType(e.target.value)}
                        >
                          <option value="all">全部</option>
                          <option value="image">图片</option>
                          <option value="gif">GIF</option>
                          <option value="video">视频</option>
                        </select>
                        <button
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 hover:bg-emerald-100"
                          onClick={() =>
                            searchGlobalAssets(
                              coverQuery,
                              coverType === "all" ? "all" : coverType,
                              "",
                              setCoverResults,
                              setCoverLoading,
                              setCoverMarker,
                              setCoverHasNext
                            )
                          }
                          disabled={coverLoading}
                        >
                          {coverLoading ? "搜索中" : "搜索"}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {globalCoverCandidates.slice(0, 18).map((item) => (
                          <button
                            key={item.key}
                            className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                            onClick={() => {
                              setEditCover(item.key);
                              if (item.url) {
                                setCoverUrlMap((prev) => ({ ...prev, [item.key]: item.url || "" }));
                              }
                              setCoverPickerOpen(false);
                            }}
                          >
                            {item.url ? (
                              isVideo(item) ? (
                                <video
                                  src={item.url}
                                  className="h-full w-full object-cover"
                                  muted
                                  playsInline
                                />
                              ) : (
                                <img
                                  src={item.url}
                                  alt={item.key}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                              )
                            ) : (
                              <span className="px-2 text-[10px] text-slate-500">
                                {item.key.split("/").pop()}
                              </span>
                            )}
                            {item.url && (
                              <button
                                className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPreview(item);
                                }}
                              >
                                预览
                              </button>
                            )}
                          </button>
                        ))}
                        {globalCoverCandidates.length === 0 && (
                          <div className="col-span-3 rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] text-slate-400">
                            没有找到合适的封面
                          </div>
                        )}
                      </div>
                      {coverHasNext && (
                        <div className="pt-2">
                          <button
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px] text-slate-600 hover:border-slate-300"
                            onClick={() =>
                              searchGlobalAssets(
                                coverQuery,
                                coverType === "all" ? "all" : coverType,
                                coverMarker,
                                setCoverResults,
                                setCoverLoading,
                                setCoverMarker,
                                setCoverHasNext,
                                true
                              )
                            }
                            disabled={coverLoading}
                          >
                            {coverLoading ? "加载中" : "加载更多"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {coverPickerOpen && coverSource === "current" && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {coverCandidates.slice(0, 18).map((item) => (
                        <button
                          key={item.key}
                          className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                          onClick={() => {
                            setEditCover(item.key);
                            if (item.url) {
                              setCoverUrlMap((prev) => ({ ...prev, [item.key]: item.url || "" }));
                            }
                            setCoverPickerOpen(false);
                          }}
                        >
                          {item.url ? (
                            isVideo(item) ? (
                              <video
                                src={item.url}
                                className="h-full w-full object-cover"
                                muted
                                playsInline
                              />
                            ) : (
                              <img
                                src={item.url}
                                alt={item.key}
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                            )
                          ) : (
                            <span className="px-2 text-[10px] text-slate-500">
                              {item.key.split("/").pop()}
                            </span>
                          )}
                          {item.url && (
                            <button
                              className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPreview(item);
                              }}
                            >
                              预览
                            </button>
                          )}
                        </button>
                      ))}
                      {coverCandidates.length === 0 && (
                        <div className="col-span-3 rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] text-slate-400">
                          当前目录暂无可选封面
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <label className="text-xs text-slate-500">排序</label>
                  <input
                    type="number"
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400"
                    value={editSort}
                    onChange={(e) => setEditSort(Number(e.target.value))}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs text-slate-500">备注</label>
                  <textarea
                    className="min-h-[80px] rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-400"
                    onClick={updateCategory}
                  >
                    保存修改
                  </button>
                  <button
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
                    onClick={() => {
                      setEditName(selectedCategory.name || "");
                      setEditDesc(selectedCategory.description || "");
                      setEditCover(selectedCategory.cover_url || "");
                      setEditIcon(selectedCategory.icon || "");
                      setEditSort(selectedCategory.sort || 0);
                      setEditStatus(selectedCategory.status || "active");
                      setEditParentId(selectedCategory.parent_id || 0);
                    }}
                  >
                    重置
                  </button>
                </div>
              </div>
              ) : (
                <div className="mt-4 grid gap-3 text-sm text-slate-600">
                  <div>
                    <div className="text-xs text-slate-400">目录名称</div>
                    <div className="mt-1 font-semibold text-slate-700">
                      {selectedCategory.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">目录前缀</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {selectedCategory.prefix}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs text-slate-400">状态</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {selectedCategory.status}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">父级ID</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {selectedCategory.parent_id || "-"}
                      </div>
                    </div>
                  </div>
                  {selectedCategory.description && (
                    <div>
                      <div className="text-xs text-slate-400">备注</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {selectedCategory.description}
                      </div>
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs text-slate-400">封面</div>
                      {coverPreviewUrl ? (
                        <img
                          src={coverPreviewUrl}
                          alt="cover"
                          className="mt-2 h-20 w-20 rounded-xl border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="mt-2 text-xs text-slate-400">-</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">图标</div>
                      {iconPreviewUrl ? (
                        <img
                          src={iconPreviewUrl}
                          alt="icon"
                          className="mt-2 h-12 w-12 rounded-full border border-slate-200 object-cover"
                        />
                      ) : selectedCategory.icon ? (
                        <div className="mt-2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-emerald-50 text-lg">
                          {selectedCategory.icon}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-slate-400">-</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
                请选择目录查看详情
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div>
                <div className="text-sm font-semibold text-slate-700">文件列表</div>
                <div className="text-xs text-slate-400">
                  {selectedCategory ? selectedCategory.prefix : "请先选择一个目录"}
                </div>
              </div>
              {selectedCategory && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                    placeholder="搜索文件名"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">全部类型</option>
                    <option value="image">图片</option>
                    <option value="gif">GIF</option>
                    <option value="video">视频</option>
                    <option value="other">其他</option>
                  </select>
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value)}
                  >
                    <option value="time">时间</option>
                    <option value="size">大小</option>
                    <option value="key">名称</option>
                  </select>
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  >
                    <option value="desc">降序</option>
                    <option value="asc">升序</option>
                  </select>
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    <option value={50}>50 条</option>
                    <option value={100}>100 条</option>
                    <option value={200}>200 条</option>
                  </select>
                  <button
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
                    onClick={() => loadObjects(true)}
                    disabled={loadingObjects}
                  >
                    {loadingObjects ? "加载中" : "刷新"}
                  </button>
                  {selectedKeys.length > 0 && (
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
                      已选 {selectedKeys.length}
                      <button
                        className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700 hover:bg-amber-100"
                        onClick={() => bulkOperate("trash")}
                      >
                        回收站
                      </button>
                      <button
                        className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-600 hover:bg-red-100"
                        onClick={() => bulkOperate("delete")}
                      >
                        彻底删除
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedCategory && (
              <div className="flex items-center gap-2 pb-3 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={selectedAll}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
                <span>全选可见项</span>
              </div>
            )}

            <div className="space-y-3">
              {visibleObjects.map((item) => {
                const relative = selectedCategory
                  ? item.key.replace(selectedCategory.prefix, "")
                  : item.key;
                return (
                  <div
                    key={item.key}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex min-w-[240px] flex-1 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedKeys.includes(item.key)}
                        onChange={() => toggleSelect(item.key)}
                      />
                      <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        {item.url && isImage(item) && (
                          <img
                            src={item.url}
                            alt={relative}
                            className="h-full w-full object-cover"
                          />
                        )}
                        {item.url && !isImage(item) && isVideo(item) && (
                          <video
                            src={item.url}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                          />
                        )}
                        {(!item.url || (!isImage(item) && !isVideo(item))) && (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                            FILE
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-700">
                          {relative || item.key}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          {formatSize(item.fsize)} · {formatTime(item.put_time)} · {item.mime_type}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:border-slate-300"
                        onClick={() => openPreview(item)}
                      >
                        预览
                      </button>
                      <button
                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] text-amber-700 hover:bg-amber-100"
                        onClick={() => deleteObject(item.key, "trash")}
                      >
                        回收站
                      </button>
                      <button
                        className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] text-red-600 hover:bg-red-100"
                        onClick={() => deleteObject(item.key, "delete")}
                      >
                        彻底删除
                      </button>
                    </div>
                  </div>
                );
              })}
              {objects.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
                  {selectedCategory ? "该目录下暂无文件" : "请选择目录查看文件"}
                </div>
              )}
              {objects.length > 0 && visibleObjects.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
                  没有匹配的文件
                </div>
              )}
            </div>

            {hasNext && (
              <div className="mt-4 flex justify-center">
                <button
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
                  onClick={() => loadObjects(false)}
                  disabled={loadingObjects}
                >
                  {loadingObjects ? "加载中" : "加载更多"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildTree(categories: Category[]): TreeItem[] {
  const map = new Map<number, Category[]>();
  const roots: Category[] = [];
  for (const cat of categories) {
    if (cat.parent_id) {
      const list = map.get(cat.parent_id) || [];
      list.push(cat);
      map.set(cat.parent_id, list);
    } else {
      roots.push(cat);
    }
  }
  const sortFn = (a: Category, b: Category) => {
    if (a.sort !== b.sort) return a.sort - b.sort;
    return a.id - b.id;
  };
  roots.sort(sortFn);
  for (const list of map.values()) {
    list.sort(sortFn);
  }

  const result: TreeItem[] = [];
  const visit = (node: Category, depth: number, seen: Set<number>) => {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    result.push({ category: node, depth });
    const children = map.get(node.id) || [];
    for (const child of children) {
      visit(child, depth + 1, seen);
    }
  };
  const seen = new Set<number>();
  for (const root of roots) {
    visit(root, 0, seen);
  }
  return result;
}

function getExt(key: string) {
  const parts = key.split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1].toLowerCase();
}
