"use client";

import { useMemo, useState } from "react";
import type { BodyRecord } from "@/lib/types";
import { Card, Segmented } from "@/components/ui";

/**
 * 인바디 추세. 체중 / 체지방률 / 골격근량을 시간축 라인으로.
 * 점을 탭하면 값이 보이고, 처음·마지막은 항상 라벨. 기록 2개부터 의미 있음.
 */

type Metric = "weight" | "bodyFatPct" | "skeletalMuscle";

const METRIC: Record<Metric, { label: string; unit: string; color: string; betterDown?: boolean }> = {
  weight: { label: "체중", unit: "kg", color: "var(--ink)" },
  bodyFatPct: { label: "체지방률", unit: "%", color: "var(--fat)", betterDown: true },
  skeletalMuscle: { label: "골격근량", unit: "kg", color: "var(--protein)" },
};

const W = 320;
const H = 120;
const PAD = { l: 8, r: 8, t: 14, b: 6 };

function dayNum(day: string) {
  return new Date(day + "T00:00:00").getTime() / 86_400_000;
}
function fmtShort(day: string) {
  return `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;
}
function fmt1(v: number) {
  return (Math.round(v * 10) / 10).toString();
}

export default function BodyTrend({ records }: { records: BodyRecord[] }) {
  // 최신순으로 들어오니 시간순으로 뒤집는다
  const rows = useMemo(() => [...records].sort((a, b) => (a.measuredOn < b.measuredOn ? -1 : 1)), [records]);
  const hasMuscle = rows.filter((r) => r.skeletalMuscle !== undefined).length >= 2;
  const [metric, setMetric] = useState<Metric>("weight");
  const [sel, setSel] = useState<number | null>(null);
  const m = METRIC[metric];

  const pts = useMemo(() => {
    const list = rows.map((r) => ({ day: r.measuredOn, v: r[metric] })).filter((p): p is { day: string; v: number } => typeof p.v === "number");
    if (list.length < 2) return [];
    const xs = list.map((p) => dayNum(p.day));
    const vs = list.map((p) => p.v);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const vmin = Math.min(...vs);
    const vmax = Math.max(...vs);
    const span = Math.max(vmax - vmin, metric === "bodyFatPct" ? 2 : 1.5); // 변화가 작아도 납작하지 않게
    const mid = (vmax + vmin) / 2;
    const lo = mid - span / 2 - span * 0.15;
    const hi = mid + span / 2 + span * 0.15;
    return list.map((p, i) => ({
      ...p,
      x: PAD.l + ((xs[i] - x0) / Math.max(1, x1 - x0)) * (W - PAD.l - PAD.r),
      y: PAD.t + (1 - (p.v - lo) / (hi - lo)) * (H - PAD.t - PAD.b),
    }));
  }, [rows, metric]);

  if (rows.length < 2) return null;

  const first = pts[0];
  const last = pts[pts.length - 1];
  const delta = first && last ? last.v - first.v : 0;
  const good = delta === 0 ? null : m.betterDown ? delta < 0 : delta > 0;
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = pts.length ? `${path} L${last.x.toFixed(1)},${H} L${first.x.toFixed(1)},${H} Z` : "";

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px]" style={{ color: "var(--muted)" }}>
            {m.label} 추세
          </div>
          <div className="num text-[24px] font-bold leading-tight">
            {last ? fmt1(last.v) : "—"}
            <span className="ml-0.5 text-[12px] font-normal" style={{ color: "var(--muted)" }}>
              {m.unit}
            </span>
          </div>
          <div className="num text-[11px]" style={{ color: good === null ? "var(--muted)" : good ? "var(--ok)" : "var(--over)" }}>
            {first && last && delta !== 0 ? `${delta > 0 ? "▲" : "▼"}${fmt1(Math.abs(delta))}${m.unit} · ${fmtShort(first.day)} 이후` : "변화 없음"}
          </div>
        </div>
        <div className="w-44 shrink-0">
          <Segmented<Metric>
            value={metric}
            onChange={(v) => {
              setMetric(v);
              setSel(null);
            }}
            options={[
              { value: "weight", label: "체중" },
              { value: "bodyFatPct", label: "체지방" },
              ...(hasMuscle ? [{ value: "skeletalMuscle" as const, label: "근육" }] : []),
            ]}
          />
        </div>
      </div>

      {pts.length >= 2 ? (
        <div className="mt-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${m.label} 추세 ${pts.length}개 기록`}>
            <defs>
              <linearGradient id={`bt-${metric}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={m.color} stopOpacity="0.14" />
                <stop offset="1" stopColor={m.color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#bt-${metric})`} />
            <path d={path} fill="none" stroke={m.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => {
              const isLast = i === pts.length - 1;
              const show = sel === i || (sel === null && (i === 0 || isLast));
              return (
                <g key={p.day}>
                  {show && (
                    <text x={p.x} y={p.y - 7} textAnchor={i === 0 ? "start" : isLast ? "end" : "middle"} fontSize="10" fontWeight="600" fill="var(--ink)" className="num">
                      {fmt1(p.v)}
                    </text>
                  )}
                  <circle cx={p.x} cy={p.y} r={isLast || sel === i ? 4 : 2.5} fill={isLast || sel === i ? m.color : "var(--card)"} stroke={m.color} strokeWidth="1.5" />
                  {/* 탭 영역 */}
                  <rect x={p.x - 14} y={0} width={28} height={H} fill="transparent" onClick={() => setSel(sel === i ? null : i)} style={{ cursor: "pointer" }} />
                </g>
              );
            })}
          </svg>
          <div className="num mt-1 flex justify-between text-[10px]" style={{ color: "var(--muted)" }}>
            <span>{fmtShort(first.day)}</span>
            {sel !== null && sel !== 0 && sel !== pts.length - 1 && <span style={{ color: "var(--ink)" }}>{fmtShort(pts[sel].day)}</span>}
            <span>{fmtShort(last.day)}</span>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[12px]" style={{ color: "var(--muted)" }}>
          {m.label} 기록이 2개 이상이면 그래프가 그려져.
        </p>
      )}
    </Card>
  );
}
