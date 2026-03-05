"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import {
  API_BASE,
  clearTokens,
  fetchWithAuth,
  getAdminProfile,
  logout,
} from "@/lib/admin-auth";

const ADMIN_LOGIN_PATH = "/admin/login";

type User = {
  id: number;
  email?: string;
  phone?: string;
  display_name?: string;
  role: string;
  status: string;
  user_level?: string;
  subscription_status?: string;
  subscription_plan?: string;
  subscription_started_at?: string;
  subscription_expires_at?: string;
  is_subscriber?: boolean;
  created_at: string;
};

type UsersResponse = {
  items: User[];
  total: number;
};

type RedemptionRecord = {
  id: number;
  code_mask?: string;
  granted_plan?: string;
  granted_status?: string;
  granted_starts_at?: string;
  granted_expires_at?: string;
  created_at?: string;
};

type UserDetailResponse = {
  user: User;
  redemption_records: RedemptionRecord[];
};

export default function UsersPage() {
  const router = useRouter();
  const [q, setQ] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<UserDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const profile = getAdminProfile();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/users", API_BASE);
      if (q) url.searchParams.set("q", q);
      const res = await fetchWithAuth(url.toString());
      if (res.status === 401) {
        clearTokens();
        router.replace(ADMIN_LOGIN_PATH);
        return;
      }
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "request failed");
      }
      const json = (await res.json()) as UsersResponse;
      setData(json);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // 页面初始化加载用户列表
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRole = async (id: number, role: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/users/${id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.status === 401) {
        clearTokens();
        router.replace(ADMIN_LOGIN_PATH);
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown error";
      setError(message);
    }
  };

  const updateStatus = async (id: number, status: "active" | "disabled") => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/users/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) {
        clearTokens();
        router.replace(ADMIN_LOGIN_PATH);
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown error";
      setError(message);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace(ADMIN_LOGIN_PATH);
  };

  const loadUserDetail = async (userId: number) => {
    setDetailLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/users/${userId}/detail`);
      if (res.status === 401) {
        clearTokens();
        router.replace(ADMIN_LOGIN_PATH);
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as UserDetailResponse;
      setDetail(json);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown error";
      setError(message);
    } finally {
      setDetailLoading(false);
    }
  };

  const rows = useMemo(() => data?.items ?? [], [data]);
  const formatTime = (value?: string) => (value ? new Date(value).toLocaleString() : "-");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="用户列表"
        description="仅超级管理员可维护用户角色与状态。"
        actions={
          <button
            className="rounded-xl border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            退出登录
          </button>
        }
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        当前登录：{profile.name || "超级管理员"}（{profile.role || "super_admin"}）
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="w-72 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          placeholder="搜索（邮箱/手机号/昵称）"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
          onClick={load}
          disabled={loading}
        >
          {loading ? "加载中..." : "加载"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">手机号</th>
              <th className="px-4 py-3 font-semibold">邮箱</th>
              <th className="px-4 py-3 font-semibold">昵称</th>
              <th className="px-4 py-3 font-semibold">角色</th>
              <th className="px-4 py-3 font-semibold">状态</th>
              <th className="px-4 py-3 font-semibold">用户等级</th>
              <th className="px-4 py-3 font-semibold">订阅计划</th>
              <th className="px-4 py-3 font-semibold">订阅到期</th>
              <th className="px-4 py-3 font-semibold">创建时间</th>
              <th className="px-4 py-3 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((user) => (
              <tr key={user.id} className="text-slate-700 transition hover:bg-slate-50/70">
                <td className="px-4 py-3 font-medium">{user.id}</td>
                <td className="px-4 py-3">{user.phone || "-"}</td>
                <td className="px-4 py-3">{user.email || "-"}</td>
                <td className="px-4 py-3 font-medium">{user.display_name || "-"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      user.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      user.user_level === "subscriber"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {user.user_level || "free"}
                  </span>
                </td>
                <td className="px-4 py-3">{user.subscription_plan || "-"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatTime(user.subscription_expires_at)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatTime(user.created_at)}</td>
                <td className="px-4 py-3">
                  {user.role === "super_admin" ? (
                    <span className="text-xs font-semibold text-emerald-700">超级管理员</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => loadUserDetail(user.id)}
                      >
                        查看详情
                      </button>
                      <button
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => updateRole(user.id, "admin")}
                      >
                        设为管理员
                      </button>
                      <button
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => updateRole(user.id, "user")}
                      >
                        设为普通
                      </button>
                      {user.status === "active" ? (
                        <button
                          className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                          onClick={() => updateStatus(user.id, "disabled")}
                        >
                          禁用
                        </button>
                      ) : (
                        <button
                          className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                          onClick={() => updateStatus(user.id, "active")}
                        >
                          启用
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={11}>
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">用户详情与兑换记录</h3>
          {detail ? (
            <button
              onClick={() => setDetail(null)}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              清空
            </button>
          ) : null}
        </div>
        {detailLoading ? (
          <div className="mt-4 text-sm text-slate-500">正在加载详情...</div>
        ) : !detail ? (
          <div className="mt-4 text-sm text-slate-500">点击表格内“查看详情”以查看用户等级、订阅信息和兑换记录。</div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
              <div>用户ID：{detail.user.id}</div>
              <div>昵称：{detail.user.display_name || "-"}</div>
              <div>手机号：{detail.user.phone || "-"}</div>
              <div>邮箱：{detail.user.email || "-"}</div>
              <div>身份角色：{detail.user.role}</div>
              <div>用户等级：{detail.user.user_level || "free"}</div>
              <div>订阅状态：{detail.user.subscription_status || "inactive"}</div>
              <div>订阅计划：{detail.user.subscription_plan || "-"}</div>
              <div>
                订阅开始：
                {detail.user.subscription_started_at
                  ? new Date(detail.user.subscription_started_at).toLocaleString()
                  : "-"}
              </div>
              <div>
                订阅结束：
                {detail.user.subscription_expires_at
                  ? new Date(detail.user.subscription_expires_at).toLocaleString()
                  : "-"}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2">记录ID</th>
                    <th className="px-3 py-2">兑换码</th>
                    <th className="px-3 py-2">计划</th>
                    <th className="px-3 py-2">状态</th>
                    <th className="px-3 py-2">生效时间</th>
                    <th className="px-3 py-2">到期时间</th>
                    <th className="px-3 py-2">兑换时间</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.redemption_records?.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{item.id}</td>
                      <td className="px-3 py-2">{item.code_mask || "-"}</td>
                      <td className="px-3 py-2">{item.granted_plan || "-"}</td>
                      <td className="px-3 py-2">{item.granted_status || "-"}</td>
                      <td className="px-3 py-2">
                        {item.granted_starts_at
                          ? new Date(item.granted_starts_at).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {item.granted_expires_at
                          ? new Date(item.granted_expires_at).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                  {(!detail.redemption_records || detail.redemption_records.length === 0) && (
                    <tr>
                      <td className="px-3 py-4 text-center text-slate-400" colSpan={7}>
                        暂无兑换记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
