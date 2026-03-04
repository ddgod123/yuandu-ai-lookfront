"use client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5050";

const ACCESS_KEY = "admin_token";
const REFRESH_KEY = "admin_refresh";
const EXPIRES_AT_KEY = "admin_expires_at";
const DISPLAY_NAME_KEY = "admin_display_name";
const ROLE_KEY = "admin_role";

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

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
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

  setTokens(data.access_token, data.refresh_token, data.expires_in || 0);
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
  if (isExpiringSoon()) {
    await refreshAccessToken();
  }
  return true;
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  if (isExpiringSoon()) {
    await refreshAccessToken();
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

  return res;
}

export { API_BASE };
