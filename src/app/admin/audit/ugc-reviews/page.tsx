"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileClock, Loader2, ShieldAlert, XCircle } from "lucide-react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type ReviewStatus = "draft" | "reviewing" | "approved" | "rejected" | "all";
type PublishStatus = "offline" | "online" | "all";

type AdminReviewItem = {
  collection_id: number;
  owner_id: number;
  owner_name?: string;
  collection?: {
    id: number;
    title?: string;
    file_count?: number;
    updated_at?: string;
  };
  review?: {
    review_status?: string;
    publish_status?: string;
    submit_count?: number;
    reject_reason?: string;
    offline_reason?: string;
    last_submitted_at?: string;
    last_reviewed_at?: string;
  };
};

type AdminReviewListResponse = {
  items?: AdminReviewItem[];
  total?: number;
};

type AdminBatchActionResponse = {
  success_count?: number;
  failed?: Array<{ collection_id: number; error: string }>;
};

type AdminReviewLogItem = {
  id: number;
  action?: string;
  operator_role?: string;
  operator_id?: number;
  operator_name?: string;
  reason?: string;
  from_review_status?: string;
  to_review_status?: string;
  from_publish_status?: string;
  to_publish_status?: string;
  created_at?: string;
};

type AdminReviewLogListResponse = {
  items?: AdminReviewLogItem[];
};

async function parseApiError(res: Response) {
  try {
    const payload = (await res.clone().json()) as { error?: string; message?: string };
    return (payload.message || payload.error || "").trim();
  } catch {
    return "";
  }
}

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN");
}

const REASON_TEMPLATES = [
  "疑似版权风险，请补充授权证明",
  "素材质量不达标（清晰度/构图不足）",
  "存在违规内容风险，请调整后重提",
  "运营活动结束，临时下架",
  "收到投诉，先行下架复核",
];

