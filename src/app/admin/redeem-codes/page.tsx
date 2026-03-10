"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type RedeemCodeItem = {
  id: number;
  code_mask: string;
  code_plain?: string;
  batch_no: string;
  plan: string;
  duration_days: number;
  max_uses: number;
  used_count: number;
  status: string;
  starts_at?: string;
  ends_at?: string;
  note?: string;
  created_at: string;
};

type RedeemCodeListResponse = {
  items: RedeemCodeItem[];
  total: number;
};

type RedemptionRecord = {
  id: number;
  code_mask?: string;
  user_display_name?: string;
  user_phone?: string;
  granted_plan?: string;
  granted_status?: string;
  granted_starts_at?: string;
  granted_expires_at?: string;
  created_at?: string;
};

type RedemptionRecordResponse = {
  items: RedemptionRecord[];
  total: number;
};

type GenerateResponse = {
  batch_no: string;
  count: number;
  plan: string;
  duration_days: number;
  max_uses: number;
  codes: string[];
};

export default function RedeemCodesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RedeemCodeListResponse>({ items: [], total: 0 });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [batchNo, setBatchNo] = useState("");

  const [count, setCount] = useState(10);
  const [durationDays, setDurationDays] = useState(30);
  const [maxUses, setMaxUses] = useState(1);
  const [generatePlan, setGeneratePlan] = useState("subscriber");
  const [prefix, setPrefix] = useState("");
  const [generateBatchNo, setGenerateBatchNo] = useState("");
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GenerateResponse | null>(null);

  const [selectedCodeID, setSelectedCodeID] = useState<number | null>(null);
  const [records, setRecords] = useState<RedemptionRecordResponse>({ items: [], total: 0 });
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [copiedCodeID, setCopiedCodeID] = useState<number | null>(null);

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/redeem-codes", API_BASE);
      if (q.trim()) url.searchParams.set("q", q.trim());
      if (status) url.searchParams.set("status", status);
      if (plan) url.searchParams.set("plan", plan);
      if (batchNo.trim()) url.searchParams.set("batch_no", batchNo.trim());
      const res = await fetchWithAuth(url.toString());
      if (!res.ok) throw new Error(await res.text());
      const payload = (await res.json()) as RedeemCodeListResponse;
      setData(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [q, status, plan, batchNo]);

  const loadRecords = async (codeID: number) => {
    setRecordsLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/redeem-codes/${codeID}/redemptions`);
      if (!res.ok) throw new Error(await res.text());
      const payload = (await res.json()) as RedemptionRecordResponse;
      setRecords(payload);
      setSelectedCodeID(codeID);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载核销记录失败");
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createCodes = async () => {
    setGenerating(true);
    setError(null);
    setGenerated(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/redeem-codes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count,
          duration_days: durationDays,
          max_uses: maxUses,
          plan: generatePlan,
          prefix: prefix.trim(),
          batch_no: generateBatchNo.trim(),
          note: note.trim(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const payload = (await res.json()) as GenerateResponse;
      setGenerated(payload);
      setBatchNo(payload.batch_no);
      await loadCodes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const updateCodeStatus = async (id: number, nextStatus: "active" | "disabled") => {
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/redeem-codes/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadCodes();
      if (selectedCodeID === id) {
        await loadRecords(id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "状态更新失败");
    }
  };

  const generatedText = useMemo(() => {
    if (!generated?.codes?.length) return "";
    return generated.codes.join("\n");
  }, [generated]);

  const copyText = async (text: string, codeID: number) => {
    const value = text.trim();
    if (!value) {
      setError("该兑换码暂无明文，无法复制（历史数据）");
      return;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const input = document.createElement("input");
        input.value = value;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopiedCodeID(codeID);
      setTimeout(() => setCopiedCodeID((prev) => (prev === codeID ? null : prev)), 1200);
    } catch {
      setError("复制失败，请手动复制");
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="兑换码管理"
        description="生成兑换码、管理状态、查看核销记录。"
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
      ) : null}

      <div className="rounded-3xl border border-slate-100 bg-white p-6">
        <h3 className="text-sm font-bold text-slate-700">批量生成兑换码</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="space-y-1 text-xs text-slate-600">
            <span>数量</span>
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(Number(e.target.value || 1))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-600">
            <span>订阅天数</span>
            <input
              type="number"
              min={1}
              max={3650}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value || 30))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-600">
            <span>可用次数</span>
            <input
              type="number"
              min={1}
              max={10000}
              value={maxUses}
              onChange={(e) => setMaxUses(Number(e.target.value || 1))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-600">
            <span>计划</span>
            <select
              value={generatePlan}
              onChange={(e) => setGeneratePlan(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="subscriber">subscriber</option>
              <option value="vip_monthly">vip_monthly</option>
              <option value="vip_yearly">vip_yearly</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-600">
            <span>前缀（可选）</span>
            <input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="例如 MVP"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-600">
            <span>批次号（可选）</span>
            <input
              value={generateBatchNo}
              onChange={(e) => setGenerateBatchNo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="为空自动生成"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-600 md:col-span-2">
            <span>备注（可选）</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="如：内测用户首批兑换码"
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={createCodes}
            disabled={generating}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {generating ? "生成中..." : "生成兑换码"}
          </button>
          {generated ? (
            <span className="text-xs text-emerald-600">
              已生成 {generated.count} 个，批次：{generated.batch_no}
            </span>
          ) : null}
        </div>
        {generatedText ? (
          <textarea
            readOnly
            value={generatedText}
            className="mt-4 min-h-[160px] w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-slate-700"
          />
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6">
        <div className="flex flex-wrap gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索（掩码/备注/批次）"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            placeholder="批次号"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">全部状态</option>
            <option value="active">active</option>
            <option value="disabled">disabled</option>
            <option value="expired">expired</option>
          </select>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">全部计划</option>
            <option value="subscriber">subscriber</option>
            <option value="vip_monthly">vip_monthly</option>
            <option value="vip_yearly">vip_yearly</option>
          </select>
          <button
            onClick={loadCodes}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
            disabled={loading}
          >
            {loading ? "加载中..." : "筛选"}
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">兑换码</th>
                <th className="px-3 py-2">批次</th>
                <th className="px-3 py-2">计划</th>
                <th className="px-3 py-2">天数</th>
                <th className="px-3 py-2">使用数</th>
                <th className="px-3 py-2">状态</th>
                <th className="px-3 py-2">创建时间</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{item.id}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">
                        {item.code_plain?.trim() || item.code_mask}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(item.code_plain || "", item.id)}
                        className="rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                      >
                        {copiedCodeID === item.id ? "已复制" : "复制"}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">{item.batch_no || "-"}</td>
                  <td className="px-3 py-2">{item.plan}</td>
                  <td className="px-3 py-2">{item.duration_days}</td>
                  <td className="px-3 py-2">
                    {item.used_count}/{item.max_uses}
                  </td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="px-3 py-2">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => loadRecords(item.id)}
                        className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                      >
                        核销记录
                      </button>
                      {item.status === "active" ? (
                        <button
                          onClick={() => updateCodeStatus(item.id, "disabled")}
                          className="rounded border border-rose-200 px-2 py-1 text-rose-600 hover:bg-rose-50"
                        >
                          禁用
                        </button>
                      ) : (
                        <button
                          onClick={() => updateCodeStatus(item.id, "active")}
                          className="rounded border border-emerald-200 px-2 py-1 text-emerald-600 hover:bg-emerald-50"
                        >
                          启用
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-400" colSpan={9}>
                    暂无兑换码
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6">
        <h3 className="text-sm font-bold text-slate-700">核销记录{selectedCodeID ? `（Code #${selectedCodeID}）` : ""}</h3>
        {recordsLoading ? (
          <div className="mt-3 text-sm text-slate-500">加载中...</div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2">记录ID</th>
                  <th className="px-3 py-2">用户昵称</th>
                  <th className="px-3 py-2">手机号</th>
                  <th className="px-3 py-2">计划</th>
                  <th className="px-3 py-2">生效</th>
                  <th className="px-3 py-2">到期</th>
                  <th className="px-3 py-2">兑换时间</th>
                </tr>
              </thead>
              <tbody>
                {records.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{item.id}</td>
                    <td className="px-3 py-2">{item.user_display_name || "-"}</td>
                    <td className="px-3 py-2">{item.user_phone || "-"}</td>
                    <td className="px-3 py-2">{item.granted_plan || "-"}</td>
                    <td className="px-3 py-2">
                      {item.granted_starts_at ? new Date(item.granted_starts_at).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2">
                      {item.granted_expires_at ? new Date(item.granted_expires_at).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
                {records.items.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-400" colSpan={7}>
                      暂无核销记录
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
