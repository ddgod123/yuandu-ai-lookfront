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
  created_at: string;
};

type UsersResponse = {
  items: User[];
  total: number;
};

export default function UsersPage() {
  const router = useRouter();
  const [q, setQ] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UsersResponse | null>(null);
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

  const rows = useMemo(() => data?.items ?? [], [data]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="用户列表"
        description="仅超级管理员可维护用户角色与状态。"
        actions={
          <button
            className="rounded-xl border border-red-500/40 px-4 py-2 text-xs text-red-200 hover:bg-red-500/10"
            onClick={handleLogout}
          >
            退出登录
          </button>
        }
      />

      <div className="rounded-3xl border border-slate-100 bg-white p-4 text-xs text-slate-600">
        当前登录：{profile.name || "超级管理员"}（{profile.role || "super_admin"}）
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="w-72 rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-white outline-none placeholder:text-white/40"
          placeholder="搜索（邮箱/手机号/昵称）"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-[#0b0f1a] hover:bg-emerald-300"
          onClick={load}
          disabled={loading}
        >
          {loading ? "加载中..." : "加载"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/10 text-slate-600">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">手机号</th>
              <th className="px-4 py-3">邮箱</th>
              <th className="px-4 py-3">昵称</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">创建时间</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((user) => (
              <tr key={user.id} className="text-slate-200">
                <td className="px-4 py-3">{user.id}</td>
                <td className="px-4 py-3">{user.phone || "-"}</td>
                <td className="px-4 py-3">{user.email || "-"}</td>
                <td className="px-4 py-3">{user.display_name || "-"}</td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">{user.status}</td>
                <td className="px-4 py-3">
                  {new Date(user.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {user.role === "super_admin" ? (
                    <span className="text-xs text-emerald-400">超级管理员</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded border border-slate-100 px-2 py-1 text-xs hover:bg-white/10"
                        onClick={() => updateRole(user.id, "admin")}
                      >
                        设为管理员
                      </button>
                      <button
                        className="rounded border border-slate-100 px-2 py-1 text-xs hover:bg-white/10"
                        onClick={() => updateRole(user.id, "user")}
                      >
                        设为普通
                      </button>
                      {user.status === "active" ? (
                        <button
                          className="rounded border border-red-500/60 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                          onClick={() => updateStatus(user.id, "disabled")}
                        >
                          禁用
                        </button>
                      ) : (
                        <button
                          className="rounded border border-emerald-500/60 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10"
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
                <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
