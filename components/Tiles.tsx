"use client";

import { useState } from "react";
import { sodiumStatus } from "@/lib/macros";

/**
 * 홈 상단 2×2 타일. 픽토그램 + 큰 숫자 + 미니 시각화.
 * 칼로리(링) · 물(링) · 단백질(7일 막대) · 운동(최근 세션 스파크라인)
 */

export function Tile({
  icon,
  label,
  value,
  unit,
  sub,
  viz,
  onClick,
  active,
  color = "var(--ink)",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  sub?: React.ReactNode;
  viz: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  /** 아이콘 + 라벨 색. 숫자는 항상 검정. */
  color?: string;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="card flex flex-col justify-between p-4 text-left"
      style={{ minHeight: 132, border: active ? `1.5px solid ${color}` : "1.5px solid transparent" }}
    >
      <div className="flex items-center gap-2 text-[14px] font-semibold" style={{ color }}>
        <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
        {label}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[26px] font-bold leading-none tracking-tight">{value}</div>
          <div className="mt-1 text-[12px]" style={{ color: "var(--muted)" }}>
            {unit}
          </div>
          {sub && <div className="mt-0.5 text-[11px]">{sub}</div>}
        </div>
        <div className="shrink-0">{viz}</div>
      </div>
    </Comp>
  );
}

/* ---------- 미니 시각화 ---------- */

export function RingMini({ ratio, color, size = 56 }: { ratio: number; color: string; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, ratio));
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--card-2)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - p)}
        style={{ transition: "stroke-dashoffset 500ms cubic-bezier(.2,.7,.2,1)" }}
      />
    </svg>
  );
}

/** 7일 막대. 마지막이 오늘(진하게), 나머지 옅게. target 기준 높이. */
export function BarsMini({
  values,
  target,
  width = 64,
  height = 44,
  color = "var(--ink)",
}: {
  values: number[];
  target: number | null;
  width?: number;
  height?: number;
  color?: string;
}) {
  const max = Math.max(target ?? 0, ...values, 1);
  const n = values.length;
  const gap = 3;
  const bw = Math.max(3, (width - gap * (n - 1)) / n);
  return (
    <svg width={width} height={height} aria-hidden>
      {values.map((v, i) => {
        const h = v ? Math.max(4, (v / max) * height) : 3;
        const last = i === n - 1;
        return (
          <rect
            key={i}
            x={i * (bw + gap)}
            y={height - h}
            width={bw}
            height={h}
            rx={bw / 2}
            fill={v ? color : "var(--card-2)"}
            fillOpacity={last || !v ? 1 : 0.28}
          />
        );
      })}
      {target !== null && target > 0 && (
        <line x1="0" x2={width} y1={height - (target / max) * height} y2={height - (target / max) * height} stroke="var(--ink)" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 2" />
      )}
    </svg>
  );
}

