"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type CollectionDownloadCodeItem = {
  id: number;
  code_mask: string;
  code_plain?: string;
  batch_no: string;
  collection_id: number;
  collection_title?: string;
  granted_download_times: number;
  max_redeem_users: number;
  used_redeem_users: number;
  status: string;
  starts_at?: string;
  ends_at?: string;
  note?: string;
  created_at: string;
};

type CollectionDownloadCodeListResponse = {
  items: CollectionDownloadCodeItem[];
  total: number;
};

type GenerateCollectionDownloadCodesResponse = {
  batch_no: string;
  collection_id: number;
  collection_title?: string;
  count: number;
  download_times: number;
  max_redeem_users: number;
  codes: string[];
};

type CollectionDownloadRedemptionRecord = {
  id: number;
  user_id: number;
  user_display_name?: string;
  user_phone?: string;
  collection_id: number;
  collection_title?: string;
  granted_download_times: number;
  created_at: string;
  ip?: string;
};

type CollectionDownloadRedemptionListResponse = {
  items: CollectionDownloadRedemptionRecord[];
  total: number;
};

type CollectionDownloadEntitlementItem = {
  id: number;
  user_id: number;
  user_display_name?: string;
  user_phone?: string;
  collection_id: number;
  collection_title?: string;
  granted_download_times: number;
  used_download_times: number;
  remaining_download_times: number;
  status: string;
  expires_at?: string;
  last_consumed_at?: string;
  updated_at?: string;
};

type CollectionDownloadEntitlementListResponse = {
  items: CollectionDownloadEntitlementItem[];
  total: number;
};

function fmtTime(value?: string) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

async function parseAPIError(res: Response) {
  try {
    const payload = await res.json();
    return payload?.error || payload?.message || JSON.stringify(payload);
  } catch {
    try {
      return await res.text();
    } catch {
      return `请求失败(${res.status})`;
    }
  }
}

type StatusMeta = {
  label: string;
  className: string;
};

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";
const SELECT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";
const BTN_PRIMARY_CLASS =
  "rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";
const BTN_SECONDARY_CLASS =
  "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";

