"use client";

import { useEffect } from "react";

/* ---------- 버튼 ---------- */

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 font-semibold rounded-[var(--r-md)] transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100";
  const sizes = { sm: "h-9 px-3 text-sm", md: "h-12 px-4 text-[15px]", lg: "h-14 px-5 text-base" }[size];
  const style: React.CSSProperties =
    variant === "primary"
      ? { background: "var(--accent)", color: "var(--accent-ink)" }
      : variant === "secondary"
        ? { background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)" }
        : variant === "danger"
          ? { background: "var(--danger-soft)", color: "var(--danger)" }
          : { background: "transparent", color: "var(--muted)" };
  return (
    <button className={`${base} ${sizes} ${className}`} style={style} {...rest}>
      {children}
    </button>
  );
}

/* ---------- 카드 ---------- */

export function Card({
  children,
  className = "",
  pad = true,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <section className={`card ${pad ? "p-5" : ""} ${className}`} style={style}>
      {children}
    </section>
  );
}

/* ---------- 입력 ---------- */

export function Field({
  label,
  unit,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  autoFocus,
}: {
  label?: string;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "date" | "number";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-[13px]" style={{ color: "var(--muted)" }}>
          {label}
        </span>
      )}
      <div
        className="field flex items-center rounded-[var(--r-md)] px-3.5"
        style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}
      >
        <input
          type={type}
          inputMode={inputMode ?? (type === "date" ? undefined : "decimal")}
          className="w-full bg-transparent py-3 outline-none"
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit && (
          <span className="ml-1 text-[13px]" style={{ color: "var(--muted)" }}>
            {unit}
          </span>
        )}
      </div>
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div
      className="grid gap-1 rounded-[var(--r-md)] p-1"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        background: "var(--card-2)",
        border: "1px solid var(--line)",
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="rounded-[12px] py-2 text-sm font-medium transition"
            style={{
              background: active ? "var(--card)" : "transparent",
              color: active ? "var(--ink)" : "var(--muted)",
              boxShadow: active ? "0 1px 2px rgba(31,27,22,0.08)" : "none",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- 스테퍼 (운동 세트 입력) ---------- */

export function Stepper({
  label,
  value,
  step,
  min = 0,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const btn =
    "h-10 w-10 shrink-0 rounded-full text-lg font-medium flex items-center justify-center active:scale-95 transition";
  return (
    <div className="flex flex-col items-center">
      <span className="mb-2 text-[13px]" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={btn}
          style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}
          onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
          aria-label={`${label} 줄이기`}
        >
          −
        </button>
        <input
          inputMode="decimal"
          className="num w-16 bg-transparent text-center text-[28px] font-bold outline-none"
          value={Number.isInteger(value) ? value : value.toFixed(1)}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
        />
        <button
          type="button"
          className={btn}
          style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}
          onClick={() => onChange(+(value + step).toFixed(2))}
          aria-label={`${label} 늘리기`}
        >
          +
        </button>
      </div>
      {unit && (
        <span className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
          {unit}
        </span>
      )}
    </div>
  );
}

/* ---------- 바텀시트 ---------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  tall?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal>
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0"
        style={{ background: "rgba(31,27,22,0.35)" }}
        onClick={onClose}
      />
      <div
        className={`sheet-enter relative w-full max-w-[480px] overflow-y-auto rounded-t-[28px] ${tall ? "h-[92dvh]" : "max-h-[88dvh]"}`}
        style={{ background: "var(--bg)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="sticky top-0 z-10 px-5 pt-3" style={{ background: "var(--bg)" }}>
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full" style={{ background: "var(--line)" }} />
          {title && (
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-lg font-bold">{title}</h2>
              <button type="button" onClick={onClose} className="text-sm" style={{ color: "var(--muted)" }}>
                닫기
              </button>
            </div>
          )}
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

/* ---------- 빈 상태 ---------- */

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-10 text-center">
      <div className="text-[15px] font-semibold">{title}</div>
      {body && (
        <div className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          {body}
        </div>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
