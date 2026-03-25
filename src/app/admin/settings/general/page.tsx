"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

type FooterSelfMediaItem = {
  key: string;
  name: string;
  logo: string;
  logo_url?: string;
  qr_code: string;
  qr_code_url?: string;
  profile_link: string;
  enabled: boolean;
  sort: number;
};

type FooterSetting = {
  site_name: string;
  site_description: string;
  contact_email: string;
  complaint_email: string;
  self_media_logo: string;
  self_media_logo_url?: string;
  self_media_qr_code: string;
  self_media_qr_code_url?: string;
  self_media_items: FooterSelfMediaItem[];
  icp_number: string;
  icp_link: string;
  public_security_number: string;
  public_security_link: string;
  copyright_text: string;
  updated_at?: string;
};

type MediaAssetField = "logo" | "qr_code";

const DEFAULT_MEDIA_ITEMS: FooterSelfMediaItem[] = [
  { key: "qq", name: "QQ", logo: "", qr_code: "", profile_link: "", enabled: true, sort: 1 },
  { key: "wechat", name: "微信", logo: "", qr_code: "", profile_link: "", enabled: false, sort: 2 },
  { key: "xiaohongshu", name: "小红书", logo: "", qr_code: "", profile_link: "", enabled: false, sort: 3 },
];

const DEFAULT_FORM: FooterSetting = {
  site_name: "表情包档案馆",
  site_description:
    "致力于收集、整理和分享互联网表情包资源。本站提供合集浏览、下载与收藏功能，服务于个人非商业交流场景。",
  contact_email: "contact@emoji-archive.com",
  complaint_email: "contact@emoji-archive.com",
  self_media_logo: "",
  self_media_qr_code: "",
  self_media_items: DEFAULT_MEDIA_ITEMS,
  icp_number: "ICP备案号：待补充",
  icp_link: "",
  public_security_number: "公安备案号：待补充",
  public_security_link: "",
  copyright_text: "表情包档案馆. All rights reserved.",
};

function normalizeUploadHost(raw: string) {
  const host = (raw || "").trim();
  if (!host) return "https://up.qiniup.com";
  if (host.startsWith("//")) return `https:${host}`;
  if (host.startsWith("http://")) return `https://${host.slice(7)}`;
  if (host.startsWith("https://")) return host;
  return `https://${host}`;
}

function normalizeMediaItems(items?: FooterSelfMediaItem[] | null, legacyLogo = "", legacyQR = "") {
  const map = new Map<string, FooterSelfMediaItem>();
  for (const item of items || []) {
    const key = (item.key || "").trim();
    if (!key) continue;
    map.set(key, {
      key,
      name: (item.name || "").trim() || "自媒体",
      logo: (item.logo || "").trim(),
      logo_url: (item.logo_url || "").trim(),
      qr_code: (item.qr_code || "").trim(),
      qr_code_url: (item.qr_code_url || "").trim(),
      profile_link: (item.profile_link || "").trim(),
      enabled: Boolean(item.enabled),
      sort: Number(item.sort) > 0 ? Number(item.sort) : 0,
    });
  }

  if (!map.has("qq") && ((legacyLogo || "").trim() || (legacyQR || "").trim())) {
    map.set("qq", {
      key: "qq",
      name: "QQ",
      logo: legacyLogo.trim(),
      qr_code: legacyQR.trim(),
      profile_link: "",
      enabled: true,
      sort: 1,
    });
  }

  const merged: FooterSelfMediaItem[] = [];
  for (const base of DEFAULT_MEDIA_ITEMS) {
    const existing = map.get(base.key);
    merged.push(
      existing
        ? {
            ...base,
            ...existing,
            sort: Number(existing.sort) > 0 ? Number(existing.sort) : base.sort,
          }
        : { ...base }
    );
    map.delete(base.key);
  }

  for (const extra of map.values()) {
    merged.push({
      ...extra,
      sort: Number(extra.sort) > 0 ? Number(extra.sort) : merged.length + 1,
    });
  }

  return merged.sort((a, b) => a.sort - b.sort);
}

function normalizeForm(input: Partial<FooterSetting> | null | undefined): FooterSetting {
  const merged = {
    ...DEFAULT_FORM,
    ...(input || {}),
  };
  return {
    ...merged,
    self_media_items: normalizeMediaItems(
      input?.self_media_items,
      input?.self_media_logo || "",
      input?.self_media_qr_code || ""
    ),
  };
}

