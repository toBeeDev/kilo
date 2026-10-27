"use client";

import { useCallback, useEffect, useState } from "react";
import { useRepo } from "@/lib/repo-provider";
import { calcTarget } from "@/lib/macros";
import { shiftDay, todayStr, type DayTotal } from "@/lib/types";
import Calendar, { monthRange, ymOf } from "@/components/Calendar";
import { Sheet } from "@/components/ui";
import { IconButton } from "@/components/PageHeader";

/**
 * 식단/운동 탭 공용 헤더.
 * - 윗줄: 탭 이름(굵게), 아랫줄: 같은 크기 회색 날짜. 우측 ▾ 를 누르면 달력 시트.
 * - 아래 한 줄: ‹ › 하루 이동(왼쪽) + 탭별 컨트롤(오른쪽, right slot).
 * 미래 날짜는 막는다.
 */
export function DayHeader({
  title,
  day,
  onChange,
  right,
}: {
  title: string;
  day: string;
  onChange: (d: string) => void;
  /** 오른쪽 컨트롤 (세그먼트, 카메라 버튼 등) */
  right?: React.ReactNode;
}) {
  const today = todayStr();
  const isToday = day === today;
  const [open, setOpen] = useState(false);
  const d = new Date(day + "T00:00:00");
  const dow = "일월화수목금토"[d.getDay()];
  const dateLine = isToday ? `오늘, ${d.getMonth() + 1}월 ${d.getDate()}일` : `${d.getMonth() + 1}월 ${d.getDate()}일 ${dow}요일`;
  const nav = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg active:scale-95";

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <button type="button" className="min-w-0 text-left active:opacity-70" onClick={() => setOpen(true)} aria-label="날짜 선택">
          <h1 className="text-[26px] font-bold leading-[1.1] tracking-tight">{title}</h1>
          <div className="truncate text-[26px] font-bold leading-[1.1] tracking-tight" style={{ color: "var(--muted)" }}>
            {dateLine}
          </div>
        </button>
        <IconButton onClick={() => setOpen(true)} label="날짜 선택">
          <ChevronDownIcon />
        </IconButton>
      </header>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button type="button" className={nav} style={{ background: "var(--card)", border: "1px solid var(--line)" }} onClick={() => onChange(shiftDay(day, -1))} aria-label="전날">
            ‹
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
          {!isToday && (
            <button type="button" className="ml-1 text-[13px] font-semibold underline underline-offset-2" style={{ color: "var(--muted)" }} onClick={() => onChange(today)}>
              오늘
            </button>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
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

/** 헤더 우측 아이콘. 바꾸고 싶으면 여기만. */
function ChevronDownIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
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
