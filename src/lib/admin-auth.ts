"use client";

const resolveAPIBase = () => {
  const raw = (process.env.NEXT_PUBLIC_API_BASE || "").trim();
  if (!raw) return "";
  if (/^\/api\/?$/i.test(raw)) return "";
  return raw.replace(/\/+$/, "");
};

const API_BASE = resolveAPIBase();

const ACCESS_KEY = "admin_token";
const REFRESH_KEY = "admin_refresh";
const EXPIRES_AT_KEY = "admin_expires_at";
const DISPLAY_NAME_KEY = "admin_display_name";
const ROLE_KEY = "admin_role";
const REQUIRED_ROLE = "super_admin";

function decodeTokenRole(token: string) {
  const raw = token.trim();
  if (!raw) return "";
  const parts = raw.split(".");
  if (parts.length < 2) return "";
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { role?: string };
    return (payload.role || "").toLowerCase();
  } catch {
    return "";
  }
}

function hasAdminPermission(role: string) {
  return role === REQUIRED_ROLE;
}

export function getAccessToken() {
  return typeof window === "undefined"
    ? ""
    : window.localStorage.getItem(ACCESS_KEY) || "";
}

export function getRefreshToken() {
  return typeof window === "undefined"
    ? ""
    : window.localStorage.getItem(REFRESH_KEY) || "";
}

export function getExpiresAt() {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(EXPIRES_AT_KEY);
  return raw ? Number(raw) : 0;
}

export function getAdminProfile() {
  if (typeof window === "undefined") return { name: "", role: "" };
  return {
    name: window.localStorage.getItem(DISPLAY_NAME_KEY) || "",
    role: window.localStorage.getItem(ROLE_KEY) || "",
  };
}

export function setTokens(
  accessToken: string,
  refreshToken: string,
  expiresInSeconds: number,
  displayName?: string,
  role?: string
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
  if (expiresInSeconds) {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    window.localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
  }
  if (displayName) {
    window.localStorage.setItem(DISPLAY_NAME_KEY, displayName);
  }
  if (role) {
    window.localStorage.setItem(ROLE_KEY, role);
  }
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(EXPIRES_AT_KEY);
  window.localStorage.removeItem(DISPLAY_NAME_KEY);
  window.localStorage.removeItem(ROLE_KEY);
}

export function isExpiringSoon() {
  const expiresAt = getExpiresAt();
  if (!expiresAt) return false;
  return Date.now() > expiresAt - 60_000;
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return false;
  }

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    return false;
  }

  const data = await res.json();
  if (!data?.access_token || !data?.refresh_token) {
    clearTokens();
    return false;
  }

  const role = decodeTokenRole(data.access_token);
  if (!hasAdminPermission(role)) {
    clearTokens();
    return false;
  }

  setTokens(data.access_token, data.refresh_token, data.expires_in || 0, undefined, role);
  return true;
}

export async function logout() {
  const refreshToken = getRefreshToken();
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
  });
  clearTokens();
}

export async function ensureValidSession() {
  const access = getAccessToken();
  if (!access) {
    return await refreshAccessToken();
  }
  if (!hasAdminPermission(decodeTokenRole(access))) {
    clearTokens();
    return false;
  }
  if (isExpiringSoon()) {
    return await refreshAccessToken();
  }
  return true;
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  if (!(await ensureValidSession())) {
    const emptyHeaders = new Headers(init.headers || {});
    return await fetch(input, { ...init, headers: emptyHeaders, credentials: "include" });
  }
  let token = getAccessToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let res = await fetch(input, { ...init, headers, credentials: "include" });

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) return res;
    token = getAccessToken();
    const retryHeaders = new Headers(init.headers || {});
    if (token) retryHeaders.set("Authorization", `Bearer ${token}`);
    res = await fetch(input, { ...init, headers: retryHeaders, credentials: "include" });
  }

  if (res.status === 403) {
    clearTokens();
  }

  return res;
}

export { API_BASE };
