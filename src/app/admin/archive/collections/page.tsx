"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Download,
  ListFilter
} from "lucide-react";

type Collection = {
  id: number;
  title: string;
  slug: string;
  description?: string;
  cover_url?: string;
  copyright_author?: string;
  copyright_work?: string;
  copyright_link?: string;
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
  is_showcase?: boolean;
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

type ListFilterValue =
  | "all"
  | "featured"
  | "sample"
  | "showcase"
  | "public"
  | "private";

type UploadSourceFilterValue = "all" | "ops" | "ugc";

const LIST_FILTER_OPTIONS: { value: ListFilterValue; label: string }[] = [
  { value: "all", label: "全部合集" },
  { value: "public", label: "仅公开合集" },
  { value: "private", label: "仅私有合集" },
  { value: "featured", label: "仅推荐合集" },
  { value: "sample", label: "仅样本合集" },
  { value: "showcase", label: "仅赏析合集" },
];

const UPLOAD_SOURCE_FILTER_OPTIONS: { value: UploadSourceFilterValue; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "ops", label: "运营上传" },
  { value: "ugc", label: "用户上传" },
];

const FILTER_SELECT_CLASS =
  "bg-transparent text-xs font-semibold text-slate-600 outline-none cursor-pointer w-full";
const TOOLBAR_CARD_CLASS = "flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 h-9 transition-colors focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400";

type StatusMeta = {
  label: string;
  dotClass: string;
  textClass: string;
  badgeClass: string;
};

type VisibilityMeta = {
  label: string;
  textClass: string;
  badgeClass: string;
};

