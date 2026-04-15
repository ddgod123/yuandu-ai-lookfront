"use client";

type PromptSourceBadgeProps = {
  value?: string | null;
  expectedFormat?: string;
  expectedStage?: string;
  emptyText?: string;
  className?: string;
};

export type ParsedPromptSource = {
  raw: string;
  format: string;
  stage: string;
  normalized: string;
};

const FORMAT_LABEL: Record<string, string> = {
  all: "ALL",
  gif: "GIF",
  png: "PNG",
  jpg: "JPG",
  webp: "WEBP",
  live: "LIVE",
  mp4: "MP4",
};

const STAGE_LABEL: Record<string, string> = {
  ai1: "AI1",
  ai2: "AI2",
  scoring: "SCORING",
  ai3: "AI3",
  default: "DEFAULT",
};

function normalizeFormat(raw: string) {
  const value = (raw || "").trim().toLowerCase();
  if (value === "jpeg") return "jpg";
  return value;
}

function normalizeStage(raw: string) {
  return (raw || "").trim().toLowerCase();
}

function resolveToken(raw: string) {
  const value = (raw || "").trim().toLowerCase();
  if (!value) return "";
  const idx = value.lastIndexOf(":");
  if (idx >= 0 && idx < value.length - 1) {
    return value.slice(idx + 1).trim();
  }
  return value;
}

export function parsePromptSource(value?: string | null): ParsedPromptSource | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const token = resolveToken(raw);
  if (!token) return null;

  const directFormat = normalizeFormat(token);
  if (directFormat in FORMAT_LABEL) {
    return {
      raw,
      format: directFormat,
      stage: "",
      normalized: directFormat,
    };
  }

  const segments = token
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) return null;

  const format = normalizeFormat(segments[0] || "");
  const stage = normalizeStage(segments[1] || "");
  if (!format) return null;

  return {
    raw,
    format,
    stage,
    normalized: stage ? `${format}/${stage}` : format,
  };
}

function isResolvedByFallback(parsed: ParsedPromptSource | null, expectedFormat?: string, expectedStage?: string) {
  if (!parsed) return false;
  const format = normalizeFormat(parsed.format);
  const stage = normalizeStage(parsed.stage);
  const expectedFmt = normalizeFormat(expectedFormat || "");
  const expectedStg = normalizeStage(expectedStage || "");

  if (expectedFmt && format && expectedFmt !== format) return true;
  if (expectedStg && stage && expectedStg !== stage) return true;
  return false;
}

function joinClassNames(...values: Array<string | undefined | null | false>) {
  return values.filter(Boolean).join(" ");
}

export default function PromptSourceBadge({
  value,
  expectedFormat,
  expectedStage,
  emptyText = "未配置",
  className,
}: PromptSourceBadgeProps) {
  const parsed = parsePromptSource(value);
  const fallback = isResolvedByFallback(parsed, expectedFormat, expectedStage);

  const formatLabel = parsed?.format ? FORMAT_LABEL[parsed.format] || parsed.format.toUpperCase() : "";
  const stageLabel = parsed?.stage ? STAGE_LABEL[parsed.stage] || parsed.stage.toUpperCase() : "";
  const label = parsed ? (stageLabel ? `${formatLabel}/${stageLabel}` : formatLabel) : emptyText;
  const title = parsed?.raw || emptyText;

  return (
    <span
      className={joinClassNames(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5",
        !parsed
          ? "border-slate-200 bg-slate-100 text-slate-600"
          : fallback
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700",
        className
      )}
      title={title}
    >
      {label}
    </span>
  );
}

