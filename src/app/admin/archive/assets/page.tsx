"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import {
  API_BASE,
  ensureValidSession,
  fetchWithAuth,
  getAccessToken,
} from "@/lib/admin-auth";

type Category = {
  id: number;
  name: string;
  slug: string;
  prefix: string;
  parent_id?: number | null;
  sort: number;
  status: string;
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

type TagGroupKey = "ungrouped" | number;

type ImportZipResponse = {
  collection_id: number;
  title: string;
  slug: string;
  prefix: string;
  file_count: number;
  cover_key: string;
  source_zip_key: string;
};

type AppendZipResponse = {
  collection_id: number;
  added: number;
  file_count: number;
  prefix: string;
  cover_key?: string;
  source_zip_key: string;
};

type CollectionBrief = {
  id: number;
  title: string;
  slug: string;
  file_count?: number;
};

type UploadTaskKind = "import" | "append";
type UploadTaskStatus = "running" | "success" | "failed";
type UploadTaskStage = "uploading" | "processing" | "done";

type ImportUploadPayload = {
  title: string;
  description: string;
  category_id: number;
  tag_ids: number[];
  file: File;
};

type AppendUploadPayload = {
  collection_id: number;
  set_cover: boolean;
  file: File;
};

type UploadTaskRetry =
  | { kind: "import"; payload: ImportUploadPayload }
  | { kind: "append"; payload: AppendUploadPayload };

type UploadTask = {
  id: string;
  kind: UploadTaskKind;
  name: string;
  file_name: string;
  file_size: number;
  status: UploadTaskStatus;
  stage: UploadTaskStage;
  progress: number;
  created_at: string;
  finished_at?: string;
  error?: string;
  lines?: string[];
  retry: UploadTaskRetry;
};

type UploadTaskHistoryItem = {
  id: number;
  kind: UploadTaskKind;
  status: UploadTaskStatus;
  stage: UploadTaskStage;
  collection_id?: number | null;
  category_id?: number | null;
  file_name: string;
  file_size: number;
  result?: Record<string, unknown>;
  error_message?: string;
  started_at: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
};

type UploadTaskHistoryResponse = {
  items?: UploadTaskHistoryItem[];
  total?: number;
};

function makeTaskID() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function parseServerError(raw: string) {
  const text = (raw || "").trim();
  if (!text) return "上传失败";
  try {
    const data = JSON.parse(text) as { error?: string; message?: string };
    if (data.error) return data.error;
    if (data.message) return data.message;
  } catch {
    // ignore JSON parse error and fallback to plain text
  }
  return text;
}

function taskStageText(stage: string, status: string) {
  if (stage === "uploading") return "上传中";
  if (stage === "processing") return "云端处理中";
  if (status === "success") return "已完成";
  if (status === "failed") return "已失败";
  return "已结束";
}

function collectHistoryLines(task: UploadTaskHistoryItem) {
  const result = task.result || {};
  const lines: string[] = [];
  if (typeof result.collection_id === "number") {
    lines.push(`合集ID：${result.collection_id}`);
  }
  if (typeof result.added === "number") {
    lines.push(`新增数量：${result.added}`);
  }
  if (typeof result.file_count === "number") {
    lines.push(`文件数量：${result.file_count}`);
  }
  if (typeof result.prefix === "string" && result.prefix) {
    lines.push(`前缀：${result.prefix}`);
  }
  return lines;
}

export default function Page() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [collections, setCollections] = useState<CollectionBrief[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "processing">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportZipResponse | null>(null);
  const [appendResult, setAppendResult] = useState<AppendZipResponse | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTopId, setSelectedTopId] = useState<number | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [tagKeyword, setTagKeyword] = useState("");
  const [selectedTagGroupKey, setSelectedTagGroupKey] = useState<TagGroupKey>("ungrouped");

  const [appendCollectionId, setAppendCollectionId] = useState<number>(0);
  const [appendFiles, setAppendFiles] = useState<File[]>([]);
  const [appendSetCover, setAppendSetCover] = useState(false);
  const [appendUploading, setAppendUploading] = useState(false);
  const [appendProgress, setAppendProgress] = useState(0);
  const [appendStage, setAppendStage] = useState<"idle" | "uploading" | "processing">(
    "idle"
  );
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [historyTasks, setHistoryTasks] = useState<UploadTaskHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);

  const sortCategory = (a: Category, b: Category) => {
    if (a.sort !== b.sort) return a.sort - b.sort;
    return a.id - b.id;
  };

  const topCategories = useMemo(
    () => categories.filter((cat) => !cat.parent_id).sort(sortCategory),
    [categories]
  );

  const childCategories = useMemo(() => {
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
    return childCategories.get(selectedTopId) || [];
  }, [childCategories, selectedTopId]);

  const orderedTagGroups = useMemo(
    () => [...tagGroups].sort((a, b) => (a.sort !== b.sort ? a.sort - b.sort : a.id - b.id)),
    [tagGroups]
  );

  const selectedTagObjects = useMemo(
    () =>
      tags
        .filter((tag) => selectedTags.includes(tag.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [tags, selectedTags]
  );

  const filteredTags = useMemo(() => {
    const keyword = tagKeyword.trim().toLowerCase();
    const filtered = tags.filter((tag) => {
      const gid = tag.group_id || 0;
      if (selectedTagGroupKey === "ungrouped") {
        if (gid !== 0) return false;
      } else if (gid !== selectedTagGroupKey) {
        return false;
      }
      if (!keyword) return true;
      return (
        tag.name.toLowerCase().includes(keyword) ||
        tag.slug.toLowerCase().includes(keyword)
      );
    });
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [tags, selectedTagGroupKey, tagKeyword]);

  const taskStats = useMemo(() => {
    const stats = {
      total: tasks.length,
      running: 0,
      success: 0,
      failed: 0,
    };
    tasks.forEach((task) => {
      if (task.status === "running") stats.running += 1;
      if (task.status === "success") stats.success += 1;
      if (task.status === "failed") stats.failed += 1;
    });
    return stats;
  }, [tasks]);

  const createTask = (input: Omit<UploadTask, "id" | "created_at">) => {
    const taskID = makeTaskID();
    setTasks((prev) => [
      {
        ...input,
        id: taskID,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    return taskID;
  };

  const patchTask = (taskID: string, patch: Partial<UploadTask>) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskID ? { ...task, ...patch } : task))
    );
  };

  const clearFinishedTasks = () => {
    setTasks((prev) => prev.filter((task) => task.status === "running"));
  };

  const loadUploadTaskHistory = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/upload-tasks?page=1&page_size=80`);
      if (!res.ok) return;
      const data = (await res.json()) as UploadTaskHistoryResponse;
      setHistoryTasks(data.items || []);
      setHistoryTotal(data.total || 0);
    } catch {
      // ignore upload history errors to avoid blocking upload operations
    }
  };

  const loadBaseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, tagRes, colRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/admin/categories`),
        fetchWithAuth(`${API_BASE}/api/admin/tags`),
        fetchWithAuth(`${API_BASE}/api/collections?page=1&page_size=200`),
      ]);
      await loadUploadTaskHistory();
      const groupRes = await fetchWithAuth(`${API_BASE}/api/admin/tag-groups`);
      if (!catRes.ok) throw new Error(await catRes.text());
      if (!tagRes.ok) throw new Error(await tagRes.text());
      if (!colRes.ok) throw new Error(await colRes.text());
      const catData = (await catRes.json()) as Category[];
      const tagData = (await tagRes.json()) as Tag[];
      const colData = (await colRes.json()) as { items?: CollectionBrief[] };
      setCategories(catData);
      setTags(tagData);
      setCollections(colData.items || []);
      if (groupRes.ok) {
        const groupData = (await groupRes.json()) as TagGroup[];
        setTagGroups(groupData);
        setSelectedTagGroupKey((prev) => {
          if (typeof prev === "number") {
            return groupData.some((group) => group.id === prev)
              ? prev
              : groupData[0]?.id ?? "ungrouped";
          }
          return groupData[0]?.id ?? "ungrouped";
        });
      }
      if (catData.length) {
        const tops = catData.filter((cat) => !cat.parent_id).sort(sortCategory);
        const currentTop =
          selectedTopId && tops.find((cat) => cat.id === selectedTopId)
            ? selectedTopId
            : null;
        const nextTopId = currentTop || tops[0]?.id || null;
        setSelectedTopId(nextTopId);
        const children = nextTopId
          ? catData.filter((cat) => cat.parent_id === nextTopId).sort(sortCategory)
          : [];
        const currentChild =
          selectedChildId && children.find((cat) => cat.id === selectedChildId)
            ? selectedChildId
            : null;
        const nextChildId = currentChild || children[0]?.id || null;
        setSelectedChildId(nextChildId);
      }
      if (colData.items && colData.items.length && !appendCollectionId) {
        setAppendCollectionId(colData.items[0].id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // 初次进入页面加载基础数据，后续手动触发刷新
  useEffect(() => {
    loadBaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTag = (id: number) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const runImportTask = async (payload: ImportUploadPayload) => {
    const taskID = createTask({
      kind: "import",
      name: `新建合集：${payload.title}`,
      file_name: payload.file.name,
      file_size: payload.file.size,
      status: "running",
      stage: "uploading",
      progress: 0,
      retry: { kind: "import", payload },
    });

    setUploading(true);
    setUploadProgress(0);
    setUploadStage("uploading");
    try {
      await ensureValidSession();
      const token = getAccessToken();
      const form = new FormData();
      form.append("title", payload.title);
      if (payload.description) form.append("description", payload.description);
      form.append("category_id", String(payload.category_id));
      if (payload.tag_ids.length) form.append("tag_ids", payload.tag_ids.join(","));
      form.append("file", payload.file);

      const data = await new Promise<ImportZipResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/api/admin/collections/import-zip`, true);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          const mapped = Math.min(95, Math.max(1, Math.round(percent * 0.95)));
          setUploadProgress(mapped);
          patchTask(taskID, { progress: mapped, stage: "uploading" });
          if (percent >= 100) {
            setUploadStage("processing");
            patchTask(taskID, { stage: "processing" });
          }
        };
        xhr.upload.onload = () => {
          setUploadStage("processing");
          setUploadProgress((prev) => (prev < 95 ? 95 : prev));
          patchTask(taskID, { stage: "processing", progress: 95 });
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const parsed = JSON.parse(xhr.responseText) as ImportZipResponse;
              resolve(parsed);
            } catch (err) {
              reject(err);
            }
            return;
          }
          reject(new Error(parseServerError(xhr.responseText)));
        };
        xhr.onerror = () => reject(new Error("网络异常，上传失败"));
        xhr.send(form);
      });

      setResult(data);
      setUploadProgress(100);
      setUploadStage("idle");
      patchTask(taskID, {
        status: "success",
        stage: "done",
        progress: 100,
        finished_at: new Date().toISOString(),
        lines: [
          `合集ID：${data.collection_id}`,
          `文件数量：${data.file_count}`,
          `前缀：${data.prefix}`,
        ],
      });
      await loadBaseData();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "上传失败";
      setError(message);
      patchTask(taskID, {
        status: "failed",
        stage: "done",
        finished_at: new Date().toISOString(),
        error: message,
      });
      return false;
    } finally {
      setUploading(false);
      setUploadStage("idle");
    }
  };

  const runAppendTask = async (payload: AppendUploadPayload) => {
    const collection = collections.find((item) => item.id === payload.collection_id);
    const taskID = createTask({
      kind: "append",
      name: `追加到合集：${collection?.title || payload.collection_id}`,
      file_name: payload.file.name,
      file_size: payload.file.size,
      status: "running",
      stage: "uploading",
      progress: 0,
      retry: { kind: "append", payload },
    });

    setAppendUploading(true);
    setAppendProgress(0);
    setAppendStage("uploading");
    try {
      await ensureValidSession();
      const token = getAccessToken();
      const form = new FormData();
      form.append("file", payload.file);
      if (payload.set_cover) form.append("set_cover", "1");

      const data = await new Promise<AppendZipResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          `${API_BASE}/api/admin/collections/${payload.collection_id}/import-zip`,
          true
        );
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          const mapped = Math.min(95, Math.max(1, Math.round(percent * 0.95)));
          setAppendProgress(mapped);
          patchTask(taskID, { progress: mapped, stage: "uploading" });
          if (percent >= 100) {
            setAppendStage("processing");
            patchTask(taskID, { stage: "processing" });
          }
        };
        xhr.upload.onload = () => {
          setAppendStage("processing");
          setAppendProgress((prev) => (prev < 95 ? 95 : prev));
          patchTask(taskID, { stage: "processing", progress: 95 });
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const parsed = JSON.parse(xhr.responseText) as AppendZipResponse;
              resolve(parsed);
            } catch (err) {
              reject(err);
            }
            return;
          }
          reject(new Error(parseServerError(xhr.responseText)));
        };
        xhr.onerror = () => reject(new Error("网络异常，上传失败"));
        xhr.send(form);
      });

      setAppendResult(data);
      setAppendProgress(100);
      setAppendStage("idle");
      patchTask(taskID, {
        status: "success",
        stage: "done",
        progress: 100,
        finished_at: new Date().toISOString(),
        lines: [
          `合集ID：${data.collection_id}`,
          `新增数量：${data.added}`,
          `文件总数：${data.file_count}`,
        ],
      });
      await loadBaseData();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "上传失败";
      setError(message);
      patchTask(taskID, {
        status: "failed",
        stage: "done",
        finished_at: new Date().toISOString(),
        error: message,
      });
      return false;
    } finally {
      setAppendUploading(false);
      setAppendStage("idle");
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      setError("请输入合集标题");
      return;
    }
    if (!selectedChildId) {
      setError("请选择二级分类");
      return;
    }
    if (!file) {
      setError("请选择 ZIP 文件");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("只支持 ZIP 文件");
      return;
    }

    setError(null);
    setResult(null);
    const ok = await runImportTask({
      title: title.trim(),
      description: description.trim(),
      category_id: selectedChildId,
      tag_ids: [...selectedTags],
      file,
    });
    if (ok) {
      setTitle("");
      setDescription("");
      setSelectedTags([]);
      setFile(null);
      setTagKeyword("");
    }
  };

  const handleAppendZip = async () => {
    if (!appendCollectionId) {
      setError("请选择合集");
      return;
    }
    if (!appendFiles.length) {
      setError("请选择 ZIP 文件");
      return;
    }
    const invalid = appendFiles.find((item) => !item.name.toLowerCase().endsWith(".zip"));
    if (invalid) {
      setError(`只支持 ZIP 文件：${invalid.name}`);
      return;
    }

    setError(null);
    setAppendResult(null);
    for (const nextFile of appendFiles) {
      // 顺序执行，避免并发上传造成服务器解压压力
      await runAppendTask({
        collection_id: appendCollectionId,
        set_cover: appendSetCover,
        file: nextFile,
      });
    }
    setAppendFiles([]);
  };

  const handleRetryTask = async (taskID: string) => {
    const task = tasks.find((item) => item.id === taskID);
    if (!task) return;
    if (task.retry.kind === "import") {
      await runImportTask(task.retry.payload);
      return;
    }
    await runAppendTask(task.retry.payload);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="素材文件"
        description="上传 ZIP 合集到七牛云，并写入合集/表情/标签。"
        actions={
          <button
            className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-[#0b0f1a] hover:bg-emerald-300"
            onClick={loadBaseData}
            disabled={loading}
          >
            {loading ? "加载中..." : "刷新数据"}
          </button>
        }
      />

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-slate-100 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-700">上传任务中心</div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-1">总计 {taskStats.total}</span>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
              运行中 {taskStats.running}
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
              成功 {taskStats.success}
            </span>
            <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">
              失败 {taskStats.failed}
            </span>
            <button
              className="rounded-full border border-slate-200 px-2 py-1 text-slate-600 hover:border-slate-300"
              onClick={clearFinishedTasks}
              disabled={!tasks.length}
            >
              清理已完成
            </button>
          </div>
        </div>

        <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {!tasks.length && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
              暂无上传任务，开始上传后会在这里显示进度和结果
            </div>
          )}
          {tasks.map((task) => {
            const statusClass =
              task.status === "success"
                ? "bg-emerald-100 text-emerald-700"
                : task.status === "failed"
                ? "bg-rose-100 text-rose-700"
                : "bg-blue-100 text-blue-700";
            const stageText =
              task.stage === "uploading"
                ? "上传中"
                : task.stage === "processing"
                ? "云端处理中"
                : task.status === "success"
                ? "已完成"
                : task.status === "failed"
                ? "已失败"
                : "已结束";
            return (
              <div key={task.id} className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-800">{task.name}</div>
                  <div className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass}`}>
                    {task.status === "running" ? "进行中" : task.status === "success" ? "成功" : "失败"}
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {task.kind === "import" ? "新建合集" : "追加合集"} · {task.file_name} ·{" "}
                  {formatSize(task.file_size)}
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{stageText}</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        task.status === "failed"
                          ? "bg-rose-400"
                          : task.status === "success"
                          ? "bg-emerald-400"
                          : "bg-blue-400"
                      }`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>

                {task.error && (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {task.error}
                  </div>
                )}

                {!!task.lines?.length && (
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    {task.lines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>{new Date(task.created_at).toLocaleString()}</span>
                  {task.status === "failed" && (
                    <button
                      className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:border-slate-300"
                      onClick={() => handleRetryTask(task.id)}
                    >
                      重试
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-600">历史任务（服务器）</div>
            <div className="text-[11px] text-slate-400">总计 {historyTotal}</div>
          </div>
          <div className="mt-3 max-h-[320px] space-y-3 overflow-y-auto pr-1">
            {!historyTasks.length && (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
                暂无历史任务记录
              </div>
            )}
            {historyTasks.map((task) => {
              const statusClass =
                task.status === "success"
                  ? "bg-emerald-100 text-emerald-700"
                  : task.status === "failed"
                  ? "bg-rose-100 text-rose-700"
                  : "bg-blue-100 text-blue-700";
              const lines = collectHistoryLines(task);
              return (
                <div
                  key={task.id}
                  className="rounded-2xl border border-slate-100 bg-white px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-700">
                      {task.kind === "import" ? "新建合集" : "追加合集"} · #{task.id}
                    </div>
                    <div className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass}`}>
                      {task.status === "running"
                        ? "进行中"
                        : task.status === "success"
                        ? "成功"
                        : "失败"}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {task.file_name} · {formatSize(task.file_size)} ·{" "}
                    {taskStageText(task.stage, task.status)}
                  </div>

                  {!!lines.length && (
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      {lines.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>
                  )}

                  {task.error_message && (
                    <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {task.error_message}
                    </div>
                  )}

                  <div className="mt-2 text-[11px] text-slate-400">
                    {new Date(task.started_at).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-3xl border border-slate-100 bg-white p-6">
          <div className="text-sm font-semibold text-slate-700">上传 ZIP 合集</div>
          <div className="mt-4 space-y-6">
            <div>
              <div className="text-xs text-slate-400">一级分类</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {topCategories.map((item) => {
                  const active = item.id === selectedTopId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedTopId(item.id);
                        const children = childCategories.get(item.id) || [];
                        setSelectedChildId(children[0]?.id || null);
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
            </div>

            <div>
              <div className="text-xs text-slate-400">二级分类</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedChildren.map((item) => {
                  const active = item.id === selectedChildId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedChildId(item.id)}
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

            <div>
              <div className="text-xs text-slate-400">标签分类</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTagGroupKey("ungrouped");
                    setTagKeyword("");
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedTagGroupKey === "ungrouped"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  未分组
                </button>
                {orderedTagGroups.map((group) => {
                  const active = selectedTagGroupKey === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => {
                        setSelectedTagGroupKey(group.id);
                        setTagKeyword("");
                      }}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        active
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {group.name}
                    </button>
                  );
                })}
                {!orderedTagGroups.length && (
                  <div className="text-xs text-slate-400">暂无标签分类</div>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">标签（可多选）</div>
              <input
                className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                placeholder="筛选标签"
                value={tagKeyword}
                onChange={(e) => setTagKeyword(e.target.value)}
              />
              <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-wrap gap-2">
                  {filteredTags.map((tag) => {
                    const active = selectedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
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
                {!filteredTags.length && (
                  <div className="text-xs text-slate-400">暂无标签</div>
                )}
              </div>
              <div className="mt-3">
                <div className="mb-1 text-[11px] font-semibold text-slate-500">
                  已选标签（跨分类保留，可点 × 取消）
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedTagObjects.length ? (
                    selectedTagObjects.map((tag) => (
                      <span
                        key={tag.id}
                        className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                      >
                        {tag.name}
                        <button
                          type="button"
                          className="rounded-full bg-white/20 px-1 text-[10px] leading-none text-white transition group-hover:bg-white/30"
                          onClick={() => toggleTag(tag.id)}
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">未选择任何标签</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="text-xs text-slate-400">合集标题</div>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                  placeholder="输入合集名称"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-slate-400">合集描述（可选）</div>
                <textarea
                  className="mt-2 min-h-[96px] w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                  placeholder="补充一句描述或来源信息"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-slate-400">ZIP 文件</div>
                <input
                  type="file"
                  accept=".zip"
                  className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file && (
                  <div className="mt-2 text-xs text-slate-500">
                    已选择：{file.name}（{Math.round(file.size / 1024)} KB）
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? "上传中..." : "开始上传"}
            </button>
            <button
              className="rounded-xl border border-slate-200 px-5 py-2 text-xs text-slate-600 hover:border-slate-300"
              onClick={() => {
                setTitle("");
                setDescription("");
                setSelectedTags([]);
                setFile(null);
                setTagKeyword("");
              }}
            >
              清空表单
            </button>
          </div>
          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {uploadStage === "processing" ? "上传完成，处理中..." : "上传进度"}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                <div
                  className={`h-2 rounded-full bg-emerald-400 transition-all ${
                    uploadStage === "processing" ? "animate-pulse" : ""
                  }`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 text-sm text-slate-600">
            <div className="text-sm font-semibold text-slate-700">上传说明</div>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-xs text-slate-500">
              <li>ZIP 文件将解压后上传到七牛云，并写入合集/表情/标签。</li>
              <li>文件会保存到分类前缀下，结构：raw/ + meta.json + source.zip。</li>
              <li>封面默认使用 ZIP 内第一张表情文件。</li>
            </ul>
          </div>

          {result && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-700">
              <div className="text-sm font-semibold">上传成功</div>
              <div className="mt-3 space-y-1 text-xs">
                <div>合集ID：{result.collection_id}</div>
                <div>Slug：{result.slug}</div>
                <div>文件数量：{result.file_count}</div>
                <div>前缀：{result.prefix}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-3xl border border-slate-100 bg-white p-6">
          <div className="text-sm font-semibold text-slate-700">追加 ZIP 到已有合集</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs text-slate-400">选择合集</div>
              <select
                className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                value={appendCollectionId}
                onChange={(e) => setAppendCollectionId(Number(e.target.value))}
              >
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title} #{col.id}
                  </option>
                ))}
              </select>
              {!collections.length && (
                <div className="mt-2 text-xs text-slate-400">暂无合集</div>
              )}
            </div>
            <div>
              <div className="text-xs text-slate-400">ZIP 文件</div>
              <input
                type="file"
                accept=".zip"
                multiple
                className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                onChange={(e) => setAppendFiles(Array.from(e.target.files || []))}
              />
              {!!appendFiles.length && (
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  {appendFiles.map((item) => (
                    <div key={`${item.name}-${item.size}-${item.lastModified}`}>
                      {item.name}（{formatSize(item.size)}）
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={appendSetCover}
                  onChange={(e) => setAppendSetCover(e.target.checked)}
                />
                如果合集没有封面，使用本 ZIP 第一张作为封面
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              onClick={handleAppendZip}
              disabled={appendUploading}
            >
              {appendUploading ? "上传中..." : "开始追加"}
            </button>
              <button
                className="rounded-xl border border-slate-200 px-5 py-2 text-xs text-slate-600 hover:border-slate-300"
                onClick={() => {
                  setAppendFiles([]);
                  setAppendProgress(0);
                }}
              >
              清空
            </button>
          </div>

          {appendUploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {appendStage === "processing" ? "上传完成，处理中..." : "上传进度"}
                </span>
                <span>{appendProgress}%</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                <div
                  className={`h-2 rounded-full bg-emerald-400 transition-all ${
                    appendStage === "processing" ? "animate-pulse" : ""
                  }`}
                  style={{ width: `${appendProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 text-sm text-slate-600">
            <div className="text-sm font-semibold text-slate-700">追加说明</div>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-xs text-slate-500">
              <li>用于同一合集拆分多个 ZIP 的场景。</li>
              <li>追加 ZIP 会写入同一合集 raw/ 目录，并按最大序号+1 命名。</li>
              <li>原始 ZIP 将保存在 source/part-*.zip。</li>
            </ul>
          </div>

          {appendResult && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-700">
              <div className="text-sm font-semibold">追加成功</div>
              <div className="mt-3 space-y-1 text-xs">
                <div>合集ID：{appendResult.collection_id}</div>
                <div>新增数量：{appendResult.added}</div>
                <div>文件总数：{appendResult.file_count}</div>
                <div>源 ZIP：{appendResult.source_zip_key}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
