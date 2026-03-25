"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import {
  createTagDefinition,
  listTagDefinitions,
  listTagDimensions,
  TagDefinition,
  TagDimension,
  updateTagDefinition,
} from "@/lib/admin-copyright";

export default function Page() {
  const [dims, setDims] = useState<TagDimension[]>([]);
  const [items, setItems] = useState<TagDefinition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dimensionCode, setDimensionCode] = useState("");
  const [keyword, setKeyword] = useState("");

  const [tagCode, setTagCode] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagLevel, setTagLevel] = useState<"image" | "collection" | "both">("both");
  const [remark, setRemark] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editRemark, setEditRemark] = useState("");
  const [editStatus, setEditStatus] = useState(1);

  const dimNameMap = useMemo(() => {
    const m = new Map<string, string>();
    dims.forEach((d) => m.set(d.dimension_code, d.dimension_name));
    return m;
  }, [dims]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, t] = await Promise.all([
        listTagDimensions(),
        listTagDefinitions({ page: 1, pageSize: 100, keyword, dimensionCode: dimensionCode || undefined }),
      ]);
      setDims(d);
      setItems(t.items);
      if (!dimensionCode && d.length > 0) {
        setDimensionCode(d[0].dimension_code);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async () => {
    if (!tagCode.trim() || !tagName.trim() || !dimensionCode.trim()) {
      setError("tagCode/tagName/dimensionCode 必填");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createTagDefinition({
        tagCode: tagCode.trim(),
        tagName: tagName.trim(),
        dimensionCode,
        tagLevel,
        status: 1,
        remark: remark.trim(),
      });
      setTagCode("");
      setTagName("");
      setRemark("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (row: TagDefinition) => {
    setEditingId(row.id);
    setEditName(row.tag_name);
    setEditRemark(row.remark || "");
    setEditStatus(row.status);
  };

  const onSaveEdit = async () => {
    if (!editingId) return;
    setError(null);
    try {
      await updateTagDefinition(editingId, {
        tagName: editName.trim(),
        status: editStatus,
        remark: editRemark,
      });
      setEditingId(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "更新失败");
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="标签管理（版权）"
        description="维护版权识别标签字典，支持搜索维度与标签检索。"
        actions={
          <div className="flex items-center gap-2">
            <select value={dimensionCode} onChange={(e) => setDimensionCode(e.target.value)} className="h-9 rounded-xl border border-slate-200 px-3 text-xs">
              <option value="">全部维度</option>
              {dims.map((d) => (
                <option key={d.id} value={d.dimension_code}>{d.dimension_name}</option>
              ))}
            </select>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索标签"
              className="h-9 w-40 rounded-xl border border-slate-200 px-3 text-xs"
            />
            <button onClick={() => void load()} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
              查询
            </button>
          </div>
        }
      />

      {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</div>}

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold">新增标签</div>
        <div className="grid gap-3 md:grid-cols-5">
          <input value={tagCode} onChange={(e) => setTagCode(e.target.value)} placeholder="tagCode" className="h-9 rounded-xl border border-slate-200 px-3 text-xs" />
          <input value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="tagName" className="h-9 rounded-xl border border-slate-200 px-3 text-xs" />
          <select value={tagLevel} onChange={(e) => setTagLevel(e.target.value as "image" | "collection" | "both")} className="h-9 rounded-xl border border-slate-200 px-3 text-xs">
            <option value="image">image</option>
            <option value="collection">collection</option>
            <option value="both">both</option>
          </select>
          <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="remark" className="h-9 rounded-xl border border-slate-200 px-3 text-xs" />
          <button disabled={creating} onClick={() => void onCreate()} className="h-9 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-60">
            {creating ? "创建中..." : "新增"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">维度</th>
                <th className="py-2 pr-3">级别</th>
                <th className="py-2 pr-3">状态</th>
                <th className="py-2 pr-3">备注</th>
                <th className="py-2 pr-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-6 text-center text-slate-400">加载中...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="py-6 text-center text-slate-400">暂无数据</td></tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50">
                    <td className="py-2 pr-3">{row.id}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{row.tag_code}</td>
                    <td className="py-2 pr-3">{editingId === row.id ? <input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-xs" /> : row.tag_name}</td>
                    <td className="py-2 pr-3">{dimNameMap.get(row.dimension_code) || row.dimension_code}</td>
                    <td className="py-2 pr-3">{row.tag_level}</td>
                    <td className="py-2 pr-3">
                      {editingId === row.id ? (
                        <select value={editStatus} onChange={(e) => setEditStatus(Number(e.target.value))} className="h-8 rounded-lg border border-slate-200 px-2 text-xs">
                          <option value={1}>1</option>
                          <option value={0}>0</option>
                        </select>
                      ) : row.status}
                    </td>
                    <td className="py-2 pr-3">
                      {editingId === row.id ? (
                        <input value={editRemark} onChange={(e) => setEditRemark(e.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-xs" />
                      ) : row.remark || "-"}
                    </td>
                    <td className="py-2 pr-3">
                      {editingId === row.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => void onSaveEdit()} className="text-xs text-emerald-700">保存</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-slate-500">取消</button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(row)} className="text-xs text-emerald-700">编辑</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
