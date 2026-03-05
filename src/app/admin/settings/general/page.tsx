"use client";

import { useEffect, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type FooterSetting = {
  site_name: string;
  site_description: string;
  contact_email: string;
  complaint_email: string;
  icp_number: string;
  icp_link: string;
  public_security_number: string;
  public_security_link: string;
  copyright_text: string;
  updated_at?: string;
};

const DEFAULT_FORM: FooterSetting = {
  site_name: "表情包档案馆",
  site_description:
    "致力于收集、整理和分享互联网表情包资源。本站提供合集浏览、下载与收藏功能，服务于个人非商业交流场景。",
  contact_email: "contact@emoji-archive.com",
  complaint_email: "contact@emoji-archive.com",
  icp_number: "ICP备案号：待补充",
  icp_link: "",
  public_security_number: "公安备案号：待补充",
  public_security_link: "",
  copyright_text: "表情包档案馆. All rights reserved.",
};

function normalizeForm(input: Partial<FooterSetting> | null | undefined): FooterSetting {
  return {
    ...DEFAULT_FORM,
    ...(input || {}),
  };
}

export default function Page() {
  const [form, setForm] = useState<FooterSetting>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");

  const loadSetting = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/site-settings/footer`);
      if (!res.ok) {
        const raw = await res.text();
        throw new Error(raw || "加载失败");
      }
      const data = (await res.json()) as FooterSetting;
      const normalized = normalizeForm(data);
      setForm(normalized);
      setLastUpdatedAt(data.updated_at || "");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSetting();
  }, []);

  const handleChange = (field: keyof FooterSetting, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveSetting = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/site-settings/footer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        let message = "保存失败";
        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error) message = data.error;
        } catch {
          const raw = await res.text();
          if (raw) message = raw;
        }
        throw new Error(message);
      }
      const data = (await res.json()) as FooterSetting;
      setForm(normalizeForm(data));
      setLastUpdatedAt(data.updated_at || "");
      setSuccess("已保存，可在官网底部实时查看最新配置。");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "保存失败";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="基础设置"
        description="官网底部信息配置。运营人员可在此修改联系方式、备案信息和版权文案。"
        actions={
          <button
            onClick={saveSetting}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 shadow-sm disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {saving ? "保存中..." : "保存配置"}
          </button>
        }
      />

      <div className="rounded-3xl border border-slate-100 bg-white p-6">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">正在加载配置...</div>
        ) : (
          <div className="space-y-6">
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-600">
                {success}
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <div className="text-xs font-semibold text-slate-600">站点名称</div>
                <input
                  value={form.site_name}
                  onChange={(event) => handleChange("site_name", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="例如：表情包档案馆"
                />
              </label>

              <label className="space-y-2">
                <div className="text-xs font-semibold text-slate-600">联系邮箱</div>
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(event) => handleChange("contact_email", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="contact@example.com"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <div className="text-xs font-semibold text-slate-600">站点描述</div>
                <textarea
                  value={form.site_description}
                  onChange={(event) => handleChange("site_description", event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="站点简介，会展示在官网底部"
                />
              </label>

              <label className="space-y-2">
                <div className="text-xs font-semibold text-slate-600">版权投诉邮箱</div>
                <input
                  type="email"
                  value={form.complaint_email}
                  onChange={(event) => handleChange("complaint_email", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="copyright@example.com"
                />
              </label>

              <label className="space-y-2">
                <div className="text-xs font-semibold text-slate-600">版权补充说明</div>
                <input
                  value={form.copyright_text}
                  onChange={(event) => handleChange("copyright_text", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="例如：All rights reserved."
                />
              </label>

              <label className="space-y-2">
                <div className="text-xs font-semibold text-slate-600">ICP备案文案</div>
                <input
                  value={form.icp_number}
                  onChange={(event) => handleChange("icp_number", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="例如：粤ICP备xxxx号"
                />
              </label>

              <label className="space-y-2">
                <div className="text-xs font-semibold text-slate-600">ICP备案链接</div>
                <input
                  type="url"
                  value={form.icp_link}
                  onChange={(event) => handleChange("icp_link", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="https://beian.miit.gov.cn/"
                />
              </label>

              <label className="space-y-2">
                <div className="text-xs font-semibold text-slate-600">公安备案文案</div>
                <input
                  value={form.public_security_number}
                  onChange={(event) => handleChange("public_security_number", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="例如：粤公网安备xxxxxxxx号"
                />
              </label>

              <label className="space-y-2">
                <div className="text-xs font-semibold text-slate-600">公安备案链接</div>
                <input
                  type="url"
                  value={form.public_security_link}
                  onChange={(event) => handleChange("public_security_link", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="https://beian.mps.gov.cn/"
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <div>提示：ICP备案/公安备案链接可留空；留空时底部文案将仅展示文本。</div>
              {lastUpdatedAt ? <div className="mt-1">最近更新时间：{lastUpdatedAt}</div> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
