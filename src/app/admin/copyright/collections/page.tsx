"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import {
  CopyrightCollection,
  createCopyrightTask,
  listCopyrightCollections,
} from "@/lib/admin-copyright";

type RunMode = "first" | "five" | "all";

const RUN_MODE_TEXT: Record<RunMode, string> = {
  first: "跑第一张：适合同风格/统一来源合集，最快。",
  five: "跑5张：适合大多数合集，平衡速度与准确率。",
  all: "全跑：适合混合来源合集，最稳妥。",
};

export default function Page() {
  const [items, setItems] = useState<CopyrightCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [taskingId, setTaskingId] = useState<number | null>(null);
  const [runMode, setRunMode] = useState<RunMode>("first");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCopyrightCollections({ page: 1, pageSize: 50, keyword });
      setItems(data.items);
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

  const runTask = async (collectionId: number) => {
    setTaskingId(collectionId);
    setError(null);
    try {
      const sampleStrategy = runMode === "first" ? "first" : runMode === "five" ? "even" : "all";
      await createCopyrightTask({
        collectionId,
        runMode,
        sampleStrategy,
        enableTagging: true,
        overwriteMachineTags: true,
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "任务创建失败");
    } finally {
      setTaskingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="合集版权识别（任务发起页）"
        description="本页只做两件事：选择合集 + 发起识别任务。识别结果去【识别任务记录】和【单图版权识别】查看。"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={runMode}
              onChange={(e) => setRunMode(e.target.value as RunMode)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"
            >
              <option value="first">跑第一张</option>
              <option value="five">跑5张</option>
              <option value="all">全跑</option>
            </select>
            <button
              onClick={() => void load()}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
            >
              刷新
            </button>
          </div>
        }
      />

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-800">
        <div className="font-semibold">当前模式说明：{RUN_MODE_TEXT[runMode]}</div>
        <div className="mt-1">
          使用步骤：1）选模式 → 2）点某一行“发起识别” → 3）去“识别任务记录/单图版权识别”看结果。
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索合集名"
            className="h-9 w-64 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <button
            onClick={() => void load()}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
          >
            搜索
          </button>
          <Link href="/admin/copyright/tasks" className="text-xs font-semibold text-emerald-700">
            查看任务记录
          </Link>
        </div>

        {error && <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="py-2 pr-3">合集</th>
                <th className="py-2 pr-3">张数</th>
                <th className="py-2 pr-3">最新风险</th>
                <th className="py-2 pr-3">审核状态</th>
                <th className="py-2 pr-3">更新时间</th>
                <th className="py-2 pr-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    加载中...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.collectionId} className="border-b border-slate-50">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt={item.collectionName} className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-slate-100" />
                        )}
                        <div>
                          <div className="font-semibold text-slate-900">{item.collectionName}</div>
                          <div className="text-xs text-slate-400">ID: {item.collectionId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">{item.imageCount}</td>
                    <td className="py-3 pr-3">{item.latestRiskLevel || "-"}</td>
                    <td className="py-3 pr-3">{item.reviewStatus || "unreviewed"}</td>
                    <td className="py-3 pr-3 text-xs text-slate-500">{item.updatedAt?.slice(0, 19).replace("T", " ") || "-"}</td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <button
                          disabled={taskingId === item.collectionId}
                          onClick={() => void runTask(item.collectionId)}
                          className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {taskingId === item.collectionId ? "提交中..." : "发起识别（当前模式）"}
                        </button>
                        <Link href={`/admin/copyright/images?collectionId=${item.collectionId}`} className="text-xs text-slate-600">
                          看单图
                        </Link>
                      </div>
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
