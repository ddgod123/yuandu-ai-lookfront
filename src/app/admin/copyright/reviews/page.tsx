"use client";

import { useEffect, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { CopyrightReviewRecord, listPendingReviews, submitReview } from "@/lib/admin-copyright";

export default function Page() {
  const [items, setItems] = useState<CopyrightReviewRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [taskId, setTaskId] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [emojiId, setEmojiId] = useState("");
  const [reviewType, setReviewType] = useState<"collection" | "image">("collection");
  const [reviewResult, setReviewResult] = useState("allow_with_attr");
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPendingReviews(1, 50);
      setItems(data.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async () => {
    if (!Number(collectionId)) {
      setError("collectionId 必填");
      return;
    }
    if (!reviewComment.trim()) {
      setError("reviewComment 必填");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitReview({
        taskId: Number(taskId) || undefined,
        collectionId: Number(collectionId),
        emojiId: Number(emojiId) || undefined,
        reviewType,
        reviewResult,
        reviewComment,
      });
      setReviewComment("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="高风险待复核" description="集中处理 pending 项，提交人工结论。" />

      {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</div>}

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold">待复核记录</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">合集ID</th>
                <th className="py-2 pr-3">EmojiID</th>
                <th className="py-2 pr-3">任务ID</th>
                <th className="py-2 pr-3">类型</th>
                <th className="py-2 pr-3">状态</th>
                <th className="py-2 pr-3">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-6 text-center text-slate-400">加载中...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-slate-400">暂无待复核</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50">
                    <td className="py-2 pr-3">{item.id}</td>
                    <td className="py-2 pr-3">{item.collection_id}</td>
                    <td className="py-2 pr-3">{item.emoji_id || "-"}</td>
                    <td className="py-2 pr-3">{item.task_id || "-"}</td>
                    <td className="py-2 pr-3">{item.review_type}</td>
                    <td className="py-2 pr-3">{item.review_status}</td>
                    <td className="py-2 pr-3 text-xs text-slate-500">{item.created_at?.slice(0, 19).replace("T", " ")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold">提交人工复核</div>
        <div className="grid gap-3 md:grid-cols-3">
          <input value={taskId} onChange={(e) => setTaskId(e.target.value)} placeholder="任务ID(可选)" className="h-9 rounded-xl border border-slate-200 px-3 text-xs" />
          <input value={collectionId} onChange={(e) => setCollectionId(e.target.value)} placeholder="合集ID*" className="h-9 rounded-xl border border-slate-200 px-3 text-xs" />
          <input value={emojiId} onChange={(e) => setEmojiId(e.target.value)} placeholder="EmojiID(可选)" className="h-9 rounded-xl border border-slate-200 px-3 text-xs" />
          <select value={reviewType} onChange={(e) => setReviewType(e.target.value as "collection" | "image")} className="h-9 rounded-xl border border-slate-200 px-3 text-xs">
            <option value="collection">collection</option>
            <option value="image">image</option>
          </select>
          <select value={reviewResult} onChange={(e) => setReviewResult(e.target.value)} className="h-9 rounded-xl border border-slate-200 px-3 text-xs">
            <option value="allow_with_attr">allow_with_attr</option>
            <option value="allow">allow</option>
            <option value="reject">reject</option>
            <option value="need_license">need_license</option>
          </select>
          <button
            disabled={submitting}
            onClick={() => void onSubmit()}
            className="h-9 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "提交中..." : "提交复核"}
          </button>
        </div>
        <textarea
          value={reviewComment}
          onChange={(e) => setReviewComment(e.target.value)}
          placeholder="复核意见*"
          className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm"
        />
      </div>
    </div>
  );
}
