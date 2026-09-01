import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClaimStatus, MatchLevel, ReportStatus } from "@/lib/types";
import {
  CLAIM_STATUS_META,
  MATCH_LEVEL_META,
  REPORT_STATUS_META,
  reportStatusLabel,
} from "@/lib/constants";

// ----------------------------------------------------------------
// Button
// ----------------------------------------------------------------

const BUTTON_VARIANTS = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm disabled:bg-brand-300",
  secondary:
    "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 shadow-sm",
  dark: "bg-ink-900 text-white hover:bg-ink-800 shadow-sm",
  amber:
    "bg-amber-400 text-amber-950 hover:bg-amber-300 active:bg-amber-500 shadow-sm font-semibold",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 shadow-sm disabled:bg-rose-300",
  "danger-outline":
    "bg-white text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 shadow-sm",
} as const;

const BUTTON_SIZES = {
  sm: "h-9 px-3 text-xs gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
} as const;

type ButtonBaseProps = {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  loading?: boolean;
};

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: ButtonBaseProps & { className?: string }) {
  return cn(
    "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 cursor-pointer select-none whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonBaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  href,
  children,
}: ButtonBaseProps & {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass({ variant, size, className })}>
      {children}
    </Link>
  );
}

// ----------------------------------------------------------------
// Card & layout
// ----------------------------------------------------------------

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-soft",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

// ----------------------------------------------------------------
// Form primitives
// ----------------------------------------------------------------

export function Label({
  htmlFor,
  children,
  optional,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-slate-700"
    >
      {children}
      {optional && (
        <span className="ml-1.5 text-xs font-normal text-slate-400">
          (opsional)
        </span>
      )}
    </label>
  );
}

const FIELD_CLASS =
  "w-full rounded-xl border-0 bg-white px-3.5 py-3 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 transition-shadow focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_CLASS, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(FIELD_CLASS, "min-h-24 resize-y", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        FIELD_CLASS,
        "appearance-none pr-9 cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>;
}

export function Help({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-slate-400">{children}</p>;
}

// ----------------------------------------------------------------
// Badges
// ----------------------------------------------------------------

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ReportStatusBadge({
  status,
  type,
}: {
  status: ReportStatus;
  type: "LOST" | "FOUND";
}) {
  const meta = REPORT_STATUS_META[status];
  return (
    <Badge className={meta.className}>{reportStatusLabel(status, type)}</Badge>
  );
}

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  const meta = CLAIM_STATUS_META[status];
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

export function MatchLevelBadge({ level }: { level: MatchLevel }) {
  const meta = MATCH_LEVEL_META[level];
  return (
    <Badge className={cn(meta.className, "uppercase tracking-wide")}>
      {meta.label}
    </Badge>
  );
}

export function DemoBadge() {
  return (
    <Badge className="bg-slate-100 text-slate-500 ring-slate-200">DEMO</Badge>
  );
}

// ----------------------------------------------------------------
// States
// ----------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-14 text-center">
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-slate-200/70", className)}
    />
  );
}

// ----------------------------------------------------------------
// Score ring (SVG melingkar untuk match score)
// ----------------------------------------------------------------

export function ScoreRing({
  score,
  size = 96,
  strokeWidth = 8,
  className,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);
  const color =
    score >= 85
      ? "#059669"
      : score >= 70
        ? "#d97706"
        : score >= 50
          ? "#0284c7"
          : "#94a3b8";
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-slate-900">
          {Math.round(score)}
          <span className="text-xs font-bold text-slate-400">%</span>
        </span>
      </div>
    </div>
  );
}
