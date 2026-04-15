"use client";
/* eslint-disable @next/next/no-img-element */

import { ReactNode, useEffect, useMemo, useState } from "react";
import { Edit2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
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

type Category = {
  id: number;
  name: string;
  parent_id?: number | null;
  sort?: number;
};

type TreeItem = { category: Category; depth: number };

type IPBindingMetrics = {
  total_collections?: number;
  bound_collections?: number;
  unbound_collections?: number;
  coverage?: number;
};

const sortCategory = (a: Category, b: Category) => {
  const aSort = a.sort ?? 0;
  const bSort = b.sort ?? 0;
  if (aSort !== bSort) return aSort - bSort;
  return a.id - b.id;
};

const buildTree = (categories: Category[]) => {
  const roots = categories.filter((c) => !c.parent_id).sort(sortCategory);
  const map = new Map<number, Category[]>();
  categories.forEach((cat) => {
    if (!cat.parent_id) return;
    const list = map.get(cat.parent_id) || [];
    list.push(cat);
    map.set(cat.parent_id, list);
  });
  for (const list of map.values()) {
    list.sort(sortCategory);
  }
  const items: TreeItem[] = [];
  const walk = (cat: Category, depth: number) => {
    items.push({ category: cat, depth });
    const children = map.get(cat.id) || [];
    children.forEach((child) => walk(child, depth + 1));
  };
  roots.forEach((root) => walk(root, 0));
  return items;
};

const INPUT_CLASS =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
const SELECT_CLASS = INPUT_CLASS;
const PRIMARY_BUTTON_CLASS =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-emerald-600";
const SECONDARY_BUTTON_CLASS =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50";

export default function Page() {
  const [ips, setIps] = useState<IPItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bindingMetrics, setBindingMetrics] = useState<IPBindingMetrics | null>(null);

  const [createOpen, setCreateOpen] = useState(false);

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

  const treeItems = useMemo(() => buildTree(categories), [categories]);

  const coverPreviewUrl = useMemo(() => {
    if (!formCover) return "";
    if (formCover.startsWith("http")) return formCover;
    return coverUrlMap[formCover] || "";
  }, [formCover, coverUrlMap]);

  const summary = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let boundCollections = 0;
    for (const item of ips) {
      if ((item.status || "active") === "inactive") inactive += 1;
      else active += 1;
      boundCollections += Number(item.collection_count || 0);
    }
    return {
      total: ips.length,
      active,
      inactive,
      boundCollections,
    };
  }, [ips]);

  const normalizeError = (raw: string) => {
    const text = raw.trim();
    if (!text) return "操作失败";
    try {
      const data = JSON.parse(text) as { error?: string };
      if (data?.error) return mapErrorText(data.error);
    } catch {
      // ignore
    }
    return mapErrorText(text);
  };

  const mapErrorText = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("name required")) return "请输入IP名称";
    if (lower.includes("slug required")) return "Slug 不能为空";
    if (lower.includes("unique") || lower.includes("duplicate")) return "IP 已存在";
    if (lower.includes("collection not found")) return "绑定的合集ID不存在，请检查后重试";
    if (lower.includes("ip in use")) return "该IP已关联合集，无法删除";
    return text;
  };

  const loadCategories = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/categories`);
      if (!res.ok) return;
      const data = (await res.json()) as Category[];
      setCategories(data);
    } catch {
      // ignore
    }
  };

  const loadIps = async (q = "") => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("keyword", q.trim());
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ips?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as IPItem[];
      setIps(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "加载失败";
      setError(message);
      setIps([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBindingMetrics = async () => {
    setMetricsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ips/binding-metrics`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as IPBindingMetrics;
      setBindingMetrics(data);
    } catch {
      setBindingMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  };

  // 页面初始化时加载分类和 IP 列表
  useEffect(() => {
    loadCategories();
    loadIps();
    loadBindingMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!formName.trim()) {
      setError("请输入IP名称");
      return;
    }
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ips`, {
        method: "POST",
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
      setCreateOpen(false);
      await loadIps(keyword);
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "创建失败";
      setError(message);
    }
  };

  const handleDelete = async (item: IPItem) => {
    const confirmName = window.prompt(`输入IP名称确认删除：${item.name}`);
    if (confirmName !== item.name) {
      setError("名称不匹配，已取消删除");
      return;
    }
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ips/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await loadIps(keyword);
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "删除失败";
      setError(message);
    }
  };

  const sanitizeFileName = (name: string) => {
    const cleaned = name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
    return cleaned || "ip-cover";
  };

  const uploadCoverFile = async () => {
    if (!coverFile) {
      setError("请选择图片文件");
      return;
    }
    setError(null);
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
      const upHost = tokenData.up_host || "https://up.qiniup.com";

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
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(xhr.responseText || "upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("upload failed"));
        xhr.send(form);
      });

      // 固定保存 key，避免保存带过期参数的签名 URL。
      setFormCover(uploadKey);
      const urlRes = await fetchWithAuth(
        `${API_BASE}/api/storage/url?key=${encodeURIComponent(uploadKey)}&style=cover_static`
      );
      if (urlRes.ok) {
        const data = (await urlRes.json()) as { url?: string };
        if (data.url) {
          setCoverUrlMap((prev) => ({ ...prev, [uploadKey]: data.url as string }));
        }
      }
      setCoverFile(null);
      setCoverProgress(100);
    } catch (err: unknown) {
      const message = err instanceof Error ? normalizeError(err.message) : "上传失败";
      setError(message);
    } finally {
      setCoverUploading(false);
    }
  };

  const fetchStorageUrl = async (key: string) => {
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/storage/url?key=${encodeURIComponent(key)}&style=cover_static`
      );
      if (!res.ok) return "";
      const data = (await res.json()) as { url?: string };
      return data.url || "";
    } catch {
      return "";
    }
  };

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
    if (item.url) {
      setFormCover(item.url);
      return;
    }
    const resolved = await fetchStorageUrl(item.key);
    if (resolved) {
      setFormCover(resolved);
    } else {
      setFormCover(item.key);
    }
  };

  const renderCoverPicker = () => (
    <div className="mt-2 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
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
        <div className="mt-2 h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <img src={coverPreviewUrl} alt="cover" className="h-full w-full object-cover" />
        </div>
      )}
      {coverPickerOpen && (
        <div className="mt-2 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
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
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                    无预览
                  </div>
                )}
              </button>
            ))}
            {!coverResults.length && (
              <div className="col-span-4 text-center text-xs text-slate-400">
                暂无结果
              </div>
            )}
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
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="IP 管理"
        description="维护表情包 IP 基础信息。进入编辑页可维护该 IP 关联合集；合集页也可批量设置主IP。"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-10 w-56 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-600 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="搜索IP..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadIps(keyword);
                }}
              />
            </div>
            <button
              className={`${SECONDARY_BUTTON_CLASS} group`}
              onClick={() => {
                void loadIps(keyword);
                void loadBindingMetrics();
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : "transition-transform group-hover:rotate-180 duration-500"}`} />
              {loading ? "加载中..." : "刷新"}
            </button>
            <Link
              className={`${PRIMARY_BUTTON_CLASS} shadow-sm active:scale-95`}
              href="/admin/taxonomy/ips/new"
            >
              <Plus className="h-3.5 w-3.5" />
              新建IP
            </Link>
          </div>
        }
      />

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">IP 总数</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{summary.total}</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700">启用中</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{summary.active}</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">停用</div>
          <div className="mt-1 text-2xl font-black text-slate-700">{summary.inactive}</div>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold text-indigo-700">IP下关联合集总量</div>
          <div className="mt-1 text-2xl font-black text-indigo-700">{summary.boundCollections}</div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">合集总数（去重）</div>
          <div className="mt-1 text-2xl font-black text-slate-900">
            {metricsLoading ? "-" : Number(bindingMetrics?.total_collections || 0)}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700">已绑定合集（去重）</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">
            {metricsLoading ? "-" : Number(bindingMetrics?.bound_collections || 0)}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold text-amber-700">绑定覆盖率</div>
          <div className="mt-1 text-2xl font-black text-amber-700">
            {metricsLoading
              ? "-"
              : `${((Number(bindingMetrics?.coverage || 0) || 0) * 100).toFixed(1)}%`}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-semibold">IP</th>
                  <th className="px-3 py-3 font-semibold">合集数</th>
                  <th className="px-3 py-3 font-semibold">状态</th>
                  <th className="px-3 py-3 font-semibold">排序</th>
                  <th className="px-3 py-3 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ips.map((item) => (
                  <tr key={item.id} className="text-slate-700 transition-colors hover:bg-slate-50/70">
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                          {item.cover_thumb_url || item.cover_url ? (
                            <img
                              src={item.cover_thumb_url || item.cover_url}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-300">
                              {item.name?.slice(0, 1) || "IP"}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-400">{item.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-500">{item.collection_count ?? 0}</td>
                    <td className="px-3 py-4 text-xs">
                      <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                        item.status === "inactive"
                          ? "border-slate-200 bg-slate-100 text-slate-600"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}>
                        {item.status === "inactive" ? "停用" : "启用"}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-500">{item.sort ?? 0}</td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                          href={`/admin/taxonomy/ips/${item.id}/edit`}
                        >
                          <Edit2 className="h-3 w-3" />
                          编辑
                        </Link>
                        <Link
                          className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                          href={`/admin/taxonomy/ips/${item.id}/edit#bindings-panel`}
                        >
                          绑定管理
                        </Link>
                        <button
                          className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-3 w-3" />
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!ips.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-400">
                      暂无IP
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={createOpen} title="新建IP" onClose={() => setCreateOpen(false)}>
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <div className="mt-4 space-y-4">
          <FormItem label="IP名称" required>
            <input
              className={INPUT_CLASS}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </FormItem>
          <FormItem label="Slug">
            <input
              className={INPUT_CLASS}
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              placeholder="可留空自动生成"
            />
          </FormItem>
          <FormItem label="形象图 URL">
            <input
              className={INPUT_CLASS}
              value={formCover}
              onChange={(e) => setFormCover(e.target.value)}
              placeholder="https://..."
            />
            <div className="mt-2 text-xs text-slate-500">
              推荐尺寸：<span className="font-semibold text-slate-700">1200 × 640</span>（约 1.88:1，居中主体）
            </div>
            <CoverUploader
              file={coverFile}
              uploading={coverUploading}
              progress={coverProgress}
              onFileChange={setCoverFile}
              onUpload={uploadCoverFile}
            />
            {renderCoverPicker()}
          </FormItem>
          <FormItem label="所属分类">
            <select
              className={SELECT_CLASS}
              value={formCategoryId}
              onChange={(e) => setFormCategoryId(Number(e.target.value))}
            >
              <option value={0}>未选择</option>
              {treeItems.map((item) => (
                <option key={item.category.id} value={item.category.id}>
                  {"— ".repeat(item.depth)}
                  {item.category.name}
                </option>
              ))}
            </select>
          </FormItem>
          <FormItem label="简介">
            <textarea
              className={`${INPUT_CLASS} h-24 py-2`}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          </FormItem>
          <div className="grid grid-cols-2 gap-4">
            <FormItem label="排序">
              <input
                type="number"
                className={INPUT_CLASS}
                value={formSort}
                onChange={(e) => setFormSort(Number(e.target.value))}
              />
            </FormItem>
            <FormItem label="状态">
              <select
                className={SELECT_CLASS}
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <option value="active">启用</option>
                <option value="inactive">停用</option>
              </select>
            </FormItem>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className={PRIMARY_BUTTON_CLASS}
            onClick={handleCreate}
          >
            创建
          </button>
          <button
            className={SECONDARY_BUTTON_CLASS}
            onClick={() => setCreateOpen(false)}
          >
            取消
          </button>
        </div>
      </Modal>

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
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="text-sm font-bold text-slate-800">{title}</div>
          <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700" onClick={onClose}>
            关闭
          </button>
        </div>
        {children}
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