export default function Page() {
  const [items, setItems] = useState<AdminReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("reviewing");
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("all");
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const [reasonDraft, setReasonDraft] = useState("");
  const [actingCollectionID, setActingCollectionID] = useState<number | null>(null);
  const [batchActing, setBatchActing] = useState<"approve" | "reject" | "offline" | null>(null);

  const [selectedIDs, setSelectedIDs] = useState<number[]>([]);
  const [logCollectionID, setLogCollectionID] = useState<number | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<AdminReviewLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const allRowIDs = useMemo(() => items.map((item) => item.collection_id).filter((id) => id > 0), [items]);
  const allSelected = useMemo(
    () => allRowIDs.length > 0 && allRowIDs.every((id) => selectedIDs.includes(id)),
    [allRowIDs, selectedIDs]
  );

  const loadItems = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const params = new URLSearchParams({
        page: "1",
        page_size: "50",
      });
      if (reviewStatus !== "all") params.set("review_status", reviewStatus);
      if (publishStatus !== "all") params.set("publish_status", publishStatus);
      if (searchKeyword.trim()) params.set("q", searchKeyword.trim());

      const res = await fetchWithAuth(`${API_BASE}/api/admin/ugc/reviews?${params.toString()}`);
      if (!res.ok) {
        const msg = await parseApiError(res);
        setErrorMessage(msg || "加载审核列表失败");
        setItems([]);
        setTotal(0);
        setSelectedIDs([]);
        return;
      }
      const data = (await res.json()) as AdminReviewListResponse;
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems(nextItems);
      setTotal(typeof data.total === "number" ? data.total : nextItems.length);
      const idSet = new Set(nextItems.map((item) => item.collection_id));
      setSelectedIDs((prev) => prev.filter((id) => idSet.has(id)));
    } catch {
      setErrorMessage("加载审核列表失败");
      setItems([]);
      setTotal(0);
      setSelectedIDs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewStatus, publishStatus, searchKeyword]);

  const toggleRow = (collectionID: number) => {
    if (!collectionID) return;
    setSelectedIDs((prev) => {
      if (prev.includes(collectionID)) return prev.filter((id) => id !== collectionID);
      return [...prev, collectionID];
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIDs([]);
      return;
    }
    setSelectedIDs(allRowIDs);
  };

  const callDecision = async (collectionID: number, action: "approve" | "reject" | "offline") => {
    if (!collectionID) return;
    const reason = reasonDraft.trim();
    if (action === "reject" && !reason) {
      setErrorMessage("驳回操作必须填写原因");
      return;
    }
    setActingCollectionID(collectionID);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ugc/reviews/${collectionID}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const msg = await parseApiError(res);
        setErrorMessage(msg || "操作失败");
        return;
      }
      setSuccessMessage(`合集 #${collectionID} 已完成${action === "approve" ? "通过" : action === "reject" ? "驳回" : "下架"}操作`);
      await loadItems();
    } catch {
      setErrorMessage("操作失败");
    } finally {
      setActingCollectionID(null);
    }
  };

  const callBatchAction = async (action: "approve" | "reject" | "offline") => {
    if (selectedIDs.length === 0) {
      setErrorMessage("请先勾选至少一个合集");
      return;
    }
    const reason = reasonDraft.trim();
    if (action === "reject" && !reason) {
      setErrorMessage("批量驳回必须填写原因");
      return;
    }
    setBatchActing(action);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ugc/reviews/batch/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection_ids: selectedIDs,
          reason,
        }),
      });
      if (!res.ok) {
        const msg = await parseApiError(res);
        setErrorMessage(msg || "批量操作失败");
        return;
      }
      const payload = (await res.json()) as AdminBatchActionResponse;
      const failed = Array.isArray(payload.failed) ? payload.failed : [];
      const successCount = Number(payload.success_count || 0);
      if (failed.length > 0) {
        setErrorMessage(`批量完成：成功 ${successCount} 条，失败 ${failed.length} 条`);
      } else {
        setSuccessMessage(`批量完成：成功 ${successCount} 条`);
      }
      setSelectedIDs([]);
      await loadItems();
    } catch {
      setErrorMessage("批量操作失败");
    } finally {
      setBatchActing(null);
    }
  };

  const openLogs = async (collectionID: number) => {
    setLogCollectionID(collectionID);
    setLogsOpen(true);
    setLogs([]);
    setLogsLoading(true);
    setLogsError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ugc/reviews/${collectionID}/logs?page=1&page_size=50`);
      if (!res.ok) {
        const msg = await parseApiError(res);
        setLogsError(msg || "加载日志失败");
        return;
      }
      const data = (await res.json()) as AdminReviewLogListResponse;
      setLogs(Array.isArray(data.items) ? data.items : []);
    } catch {
      setLogsError("加载日志失败");
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="UGC 投稿审核"
        description="用户原创表情包合集的提审、通过/驳回、上下架管理。"
        actions={<div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">共 {total} 条</div>}
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-5">
          <select
            value={reviewStatus}
            onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="reviewing">待审核（reviewing）</option>
            <option value="approved">已通过（approved）</option>
            <option value="rejected">已驳回（rejected）</option>
            <option value="draft">草稿（draft）</option>
            <option value="all">全部审核状态</option>
          </select>
          <select
            value={publishStatus}
            onChange={(e) => setPublishStatus(e.target.value as PublishStatus)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="all">全部上架状态</option>
            <option value="online">已上架（online）</option>
            <option value="offline">已下架（offline）</option>
          </select>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearchKeyword(keyword.trim());
            }}
            placeholder="按标题/描述搜索"
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm lg:col-span-2"
          />
          <button
            type="button"
            onClick={() => setSearchKeyword(keyword.trim())}
            className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            搜索
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-slate-700">审核备注模板：</span>
          {REASON_TEMPLATES.map((tpl) => (
            <button
              key={tpl}
              type="button"
              onClick={() => setReasonDraft(tpl)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              {tpl}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setReasonDraft("")}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
          >
            清空
          </button>
        </div>
        <textarea
          value={reasonDraft}
          onChange={(e) => setReasonDraft(e.target.value)}
          rows={2}
          placeholder="请输入审核备注（驳回必填）"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={selectedIDs.length === 0 || Boolean(batchActing)}
            onClick={() => void callBatchAction("approve")}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            {batchActing === "approve" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            批量通过（{selectedIDs.length}）
          </button>
          <button
            type="button"
            disabled={selectedIDs.length === 0 || Boolean(batchActing)}
            onClick={() => void callBatchAction("reject")}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            {batchActing === "reject" ? <Loader2 size={12} className="animate-spin" /> : <ShieldAlert size={12} />}
            批量驳回（{selectedIDs.length}）
          </button>
          <button
            type="button"
            disabled={selectedIDs.length === 0 || Boolean(batchActing)}
            onClick={() => void callBatchAction("offline")}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {batchActing === "offline" ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
            批量下架（{selectedIDs.length}）
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="px-4 py-3">合集</th>
              <th className="px-4 py-3">作者</th>
              <th className="px-4 py-3">审核状态</th>
              <th className="px-4 py-3">上架状态</th>
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    加载中...
                  </span>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  暂无数据
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const review = row.review;
                const collection = row.collection;
                const busy = actingCollectionID === row.collection_id;
                return (
                  <tr key={row.collection_id} className="border-t border-slate-100">
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={selectedIDs.includes(row.collection_id)}
                        onChange={() => toggleRow(row.collection_id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{collection?.title || `#${row.collection_id}`}</div>
                      <div className="text-xs text-slate-500">ID: {row.collection_id} · {collection?.file_count || 0} 张</div>
                      <Link href={`/admin/archive/collections/${row.collection_id}/emojis`} className="text-xs font-semibold text-emerald-600 hover:underline">
                        查看图片明细
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.owner_name || "-"}
                      <div className="text-xs text-slate-400">UID: {row.owner_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                        {review?.review_status || "-"}
                      </span>
                      {review?.reject_reason ? <div className="mt-1 text-xs text-rose-600">{review.reject_reason}</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {review?.publish_status || "-"}
                      </span>
                      {review?.offline_reason ? <div className="mt-1 text-xs text-amber-700">{review.offline_reason}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div>提审：{formatDate(review?.last_submitted_at)}</div>
                      <div>审核：{formatDate(review?.last_reviewed_at)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void callDecision(row.collection_id, "approve")}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-emerald-200 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                          通过
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void callDecision(row.collection_id, "reject")}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-rose-200 px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <ShieldAlert size={12} />}
                          驳回
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void callDecision(row.collection_id, "offline")}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                          下架
                        </button>
                        <button
                          type="button"
                          onClick={() => void openLogs(row.collection_id)}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-indigo-200 px-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                        >
                          <FileClock size={12} />
                          日志
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {logsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">审核日志</h3>
                <p className="text-xs text-slate-500">合集 ID：{logCollectionID || "-"}</p>
              </div>
              <button
                type="button"
                onClick={() => setLogsOpen(false)}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                关闭
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto p-4">
              {logsLoading ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    加载日志中...
                  </span>
                </div>
              ) : logsError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{logsError}</div>
              ) : logs.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">暂无日志</div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{log.action || "-"}</span>
                        <span>{formatDate(log.created_at)}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {log.operator_role || "-"} · {log.operator_name || "-"} ({log.operator_id || 0})
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        审核状态：{log.from_review_status || "-"} → {log.to_review_status || "-"} · 上架状态：
                        {log.from_publish_status || "-"} → {log.to_publish_status || "-"}
                      </div>
                      {log.reason ? <div className="mt-1 text-xs text-slate-700">备注：{log.reason}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

