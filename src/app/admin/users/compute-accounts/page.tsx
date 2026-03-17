"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type AdminComputeAccountUser = {
  id: number;
  display_name?: string;
  phone?: string;
  role?: string;
  status?: string;
  subscription_plan?: string;
  subscription_status?: string;
};

type ComputeAccountResponse = {
  user_id: number;
  available_points: number;
  frozen_points: number;
  debt_points: number;
  total_consumed_points: number;
  total_recharged_points: number;
  status?: string;
  point_per_cny?: number;
};

type AdminComputeAccountItem = {
  user: AdminComputeAccountUser;
  account: ComputeAccountResponse;
  held_jobs: number;
  last_ledger_at?: string;
};

type AdminComputeAccountListSummary = {
  available_points?: number;
  frozen_points?: number;
  debt_points?: number;
};

type AdminComputeAccountListResponse = {
  items?: AdminComputeAccountItem[];
  total?: number;
  page?: number;
  page_size?: number;
  summary?: AdminComputeAccountListSummary;
};

type ComputeLedgerItem = {
  id: number;
  job_id?: number;
  type?: string;
  points?: number;
  available_before?: number;
  available_after?: number;
  frozen_before?: number;
  frozen_after?: number;
  debt_before?: number;
  debt_after?: number;
  remark?: string;
  created_at?: string;
};

type AdminComputePointHoldItem = {
  id: number;
  job_id: number;
  reserved_points: number;
  settled_points: number;
  status?: string;
  remark?: string;
  created_at?: string;
  updated_at?: string;
  settled_at?: string;
};

type AdminComputeAccountDetailResponse = {
  user: AdminComputeAccountUser;
  account: ComputeAccountResponse;
  held_jobs?: number;
  holds?: AdminComputePointHoldItem[];
  ledgers?: ComputeLedgerItem[];
  point_per_cny?: number;
};

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "active", label: "active" },
  { value: "disabled", label: "disabled" },
];

const DEBT_OPTIONS = [
  { value: "all", label: "欠费：全部" },
  { value: "with_debt", label: "仅看欠费" },
  { value: "without_debt", label: "仅看无欠费" },
];

const LEDGER_TYPE_LABELS: Record<string, string> = {
  recharge: "充值",
  adjust: "调账",
  reserve: "预扣",
  settle_done: "结算(完成)",
  settle_failed: "结算(失败)",
  settle_cancelled: "结算(取消)",
  reserve_release: "释放预扣",
};

function fmtNum(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  return value.toLocaleString("zh-CN");
}

function fmtTime(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("zh-CN");
}

function roleLabel(role?: string) {
  const r = (role || "").toLowerCase();
  if (r === "super_admin") return "超级管理员";
  if (r === "admin") return "管理员";
  return "用户";
}

function accountStatusLabel(status?: string) {
  const value = (status || "").toLowerCase();
  if (value === "active") return "正常";
  if (value === "disabled") return "已禁用";
  return status || "-";
}

function holdStatusLabel(status?: string) {
  const value = (status || "").toLowerCase();
  if (value === "held") return "冻结中";
  if (value === "settled") return "已结算";
  if (value === "released") return "已释放";
  return status || "-";
}

function holdStatusClass(status?: string) {
  const value = (status || "").toLowerCase();
  if (value === "held") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "settled") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "released") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function ledgerTypeLabel(value?: string) {
  const key = (value || "").toLowerCase();
  return LEDGER_TYPE_LABELS[key] || value || "-";
}

function parseIntegerInput(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  if (!/^-?\d+$/.test(value)) return Number.NaN;
  return Number(value);
}

async function extractErrorMessage(res: Response, fallback: string) {
  const text = (await res.text()) || fallback;
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const direct = typeof parsed.message === "string" ? parsed.message : "";
    const reason = typeof parsed.error === "string" ? parsed.error : "";
    if (direct.trim()) return direct.trim();
    if (reason.trim()) return reason.trim();
  } catch {
    // ignore parse failures
  }
  return text;
}

