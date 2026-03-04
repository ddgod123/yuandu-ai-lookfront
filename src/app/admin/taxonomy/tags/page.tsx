"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Edit2, Trash2, Tag as TagIcon, Layers } from "lucide-react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type Tag = {
  id: number;
  name: string;
  slug: string;
  group_id?: number | null;
  group_name?: string;
  group_slug?: string;
  sort?: number;
  status?: string;
  collection_count?: number;
  emoji_count?: number;
  usage_count?: number;
  created_at: string;
  updated_at: string;
};

type TagGroup = {
  id: number;
  name: string;
  slug: string;
  sort: number;
  status: string;
};

type GroupKey = "all" | "ungrouped" | number;

export default function Page() {
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState<GroupKey>("all");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [tagSearch, setTagSearch] = useState("");

  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [groupCreateOpen, setGroupCreateOpen] = useState(false);
  const [groupEditOpen, setGroupEditOpen] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createGroupId, setCreateGroupId] = useState<number>(0);
  const [createSort, setCreateSort] = useState(0);
  const [createStatus, setCreateStatus] = useState("active");

  const [groupCreateName, setGroupCreateName] = useState("");
  const [groupCreateSlug, setGroupCreateSlug] = useState("");
  const [groupCreateSort, setGroupCreateSort] = useState(0);
  const [groupCreateStatus, setGroupCreateStatus] = useState("active");
  const [groupEditing, setGroupEditing] = useState<TagGroup | null>(null);
  const [groupEditName, setGroupEditName] = useState("");
  const [groupEditSlug, setGroupEditSlug] = useState("");
  const [groupEditSort, setGroupEditSort] = useState(0);
  const [groupEditStatus, setGroupEditStatus] = useState("active");

  const [editing, setEditing] = useState<Tag | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editGroupId, setEditGroupId] = useState<number>(0);
  const [editSort, setEditSort] = useState(0);
  const [editStatus, setEditStatus] = useState("active");

  const selectedGroup = useMemo(
    () => (typeof selectedGroupKey === "number" ? groups.find((g) => g.id === selectedGroupKey) || null : null),
    [groups, selectedGroupKey]
  );

  const groupTags = useMemo(() => {
    if (selectedGroupKey === "all") return allTags;
    if (selectedGroupKey === "ungrouped") return allTags.filter((tag) => !tag.group_id);
    return allTags.filter((tag) => tag.group_id === selectedGroupKey);
  }, [allTags, selectedGroupKey]);

  const filteredTags = useMemo(() => {
    const keyword = tagSearch.trim().toLowerCase();
    if (!keyword) return groupTags;
    return groupTags.filter((tag) => {
      return (
        tag.name.toLowerCase().includes(keyword) ||
        tag.slug.toLowerCase().includes(keyword)
      );
    });
  }, [groupTags, tagSearch]);

  const selectedTag = useMemo(
    () => allTags.find((tag) => tag.id === selectedTagId) || null,
    [allTags, selectedTagId]
  );

  const selectedUsage = useMemo(() => {
    if (!selectedTag) return 0;
    if (typeof selectedTag.usage_count === "number") return selectedTag.usage_count;
    const collectionCount = selectedTag.collection_count || 0;
    const emojiCount = selectedTag.emoji_count || 0;
    return collectionCount + emojiCount;
  }, [selectedTag]);

  const tagCounts = useMemo(() => {
    const byGroup = new Map<number, number>();
    let ungrouped = 0;
    for (const tag of allTags) {
      if (tag.group_id) {
        byGroup.set(tag.group_id, (byGroup.get(tag.group_id) || 0) + 1);
      } else {
        ungrouped += 1;
      }
    }
    return {
      total: allTags.length,
      ungrouped,
      byGroup,
    };
  }, [allTags]);

  useEffect(() => {
    if (!groupTags.length) {
      setSelectedTagId(null);
      return;
    }
    if (!selectedTagId || !groupTags.some((tag) => tag.id === selectedTagId)) {
      setSelectedTagId(groupTags[0]?.id ?? null);
    }
  }, [groupTags, selectedTagId]);

  const normalizeError = (raw: string) => {
    const text = raw.trim();
    if (!text) return "操作失败";
    try {
      const data = JSON.parse(text) as { error?: string };
      if (data?.error) return mapErrorText(data.error);
    } catch {
      // ignore parse
    }
    return mapErrorText(text);
  };

  const mapErrorText = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("slug required")) return "Slug 不能为空";
    if (lower.includes("name required")) return "请输入名称";
    if (lower.includes("duplicate") || lower.includes("unique")) return "标签已存在";
    if (lower.includes("group not empty")) return "该分类下仍有标签，无法删除";
    if (lower.includes("tag in use")) return "该标签已被引用，无法删除";
    return text;
  };

  const loadGroups = async (selectFirst = false) => {
    setLoadingGroups(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/tag-groups`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as TagGroup[];
      setGroups(data);
      setSelectedGroupKey((prev) => {
        if (selectFirst) {
          return data[0]?.id ?? "all";
        }
        if (prev === "all" || prev === "ungrouped") return prev;
        if (typeof prev === "number" && data.some((g) => g.id === prev)) return prev;
        return data[0]?.id ?? "all";
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "加载失败";
      setError(message);
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadAllTags = async () => {
    setLoadingTags(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/tags`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const items = Array.isArray(data) ? (data as Tag[]) : ((data.items || []) as Tag[]);
      const sorted = [...items].sort((a, b) => {
        const sortA = a.sort ?? 0;
        const sortB = b.sort ?? 0;
        if (sortA !== sortB) return sortA - sortB;
        return b.id - a.id;
      });
      setAllTags(sorted);
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "加载失败";
      setError(message);
    } finally {
      setLoadingTags(false);
    }
  };

  // 初始化标签分组与标签列表
  useEffect(() => {
    loadGroups(true);
    loadAllTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setCreateName("");
    setCreateSlug("");
    const defaultGroupId = typeof selectedGroupKey === "number" ? selectedGroupKey : 0;
    setCreateGroupId(defaultGroupId);
    setCreateSort(0);
    setCreateStatus("active");
    setError(null);
    setCreateOpen(true);
  };

  const openCreateGroup = () => {
    setGroupCreateName("");
    setGroupCreateSlug("");
    setGroupCreateSort(0);
    setGroupCreateStatus("active");
    setError(null);
    setGroupCreateOpen(true);
  };

  const openEditGroup = (group: TagGroup) => {
    setGroupEditing(group);
    setGroupEditName(group.name || "");
    setGroupEditSlug(group.slug || "");
    setGroupEditSort(group.sort ?? 0);
    setGroupEditStatus(group.status || "active");
    setError(null);
    setGroupEditOpen(true);
  };

  const openEdit = (tag: Tag) => {
    setEditing(tag);
    setEditName(tag.name);
    setEditSlug(tag.slug);
    setEditGroupId(tag.group_id || 0);
    setEditSort(tag.sort ?? 0);
    setEditStatus(tag.status || "active");
    setError(null);
    setEditOpen(true);
  };

  const handleCreate = async () => {
    if (!createName.trim()) {
      setError("请输入标签名称");
      return;
    }
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          slug: createSlug.trim(),
          group_id: createGroupId || null,
          sort: createSort,
          status: createStatus,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = (await res.json()) as Tag;
      setCreateOpen(false);
      await loadAllTags();
      setSelectedGroupKey((prev) => {
        if (prev === "all") return "all";
        if (prev === "ungrouped" && !created.group_id) return "ungrouped";
        return created.group_id ? created.group_id : "ungrouped";
      });
      setSelectedTagId(created.id || null);
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "创建失败";
      setError(message);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupCreateName.trim()) {
      setError("请输入分类名称");
      return;
    }
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/tag-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupCreateName.trim(),
          slug: groupCreateSlug.trim(),
          sort: groupCreateSort,
          status: groupCreateStatus,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = (await res.json()) as TagGroup;
      setGroupCreateOpen(false);
      await loadGroups();
      setSelectedGroupKey(created.id || "all");
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "创建失败";
      setError(message);
    }
  };

  const handleUpdateGroup = async () => {
    if (!groupEditing) return;
    if (!groupEditName.trim()) {
      setError("请输入分类名称");
      return;
    }
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/tag-groups/${groupEditing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupEditName.trim(),
          slug: groupEditSlug.trim(),
          sort: groupEditSort,
          status: groupEditStatus,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = (await res.json()) as TagGroup;
      setGroupEditOpen(false);
      setGroupEditing(null);
      await loadGroups();
      setSelectedGroupKey(updated.id || "all");
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "更新失败";
      setError(message);
    }
  };

  const handleDeleteGroup = async (group: TagGroup) => {
    const confirmName = window.prompt(`输入分类名称确认删除：${group.name}`);
    if (confirmName !== group.name) {
      setError("名称不匹配，已取消删除");
      return;
    }
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/tag-groups/${group.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      await loadGroups(true);
      setSelectedTagId(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "删除失败";
      setError(message);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    if (!editName.trim()) {
      setError("请输入标签名称");
      return;
    }
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/tags/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim(),
          group_id: editGroupId,
          sort: editSort,
          status: editStatus,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = (await res.json()) as Tag;
      setEditOpen(false);
      setEditing(null);
      await loadAllTags();
      setSelectedGroupKey((prev) => {
        if (prev === "all") return "all";
        if (prev === "ungrouped" && !updated.group_id) return "ungrouped";
        return updated.group_id ? updated.group_id : "ungrouped";
      });
      setSelectedTagId(updated.id || null);
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "更新失败";
      setError(message);
    }
  };

  const handleDelete = async (tag: Tag) => {
    const confirmName = window.prompt(`输入标签名称确认删除：${tag.name}`);
    if (confirmName !== tag.name) {
      setError("名称不匹配，已取消删除");
      return;
    }
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/tags/${tag.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      await loadAllTags();
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "删除失败";
      setError(message);
    }
  };

  const loading = loadingGroups || loadingTags;
  const canDeleteSelected = selectedUsage === 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="标签管理"
        description="维护标签分类、关键词与展示信息。"
        actions={
          <div className="flex items-center gap-3">
            <button
              className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
              onClick={() => {
                loadGroups(false);
                loadAllTags();
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : "transition-transform group-hover:rotate-180 duration-500"}`} />
              {loading ? "加载中..." : "刷新列表"}
            </button>
            <button
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md active:scale-95"
              onClick={openCreateGroup}
            >
              <Plus className="h-3.5 w-3.5" />
              新建标签分类
            </button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600 animate-in fade-in slide-in-from-top-2">
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="sticky top-4 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-sm backdrop-blur">
        {(
          [
            { key: "all" as GroupKey, name: "全部标签", count: tagCounts.total },
            { key: "ungrouped" as GroupKey, name: "未分组", count: tagCounts.ungrouped },
          ]
        ).map((item) => {
          const active = item.key === selectedGroupKey;
          return (
            <button
              key={String(item.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => {
                setSelectedGroupKey(item.key);
                setSelectedTagId(null);
                setTagSearch("");
              }}
            >
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  active ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {item.key === "all" ? "全部" : "未分组"}
              </span>
              <span>{item.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  active ? "bg-white/20 text-white" : "bg-white text-slate-500"
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}
        {groups.map((group) => {
          const active = group.id === selectedGroupKey;
          const count = tagCounts.byGroup.get(group.id) || 0;
          return (
            <div
              key={group.id}
              className={`flex items-center gap-1 rounded-xl px-2 py-1 text-sm font-semibold transition-all ${
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <button
                className="flex items-center gap-2 px-2 py-1"
                onClick={() => {
                  setSelectedGroupKey(group.id);
                  setSelectedTagId(null);
                  setTagSearch("");
                }}
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    active ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  分类
                </span>
                <span>{group.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    active ? "bg-white/20 text-white" : "bg-white text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
              <button
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                  active ? "text-white/80 hover:text-white" : "text-slate-400 hover:text-indigo-600"
                }`}
                onClick={() => openEditGroup(group)}
                title="编辑分类"
                type="button"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                  active ? "text-white/80 hover:text-white" : "text-slate-400 hover:text-red-600"
                }`}
                onClick={() => handleDeleteGroup(group)}
                title="删除分类"
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {!groups.length && <div className="text-xs text-slate-400">暂无标签分类</div>}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-[330px] shrink-0 flex flex-col rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden sticky top-4">
          <div className="flex items-center justify-between border-b border-slate-50 p-5 bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Layers className="h-4 w-4 text-indigo-500" />
              标签列表
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {groupTags.length}
              </span>
              <button
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                onClick={openCreate}
              >
                <Plus className="h-3 w-3" />
                新增标签
              </button>
            </div>
          </div>
          <div className="p-3">
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-indigo-400"
              placeholder="搜索标签（名称/slug）"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto p-2 max-h-[calc(100vh-290px)] custom-scrollbar">
            <div className="space-y-1">
              {filteredTags.map((tag) => (
                <div
                  key={tag.id}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-all ${
                    selectedTagId === tag.id
                      ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/50 shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <button
                    className="flex flex-1 items-center gap-3 text-left"
                    onClick={() => setSelectedTagId(tag.id)}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        selectedTagId === tag.id
                          ? "bg-indigo-100 text-indigo-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <TagIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{tag.name}</div>
                      <div className="truncate text-[11px] text-slate-400">{tag.slug}</div>
                    </div>
                  </button>
                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600"
                    onClick={() => openEdit(tag)}
                    title="编辑标签"
                    type="button"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {!filteredTags.length && (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
                {selectedGroupKey === "all"
                  ? tagSearch
                    ? "暂无匹配的标签"
                    : "暂无标签"
                  : selectedGroupKey === "ungrouped"
                    ? tagSearch
                      ? "暂无匹配的标签"
                      : "暂无未分组标签"
                    : tagSearch
                      ? "暂无匹配的标签"
                      : "该分类暂无标签"}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden min-h-[520px]">
          {selectedTag ? (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 p-6 bg-slate-50/20">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <TagIcon className="h-6 w-6 text-slate-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{selectedTag.name}</h2>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        ID: {selectedTag.id}
                      </span>
                      {(selectedTag.group_name || selectedGroup?.name) && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                          {selectedTag.group_name || selectedGroup?.name}
                        </span>
                      )}
                      {!selectedTag.group_id && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                          未分组
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 shadow-sm"
                    onClick={() => openEdit(selectedTag)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    编辑
                  </button>
                  <div className="h-4 w-px bg-slate-100 mx-1" />
                  <button
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition-all shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                    onClick={() => handleDelete(selectedTag)}
                    disabled={!canDeleteSelected}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {canDeleteSelected ? "删除" : "有引用不可删"}
                  </button>
                </div>
              </div>

              <div className="p-8">
                <div className="grid gap-x-12 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
                  <InfoItem label="标签名称" value={selectedTag.name} />
                  <InfoItem label="Slug" value={selectedTag.slug} mono />
                  <InfoItem label="所属分类" value={selectedTag.group_name || selectedGroup?.name || "未分组"} />
                  <InfoItem label="状态" value={selectedTag.status || "active"} />
                  <InfoItem label="排序" value={String(selectedTag.sort ?? 0)} />
                  <InfoItem label="合集引用" value={String(selectedTag.collection_count ?? 0)} />
                  <InfoItem label="表情引用" value={String(selectedTag.emoji_count ?? 0)} />
                  <InfoItem label="总引用" value={String(selectedUsage)} />
                  <InfoItem label="创建时间" value={formatDate(selectedTag.created_at)} />
                  <InfoItem label="更新时间" value={formatDate(selectedTag.updated_at)} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-12 text-center bg-slate-50/10">
              <div className="relative mb-6">
                <div className="absolute inset-0 animate-ping rounded-full bg-indigo-100 opacity-20" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 text-indigo-400 border border-indigo-100 shadow-sm">
                  <TagIcon className="h-10 w-10" />
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-800">未选择标签</h3>
              <p className="mt-2 max-w-[280px] text-sm text-slate-400 font-medium leading-relaxed">
                请从左侧列表中选择一个标签，以查看、编辑详细信息或执行删除操作。
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={createOpen}
        title="新建标签"
        onClose={() => setCreateOpen(false)}
      >
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <div className="mt-4 space-y-4">
          <FormItem label="标签名称" required>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              placeholder="请输入标签名称"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
          </FormItem>
          <FormItem label="Slug">
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              placeholder="可留空自动生成"
              value={createSlug}
              onChange={(e) => setCreateSlug(e.target.value)}
            />
          </FormItem>
          <FormItem label="所属分类">
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              value={createGroupId}
              onChange={(e) => setCreateGroupId(Number(e.target.value))}
            >
              <option value={0}>未分组</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </FormItem>
          <FormItem label="排序">
            <input
              type="number"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              value={createSort}
              onChange={(e) => setCreateSort(Number(e.target.value))}
            />
          </FormItem>
          <FormItem label="状态">
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              value={createStatus}
              onChange={(e) => setCreateStatus(e.target.value)}
            >
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </FormItem>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            onClick={handleCreate}
          >
            创建
          </button>
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:border-slate-300"
            onClick={() => setCreateOpen(false)}
          >
            取消
          </button>
        </div>
      </Modal>

      <Modal
        open={groupCreateOpen}
        title="新建标签分类"
        onClose={() => setGroupCreateOpen(false)}
      >
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <div className="mt-4 space-y-4">
          <FormItem label="分类名称" required>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              placeholder="请输入分类名称"
              value={groupCreateName}
              onChange={(e) => setGroupCreateName(e.target.value)}
            />
          </FormItem>
          <FormItem label="Slug">
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              placeholder="可留空自动生成"
              value={groupCreateSlug}
              onChange={(e) => setGroupCreateSlug(e.target.value)}
            />
          </FormItem>
          <FormItem label="排序">
            <input
              type="number"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              value={groupCreateSort}
              onChange={(e) => setGroupCreateSort(Number(e.target.value))}
            />
          </FormItem>
          <FormItem label="状态">
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              value={groupCreateStatus}
              onChange={(e) => setGroupCreateStatus(e.target.value)}
            >
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </FormItem>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            onClick={handleCreateGroup}
          >
            创建
          </button>
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:border-slate-300"
            onClick={() => setGroupCreateOpen(false)}
          >
            取消
          </button>
        </div>
      </Modal>

      <Modal
        open={groupEditOpen && !!groupEditing}
        title="编辑标签分类"
        onClose={() => setGroupEditOpen(false)}
      >
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <div className="mt-4 space-y-4">
          <FormItem label="分类名称" required>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              value={groupEditName}
              onChange={(e) => setGroupEditName(e.target.value)}
            />
          </FormItem>
          <FormItem label="Slug">
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              value={groupEditSlug}
              onChange={(e) => setGroupEditSlug(e.target.value)}
            />
          </FormItem>
          <FormItem label="排序">
            <input
              type="number"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              value={groupEditSort}
              onChange={(e) => setGroupEditSort(Number(e.target.value))}
            />
          </FormItem>
          <FormItem label="状态">
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              value={groupEditStatus}
              onChange={(e) => setGroupEditStatus(e.target.value)}
            >
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </FormItem>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            onClick={handleUpdateGroup}
          >
            保存
          </button>
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:border-slate-300"
            onClick={() => setGroupEditOpen(false)}
          >
            取消
          </button>
        </div>
      </Modal>

      <Modal
        open={editOpen && !!editing}
        title="编辑标签"
        onClose={() => setEditOpen(false)}
      >
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <div className="mt-4 space-y-4">
          <FormItem label="标签名称" required>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </FormItem>
          <FormItem label="Slug">
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              value={editSlug}
              onChange={(e) => setEditSlug(e.target.value)}
            />
          </FormItem>
          <FormItem label="所属分类">
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              value={editGroupId}
              onChange={(e) => setEditGroupId(Number(e.target.value))}
            >
              <option value={0}>未分组</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </FormItem>
          <FormItem label="排序">
            <input
              type="number"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              value={editSort}
              onChange={(e) => setEditSort(Number(e.target.value))}
            />
          </FormItem>
          <FormItem label="状态">
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
            >
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </FormItem>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            onClick={handleUpdate}
          >
            保存
          </button>
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:border-slate-300"
            onClick={() => setEditOpen(false)}
          >
            取消
          </button>
        </div>
      </Modal>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function InfoItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div
        className={`text-sm text-slate-700 ${
          mono
            ? "font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit"
            : "font-semibold"
        }`}
      >
        {value || "-"}
      </div>
    </div>
  );
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
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl"
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