function codeStatusMeta(rawStatus?: string): StatusMeta {
  const status = (rawStatus || "").trim().toLowerCase();
  if (status === "active") {
    return { label: "生效中", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }
  if (status === "disabled") {
    return { label: "已禁用", className: "border-amber-200 bg-amber-50 text-amber-700" };
  }
  if (status === "expired") {
    return { label: "已过期", className: "border-slate-200 bg-slate-100 text-slate-600" };
  }
  return { label: rawStatus || "-", className: "border-slate-200 bg-slate-100 text-slate-600" };
}

function entitlementStatusMeta(rawStatus?: string): StatusMeta {
  const status = (rawStatus || "").trim().toLowerCase();
  if (status === "active") {
    return { label: "可用", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }
  if (status === "disabled") {
    return { label: "禁用", className: "border-amber-200 bg-amber-50 text-amber-700" };
  }
  if (status === "exhausted") {
    return { label: "次数用尽", className: "border-orange-200 bg-orange-50 text-orange-700" };
  }
  if (status === "expired") {
    return { label: "已过期", className: "border-slate-200 bg-slate-100 text-slate-600" };
  }
  return { label: rawStatus || "-", className: "border-slate-200 bg-slate-100 text-slate-600" };
}

function StatusBadge({ status, kind }: { status?: string; kind: "code" | "entitlement" }) {
  const meta = kind === "code" ? codeStatusMeta(status) : entitlementStatusMeta(status);
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export default function CollectionDownloadCodesPage() {
  const [activeTab, setActiveTab] = useState<"codes" | "entitlements">("codes");

  const [error, setError] = useState<string | null>(null);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [codesData, setCodesData] = useState<CollectionDownloadCodeListResponse>({ items: [], total: 0 });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [filterCollectionID, setFilterCollectionID] = useState("");

  const [count, setCount] = useState(10);
  const [collectionID, setCollectionID] = useState("");
  const [downloadTimes, setDownloadTimes] = useState(1);
  const [maxRedeemUsers, setMaxRedeemUsers] = useState(1);
  const [prefix, setPrefix] = useState("");
  const [generateBatchNo, setGenerateBatchNo] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GenerateCollectionDownloadCodesResponse | null>(null);
  const [copiedCodeID, setCopiedCodeID] = useState<number | null>(null);

  const [selectedCodeID, setSelectedCodeID] = useState<number | null>(null);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);
  const [redemptions, setRedemptions] = useState<CollectionDownloadRedemptionListResponse>({ items: [], total: 0 });

  const [loadingEntitlements, setLoadingEntitlements] = useState(false);
  const [entitlements, setEntitlements] = useState<CollectionDownloadEntitlementListResponse>({ items: [], total: 0 });
  const [entStatus, setEntStatus] = useState("");
  const [entUserID, setEntUserID] = useState("");
  const [entCollectionID, setEntCollectionID] = useState("");
  const [entQ, setEntQ] = useState("");

  const loadCodes = useCallback(async () => {
    setLoadingCodes(true);
    setError(null);
    try {
      const url = new URL("/api/admin/collection-download-codes", API_BASE);
      if (q.trim()) url.searchParams.set("q", q.trim());
      if (status.trim()) url.searchParams.set("status", status.trim());
      if (batchNo.trim()) url.searchParams.set("batch_no", batchNo.trim());
      if (filterCollectionID.trim()) url.searchParams.set("collection_id", filterCollectionID.trim());
      const res = await fetchWithAuth(url.toString());
      if (!res.ok) throw new Error(await parseAPIError(res));
      setCodesData((await res.json()) as CollectionDownloadCodeListResponse);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载次卡失败");
    } finally {
      setLoadingCodes(false);
    }
  }, [q, status, batchNo, filterCollectionID]);

  const loadRedemptions = useCallback(async (codeID: number) => {
    setRedemptionsLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/collection-download-codes/${codeID}/redemptions`);
      if (!res.ok) throw new Error(await parseAPIError(res));
      setRedemptions((await res.json()) as CollectionDownloadRedemptionListResponse);
      setSelectedCodeID(codeID);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载核销记录失败");
    } finally {
      setRedemptionsLoading(false);
    }
  }, []);

  const loadEntitlements = useCallback(async () => {
    setLoadingEntitlements(true);
    setError(null);
    try {
      const url = new URL("/api/admin/collection-download-entitlements", API_BASE);
      if (entStatus.trim()) url.searchParams.set("status", entStatus.trim());
      if (entUserID.trim()) url.searchParams.set("user_id", entUserID.trim());
      if (entCollectionID.trim()) url.searchParams.set("collection_id", entCollectionID.trim());
      if (entQ.trim()) url.searchParams.set("q", entQ.trim());
      const res = await fetchWithAuth(url.toString());
      if (!res.ok) throw new Error(await parseAPIError(res));
      setEntitlements((await res.json()) as CollectionDownloadEntitlementListResponse);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载权益失败");
    } finally {
      setLoadingEntitlements(false);
    }
  }, [entStatus, entUserID, entCollectionID, entQ]);

  useEffect(() => {
    loadCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "entitlements") {
      loadEntitlements();
    }
  }, [activeTab, loadEntitlements]);

  const createCodes = async () => {
    const cid = Number(collectionID);
    if (!cid || cid <= 0) {
      setError("请填写有效的合集ID");
      return;
    }

    setGenerating(true);
    setError(null);
    setGenerated(null);
    try {
      const body: Record<string, unknown> = {
        count,
        collection_id: cid,
        download_times: downloadTimes,
        max_redeem_users: maxRedeemUsers,
        prefix: prefix.trim(),
        batch_no: generateBatchNo.trim(),
        note: note.trim(),
      };
      if (startsAt.trim()) body.starts_at = new Date(startsAt).toISOString();
      if (endsAt.trim()) body.ends_at = new Date(endsAt).toISOString();
      const res = await fetchWithAuth(`${API_BASE}/api/admin/collection-download-codes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await parseAPIError(res));
      const payload = (await res.json()) as GenerateCollectionDownloadCodesResponse;
      setGenerated(payload);
      setBatchNo(payload.batch_no);
      await loadCodes();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "生成次卡失败");
    } finally {
      setGenerating(false);
    }
  };

  const updateCodeStatus = async (id: number, nextStatus: "active" | "disabled" | "expired") => {
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/collection-download-codes/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(await parseAPIError(res));
      await loadCodes();
      if (selectedCodeID === id) {
        await loadRedemptions(id);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "更新状态失败");
    }
  };

  const adjustEntitlement = async (item: CollectionDownloadEntitlementItem) => {
    const raw = window.prompt("输入要调整的剩余次数增量（可为负数）", "1");
    if (raw == null) return;
    const delta = Number(raw);
    if (!Number.isFinite(delta) || !Number.isInteger(delta)) {
      setError("请输入整数");
      return;
    }
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/collection-download-entitlements/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta_remaining_download_times: delta }),
      });
      if (!res.ok) throw new Error(await parseAPIError(res));
      await loadEntitlements();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "调整失败");
    }
  };

  const setEntitlementStatus = async (item: CollectionDownloadEntitlementItem, nextStatus: "active" | "disabled") => {
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/collection-download-entitlements/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(await parseAPIError(res));
      await loadEntitlements();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "更新状态失败");
    }
  };

  const copyText = async (text: string, codeID: number) => {
    const value = text.trim();
    if (!value) {
      setError("该兑换码无明文，无法复制");
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

  const generatedText = useMemo(() => {
    if (!generated?.codes?.length) return "";
    return generated.codes.join("\n");
  }, [generated]);

  const codeSummary = useMemo(() => {
    let active = 0;
    let disabled = 0;
    let expired = 0;
    for (const item of codesData.items) {
      const statusValue = (item.status || "").trim().toLowerCase();
      if (statusValue === "active") active += 1;
      else if (statusValue === "disabled") disabled += 1;
      else if (statusValue === "expired") expired += 1;
    }
    return { total: codesData.total, active, disabled, expired };
  }, [codesData.items, codesData.total]);

  const entitlementSummary = useMemo(() => {
    let active = 0;
    let disabled = 0;
    let exhausted = 0;
    let expired = 0;
    for (const item of entitlements.items) {
      const statusValue = (item.status || "").trim().toLowerCase();
      if (statusValue === "active") active += 1;
      else if (statusValue === "disabled") disabled += 1;
      else if (statusValue === "exhausted") exhausted += 1;
      else if (statusValue === "expired") expired += 1;
    }
    return { total: entitlements.total, active, disabled, exhausted, expired };
  }, [entitlements.items, entitlements.total]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="合集次卡"
        description="管理合集下载次卡（兑换码）、查看核销记录与用户剩余次数。"
        actions={
          <button
            type="button"
            className={BTN_SECONDARY_CLASS}
            onClick={() => {
              if (activeTab === "codes") {
                void loadCodes();
              } else {
                void loadEntitlements();
              }
            }}
          >
            刷新数据
          </button>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex gap-2">
          <button
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === "codes"
                ? "bg-slate-900 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            onClick={() => setActiveTab("codes")}
          >
            次卡管理
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === "entitlements"
                ? "bg-slate-900 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            onClick={() => setActiveTab("entitlements")}
          >
            权益管理
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">次卡总量</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{codeSummary.total}</div>
          <div className="mt-2 text-xs text-slate-500">生效 {codeSummary.active} · 禁用 {codeSummary.disabled} · 过期 {codeSummary.expired}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">权益总量</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{entitlementSummary.total}</div>
          <div className="mt-2 text-xs text-slate-500">可用 {entitlementSummary.active} · 禁用 {entitlementSummary.disabled}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">权益告警</div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {entitlementSummary.exhausted + entitlementSummary.expired}
          </div>
          <div className="mt-2 text-xs text-slate-500">次数用尽 {entitlementSummary.exhausted} · 已过期 {entitlementSummary.expired}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">当前视图</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{activeTab === "codes" ? "次卡" : "权益"}</div>
          <div className="mt-2 text-xs text-slate-500">仅做界面优化，业务逻辑未改动</div>
        </div>
      </div>

      {activeTab === "codes" ? (
        <>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-black tracking-tight text-slate-900">批量生成合集次卡</h3>
            <p className="mt-1 text-xs text-slate-500">生成后将返回明文兑换码（仅本区域显示一次），列表页默认只展示掩码。</p>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <label className="space-y-1 text-xs text-slate-600">
                <span>生成数量</span>
                <input type="number" min={1} max={500} value={count} onChange={(e) => setCount(Number(e.target.value || 1))} className={INPUT_CLASS} />
              </label>
              <label className="space-y-1 text-xs text-slate-600">
                <span>合集ID</span>
                <input value={collectionID} onChange={(e) => setCollectionID(e.target.value)} className={INPUT_CLASS} />
              </label>
              <label className="space-y-1 text-xs text-slate-600">
                <span>每次兑换赠送下载次数</span>
                <input type="number" min={1} max={10000} value={downloadTimes} onChange={(e) => setDownloadTimes(Number(e.target.value || 1))} className={INPUT_CLASS} />
              </label>
              <label className="space-y-1 text-xs text-slate-600">
                <span>最多可兑换用户数</span>
                <input type="number" min={1} max={10000} value={maxRedeemUsers} onChange={(e) => setMaxRedeemUsers(Number(e.target.value || 1))} className={INPUT_CLASS} />
              </label>
              <label className="space-y-1 text-xs text-slate-600">
                <span>前缀（可选）</span>
                <input value={prefix} onChange={(e) => setPrefix(e.target.value)} className={INPUT_CLASS} />
              </label>
              <label className="space-y-1 text-xs text-slate-600">
                <span>批次号（可选）</span>
                <input value={generateBatchNo} onChange={(e) => setGenerateBatchNo(e.target.value)} className={INPUT_CLASS} />
              </label>
              <label className="space-y-1 text-xs text-slate-600">
                <span>生效时间（可选）</span>
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={INPUT_CLASS} />
              </label>
              <label className="space-y-1 text-xs text-slate-600">
                <span>失效时间（可选）</span>
                <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={INPUT_CLASS} />
              </label>
              <label className="space-y-1 text-xs text-slate-600 md:col-span-4">
                <span>备注（可选）</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} className={INPUT_CLASS} />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button onClick={createCodes} disabled={generating} className={BTN_PRIMARY_CLASS}>
                {generating ? "生成中..." : "生成次卡"}
              </button>
            </div>

            {generated ? (
              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="text-sm font-semibold text-emerald-700">
                  已生成：批次 {generated.batch_no}，合集 #{generated.collection_id}，数量 {generated.count}
                </div>
                <div className="mt-1 text-xs text-emerald-700/80">
                  明文兑换码仅在本区域展示，请及时保存；列表页默认仅展示掩码。
                </div>
                <textarea readOnly value={generatedText} className="mt-3 h-40 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 outline-none" />
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-3 md:grid-cols-5">
              <input placeholder="搜索（code/batch/note）" value={q} onChange={(e) => setQ(e.target.value)} className={INPUT_CLASS} />
              <input placeholder="批次号" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} className={INPUT_CLASS} />
              <input placeholder="合集ID" value={filterCollectionID} onChange={(e) => setFilterCollectionID(e.target.value)} className={INPUT_CLASS} />
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT_CLASS}>
                <option value="">全部状态</option>
                <option value="active">生效中</option>
                <option value="disabled">已禁用</option>
                <option value="expired">已过期</option>
              </select>
              <button onClick={loadCodes} className={BTN_PRIMARY_CLASS}>
                {loadingCodes ? "加载中..." : "查询"}
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">兑换码</th>
                    <th className="px-4 py-3">合集</th>
                    <th className="px-4 py-3">次数</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">有效期</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {codesData.items.map((item, idx) => (
                    <tr key={item.id} className={`align-top ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                      <td className="px-4 py-3 font-semibold">{item.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-mono">{item.code_mask}</div>
                        <div className="mt-1 text-slate-400">批次：{item.batch_no || "-"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>#{item.collection_id}</div>
                        <div className="text-slate-500">{item.collection_title || "-"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>赠送：{item.granted_download_times}</div>
                        <div className="text-slate-500">
                          兑换用户：{item.used_redeem_users}/{item.max_redeem_users}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} kind="code" />
                      </td>
                      <td className="px-4 py-3">
                        <div>起：{fmtTime(item.starts_at)}</div>
                        <div>止：{fmtTime(item.ends_at)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button className={BTN_SECONDARY_CLASS} onClick={() => loadRedemptions(item.id)}>
                            核销记录
                          </button>
                          <button
                            className={BTN_SECONDARY_CLASS}
                            onClick={() => copyText(item.code_plain || "", item.id)}
                          >
                            {copiedCodeID === item.id ? "已复制" : "复制明文"}
                          </button>
                          {item.status === "active" ? (
                            <button className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-50" onClick={() => updateCodeStatus(item.id, "disabled")}>
                              禁用
                            </button>
                          ) : (
                            <button className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50" onClick={() => updateCodeStatus(item.id, "active")}>
                              启用
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {codesData.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">
                        暂无数据
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-black tracking-tight text-slate-900">核销记录 {selectedCodeID ? `(Code #${selectedCodeID})` : ""}</h3>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">用户</th>
                    <th className="px-4 py-3">合集</th>
                    <th className="px-4 py-3">到账次数</th>
                    <th className="px-4 py-3">时间</th>
                    <th className="px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.items.map((row, idx) => (
                    <tr key={row.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                      <td className="px-4 py-3 font-semibold">{row.id}</td>
                      <td className="px-4 py-3">
                        <div>#{row.user_id} {row.user_display_name || ""}</div>
                        <div className="text-slate-500">{row.user_phone || "-"}</div>
                      </td>
                      <td className="px-4 py-3">#{row.collection_id} {row.collection_title || ""}</td>
                      <td className="px-4 py-3">{row.granted_download_times}</td>
                      <td className="px-4 py-3">{fmtTime(row.created_at)}</td>
                      <td className="px-4 py-3">{row.ip || "-"}</td>
                    </tr>
                  ))}
                  {redemptions.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">
                        {redemptionsLoading ? "加载中..." : "暂无核销记录"}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-3 md:grid-cols-5">
            <input placeholder="用户ID" value={entUserID} onChange={(e) => setEntUserID(e.target.value)} className={INPUT_CLASS} />
            <input placeholder="合集ID" value={entCollectionID} onChange={(e) => setEntCollectionID(e.target.value)} className={INPUT_CLASS} />
            <input placeholder="搜索（用户名/手机号/合集）" value={entQ} onChange={(e) => setEntQ(e.target.value)} className={INPUT_CLASS} />
            <select value={entStatus} onChange={(e) => setEntStatus(e.target.value)} className={SELECT_CLASS}>
              <option value="">全部状态</option>
              <option value="active">可用</option>
              <option value="disabled">禁用</option>
              <option value="exhausted">次数用尽</option>
              <option value="expired">已过期</option>
            </select>
            <button onClick={loadEntitlements} className={BTN_PRIMARY_CLASS}>
              {loadingEntitlements ? "加载中..." : "查询"}
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">用户</th>
                  <th className="px-4 py-3">合集</th>
                  <th className="px-4 py-3">总/已用/剩余</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">过期时间</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {entitlements.items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                    <td className="px-4 py-3 font-semibold">{item.id}</td>
                    <td className="px-4 py-3">
                      <div>#{item.user_id} {item.user_display_name || ""}</div>
                      <div className="text-slate-500">{item.user_phone || "-"}</div>
                    </td>
                    <td className="px-4 py-3">#{item.collection_id} {item.collection_title || ""}</td>
                    <td className="px-4 py-3">
                      {item.granted_download_times} / {item.used_download_times} / {item.remaining_download_times}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} kind="entitlement" />
                    </td>
                    <td className="px-4 py-3">
                      <div>{fmtTime(item.expires_at)}</div>
                      <div className="text-slate-500">最近消费：{fmtTime(item.last_consumed_at)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button className={BTN_SECONDARY_CLASS} onClick={() => adjustEntitlement(item)}>
                          调整次数
                        </button>
                        {item.status === "disabled" ? (
                          <button className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50" onClick={() => setEntitlementStatus(item, "active")}>
                            启用
                          </button>
                        ) : (
                          <button className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-50" onClick={() => setEntitlementStatus(item, "disabled")}>
                            禁用
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {entitlements.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">
                      暂无数据
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
