"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import {
  getImageDetail,
  ImageCopyrightResult,
  listCollectionImages,
  listTagDefinitions,
  TagDefinition,
  updateImageTags,
} from "@/lib/admin-copyright";
import { getAdminProfile } from "@/lib/admin-auth";

export default function Page() {
  const [collectionId, setCollectionId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [items, setItems] = useState<ImageCopyrightResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getImageDetail>> | null>(null);
  const [allTags, setAllTags] = useState<TagDefinition[]>([]);
  const [addTagIds, setAddTagIds] = useState<number[]>([]);
  const [removeTagIds, setRemoveTagIds] = useState<number[]>([]);
  const [savingTags, setSavingTags] = useState(false);

  const canOperate = getAdminProfile().role === "super_admin";

  const selectableTags = useMemo(
    () => allTags.filter((tag) => tag.status === 1 && tag.tag_level !== "collection"),
    [allTags]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("collectionId") || "";
    if (cid) setCollectionId(cid);

    void (async () => {
      try {
        const tagsRes = await listTagDefinitions({ page: 1, pageSize: 300 });
        setAllTags(tagsRes.items);
      } catch {
        setAllTags([]);
      }
    })();
  }, []);

  const load = async () => {
    const cid = Number(collectionId);
    if (!cid) {
      setError("请先输入合集ID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listCollectionImages({
        collectionId: cid,
        taskId: Number(taskId) || undefined,
        riskLevel: riskLevel || undefined,
        page: 1,
        pageSize: 50,
      });
      setItems(data.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (emojiId: number) => {
    setError(null);
    try {
      const data = await getImageDetail(emojiId, Number(taskId) || undefined);
      setDetail(data);
      setAddTagIds([]);
      setRemoveTagIds([]);
    } catch {
      setDetail(null);
      setError("详情加载失败");
    }
  };

  const toggleAddTag = (tagId: number) => {
    setAddTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const toggleRemoveTag = (tagId: number) => {
    setRemoveTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const saveManualTags = async () => {
    if (!detail) return;
    if (!canOperate) {
      setError("当前账号无操作权限");
      return;
    }
    if (addTagIds.length === 0 && removeTagIds.length === 0) {
      setError("请选择要新增或移除的标签");
      return;
    }
    setSavingTags(true);
    setError(null);
    try {
      await updateImageTags(detail.emoji.id, { addTagIds, removeTagIds });
      const refreshed = await getImageDetail(detail.emoji.id, Number(taskId) || undefined);
      setDetail(refreshed);
      setAddTagIds([]);
      setRemoveTagIds([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "标签保存失败");
    } finally {
      setSavingTags(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="单图版权识别"
        description="按合集查看单图识别结果，并支持查看证据与标签。"
        actions={
          <div className="flex items-center gap-2">
            <input
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              placeholder="合集ID"
              className="h-9 w-24 rounded-xl border border-slate-200 px-3 text-xs"
            />
            <input
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="任务ID(可选)"
              className="h-9 w-28 rounded-xl border border-slate-200 px-3 text-xs"
            />
            <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} className="h-9 rounded-xl border border-slate-200 px-2 text-xs">
              <option value="">全部风险</option>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
              <option value="L4">L4</option>
            </select>
            <button onClick={() => void load()} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
              查询
            </button>
          </div>
        }
      />

      {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</div>}

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="py-2 pr-3">EmojiID</th>
                <th className="py-2 pr-3">风险</th>
                <th className="py-2 pr-3">归属</th>
                <th className="py-2 pr-3">商业IP</th>
                <th className="py-2 pr-3">品牌</th>
                <th className="py-2 pr-3">建议</th>
                <th className="py-2 pr-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-6 text-center text-slate-400">加载中...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-slate-400">暂无数据</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50">
                    <td className="py-3 pr-3">{item.emoji_id}</td>
                    <td className="py-3 pr-3">{item.risk_level || "-"}</td>
                    <td className="py-3 pr-3">{item.copyright_owner_guess || "-"}</td>
                    <td className="py-3 pr-3">{item.is_commercial_ip ? item.ip_name || "是" : "否"}</td>
                    <td className="py-3 pr-3">{item.is_brand_related ? item.brand_name || "是" : "否"}</td>
                    <td className="py-3 pr-3">{item.commercial_use_advice || "-"}</td>
                    <td className="py-3 pr-3">
                      <button className="text-xs text-emerald-700" onClick={() => void openDetail(item.emoji_id)}>详情</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-slate-900">单图详情</div>
        {!detail ? (
          <div className="text-xs text-slate-400">请选择一条记录查看</div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="text-xs text-slate-500">Emoji ID: {detail.emoji.id} / Collection ID: {detail.emoji.collection_id}</div>
            {(detail.emoji.image_url || detail.emoji.animated_url) && (
              <img
                src={detail.emoji.image_url || detail.emoji.animated_url}
                alt="emoji"
                className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
              />
            )}
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">{detail.result?.machine_summary || "暂无机器摘要"}</div>

            <div>
              <div className="mb-1 text-xs font-semibold text-slate-500">已有标签（勾选后保存可移除手动标签）</div>
              <div className="flex flex-wrap gap-2">
                {detail.tags.length === 0 ? (
                  <span className="text-xs text-slate-400">无标签</span>
                ) : (
                  detail.tags.map((tag) => (
                    <label key={tag.id} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                      <input
                        type="checkbox"
                        checked={removeTagIds.includes(tag.tagId)}
                        onChange={() => toggleRemoveTag(tag.tagId)}
                        className="h-3 w-3"
                      />
                      <span>{tag.tagName}({tag.dimensionCode})</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold text-slate-500">可新增标签（勾选后保存）</div>
              <div className="max-h-36 overflow-auto rounded-xl border border-slate-200 p-2">
                <div className="flex flex-wrap gap-2">
                  {selectableTags.map((tag) => (
                    <label key={tag.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={addTagIds.includes(tag.id)}
                        onChange={() => toggleAddTag(tag.id)}
                        className="h-3 w-3"
                      />
                      <span>{tag.tag_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <button
                disabled={savingTags || !canOperate}
                onClick={() => void saveManualTags()}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {savingTags ? "保存中..." : canOperate ? "保存标签变更" : "无权限"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
