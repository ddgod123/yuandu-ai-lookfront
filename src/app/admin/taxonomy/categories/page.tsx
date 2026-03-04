"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { 
  Plus, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  Folder, 
  ChevronRight, 
  Layers,
  Info,
  ExternalLink,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Hash,
  Activity,
  Type
} from "lucide-react";
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
  created_at: string;
  updated_at: string;
};

type CategoryStats = {
  category_id: number;
  collection_count: number;
};

export default function Page() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryStats, setCategoryStats] = useState<Map<number, number>>(new Map());
  const [selectedTopId, setSelectedTopId] = useState<number | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createPrefix, setCreatePrefix] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createParentId, setCreateParentId] = useState<number>(0);
  const [createCover, setCreateCover] = useState("");
  const [createSort, setCreateSort] = useState(0);

  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSort, setEditSort] = useState(0);
  const [editStatus, setEditStatus] = useState("active");
  const [editParentId, setEditParentId] = useState<number>(0);
  const [editCover, setEditCover] = useState("");

  const [childSearch, setChildSearch] = useState("");

  const topLevelCategories = useMemo(
    () =>
      categories
        .filter((item) => !item.parent_id)
        .sort((a, b) => {
          if (a.sort !== b.sort) return a.sort - b.sort;
          return a.id - b.id;
        }),
    [categories]
  );
  const childGroups = useMemo(() => {
    const map = new Map<number, Category[]>();
    for (const cat of categories) {
      if (!cat.parent_id) continue;
      const list = map.get(cat.parent_id) || [];
      list.push(cat);
      map.set(cat.parent_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.sort !== b.sort) return a.sort - b.sort;
        return a.id - b.id;
      });
    }
    return map;
  }, [categories]);

  const selectedTop = useMemo(
    () => topLevelCategories.find((item) => item.id === selectedTopId) || null,
    [topLevelCategories, selectedTopId]
  );
  const selectedChildren = useMemo(
    () => (selectedTopId ? childGroups.get(selectedTopId) || [] : []),
    [childGroups, selectedTopId]
  );
  const filteredChildren = useMemo(() => {
    const keyword = childSearch.trim().toLowerCase();
    if (!keyword) return selectedChildren;
    return selectedChildren.filter((item) => {
      return (
        item.name.toLowerCase().includes(keyword) ||
        item.slug.toLowerCase().includes(keyword)
      );
    });
  }, [childSearch, selectedChildren]);
  const selectedCategory = useMemo(() => {
    if (selectedChildId) {
      return categories.find((item) => item.id === selectedChildId) || null;
    }
    if (selectedTopId) {
      return categories.find((item) => item.id === selectedTopId) || null;
    }
    return null;
  }, [categories, selectedChildId, selectedTopId]);

  const parentLabel = useMemo(() => {
    if (!selectedCategory || !selectedCategory.parent_id) return "顶级分类";
    const parent = categories.find((item) => item.id === selectedCategory.parent_id);
    return parent?.name || "未知父级";
  }, [categories, selectedCategory]);

  const loadCategories = async (selectFirst = false) => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, statsRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/admin/categories`),
        fetchWithAuth(`${API_BASE}/api/admin/categories/stats`)
      ]);
      if (!catRes.ok) throw new Error(await catRes.text());
      const data = (await catRes.json()) as Category[];
      setCategories(data);

      // 统计每个分类的合集数量
      if (statsRes.ok) {
        const statsData = (await statsRes.json()) as CategoryStats[] | null;
        const stats = new Map<number, number>();
        (statsData || []).forEach((row) => {
          if (row?.category_id) {
            stats.set(row.category_id, row.collection_count);
          }
        });
        setCategoryStats(stats);
      } else {
        setCategoryStats(new Map());
      }

      if (selectFirst && data.length > 0) {
        const tops = data.filter((item) => !item.parent_id);
        const firstTop = tops[0] || null;
        setSelectedTopId(firstTop?.id || null);
        if (firstTop) {
          const children = data
            .filter((item) => item.parent_id === firstTop.id)
            .sort((a, b) => {
              if (a.sort !== b.sort) return a.sort - b.sort;
              return a.id - b.id;
            });
          setSelectedChildId(children[0]?.id || null);
        } else {
          setSelectedChildId(null);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories(true);
  }, []);

  const openCreate = () => {
    setCreateName("");
    setCreateSlug("");
    setCreatePrefix("");
    setCreateDesc("");
    if (selectedTopId) {
      setCreateParentId(selectedTopId);
    } else {
      setCreateParentId(0);
    }
    setCreateCover("");
    setCreateSort(0);
    setError(null);
    setCreateOpen(true);
  };

  const openEdit = () => {
    if (!selectedCategory) return;
    setEditName(selectedCategory.name || "");
    setEditDesc(selectedCategory.description || "");
    setEditSort(selectedCategory.sort || 0);
    setEditStatus(selectedCategory.status || "active");
    setEditParentId(selectedCategory.parent_id || 0);
    setEditCover(selectedCategory.cover_url || "");
    setError(null);
    setEditOpen(true);
  };

  const openEditFor = (category: Category) => {
    if (!category) return;
    if (category.parent_id) {
      setSelectedTopId(category.parent_id);
      setSelectedChildId(category.id);
    } else {
      setSelectedTopId(category.id);
      setSelectedChildId(null);
    }
    setEditName(category.name || "");
    setEditDesc(category.description || "");
    setEditSort(category.sort || 0);
    setEditStatus(category.status || "active");
    setEditParentId(category.parent_id || 0);
    setEditCover(category.cover_url || "");
    setError(null);
    setEditOpen(true);
  };

  const openQuickCreateChild = () => {
    if (!selectedTopId) {
      setError("请先选择一级分类");
      return;
    }
    openCreate();
  };

  const createCategory = async () => {
    if (!createName.trim()) {
      setError("请输入分类名称");
      return;
    }
    if (createSlugError) {
      setError(createSlugError);
      return;
    }
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          slug: createSlug.trim().toLowerCase(),
          prefix: createPrefix.trim(),
          description: createDesc.trim(),
          parent_id: createParentId > 0 ? createParentId : null,
          cover_url: createCover.trim(),
          sort: createSort,
        }),
      });
      if (!res.ok) {
        const raw = await res.text();
        throw new Error(formatCategoryError(raw, "创建失败"));
      }
      setCreateOpen(false);
      setChildSearch("");
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
            sort: editSort,
            status: editStatus,
            parent_id: editParentId > 0 ? editParentId : null,
          }),
        }
      );
      if (!res.ok) {
        const raw = await res.text();
        throw new Error(formatCategoryError(raw, "更新失败"));
      }
      setEditOpen(false);
      await loadCategories(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "更新失败";
      setError(message);
    }
  };

  const deleteCategory = async (mode: "empty") => {
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
      if (!res.ok) {
        const raw = await res.text();
        throw new Error(formatCategoryError(raw, "删除失败"));
      }
      setSelectedChildId(null);
      setSelectedTopId(null);
      await loadCategories(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "删除失败";
      setError(message);
    }
  };

  const createSlugValue = useMemo(() => {
    const candidate = createSlug.trim();
    if (candidate) return candidate.toLowerCase();
    return slugifyLocal(createName);
  }, [createSlug, createName]);

  const createSlugError = useMemo(() => {
    if (!createSlugValue) return "";
    return isValidSlug(createSlugValue) ? "" : "Slug 仅允许小写字母、数字和短横线";
  }, [createSlugValue]);

  const createPrefixPreview = useMemo(() => {
    if (createPrefix.trim()) {
      return normalizePrefixPreview(createPrefix.trim());
    }
    if (!createSlugValue) return "";
    if (createParentId > 0) {
      const parent = categories.find((item) => item.id === createParentId);
      if (parent?.prefix) {
        return normalizePrefixPreview(`${parent.prefix}${createSlugValue}/`);
      }
    }
    return normalizePrefixPreview(`emoji/collections/${createSlugValue}/`);
  }, [createPrefix, createSlugValue, createParentId, categories]);
  return (
    <div className="space-y-6">
      <SectionHeader
        title="分类管理"
        description="管理多级内容分类，维护目录映射与显示规则。"
        actions={
          <div className="flex items-center gap-3">
            <button
              className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
              onClick={() => loadCategories(false)}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : "transition-transform group-hover:rotate-180 duration-500"}`} />
              {loading ? "加载中..." : "刷新列表"}
            </button>
            <button
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md active:scale-95"
              onClick={openCreate}
            >
              <Plus className="h-3.5 w-3.5" />
              新建分类
            </button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600 animate-in fade-in slide-in-from-top-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* 顶级分类标题栏 */}
      <div className="sticky top-4 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-sm backdrop-blur">
        {topLevelCategories.map((item) => {
          const active = item.id === selectedTopId;
          const childCount = childGroups.get(item.id)?.length || 0;
          return (
            <button
              key={item.id}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => {
                setSelectedTopId(item.id);
                const children = childGroups.get(item.id) || [];
                setSelectedChildId(children[0]?.id || null);
              }}
            >
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  active ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-600"
                }`}
              >
                一级
              </span>
              <span>{item.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  active ? "bg-white/20 text-white" : "bg-white text-slate-500"
                }`}
              >
                {childCount}
              </span>
            </button>
          );
        })}
        {!topLevelCategories.length && (
          <div className="text-xs text-slate-400">暂无顶级分类</div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* 左侧：二级分类列表 */}
        <div className="w-full lg:w-[350px] shrink-0 flex flex-col rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden sticky top-4">
          <div className="flex items-center justify-between border-b border-slate-50 p-5 bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Layers className="h-4 w-4 text-indigo-500" />
              二级分类
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {selectedChildren.length}
              </span>
              <button
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                onClick={openQuickCreateChild}
                disabled={!selectedTopId}
              >
                <Plus className="h-3 w-3" />
                新增
              </button>
            </div>
          </div>
          <div className="p-3">
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-indigo-400"
              placeholder="搜索二级分类（名称/slug）"
              value={childSearch}
              onChange={(e) => setChildSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto p-2 max-h-[calc(100vh-290px)] custom-scrollbar">
            <div className="space-y-1">
              {selectedTop && (
                <div
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-all ${
                    !selectedChildId
                      ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/50 shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <button
                    className="flex flex-1 items-center gap-3 text-left"
                    onClick={() => setSelectedChildId(null)}
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                        !selectedChildId
                          ? "bg-indigo-100 text-indigo-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Folder className="h-3.5 w-3.5" />
                    </div>
                    <span className="flex items-center gap-2 flex-1 truncate font-medium">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                        一级
                      </span>
                      <span className="truncate">一级分类 · {selectedTop.name}</span>
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {categoryStats.get(selectedTop.id) || 0}
                    </span>
                    {!selectedChildId && (
                      <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
                    )}
                  </button>
                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600"
                    onClick={() => openEditFor(selectedTop)}
                    title="编辑一级分类"
                    type="button"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {filteredChildren.map((item) => (
                <div
                  key={item.id}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-all ${
                    selectedChildId === item.id
                      ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/50 shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <button
                    className="flex flex-1 items-center gap-3 text-left"
                    onClick={() => setSelectedChildId(item.id)}
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                        selectedChildId === item.id
                          ? "bg-indigo-100 text-indigo-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Folder className="h-3.5 w-3.5" />
                    </div>
                  <span className="flex items-center gap-2 flex-1 truncate font-medium">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                      二级
                    </span>
                    <span className="truncate">{item.name}</span>
                  </span>
                    {categoryStats.get(item.id) ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        {categoryStats.get(item.id)}
                      </span>
                    ) : null}
                    {selectedChildId === item.id && (
                      <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
                    )}
                  </button>
                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600"
                    onClick={() => openEditFor(item)}
                    title="编辑分类"
                    type="button"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {!filteredChildren.length && (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
                {selectedTop
                  ? childSearch
                    ? "暂无匹配的二级分类"
                    : "该一级分类暂无二级分类"
                  : "请先选择一级分类"}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：分类详情 - 占据剩余空间 */}
        <div className="flex-1 min-w-0 flex flex-col rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden min-h-[600px]">
          {selectedCategory ? (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
              {/* 详情头部 */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 p-6 bg-slate-50/20">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <Folder className="h-8 w-8 text-slate-200" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{selectedCategory.name}</h2>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        selectedCategory.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {selectedCategory.status === 'active' ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                        {selectedCategory.status}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border border-slate-100 rounded px-1.5">ID: {selectedCategory.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 shadow-sm"
                    onClick={openEdit}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    编辑
                  </button>
                  <div className="h-4 w-px bg-slate-100 mx-1" />
                  <button
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-50 shadow-sm"
                    onClick={() => deleteCategory("empty")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                  </button>
                </div>
              </div>

              {/* 详情内容 */}
              <div className="p-8">
                <div className="grid gap-x-12 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
                  <InfoItem icon={<Type className="h-3.5 w-3.5" />} label="分类名称" value={selectedCategory.name} />
                  <InfoItem icon={<Folder className="h-3.5 w-3.5" />} label="父级分类" value={parentLabel} />
                  <InfoItem icon={<Hash className="h-3.5 w-3.5" />} label="标识符 (Slug)" value={selectedCategory.slug} mono />
                  <InfoItem icon={<ExternalLink className="h-3.5 w-3.5" />} label="存储前缀" value={selectedCategory.prefix} mono className="md:col-span-2 lg:col-span-1" />
                  <InfoItem icon={<Activity className="h-3.5 w-3.5" />} label="排序权重" value={selectedCategory.sort.toString()} />
                  <InfoItem icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="显示状态" value={selectedCategory.status} />
                  <InfoItem icon={<Layers className="h-3.5 w-3.5" />} label="合集数量" value={`${categoryStats.get(selectedCategory.id) || 0} 个`} />
                  
                  {selectedCategory.cover_url && (
                    <div className="md:col-span-2 lg:col-span-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <ImageIcon className="h-3 w-3" />
                        封面图预览
                      </div>
                      <div className="relative aspect-[16/6] w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 shadow-inner group">
                        <Image
                          src={selectedCategory.cover_url}
                          alt="cover"
                          fill
                          unoptimized
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    </div>
                  )}

                  {selectedCategory.description && (
                    <div className="md:col-span-2 lg:col-span-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <Info className="h-3 w-3" />
                        分类描述
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 border border-slate-100/50 min-h-[120px]">
                        {selectedCategory.description}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-12 text-center bg-slate-50/10">
              <div className="relative mb-6">
                <div className="absolute inset-0 animate-ping rounded-full bg-indigo-100 opacity-20" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 text-indigo-400 border border-indigo-100 shadow-sm">
                  <Layers className="h-10 w-10" />
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-800">未选择分类</h3>
              <p className="mt-2 max-w-[280px] text-sm text-slate-400 font-medium leading-relaxed">
                请从左侧分类树中选择一个分类，以查看、编辑详细信息或管理其层级。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 新建分类弹窗 */}
      <Modal
        open={createOpen}
        title="新建分类"
        onClose={() => setCreateOpen(false)}
        maxWidth="max-w-2xl"
      >
        <div className="mt-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600">
              {error}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <FormItem label="分类名称" required>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-focus outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="例如：表情包"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </FormItem>
            <FormItem label="标识符 (Slug)">
              <input
                className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm transition-focus outline-none focus:ring-4 focus:ring-indigo-500/10 ${
                  createSlugError
                    ? "border-red-300 focus:border-red-400"
                    : "border-slate-200 focus:border-indigo-500"
                }`}
                placeholder="例如：emojis"
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value)}
              />
              {createSlugError ? (
                <p className="mt-1.5 text-xs text-red-500">{createSlugError}</p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-400">
                  留空将自动生成：{createSlugValue || "-"}
                </p>
              )}
            </FormItem>
            <FormItem label="父级分类" className="md:col-span-2">
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-focus outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
                value={createParentId}
                onChange={(e) => setCreateParentId(Number(e.target.value))}
              >
                <option value={0}>作为顶级分类</option>
                {topLevelCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                💡 仅支持两级分类：只能选择顶级分类作为父级。
              </p>
            </FormItem>
            <FormItem
              label="存储前缀"
              className="md:col-span-2"
              description="留空则自动使用：顶级为 emoji/collections/<slug>/，子级为 父级前缀/<slug>/"
            >
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-focus outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="emoji/collections/custom/"
                value={createPrefix}
                onChange={(e) => setCreatePrefix(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                最终前缀预览：{createPrefixPreview || "-"}
              </p>
            </FormItem>
            <FormItem label="排序权重">
              <input
                type="number"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-focus outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                value={createSort}
                onChange={(e) => setCreateSort(Number(e.target.value))}
              />
            </FormItem>
            <FormItem label="封面图 URL" className="md:col-span-2">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-focus outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="https://..."
                value={createCover}
                onChange={(e) => setCreateCover(e.target.value)}
              />
            </FormItem>
            <FormItem label="分类描述" className="md:col-span-2">
              <textarea
                className="w-full min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-focus outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none"
                placeholder="简短描述该分类的内容..."
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
              />
            </FormItem>
          </div>
          <div className="mt-8 flex justify-end gap-3 border-t border-slate-50 pt-6">
            <button
              className="rounded-xl px-6 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              onClick={() => setCreateOpen(false)}
            >
              取消
            </button>
            <button
              className="rounded-xl bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md active:scale-95"
              onClick={createCategory}
              disabled={Boolean(createSlugError)}
            >
              创建分类
            </button>
          </div>
        </div>
      </Modal>

      {/* 编辑分类弹窗 */}
      <Modal
        open={editOpen && !!selectedCategory}
        title="编辑分类"
        onClose={() => setEditOpen(false)}
        maxWidth="max-w-2xl"
      >
        <div className="mt-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600">
              {error}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <FormItem label="分类名称" required>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-focus outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </FormItem>
            <FormItem label="标识符 (不可修改)">
              <input
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                value={selectedCategory?.slug || ""}
                disabled
              />
            </FormItem>
            <FormItem label="父级分类" className="md:col-span-2">
              <input
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-500"
                value={parentLabel}
                disabled
              />
              <p className="mt-1.5 text-xs text-slate-500">
                父级分类创建后不可修改。
              </p>
            </FormItem>
            <FormItem label="排序权重">
              <input
                type="number"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-focus outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                value={editSort}
                onChange={(e) => setEditSort(Number(e.target.value))}
              />
            </FormItem>
            <FormItem label="显示状态">
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-focus outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <option value="active">Active (正常)</option>
                <option value="disabled">Disabled (禁用)</option>
              </select>
            </FormItem>
            <FormItem label="封面图 URL">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-focus outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="https://..."
                value={editCover}
                onChange={(e) => setEditCover(e.target.value)}
              />
            </FormItem>
            <FormItem label="分类描述" className="md:col-span-2">
              <textarea
                className="w-full min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-focus outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </FormItem>
          </div>
          <div className="mt-8 flex justify-end gap-3 border-t border-slate-50 pt-6">
            <button
              className="rounded-xl px-6 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              onClick={() => setEditOpen(false)}
            >
              取消
            </button>
            <button
              className="rounded-xl bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md active:scale-95"
              onClick={updateCategory}
            >
              保存修改
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/**
 * 辅助组件：信息展示项
 */
function InfoItem({ 
  icon, 
  label, 
  value, 
  mono = false, 
  className = "" 
}: { 
  icon?: React.ReactNode; 
  label: string; 
  value: string; 
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        {icon}
        {label}
      </div>
      <div className={`text-sm text-slate-700 ${mono ? "font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit" : "font-semibold"}`}>
        {value || "-"}
      </div>
    </div>
  );
}

/**
 * 辅助组件：表单项
 */
function FormItem({ 
  label, 
  children, 
  required = false, 
  description,
  className = "" 
}: { 
  label: string; 
  children: React.ReactNode; 
  required?: boolean;
  description?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {description && <p className="mt-1 text-[10px] text-slate-400">{description}</p>}
    </div>
  );
}

function slugifyLocal(input: string) {
  if (!input) return "";
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\\s-]/g, "")
    .replace(/[\\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidSlug(slug: string) {
  if (!slug) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function normalizePrefixPreview(prefix: string) {
  let value = prefix.trim();
  if (!value) return "";
  if (!value.endsWith("/")) {
    value += "/";
  }
  return value;
}

function formatCategoryError(raw: string, fallback: string) {
  let message = raw;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.error === "string") {
      message = parsed.error;
    }
  } catch {
    // keep raw
  }
  switch (message) {
    case "category has children":
      return "该分类下还有子分类，无法删除。";
    case "category has collections":
      return "该分类下还有表情包合集，无法删除。";
    case "category not empty":
      return "该分类目录下还有资源文件，无法删除。";
    case "category not found":
      return "分类不存在或已被删除。";
    case "invalid id":
      return "分类 ID 无效。";
    case "trash mode disabled":
      return "回收站已关闭，请直接删除。";
    case "parent immutable":
      return "父级分类不可修改，如需调整请新建分类。";
    case "parent must be top-level":
      return "父级只能选择一级分类。";
    case "duplicate key value violates unique constraint \"idx_taxonomy_categories_parent_slug\"":
      return "该父级下 slug 已存在，请更换。";
    default:
      return fallback;
  }
}

/**
 * 通用弹窗组件
 */
function Modal({
  open,
  title,
  onClose,
  maxWidth = "max-w-lg",
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} rounded-[32px] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
            onClick={onClose}
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// (no tree helpers needed: UI only shows top-level + second-level)
