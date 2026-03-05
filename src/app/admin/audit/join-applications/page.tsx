"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type JoinApplication = {
  id: number;
  name: string;
  phone: string;
  gender: string;
  age: number;
  email: string;
  occupation: string;
  created_at: string;
};

type JoinApplicationListResponse = {
  items: JoinApplication[];
  total: number;
};

export default function Page() {
  const [items, setItems] = useState<JoinApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const loadApplications = async (
    pageValue = page,
    pageSizeValue = pageSize,
    keywordValue = keyword
  ) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set("page", String(pageValue));
      query.set("page_size", String(pageSizeValue));
      if (keywordValue.trim()) query.set("keyword", keywordValue.trim());

      const response = await fetchWithAuth(
        `${API_BASE}/api/admin/join-applications?${query.toString()}`
      );
      if (!response.ok) throw new Error(await response.text());

      const payload = (await response.json()) as JoinApplicationListResponse;
      setItems(payload.items || []);
      setTotal(payload.total || 0);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications(page, pageSize, keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, keyword]);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setKeyword(keywordInput.trim());
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="加入申请"
        description="查看档案馆加入申请，按创建时间倒序展示。"
        actions={
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
            onClick={() => loadApplications(page, pageSize, keyword)}
            disabled={loading}
          >
            {loading ? "加载中..." : "刷新"}
          </button>
        }
      />

      {error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-100 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <form className="flex flex-wrap items-center gap-2" onSubmit={onSearch}>
            <input
              className="h-9 w-64 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-400"
              placeholder="搜索姓名/电话/邮箱/职业"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
            />
            <button
              type="submit"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
            >
              搜索
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
              onClick={() => {
                setKeywordInput("");
                setKeyword("");
                setPage(1);
              }}
            >
              清空
            </button>
          </form>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>每页</span>
            <select
              className="rounded-xl border border-slate-100 bg-white px-3 py-1 text-xs text-slate-600"
              value={pageSize}
              onChange={(event) => {
                setPage(1);
                setPageSize(Number(event.target.value));
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">姓名</th>
                <th className="px-4 py-3">电话</th>
                <th className="px-4 py-3">性别</th>
                <th className="px-4 py-3">年龄</th>
                <th className="px-4 py-3">邮箱</th>
                <th className="px-4 py-3">职业</th>
                <th className="px-4 py-3">申请时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="text-slate-700">
                  <td className="px-4 py-3">{item.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3">{item.phone}</td>
                  <td className="px-4 py-3">{item.gender}</td>
                  <td className="px-4 py-3">{item.age}</td>
                  <td className="px-4 py-3">{item.email}</td>
                  <td className="px-4 py-3">{item.occupation}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                    暂无申请记录
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            共 {total} 条， 第 {page} / {totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              上一页
            </button>
            <button
              className="rounded-xl border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
