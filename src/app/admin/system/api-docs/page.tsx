"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE } from "@/lib/admin-auth";

type HealthStatus = "idle" | "checking" | "ok" | "error";

function resolveAPIBase() {
  const base =
    API_BASE && API_BASE.trim()
      ? API_BASE.trim()
      : typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "";
  return base.replace(/\/+$/, "");
}

function resolveSwaggerURL(base: string) {
  if (!base) return "/swagger/index.html";
  return `${base}/swagger/index.html`;
}

function resolveSwaggerDocURL(base: string) {
  if (!base) return "/swagger/doc.json";
  return `${base}/swagger/doc.json`;
}

function resolveHealthURL(base: string) {
  if (!base) return "/healthz";
  return `${base}/healthz`;
}

export default function AdminSystemAPIDocsPage() {
  const [backendStatus, setBackendStatus] = useState<HealthStatus>("idle");
  const [swaggerStatus, setSwaggerStatus] = useState<HealthStatus>("idle");
  const [statusHint, setStatusHint] = useState("");
  const [copyLabel, setCopyLabel] = useState("复制地址");

  const apiBase = useMemo(() => resolveAPIBase(), []);
  const swaggerURL = useMemo(() => resolveSwaggerURL(apiBase), [apiBase]);
  const swaggerDocURL = useMemo(() => resolveSwaggerDocURL(apiBase), [apiBase]);
  const healthURL = useMemo(() => resolveHealthURL(apiBase), [apiBase]);

  const runConnectivityCheck = useCallback(async () => {
    setBackendStatus("checking");
    setSwaggerStatus("checking");
    setStatusHint("");

    try {
      const [healthRes, swaggerRes] = await Promise.all([
        fetch(healthURL, { method: "GET", cache: "no-store" }),
        fetch(swaggerDocURL, { method: "GET", cache: "no-store" }),
      ]);
      setBackendStatus(healthRes.ok ? "ok" : "error");
      setSwaggerStatus(swaggerRes.ok ? "ok" : "error");

      if (!healthRes.ok && !swaggerRes.ok) {
        setStatusHint(`后端与文档均不可用（health:${healthRes.status} / swagger:${swaggerRes.status}）`);
      } else if (!healthRes.ok) {
        setStatusHint(`后端健康检查失败（HTTP ${healthRes.status}）`);
      } else if (!swaggerRes.ok) {
        setStatusHint(`Swagger 文档不可达（HTTP ${swaggerRes.status}）`);
      }
    } catch (error) {
      setBackendStatus("error");
      setSwaggerStatus("error");
      setStatusHint(error instanceof Error ? error.message : "连接失败，请检查 API_BASE 与后端服务");
    }
  }, [healthURL, swaggerDocURL]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runConnectivityCheck();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [runConnectivityCheck]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(swaggerURL);
      setCopyLabel("已复制");
      window.setTimeout(() => setCopyLabel("复制地址"), 1600);
    } catch {
      setCopyLabel("复制失败");
      window.setTimeout(() => setCopyLabel("复制地址"), 1600);
    }
  }, [swaggerURL]);

  const backendMeta = useMemo(() => {
    if (backendStatus === "ok") {
      return { label: "后端服务正常", dot: "bg-emerald-500", text: "text-emerald-700" };
    }
    if (backendStatus === "checking") {
      return { label: "后端检测中", dot: "bg-amber-400", text: "text-amber-700" };
    }
    if (backendStatus === "error") {
      return { label: "后端异常", dot: "bg-rose-500", text: "text-rose-700" };
    }
    return { label: "未检测", dot: "bg-slate-400", text: "text-slate-600" };
  }, [backendStatus]);

  const swaggerMeta = useMemo(() => {
    if (swaggerStatus === "ok") {
      return { label: "Swagger 可访问", dot: "bg-emerald-500", text: "text-emerald-700" };
    }
    if (swaggerStatus === "checking") {
      return { label: "Swagger 检测中", dot: "bg-amber-400", text: "text-amber-700" };
    }
    if (swaggerStatus === "error") {
      return { label: "Swagger 不可达", dot: "bg-rose-500", text: "text-rose-700" };
    }
    return { label: "未检测", dot: "bg-slate-400", text: "text-slate-600" };
  }, [swaggerStatus]);

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="API 文档（Swagger）"
        description="后端 OpenAPI/Swagger 在线文档入口，用于联调与验收。"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void runConnectivityCheck()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              检测连接
            </button>
            <a
              href={swaggerURL}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              新窗口打开
            </a>
          </div>
        }
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold ${backendMeta.text}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${backendMeta.dot}`} />
            {backendMeta.label}
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold ${swaggerMeta.text}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${swaggerMeta.dot}`} />
            {swaggerMeta.label}
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-500">文档地址</div>
        <a
          href={swaggerURL}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block break-all text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          {swaggerURL}
        </a>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {copyLabel}
          </button>
          <span className="text-xs text-slate-400">健康检查：{healthURL}</span>
        </div>
        {statusHint ? <p className="mt-2 text-xs text-rose-600">{statusHint}</p> : null}
        <p className="mt-2 text-xs text-slate-500">若浏览器限制 iframe 展示，请使用“新窗口打开”。</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <iframe
          src={swaggerURL}
          title="Swagger API Docs"
          className="h-[72vh] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </section>
    </div>
  );
}
