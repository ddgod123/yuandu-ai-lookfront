"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import Link from "next/link";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type Collection = {
  id: number;
  title: string;
  slug: string;
  description?: string;
  cover_url?: string;
  owner_id: number;
  category_id?: number | null;
  ip_id?: number | null;
  theme_id?: number | null;
  source?: string;
  qiniu_prefix?: string;
  file_count?: number;
  is_featured?: boolean;
  is_pinned?: boolean;
  pinned_at?: string | null;
  visibility?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  tags?: { id: number; name: string; slug: string }[];
};

type CollectionListResponse = {
  items: Collection[];
  total: number;
};

type Category = {
  id: number;
  name: string;
  parent_id?: number | null;
  sort?: number;
};

type Theme = {
  id: number;
  name: string;
};

type IPItem = {
  id: number;
  name: string;
  slug: string;
  cover_url?: string;
  category_id?: number | null;
  status?: string;
};

type Tag = {
  id: number;
  name: string;
  slug: string;
  group_id?: number | null;
  group_name?: string;
};

type TagGroup = {
  id: number;
  name: string;
  slug: string;
  sort: number;
  status: string;
};

type TagSection = {
  id: number;
  name: string;
  tags: Tag[];
};

export default function Page() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [ips, setIps] = useState<IPItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [selectedTopId, setSelectedTopId] = useState<number | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [collectionEditOpen, setCollectionEditOpen] = useState(false);
  const [collectionEditing, setCollectionEditing] = useState<Collection | null>(null);
  const [collectionTitle, setCollectionTitle] = useState("");
  const [collectionDesc, setCollectionDesc] = useState("");
  const [collectionCover, setCollectionCover] = useState("");
  const [collectionStatus, setCollectionStatus] = useState("active");
  const [collectionVisibility, setCollectionVisibility] = useState("public");
  const [collectionCategoryId, setCollectionCategoryId] = useState<number>(0);
  const [collectionIPId, setCollectionIPId] = useState<number>(0);
  const [collectionThemeId, setCollectionThemeId] = useState<number>(0);
  const [collectionFeatured, setCollectionFeatured] = useState(false);
  const [collectionPinned, setCollectionPinned] = useState(false);
  const [collectionTagIds, setCollectionTagIds] = useState<number[]>([]);
  const [collectionTagFilter, setCollectionTagFilter] = useState("");
  const [collectionTagGroupFilter, setCollectionTagGroupFilter] = useState<number>(0);
  const [collectionSaving, setCollectionSaving] = useState(false);
  const [deletingCollectionId, setDeletingCollectionId] = useState<number | null>(null);

  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [coverQuery, setCoverQuery] = useState("");
  const [coverType, setCoverType] = useState("image");
  const [coverResults, setCoverResults] = useState<{ key: string; url?: string }[]>([]);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverMarker, setCoverMarker] = useState("");
  const [coverHasNext, setCoverHasNext] = useState(false);
  const [coverUrlMap, setCoverUrlMap] = useState<Record<string, string>>({});

  const sortCategory = (a: Category, b: Category) => {
    const aSort = a.sort ?? 0;
    const bSort = b.sort ?? 0;
    if (aSort !== bSort) return aSort - bSort;
    return a.id - b.id;
  };

  const topCategories = useMemo(
    () => categories.filter((cat) => !cat.parent_id).sort(sortCategory),
    [categories]
  );

  const childCategoryMap = useMemo(() => {
    const map = new Map<number, Category[]>();
    for (const cat of categories) {
      if (!cat.parent_id) continue;
      const list = map.get(cat.parent_id) || [];
      list.push(cat);
      map.set(cat.parent_id, list);
    }
    for (const list of map.values()) {
      list.sort(sortCategory);
    }
    return map;
  }, [categories]);

  const selectedChildren = useMemo(() => {
    if (!selectedTopId) return [];
    return childCategoryMap.get(selectedTopId) || [];
  }, [childCategoryMap, selectedTopId]);

  const treeItems = useMemo(() => buildTree(categories), [categories]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const cat of categories) {
      map.set(cat.id, cat.name);
    }
    return map;
  }, [categories]);

  const themeMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const theme of themes) {
      map.set(theme.id, theme.name);
    }
    return map;
  }, [themes]);

  const ipMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const ip of ips) {
      map.set(ip.id, ip.name);
    }
    return map;
  }, [ips]);


  const groupedCollectionTags = useMemo<TagSection[]>(() => {
    const keyword = collectionTagFilter.trim().toLowerCase();
    const filtered = tags.filter((tag) => {
      if (collectionTagGroupFilter && (tag.group_id || 0) !== collectionTagGroupFilter) {
        return false;
      }
      if (!keyword) return true;
      return (
        tag.name.toLowerCase().includes(keyword) ||
        tag.slug.toLowerCase().includes(keyword)
      );
    });

    if (!tagGroups.length) {
      const sections: TagSection[] = [];
      const map = new Map<string, Tag[]>();
      const order: string[] = [];
      for (const tag of filtered) {
        const name = tag.group_name?.trim() || "未分类";
        if (!map.has(name)) {
          map.set(name, []);
          order.push(name);
        }
        map.get(name)?.push(tag);
      }
      for (const name of order) {
        sections.push({
          id: name === "未分类" ? 0 : -1,
          name,
          tags: map.get(name) || [],
        });
      }
      return sections;
    }

    const grouped = new Map<number, Tag[]>();
    const ungrouped: Tag[] = [];
    for (const tag of filtered) {
      const gid = tag.group_id || 0;
      if (!gid) {
        ungrouped.push(tag);
        continue;
      }
      const bucket = grouped.get(gid) || [];
      bucket.push(tag);
      grouped.set(gid, bucket);
    }

    const sections: TagSection[] = [];
    for (const group of tagGroups) {
      const bucket = grouped.get(group.id);
      if (bucket && bucket.length) {
        sections.push({ id: group.id, name: group.name, tags: bucket });
      }
    }
    if (ungrouped.length) {
      sections.push({ id: 0, name: "未分类", tags: ungrouped });
    }
    return sections;
  }, [tags, tagGroups, collectionTagFilter, collectionTagGroupFilter]);

  const loadCategories = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/categories`);
      if (!res.ok) return;
      const data = (await res.json()) as Category[];
      setCategories(data);
      if (data.length) {
        const tops = data.filter((cat) => !cat.parent_id).sort(sortCategory);
        // 保留当前选择，若已失效则清空，不再默认选中首个分类，避免列表被意外过滤
        setSelectedTopId((prev) =>
          prev && tops.some((cat) => cat.id === prev) ? prev : null
        );
        setSelectedChildId((prev) =>
          prev && data.some((cat) => cat.id === prev) ? prev : null
        );
      } else {
        setSelectedTopId(null);
        setSelectedChildId(null);
      }
    } catch {
      // ignore category errors for list rendering
    }
  };

  const loadThemes = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/themes`);
      if (!res.ok) return;
      const data = (await res.json()) as Theme[];
      setThemes(data);
    } catch {
      // ignore theme errors for list rendering
    }
  };

  const loadIps = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ips`);
      if (!res.ok) return;
      const data = (await res.json()) as IPItem[];
      setIps(data);
    } catch {
      // ignore ip errors for list rendering
    }
  };

  const loadTags = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/tags`);
      if (!res.ok) return;
      const data = (await res.json()) as Tag[];
      setTags(data);
    } catch {
      // ignore tag errors for list rendering
    }
  };

  const loadTagGroups = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/tag-groups`);
      if (!res.ok) return;
      const data = (await res.json()) as TagGroup[];
      setTagGroups(data);
    } catch {
      // ignore group errors
    }
  };

  const loadCollections = async (
    pageValue = page,
    sizeValue = pageSize,
    topValue = selectedTopId,
    childValue = selectedChildId
  ) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set("page", String(pageValue));
      query.set("page_size", String(sizeValue));
      if (childValue) {
        query.set("category_id", String(childValue));
      } else if (topValue) {
        const children = childCategoryMap.get(topValue) || [];
        if (children.length) {
          query.set(
            "category_ids",
            children.map((item) => item.id).join(",")
          );
        } else {
          query.set("category_id", String(topValue));
        }
      }
      const res = await fetchWithAuth(`${API_BASE}/api/collections?${query.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as CollectionListResponse;
      setCollections(data.items || []);
      setTotal(data.total || 0);
      await hydrateCoverUrls(data.items || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const hydrateCoverUrls = async (items: Collection[]) => {
    const keys = items
      .map((item) => item.cover_url || "")
      .filter((key) => key && !key.startsWith("http") && !coverUrlMap[key]);
    const uniqueKeys = Array.from(new Set(keys));
    if (!uniqueKeys.length) return;
    const entries = await Promise.all(
      uniqueKeys.map(async (key) => {
        try {
          const res = await fetchWithAuth(
            `${API_BASE}/api/storage/url?key=${encodeURIComponent(key)}`
          );
          if (!res.ok) return null;
          const data = (await res.json()) as { url?: string };
          if (!data?.url) return null;
          return [key, data.url] as const;
        } catch {
          return null;
        }
      })
    );
    const map: Record<string, string> = {};
    entries.forEach((entry) => {
      if (entry) {
        map[entry[0]] = entry[1];
      }
    });
    if (Object.keys(map).length) {
      setCoverUrlMap((prev) => ({ ...prev, ...map }));
    }
  };

  const resolveCoverUrl = (item: Collection) => {
    const cover = item.cover_url || "";
    if (!cover) return "";
    if (cover.startsWith("http")) return cover;
    return coverUrlMap[cover] || "";
  };

  // 初始化基础字典数据
  useEffect(() => {
    loadCategories();
    loadThemes();
    loadIps();
    loadTags();
    loadTagGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 仅根据筛选条件和分页变化拉取列表
  useEffect(() => {
    loadCollections(page, pageSize, selectedTopId, selectedChildId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, selectedTopId, selectedChildId, childCategoryMap]);

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const openCollectionEdit = (collection: Collection) => {
    setCollectionEditing(collection);
    setCollectionTitle(collection.title || "");
    setCollectionDesc(collection.description || "");
    setCollectionCover(collection.cover_url || "");
    setCollectionStatus(collection.status || "active");
    setCollectionVisibility(collection.visibility || "public");
    setCollectionCategoryId(collection.category_id || 0);
    setCollectionIPId(collection.ip_id || 0);
    setCollectionThemeId(collection.theme_id || 0);
    setCollectionFeatured(Boolean(collection.is_featured));
    setCollectionPinned(Boolean(collection.is_pinned));
    setCollectionTagIds(collection.tags?.map((tag) => tag.id) || []);
    setCollectionTagFilter("");
    setCollectionTagGroupFilter(0);
    setCoverPickerOpen(false);
    setCoverQuery("");
    setCoverResults([]);
    setCoverMarker("");
    setCoverHasNext(false);
    setCollectionSaving(false);
    setCollectionEditOpen(true);
  };

  const closeCollectionEdit = () => {
    setCollectionEditOpen(false);
    setCollectionEditing(null);
  };

  const toggleCollectionTag = (id: number) => {
    setCollectionTagIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const saveCollection = async () => {
    if (!collectionEditing) return;
    if (!collectionTitle.trim()) {
      setError("请输入合集标题");
      return;
    }
    setCollectionSaving(true);
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/collections/${collectionEditing.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: collectionTitle.trim(),
            description: collectionDesc.trim(),
            cover_url: collectionCover.trim(),
            status: collectionStatus,
            visibility: collectionVisibility,
            category_id: collectionCategoryId || null,
            ip_id: collectionIPId || null,
            theme_id: collectionThemeId || null,
            is_featured: collectionFeatured,
            is_pinned: collectionPinned,
            tag_ids: collectionTagIds,
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      await loadCollections(page, pageSize, selectedTopId, selectedChildId);
      setCollectionEditOpen(false);
      setCollectionEditing(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "更新失败";
      setError(message);
    } finally {
      setCollectionSaving(false);
    }
  };

  const hardDeleteCollection = async (item: Collection) => {
    if (deletingCollectionId) return;
    const confirmName = window.prompt(`输入合集标题确认删除：${item.title}`);
    if (confirmName === null) return;
    if (confirmName.trim() !== (item.title || "").trim()) {
      setError("名称不匹配，已取消删除");
      return;
    }
    if (!window.confirm("该操作会硬删除该合集及其七牛云全部文件，是否继续？")) {
      return;
    }

    setDeletingCollectionId(item.id);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/collections/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const raw = (await res.text()).trim();
        throw new Error(raw || "删除失败");
      }

      const nextPage = collections.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) {
        setPage(nextPage);
      }
      await loadCollections(nextPage, pageSize, selectedTopId, selectedChildId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "删除失败";
      setError(message);
    } finally {
      setDeletingCollectionId(null);
    }
  };

  const coverPreviewUrl = useMemo(() => {
    if (!collectionCover) return "";
    if (!isImageFile(collectionCover)) return "";
    if (collectionCover.startsWith("http")) return collectionCover;
    return coverUrlMap[collectionCover] || "";
  }, [collectionCover, coverUrlMap]);

  useEffect(() => {
    const fetchDirectUrl = async () => {
      if (!collectionCover) return;
      if (!isImageFile(collectionCover)) return;
      if (collectionCover.startsWith("http")) return;
      if (coverUrlMap[collectionCover]) return;
      try {
        const res = await fetchWithAuth(
          `${API_BASE}/api/storage/url?key=${encodeURIComponent(collectionCover)}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as { url?: string };
        if (data.url) {
          setCoverUrlMap((prev) => ({ ...prev, [collectionCover]: data.url! }));
        }
      } catch {
        // ignore
      }
    };
    fetchDirectUrl();
  }, [collectionCover, coverUrlMap, setCoverUrlMap]);

  const searchCoverAssets = async (
    keyword: string,
    type: string,
    marker: string,
    append = false
  ) => {
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
      setCoverHasNext(data.has_next);
      const map: Record<string, string> = {};
      for (const item of data.items || []) {
        if (item.url) map[item.key] = item.url;
      }
      if (Object.keys(map).length > 0) {
        setCoverUrlMap((prev) => ({ ...prev, ...map }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "搜索失败";
      setError(message);
    } finally {
      setCoverLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="表情包合集"
        description="查看合集数据、封面与发布状态。"
        actions={
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
            onClick={() => loadCollections(page, pageSize, selectedTopId, selectedChildId)}
            disabled={loading}
          >
            {loading ? "加载中..." : "刷新"}
          </button>
        }
      />

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-slate-100 bg-white p-5">
        <div className="sticky top-4 z-20 mb-4 rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="text-xs font-semibold text-slate-400">一级分类</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {topCategories.map((item) => {
              const active = item.id === selectedTopId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedTopId(item.id);
                    setSelectedChildId(null);
                    setPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
            {!topCategories.length && (
              <div className="text-xs text-slate-400">暂无一级分类</div>
            )}
          </div>
          <div className="mt-4 text-xs font-semibold text-slate-400">二级分类</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedChildren.map((item) => {
              const active = item.id === selectedChildId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedChildId(item.id);
                    setPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-emerald-500 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
            {!selectedChildren.length && (
              <div className="text-xs text-slate-400">
                {selectedTopId ? "该一级分类暂无二级分类" : "请先选择一级分类"}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-sm font-semibold text-slate-700">
            合集列表
            <span className="ml-2 text-xs text-slate-400">共 {total} 条</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>每页</span>
            <select
              className="rounded-xl border border-slate-100 bg-white px-3 py-1 text-xs text-slate-600"
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">标题</th>
                <th className="px-4 py-3">首图</th>
                <th className="px-4 py-3">分类</th>
                <th className="px-4 py-3">主题</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">标签</th>
                <th className="px-4 py-3">推荐/置顶</th>
                <th className="px-4 py-3">文件数</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">可见性</th>
                <th className="px-4 py-3">创建时间</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {collections.map((item) => (
                <tr key={item.id} className="text-slate-700">
                  <td className="px-4 py-3">{item.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{item.title}</div>
                    <div className="text-xs text-slate-400">{item.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white flex items-center justify-center">
                      {resolveCoverUrl(item) ? (
                        <CoverThumb
                          key={`${item.id}-${item.cover_url || ""}-${item.qiniu_prefix || ""}`}
                          url={resolveCoverUrl(item)}
                          alt={item.title}
                          coverKey={item.cover_url || ""}
                          qiniuPrefix={item.qiniu_prefix}
                        />
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.category_id ? (
                      <span className="text-xs text-slate-600">
                        {categoryMap.get(item.category_id) || `#${item.category_id}`}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.theme_id ? (
                      <span className="text-xs text-slate-600">
                        {themeMap.get(item.theme_id) || `#${item.theme_id}`}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.ip_id ? (
                      <span className="text-xs text-slate-600">
                        {ipMap.get(item.ip_id) || `#${item.ip_id}`}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.tags && item.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 6).map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600"
                          >
                            {tag.name}
                          </span>
                        ))}
                        {item.tags.length > 6 && (
                          <span className="text-[11px] text-slate-400">
                            +{item.tags.length - 6}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.is_featured && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                          推荐
                        </span>
                      )}
                      {item.is_pinned && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                          置顶
                        </span>
                      )}
                      {!item.is_featured && !item.is_pinned && (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{item.file_count ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{item.status || "-"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {item.visibility || "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-slate-300"
                        onClick={() => openCollectionEdit(item)}
                      >
                        编辑合集
                      </button>
                      <Link
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-slate-300"
                        href={`/admin/archive/collections/${item.id}/emojis`}
                      >
                        编辑表情
                      </Link>
                      <button
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => hardDeleteCollection(item)}
                        disabled={deletingCollectionId === item.id}
                      >
                        {deletingCollectionId === item.id ? "删除中..." : "删除合集"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!collections.length && (
                <tr>
                  <td colSpan={13} className="px-4 py-6 text-center text-sm text-slate-400">
                    暂无合集
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            第 {page} / {totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-300"
              onClick={handlePrev}
              disabled={page <= 1}
            >
              上一页
            </button>
            <button
              className="rounded-xl border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-300"
              onClick={handleNext}
              disabled={page >= totalPages}
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={collectionEditOpen && !!collectionEditing}
        title={`编辑合集：${collectionEditing?.title || ""}`}
        onClose={closeCollectionEdit}
        widthClass="max-w-4xl"
      >
        <div className="mt-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs text-slate-400">标题</div>
              <input
                className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                value={collectionTitle}
                onChange={(e) => setCollectionTitle(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-slate-400">分类</div>
              <select
                className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                value={collectionCategoryId}
                onChange={(e) => setCollectionCategoryId(Number(e.target.value))}
              >
                <option value={0}>未选择</option>
                {treeItems.map((item) => {
                  // 检查是否有子分类
                  const hasChildren = categories.some(
                    (c) => c.parent_id === item.category.id
                  );
                  return (
                    <option
                      key={item.category.id}
                      value={item.category.id}
                      disabled={hasChildren}
                      style={hasChildren ? { color: '#94a3b8', fontStyle: 'italic' } : {}}
                    >
                      {"— ".repeat(item.depth)}
                      {item.category.name}
                      {hasChildren ? ' (请选择子分类)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <div className="text-xs text-slate-400">主题</div>
              <select
                className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                value={collectionThemeId}
                onChange={(e) => setCollectionThemeId(Number(e.target.value))}
              >
                <option value={0}>未选择</option>
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-xs text-slate-400">IP</div>
              <select
                className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                value={collectionIPId}
                onChange={(e) => setCollectionIPId(Number(e.target.value))}
              >
                <option value={0}>未选择</option>
                {ips.map((ip) => (
                  <option key={ip.id} value={ip.id}>
                    {ip.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-slate-400">描述</div>
              <textarea
                className="mt-2 min-h-[88px] w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                value={collectionDesc}
                onChange={(e) => setCollectionDesc(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-slate-400">封面URL（可选）</div>
              <input
                className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                value={collectionCover}
                onChange={(e) => setCollectionCover(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <button
                  className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:border-slate-300"
                  onClick={() => setCoverPickerOpen((prev) => !prev)}
                  type="button"
                >
                  {coverPickerOpen ? "收起选择" : "从七牛选择"}
                </button>
                {coverPreviewUrl && (
                  <span className="text-[11px] text-emerald-700">已选择封面</span>
                )}
              </div>
              {coverPreviewUrl && (
                <div className="mt-3 h-32 w-32 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <CoverThumb
                    key={`${collectionEditing?.id || 0}-${collectionCover}-${coverPreviewUrl}`}
                    url={coverPreviewUrl}
                    alt="cover"
                    coverKey={collectionCover}
                    qiniuPrefix={collectionEditing?.qiniu_prefix}
                  />
                </div>
              )}
              {coverPickerOpen && (
                <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                      placeholder="搜索封面关键词"
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
                      disabled={coverLoading}
                    >
                      {coverLoading ? "搜索中" : "搜索"}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {coverResults.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white"
                        onClick={() => {
                          setCollectionCover(item.key);
                          if (item.url) {
                            setCoverUrlMap((prev) => ({ ...prev, [item.key]: item.url || "" }));
                          }
                          setCoverPickerOpen(false);
                        }}
                      >
                        {item.url ? (
                          item.url.endsWith(".mp4") || item.url.endsWith(".webm") ? (
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
                      </button>
                    ))}
                    {coverResults.length === 0 && (
                      <div className="col-span-4 rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] text-slate-400">
                        暂无封面结果
                      </div>
                    )}
                  </div>
                  {coverHasNext && (
                    <div className="pt-2">
                      <button
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px] text-slate-600 hover:border-slate-300"
                        onClick={() => searchCoverAssets(coverQuery, coverType, coverMarker, true)}
                        disabled={coverLoading}
                      >
                        {coverLoading ? "加载中" : "加载更多"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-slate-400">推荐 / 置顶</div>
              <div className="mt-2 flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={collectionFeatured}
                    onChange={(e) => setCollectionFeatured(e.target.checked)}
                  />
                  推荐
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={collectionPinned}
                    onChange={(e) => setCollectionPinned(e.target.checked)}
                  />
                  置顶
                </label>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">状态</div>
              <select
                className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                value={collectionStatus}
                onChange={(e) => setCollectionStatus(e.target.value)}
              >
                <option value="active">active</option>
                <option value="pending">pending</option>
                <option value="disabled">disabled</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-slate-400">可见性</div>
              <select
                className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                value={collectionVisibility}
                onChange={(e) => setCollectionVisibility(e.target.value)}
              >
                <option value="public">public</option>
                <option value="private">private</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-slate-400">标签（可多选）</div>
              <div className="mt-2 grid gap-2 md:grid-cols-[1fr_180px]">
                <input
                  className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                  placeholder="筛选标签"
                  value={collectionTagFilter}
                  onChange={(e) => setCollectionTagFilter(e.target.value)}
                />
                <select
                  className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                  value={collectionTagGroupFilter}
                  onChange={(e) => setCollectionTagGroupFilter(Number(e.target.value))}
                >
                  <option value={0}>全部分类</option>
                  {tagGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3">
                {groupedCollectionTags.map((section) => (
                  <div key={`${section.id}-${section.name}`} className="mb-4 last:mb-0">
                    <div className="mb-2 text-xs font-semibold text-slate-500">
                      {section.name}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {section.tags.map((tag) => {
                        const active = collectionTagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleCollectionTag(tag.id)}
                            className={`rounded-full border px-3 py-1 text-xs transition ${
                              active
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {!groupedCollectionTags.length && (
                  <div className="text-xs text-slate-400">暂无标签</div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 bg-white pt-4">
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            onClick={saveCollection}
            disabled={collectionSaving}
          >
            {collectionSaving ? "保存中..." : "保存"}
          </button>
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:border-slate-300"
            onClick={closeCollectionEdit}
          >
            取消
          </button>
        </div>
      </Modal>
    </div>
  );
}

type TreeItem = {
  category: Category;
  depth: number;
};

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
    const aSort = a.sort ?? 0;
    const bSort = b.sort ?? 0;
    if (aSort !== bSort) return aSort - bSort;
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

function isAnimatedImage(value: string) {
  const clean = (value || "").split("?")[0].split("#")[0].toLowerCase();
  return clean.endsWith(".gif") || clean.endsWith(".webp");
}

function isImageFile(value: string) {
  const clean = (value || "").split("?")[0].split("#")[0].toLowerCase();
  return /\.(jpe?g|png|gif|webp)$/.test(clean);
}

function buildStaticPreview(url: string) {
  const val = (url || "").trim();
  if (!val.startsWith("http://") && !val.startsWith("https://")) return "";
  if (val.includes("token=") || val.includes("e=")) return "";
  const separator = val.includes("?") ? "&" : "?";
  return `${val}${separator}imageMogr2/format/png`;
}

function buildCoverSources(url: string, key: string) {
  const animated = isAnimatedImage(url) || isAnimatedImage(key);
  // 对于部分自签证书的 CDN（例如 cdn.smartrent.xin），优先使用 http，https 作为兜底
  const preferHttpDomains = ["cdn.smartrent.xin"];
  const normalize = (u: string) => {
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("//")) return `https:${u}`;
    return u;
  };

  let primary = normalize(url);
  if (primary.startsWith("https://")) {
    const host = primary.split("://")[1]?.split("/")[0] || "";
    if (preferHttpDomains.includes(host)) {
      primary = `http://${primary.slice(8)}`;
    }
  }

  if (!animated) {
    return { primary, fallback: "" };
  }
  const staticUrl = buildStaticPreview(primary);
  if (staticUrl && staticUrl !== primary) {
    return { primary: staticUrl, fallback: primary };
  }
  return { primary, fallback: "" };
}

function CoverThumb({
  url,
  alt,
  coverKey,
  qiniuPrefix,
}: {
  url: string;
  alt: string;
  coverKey: string;
  qiniuPrefix?: string;
}) {
  const { primary, fallback } = useMemo(
    () => buildCoverSources(url, coverKey),
    [url, coverKey]
  );
  const [currentSrc, setCurrentSrc] = useState(primary);
  const [swapped, setSwapped] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const triedPrefix = useRef(false);

  useEffect(() => {
    triedPrefix.current = false;
    // 若 primary 为空但有前缀，主动拉取前缀首图
    if (!primary && qiniuPrefix) {
      triedPrefix.current = true;
      fetchFirstImageFromPrefix(qiniuPrefix).then((altUrl) => {
        if (altUrl) setCurrentSrc(altUrl);
      });
    }
  }, [primary, qiniuPrefix]);

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
    if (fallback && !usedFallback) {
      setCurrentSrc(fallback);
      setSwapped(false);
      setUsedFallback(true);
      return;
    }
    if (!triedPrefix.current && qiniuPrefix) {
      triedPrefix.current = true;
      fetchFirstImageFromPrefix(qiniuPrefix).then((altUrl) => {
        if (altUrl) {
          setCurrentSrc(altUrl);
        } else {
          setCurrentSrc("");
        }
      });
      return;
    }
    setCurrentSrc("");
  };

  if (!currentSrc) {
    return <span className="text-xs text-slate-400">-</span>;
  }

  return (
    <div className="h-full w-full overflow-hidden bg-slate-50 flex items-center justify-center">
      <img
        src={currentSrc}
        alt={alt}
        className="max-h-full max-w-full object-contain"
        loading="lazy"
        onError={handleError}
      />
    </div>
  );
}

async function fetchFirstImageFromPrefix(prefix: string): Promise<string | null> {
  try {
    const query = new URLSearchParams({ prefix, limit: "50" });
    const listRes = await fetchWithAuth(`${API_BASE}/api/storage/objects?${query.toString()}`);
    if (!listRes.ok) return null;
    const listData = (await listRes.json()) as { items?: { key: string }[] };
    const items = listData.items || [];
    const isImg = (k: string) => /\.(jpe?g|png|gif|webp)$/i.test(k.split("?")[0]);
    const hit = items.find((i) => isImg(i.key));
    if (!hit) return null;
    const urlRes = await fetchWithAuth(
      `${API_BASE}/api/storage/url?key=${encodeURIComponent(hit.key)}`
    );
    if (!urlRes.ok) return null;
    const urlData = (await urlRes.json()) as { url?: string };
    return urlData.url || null;
  } catch {
    return null;
  }
}

function Modal({
  open,
  title,
  onClose,
  widthClass,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  widthClass?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClass || "max-w-lg"} rounded-3xl bg-white p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">{title}</div>
          <button
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-slate-300"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
