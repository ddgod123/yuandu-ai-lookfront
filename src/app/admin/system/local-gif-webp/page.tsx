"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SectionHeader from "@/app/admin/_components/SectionHeader";
import { API_BASE, ensureValidSession, fetchWithAuth, getAccessToken } from "@/lib/admin-auth";

type AdminLocalGIFZipToWebPResponse = {
  input_file?: string;
  output_file?: string;
  output_path?: string;
  total_files?: number;
  converted_files?: number;
  skipped_files?: number;
  failed_files?: number;
  failures?: string[];
  warnings?: string[];
  elapsed_ms?: number;
};

type AdminLocalGIFZipToWebPJobStartResponse = {
  job_id?: string;
  status?: string;
  input_file?: string;
  total_entries?: number;
  total_target_files?: number;
  processed_target_files?: number;
  converted_files?: number;
  skipped_files?: number;
  failed_files?: number;
  failures?: string[];
  warnings?: string[];
  created_at?: string;
};

type AdminLocalGIFZipToWebPJobStatusResponse = {
  job_id?: string;
  status?: "queued" | "processing" | "completed" | "failed" | string;
  input_file?: string;
  total_entries?: number;
  total_target_files?: number;
  processed_target_files?: number;
  progress_percent?: number;
  converted_files?: number;
  skipped_files?: number;
  failed_files?: number;
  output_path?: string;
  output_file?: string;
  desktop_dir?: string;
  error?: string;
  failures?: string[];
  warnings?: string[];
  elapsed_ms?: number;
  result?: AdminLocalGIFZipToWebPResponse;
};

type ConvertStage = "idle" | "uploading" | "processing" | "completed" | "failed";

function fmtInt(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  return Math.trunc(n).toLocaleString("zh-CN");
}

function fmtSeconds(ms?: number) {
  const value = Number(ms || 0);
  if (!Number.isFinite(value) || value <= 0) return "0.0s";
  return `${(value / 1000).toFixed(1)}s`;
}

async function parseErrorMessage(response: Response, fallback: string) {
  const text = (await response.text()) || fallback;
  if (!text) return fallback;
  try {
    const payload = JSON.parse(text) as { error?: string; message?: string };
    return payload.message || payload.error || fallback;
  } catch {
    return text;
  }
}

function parseXHRPayload(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text) as AdminLocalGIFZipToWebPJobStartResponse & {
      error?: string;
      message?: string;
    };
  } catch {
    return null;
  }
}

