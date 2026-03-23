"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import Link from "next/link";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";
import { 
  RefreshCw, 
  ChevronDown, 
  Edit3, 
  Image as ImageIcon, 
  Trash2, 
  LayoutGrid,
  Tag as TagIcon,
  Layers,
  User,
  Clock,
  Eye,
  AlertTriangle,
  FileText,
  Star,
  ArrowUpCircle,
  List,
  Download
} from "lucide-react";

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
  path_mismatch?: boolean;
  file_count?: number;
  is_featured?: boolean;
  is_pinned?: boolean;
  is_sample?: boolean;
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

type CollectionIPStatItem = {
  ip_id?: number | null;
  ip_name: string;
  count: number;
};

type CollectionIPStatsResponse = {
  total: number;
  items: CollectionIPStatItem[];
};

type CollectionIPAuditLogItem = {
  id: number;
  admin_id: number;
  admin_name?: string;
  collection_id: number;
  collection_title?: string;
  old_ip_id?: number | null;
  old_ip_name?: string;
  new_ip_id?: number | null;
  new_ip_name?: string;
  created_at: string;
};

type CollectionIPAuditLogsResponse = {
  total: number;
  items: CollectionIPAuditLogItem[];
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
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "featured">("all");
  const [sampleFilter, setSampleFilter] = useState<"all" | "sample">("all");
  const [selectedIPFilter, setSelectedIPFilter] = useState<number>(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingIPStats, setLoadingIPStats] = useState(false);
  const [loadingIPAuditLogs, setLoadingIPAuditLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ipStats, setIPStats] = useState<CollectionIPStatItem[]>([]);
  const [ipAuditLogs, setIPAuditLogs] = useState<CollectionIPAuditLogItem[]>([]);

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
  const [collectionSample, setCollectionSample] = useState(false);
  const [collectionTagIds, setCollectionTagIds] = useState<number[]>([]);
  const [collectionTagFilter, setCollectionTagFilter] = useState("");
  const [collectionTagGroupFilter, setCollectionTagGroupFilter] = useState<number>(0);
  const [collectionSaving, setCollectionSaving] = useState(false);
  const [deletingCollectionId, setDeletingCollectionId] = useState<number | null>(null);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>([]);
  const [batchSampleSaving, setBatchSampleSaving] = useState(false);
  const [batchIPSaving, setBatchIPSaving] = useState(false);
  const [batchTargetIPId, setBatchTargetIPId] = useState<number>(0);
  const [exportingSamples, setExportingSamples] = useState(false);

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
  const selectedIdSet = useMemo(() => new Set(selectedCollectionIds), [selectedCollectionIds]);
  const allCurrentPageSelected = useMemo(
    () => collections.length > 0 && collections.every((item) => selectedIdSet.has(item.id)),
    [collections, selectedIdSet]
  );
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
    childValue = selectedChildId,
    featuredValue = featuredFilter,
    sampleValue = sampleFilter,
    ipFilterValue = selectedIPFilter
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
      if (featuredValue === "featured") {
        query.set("is_featured", "1");
      }
      if (sampleValue === "sample") {
        query.set("is_sample", "1");
      }
      if (ipFilterValue === -1) {
        query.set("ip_id", "0");
      } else if (ipFilterValue > 0) {
        query.set("ip_id", String(ipFilterValue));
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

  const loadCollectionIPStats = async (
    topValue = selectedTopId,
    childValue = selectedChildId,
    featuredValue = featuredFilter,
    sampleValue = sampleFilter
  ) => {
    setLoadingIPStats(true);
    try {
      const query = new URLSearchParams();
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
      if (featuredValue === "featured") {
        query.set("is_featured", "1");
      }
      if (sampleValue === "sample") {
        query.set("is_sample", "1");
      }
      const res = await fetchWithAuth(`${API_BASE}/api/admin/collections/ip-stats?${query.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as CollectionIPStatsResponse;
      setIPStats(Array.isArray(data.items) ? data.items : []);
    } catch {
      setIPStats([]);
    } finally {
      setLoadingIPStats(false);
    }
  };

  const loadCollectionIPAuditLogs = async (limit = 20) => {
    setLoadingIPAuditLogs(true);
    try {
      const query = new URLSearchParams();
      query.set("limit", String(limit));
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/collections/ip-audit-logs?${query.toString()}`
      );
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as CollectionIPAuditLogsResponse;
      setIPAuditLogs(Array.isArray(data.items) ? data.items : []);
    } catch {
      setIPAuditLogs([]);
    } finally {
      setLoadingIPAuditLogs(false);
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
    loadCollectionIPAuditLogs(20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 仅根据筛选条件和分页变化拉取列表
  useEffect(() => {
    loadCollections(page, pageSize, selectedTopId, selectedChildId, featuredFilter, sampleFilter, selectedIPFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, selectedTopId, selectedChildId, featuredFilter, sampleFilter, selectedIPFilter, childCategoryMap]);

  useEffect(() => {
    loadCollectionIPStats(selectedTopId, selectedChildId, featuredFilter, sampleFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopId, selectedChildId, featuredFilter, sampleFilter, childCategoryMap]);

  useEffect(() => {
    setSelectedCollectionIds((prev) =>
      prev.filter((id) => collections.some((item) => item.id === id))
    );
  }, [collections]);

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const toggleSelectAllCurrentPage = (checked: boolean) => {
    if (!checked) {
      setSelectedCollectionIds([]);
      return;
    }
    setSelectedCollectionIds(collections.map((item) => item.id));
  };
  const toggleSelectCollection = (id: number, checked: boolean) => {
    setSelectedCollectionIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  };

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
    setCollectionSample(Boolean(collection.is_sample));
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
            is_sample: collectionSample,
            tag_ids: collectionTagIds,
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      await loadCollections(page, pageSize, selectedTopId, selectedChildId, featuredFilter, sampleFilter);
      setCollectionEditOpen(false);
      setCollectionEditing(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "更新失败";
      if (message.includes("已有四个推荐")) {
        window.alert("已有四个推荐，请先取消一个推荐后再保存");
      }
      setError(message);
    } finally {
      setCollectionSaving(false);
    }
  };

  const batchUpdateSampleFlag = async (isSample: boolean) => {
    if (!selectedCollectionIds.length || batchSampleSaving) return;
    setBatchSampleSaving(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/collections/batch-sample`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection_ids: selectedCollectionIds,
          is_sample: isSample,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadCollections(page, pageSize, selectedTopId, selectedChildId, featuredFilter, sampleFilter);
      setSelectedCollectionIds([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "批量更新样本状态失败";
      setError(message);
    } finally {
      setBatchSampleSaving(false);
    }
  };

  const batchAssignIP = async (ipId: number) => {
    if (!selectedCollectionIds.length || batchIPSaving) return;
    const targetName =
      ipId > 0 ? ips.find((item) => item.id === ipId)?.name || `IP#${ipId}` : "清空IP";
    const actionLabel = ipId > 0 ? "设置IP" : "清空IP";
    const confirmed = window.confirm(
      `确认${actionLabel}？\n已选合集：${selectedCollectionIds.length} 条\n目标：${targetName}`
    );
    if (!confirmed) return;

    setBatchIPSaving(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/collections/batch-assign-ip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection_ids: selectedCollectionIds,
          ip_id: ipId > 0 ? ipId : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadCollections(page, pageSize, selectedTopId, selectedChildId, featuredFilter, sampleFilter);
      await loadCollectionIPStats(selectedTopId, selectedChildId, featuredFilter, sampleFilter);
      await loadCollectionIPAuditLogs(20);
      setSelectedCollectionIds([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "批量设置IP失败";
      setError(message);
    } finally {
      setBatchIPSaving(false);
    }
  };

  const exportSampleCollections = async () => {
    if (exportingSamples) return;
    setExportingSamples(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/collections/samples/export.csv?is_sample=1`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sample_collections_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "导出样本合集失败";
      setError(message);
    } finally {
      setExportingSamples(false);
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
      await loadCollections(nextPage, pageSize, selectedTopId, selectedChildId, featuredFilter, sampleFilter);
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
    <div className="space-y-6 pb-6">
      <SectionHeader
        title="表情包合集"
        description="管理全站表情包合集，支持分类筛选、推荐置顶及批量操作。"
        actions={
          <button
            className="group flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-emerald-600 hover:shadow-emerald-100 active:scale-95 disabled:opacity-60"
            onClick={() =>
              loadCollections(page, pageSize, selectedTopId, selectedChildId, featuredFilter, sampleFilter)
            }
            disabled={loading}
          >
            <RefreshCw size={16} className={`transition-transform ${loading ? "animate-spin" : "group-hover:rotate-180"}`} />
            {loading ? "正在同步..." : "刷新数据"}
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-600 animate-in fade-in slide-in-from-top-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">!</div>
          {error}
        </div>
      )}

      <div className="rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm">
        {/* 筛选区域 */}
        <div className="mb-6 rounded-3xl border border-slate-100 bg-slate-50/40 p-6 shadow-sm transition-all hover:shadow-md">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                <Layers size={14} /> 一级分类
              </div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                <button
                  onClick={() => {
                    setSelectedTopId(null);
                    setSelectedChildId(null);
                    setPage(1);
                  }}
                  className={`rounded-xl px-5 py-2 text-xs font-black transition-all ${
                    selectedTopId === null
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-200 scale-105"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  全部
                </button>
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
                      className={`rounded-xl px-5 py-2 text-xs font-black transition-all ${
                        active
                          ? "bg-slate-900 text-white shadow-lg shadow-slate-200 scale-105"
                          : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                <LayoutGrid size={14} /> 二级分类
              </div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                <button
                  onClick={() => {
                    setSelectedChildId(null);
                    setPage(1);
                  }}
                  className={`rounded-xl px-5 py-2 text-xs font-black transition-all ${
                    selectedTopId && selectedChildId === null
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100 scale-105"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  全部子类
                </button>
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
                      className={`rounded-xl px-5 py-2 text-xs font-black transition-all ${
                        active
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100 scale-105"
                          : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                })}
                {!selectedChildren.length && (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-[11px] font-bold text-slate-400 italic">
                    {selectedTopId ? "该分类下暂无二级分类" : "请先选择一级分类以查看子类"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 列表头部工具栏 */}
        <div className="flex flex-wrap items-center justify-between gap-6 px-2 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-1 rounded-full bg-emerald-500" />
            <div>
              <h3 className="text-lg font-black text-slate-900">合集列表</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total {total} Collections</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-1.5">
              <div className="flex items-center gap-2 px-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <Star size={14} /> 推荐筛选
              </div>
              <select
                className="h-9 rounded-xl border-none bg-white px-4 text-xs font-black text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={featuredFilter}
                onChange={(e) => {
                  setPage(1);
                  setFeaturedFilter(e.target.value as "all" | "featured");
                }}
              >
                <option value="all">显示全部</option>
                <option value="featured">仅看推荐</option>
              </select>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-1.5">
              <div className="flex items-center gap-2 px-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <TagIcon size={14} /> 样本筛选
              </div>
              <select
                className="h-9 rounded-xl border-none bg-white px-4 text-xs font-black text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={sampleFilter}
                onChange={(e) => {
                  setPage(1);
                  setSampleFilter(e.target.value as "all" | "sample");
                }}
              >
                <option value="all">显示全部</option>
                <option value="sample">仅看样本</option>
              </select>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-1.5">
              <div className="flex items-center gap-2 px-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <User size={14} /> IP筛选
              </div>
              <select
                className="h-9 rounded-xl border-none bg-white px-4 text-xs font-black text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={selectedIPFilter}
                onChange={(e) => {
                  setPage(1);
                  setSelectedIPFilter(Number(e.target.value));
                }}
              >
                <option value={0}>全部IP</option>
                <option value={-1}>未绑定IP</option>
                {ips.map((ip) => (
                  <option key={ip.id} value={ip.id}>
                    {ip.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-1.5">
              <div className="flex items-center gap-2 px-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <List size={14} /> 每页
              </div>
              <select
                className="h-9 rounded-xl border-none bg-white px-4 text-xs font-black text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={pageSize}
                onChange={(e) => {
                  setPage(1);
                  setPageSize(Number(e.target.value));
                }}
              >
                <option value={10}>10 条</option>
                <option value={20}>20 条</option>
                <option value={50}>50 条</option>
              </select>
            </div>

            <button
              type="button"
              className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={exportSampleCollections}
              disabled={exportingSamples}
            >
              <Download size={14} />
              {exportingSamples ? "导出中..." : "导出样本CSV"}
            </button>
          </div>
        </div>

        <div className="mb-4 px-2">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
            <User size={14} /> 按IP统计（当前筛选口径）
          </div>
          {loadingIPStats ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">统计加载中...</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setSelectedIPFilter(0);
                }}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  selectedIPFilter === 0
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="text-[11px] font-black text-slate-500">全部IP</div>
                <div className="mt-1 text-base font-black text-slate-900">{total}</div>
              </button>
              {ipStats.map((item, idx) => {
                const statIPID = typeof item.ip_id === "number" ? item.ip_id : null;
                const isUnbound = statIPID === null || statIPID === 0;
                const active =
                  (isUnbound && selectedIPFilter === -1) ||
                  (!isUnbound && selectedIPFilter === statIPID);
                if (idx >= 11) return null;
                return (
                  <button
                    key={`${statIPID ?? "none"}-${idx}`}
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setSelectedIPFilter(isUnbound ? -1 : (statIPID || 0));
                    }}
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      active
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="truncate text-[11px] font-black text-slate-500">{item.ip_name}</div>
                    <div className="mt-1 text-base font-black text-slate-900">{item.count}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 px-2">
          <div className="rounded-xl bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
            已选 {selectedCollectionIds.length} 条
          </div>
          <select
            className="h-8 min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-50"
            value={batchTargetIPId}
            onChange={(e) => setBatchTargetIPId(Number(e.target.value))}
            disabled={!selectedCollectionIds.length || batchIPSaving}
          >
            <option value={0}>选择目标IP</option>
            {ips.map((ip) => (
              <option key={ip.id} value={ip.id}>
                {ip.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedCollectionIds.length || batchIPSaving || batchTargetIPId <= 0}
            onClick={() => batchAssignIP(batchTargetIPId)}
          >
            {batchIPSaving ? "处理中..." : "批量设置IP"}
          </button>
          <button
            type="button"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedCollectionIds.length || batchIPSaving}
            onClick={() => batchAssignIP(0)}
          >
            批量清空IP
          </button>
          <button
            type="button"
            className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedCollectionIds.length || batchSampleSaving}
            onClick={() => batchUpdateSampleFlag(true)}
          >
            {batchSampleSaving ? "处理中..." : "批量标记样本"}
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedCollectionIds.length || batchSampleSaving}
            onClick={() => batchUpdateSampleFlag(false)}
          >
            批量取消样本
          </button>
        </div>

        <div className="mb-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-black text-slate-700">
              <Clock size={14} className="text-slate-400" />
              IP绑定操作日志（最近20条）
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700 disabled:opacity-50"
              onClick={() => loadCollectionIPAuditLogs(20)}
              disabled={loadingIPAuditLogs}
            >
              <RefreshCw size={12} className={loadingIPAuditLogs ? "animate-spin" : ""} />
              刷新
            </button>
          </div>
          {loadingIPAuditLogs ? (
            <div className="px-4 py-4 text-xs text-slate-500">加载中...</div>
          ) : ipAuditLogs.length === 0 ? (
            <div className="px-4 py-4 text-xs text-slate-500">暂无日志</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">时间</th>
                    <th className="px-4 py-2.5">操作人</th>
                    <th className="px-4 py-2.5">合集</th>
                    <th className="px-4 py-2.5">变更</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ipAuditLogs.map((item) => {
                    const oldLabel =
                      item.old_ip_id && item.old_ip_id > 0
                        ? `${item.old_ip_name || "未知IP"} (#${item.old_ip_id})`
                        : "未绑定";
                    const newLabel =
                      item.new_ip_id && item.new_ip_id > 0
                        ? `${item.new_ip_name || "未知IP"} (#${item.new_ip_id})`
                        : "未绑定";
                    return (
                      <tr key={item.id} className="text-slate-700">
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {item.admin_name || (item.admin_id ? `#${item.admin_id}` : "-")}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-slate-800">#{item.collection_id}</div>
                          <div className="max-w-[280px] truncate text-[11px] text-slate-500">
                            {item.collection_title || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-bold text-slate-700">{oldLabel}</span>
                          <span className="mx-2 text-slate-400">→</span>
                          <span className="font-bold text-emerald-700">{newLabel}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 表格区域 */}
        <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <div className="max-h-[58vh] overflow-auto">
            <table className="min-w-[1220px] w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-white">
                <th className="sticky top-0 z-20 bg-white px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={allCurrentPageSelected}
                    onChange={(e) => toggleSelectAllCurrentPage(e.target.checked)}
                  />
                </th>
                <th className="sticky top-0 z-20 bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">ID</th>
                <th className="sticky top-0 z-20 bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">合集信息</th>
                <th className="sticky top-0 z-20 bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">封面图</th>
                <th className="sticky top-0 z-20 bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">分类/主题/IP</th>
                <th className="sticky top-0 z-20 bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">标签属性</th>
                <th className="sticky top-0 z-20 bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 text-center whitespace-nowrap">统计</th>
                <th className="sticky top-0 z-20 bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">状态</th>
                <th className="sticky top-0 z-20 bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">创建时间</th>
                <th className="sticky top-0 z-20 bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 text-right whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {collections.map((item) => (
                <tr key={item.id} className="group transition-colors hover:bg-slate-50/50">
                  <td className="px-4 py-6 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={selectedIdSet.has(item.id)}
                      onChange={(e) => toggleSelectCollection(item.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-6 py-6 text-xs font-bold text-slate-400">#{item.id}</td>
                  <td className="px-6 py-6">
                    <div className="max-w-[200px] space-y-1">
                      <div className="truncate text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{item.title}</div>
                      <div className="truncate text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.slug}</div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl border-2 border-white bg-slate-100 shadow-sm ring-1 ring-slate-100 transition-transform group-hover:scale-110 group-hover:rotate-3">
                      {resolveCoverUrl(item) ? (
                        <CoverThumb
                          key={`${item.id}-${item.cover_url || ""}-${item.qiniu_prefix || ""}`}
                          url={resolveCoverUrl(item)}
                          alt={item.title}
                          coverKey={item.cover_url || ""}
                          qiniuPrefix={item.qiniu_prefix}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Layers size={12} className="text-slate-300" />
                        <span className="text-[11px] font-black text-slate-600">
                          {item.category_id ? categoryMap.get(item.category_id) : "未分类"}
                        </span>
                      </div>
                      {item.path_mismatch ? (
                        <div className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
                          <AlertTriangle size={11} />
                          分类与实际存储路径不一致
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2 text-slate-400">
                        <TagIcon size={12} className="text-slate-200" />
                        <span className="text-[10px] font-bold">
                          {item.theme_id ? themeMap.get(item.theme_id) : "无主题"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <User size={12} className="text-slate-200" />
                        <span className="text-[10px] font-bold">
                          {item.ip_id ? ipMap.get(item.ip_id) : "无IP"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                      {item.is_featured && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-600 ring-1 ring-amber-100">
                          <Star size={10} className="fill-amber-500" /> 推荐
                        </span>
                      )}
                      {item.is_pinned && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-600 ring-1 ring-emerald-100">
                          <ArrowUpCircle size={10} /> 置顶
                        </span>
                      )}
                      {item.is_sample && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-600 ring-1 ring-violet-100">
                          <TagIcon size={10} /> 样本
                        </span>
                      )}
                      {item.tags?.slice(0, 3).map((tag) => (
                        <span key={tag.id} className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-100">
                          {tag.name}
                        </span>
                      ))}
                      {item.tags && item.tags.length > 3 && (
                        <span className="text-[9px] font-black text-slate-300">+{item.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <div className="inline-flex flex-col items-center justify-center rounded-2xl bg-slate-50 px-4 py-2">
                      <div className="text-sm font-black text-slate-900">{item.file_count ?? 0}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Files</div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${item.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className={`text-[11px] font-black uppercase ${item.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Eye size={12} />
                        <span className="text-[10px] font-bold uppercase">{item.visibility}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock size={12} />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-600">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}</span>
                        <span className="text-[9px] font-medium opacity-60">{item.created_at ? new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-600 shadow-sm transition-all hover:border-emerald-100 hover:bg-emerald-50 hover:text-emerald-600 active:scale-90"
                        onClick={() => openCollectionEdit(item)}
                        title="编辑合集"
                      >
                        <Edit3 size={16} />
                      </button>
                      <Link
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-600 shadow-sm transition-all hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600 active:scale-90"
                        href={`/admin/archive/collections/${item.id}/emojis`}
                        title="编辑表情"
                      >
                        <ImageIcon size={16} />
                      </Link>
                      <button
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-rose-400 shadow-sm transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 active:scale-90 disabled:opacity-40"
                        onClick={() => hardDeleteCollection(item)}
                        disabled={deletingCollectionId === item.id}
                        title="删除合集"
                      >
                        {deletingCollectionId === item.id ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!collections.length && !loading && (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-20">
                      <div className="h-20 w-20 flex items-center justify-center rounded-[2rem] bg-slate-100 text-slate-400">
                        <FileText size={48} />
                      </div>
                      <p className="mt-4 text-lg font-black tracking-widest text-slate-400">暂无合集数据</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </div>

        {/* 分页区域 */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 items-center justify-center rounded-2xl bg-slate-50 px-4 text-xs font-black text-slate-500">
              第 {page} / {totalPages} 页
            </div>
            <div className="h-1 w-1 rounded-full bg-slate-200" />
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Page Navigation</div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              className="group flex h-11 items-center gap-2 rounded-2xl border-2 border-slate-100 bg-white px-6 text-sm font-black text-slate-600 transition-all hover:border-slate-200 hover:bg-slate-50 disabled:opacity-40 active:scale-95"
              onClick={handlePrev}
              disabled={page <= 1}
            >
              <ChevronDown size={18} className="rotate-90 transition-transform group-hover:-translate-x-1" />
              上一页
            </button>
            <button
              className="group flex h-11 items-center gap-2 rounded-2xl border-2 border-slate-100 bg-white px-6 text-sm font-black text-slate-600 transition-all hover:border-slate-200 hover:bg-slate-50 disabled:opacity-40 active:scale-95"
              onClick={handleNext}
              disabled={page >= totalPages}
            >
              下一页
              <ChevronDown size={18} className="-rotate-90 transition-transform group-hover:translate-x-1" />
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
              <div className="text-xs text-slate-400">推荐 / 置顶 / 样本</div>
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
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={collectionSample}
                    onChange={(e) => setCollectionSample(e.target.checked)}
                  />
                  样本
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
