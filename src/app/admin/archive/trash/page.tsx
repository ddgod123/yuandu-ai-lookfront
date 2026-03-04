"use client";

import { useEffect, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type StorageItem = {
  key: string;
  put_time: number;
  fsize: number;
  mime_type: string;
  md5: string;
  status: number;
  url?: string;
};

type TrashListResponse = {
  items: StorageItem[];
  next_marker: string;
  has_next: boolean;
  prefix: string;
};

export default function TrashPage() {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [marker, setMarker] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefix, setPrefix] = useState("emoji/_trash/");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const loadTrash = async (reset = true) => {
    setLoading(true);
    setError(null);
    if (reset) {
      setMarker("");
      setHasNext(false);
      setSelectedKeys([]);
    }
    try {
      const query = new URLSearchParams();
      query.set("limit", "50");
      query.set("prefix", prefix);
      if (!reset && marker) query.set("marker", marker);
      const res = await fetchWithAuth(`${API_BASE}/api/admin/storage/trash?${query.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as TrashListResponse;
      setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
      setMarker(data.next_marker || "");
      setHasNext(data.has_next);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const restoreItem = async (key: string) => {
    if (!window.confirm("确认恢复该文件？")) return;
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/storage/trash/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadTrash(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "恢复失败";
      setError(message);
    }
  };

  const restoreBatch = async () => {
    if (selectedKeys.length === 0) return;
    if (!window.confirm("确认批量恢复选中文件？")) return;
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/storage/trash/batch-restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: selectedKeys }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSelectedKeys([]);
      await loadTrash(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "批量恢复失败";
      setError(message);
    }
  };

  const deleteItem = async (key: string) => {
    if (!window.confirm("确认彻底删除该文件？")) return;
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/storage/object?key=${encodeURIComponent(key)}&mode=delete`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(await res.text());
      await loadTrash(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "删除失败";
      setError(message);
    }
  };

  const deleteBatch = async () => {
    if (selectedKeys.length === 0) return;
    if (!window.confirm("确认批量彻底删除选中文件？")) return;
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/storage/batch-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: selectedKeys, mode: "delete" }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSelectedKeys([]);
      await loadTrash(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "批量删除失败";
      setError(message);
    }
  };

  const emptyTrash = async () => {
    const confirmText = window.prompt("输入 DELETE 清空回收站");
    if (confirmText !== "DELETE") {
      setError("输入错误，已取消");
      return;
    }
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/admin/storage/trash?prefix=${encodeURIComponent(prefix)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(await res.text());
      await loadTrash(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "清空失败";
      setError(message);
    }
  };

  // prefix 变化时刷新回收站
  useEffect(() => {
    loadTrash(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix]);

  useEffect(() => {
    setSelectedKeys((prev) => prev.filter((key) => items.some((item) => item.key === key)));
  }, [items]);

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

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedKeys(items.map((item) => item.key));
    } else {
      setSelectedKeys([]);
    }
  };

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const selectedAll = items.length > 0 && selectedKeys.length === items.length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="回收站"
        description="管理已移动到 emoji/_trash/ 的文件，可恢复或彻底清空。"
        actions={
          <button
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
            onClick={emptyTrash}
          >
            清空回收站
          </button>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div>
            <div className="text-sm font-semibold text-slate-700">回收站列表</div>
            <div className="text-xs text-slate-400">当前前缀：{prefix}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.trim())}
              placeholder="emoji/_trash/"
            />
            <button
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
              onClick={() => loadTrash(true)}
              disabled={loading}
            >
              {loading ? "加载中" : "刷新"}
            </button>
            {selectedKeys.length > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
                已选 {selectedKeys.length}
                <button
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-100"
                  onClick={restoreBatch}
                >
                  批量恢复
                </button>
                <button
                  className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-600 hover:bg-red-100"
                  onClick={deleteBatch}
                >
                  批量删除
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pb-3 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={selectedAll}
            onChange={(e) => toggleSelectAll(e.target.checked)}
          />
          <span>全选</span>
        </div>

        <div className="space-y-3">
          {items.map((item) => {
            const relative = item.key.replace(prefix, "");
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
                    onClick={() => restoreItem(item.key)}
                  >
                    恢复
                  </button>
                  <button
                    className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] text-red-600 hover:bg-red-100"
                    onClick={() => deleteItem(item.key)}
                  >
                    彻底删除
                  </button>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
              回收站暂无文件
            </div>
          )}
        </div>

        {hasNext && (
          <div className="mt-4 flex justify-center">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
              onClick={() => loadTrash(false)}
              disabled={loading}
            >
              {loading ? "加载中" : "加载更多"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
