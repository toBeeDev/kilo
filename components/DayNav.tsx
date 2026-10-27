"use client";

import { useCallback, useEffect, useState } from "react";
import { useRepo } from "@/lib/repo-provider";
import { calcTarget } from "@/lib/macros";
import { shiftDay, todayStr, type DayTotal } from "@/lib/types";
import Calendar, { monthRange, ymOf } from "@/components/Calendar";
import { Sheet } from "@/components/ui";

/**
 * 식단/운동 탭 공용 날짜 네비.
 * ‹ › 로 하루씩 이동, 가운데 날짜를 탭하면 달력 시트에서 바로 고른다.
 * 미래 날짜는 막는다.
 */
export function DayNav({ day, onChange }: { day: string; onChange: (d: string) => void }) {
  const today = todayStr();
  const isToday = day === today;
  const [open, setOpen] = useState(false);
  const d = new Date(day + "T00:00:00");
  const label = `${d.getMonth() + 1}월 ${d.getDate()}일 ${"일월화수목금토"[d.getDay()]}`;
  const nav = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg active:scale-95";

  return (
    <>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" className={nav} style={{ background: "var(--card)", border: "1px solid var(--line)" }} onClick={() => onChange(shiftDay(day, -1))} aria-label="전날">
          ‹
        </button>
        <button type="button" className="flex min-w-0 flex-1 flex-col items-center leading-tight active:opacity-70" onClick={() => setOpen(true)} aria-label="날짜 선택">
          <span className="text-[15px] font-semibold">
            {isToday ? "오늘" : label}
            <span className="ml-1 text-[11px]" style={{ color: "var(--muted)" }}>
              ▾
            </span>
          </span>
          {isToday && (
            <span className="text-[12px]" style={{ color: "var(--muted)" }}>
              {label}
            </span>
          )}
        </button>
        <button
          type="button"
          className={nav}
          style={{ background: "var(--card)", border: "1px solid var(--line)", opacity: isToday ? 0.3 : 1 }}
          onClick={() => !isToday && onChange(shiftDay(day, 1))}
          disabled={isToday}
          aria-label="다음날"
        >
          ›
        </button>
      </div>

      <DayPickerSheet
        open={open}
        onClose={() => setOpen(false)}
        selected={day}
        onSelect={(next) => {
          onChange(next);
          setOpen(false);
        }}
      />
    </>
  );
}

/** 달력 시트. 열릴 때마다 해당 월 합계를 새로 읽어서 점(식단 상태·운동)이 최신으로 보인다. */
function DayPickerSheet({
  open,
  onClose,
  selected,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  selected: string;
  onSelect: (day: string) => void;
}) {
  const { repo } = useRepo();
  const today = todayStr();
  const [month, setMonth] = useState(ymOf(selected));
  const [totals, setTotals] = useState<Map<string, DayTotal>>(new Map());
  const [target, setTarget] = useState<number | null>(null);

  useEffect(() => {
    if (open) setMonth(ymOf(selected));
  }, [open, selected]);

  const load = useCallback(async () => {
    const { first, last } = monthRange(month);
    const [rows, body] = await Promise.all([repo.dailyTotals(shiftDay(first, -14), last), repo.listBody()]);
    setTotals(new Map(rows.map((r) => [r.day, r])));
    const latest = body[0];
    setTarget(latest ? calcTarget(latest, latest.goal, latest.activity, latest.adjustmentKcal).kcal : null);
  }, [repo, month]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  return (
    <Sheet open={open} onClose={onClose} title="날짜 선택">
      <Calendar month={month} onMonthChange={setMonth} selected={selected} onSelect={onSelect} totals={totals} target={target} defaultExpanded />
      {selected !== today && (
        <button type="button" className="mt-3 w-full rounded-[var(--r-md)] py-3 text-[14px] font-semibold" style={{ background: "var(--card)", border: "1px solid var(--line)" }} onClick={() => onSelect(today)}>
          오늘로 돌아가기
        </button>
      )}
    </Sheet>
  );
}
