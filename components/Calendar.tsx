"use client";

import { useState } from "react";
import type { DayTotal } from "@/lib/types";
import { shiftDay, todayStr } from "@/lib/types";

export type DayStatus = "ok" | "warn" | "over" | "low" | null;

/** 링이랑 같은 기준. 과거 날짜는 "덜 먹음"도 구분. */
export function dayStatus(kcal: number, target: number | null, isToday: boolean): DayStatus {
  if (!target || kcal <= 0) return null;
  if (kcal > target) return "over";
  const remaining = target - kcal;
  if (remaining <= target * 0.15) return "ok"; // 목표 근처 = 잘 먹음
  if (isToday) return "ok"; // 오늘은 아직 진행 중
  return remaining <= target * 0.3 ? "warn" : "low";
}

const STATUS_COLOR: Record<Exclude<DayStatus, null>, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  over: "var(--over)",
  low: "var(--line)",
};

export function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const first = `${ym}-01`;
  const lastDate = new Date(y, m, 0).getDate();
  return { first, last: `${ym}-${String(lastDate).padStart(2, "0")}`, lastDate, y, m };
}

export function ymOf(day: string) {
  return day.slice(0, 7);
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Calendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  totals,
  target,
  defaultExpanded = false,
}: {
  month: string; // YYYY-MM
  onMonthChange: (ym: string) => void;
  selected: string;
  onSelect: (day: string) => void;
  totals: Map<string, DayTotal>;
  target: number | null;
  /** 시트 안에서 쓸 때 월 전체를 바로 펼침 */
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const today = todayStr();
  const { lastDate, y, m } = monthRange(month);
  const firstDow = new Date(y, m - 1, 1).getDay(); // 0=일

  // 셀 배열: 앞 빈칸 + 날짜
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // 접힌 상태: 선택일이 있는 주만. 선택일이 다른 달이면 첫 주.
  const selWeek = weeks.find((w) => w.includes(selected)) ?? weeks.find((w) => w.includes(today)) ?? weeks[0];
  const shown = expanded ? weeks : [selWeek];

  const goPrevWeek = () => {
    const d = shiftDay(selected, -7);
    if (ymOf(d) !== month) onMonthChange(ymOf(d));
    onSelect(d);
  };
  const goNextWeek = () => {
    const d = shiftDay(selected, 7);
    if (d > today) return;
    if (ymOf(d) !== month) onMonthChange(ymOf(d));
    onSelect(d);
  };

  const nav = "flex h-8 w-8 items-center justify-center rounded-full text-base";
  const monthLabel = `${y}년 ${m}월`;

  return (
    <section className="card px-3 pb-3 pt-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <button type="button" className={nav} style={{ background: "var(--card-2)" }} onClick={() => (expanded ? onMonthChange(shiftMonth(month, -1)) : goPrevWeek())} aria-label="이전">
          ‹
        </button>
        <button type="button" className="flex items-center gap-1 text-[15px] font-semibold" onClick={() => setExpanded((v) => !v)}>
          {monthLabel}
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>
            {expanded ? "▴" : "▾"}
          </span>
        </button>
        <button
          type="button"
          className={nav}
          style={{ background: "var(--card-2)", opacity: !expanded && shiftDay(selected, 7) > today ? 0.3 : month >= ymOf(today) && expanded ? 0.3 : 1 }}
          onClick={() => (expanded ? month < ymOf(today) && onMonthChange(shiftMonth(month, 1)) : goNextWeek())}
          aria-label="다음"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px]" style={{ color: "var(--muted)" }}>
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {shown.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day, di) => {
            if (!day) return <div key={di} />;
            const t = totals.get(day);
            const isToday = day === today;
            const isSel = day === selected;
            const future = day > today;
            const st = t ? dayStatus(t.kcal, target, isToday) : null;
            const worked = (t?.sets ?? 0) > 0;
            return (
              <button
                key={day}
                type="button"
                disabled={future}
                onClick={() => onSelect(day)}
                className="flex flex-col items-center gap-1 py-1.5"
                style={{ opacity: future ? 0.3 : 1 }}
                aria-label={day}
                aria-current={isToday ? "date" : undefined}
              >
                <span
                  className="num flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-semibold"
                  style={{
                    background: isSel ? "var(--accent)" : "transparent",
                    color: isSel ? "var(--accent-ink)" : "var(--ink)",
                    boxShadow: isToday && !isSel ? "inset 0 0 0 1.5px var(--accent)" : "none",
                  }}
                >
                  {Number(day.slice(8))}
                </span>
                <span className="flex h-1.5 items-center gap-0.5">
                  {st && <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[st] }} />}
                  {worked && <span className="h-1.5 w-3 rounded-full" style={{ background: "var(--ink)" }} />}
                </span>
              </button>
            );
          })}
        </div>
      ))}

      {expanded && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px]" style={{ color: "var(--muted)" }}>
          <Legend color="var(--ok)">목표 근처</Legend>
          <Legend color="var(--warn)">조금 모자람</Legend>
          <Legend color="var(--over)">초과</Legend>
          <Legend color="var(--line)">많이 모자람</Legend>
          <Legend color="var(--ink)" wide>
            운동
          </Legend>
        </div>
      )}
    </section>
  );
}

function Legend({ color, children, wide }: { color: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-1.5 rounded-full ${wide ? "w-3" : "w-1.5"}`} style={{ background: color }} />
      {children}
    </span>
  );
}
