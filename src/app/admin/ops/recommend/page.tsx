"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, Search } from "lucide-react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type CollectionItem = {
  id: number;
  title: string;
  file_count?: number;
  cover_url?: string;
  is_featured?: boolean;
  category_id?: number | null;
  created_at?: string;
};

type FilterKey = "all" | "featured" | "normal";

export default function Page() {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadCollections = async (query = "") => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page_size: "200" });
      if (query.trim()) params.set("q", query.trim());
      const res = await fetchWithAuth(`${API_BASE}/api/collections?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { items?: CollectionItem[] };
      setCollections(data.items || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "featured") return collections.filter((c) => c.is_featured);
    if (filter === "normal") return collections.filter((c) => !c.is_featured);
    return collections;
  }, [collections, filter]);

  const featuredCount = useMemo(
    () => collections.filter((c) => c.is_featured).length,
    [collections]
  );

  const toggleFeatured = async (item: CollectionItem) => {
    if (updatingId) return;
    setUpdatingId(item.id);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/collections/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured: !item.is_featured }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCollections((prev) =>
        prev.map((col) => (col.id === item.id ? { ...col, is_featured: !item.is_featured } : col))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "更新失败";
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="推荐位"
        description="首页精选合集展示（基于 is_featured）。"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-56 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-600 outline-none focus:border-slate-300"
                placeholder="搜索合集..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadCollections(keyword);
                }}
              />
            </div>
            <button
              className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
              onClick={() => loadCollections(keyword)}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : "transition-transform group-hover:rotate-180 duration-500"}`} />
              {loading ? "加载中..." : "刷新"}
            </button>
          </div>
        }
      />

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all" as FilterKey, label: `全部 ${collections.length}` },
            { key: "featured" as FilterKey, label: `已推荐 ${featuredCount}` },
            { key: "normal" as FilterKey, label: `未推荐 ${collections.length - featuredCount}` },
          ]
        ).map((item) => {
          const active = item.key === filter;
          return (
            <button
              key={item.key}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                active
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">加载中...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${item.is_featured ? "bg-emerald-500" : "bg-slate-200"}`} />
                    <div className="truncate font-semibold text-slate-800">{item.title}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    ID: {item.id} · 表情数 {item.file_count || 0}
                  </div>
                </div>
                <button
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                    item.is_featured
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                  onClick={() => toggleFeatured(item)}
                  disabled={updatingId === item.id}
                >
                  {item.is_featured ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      已推荐
                    </>
                  ) : (
                    "设为推荐"
                  )}
                </button>
              </div>
            ))}
            {!filtered.length && (
              <div className="py-16 text-center text-sm text-slate-400">暂无数据</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
