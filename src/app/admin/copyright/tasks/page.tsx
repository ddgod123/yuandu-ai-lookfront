"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { CopyrightTask, getTaskLogs, listCopyrightTasks } from "@/lib/admin-copyright";

type TaskLog = { id: number; stage: string; status: string; message: string; created_at: string };

function isRunningStatus(status: string) {
  return status === "pending" || status === "running";
}

export default function Page() {
  const [items, setItems] = useState<CopyrightTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collectionId, setCollectionId] = useState("");
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null);

  const hasRunningTask = useMemo(() => items.some((item) => isRunningStatus(item.status)), [items]);

  const load = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await listCopyrightTasks({
        page: 1,
        pageSize: 50,
        collectionId: Number(collectionId) || undefined,
      });
      setItems(data.items);
    } catch (err: unknown) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "加载失败");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const openLogs = async (taskId: number, silent = false) => {
    setCurrentTaskId(taskId);
    if (!silent) setError(null);
    try {
      const data = await getTaskLogs(taskId, 1, 30);
      setLogs(data.items);
    } catch {
      if (!silent) setError("日志加载失败");
      setLogs([]);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasRunningTask) return;
    const timer = setInterval(() => {
      void load(true);
      if (currentTaskId) {
        void openLogs(currentTaskId, true);
      }
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRunningTask, currentTaskId, collectionId]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="识别任务记录"
        description={hasRunningTask ? "存在运行中任务，列表每5秒自动刷新。" : "查看任务进度、结果摘要与处理日志。"}
        actions={
          <div className="flex items-center gap-2">
            <input
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              placeholder="按合集ID筛选"
              className="h-9 w-36 rounded-xl border border-slate-200 px-3 text-xs"
            />
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
                <th className="py-2 pr-3">TaskNo</th>
                <th className="py-2 pr-3">合集ID</th>
                <th className="py-2 pr-3">模式</th>
                <th className="py-2 pr-3">状态</th>
                <th className="py-2 pr-3">进度</th>
                <th className="py-2 pr-3">高风险</th>
                <th className="py-2 pr-3">更新时间</th>
                <th className="py-2 pr-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-6 text-center text-slate-400">加载中...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="py-6 text-center text-slate-400">暂无数据</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50">
                    <td className="py-3 pr-3 font-mono text-xs">{item.task_no}</td>
                    <td className="py-3 pr-3">{item.collection_id}</td>
                    <td className="py-3 pr-3">{item.run_mode}</td>
                    <td className="py-3 pr-3">
                      <span className={isRunningStatus(item.status) ? "text-amber-600" : "text-slate-700"}>{item.status}</span>
                    </td>
                    <td className="py-3 pr-3">{item.progress}%</td>
                    <td className="py-3 pr-3">{item.high_risk_count}</td>
                    <td className="py-3 pr-3 text-xs text-slate-500">{item.updated_at?.slice(0, 19).replace("T", " ")}</td>
                    <td className="py-3 pr-3">
                      <button className="text-xs text-emerald-700" onClick={() => void openLogs(item.id)}>
                        查看日志
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-slate-900">任务日志 {currentTaskId ? `(Task ${currentTaskId})` : ""}</div>
        <div className="max-h-96 overflow-auto space-y-2">
          {logs.length === 0 ? (
            <div className="text-xs text-slate-400">暂无日志</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-100 p-2 text-xs">
                <div className="font-semibold text-slate-700">[{log.stage}] {log.status}</div>
                <div className="text-slate-500">{log.message}</div>
                <div className="text-slate-400">{log.created_at?.slice(0, 19).replace("T", " ")}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
