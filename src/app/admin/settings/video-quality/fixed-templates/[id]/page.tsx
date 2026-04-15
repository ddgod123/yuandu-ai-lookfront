"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import PromptSourceBadge from "@/app/admin/_components/PromptSourceBadge";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type AdminVideoAIPromptTemplateItem = {
  id: number;
  format?: string;
  stage?: string;
  layer?: string;
  template_text?: string;
  template_json_schema?: Record<string, unknown>;
  enabled?: boolean;
  version?: string;
  is_active?: boolean;
  resolved_from?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
};

type AdminVideoAIPromptFixedTemplateDetailResponse = {
  item?: AdminVideoAIPromptTemplateItem;
};

type AdminVideoAIPromptTemplateVersionItem = {
  id: number;
  format?: string;
  stage?: string;
  layer?: string;
  version?: string;
  enabled?: boolean;
  is_active?: boolean;
  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;
};

type AdminVideoAIPromptTemplateVersionsResponse = {
  format?: string;
  stage?: string;
  layer?: string;
  resolved_from?: string;
  items?: AdminVideoAIPromptTemplateVersionItem[];
};

async function parseApiError(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    return parsed.message || parsed.error || fallback;
  } catch {
    return text;
  }
}

function formatTime(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("zh-CN");
}

const STAGE_LABEL: Record<string, string> = {
  ai1: "AI1",
  ai2: "AI2",
  scoring: "评分系统",
  ai3: "AI3",
  default: "DEFAULT",
};

const ALL_FORMATS = ["all", "gif", "webp", "jpg", "png", "live"];
const ALL_STAGES = ["ai1", "ai2", "scoring", "ai3", "default"];

export default function Page() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const templateID = useMemo(() => {
    const raw = typeof params?.id === "string" ? params.id : "";
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parsed;
  }, [params]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<AdminVideoAIPromptTemplateItem | null>(null);
  const [compatTip, setCompatTip] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!templateID) {
      setError("无效的模板ID。");
      setItem(null);
      setCompatTip(null);
      return;
    }
    setLoading(true);
    setError(null);
    setCompatTip(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/video-jobs/ai-prompt-templates/fixed/${templateID}`);
      if (res.ok) {
        const data = (await res.json()) as AdminVideoAIPromptFixedTemplateDetailResponse;
        if (!data.item) throw new Error("模板不存在");
        setItem(data.item);
        setCompatTip(null);
      } else if (res.status === 404) {
        let matched: { item: AdminVideoAIPromptTemplateVersionItem; resolvedFrom: string } | null = null;
        for (const stage of ALL_STAGES) {
          if (matched) break;
          for (const format of ALL_FORMATS) {
            const params = new URLSearchParams();
            params.set("format", format);
            params.set("stage", stage);
            params.set("layer", "fixed");
            const legacyRes = await fetchWithAuth(
              `${API_BASE}/api/admin/video-jobs/ai-prompt-templates/versions?${params.toString()}`
            );
            if (!legacyRes.ok) continue;
            const legacyData = (await legacyRes.json()) as AdminVideoAIPromptTemplateVersionsResponse;
            const items = Array.isArray(legacyData.items) ? legacyData.items : [];
            const hit = items.find((entry) => entry.id === templateID);
            if (hit) {
              matched = {
                item: hit,
                resolvedFrom: String(legacyData.resolved_from || "").trim().toLowerCase(),
              };
              break;
            }
          }
        }
        if (!matched) {
          throw new Error("模板不存在");
        }
        setItem({
          id: matched.item.id,
          format: (matched.item.format || "").toLowerCase(),
          stage: (matched.item.stage || "").toLowerCase(),
          layer: "fixed",
          template_text: "（兼容模式：后端未上线 fixed 详情接口，当前仅展示版本基础信息。）",
          template_json_schema: {},
          enabled: !!matched.item.enabled,
          version: (matched.item.version || "").trim(),
          is_active: !!matched.item.is_active,
          resolved_from: matched.resolvedFrom,
          created_at: matched.item.created_at || "",
          updated_at: matched.item.updated_at || "",
          created_by: matched.item.created_by || 0,
          updated_by: matched.item.updated_by || 0,
          metadata: { source: "legacy_versions_api", legacy_no_detail: true, resolved_from: matched.resolvedFrom },
        });
        setCompatTip("当前后端仍为旧版本：已降级展示基础信息（无正文/Schema/Metadata 详情）。");
      } else {
        throw new Error(await parseApiError(res, "加载模板详情失败"));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载模板详情失败";
      setError(message);
      setItem(null);
      setCompatTip(null);
    } finally {
      setLoading(false);
    }
  }, [templateID]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const stage = (item?.stage || "").toLowerCase();

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`固定模板详情 #${templateID || "-"}`}
        description="查看固定层模板版本的完整信息（正文、Schema、Metadata、状态与时间戳）。"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              返回上一页
            </button>
            <Link
              href="/admin/settings/video-quality/fixed-templates"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              固定模板列表
            </Link>
            <button
              type="button"
              onClick={() => void loadDetail()}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              刷新
            </button>
          </div>
        }
      />

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {compatTip ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{compatTip}</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">加载中...</div>
      ) : null}

      {!loading && item ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">阶段</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{STAGE_LABEL[stage] || (item.stage || "-").toUpperCase()}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">作用域</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{(item.format || "-").toUpperCase()}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">版本</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{item.version || `v-${item.id}`}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-3">
              <div className="text-xs text-slate-500">来源链路</div>
              <div className="mt-1">
                <PromptSourceBadge
                  value={item.resolved_from || String((item.metadata?.resolved_from as string) || "")}
                  expectedFormat={item.format}
                  expectedStage={item.stage}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">状态</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{item.is_active ? "当前生效" : "历史版本"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Enabled</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{item.enabled ? "true" : "false"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Layer</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{(item.layer || "-").toUpperCase()}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">创建时间</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{formatTime(item.created_at)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">更新时间</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{formatTime(item.updated_at)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">管理员</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                created_by={item.created_by ?? "-"} · updated_by={item.updated_by ?? "-"}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-xs font-semibold text-slate-700">模板正文</div>
            <pre className="max-h-[56vh] overflow-auto rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-[11px] leading-6 text-slate-100">
{item.template_text || "（空）"}
            </pre>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-xs font-semibold text-slate-700">template_json_schema</div>
              <pre className="max-h-[40vh] overflow-auto rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-[11px] leading-6 text-slate-100">
{JSON.stringify(item.template_json_schema || {}, null, 2)}
              </pre>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-xs font-semibold text-slate-700">metadata</div>
              <pre className="max-h-[40vh] overflow-auto rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-[11px] leading-6 text-slate-100">
{JSON.stringify(item.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
