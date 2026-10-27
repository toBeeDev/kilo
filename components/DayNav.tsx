"use client";

import { useCallback, useEffect, useState } from "react";
import { useRepo } from "@/lib/repo-provider";
import { calcTarget } from "@/lib/macros";
import { shiftDay, todayStr, type DayTotal } from "@/lib/types";
import Calendar, { monthRange, ymOf } from "@/components/Calendar";
import { Sheet } from "@/components/ui";
import { AppHeader } from "@/components/PageHeader";

/**
 * 식단/운동 탭 공용 헤더 (시안 5).
 * - 윗줄: 제목(형광펜) + 탭 컨트롤(right) + 계정 버튼
 * - 아랫줄: ‹ 날짜 ⌄ › 스테퍼 하나. 가운데를 누르면 달력 시트, 양옆은 하루 이동. 과거면 "오늘로" 링크.
 * 미래 날짜는 막는다.
 */
export function DayHeader({
  title,
  highlight,
  day,
  onChange,
  right,
}: {
  title: string;
  highlight?: string;
  day: string;
  onChange: (d: string) => void;
  /** 윗줄 오른쪽 컨트롤 (세그먼트, 카메라 버튼 등) */
  right?: React.ReactNode;
}) {
  const today = todayStr();
  const isToday = day === today;
  const [open, setOpen] = useState(false);
  const d = new Date(day + "T00:00:00");
  const dow = "일월화수목금토"[d.getDay()];
  const label = isToday ? `오늘, ${d.getMonth() + 1}월 ${d.getDate()}일` : `${d.getMonth() + 1}월 ${d.getDate()}일 ${dow}요일`;
  const nav = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[17px] leading-none active:scale-95";

  return (
    <>
      <AppHeader title={title} highlight={highlight} actions={right} />

      <div className="mt-3 flex items-center gap-2">
        <div className="inline-flex items-center gap-0.5 rounded-full p-[3px]" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
          <button type="button" className={nav} onClick={() => onChange(shiftDay(day, -1))} aria-label="전날">
            ‹
          </button>
          <button type="button" className="flex h-8 items-center gap-1 px-1.5 text-[13px] font-semibold active:opacity-70" onClick={() => setOpen(true)} aria-label="날짜 선택">
            {label}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <button type="button" className={nav} style={{ opacity: isToday ? 0.3 : 1 }} onClick={() => !isToday && onChange(shiftDay(day, 1))} disabled={isToday} aria-label="다음날">
            ›
          </button>
        </div>
        {!isToday && (
          <button type="button" className="text-[13px] font-semibold underline underline-offset-2" style={{ color: "var(--muted)" }} onClick={() => onChange(today)}>
            오늘로
          </button>
        )}
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