async function createJobWithUpload(
  file: File,
  hooks: {
    onUploadProgress?: (percent: number) => void;
    onUploadDone?: () => void;
  }
): Promise<AdminLocalGIFZipToWebPJobStartResponse> {
  const hasSession = await ensureValidSession();
  if (!hasSession) {
    throw new Error("登录态失效，请重新登录后台");
  }
  const token = getAccessToken();

  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/admin/system/local/gif-zip-to-webp/jobs`, true);
    xhr.withCredentials = true;
    xhr.timeout = 1000 * 60 * 10;
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    let uploadDone = false;
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      const percent = Math.max(0, Math.min(100, (event.loaded / event.total) * 100));
      hooks.onUploadProgress?.(percent);
    };
    xhr.upload.onload = () => {
      uploadDone = true;
      hooks.onUploadDone?.();
    };

    xhr.onerror = () => reject(new Error("网络异常，请检查后端服务是否可用"));
    xhr.ontimeout = () => reject(new Error("上传超时，请检查网络或缩小 ZIP 后重试"));

    xhr.onload = () => {
      if (!uploadDone) {
        hooks.onUploadDone?.();
      }
      const payload = parseXHRPayload(xhr.responseText || "");
      if (xhr.status >= 200 && xhr.status < 300 && payload) {
        resolve(payload);
        return;
      }
      const message =
        payload?.message ||
        payload?.error ||
        (xhr.responseText || "").trim() ||
        `启动任务失败（HTTP ${xhr.status || 0}）`;
      reject(new Error(message));
    };

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export default function AdminSystemLocalGIFWebPPage() {
  const [file, setFile] = useState<File | null>(null);
  const [jobID, setJobID] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<ConvertStage>("idle");
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AdminLocalGIFZipToWebPResponse | null>(null);
  const [jobStatus, setJobStatus] = useState<AdminLocalGIFZipToWebPJobStatusResponse | null>(null);
  const [etaMs, setEtaMs] = useState(0);

  const pollTimerRef = useRef<number | null>(null);
  const pollingRef = useRef(false);
  const etaPerFileEmaRef = useRef(0);
  const etaLastSampleRef = useRef<{ processed: number; elapsedMs: number } | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const resetEtaEstimator = useCallback(() => {
    etaPerFileEmaRef.current = 0;
    etaLastSampleRef.current = null;
    setEtaMs(0);
  }, []);

  const applyStatus = useCallback(
    (status: AdminLocalGIFZipToWebPJobStatusResponse) => {
      setJobStatus(status);

      const total = Number(status.total_target_files || 0);
      const processed = Number(status.processed_target_files || 0);
      const elapsed = Number(status.elapsed_ms || 0);
      const percent = Number(status.progress_percent || 0);
      const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;

      if (status.status === "queued") {
        setStage("processing");
        setStatusText("任务已创建，等待后台开始处理...");
        setProgress(Math.max(1, safePercent));
        setEtaMs(0);
        return;
      }

      if (status.status === "processing") {
        setStage("processing");
        setStatusText(`正在转换（${fmtInt(processed)} / ${fmtInt(total)}）`);
        setProgress(Math.max(1, safePercent));

        if (processed > 0 && total > processed && elapsed > 0) {
          let samplePerFileMs = elapsed / processed;
          const prev = etaLastSampleRef.current;
          if (prev && processed > prev.processed && elapsed > prev.elapsedMs) {
            const deltaProcessed = processed - prev.processed;
            const deltaElapsed = elapsed - prev.elapsedMs;
            const incrementalPerFileMs = deltaElapsed / deltaProcessed;
            if (Number.isFinite(incrementalPerFileMs) && incrementalPerFileMs > 0) {
              samplePerFileMs = incrementalPerFileMs;
            }
          }

          const alpha = 0.35;
          const prevEma = etaPerFileEmaRef.current;
          const ema = prevEma > 0 ? prevEma * (1 - alpha) + samplePerFileMs * alpha : samplePerFileMs;
          etaPerFileEmaRef.current = ema;
          etaLastSampleRef.current = { processed, elapsedMs: elapsed };

          const remain = total - processed;
          setEtaMs(Math.max(0, Math.round(ema * remain)));
        } else {
          setEtaMs(0);
          if (processed <= 0) {
            etaPerFileEmaRef.current = 0;
            etaLastSampleRef.current = null;
          }
        }
        return;
      }

      if (status.status === "completed") {
        setStage("completed");
        setStatusText(`转换完成 ✅（${fmtInt(processed)} / ${fmtInt(total)}）`);
        setProgress(100);
        resetEtaEstimator();
        setResult(
          status.result || {
            input_file: status.input_file,
            output_file: status.output_file,
            output_path: status.output_path,
            total_files: status.total_entries,
            converted_files: status.converted_files,
            skipped_files: status.skipped_files,
            failed_files: status.failed_files,
            failures: status.failures,
            warnings: status.warnings,
            elapsed_ms: status.elapsed_ms,
          }
        );
        return;
      }

      if (status.status === "failed") {
        setStage("failed");
        setStatusText(`转换失败（${fmtInt(processed)} / ${fmtInt(total)}）`);
        setProgress(Math.max(0, safePercent));
        resetEtaEstimator();
        setError(status.error || "转换失败");
        return;
      }
    },
    [resetEtaEstimator]
  );

  const pollJobStatus = useCallback(
    async (id: string) => {
      if (!id || pollingRef.current) return;
      pollingRef.current = true;
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/system/local/gif-zip-to-webp/jobs/${encodeURIComponent(id)}`);
        if (!res.ok) {
          throw new Error(await parseErrorMessage(res, "查询任务状态失败"));
        }
        const data = (await res.json()) as AdminLocalGIFZipToWebPJobStatusResponse;
        applyStatus(data);
        if (data.status === "completed" || data.status === "failed") {
          stopPolling();
          setLoading(false);
        }
      } catch (err: unknown) {
        stopPolling();
        setStage("failed");
        setLoading(false);
        setError(err instanceof Error ? err.message : "查询任务状态失败");
      } finally {
        pollingRef.current = false;
      }
    },
    [applyStatus, stopPolling]
  );

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      void pollJobStatus(id);
      pollTimerRef.current = window.setInterval(() => {
        void pollJobStatus(id);
      }, 900);
    },
    [pollJobStatus, stopPolling]
  );

  const onConvert = useCallback(async () => {
    if (!file) {
      setError("请先选择 zip 文件");
      return;
    }

    setLoading(true);
    setStage("uploading");
    setStatusText("正在上传 ZIP...");
    setProgress(0);
    setError("");
    setResult(null);
    setJobStatus(null);
    setJobID("");
    resetEtaEstimator();

    try {
      const started = await createJobWithUpload(file, {
        onUploadProgress: (percent) => {
          setStage("uploading");
          setStatusText(`正在上传 ZIP：${percent.toFixed(0)}%`);
          setProgress(Math.max(1, Math.min(99, percent)));
        },
        onUploadDone: () => {
          setStage("processing");
          setStatusText("上传完成，正在创建任务...");
          setProgress((prev) => Math.max(prev, 100));
        },
      });

      const id = String(started.job_id || "").trim();
      if (!id) {
        throw new Error("任务创建失败：未返回 job_id");
      }
      setJobID(id);
      setStage("processing");
      setStatusText("任务已创建，等待后台开始处理...");
      setProgress(0);
      startPolling(id);
    } catch (err: unknown) {
      stopPolling();
      setLoading(false);
      setStage("failed");
      setProgress(0);
      resetEtaEstimator();
      setError(err instanceof Error ? err.message : "启动转换失败");
    }
  }, [file, resetEtaEstimator, startPolling, stopPolling]);

  const onQuickCheck = useCallback(async () => {
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/healthz`);
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, "后端不可用"));
      }
      setStatusText("后端可用，可开始转换");
    } catch (err: unknown) {
      setStage("failed");
      setStatusText("连通性检查失败");
      setError(err instanceof Error ? err.message : "后端不可用");
    }
  }, []);

  const progressTone = useMemo(() => {
    if (stage === "failed") return "bg-rose-500";
    if (stage === "completed") return "bg-emerald-500";
    return "bg-emerald-500";
  }, [stage]);

  const processedTarget = Number(jobStatus?.processed_target_files || 0);
  const totalTarget = Number(jobStatus?.total_target_files || 0);
  const showEta = useMemo(() => stage === "processing", [stage]);

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="本地 GIF 转 WebP"
        description="上传 GIF 合集 ZIP，后端本机转换为 WebP 并保存到本机桌面。"
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <label className="text-xs font-semibold text-slate-500">
          选择 ZIP 文件
          <input
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={(event) => {
              stopPolling();
              setFile(event.target.files?.[0] || null);
              setJobID("");
              setError("");
              setResult(null);
              setJobStatus(null);
              setStage("idle");
              setProgress(0);
              setStatusText("");
              setLoading(false);
            }}
            className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void onConvert()}
            disabled={loading || !file}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "处理中..." : "开始转换并保存到桌面"}
          </button>
          <button
            onClick={() => void onQuickCheck()}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            连通性检查
          </button>
          {file ? <span className="text-xs text-slate-500">已选：{file.name}</span> : null}
          {jobID ? <span className="text-xs text-slate-400">任务ID：{jobID}</span> : null}
        </div>

        {(loading || stage === "completed" || stage === "failed" || statusText) ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">{statusText || "等待开始"}</span>
              <span className="font-bold text-slate-500">{Math.max(0, Math.min(100, progress)).toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ${progressTone}`}
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
            {totalTarget > 0 ? (
              <div className="mt-2 text-xs text-slate-600">
                后端真实进度：{fmtInt(processedTarget)} / {fmtInt(totalTarget)}（仅统计 GIF 转码任务）
              </div>
            ) : null}
            {stage === "processing" ? (
              <div className="mt-1 text-xs text-slate-500">
                预计剩余：{showEta && processedTarget > 0 && etaMs > 0 ? fmtSeconds(etaMs) : "计算中..."}
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
        ) : null}

        {result ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <div className="font-semibold">转换完成</div>
            <div className="mt-1 break-all">输出文件：{result.output_path || "-"}</div>
            <div className="mt-1">
              共 {fmtInt(result.total_files)} 个文件，成功 {fmtInt(result.converted_files)}，跳过 {fmtInt(result.skipped_files)}，失败 {fmtInt(result.failed_files)}。
            </div>
            <div className="mt-1 text-emerald-700">
              总耗时：{fmtSeconds(result.elapsed_ms)}
              {Number(result.converted_files || 0) > 0
                ? `（约 ${(Number(result.elapsed_ms || 0) / Number(result.converted_files || 1) / 1000).toFixed(2)}s / 文件）`
                : ""}
            </div>
            {Array.isArray(result.warnings) && result.warnings.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-700">
                {result.warnings.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : null}
            {Array.isArray(result.failures) && result.failures.length ? (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium text-rose-700">
                  查看失败明细（{fmtInt(result.failures.length)}）
                </summary>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-rose-700">
                  {result.failures.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