export default function AdminComputeAccountsPage() {
  const [items, setItems] = useState<AdminComputeAccountItem[]>([]);
  const [summary, setSummary] = useState<AdminComputeAccountListSummary>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [status, setStatus] = useState("all");
  const [debtFilter, setDebtFilter] = useState("all");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [minAvailableInput, setMinAvailableInput] = useState("");
  const [maxAvailableInput, setMaxAvailableInput] = useState("");
  const [minFrozenInput, setMinFrozenInput] = useState("");
  const [minDebtInput, setMinDebtInput] = useState("");
  const [minAvailable, setMinAvailable] = useState("");
  const [maxAvailable, setMaxAvailable] = useState("");
  const [minFrozen, setMinFrozen] = useState("");
  const [minDebt, setMinDebt] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedUserID, setSelectedUserID] = useState<number>(0);
  const [detail, setDetail] = useState<AdminComputeAccountDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailRequestSeq = useRef(0);

  const [deltaInput, setDeltaInput] = useState("0");
  const [reasonInput, setReasonInput] = useState("运营手动调整");
  const [adjusting, setAdjusting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);

  const totalPages = useMemo(() => {
    if (total <= 0) return 1;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [pageSize, total]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (status !== "all") params.set("status", status);
      if (debtFilter === "with_debt") params.set("with_debt", "true");
      if (debtFilter === "without_debt") params.set("with_debt", "false");
      if (q.trim()) params.set("q", q.trim());
      if (minAvailable.trim()) params.set("min_available", minAvailable.trim());
      if (maxAvailable.trim()) params.set("max_available", maxAvailable.trim());
      if (minFrozen.trim()) params.set("min_frozen", minFrozen.trim());
      if (minDebt.trim()) params.set("min_debt", minDebt.trim());

      const res = await fetchWithAuth(`${API_BASE}/api/admin/compute/accounts?${params.toString()}`);
      if (!res.ok) throw new Error(await extractErrorMessage(res, "加载算力账户失败"));
      const data = (await res.json()) as AdminComputeAccountListResponse;
      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list);
      setSummary(data.summary || {});
      setTotal(typeof data.total === "number" ? data.total : 0);
      setSelectedUserID((prev) => {
        if (prev > 0 && list.some((item) => item.user?.id === prev)) return prev;
        return list[0]?.user?.id || 0;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载算力账户失败";
      setError(message);
      setItems([]);
      setTotal(0);
      setSummary({});
    } finally {
      setLoading(false);
    }
  }, [debtFilter, maxAvailable, minAvailable, minDebt, minFrozen, page, pageSize, q, status]);

  const loadDetail = useCallback(async (userID: number) => {
    if (!userID) {
      setDetail(null);
      return;
    }
    const reqSeq = detailRequestSeq.current + 1;
    detailRequestSeq.current = reqSeq;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/compute/accounts/${userID}?limit=120`);
      if (!res.ok) throw new Error(await extractErrorMessage(res, "加载算力账户详情失败"));
      const data = (await res.json()) as AdminComputeAccountDetailResponse;
      if (detailRequestSeq.current !== reqSeq) return;
      setDetail(data);
    } catch (err: unknown) {
      if (detailRequestSeq.current !== reqSeq) return;
      const message = err instanceof Error ? err.message : "加载算力账户详情失败";
      setDetailError(message);
      setDetail(null);
    } finally {
      if (detailRequestSeq.current !== reqSeq) return;
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadDetail(selectedUserID);
  }, [loadDetail, selectedUserID]);

  const applySearch = () => {
    const min = parseIntegerInput(minAvailableInput);
    if (Number.isNaN(min)) {
      setError("最小可用点数必须是整数");
      return;
    }
    const max = parseIntegerInput(maxAvailableInput);
    if (Number.isNaN(max)) {
      setError("最大可用点数必须是整数");
      return;
    }
    if (min !== null && max !== null && min > max) {
      setError("最小可用点数不能大于最大可用点数");
      return;
    }
    const frozen = parseIntegerInput(minFrozenInput);
    if (Number.isNaN(frozen)) {
      setError("最小冻结点数必须是整数");
      return;
    }
    const debt = parseIntegerInput(minDebtInput);
    if (Number.isNaN(debt)) {
      setError("最小欠费点数必须是整数");
      return;
    }
    setError(null);
    setPage(1);
    setQ(qInput.trim());
    setMinAvailable(minAvailableInput.trim());
    setMaxAvailable(maxAvailableInput.trim());
    setMinFrozen(minFrozenInput.trim());
    setMinDebt(minDebtInput.trim());
  };

  const applyStatus = (value: string) => {
    setPage(1);
    setStatus(value);
  };

  const submitAdjust = async () => {
    if (!selectedUserID || !detail) return;
    const detailUserID = Number(detail.user?.id || detail.account?.user_id || 0);
    if (detailUserID > 0 && detailUserID !== selectedUserID) {
      setActionError(true);
      setActionMessage("账户详情已切换，请等待最新数据加载后再调整");
      return;
    }
    const delta = Number(deltaInput);
    if (!Number.isFinite(delta) || delta === 0) {
      setActionError(true);
      setActionMessage("请输入有效的调整点数（不能为 0）");
      return;
    }
    const reason = reasonInput.trim();
    if (!reason) {
      setActionError(true);
      setActionMessage("请填写调整原因");
      return;
    }

    setAdjusting(true);
    setActionMessage(null);
    setActionError(false);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/compute/accounts/${selectedUserID}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta_points: Math.trunc(delta), reason }),
      });
      if (!res.ok) throw new Error(await extractErrorMessage(res, "调整失败"));
      setActionError(false);
      setActionMessage("调整成功，已刷新账户数据");
      await Promise.all([loadList(), loadDetail(selectedUserID)]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "调整失败";
      setActionError(true);
      setActionMessage(message);
    } finally {
      setAdjusting(false);
    }
  };

  const currentPointPerCNY = detail?.point_per_cny || detail?.account?.point_per_cny || 100;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="算力账户"
        description="查看用户算力余额、冻结占用和流水，并支持运营手动调账。"
        actions={
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
            onClick={() => {
              void loadList();
              void loadDetail(selectedUserID);
            }}
            disabled={loading}
          >
            {loading ? "加载中..." : "刷新"}
          </button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="text-xs font-semibold text-emerald-700">总可用点数</div>
          <div className="mt-2 text-2xl font-black text-emerald-800">{fmtNum(summary.available_points)}</div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <div className="text-xs font-semibold text-amber-700">总冻结点数</div>
          <div className="mt-2 text-2xl font-black text-amber-800">{fmtNum(summary.frozen_points)}</div>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
          <div className="text-xs font-semibold text-rose-700">总欠费点数</div>
          <div className="mt-2 text-2xl font-black text-rose-800">{fmtNum(summary.debt_points)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-500">账户总数</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{fmtNum(total)}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5 xl:grid-cols-10">
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch();
            }}
            placeholder="搜索 UID / 手机号 / 昵称"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <select
            value={status}
            onChange={(e) => applyStatus(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            {STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select
            value={debtFilter}
            onChange={(e) => {
              setPage(1);
              setDebtFilter(e.target.value);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            {DEBT_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <input
            value={minAvailableInput}
            onChange={(e) => setMinAvailableInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch();
            }}
            placeholder="最小可用点数"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <input
            value={maxAvailableInput}
            onChange={(e) => setMaxAvailableInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch();
            }}
            placeholder="最大可用点数"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <input
            value={minFrozenInput}
            onChange={(e) => setMinFrozenInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch();
            }}
            placeholder="最小冻结点数"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <input
            value={minDebtInput}
            onChange={(e) => setMinDebtInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch();
            }}
            placeholder="最小欠费点数"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <select
            value={String(pageSize)}
            onChange={(e) => {
              setPage(1);
              setPageSize(Number(e.target.value) || 20);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="20">每页 20 条</option>
            <option value="50">每页 50 条</option>
            <option value="100">每页 100 条</option>
          </select>
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={applySearch}
          >
            查询
          </button>
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            onClick={() => {
              setQInput("");
              setQ("");
              setStatus("all");
              setDebtFilter("all");
              setMinAvailableInput("");
              setMaxAvailableInput("");
              setMinFrozenInput("");
              setMinDebtInput("");
              setMinAvailable("");
              setMaxAvailable("");
              setMinFrozen("");
              setMinDebt("");
              setError(null);
              setPage(1);
            }}
          >
            重置
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-700">账户列表</div>
          {error ? (
            <div className="px-4 py-3 text-sm text-rose-600">{error}</div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">用户</th>
                  <th className="px-4 py-3 text-left">余额</th>
                  <th className="px-4 py-3 text-left">累计</th>
                  <th className="px-4 py-3 text-left">状态</th>
                  <th className="px-4 py-3 text-left">占用</th>
                  <th className="px-4 py-3 text-left">最近流水</th>
                  <th className="px-4 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const selected = selectedUserID === item.user.id;
                  return (
                    <tr key={item.user.id} className={selected ? "bg-emerald-50/40" : ""}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">#{item.user.id} {item.user.display_name || "未命名"}</div>
                        <div className="text-xs text-slate-500">{item.user.phone || "-"} · {roleLabel(item.user.role)}</div>
                        <div className="text-xs text-slate-400">计划：{item.user.subscription_plan || "-"} / {item.user.subscription_status || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="text-emerald-700">可用 {fmtNum(item.account.available_points)}</div>
                        <div className="text-amber-700">冻结 {fmtNum(item.account.frozen_points)}</div>
                        <div className="text-rose-700">欠费 {fmtNum(item.account.debt_points)}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>消耗 {fmtNum(item.account.total_consumed_points)}</div>
                        <div>充值 {fmtNum(item.account.total_recharged_points)}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`inline-flex rounded-full px-2 py-1 font-semibold ${
                          (item.account.status || "").toLowerCase() === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}>
                          {accountStatusLabel(item.account.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{fmtNum(item.held_jobs || 0)} 个任务</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{fmtTime(item.last_ledger_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                          onClick={() => setSelectedUserID(item.user.id)}
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!items.length && !loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-400" colSpan={7}>暂无账户数据</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>总计 {fmtNum(total)} 条</span>
            <div className="flex items-center gap-2">
              <button
                className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >上一页</button>
              <span>第 {page} / {totalPages} 页</span>
              <button
                className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >下一页</button>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-sm font-bold text-slate-700">账户详情</div>
            {detailLoading ? (
              <div className="py-8 text-sm text-slate-400">加载中...</div>
            ) : detailError ? (
              <div className="py-4 text-sm text-rose-600">{detailError}</div>
            ) : !detail ? (
              <div className="py-8 text-sm text-slate-400">请选择左侧账户</div>
            ) : (
              <div className="mt-3 space-y-3 text-xs">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="font-semibold text-slate-700">#{detail.user.id} {detail.user.display_name || "未命名"}</div>
                  <div className="mt-1 text-slate-500">{detail.user.phone || "-"} · {roleLabel(detail.user.role)}</div>
                  <div className="mt-1 text-slate-500">1 元 = {fmtNum(currentPointPerCNY)} 点</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-emerald-700">可用<br />{fmtNum(detail.account.available_points)}</div>
                  <div className="rounded-lg border border-amber-100 bg-amber-50 p-2 text-amber-700">冻结<br />{fmtNum(detail.account.frozen_points)}</div>
                  <div className="rounded-lg border border-rose-100 bg-rose-50 p-2 text-rose-700">欠费<br />{fmtNum(detail.account.debt_points)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-2 font-semibold text-slate-700">手动调账</div>
                  <div className="space-y-2">
                    <input
                      value={deltaInput}
                      onChange={(e) => setDeltaInput(e.target.value)}
                      placeholder="调整点数（正数加点，负数扣点）"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                    />
                    <input
                      value={reasonInput}
                      onChange={(e) => setReasonInput(e.target.value)}
                      placeholder="调整原因"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                    />
                    <button
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      onClick={() => void submitAdjust()}
                      disabled={adjusting}
                    >
                      {adjusting ? "处理中..." : "提交调整"}
                    </button>
                    {actionMessage ? (
                      <div className={`text-xs ${actionError ? "text-rose-600" : "text-emerald-600"}`}>{actionMessage}</div>
                    ) : null}
                  </div>
                </div>
                <div className="text-slate-500">当前占用任务：{fmtNum(detail.held_jobs || 0)}</div>
              </div>
            )}
          </div>

          {detail ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-sm font-bold text-slate-700">预扣记录（最近 50 条）</div>
              <div className="mt-3 max-h-64 overflow-auto space-y-2 text-xs">
                {(detail.holds || []).map((hold) => (
                  <div key={hold.id} className="rounded-xl border border-slate-100 bg-slate-50 p-2">
                    <div className="font-semibold text-slate-700">#{hold.id} · job #{hold.job_id}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 ${holdStatusClass(hold.status)}`}>
                        {holdStatusLabel(hold.status)}
                      </span>
                      <span className="text-slate-500">预扣 {fmtNum(hold.reserved_points)}</span>
                      <span className="text-slate-500">结算 {fmtNum(hold.settled_points)}</span>
                    </div>
                    <div className="text-slate-400">创建 {fmtTime(hold.created_at)}{hold.settled_at ? ` · 结算 ${fmtTime(hold.settled_at)}` : ""}</div>
                  </div>
                ))}
                {!(detail.holds || []).length ? (
                  <div className="py-3 text-slate-400">暂无预扣记录</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {detail ? (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-700">流水明细（最近 {detail.ledgers?.length || 0} 条）</div>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">时间</th>
                  <th className="px-3 py-2 text-left">类型</th>
                  <th className="px-3 py-2 text-left">点数</th>
                  <th className="px-3 py-2 text-left">可用变化</th>
                  <th className="px-3 py-2 text-left">冻结变化</th>
                  <th className="px-3 py-2 text-left">欠费变化</th>
                  <th className="px-3 py-2 text-left">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(detail.ledgers || []).map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 text-slate-500">{fmtTime(row.created_at)}</td>
                    <td className="px-3 py-2 text-slate-700">{ledgerTypeLabel(row.type)}{row.job_id ? ` (job#${row.job_id})` : ""}</td>
                    <td className={`px-3 py-2 font-semibold ${(row.points || 0) < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      {(row.points || 0) > 0 ? "+" : ""}{fmtNum(row.points)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{fmtNum(row.available_before)} → {fmtNum(row.available_after)}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtNum(row.frozen_before)} → {fmtNum(row.frozen_after)}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtNum(row.debt_before)} → {fmtNum(row.debt_after)}</td>
                    <td className="px-3 py-2 text-slate-500">{row.remark || "-"}</td>
                  </tr>
                ))}
                {!(detail.ledgers || []).length ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-400" colSpan={7}>暂无流水数据</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
