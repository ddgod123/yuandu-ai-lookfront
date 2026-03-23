"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE, getAccessToken, setTokens } from "@/lib/admin-auth";

type LoginResponse = {
  user: {
    id: number;
    role: string;
    display_name?: string;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      router.replace("/admin/users");
    }
  }, [router]);

  const submit = async () => {
    const normalizedPhone = phone.trim();
    if (!normalizedPhone) {
      setError("请输入管理员手机号");
      return;
    }
    if (!password.trim()) {
      setError("请输入登录密码");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, password }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "login failed");
      }
      const data = (await res.json()) as LoginResponse;
      if (!data.user || data.user.role !== "super_admin") {
        throw new Error("仅允许超级管理员登录");
      }
      setTokens(
        data.tokens.access_token,
        data.tokens.refresh_token,
        data.tokens.expires_in,
        data.user.display_name || "超级管理员",
        data.user.role
      );
      router.push("/admin/users");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-3xl shadow-xl shadow-emerald-200">
            <span className="filter grayscale brightness-200 contrast-200">🗂️</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">管理后台登录</h1>
          <p className="mt-3 text-sm font-medium text-slate-500">
            欢迎回来，请验证您的管理员身份
          </p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-10 shadow-xl shadow-slate-200/50">
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">手机号</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 placeholder:text-slate-300"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="输入管理员手机号"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">登录密码</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium tracking-[0.5em] outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 placeholder:text-slate-300 placeholder:tracking-normal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入登录密码"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 ring-1 ring-rose-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <button
              className="relative w-full overflow-hidden rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
              onClick={submit}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <span>安全验证中...</span>
                </div>
              ) : (
                "进入工作台"
              )}
            </button>
          </div>
        </div>

        <div className="mt-10 text-center text-xs font-medium text-slate-400">
          © 2026 表情包档案馆 · Archive Admin v2.0
        </div>
      </div>
    </div>
  );
}
