"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type Theme = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  sort: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export default function Page() {
  const [keyword, setKeyword] = useState("");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createSort, setCreateSort] = useState(0);
  const [createStatus, setCreateStatus] = useState("active");

  const [editing, setEditing] = useState<Theme | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSort, setEditSort] = useState(0);
  const [editStatus, setEditStatus] = useState("active");

  const loadThemes = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (keyword.trim()) query.set("keyword", keyword.trim());
      const res = await fetchWithAuth(`${API_BASE}/api/admin/themes?${query.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Theme[];
      setThemes(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载主题列表
  useEffect(() => {
    loadThemes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setCreateName("");
    setCreateSlug("");
    setCreateDesc("");
    setCreateSort(0);
    setCreateStatus("active");
    setError(null);
    setCreateOpen(true);
  };

  const openEdit = (theme: Theme) => {
    setEditing(theme);
    setEditName(theme.name);
    setEditDesc(theme.description || "");
    setEditSort(theme.sort || 0);
    setEditStatus(theme.status || "active");
    setError(null);
    setEditOpen(true);
  };

  const handleCreate = async () => {
    if (!createName.trim()) {
      setError("请输入主题名称");
      return;
    }
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/themes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          slug: createSlug.trim(),
          description: createDesc.trim(),
          sort: createSort,
          status: createStatus,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCreateOpen(false);
      await loadThemes();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "创建失败";
      setError(message);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/themes/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim(),
          sort: editSort,
          status: editStatus,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditOpen(false);
      setEditing(null);
      await loadThemes();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "更新失败";
      setError(message);
    }
  };

  const handleDelete = async (theme: Theme) => {
    const confirmName = window.prompt(`输入主题名称确认删除：${theme.name}`);
    if (confirmName !== theme.name) {
      setError("名称不匹配，已取消删除");
      return;
    }
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/themes/${theme.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      await loadThemes();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "删除失败";
      setError(message);
    }
  };

  const rows = useMemo(() => themes, [themes]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="主题管理"
        description="维护主题分组与展示顺序。"
        actions={
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
              onClick={loadThemes}
              disabled={loading}
            >
              {loading ? "加载中..." : "刷新"}
            </button>
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              onClick={openCreate}
            >
              新建主题
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3">
        <input
          className="w-72 rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-600 outline-none"
          placeholder="搜索主题名称/Slug"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button
          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
          onClick={loadThemes}
        >
          搜索
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-slate-100 bg-white p-5">
        <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
          <span>主题列表</span>
          <span className="text-xs text-slate-500">共 {rows.length} 个</span>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">名称</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">排序</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((theme) => (
                <tr key={theme.id} className="text-slate-700">
                  <td className="px-4 py-3">{theme.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{theme.slug}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{theme.sort}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{theme.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-slate-300"
                        onClick={() => openEdit(theme)}
                      >
                        编辑
                      </button>
                      <button
                        className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                        onClick={() => handleDelete(theme)}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                    暂无主题
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={createOpen}
        title="新建主题"
        onClose={() => setCreateOpen(false)}
      >
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
            placeholder="主题名称（必填）"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
            placeholder="Slug（建议英文）"
            value={createSlug}
            onChange={(e) => setCreateSlug(e.target.value)}
          />
          <textarea
            className="min-h-[88px] w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
            placeholder="主题说明（可选）"
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
          />
          <input
            type="number"
            className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
            placeholder="排序值（数字越小越靠前）"
            value={createSort}
            onChange={(e) => setCreateSort(Number(e.target.value))}
          />
          <select
            className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
            value={createStatus}
            onChange={(e) => setCreateStatus(e.target.value)}
          >
            <option value="active">active</option>
            <option value="disabled">disabled</option>
          </select>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
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
        open={editOpen && !!editing}
        title="编辑主题"
        onClose={() => setEditOpen(false)}
      >
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm text-slate-400"
            value={editing?.slug || ""}
            disabled
          />
          <textarea
            className="min-h-[88px] w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
          />
          <input
            type="number"
            className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
            value={editSort}
            onChange={(e) => setEditSort(Number(e.target.value))}
          />
          <select
            className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
          >
            <option value="active">active</option>
            <option value="disabled">disabled</option>
          </select>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
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