export default function Page() {
  const router = useRouter();
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
  const [listFilter, setListFilter] = useState<ListFilterValue>("all");
  const [uploadSourceFilter, setUploadSourceFilter] = useState<UploadSourceFilterValue>("all");
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
  const [collectionSample, setCollectionSample] = useState(false);
  const [collectionShowcase, setCollectionShowcase] = useState(false);
  const [collectionCopyrightAuthor, setCollectionCopyrightAuthor] = useState("");
  const [collectionCopyrightWork, setCollectionCopyrightWork] = useState("");
  const [collectionCopyrightLink, setCollectionCopyrightLink] = useState("");
  const [collectionTagIds, setCollectionTagIds] = useState<number[]>([]);
  const [collectionTagFilter, setCollectionTagFilter] = useState("");
  const [collectionTagGroupFilter, setCollectionTagGroupFilter] = useState<number>(0);
  const [collectionSaving, setCollectionSaving] = useState(false);
  const [deletingCollectionId, setDeletingCollectionId] = useState<number | null>(null);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>([]);
  const [batchShowcaseSaving, setBatchShowcaseSaving] = useState(false);
  const [batchVisibilitySaving, setBatchVisibilitySaving] = useState(false);
  const [batchTargetVisibility, setBatchTargetVisibility] = useState<"public" | "private">("private");
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
  const hasActiveFilters =
    selectedTopId !== null ||
    selectedChildId !== null ||
    listFilter !== "all" ||
    uploadSourceFilter !== "all";

  const treeItems = useMemo(() => buildTree(categories), [categories]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const selectedIdSet = useMemo(() => new Set(selectedCollectionIds), [selectedCollectionIds]);
  const allCurrentPageSelected = useMemo(
    () => collections.length > 0 && collections.every((item) => selectedIdSet.has(item.id)),
    [collections, selectedIdSet]
  );
  const categoryMap = useMemo(() => {
    const map = new Map<number, Category>();
    for (const cat of categories) {
      map.set(cat.id, cat);
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
    listFilterValue = listFilter,
    sourceFilterValue = uploadSourceFilter
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
      if (listFilterValue === "featured") {
        query.set("is_featured", "1");
      } else if (listFilterValue === "sample") {
        query.set("is_sample", "1");
      } else if (listFilterValue === "showcase") {
        query.set("is_showcase", "1");
      } else if (listFilterValue === "public" || listFilterValue === "private") {
        query.set("visibility", listFilterValue);
      }
      if (sourceFilterValue === "ops") {
        query.set("is_original", "0");
      } else if (sourceFilterValue === "ugc") {
        query.set("is_original", "1");
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
    const nextMap: Record<string, string> = {};
    const pendingKeys = new Set<string>();
    const rawCoverByKey = new Map<string, string[]>();

    for (const item of items) {
      const rawCover = (item.cover_url || "").trim();
      if (!rawCover) continue;

      if (rawCover.startsWith("http://") || rawCover.startsWith("https://")) {
        const key = extractStorageKeyFromURL(rawCover);
        if (!key) continue;

        const exists = rawCoverByKey.get(key) || [];
        exists.push(rawCover);
        rawCoverByKey.set(key, exists);

        if (coverUrlMap[key]) {
          nextMap[rawCover] = coverUrlMap[key];
          continue;
        }
        pendingKeys.add(key);
        continue;
      }

      if (coverUrlMap[rawCover]) continue;
      pendingKeys.add(rawCover);
    }

    const uniqueKeys = Array.from(pendingKeys);
    let entries: Array<readonly [string, string]> = [];
    if (uniqueKeys.length) {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/storage/urls`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keys: uniqueKeys,
            style: "cover_static",
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { items?: { key: string; url?: string }[] };
        entries = (data.items || [])
          .filter((item) => item?.key && item?.url)
          .map((item) => [item.key, item.url as string] as const);
      } catch {
        entries = [];
      }
    }

    const map: Record<string, string> = { ...nextMap };
    entries.forEach((entry) => {
      if (entry) {
        map[entry[0]] = entry[1];
      }
    });

    rawCoverByKey.forEach((rawCovers, key) => {
      const staticURL = map[key] || coverUrlMap[key];
      if (!staticURL) return;
      rawCovers.forEach((raw) => {
        map[raw] = staticURL;
      });
    });

    if (Object.keys(map).length) {
      setCoverUrlMap((prev) => ({ ...prev, ...map }));
    }
  };

  const resolveCoverUrl = (item: Collection) => {
    const cover = (item.cover_url || "").trim();
    if (!cover) return "";
    if (cover.startsWith("http://") || cover.startsWith("https://")) {
      if (coverUrlMap[cover]) return coverUrlMap[cover];
      const key = extractStorageKeyFromURL(cover);
      if (key && coverUrlMap[key]) return coverUrlMap[key];
      const staticUrl = buildStaticPreview(cover);
      return staticUrl || cover;
    }
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
    loadCollections(page, pageSize, selectedTopId, selectedChildId, listFilter, uploadSourceFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, selectedTopId, selectedChildId, listFilter, uploadSourceFilter, childCategoryMap]);

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
    router.push(`/admin/archive/collections/${collection.id}/edit`);
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
            is_showcase: collectionShowcase,
            copyright_author: collectionCopyrightAuthor.trim(),
            copyright_work: collectionCopyrightWork.trim(),
            copyright_link: collectionCopyrightLink.trim(),
            tag_ids: collectionTagIds,
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      await loadCollections(page, pageSize, selectedTopId, selectedChildId, listFilter);
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

  const batchUpdateShowcaseFlag = async (isShowcase: boolean) => {
    if (!selectedCollectionIds.length || batchShowcaseSaving) return;
    setBatchShowcaseSaving(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/collections/batch-showcase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection_ids: selectedCollectionIds,
          is_showcase: isShowcase,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadCollections(page, pageSize, selectedTopId, selectedChildId, listFilter);
      setSelectedCollectionIds([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "批量设置赏析状态失败";
      setError(message);
    } finally {
      setBatchShowcaseSaving(false);
    }
  };

  const batchUpdateVisibility = async (visibility: "public" | "private") => {
    if (!selectedCollectionIds.length || batchVisibilitySaving) return;
    const visibilityLabel = visibility === "public" ? "公开（上架）" : "私有（下架）";
    const confirmed = window.confirm(
      `确认批量设置可见性为：${visibilityLabel}？\n已选合集：${selectedCollectionIds.length} 条`
    );
    if (!confirmed) return;

    setBatchVisibilitySaving(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/collections/batch-visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection_ids: selectedCollectionIds,
          visibility,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadCollections(page, pageSize, selectedTopId, selectedChildId, listFilter);
      setSelectedCollectionIds([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "批量设置可见性失败";
      setError(message);
    } finally {
      setBatchVisibilitySaving(false);
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
      await loadCollections(nextPage, pageSize, selectedTopId, selectedChildId, listFilter);
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
    if (collectionCover.startsWith("http://") || collectionCover.startsWith("https://")) {
      if (coverUrlMap[collectionCover]) return coverUrlMap[collectionCover];
      const key = extractStorageKeyFromURL(collectionCover);
      if (key && coverUrlMap[key]) return coverUrlMap[key];
      return buildStaticPreview(collectionCover) || collectionCover;
    }
    return coverUrlMap[collectionCover] || "";
  }, [collectionCover, coverUrlMap]);

  useEffect(() => {
    const fetchDirectUrl = async () => {
      if (!collectionCover) return;
      if (!isImageFile(collectionCover)) return;
      if (collectionCover.startsWith("http://") || collectionCover.startsWith("https://")) {
        if (coverUrlMap[collectionCover]) return;
        const key = extractStorageKeyFromURL(collectionCover);
        if (!key || coverUrlMap[key]) return;
        try {
          const res = await fetchWithAuth(
            `${API_BASE}/api/storage/url?key=${encodeURIComponent(key)}&style=cover_static`
          );
          if (!res.ok) return;
          const data = (await res.json()) as { url?: string };
          if (data.url) {
            setCoverUrlMap((prev) => ({
              ...prev,
              [key]: data.url!,
              [collectionCover]: data.url!,
            }));
          }
        } catch {
          // ignore
        }
        return;
      }
      if (coverUrlMap[collectionCover]) return;
      try {
        const res = await fetchWithAuth(
          `${API_BASE}/api/storage/url?key=${encodeURIComponent(collectionCover)}&style=cover_static`
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
      const normalizedItems = (data.items || []).map((item) => {
        const rawUrl = item.url || "";
        if (!rawUrl) return item;
        if (/\.(mp4|webm)(?:[?#]|$)/i.test(rawUrl)) return item;
        const staticUrl = buildStaticPreview(rawUrl);
        return {
          ...item,
          url: staticUrl || rawUrl,
        };
      });
      setCoverResults((prev) => (append ? [...prev, ...normalizedItems] : normalizedItems));
      setCoverMarker(data.next_marker || "");
      setCoverHasNext(data.has_next);
      const map: Record<string, string> = {};
      for (const item of normalizedItems) {
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
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">!</div>
          {error}
        </div>
      )}

      <div className="rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm">
        {/* 列表头部工具栏 */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-emerald-500" />
            <h3 className="text-base font-black text-slate-900">合集列表</h3>
          </div>
          <p className="mt-1 pl-3 text-[10px] font-bold uppercase tracking-widest text-emerald-600/60">TOTAL {total} COLLECTIONS</p>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4 px-2">
          <div className={TOOLBAR_CARD_CLASS}>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 whitespace-nowrap">
              <Layers size={14} /> 一级
            </div>
            <select
              className={`${FILTER_SELECT_CLASS} min-w-[120px]`}
              value={selectedTopId ?? ""}
              onChange={(e) => {
                const nextTopId = e.target.value ? Number(e.target.value) : null;
                setSelectedTopId(nextTopId);
                setSelectedChildId(null);
                setPage(1);
              }}
            >
              <option value="">全部一级分类</option>
              {topCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className={TOOLBAR_CARD_CLASS}>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 whitespace-nowrap">
              <LayoutGrid size={14} /> 二级
            </div>
            <select
              className={`${FILTER_SELECT_CLASS} min-w-[120px]`}
              value={selectedChildId ?? ""}
              onChange={(e) => {
                const nextChildId = e.target.value ? Number(e.target.value) : null;
                setSelectedChildId(nextChildId);
                setPage(1);
              }}
              disabled={!selectedTopId || !selectedChildren.length}
            >
              <option value="">
                {selectedTopId ? "全部子类" : "请先选择一级"}
              </option>
              {selectedChildren.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className={TOOLBAR_CARD_CLASS}>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 whitespace-nowrap">
              <ListFilter size={14} /> 筛选
            </div>
            <select
              className={`${FILTER_SELECT_CLASS} min-w-[100px]`}
              value={listFilter}
              onChange={(e) => {
                setPage(1);
                setListFilter(e.target.value as ListFilterValue);
              }}
            >
              {LIST_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={TOOLBAR_CARD_CLASS}>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 whitespace-nowrap">
              <FileText size={14} /> 来源
            </div>
            <select
              className={`${FILTER_SELECT_CLASS} min-w-[80px]`}
              value={uploadSourceFilter}
              onChange={(e) => {
                setPage(1);
                setUploadSourceFilter(e.target.value as UploadSourceFilterValue);
              }}
            >
              {UPLOAD_SOURCE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              setSelectedTopId(null);
              setSelectedChildId(null);
              setListFilter("all");
              setUploadSourceFilter("all");
              setPage(1);
            }}
            disabled={!hasActiveFilters}
          >
            重置筛选
          </button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4 px-2">
          <div className={TOOLBAR_CARD_CLASS}>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 whitespace-nowrap">
              <List size={14} /> 每页
            </div>
            <select
              className={`${FILTER_SELECT_CLASS} min-w-[60px]`}
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
            className="flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={exportSampleCollections}
            disabled={exportingSamples}
          >
            <Download size={14} />
            {exportingSamples ? "导出中..." : "导出样本CSV"}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 px-2">
          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600">
            已选 {selectedCollectionIds.length} 条
          </div>
          <button
            type="button"
            className="rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-600 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedCollectionIds.length || batchShowcaseSaving}
            onClick={() => batchUpdateShowcaseFlag(true)}
          >
            {batchShowcaseSaving ? "处理中..." : "批量设为赏析"}
          </button>
          <button
            type="button"
            className="rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedCollectionIds.length || batchShowcaseSaving}
            onClick={() => batchUpdateShowcaseFlag(false)}
          >
            取消赏析模式
          </button>
          <select
            className="h-8 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 outline-none focus:border-emerald-400 disabled:opacity-50"
            value={batchTargetVisibility}
            onChange={(e) => setBatchTargetVisibility(e.target.value as "public" | "private")}
            disabled={!selectedCollectionIds.length || batchVisibilitySaving}
          >
            <option value="private">可见性：未上架</option>
            <option value="public">可见性：上架中</option>
          </select>
          <button
            type="button"
            className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedCollectionIds.length || batchVisibilitySaving}
            onClick={() => batchUpdateVisibility(batchTargetVisibility)}
          >
            {batchVisibilitySaving ? "处理中..." : "批量设置可见性"}
          </button>
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
                <th className="sticky top-0 z-20 bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">属性</th>
                <th className="sticky top-0 z-20 bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 text-center whitespace-nowrap">统计</th>
                <th className="sticky top-0 z-20 bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">状态</th>
                <th className="sticky top-0 z-20 bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">创建时间</th>
                <th className="sticky top-0 z-20 bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 text-right whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {collections.map((item) => {
                const statusMeta = getStatusMeta(item.status);
                const visibilityMeta = getVisibilityMeta(item.visibility);
                return (
                  <tr key={item.id}>
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
                      <div className="truncate text-sm font-black text-slate-900">{item.title}</div>
                      <div className="truncate text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.slug}</div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                      {resolveCoverUrl(item) ? (
                        <CoverThumb
                          key={`${item.id}-${item.cover_url || ""}-${item.qiniu_prefix || ""}`}
                          url={resolveCoverUrl(item)}
                          alt={item.title}
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
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Layers size={12} className="text-slate-300" />
                        <span className="text-[11px] font-bold text-slate-500">
                          {formatCategoryPathLabel(item.category_id, categoryMap)}
                        </span>
                      </div>
                      {item.path_mismatch ? (
                        <div className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
                          <AlertTriangle size={11} />
                          分类与实际存储路径不一致
                        </div>
                      ) : null}
                      <div className="flex items-center gap-1.5">
                        <TagIcon size={12} className="text-slate-300" />
                        <span className="text-[11px] font-bold text-slate-500">
                          {item.theme_id ? themeMap.get(item.theme_id) : "无主题"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-slate-300" />
                        <span className="text-[11px] font-bold text-slate-500">
                          {item.ip_id ? ipMap.get(item.ip_id) : "无IP"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="max-w-[180px] space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                            item.source === "ugc_upload"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.source === "ugc_upload" ? "用户上传" : "运营上传"}
                        </span>
                        {item.is_featured && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-600">
                            <Star size={10} className="fill-amber-500" /> 推荐
                          </span>
                        )}
                        {item.is_showcase && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-600">
                            <Eye size={10} /> 赏析
                          </span>
                        )}
                        {item.is_sample && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-600">
                            <TagIcon size={10} /> 样本
                          </span>
                        )}
                        {item.is_pinned && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600">
                            <ArrowUpCircle size={10} /> 置顶
                          </span>
                        )}
                        {!item.is_featured && !item.is_showcase && !item.is_sample && !item.is_pinned ? (
                          <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-500">
                            普通
                          </span>
                        ) : null}
                      </div>
                      <div
                        className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-500"
                        title={(item.tags || []).map((tag) => tag.name).join("、") || "无标签"}
                      >
                        标签 {item.tags?.length || 0}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-base font-black text-slate-900">{item.file_count ?? 0}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Files</div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                        <span className={`text-[11px] font-bold ${statusMeta.textClass}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Eye size={12} className={visibilityMeta.textClass} />
                        <span className={`text-[11px] font-bold ${visibilityMeta.textClass}`}>
                          {visibilityMeta.label}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-start gap-1.5 text-slate-400">
                      <Clock size={12} className="mt-0.5" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-600">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}</span>
                        <span className="text-[10px] font-medium text-slate-400">{item.created_at ? new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-2 text-slate-400 transition-colors hover:text-emerald-600"
                        onClick={() => openCollectionEdit(item)}
                        title="编辑合集"
                      >
                        <Edit3 size={16} />
                      </button>
                      <Link
                        className="p-2 text-slate-400 transition-colors hover:text-blue-600"
                        href={`/admin/archive/collections/${item.id}/emojis`}
                        title="编辑表情"
                      >
                        <ImageIcon size={16} />
                      </Link>
                      <button
                        className="p-2 text-slate-400 transition-colors hover:text-rose-600 disabled:opacity-40"
                        onClick={() => hardDeleteCollection(item)}
                        disabled={deletingCollectionId === item.id}
                        title="删除合集"
                      >
                        {deletingCollectionId === item.id ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </td>
                  </tr>
                );
              })}
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
              className="flex h-11 items-center gap-2 rounded-2xl border-2 border-slate-100 bg-white px-6 text-sm font-black text-slate-600 hover:border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              onClick={handlePrev}
              disabled={page <= 1}
            >
              <ChevronDown size={18} className="rotate-90" />
              上一页
            </button>
            <button
              className="flex h-11 items-center gap-2 rounded-2xl border-2 border-slate-100 bg-white px-6 text-sm font-black text-slate-600 hover:border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              onClick={handleNext}
              disabled={page >= totalPages}
            >
              下一页
              <ChevronDown size={18} className="-rotate-90" />
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
                    qiniuPrefix={collectionEditing?.qiniu_prefix}
                    allowPrefixFallback
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
                            <img src={item.url} alt={item.key} className="h-full w-full object-cover" />
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
              <div className="text-xs text-slate-400">推荐 / 置顶 / 样本 / 赏析</div>
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
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={collectionShowcase}
                    onChange={(e) => setCollectionShowcase(e.target.checked)}
                  />
                  赏析（仅赏析页展示，前台禁下载）
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-slate-400">版权信息（前台醒目标注）</div>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                <input
                  className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                  value={collectionCopyrightAuthor}
                  onChange={(e) => setCollectionCopyrightAuthor(e.target.value)}
                  placeholder="图片作者：例如 Downvote"
                />
                <input
                  className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                  value={collectionCopyrightWork}
                  onChange={(e) => setCollectionCopyrightWork(e.target.value)}
                  placeholder="原作：例如《孤独摇滚！》"
                />
                <input
                  className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                  value={collectionCopyrightLink}
                  onChange={(e) => setCollectionCopyrightLink(e.target.value)}
                  placeholder="来源链接 / 作者主页"
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">状态</div>
              <select
                className={`mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm font-semibold outline-none ${getStatusMeta(collectionStatus).textClass}`}
                value={collectionStatus}
                onChange={(e) => setCollectionStatus(e.target.value)}
              >
                <option value="active">正常</option>
                <option value="pending">待审核</option>
                <option value="disabled">不可用</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-slate-400">可见性</div>
              <select
                className={`mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm font-semibold outline-none ${getVisibilityMeta(collectionVisibility).textClass}`}
                value={collectionVisibility}
                onChange={(e) => setCollectionVisibility(e.target.value)}
              >
                <option value="public">上架中</option>
                <option value="private">未上架</option>
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
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
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
                            className={`rounded-full border px-3 py-1 text-xs ${
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

function getStatusMeta(status?: string): StatusMeta {
  const value = String(status || "").trim().toLowerCase();
  switch (value) {
    case "active":
      return {
        label: "正常",
        dotClass: "bg-emerald-500",
        textClass: "text-emerald-700",
        badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
      };
    case "pending":
    case "reviewing":
      return {
        label: "待审核",
        dotClass: "bg-amber-500",
        textClass: "text-amber-700",
        badgeClass: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
      };
    case "approved":
      return {
        label: "已通过",
        dotClass: "bg-cyan-500",
        textClass: "text-cyan-700",
        badgeClass: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100",
      };
    case "rejected":
      return {
        label: "已驳回",
        dotClass: "bg-rose-500",
        textClass: "text-rose-700",
        badgeClass: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
      };
    case "disabled":
      return {
        label: "不可用",
        dotClass: "bg-slate-500",
        textClass: "text-slate-700",
        badgeClass: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
      };
    case "draft":
      return {
        label: "草稿",
        dotClass: "bg-sky-500",
        textClass: "text-sky-700",
        badgeClass: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
      };
    default:
      return {
        label: "未知",
        dotClass: "bg-slate-300",
        textClass: "text-slate-500",
        badgeClass: "bg-slate-50 text-slate-500 ring-1 ring-slate-100",
      };
  }
}

function getVisibilityMeta(visibility?: string): VisibilityMeta {
  const value = String(visibility || "").trim().toLowerCase();
  switch (value) {
    case "public":
    case "online":
      return {
        label: "上架中",
        textClass: "text-emerald-700",
        badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
      };
    case "private":
    case "offline":
      return {
        label: "未上架",
        textClass: "text-slate-700",
        badgeClass: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
      };
    default:
      return {
        label: "未知",
        textClass: "text-slate-500",
        badgeClass: "bg-slate-50 text-slate-500 ring-1 ring-slate-100",
      };
  }
}

function formatCategoryPathLabel(categoryID: number | null | undefined, categoryMap: Map<number, Category>) {
  if (!categoryID) return "未分类";
  const current = categoryMap.get(categoryID);
  if (!current) return "未分类";

  const names: string[] = [];
  let cursor: Category | undefined = current;
  let guard = 0;
  while (cursor && guard < 8) {
    names.unshift(cursor.name);
    if (!cursor.parent_id) break;
    cursor = categoryMap.get(Number(cursor.parent_id));
    guard += 1;
  }

  if (names.length >= 2) {
    return `${names[0]} / ${names[1]}`;
  }
  return `${names[0]} / 未设二级`;
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

function isImageFile(value: string) {
  const clean = (value || "").split("?")[0].split("#")[0].toLowerCase();
  return /\.(jpe?g|png|gif|webp)$/.test(clean);
}

function extractStorageKeyFromURL(raw: string) {
  const val = (raw || "").trim();
  if (!val.startsWith("http://") && !val.startsWith("https://")) return "";
  try {
    const parsed = new URL(val);
    const pathname = parsed.pathname || "";
    if (!pathname) return "";
    const decoded = decodeURIComponent(pathname).replace(/^\/+/, "").trim();
    if (!decoded || !isImageFile(decoded)) return "";
    return decoded;
  } catch {
    return "";
  }
}

function buildStaticPreview(url: string) {
  const val = (url || "").trim();
  if (!val.startsWith("http://") && !val.startsWith("https://")) return "";
  if (val.includes("imageMogr2/")) return val;
  if (val.includes("token=") || val.includes("e=")) return "";
  const separator = val.includes("?") ? "&" : "?";
  return `${val}${separator}imageMogr2/thumbnail/!160x160r/gravity/Center/crop/160x160/format/webp`;
}

function buildCoverSources(url: string) {
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

  const staticUrl = buildStaticPreview(primary);
  if (staticUrl) {
    return { primary: staticUrl, fallback: "" };
  }
  return { primary, fallback: "" };
}

function CoverThumb({
  url,
  alt,
  qiniuPrefix,
  allowPrefixFallback = false,
}: {
  url: string;
  alt: string;
  qiniuPrefix?: string;
  allowPrefixFallback?: boolean;
}) {
  const { primary, fallback } = useMemo(
    () => buildCoverSources(url),
    [url]
  );
  const [currentSrc, setCurrentSrc] = useState(primary);
  const [swapped, setSwapped] = useState(false);
  const triedPrefix = useRef(false);

  useEffect(() => {
    triedPrefix.current = false;
    // 若 primary 为空但有前缀，主动拉取前缀首图
    if (!primary && qiniuPrefix && allowPrefixFallback) {
      triedPrefix.current = true;
      fetchFirstImageFromPrefix(qiniuPrefix).then((altUrl) => {
        if (altUrl) setCurrentSrc(altUrl);
      });
    }
  }, [primary, qiniuPrefix, allowPrefixFallback]);

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
    if (fallback) {
      setCurrentSrc(fallback);
      setSwapped(false);
      return;
    }
    if (!triedPrefix.current && qiniuPrefix && allowPrefixFallback) {
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
      `${API_BASE}/api/storage/url?key=${encodeURIComponent(hit.key)}&style=cover_static`
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
