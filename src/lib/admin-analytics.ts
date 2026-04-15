"use client";

import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

export type AnalyticsRangePreset = "today" | "yesterday" | "7d" | "30d" | "custom";
export type AnalyticsDimension = "all" | "country" | "region" | "city" | "channel" | "device";

export type AdminAnalyticsQuery = {
  range: AnalyticsRangePreset;
  dimension: AnalyticsDimension;
  timezone?: string;
  from?: string;
  to?: string;
};

export type AnalyticsOption<T extends string> = {
  value: T;
  label: string;
};

export const ANALYTICS_RANGE_OPTIONS: Array<AnalyticsOption<AnalyticsRangePreset>> = [
  { value: "today", label: "今天" },
  { value: "yesterday", label: "昨天" },
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "custom", label: "自定义" },
];

export const ANALYTICS_DIMENSION_OPTIONS: Array<AnalyticsOption<AnalyticsDimension>> = [
  { value: "all", label: "全部" },
  { value: "country", label: "国家" },
  { value: "region", label: "省份/地区" },
  { value: "city", label: "城市" },
  { value: "channel", label: "渠道" },
  { value: "device", label: "设备" },
];

export type AdminAnalyticsOverview = {
  pv: number;
  uv: number;
  sessions: number;
  downloads: number;
  downloadUsers: number;
  downloadRate: number;
  newVisitorRate: number;
  avgStaySeconds: number;
};

export type AdminAnalyticsTrendPoint = {
  date: string;
  pv: number;
  uv: number;
  downloads: number;
  downloadRate: number;
};

export type AdminAnalyticsTopDownloadItem = {
  id: string;
  name: string;
  downloads: number;
  uv: number;
  downloadRate: number;
  growthRate: number;
};

export type AdminAnalyticsTopPageItem = {
  path: string;
  title: string;
  pv: number;
  uv: number;
  downloadRate: number;
  exitRate: number;
};

export type AdminAnalyticsGeoItem = {
  country: string;
  region: string;
  city: string;
  visits: number;
  uv: number;
  uniqueIps: number;
  downloads: number;
  share: number;
};

export type AdminAnalyticsBreakdownItem = {
  key: string;
  label: string;
  value: number;
  share: number;
};

export type AdminAnalyticsRealtimePage = {
  path: string;
  title: string;
  pv30m: number;
};

export type AdminAnalyticsRealtime = {
  pv30m: number;
  downloads30m: number;
  onlineUsers: number;
  activePages: AdminAnalyticsRealtimePage[];
};

export type AdminAnalyticsDashboard = {
  source: "api";
  generatedAt: string;
  query: AdminAnalyticsQuery;
  overview: AdminAnalyticsOverview;
  trends: AdminAnalyticsTrendPoint[];
  topCollections: AdminAnalyticsTopDownloadItem[];
  topEmojis: AdminAnalyticsTopDownloadItem[];
  topPages: AdminAnalyticsTopPageItem[];
  geo: AdminAnalyticsGeoItem[];
  channels: AdminAnalyticsBreakdownItem[];
  devices: AdminAnalyticsBreakdownItem[];
  realtime: AdminAnalyticsRealtime;
};

export type AdminAnalyticsGeoBackfillResult = {
  days: number;
  limit: number;
  scanned: number;
  updated: number;
  skipped: number;
  failed: number;
  started_at: string;
  ended_at: string;
};

const RANGE_SET = new Set<AnalyticsRangePreset>(ANALYTICS_RANGE_OPTIONS.map((item) => item.value));
const DIMENSION_SET = new Set<AnalyticsDimension>(ANALYTICS_DIMENSION_OPTIONS.map((item) => item.value));

export function createDefaultAnalyticsQuery(timezone?: string): AdminAnalyticsQuery {
  return {
    range: "7d",
    dimension: "all",
    timezone,
  };
}

export async function fetchAdminAnalyticsDashboard(
  inputQuery: Partial<AdminAnalyticsQuery>
): Promise<AdminAnalyticsDashboard> {
  const query = normalizeAnalyticsQuery(inputQuery);
  const search = new URLSearchParams();
  search.set("range", query.range);
  search.set("dimension", query.dimension);
  if (query.timezone) search.set("timezone", query.timezone);
  if (query.from) search.set("from", query.from);
  if (query.to) search.set("to", query.to);

  const res = await fetchWithAuth(`${API_BASE}/api/admin/analytics/dashboard?${search.toString()}`);
  if (!res.ok) {
    const message = (await safeReadText(res)) || `加载失败（HTTP ${res.status}）`;
    throw new Error(message);
  }

  const raw = (await res.json()) as Partial<AdminAnalyticsDashboard>;
  return {
    source: "api",
    generatedAt: raw.generatedAt || new Date().toISOString(),
    query: {
      ...query,
      ...(raw.query || {}),
    },
    overview: raw.overview || {
      pv: 0,
      uv: 0,
      sessions: 0,
      downloads: 0,
      downloadUsers: 0,
      downloadRate: 0,
      newVisitorRate: 0,
      avgStaySeconds: 0,
    },
    trends: Array.isArray(raw.trends) ? raw.trends : [],
    topCollections: Array.isArray(raw.topCollections) ? raw.topCollections : [],
    topEmojis: Array.isArray(raw.topEmojis) ? raw.topEmojis : [],
    topPages: Array.isArray(raw.topPages) ? raw.topPages : [],
    geo: Array.isArray(raw.geo) ? raw.geo : [],
    channels: Array.isArray(raw.channels) ? raw.channels : [],
    devices: Array.isArray(raw.devices) ? raw.devices : [],
    realtime: raw.realtime || {
      pv30m: 0,
      downloads30m: 0,
      onlineUsers: 0,
      activePages: [],
    },
  };
}

export async function backfillAdminAnalyticsGeo(days = 30, limit = 2000): Promise<AdminAnalyticsGeoBackfillResult> {
  const res = await fetchWithAuth(`${API_BASE}/api/admin/analytics/geo-backfill`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ days, limit }),
  });
  if (!res.ok) {
    const message = (await safeReadText(res)) || `补齐失败（HTTP ${res.status}）`;
    throw new Error(message);
  }
  return (await res.json()) as AdminAnalyticsGeoBackfillResult;
}

function normalizeAnalyticsQuery(input: Partial<AdminAnalyticsQuery>): AdminAnalyticsQuery {
  const rangeInput = String(input.range || "7d") as AnalyticsRangePreset;
  const range = RANGE_SET.has(rangeInput) ? rangeInput : "7d";

  const dimensionInput = String(input.dimension || "all") as AnalyticsDimension;
  const dimension = DIMENSION_SET.has(dimensionInput) ? dimensionInput : "all";

  const timezone = (input.timezone || "").trim() || undefined;

  return {
    range,
    dimension,
    timezone,
    from: input.from,
    to: input.to,
  };
}

async function safeReadText(res: Response) {
  try {
    const text = (await res.text()).trim();
    if (!text) return "";

    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      return String(parsed.error || parsed.message || "").trim() || text;
    } catch {
      return text;
    }
  } catch {
    return "";
  }
}
