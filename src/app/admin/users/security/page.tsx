"use client";

import { useCallback, useEffect, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type SecurityOverview = {
  window_start_hour?: string;
  window_start_day?: string;
  emoji_download_last_1h?: number;
  collection_download_last_1h?: number;
  blocked_events_last_24h?: number;
  rate_limited_last_24h?: number;
  active_blacklist_count?: number;
  top_download_ips?: { ip: string; download_count: number }[];
  top_blocked_targets?: { scope: string; target: string; block_count: number }[];
};

type BlacklistItem = {
  id: number;
  scope: "ip" | "device" | "user" | "phone";
  target: string;
  action: "all" | "sms" | "auth" | "download" | "redeem";
  status: "active" | "disabled";
  reason: string;
  expires_at?: string | null;
  created_at?: string;
};

type BlacklistListResponse = {
  items: BlacklistItem[];
  total: number;
};

type RiskEventItem = {
  id: number;
  event_type: string;
  action: string;
  scope: string;
  target: string;
  severity: string;
  message: string;
  created_at: string;
};

type RiskEventResponse = {
  items: RiskEventItem[];
  total: number;
};

type EventFilters = {
  days: string;
  action: string;
  severity: string;
  eventType: string;
  q: string;
};

const defaultEventFilters: EventFilters = {
  days: "7",
  action: "all",
  severity: "all",
  eventType: "",
  q: "",
};

export default function SecurityRiskPage() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [blacklists, setBlacklists] = useState<BlacklistItem[]>([]);
  const [events, setEvents] = useState<RiskEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventFilters, setEventFilters] = useState<EventFilters>(defaultEventFilters);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    scope: "ip",
    target: "",
    action: "download",
    reason: "",
    expires_at: "",
  });

  const loadData = useCallback(async (filters: EventFilters) => {
    setLoading(true);
    setError(null);
    try {
      const eventParams = new URLSearchParams({
        page: "1",
        page_size: "50",
        days: filters.days || "7",
      });
      if (filters.action && filters.action !== "all") {
        eventParams.set("action", filters.action);
      }
      if (filters.severity && filters.severity !== "all") {
        eventParams.set("severity", filters.severity);
      }
      if (filters.eventType.trim()) {
        eventParams.set("event_type", filters.eventType.trim());
      }
      if (filters.q.trim()) {
        eventParams.set("q", filters.q.trim());
      }

      const [overviewRes, blackRes, eventRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/admin/security/overview`),
        fetchWithAuth(`${API_BASE}/api/admin/security/blacklists?page=1&page_size=50`),
        fetchWithAuth(`${API_BASE}/api/admin/security/events?${eventParams.toString()}`),
      ]);
      if (!overviewRes.ok) throw new Error(await overviewRes.text());
      if (!blackRes.ok) throw new Error(await blackRes.text());
      if (!eventRes.ok) throw new Error(await eventRes.text());

      setOverview((await overviewRes.json()) as SecurityOverview);
      const blackData = (await blackRes.json()) as BlacklistListResponse;
      const eventData = (await eventRes.json()) as RiskEventResponse;
      setBlacklists(Array.isArray(blackData.items) ? blackData.items : []);
      setEvents(Array.isArray(eventData.items) ? eventData.items : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(defaultEventFilters);
  }, [loadData]);

  const applyEventFilters = async () => {
    await loadData(eventFilters);
  };

  const resetEventFilters = async () => {
    setEventFilters(defaultEventFilters);
    await loadData(defaultEventFilters);
  };

  const createBlacklist = async () => {
    if (!createForm.target.trim()) {
      setError("请输入封禁目标");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const payload: Record<string, string> = {
        scope: createForm.scope,
        target: createForm.target.trim(),
        action: createForm.action,
        reason: createForm.reason.trim(),
      };
      if (createForm.expires_at.trim()) {
        payload.expires_at = new Date(createForm.expires_at).toISOString();
      }
      const res = await fetchWithAuth(`${API_BASE}/api/admin/security/blacklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "创建失败");
      }
      setCreateForm((prev) => ({ ...prev, target: "", reason: "", expires_at: "" }));
      await loadData(eventFilters);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "创建失败";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const toggleBlacklistStatus = async (item: BlacklistItem) => {
    const nextStatus = item.status === "active" ? "disabled" : "active";
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/security/blacklists/${item.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadData(eventFilters);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "操作失败";
      setError(message);
    }
  };

  const deleteBlacklist = async (item: BlacklistItem) => {
    if (!window.confirm(`确认删除黑名单 ${item.scope}:${item.target} ?`)) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/security/blacklists/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      await loadData(eventFilters);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "删除失败";
      setError(message);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="风控防刷"
        description="管理黑名单、查看限流与拦截事件，防止恶意注册和暴力下载。"
        actions={
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
            onClick={() => void loadData(eventFilters)}
            disabled={loading}
          >
            {loading ? "加载中..." : "刷新"}
          </button>
        }
      />

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="单图下载(1h)" value={overview?.emoji_download_last_1h ?? 0} />
        <MetricCard label="合集下载(1h)" value={overview?.collection_download_last_1h ?? 0} />
        <MetricCard label="黑名单命中(24h)" value={overview?.blocked_events_last_24h ?? 0} />
        <MetricCard label="限流触发(24h)" value={overview?.rate_limited_last_24h ?? 0} />
        <MetricCard label="生效黑名单" value={overview?.active_blacklist_count ?? 0} />
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 text-sm font-semibold text-slate-700">新增黑名单</div>
        <div className="grid gap-3 md:grid-cols-5">
          <select
            value={createForm.scope}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, scope: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            <option value="ip">IP</option>
            <option value="device">设备ID</option>
            <option value="phone">手机号</option>
            <option value="user">用户ID</option>
          </select>
          <input
            value={createForm.target}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, target: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 md:col-span-2"
            placeholder="封禁目标（如 1.2.3.4 / dv_xxx / 13800000000 / 123）"
          />
          <select
            value={createForm.action}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, action: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            <option value="download">download</option>
            <option value="redeem">redeem</option>
            <option value="sms">sms</option>
            <option value="auth">auth</option>
            <option value="all">all</option>
          </select>
          <input
            type="datetime-local"
            value={createForm.expires_at}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, expires_at: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
          />
          <input
            value={createForm.reason}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, reason: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 md:col-span-4"
            placeholder="原因（可选）"
          />
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            disabled={creating}
            onClick={createBlacklist}
          >
            {creating ? "创建中..." : "创建黑名单"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 text-sm font-semibold text-slate-700">黑名单列表</div>
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2">目标</th>
                  <th className="px-3 py-2">场景</th>
                  <th className="px-3 py-2">状态</th>
                  <th className="px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {blacklists.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{item.target}</div>
                      <div className="text-xs text-slate-400">{item.scope}</div>
                    </td>
                    <td className="px-3 py-2">{item.action}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          item.status === "active"
                            ? "bg-rose-100 text-rose-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                          onClick={() => toggleBlacklistStatus(item)}
                        >
                          {item.status === "active" ? "停用" : "启用"}
                        </button>
                        <button
                          className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                          onClick={() => deleteBlacklist(item)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!blacklists.length && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-xs text-slate-400">
                      暂无黑名单
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-700">风控事件</div>
            <div className="text-xs text-slate-400">当前 {events.length} 条</div>
          </div>
          <div className="mb-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <select
              value={eventFilters.days}
              onChange={(e) => setEventFilters((prev) => ({ ...prev, days: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              <option value="1">近 1 天</option>
              <option value="3">近 3 天</option>
              <option value="7">近 7 天</option>
              <option value="30">近 30 天</option>
            </select>
            <select
              value={eventFilters.action}
              onChange={(e) => setEventFilters((prev) => ({ ...prev, action: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">全部动作</option>
              <option value="download">download</option>
              <option value="auth">auth</option>
              <option value="sms">sms</option>
              <option value="redeem">redeem</option>
            </select>
            <select
              value={eventFilters.severity}
              onChange={(e) => setEventFilters((prev) => ({ ...prev, severity: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">全部级别</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
              <option value="info">info</option>
            </select>
            <input
              value={eventFilters.eventType}
              onChange={(e) => setEventFilters((prev) => ({ ...prev, eventType: e.target.value }))}
              placeholder="事件类型（如 blacklist_block）"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            />
            <input
              value={eventFilters.q}
              onChange={(e) => setEventFilters((prev) => ({ ...prev, q: e.target.value }))}
              placeholder="关键词（目标/消息）"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            />
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                disabled={loading}
                onClick={applyEventFilters}
              >
                查询
              </button>
              <button
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                disabled={loading}
                onClick={resetEventFilters}
              >
                重置
              </button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2">事件</th>
                  <th className="px-3 py-2">级别</th>
                  <th className="px-3 py-2">目标</th>
                  <th className="px-3 py-2">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {events.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{item.event_type}</div>
                      <div className="text-xs text-slate-400">{item.action || "-"}</div>
                      <div className="text-xs text-slate-400">{item.message || "-"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <SeverityBadge severity={item.severity} />
                    </td>
                    <td className="px-3 py-2">
                      <div>{item.target || "-"}</div>
                      <div className="text-xs text-slate-400">{item.scope || "-"}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{formatDateTime(item.created_at)}</td>
                  </tr>
                ))}
                {!events.length && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-xs text-slate-400">
                      暂无事件
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SmallTable
          title="下载来源 Top IP（1小时）"
          rows={(overview?.top_download_ips || []).map((item) => ({
            key: item.ip,
            value: item.download_count,
          }))}
          emptyText="暂无下载数据"
        />
        <SmallTable
          title="黑名单命中 Top 目标（24小时）"
          rows={(overview?.top_blocked_targets || []).map((item) => ({
            key: `${item.scope}:${item.target}`,
            value: item.block_count,
          }))}
          emptyText="暂无命中数据"
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-800">{formatNumber(value)}</div>
    </div>
  );
}

function SmallTable({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: { key: string; value: number }[];
  emptyText: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-slate-700">{title}</div>
      <div className="overflow-hidden rounded-2xl border border-slate-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2">目标</th>
              <th className="px-3 py-2">次数</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="px-3 py-2">{row.key}</td>
                <td className="px-3 py-2">{formatNumber(row.value)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={2} className="px-3 py-6 text-center text-xs text-slate-400">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity?: string }) {
  const level = (severity || "info").toLowerCase();
  let cls = "bg-slate-100 text-slate-600";
  if (level === "high") {
    cls = "bg-rose-100 text-rose-700";
  } else if (level === "medium") {
    cls = "bg-amber-100 text-amber-700";
  } else if (level === "low") {
    cls = "bg-blue-100 text-blue-700";
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${cls}`}>
      {level}
    </span>
  );
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "-";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 10000) return `${(value / 10000).toFixed(1)}w`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}
