"use client";

import { useMemo, useState } from "react";
import { GROUPS, MUSCLE_KO, exercise, oneRm } from "@/lib/exercises";
import { shiftDay, todayStr, type WorkoutSet } from "@/lib/types";
import { Card } from "./ui";

/**
 * 운동 분석. 라이브러리 없이 SVG/CSS.
 * 1. 이번 주 요약 (세트·볼륨·운동일, 지난 주 대비)
 * 2. 주간 분할표 — 부위 × 요일, 세트 수로 농도
 * 3. 주간 볼륨 8주 — 얇은 컬럼, 현재 주만 강조
 * 4. 종목별 1RM 추세 — 스파크라인
 */

const DOW = ["월", "화", "수", "목", "금", "토", "일"];

function weekStart(day: string) {
  const d = new Date(day + "T00:00:00");
  const dow = (d.getDay() + 6) % 7; // 월=0
  return shiftDay(day, -dow);
}

const fmtVol = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${Math.round(v)}`);

export default function WorkoutCharts({ sets }: { sets: WorkoutSet[] }) {
  const today = todayStr();
  const thisWeek = weekStart(today);
  const lastWeek = shiftDay(thisWeek, -7);
  const [hover, setHover] = useState<number | null>(null);

  const data = useMemo(() => {
    const inRange = (s: WorkoutSet, from: string, to: string) => s.doneOn >= from && s.doneOn <= to;

    // 주간 요약
    const summarize = (from: string, to: string) => {
      const list = sets.filter((s) => inRange(s, from, to));
      return {
        sets: list.length,
        volume: list.reduce((v, s) => v + s.weight * s.reps, 0),
        days: new Set(list.map((s) => s.doneOn)).size,
      };
    };
    const cur = summarize(thisWeek, today);
    const prev = summarize(lastWeek, shiftDay(thisWeek, -1));

    // 분할표: group → [월..일] 세트 수, 이번 주 / 지난 주 합
    const grid = GROUPS.map((g) => {
      const cells = DOW.map((_, i) => {
        const day = shiftDay(thisWeek, i);
        return sets.filter((s) => s.doneOn === day && exercise(s.exerciseId).group === g).length;
      });
      const prevTotal = sets.filter((s) => inRange(s, lastWeek, shiftDay(thisWeek, -1)) && exercise(s.exerciseId).group === g).length;
      return { group: g, cells, total: cells.reduce((a, b) => a + b, 0), prevTotal };
    });
    const gridMax = Math.max(1, ...grid.flatMap((r) => r.cells));

    // 주간 볼륨 8주
    const weeks: { start: string; volume: number; days: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = shiftDay(thisWeek, -7 * i);
      const end = shiftDay(start, 6);
      const list = sets.filter((s) => inRange(s, start, end));
      weeks.push({ start, volume: list.reduce((v, s) => v + s.weight * s.reps, 0), days: new Set(list.map((s) => s.doneOn)).size });
    }

    // 종목별 세션 최고 e1RM
    const byEx = new Map<string, Map<string, number>>();
    for (const s of sets) {
      const m = byEx.get(s.exerciseId) ?? new Map<string, number>();
      m.set(s.doneOn, Math.max(m.get(s.doneOn) ?? 0, oneRm(s.weight, s.reps)));
      byEx.set(s.exerciseId, m);
    }
    const trends = [...byEx.entries()]
      .map(([id, m]) => ({ id, pts: [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)) }))
      .filter((t) => t.pts.length >= 2)
      .sort((a, b) => b.pts.length - a.pts.length)
      .slice(0, 6);

    // 이번 주 근육 단위
    const muscles = new Map<string, number>();
    for (const s of sets) {
      if (s.doneOn < thisWeek) continue;
      const ex = exercise(s.exerciseId);
      muscles.set(ex.muscle, (muscles.get(ex.muscle) ?? 0) + 1);
    }
    const muscleList = [...muscles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

    return { cur, prev, grid, gridMax, weeks, trends, muscleList };
  }, [sets, thisWeek, lastWeek, today]);

  const maxVol = Math.max(1, ...data.weeks.map((w) => w.volume));
  const maxIdx = data.weeks.reduce((mi, w, i, arr) => (w.volume > arr[mi].volume ? i : mi), 0);
  const todayDow = (new Date(today + "T00:00:00").getDay() + 6) % 7;

  return (
    <div className="space-y-3">
      {/* 1. 이번 주 요약 */}
      <Card>
        <div className="flex items-baseline justify-between">
          <h3 className="text-[15px] font-semibold">이번 주</h3>
          <span className="text-[12px]" style={{ color: "var(--muted)" }}>
            {fmtShort(thisWeek)} – {fmtShort(shiftDay(thisWeek, 6))}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat label="세트" value={String(data.cur.sets)} delta={data.cur.sets - data.prev.sets} />
          <Stat label="볼륨" value={fmtVol(data.cur.volume)} delta={data.cur.volume - data.prev.volume} fmt={fmtVol} />
          <Stat label="운동일" value={`${data.cur.days}`} delta={data.cur.days - data.prev.days} />
        </div>
      </Card>

      {/* 2. 주간 분할표 */}
      <Card>
        <div className="flex items-baseline justify-between">
          <h3 className="text-[15px] font-semibold">부위별 분할</h3>
          <span className="text-[12px]" style={{ color: "var(--muted)" }}>
            칸 = 그 날 세트 수
          </span>
        </div>
        <div className="mt-3">
          <div className="grid items-center gap-x-1 gap-y-1.5" style={{ gridTemplateColumns: "2.4rem repeat(7, minmax(0, 1fr)) 3.6rem" }}>
            <span />
            {DOW.map((d, i) => (
              <span
                key={d}
                className="text-center text-[11px]"
                style={{ color: i === todayDow ? "var(--ink)" : "var(--muted)", fontWeight: i === todayDow ? 600 : 400 }}
              >
                {d}
              </span>
            ))}
            <span className="text-right text-[11px]" style={{ color: "var(--muted)" }}>
              주간
            </span>
            {data.grid.map((row) => (
              <Row key={row.group} row={row} max={data.gridMax} todayDow={todayDow} />
            ))}
          </div>
        </div>
        {data.muscleList.length > 0 && (
          <div className="hairline mt-4 flex flex-wrap gap-1.5 pt-3">
            {data.muscleList.map(([m, n]) => (
              <span key={m} className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: "var(--card-2)" }}>
                {MUSCLE_KO[m as keyof typeof MUSCLE_KO] ?? m} <b className="num">{n}</b>
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* 3. 주간 볼륨 */}
      <Card>
        <div className="flex items-baseline justify-between">
          <h3 className="text-[15px] font-semibold">주간 볼륨</h3>
          <span className="text-[12px]" style={{ color: "var(--muted)" }}>
            최근 8주 · 무게 × 횟수
          </span>
        </div>
        <div className="relative mt-5" onMouseLeave={() => setHover(null)}>
          <div className="flex h-28 items-end gap-2" style={{ borderBottom: "1px solid var(--line)" }}>
            {data.weeks.map((w, i) => {
              const isCur = i === data.weeks.length - 1;
              const h = w.volume ? Math.max(4, (w.volume / maxVol) * 100) : 0;
              const labeled = isCur || i === maxIdx;
              return (
                <button
                  key={w.start}
                  type="button"
                  className="relative flex h-full flex-1 flex-col items-center justify-end"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onClick={() => setHover(hover === i ? null : i)}
                  aria-label={`${fmtShort(w.start)} 주 볼륨 ${Math.round(w.volume).toLocaleString()}kg`}
                >
                  {(labeled || hover === i) && w.volume > 0 && (
                    <span className="num mb-1 text-[11px]" style={{ color: hover === i ? "var(--ink)" : "var(--muted)" }}>
                      {fmtVol(w.volume)}
                    </span>
                  )}
                  <span
                    className="w-full max-w-[24px]"
                    style={{
                      height: `${h}%`,
                      background: isCur || hover === i ? "var(--ink)" : "var(--line)",
                      borderRadius: "4px 4px 0 0",
                      transition: "background 120ms",
                    }}
                  />
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 flex gap-2">
            {data.weeks.map((w, i) => (
              <span key={w.start} className="num flex-1 text-center text-[10px]" style={{ color: i === data.weeks.length - 1 ? "var(--ink)" : "var(--muted)" }}>
                {fmtShort(w.start)}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* 4. 종목별 추세 */}
      <Card>
        <div className="flex items-baseline justify-between">
          <h3 className="text-[15px] font-semibold">종목별 추세</h3>
          <span className="text-[12px]" style={{ color: "var(--muted)" }}>
            세션 최고 세트 기준 1RM
          </span>
        </div>
        {data.trends.length === 0 ? (
          <p className="mt-2 text-[13px]" style={{ color: "var(--muted)" }}>
            같은 종목을 2번 이상 하면 추세가 보여.
          </p>
        ) : (
          <div className="mt-1">
            {data.trends.map((t) => {
              const first = t.pts[0][1];
              const last = t.pts[t.pts.length - 1][1];
              const delta = Math.round(last - first);
              return (
                <div key={t.id} className="hairline flex items-center gap-3 py-3 first:border-t-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{exercise(t.id).ko}</div>
                    <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                      {t.pts.length}회 · {fmtShort(t.pts[0][0])}부터
                    </div>
                  </div>
                  <Sparkline points={t.pts.map((p) => p[1])} />
                  <div className="w-16 text-right">
                    <div className="text-[15px] font-bold">
                      {Math.round(last)}
                      <span className="text-[11px] font-normal" style={{ color: "var(--muted)" }}>
                        kg
                      </span>
                    </div>
                    <div className="num text-[11px]" style={{ color: delta > 0 ? "var(--ok)" : "var(--muted)" }}>
                      {delta > 0 ? "+" : ""}
                      {delta}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function fmtShort(day: string) {
  return `${Number(day.slice(5, 7))}/${Number(day.slice(8))}`;
}

function Stat({ label, value, delta, fmt }: { label: string; value: string; delta: number; fmt?: (v: number) => string }) {
  const d = fmt ? fmt(Math.abs(delta)) : String(Math.abs(delta));
  return (
    <div>
      <div className="text-[12px]" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div className="text-[24px] font-bold leading-tight">{value}</div>
      <div className="text-[11px]" style={{ color: delta > 0 ? "var(--ok)" : "var(--muted)" }}>
        {delta === 0 ? "지난주 같음" : `${delta > 0 ? "▲" : "▼"}${d} 지난주`}
      </div>
    </div>
  );
}

function Row({ row, max, todayDow }: { row: { group: string; cells: number[]; total: number; prevTotal: number }; max: number; todayDow: number }) {
  const diff = row.total - row.prevTotal;
  return (
    <>
      <span className="text-[12px]" style={{ color: row.total ? "var(--ink)" : "var(--muted)" }}>
        {row.group}
      </span>
      {row.cells.map((n, i) => {
        const future = i > todayDow;
        const a = n ? 0.25 + 0.75 * (n / max) : 0;
        return (
          <span
            key={i}
            className="num flex h-7 items-center justify-center rounded-md text-[11px] font-semibold"
            style={{
              background: n ? `rgba(17,17,17,${a.toFixed(2)})` : "var(--card-2)",
              color: n ? (a > 0.55 ? "#fff" : "var(--ink)") : "transparent",
              opacity: future ? 0.4 : 1,
            }}
            title={n ? `${DOW[i]} ${n}세트` : undefined}
          >
            {n || ""}
          </span>
        );
      })}
      <span className="num text-right text-[12px]">
        <b>{row.total}</b>
        {diff !== 0 && (
          <span className="ml-1 text-[10px]" style={{ color: diff > 0 ? "var(--ok)" : "var(--muted)" }}>
            {diff > 0 ? "▲" : "▼"}
            {Math.abs(diff)}
          </span>
        )}
      </span>
    </>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 76;
  const h = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const xs = points.map((_, i) => (points.length === 1 ? w / 2 : (i / (points.length - 1)) * (w - 8) + 4));
  const ys = points.map((p) => h - 4 - ((p - min) / span) * (h - 8));
  const d = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const lx = xs[xs.length - 1];
  const ly = ys[ys.length - 1];
  return (
    <svg width={w} height={h} aria-hidden>
      <path d={d} fill="none" stroke="var(--line)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <path d={d} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeOpacity="0.9" />
      <circle cx={lx} cy={ly} r="5" fill="var(--card)" />
      <circle cx={lx} cy={ly} r="3.5" fill="var(--ink)" />
    </svg>
  );
}
