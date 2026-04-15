"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Layers,
  Tag as TagIcon,
  Image as ImageIcon,
  Eye,
  ShieldCheck,
} from "lucide-react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type Collection = {
  id: number;
  title: string;
  slug: string;
  description?: string;
  cover_url?: string;
  cover_key?: string;
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
  visibility?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  tags?: { id: number; name: string; slug: string }[];
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
};

type TagSection = {
  id: number;
  name: string;
  tags: Tag[];
};

type TreeItem = {
  category: Category;
  depth: number;
};

const INPUT_CLASS =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
const TEXTAREA_CLASS =
  "min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

function parseErrorMessage(raw: string) {
  const text = raw.trim();
  if (!text) return "操作失败";
  try {
    const data = JSON.parse(text) as { error?: string };
    if (data?.error) return data.error;
  } catch {
    // ignore
  }
  return text;
}

function formatDateTime(raw?: string) {
  if (!raw) return "-";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN");
}

function sortCategory(a: Category, b: Category) {
  const aSort = a.sort ?? 0;
  const bSort = b.sort ?? 0;
  if (aSort !== bSort) return aSort - bSort;
  return a.id - b.id;
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
  roots.sort(sortCategory);
  for (const list of map.values()) list.sort(sortCategory);

  const result: TreeItem[] = [];
  const seen = new Set<number>();
  const visit = (node: Category, depth: number) => {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    result.push({ category: node, depth });
    const children = map.get(node.id) || [];
    for (const child of children) visit(child, depth + 1);
  };
  for (const root of roots) visit(root, 0);
  return result;
}

function isImageFile(value: string) {
  const clean = (value || "").split("?")[0].split("#")[0].toLowerCase();
  return /\.(jpe?g|png|gif|webp)$/.test(clean);
}

function buildStaticPreview(url: string) {
  const val = (url || "").trim();
  if (!val.startsWith("http://") && !val.startsWith("https://")) return "";
  if (val.includes("imageMogr2/")) return val;
  if (val.includes("token=") || val.includes("e=")) return "";
  const separator = val.includes("?") ? "&" : "?";
  return `${val}${separator}imageMogr2/thumbnail/!320x320r/gravity/Center/crop/320x320/format/webp`;
}

function EditSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
        {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function FormItem({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default function EditCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const collectionID = Number(idParam || 0);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [collection, setCollection] = useState<Collection | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [ips, setIps] = useState<IPItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState("");
  const [status, setStatus] = useState("active");
  const [visibility, setVisibility] = useState("public");
  const [categoryId, setCategoryId] = useState<number>(0);
  const [ipId, setIpId] = useState<number>(0);
  const [themeId, setThemeId] = useState<number>(0);
  const [featured, setFeatured] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [sample, setSample] = useState(false);
  const [showcase, setShowcase] = useState(false);
  const [copyrightAuthor, setCopyrightAuthor] = useState("");
  const [copyrightWork, setCopyrightWork] = useState("");
  const [copyrightLink, setCopyrightLink] = useState("");

  const [tagIds, setTagIds] = useState<number[]>([]);
  const [tagKeyword, setTagKeyword] = useState("");
  const [tagGroupFilter, setTagGroupFilter] = useState<number>(0);

  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [coverQuery, setCoverQuery] = useState("");
  const [coverType, setCoverType] = useState("image");
  const [coverResults, setCoverResults] = useState<{ key: string; url?: string }[]>([]);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverMarker, setCoverMarker] = useState("");
  const [coverHasNext, setCoverHasNext] = useState(false);
  const [coverUrlMap, setCoverUrlMap] = useState<Record<string, string>>({});

  const treeItems = useMemo(() => buildTree(categories), [categories]);

  const groupedCollectionTags = useMemo<TagSection[]>(() => {
    const keyword = tagKeyword.trim().toLowerCase();
    const filtered = tags.filter((tag) => {
      if (tagGroupFilter && (tag.group_id || 0) !== tagGroupFilter) {
        return false;
      }
      if (!keyword) return true;
      return tag.name.toLowerCase().includes(keyword) || tag.slug.toLowerCase().includes(keyword);
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
  }, [tags, tagGroups, tagKeyword, tagGroupFilter]);

  const coverPreviewUrl = useMemo(() => {
    if (!cover) return "";
    if (!isImageFile(cover)) return "";
    if (cover.startsWith("http://") || cover.startsWith("https://")) {
      return buildStaticPreview(cover) || cover;
    }
    return coverUrlMap[cover] || "";
  }, [cover, coverUrlMap]);

  const loadDictionaries = async () => {
    const [catRes, themeRes, ipRes, tagRes, groupRes] = await Promise.all([
      fetchWithAuth(`${API_BASE}/api/admin/categories`),
      fetchWithAuth(`${API_BASE}/api/admin/themes`),
      fetchWithAuth(`${API_BASE}/api/admin/ips`),
      fetchWithAuth(`${API_BASE}/api/admin/tags`),
      fetchWithAuth(`${API_BASE}/api/admin/tag-groups`),
    ]);

    if (catRes.ok) {
      const data = (await catRes.json()) as Category[];
      setCategories(data || []);
    }
    if (themeRes.ok) {
      const data = (await themeRes.json()) as Theme[];
      setThemes(data || []);
    }
    if (ipRes.ok) {
      const data = (await ipRes.json()) as IPItem[];
      setIps(data || []);
    }
    if (tagRes.ok) {
      const data = (await tagRes.json()) as Tag[];
      setTags(data || []);
    }
    if (groupRes.ok) {
      const data = (await groupRes.json()) as TagGroup[];
      setTagGroups(data || []);
    }
  };

  const loadCollection = async () => {
    if (!collectionID || Number.isNaN(collectionID)) {
      setError("无效合集 ID");
      return;
    }
    const res = await fetchWithAuth(`${API_BASE}/api/collections/${collectionID}`);
    if (!res.ok) {
      throw new Error(parseErrorMessage(await res.text()));
    }
    const data = (await res.json()) as Collection;
    setCollection(data);

    setTitle(data.title || "");
    setDescription(data.description || "");
    setCover(data.cover_key || data.cover_url || "");
    setStatus(data.status || "active");
    setVisibility(data.visibility || "public");
    setCategoryId(data.category_id || 0);
    setIpId(data.ip_id || 0);
    setThemeId(data.theme_id || 0);
    setFeatured(Boolean(data.is_featured));
    setPinned(Boolean(data.is_pinned));
    setSample(Boolean(data.is_sample));
    setShowcase(Boolean(data.is_showcase));
    setCopyrightAuthor(data.copyright_author || "");
    setCopyrightWork(data.copyright_work || "");
    setCopyrightLink(data.copyright_link || "");
    setTagIds(data.tags?.map((item) => item.id) || []);
  };

  useEffect(() => {
    let disposed = false;
    const bootstrap = async () => {
      setLoading(true);
      setError(null);
      try {
        await loadDictionaries();
        if (disposed) return;
        await loadCollection();
      } catch (err: unknown) {
        if (disposed) return;
        const message = err instanceof Error ? err.message : "加载失败";
        setError(message);
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    void bootstrap();
    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionID]);

  useEffect(() => {
    const fetchDirectUrl = async () => {
      if (!cover) return;
      if (!isImageFile(cover)) return;
      if (cover.startsWith("http://") || cover.startsWith("https://")) return;
      if (coverUrlMap[cover]) return;
      try {
        const res = await fetchWithAuth(
          `${API_BASE}/api/storage/url?key=${encodeURIComponent(cover)}&style=cover_static`
        );
        if (!res.ok) return;
        const data = (await res.json()) as { url?: string };
        if (data.url) {
          setCoverUrlMap((prev) => ({ ...prev, [cover]: data.url as string }));
        }
      } catch {
        // ignore
      }
    };
    void fetchDirectUrl();
  }, [cover, coverUrlMap]);

  const searchCoverAssets = async (
    keyword: string,
    fileType: string,
    marker: string,
    append = false
  ) => {
    setCoverLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set("prefix", "emoji/");
      if (keyword.trim()) query.set("keyword", keyword.trim());
      if (fileType && fileType !== "all") query.set("type", fileType);
      query.set("limit", "24");
      if (marker) query.set("marker", marker);

      const res = await fetchWithAuth(`${API_BASE}/api/admin/storage/search?${query.toString()}`);
      if (!res.ok) throw new Error(parseErrorMessage(await res.text()));
      const data = (await res.json()) as {
        items: { key: string; url?: string }[];
        next_marker: string;
        has_next: boolean;
      };
      const normalizedItems = (data.items || []).map((item) => {
        const rawUrl = item.url || "";
        if (!rawUrl) return item;
        if (/\.(mp4|webm)(?:[?#]|$)/i.test(rawUrl)) return item;
        return { ...item, url: buildStaticPreview(rawUrl) || rawUrl };
      });
      setCoverResults((prev) => (append ? [...prev, ...normalizedItems] : normalizedItems));
      setCoverMarker(data.next_marker || "");
      setCoverHasNext(Boolean(data.has_next));

      const patch: Record<string, string> = {};
      for (const item of normalizedItems) {
        if (item.url) patch[item.key] = item.url;
      }
      if (Object.keys(patch).length) {
        setCoverUrlMap((prev) => ({ ...prev, ...patch }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "搜索封面失败";
      setError(message);
    } finally {
      setCoverLoading(false);
    }
  };

  const toggleTag = (id: number) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const saveCollection = async () => {
    if (!collectionID || Number.isNaN(collectionID)) return;
    if (!title.trim()) {
      setError("请输入合集标题");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/collections/${collectionID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          cover_url: cover.trim(),
          status,
          visibility,
          category_id: categoryId || null,
          ip_id: ipId || null,
          theme_id: themeId || null,
          is_featured: featured,
          is_pinned: pinned,
          is_sample: sample,
          is_showcase: showcase,
          copyright_author: copyrightAuthor.trim(),
          copyright_work: copyrightWork.trim(),
          copyright_link: copyrightLink.trim(),
          tag_ids: tagIds,
        }),
      });
      if (!res.ok) throw new Error(parseErrorMessage(await res.text()));

      await loadCollection();
      setSuccess("保存成功");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "保存失败";
      if (message.includes("已有四个推荐")) {
        setError("已有四个推荐，请先取消一个推荐后再保存");
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!collectionID || Number.isNaN(collectionID)) {
    return (
      <div className="space-y-4">
        <SectionHeader title="编辑合集" description="参数无效，请返回列表重试" />
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          无效的合集 ID
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <SectionHeader
        title={collection ? `编辑合集：${collection.title}` : `编辑合集 #${collectionID}`}
        description="已从弹窗改为独立编辑页，按功能分区管理，便于运营在更大视野下维护合集信息。"
        actions={
          <>
            <Link
              href="/admin/archive/collections"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft size={14} /> 返回列表
            </Link>
            <Link
              href={`/admin/archive/collections/${collectionID}/emojis`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              <ImageIcon size={14} /> 管理表情
            </Link>
          </>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {success}
        </div>
      ) : null}

      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-500">
          <RefreshCw size={16} className="mr-2 animate-spin" /> 加载中...
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr),320px]">
          <div className="space-y-5">
            <EditSection title="基础信息" description="维护合集名称和简介文案。">
              <div className="grid gap-4">
                <FormItem label="标题" required>
                  <input className={INPUT_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} />
                </FormItem>
                <FormItem label="描述">
                  <textarea
                    className={TEXTAREA_CLASS}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </FormItem>
              </div>
            </EditSection>

            <EditSection title="归类信息" description="维护分类、主题和 IP 归属。">
              <div className="grid gap-4 md:grid-cols-3">
                <FormItem label="分类">
                  <select
                    className={INPUT_CLASS}
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                  >
                    <option value={0}>未选择</option>
                    {treeItems.map((item) => {
                      const hasChildren = categories.some((cat) => cat.parent_id === item.category.id);
                      return (
                        <option
                          key={item.category.id}
                          value={item.category.id}
                          disabled={hasChildren}
                          style={hasChildren ? { color: "#94a3b8", fontStyle: "italic" } : {}}
                        >
                          {"— ".repeat(item.depth)}
                          {item.category.name}
                          {hasChildren ? " (请选择子分类)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </FormItem>
                <FormItem label="主题">
                  <select className={INPUT_CLASS} value={themeId} onChange={(e) => setThemeId(Number(e.target.value))}>
                    <option value={0}>未选择</option>
                    {themes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </FormItem>
                <FormItem label="IP">
                  <select className={INPUT_CLASS} value={ipId} onChange={(e) => setIpId(Number(e.target.value))}>
                    <option value={0}>未选择</option>
                    {ips.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </FormItem>
              </div>
              {collection?.path_mismatch ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  ⚠ 分类与实际存储路径不一致，请核对分类或资源目录。
                </div>
              ) : null}
            </EditSection>

            <EditSection title="封面设置" description="支持手输 URL 或从七牛资源库选择封面。">
              <div className="grid gap-4">
                <FormItem label="封面 URL / Key">
                  <input className={INPUT_CLASS} value={cover} onChange={(e) => setCover(e.target.value)} />
                </FormItem>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <button
                    className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:border-slate-300"
                    onClick={() => setCoverPickerOpen((prev) => !prev)}
                    type="button"
                  >
                    {coverPickerOpen ? "收起选择" : "从七牛选择"}
                  </button>
                  {coverPreviewUrl ? <span className="text-emerald-700">已识别封面预览</span> : null}
                </div>

                {coverPreviewUrl ? (
                  <div className="h-40 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <img src={coverPreviewUrl} alt="cover-preview" className="h-full w-full object-cover" />
                  </div>
                ) : null}

                {coverPickerOpen ? (
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        className="h-9 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-400"
                        placeholder="搜索封面关键词"
                        value={coverQuery}
                        onChange={(e) => setCoverQuery(e.target.value)}
                      />
                      <select
                        className="h-9 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-400"
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
                        type="button"
                      >
                        {coverLoading ? "搜索中" : "搜索"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      {coverResults.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white"
                          onClick={() => {
                            setCover(item.key);
                            if (item.url) {
                              setCoverUrlMap((prev) => ({ ...prev, [item.key]: item.url || "" }));
                            }
                            setCoverPickerOpen(false);
                          }}
                        >
                          {item.url ? (
                            item.url.endsWith(".mp4") || item.url.endsWith(".webm") ? (
                              <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                            ) : (
                              <img src={item.url} alt={item.key} className="h-full w-full object-cover" />
                            )
                          ) : (
                            <span className="px-2 text-[10px] text-slate-500">{item.key.split("/").pop()}</span>
                          )}
                        </button>
                      ))}
                      {!coverResults.length ? (
                        <div className="col-span-4 rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] text-slate-400">
                          暂无封面结果
                        </div>
                      ) : null}
                    </div>

                    {coverHasNext ? (
                      <button
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px] text-slate-600 hover:border-slate-300"
                        onClick={() => searchCoverAssets(coverQuery, coverType, coverMarker, true)}
                        disabled={coverLoading}
                        type="button"
                      >
                        {coverLoading ? "加载中" : "加载更多"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </EditSection>

            <EditSection title="发布与运营" description="控制可见状态及运营位属性。">
              <div className="grid gap-4 md:grid-cols-2">
                <FormItem label="状态">
                  <select className={INPUT_CLASS} value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="active">active</option>
                    <option value="pending">pending</option>
                    <option value="disabled">disabled</option>
                  </select>
                </FormItem>
                <FormItem label="可见性">
                  <select
                    className={INPUT_CLASS}
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                  >
                    <option value="public">public</option>
                    <option value="private">private</option>
                  </select>
                </FormItem>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                  <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> 推荐
                </label>
                <label className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> 置顶
                </label>
                <label className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                  <input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} /> 样本
                </label>
                <label className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                  <input type="checkbox" checked={showcase} onChange={(e) => setShowcase(e.target.checked)} /> 赏析
                </label>
              </div>
            </EditSection>

            <EditSection title="版权信息" description="前台展示的版权标注信息。">
              <div className="grid gap-4 md:grid-cols-3">
                <FormItem label="图片作者">
                  <input
                    className={INPUT_CLASS}
                    value={copyrightAuthor}
                    onChange={(e) => setCopyrightAuthor(e.target.value)}
                    placeholder="例如 Downvote"
                  />
                </FormItem>
                <FormItem label="原作">
                  <input
                    className={INPUT_CLASS}
                    value={copyrightWork}
                    onChange={(e) => setCopyrightWork(e.target.value)}
                    placeholder="例如《孤独摇滚！》"
                  />
                </FormItem>
                <FormItem label="来源链接 / 作者主页">
                  <input
                    className={INPUT_CLASS}
                    value={copyrightLink}
                    onChange={(e) => setCopyrightLink(e.target.value)}
                  />
                </FormItem>
              </div>
            </EditSection>

            <EditSection title="标签管理" description="支持按标签组与关键词筛选，多选应用到合集。">
              <div className="grid gap-2 md:grid-cols-[1fr_220px]">
                <input
                  className={INPUT_CLASS}
                  placeholder="筛选标签（名称或 slug）"
                  value={tagKeyword}
                  onChange={(e) => setTagKeyword(e.target.value)}
                />
                <select
                  className={INPUT_CLASS}
                  value={tagGroupFilter}
                  onChange={(e) => setTagGroupFilter(Number(e.target.value))}
                >
                  <option value={0}>全部标签组</option>
                  {tagGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {groupedCollectionTags.map((section) => (
                  <div key={`${section.id}-${section.name}`} className="mb-4 last:mb-0">
                    <div className="mb-2 text-xs font-semibold text-slate-500">{section.name}</div>
                    <div className="flex flex-wrap gap-2">
                      {section.tags.map((tag) => {
                        const active = tagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
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
                {!groupedCollectionTags.length ? <div className="text-xs text-slate-400">暂无标签</div> : null}
              </div>
            </EditSection>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
            <EditSection title="操作区" description="保存后实时刷新当前合集详情。">
              <div className="space-y-2">
                <button
                  type="button"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  onClick={() => void saveCollection()}
                  disabled={saving}
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? "保存中..." : "保存修改"}
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  onClick={() => router.push("/admin/archive/collections")}
                >
                  返回合集列表
                </button>
              </div>
            </EditSection>

            <EditSection title="当前信息" description="辅助运营快速确认对象上下文。">
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2"><ShieldCheck size={13} className="text-slate-400" /> ID：#{collectionID}</div>
                <div className="flex items-center gap-2"><Layers size={13} className="text-slate-400" /> 来源：{collection?.source || "-"}</div>
                <div className="flex items-center gap-2"><TagIcon size={13} className="text-slate-400" /> 标签数：{tagIds.length}</div>
                <div className="flex items-center gap-2"><ImageIcon size={13} className="text-slate-400" /> 文件数：{collection?.file_count ?? 0}</div>
                <div className="flex items-center gap-2"><Eye size={13} className="text-slate-400" /> Owner：{collection?.owner_id ?? "-"}</div>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500">
                <div>创建：{formatDateTime(collection?.created_at)}</div>
                <div className="mt-1">更新：{formatDateTime(collection?.updated_at)}</div>
              </div>
            </EditSection>
          </aside>
        </div>
      )}
    </div>
  );
}
