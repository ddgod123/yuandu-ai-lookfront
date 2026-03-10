"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type FooterSetting = {
  site_name: string;
  site_description: string;
  contact_email: string;
  complaint_email: string;
  self_media_logo: string;
  self_media_logo_url?: string;
  self_media_qr_code: string;
  self_media_qr_code_url?: string;
  icp_number: string;
  icp_link: string;
  public_security_number: string;
  public_security_link: string;
  copyright_text: string;
  updated_at?: string;
};

type MediaField = "self_media_logo" | "self_media_qr_code";

const DEFAULT_FORM: FooterSetting = {
  site_name: "表情包档案馆",
  site_description:
    "致力于收集、整理和分享互联网表情包资源。本站提供合集浏览、下载与收藏功能，服务于个人非商业交流场景。",
  contact_email: "contact@emoji-archive.com",
  complaint_email: "contact@emoji-archive.com",
  self_media_logo: "",
  self_media_qr_code: "",
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

function isHTTPURL(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function sanitizeFileName(name: string) {
  const cleaned = name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
  return cleaned || "site-media";
}

export default function Page() {
  const [form, setForm] = useState<FooterSetting>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");

  const [mediaFiles, setMediaFiles] = useState<Record<MediaField, File | null>>({
    self_media_logo: null,
    self_media_qr_code: null,
  });
  const [mediaUploading, setMediaUploading] = useState<Record<MediaField, boolean>>({
    self_media_logo: false,
    self_media_qr_code: false,
  });
  const [mediaProgress, setMediaProgress] = useState<Record<MediaField, number>>({
    self_media_logo: 0,
    self_media_qr_code: 0,
  });
  const [mediaPreview, setMediaPreview] = useState<Record<MediaField, string>>({
    self_media_logo: "",
    self_media_qr_code: "",
  });

  const resolveAssetURL = async (value: string) => {
    const normalized = value.trim();
    if (!normalized) return "";
    if (isHTTPURL(normalized)) return normalized;

    try {
      const res = await fetchWithAuth(`${API_BASE}/api/storage/url?key=${encodeURIComponent(normalized)}`);
      if (!res.ok) return "";
      const data = (await res.json()) as { url?: string };
      return data.url || "";
    } catch {
      return "";
    }
  };

  const refreshMediaPreview = async (field: MediaField, value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      setMediaPreview((prev) => ({ ...prev, [field]: "" }));
      return;
    }

    if (isHTTPURL(normalized)) {
      setMediaPreview((prev) => ({ ...prev, [field]: normalized }));
      return;
    }

    const resolved = await resolveAssetURL(normalized);
    setMediaPreview((prev) => ({ ...prev, [field]: resolved }));
  };

  const applyFormResponse = (data: FooterSetting) => {
    const normalized = normalizeForm(data);
    setForm(normalized);
    setLastUpdatedAt(data.updated_at || "");

    setMediaPreview({
      self_media_logo: (data.self_media_logo_url || "").trim(),
      self_media_qr_code: (data.self_media_qr_code_url || "").trim(),
    });

    if (!data.self_media_logo_url && normalized.self_media_logo) {
      void refreshMediaPreview("self_media_logo", normalized.self_media_logo);
    }
    if (!data.self_media_qr_code_url && normalized.self_media_qr_code) {
      void refreshMediaPreview("self_media_qr_code", normalized.self_media_qr_code);
    }
  };

  useEffect(() => {
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
        setMediaPreview({
          self_media_logo: (
            data.self_media_logo_url ||
            (isHTTPURL(normalized.self_media_logo) ? normalized.self_media_logo : "")
          ).trim(),
          self_media_qr_code: (
            data.self_media_qr_code_url ||
            (isHTTPURL(normalized.self_media_qr_code) ? normalized.self_media_qr_code : "")
          ).trim(),
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "加载失败";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadSetting();
  }, []);

  const handleChange = (field: keyof FooterSetting, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === "self_media_logo" || field === "self_media_qr_code") {
      void refreshMediaPreview(field, value);
    }
  };

  const uploadMedia = async (field: MediaField) => {
    const file = mediaFiles[field];
    if (!file) {
      setError("请先选择图片文件");
      return;
    }

    setError(null);
    setSuccess(null);
    setMediaUploading((prev) => ({ ...prev, [field]: true }));
    setMediaProgress((prev) => ({ ...prev, [field]: 0 }));

    try {
      const fileName = sanitizeFileName(file.name);
      const folder = field === "self_media_logo" ? "logo" : "qrcode";
      const key = `emoji/site/footer/self-media/${folder}/${Date.now()}-${fileName}`;

      const tokenRes = await fetchWithAuth(`${API_BASE}/api/storage/upload-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!tokenRes.ok) throw new Error(await tokenRes.text());

      const tokenData = (await tokenRes.json()) as { token: string; key?: string; up_host?: string };
      const uploadKey = tokenData.key || key;
      const upHost = tokenData.up_host || "https://up.qiniup.com";

      await new Promise<void>((resolve, reject) => {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        uploadForm.append("token", tokenData.token);
        uploadForm.append("key", uploadKey);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", upHost, true);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          setMediaProgress((prev) => ({ ...prev, [field]: percent }));
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(xhr.responseText || "上传失败"));
          }
        };

        xhr.onerror = () => reject(new Error("上传失败"));
        xhr.send(uploadForm);
      });

      setForm((prev) => ({ ...prev, [field]: uploadKey }));
      setMediaFiles((prev) => ({ ...prev, [field]: null }));
      setMediaProgress((prev) => ({ ...prev, [field]: 100 }));
      await refreshMediaPreview(field, uploadKey);
      setSuccess(field === "self_media_logo" ? "自媒体 logo 已上传。" : "自媒体二维码已上传。");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "上传失败";
      setError(message);
    } finally {
      setMediaUploading((prev) => ({ ...prev, [field]: false }));
    }
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
      applyFormResponse(data);
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
        description="官网底部信息配置。运营人员可在此修改联系方式、备案信息及自媒体展示内容。"
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

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 md:col-span-2">
                <div>
                  <div className="text-sm font-semibold text-slate-700">自媒体展示</div>
                  <div className="mt-1 text-xs text-slate-500">
                    可填写对象 key 或完整 URL，推荐直接上传后自动填充。
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-600">自媒体 Logo</div>
                    <input
                      value={form.self_media_logo}
                      onChange={(event) => handleChange("self_media_logo", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="输入对象 key 或 https:// 图片地址"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          setMediaFiles((prev) => ({
                            ...prev,
                            self_media_logo: event.target.files?.[0] || null,
                          }))
                        }
                        className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-600"
                      />
                      <button
                        onClick={() => uploadMedia("self_media_logo")}
                        disabled={!mediaFiles.self_media_logo || mediaUploading.self_media_logo}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {mediaUploading.self_media_logo ? "上传中..." : "上传"}
                      </button>
                    </div>
                    {mediaUploading.self_media_logo ? (
                      <div className="text-[11px] text-slate-400">上传进度：{mediaProgress.self_media_logo}%</div>
                    ) : null}
                    {mediaPreview.self_media_logo ? (
                      <img
                        src={mediaPreview.self_media_logo}
                        alt="自媒体 logo 预览"
                        className="h-16 w-16 rounded-xl border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="text-[11px] text-slate-400">暂无 Logo 预览</div>
                    )}
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-600">自媒体二维码</div>
                    <input
                      value={form.self_media_qr_code}
                      onChange={(event) => handleChange("self_media_qr_code", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="输入对象 key 或 https:// 图片地址"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          setMediaFiles((prev) => ({
                            ...prev,
                            self_media_qr_code: event.target.files?.[0] || null,
                          }))
                        }
                        className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-600"
                      />
                      <button
                        onClick={() => uploadMedia("self_media_qr_code")}
                        disabled={!mediaFiles.self_media_qr_code || mediaUploading.self_media_qr_code}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {mediaUploading.self_media_qr_code ? "上传中..." : "上传"}
                      </button>
                    </div>
                    {mediaUploading.self_media_qr_code ? (
                      <div className="text-[11px] text-slate-400">上传进度：{mediaProgress.self_media_qr_code}%</div>
                    ) : null}
                    {mediaPreview.self_media_qr_code ? (
                      <img
                        src={mediaPreview.self_media_qr_code}
                        alt="自媒体二维码预览"
                        className="h-28 w-28 rounded-xl border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="text-[11px] text-slate-400">暂无二维码预览</div>
                    )}
                  </div>
                </div>
              </div>

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
              <div className="mt-1">自媒体图片支持对象 key 与 http(s) URL。对象 key 会自动解析预览。</div>
              {lastUpdatedAt ? <div className="mt-1">最近更新时间：{lastUpdatedAt}</div> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