/** 스파크라인 + 옅은 면. 마지막 점 강조. */
export function SparkMini({
  values,
  width = 72,
  height = 44,
  color = "var(--ink)",
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length === 0) {
    return (
      <svg width={width} height={height} aria-hidden>
        <line x1="2" x2={width - 2} y1={height - 6} y2={height - 6} stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  const pts = values.length === 1 ? [values[0], values[0]] : values;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const xs = pts.map((_, i) => 4 + (i / (pts.length - 1)) * (width - 8));
  const ys = pts.map((v) => height - 6 - ((v - min) / span) * (height - 14));
  // 부드러운 곡선 (catmull-rom → bezier 근사)
  let d = `M${xs[0]},${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const cx = (xs[i] + xs[i + 1]) / 2;
    d += ` C${cx},${ys[i]} ${cx},${ys[i + 1]} ${xs[i + 1]},${ys[i + 1]}`;
  }
  const area = `${d} L${xs[xs.length - 1]},${height} L${xs[0]},${height} Z`;
  return (
    <svg width={width} height={height} aria-hidden>
      <path d={area} fill={color} fillOpacity="0.1" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="4.5" fill="var(--card)" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill={color} />
    </svg>
  );
}

/* ---------- 탄수·지방·나트륨 한 줄 ---------- */

export function MacroStrip({
  carbs,
  fat,
  sodium,
  target,
}: {
  carbs: number;
  fat: number;
  sodium: number;
  target: { carbs: number; fat: number } | null;
}) {
  const na = sodiumStatus(sodium);
  const items = [
    { label: "탄수화물", v: Math.round(carbs), t: target?.carbs, unit: "g", color: "var(--carb)" },
    { label: "지방", v: Math.round(fat), t: target?.fat, unit: "g", color: "var(--fat)" },
    { label: "나트륨", v: Math.round(sodium), t: 2300, unit: "mg", color: na === "ok" ? "var(--ink)" : `var(--${na})`, cap: true },
  ];
  return (
    <div className="card px-5 py-4">
      <div className="space-y-3">
        {items.map((it) => {
          const pct = it.t ? Math.min(100, (it.v / it.t) * 100) : 0;
          return (
            <div key={it.label} className="grid items-center gap-3" style={{ gridTemplateColumns: "3.6rem 1fr auto" }}>
              <span className="text-[12px]" style={{ color: "var(--muted)" }}>
                {it.label}
              </span>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--card-2)" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: it.color, opacity: it.cap && na === "ok" ? 0.25 : 1 }} />
              </div>
              <span className="num text-right text-[13px] font-semibold" style={{ minWidth: "5.5rem" }}>
                {it.v.toLocaleString()}
                <span className="font-normal" style={{ color: "var(--muted)" }}>
                  {it.cap ? ` ${it.unit}` : ` / ${it.t ?? "—"}${it.unit}`}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 물 추가 칩 (물 타일 누르면 펼침) ---------- */

const WATER_STEPS = [250, 500, 1000] as const;

export function WaterChips({ water, onWater }: { water: number; onWater: (ml: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const commit = () => {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n) && n >= 0) onWater(n);
    setEditing(false);
  };
  return (
    <div className="card flex items-center gap-2 px-3 py-2.5">
      <button
        type="button"
        onClick={() => onWater(Math.max(0, water - 250))}
        className="h-8 w-8 shrink-0 rounded-full text-base"
        style={{ background: "var(--card-2)" }}
        aria-label="물 250mL 빼기"
        disabled={water <= 0}
      >
        −
      </button>
      {WATER_STEPS.map((ml) => (
        <button
          key={ml}
          type="button"
          onClick={() => onWater(water + ml)}
          className="num h-8 flex-1 rounded-full text-[12px] font-semibold"
          style={{ background: "var(--ok-soft)", color: "var(--water)" }}
        >
          +{ml >= 1000 ? `${ml / 1000}L` : `${ml}mL`}
        </button>
      ))}
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            commit();
          }}
        >
          <input
            autoFocus
            inputMode="numeric"
            className="num h-8 w-16 rounded-full px-2 text-center text-[12px] font-semibold outline-none"
            style={{ background: "var(--card-2)" }}
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
            onBlur={commit}
            aria-label="물 총량 mL"
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(String(water));
            setEditing(true);
          }}
          className="h-8 shrink-0 rounded-full px-3 text-[12px]"
          style={{ background: "var(--card-2)", color: "var(--muted)" }}
        >
          직접
        </button>
      )}
    </div>
  );
}

/* ---------- 픽토그램 ---------- */

const ico = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function FlameIcon() {
  return (
    <svg {...ico} aria-hidden>
      <path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.2.4-2.2 1-3 .3 1.2 1 2 2 2.3C11.5 9 11 6 12 3z" fill="currentColor" stroke="none" />
      <path d="M8 15.5a4 4 0 0 0 8 0" />
    </svg>
  );
}
export function DropIcon() {
  return (
    <svg {...ico} aria-hidden>
      <path d="M12 3.5s6 6.3 6 10.3a6 6 0 0 1-12 0c0-4 6-10.3 6-10.3z" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function EggIcon() {
  return (
    <svg {...ico} aria-hidden>
      <path d="M12 3c3.5 0 6.5 5 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8 8.5 3 12 3z" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function DumbbellIcon() {
  return (
    <svg {...ico} aria-hidden>
      <path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12" strokeWidth="2.4" />
    </svg>
  );
}
