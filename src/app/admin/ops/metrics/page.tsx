"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type SummaryResponse = {
  days: number;
  download_count: number;
  search_count: number;
  view_count: number;
  avg_heat_score: number;
};

type TopCategoryItem = {
  category_id: number;
  name?: string;
  parent_id?: number | null;
  download_count: number;
  search_count: number;
  view_count: number;
  heat_score: number;
};

type SearchTermItem = {
  term: string;
  search_count: number;
};

export default function OpsMetricsPage() {
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [topCategories, setTopCategories] = useState<TopCategoryItem[]>([]);
  const [topTerms, setTopTerms] = useState<SearchTermItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async (daysValue = days) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set("days", String(daysValue));
      const [summaryRes, categoryRes, termRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/admin/ops/metrics/summary?${query.toString()}`),
        fetchWithAuth(`${API_BASE}/api/admin/ops/metrics/top-categories?${query.toString()}`),
        fetchWithAuth(`${API_BASE}/api/admin/ops/metrics/search-terms?${query.toString()}`),
      ]);
      if (!summaryRes.ok) throw new Error(await summaryRes.text());
      if (!categoryRes.ok) throw new Error(await categoryRes.text());
      if (!termRes.ok) throw new Error(await termRes.text());
      setSummary((await summaryRes.json()) as SummaryResponse);
      const categoryData = await categoryRes.json();
      const termData = await termRes.json();
      setTopCategories(
        Array.isArray(categoryData)
          ? (categoryData as TopCategoryItem[])
          : ((categoryData?.items || []) as TopCategoryItem[])
      );
      setTopTerms(
        Array.isArray(termData)
          ? (termData as SearchTermItem[])
          : ((termData?.items || []) as SearchTermItem[])
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // days 切换时刷新统计
  useEffect(() => {
    loadMetrics(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const summaryCards = useMemo(
    () => [
      {
        label: "下载量",
        value: summary?.download_count ?? 0,
        helper: `${days} 天`,
      },
      {
        label: "搜索量",
        value: summary?.search_count ?? 0,
        helper: `${days} 天`,
      },
      {
        label: "浏览量",
        value: summary?.view_count ?? 0,
        helper: `${days} 天`,
      },
      {
        label: "平均热度",
        value: summary?.avg_heat_score ?? 0,
        helper: "综合评分",
      },
    ],
    [summary, days]
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="运营数据"
        description="查看下载量、搜索量与热度趋势。"
        actions={
          <div className="flex items-center gap-3">
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>近 7 天</option>
              <option value={30}>近 30 天</option>
              <option value={90}>近 90 天</option>
            </select>
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
              onClick={() => loadMetrics(days)}
              disabled={loading}
            >
              {loading ? "加载中..." : "刷新"}
            </button>
          </div>
        }
      />

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="text-xs text-slate-400">{card.label}</div>
            <div className="mt-3 text-2xl font-bold text-slate-800">
              {formatNumber(card.value)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{card.helper}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-700">热门分类</div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">分类</th>
                  <th className="px-4 py-3">热度</th>
                  <th className="px-4 py-3">下载</th>
                  <th className="px-4 py-3">搜索</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topCategories.map((item) => (
                  <tr key={item.category_id} className="text-slate-700">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">
                        {item.name || `#${item.category_id}`}
                      </div>
                      {item.parent_id ? (
                        <div className="text-[11px] text-slate-400">子级分类</div>
                      ) : (
                        <div className="text-[11px] text-slate-400">一级分类</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatNumber(item.heat_score)}</td>
                    <td className="px-4 py-3">{formatNumber(item.download_count)}</td>
                    <td className="px-4 py-3">{formatNumber(item.search_count)}</td>
                  </tr>
                ))}
                {!topCategories.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-700">热门搜索词</div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">关键词</th>
                  <th className="px-4 py-3">搜索次数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topTerms.map((item) => (
                  <tr key={item.term} className="text-slate-700">
                    <td className="px-4 py-3">{item.term}</td>
                    <td className="px-4 py-3">{formatNumber(item.search_count)}</td>
                  </tr>
                ))}
                {!topTerms.length && (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-xs text-slate-400">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "-";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 10000) return `${(value / 10000).toFixed(1)}w`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}