function isHTTPURL(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function sanitizeFileName(name: string) {
  const cleaned = name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
  return cleaned || "site-media";
}

function assetStateKey(mediaKey: string, field: MediaAssetField) {
  return `${mediaKey}:${field}`;
}

function pickPrimaryLegacyAssets(items: FooterSelfMediaItem[]) {
  const enabled = items.find((item) => item.enabled && (item.logo.trim() || item.qr_code.trim()));
  if (enabled) {
    return { logo: enabled.logo.trim(), qr_code: enabled.qr_code.trim() };
  }
  const any = items.find((item) => item.logo.trim() || item.qr_code.trim());
  return { logo: any?.logo.trim() || "", qr_code: any?.qr_code.trim() || "" };
}

function buildFooterPayload(input: FooterSetting): FooterSetting {
  const normalizedMedia = normalizeMediaItems(input.self_media_items);
  const primary = pickPrimaryLegacyAssets(normalizedMedia);
  return {
    ...input,
    self_media_items: normalizedMedia,
    self_media_logo: primary.logo,
    self_media_qr_code: primary.qr_code,
  };
}

export default function Page() {
  const [form, setForm] = useState<FooterSetting>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");

  const [mediaFiles, setMediaFiles] = useState<Record<string, File | null>>({});
  const [mediaUploading, setMediaUploading] = useState<Record<string, boolean>>({});
  const [mediaProgress, setMediaProgress] = useState<Record<string, number>>({});
  const [mediaPreview, setMediaPreview] = useState<Record<string, string>>({});
  const [mediaInputNonce, setMediaInputNonce] = useState<Record<string, number>>({});

  const mediaByKey = useMemo(() => {
    const map = new Map<string, FooterSelfMediaItem>();
    for (const item of form.self_media_items || []) {
      map.set(item.key, item);
    }
    return map;
  }, [form.self_media_items]);

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

  const refreshMediaPreview = async (mediaKey: string, field: MediaAssetField, value: string) => {
    const key = assetStateKey(mediaKey, field);
    const normalized = value.trim();
    if (!normalized) {
      setMediaPreview((prev) => ({ ...prev, [key]: "" }));
      return;
    }

    if (isHTTPURL(normalized)) {
      setMediaPreview((prev) => ({ ...prev, [key]: normalized }));
      return;
    }

    const resolved = await resolveAssetURL(normalized);
    setMediaPreview((prev) => ({ ...prev, [key]: resolved }));
  };

  const setMediaItemField = (mediaKey: string, field: MediaAssetField, value: string) => {
    const normalized = value.trim();
    setForm((prev) => ({
      ...prev,
      self_media_items: (prev.self_media_items || []).map((item) =>
        item.key === mediaKey
          ? {
              ...item,
              [field]: value,
              enabled: normalized ? true : item.enabled,
            }
          : item
      ),
    }));
    void refreshMediaPreview(mediaKey, field, value);
  };

  const setMediaItemSimpleField = (mediaKey: string, field: "name" | "profile_link" | "enabled" | "sort", value: string | boolean | number) => {
    setForm((prev) => ({
      ...prev,
      self_media_items: (prev.self_media_items || []).map((item) =>
        item.key === mediaKey ? { ...item, [field]: value } : item
      ),
    }));
  };

  const persistSetting = async (payload: FooterSetting, successMessage: string) => {
    const res = await fetchWithAuth(`${API_BASE}/api/admin/site-settings/footer`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    setSuccess(successMessage);
  };

  const applyFormResponse = (data: FooterSetting) => {
    const normalized = normalizeForm(data);
    setForm(normalized);
    setLastUpdatedAt(data.updated_at || "");

    const nextPreview: Record<string, string> = {};
    for (const item of normalized.self_media_items) {
      const logoKey = assetStateKey(item.key, "logo");
      const qrKey = assetStateKey(item.key, "qr_code");
      nextPreview[logoKey] = (item.logo_url || "").trim() || (isHTTPURL(item.logo) ? item.logo : "");
      nextPreview[qrKey] = (item.qr_code_url || "").trim() || (isHTTPURL(item.qr_code) ? item.qr_code : "");
    }
    setMediaPreview(nextPreview);
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
        applyFormResponse(data);
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
  };

  const uploadMedia = async (mediaKey: string, field: MediaAssetField) => {
    const fileKey = assetStateKey(mediaKey, field);
    const file = mediaFiles[fileKey];
    if (!file) {
      setError("请先选择图片文件");
      return;
    }

    setError(null);
    setSuccess(null);
    setMediaUploading((prev) => ({ ...prev, [fileKey]: true }));
    setMediaProgress((prev) => ({ ...prev, [fileKey]: 0 }));

    try {
      const fileName = sanitizeFileName(file.name);
      const folder = field === "logo" ? "logo" : "qrcode";
      const key = `emoji/site/footer/self-media/${mediaKey}/${folder}/${Date.now()}-${fileName}`;

      const tokenRes = await fetchWithAuth(`${API_BASE}/api/storage/upload-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!tokenRes.ok) throw new Error(await tokenRes.text());

      const tokenData = (await tokenRes.json()) as { token: string; key?: string; up_host?: string };
      const uploadKey = tokenData.key || key;
      const upHost = normalizeUploadHost(tokenData.up_host || "https://up.qiniup.com");

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
          setMediaProgress((prev) => ({ ...prev, [fileKey]: percent }));
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

      const nextForm: FooterSetting = {
        ...form,
        self_media_items: (form.self_media_items || []).map((item) =>
          item.key === mediaKey
            ? {
                ...item,
                [field]: uploadKey,
                enabled: true,
              }
            : item
        ),
      };
      setForm(nextForm);
      await refreshMediaPreview(mediaKey, field, uploadKey);
      setMediaFiles((prev) => ({ ...prev, [fileKey]: null }));
      setMediaProgress((prev) => ({ ...prev, [fileKey]: 100 }));
      setMediaInputNonce((prev) => ({ ...prev, [fileKey]: (prev[fileKey] || 0) + 1 }));
      await persistSetting(
        buildFooterPayload(nextForm),
        `${mediaByKey.get(mediaKey)?.name || mediaKey} ${field === "logo" ? "Logo" : "二维码"} 已上传并保存。`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "上传失败";
      setError(message);
    } finally {
      setMediaUploading((prev) => ({ ...prev, [fileKey]: false }));
    }
  };

  const clearMediaAsset = async (mediaKey: string, field: MediaAssetField) => {
    const fileKey = assetStateKey(mediaKey, field);
    const nextForm: FooterSetting = {
      ...form,
      self_media_items: (form.self_media_items || []).map((item) =>
        item.key === mediaKey
          ? {
              ...item,
              [field]: "",
            }
          : item
      ),
    };
    setForm(nextForm);
    await refreshMediaPreview(mediaKey, field, "");
    setMediaFiles((prev) => ({ ...prev, [fileKey]: null }));
    setMediaProgress((prev) => ({ ...prev, [fileKey]: 0 }));
    setMediaInputNonce((prev) => ({ ...prev, [fileKey]: (prev[fileKey] || 0) + 1 }));
    setError(null);
    setSuccess(null);
    try {
      setSaving(true);
      await persistSetting(
        buildFooterPayload(nextForm),
        `${mediaByKey.get(mediaKey)?.name || mediaKey} ${field === "logo" ? "Logo" : "二维码"} 已清空并保存。`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "保存失败";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const saveSetting = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await persistSetting(buildFooterPayload(form), "已保存，可在官网底部实时查看最新配置。");
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
                  <div className="text-sm font-semibold text-slate-700">自媒体展示（可配置）</div>
                  <div className="mt-1 text-xs text-slate-500">
                    支持 QQ / 微信 / 小红书。可配置 logo、二维码、跳转链接和启用状态。
                  </div>
                </div>

                <div className="space-y-4">
                  {form.self_media_items.map((item) => {
                    const logoStateKey = assetStateKey(item.key, "logo");
                    const qrStateKey = assetStateKey(item.key, "qr_code");
                    const logoPreview = mediaPreview[logoStateKey] || "";
                    const qrPreview = mediaPreview[qrStateKey] || "";
                    return (
                      <div key={item.key} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            {item.key}
                          </div>
                          <label className="flex items-center gap-2 text-xs text-slate-600">
                            <span>显示名称</span>
                            <input
                              value={item.name}
                              onChange={(event) => setMediaItemSimpleField(item.key, "name", event.target.value)}
                              className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-400"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-600">
                            <span>排序</span>
                            <input
                              type="number"
                              value={item.sort}
                              onChange={(event) =>
                                setMediaItemSimpleField(item.key, "sort", Number(event.target.value) || 0)
                              }
                              className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-400"
                            />
                          </label>
                          <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={(event) => setMediaItemSimpleField(item.key, "enabled", event.target.checked)}
                            />
                            启用
                          </label>
                        </div>

                        <div className="mt-3 grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-slate-600">Logo</div>
                            <input
                              value={item.logo}
                              onChange={(event) => setMediaItemField(item.key, "logo", event.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
                              placeholder="对象 key 或 https:// 地址"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                key={`${logoStateKey}:${mediaInputNonce[logoStateKey] || 0}`}
                                type="file"
                                accept="image/*"
                                onChange={(event) =>
                                  setMediaFiles((prev) => ({
                                    ...prev,
                                    [logoStateKey]: event.target.files?.[0] || null,
                                  }))
                                }
                                className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-600"
                              />
                              <button
                                onClick={() => uploadMedia(item.key, "logo")}
                                disabled={!mediaFiles[logoStateKey] || mediaUploading[logoStateKey]}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {mediaUploading[logoStateKey] ? "上传中..." : "上传替换"}
                              </button>
                              <button
                                onClick={() => void clearMediaAsset(item.key, "logo")}
                                disabled={mediaUploading[logoStateKey] || saving || !item.logo.trim()}
                                className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                清空
                              </button>
                            </div>
                            {mediaFiles[logoStateKey] ? (
                              <div className="text-[11px] text-slate-500">已选择：{mediaFiles[logoStateKey]?.name}</div>
                            ) : null}
                            {mediaUploading[logoStateKey] ? (
                              <div className="text-[11px] text-slate-400">上传进度：{mediaProgress[logoStateKey] || 0}%</div>
                            ) : null}
                            {logoPreview ? (
                              <img
                                src={logoPreview}
                                alt={`${item.name} logo`}
                                className="h-16 w-16 rounded-xl border border-slate-200 object-cover"
                              />
                            ) : (
                              <div className="text-[11px] text-slate-400">暂无 Logo 预览</div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-slate-600">二维码</div>
                            <input
                              value={item.qr_code}
                              onChange={(event) => setMediaItemField(item.key, "qr_code", event.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
                              placeholder="对象 key 或 https:// 地址"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                key={`${qrStateKey}:${mediaInputNonce[qrStateKey] || 0}`}
                                type="file"
                                accept="image/*"
                                onChange={(event) =>
                                  setMediaFiles((prev) => ({
                                    ...prev,
                                    [qrStateKey]: event.target.files?.[0] || null,
                                  }))
                                }
                                className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-600"
                              />
                              <button
                                onClick={() => uploadMedia(item.key, "qr_code")}
                                disabled={!mediaFiles[qrStateKey] || mediaUploading[qrStateKey]}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {mediaUploading[qrStateKey] ? "上传中..." : "上传替换"}
                              </button>
                              <button
                                onClick={() => void clearMediaAsset(item.key, "qr_code")}
                                disabled={mediaUploading[qrStateKey] || saving || !item.qr_code.trim()}
                                className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                清空
                              </button>
                            </div>
                            {mediaFiles[qrStateKey] ? (
                              <div className="text-[11px] text-slate-500">已选择：{mediaFiles[qrStateKey]?.name}</div>
                            ) : null}
                            {mediaUploading[qrStateKey] ? (
                              <div className="text-[11px] text-slate-400">上传进度：{mediaProgress[qrStateKey] || 0}%</div>
                            ) : null}
                            {qrPreview ? (
                              <img
                                src={qrPreview}
                                alt={`${item.name} 二维码`}
                                className="h-24 w-24 rounded-xl border border-slate-200 object-cover"
                              />
                            ) : (
                              <div className="text-[11px] text-slate-400">暂无二维码预览</div>
                            )}
                          </div>
                        </div>

                        <label className="mt-3 block space-y-1">
                          <div className="text-xs font-semibold text-slate-600">跳转链接（可选）</div>
                          <input
                            type="url"
                            value={item.profile_link}
                            onChange={(event) => setMediaItemSimpleField(item.key, "profile_link", event.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
                            placeholder="https://..."
                          />
                        </label>
                      </div>
                    );
                  })}
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
              <div className="mt-1">自媒体资源支持对象 key 与 http(s) URL。对象 key 会自动解析预览。</div>
              {lastUpdatedAt ? <div className="mt-1">最近更新时间：{lastUpdatedAt}</div> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
