"use client";

import Link from "next/link";
import { useRepo } from "@/lib/repo-provider";
import { isSupabaseConfigured } from "@/lib/config";

/**
 * 탭 상단 공용 헤더.
 * - 홈: 아바타 + 인사 + 이름, 오른쪽 아이콘 버튼
 * - 식단/운동: 큰 제목 + 날짜, 오른쪽 액션
 */

export function timeGreeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return "늦은 밤이야";
  if (h < 11) return "좋은 아침";
  if (h < 17) return "좋은 오후";
  if (h < 22) return "좋은 저녁";
  return "늦은 밤이야";
}

/**
 * 탭 공용 헤더 (2단).
 * - 1줄: 왼쪽 leading 슬롯, 오른쪽 actions + 계정 버튼(비회원=로그인 아이콘, 회원=프로필)
 * - 2줄: 큰 제목 + 회색 한 줄, 오른쪽 titleRight(알약 드롭다운 등)
 */
export function AppHeader({
  title,
  subtitle,
  leading,
  actions,
  titleRight,
  account = true,
}: {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  titleRight?: React.ReactNode;
  /** 계정 버튼 숨김 (마이 탭 등) */
  account?: boolean;
}) {
  const hasTop = !!leading || !!actions || account;
  return (
    <header>
      {hasTop && (
        <div className="flex min-h-11 items-center justify-between gap-2">
          <div className="flex items-center gap-2">{leading}</div>
          <div className="flex items-center gap-2">
            {actions}
            {account && <AccountButton />}
          </div>
        </div>
      )}
      <div className={`${hasTop ? "mt-4" : "mt-1"} flex items-end justify-between gap-3`}>
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-[1.15] tracking-tight">{title}</h1>
          {subtitle && (
            <div className="mt-0.5 truncate text-[14px]" style={{ color: "var(--muted)" }}>
              {subtitle}
            </div>
          )}
        </div>
        {titleRight && <div className="shrink-0 pb-0.5">{titleRight}</div>}
      </div>
    </header>
  );
}

/** 우측 상단 계정 버튼. 회원이면 프로필(사진/이니셜) → 마이, 비회원이면 로그인 아이콘 → 로그인(설정 안 됐으면 마이). */
export function AccountButton() {
  const { user } = useRepo();
  const cls = "relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full active:scale-95";
  if (user) {
    const src = user.user_metadata?.avatar_url as string | undefined;
    const name = (user.user_metadata?.full_name || user.user_metadata?.name || user.email || "?") as string;
    return (
      <Link href="/me" aria-label="내 프로필" className={cls} style={{ background: "var(--ink)", color: "#fff" }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[15px] font-bold">{name.slice(0, 1).toUpperCase()}</span>
        )}
      </Link>
    );
  }
  return (
    <Link
      href={isSupabaseConfigured() ? "/login" : "/me"}
      aria-label="로그인"
      className={cls}
      style={{ background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink)" }}
    >
      <PersonIcon />
    </Link>
  );
}

/** 제목 오른쪽 알약 드롭다운 ("오늘 ⌄") */
export function Pill({ onClick, label, children }: { onClick: () => void; label?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 items-center gap-1 rounded-full pl-3.5 pr-2.5 text-[13px] font-semibold active:scale-95"
      style={{ background: "var(--ink)", color: "#fff" }}
    >
      {children}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}

function PersonIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
    </svg>
  );
}

/** 헤더 오른쪽 둥근 아이콘 버튼 (테두리형) */
export function IconButton({
  onClick,
  label,
  children,
  badge,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  badge?: string | number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex h-11 w-11 items-center justify-center rounded-full active:scale-95"
      style={{ background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink)" }}
    >
      {children}
      {badge !== undefined && badge !== "" && (
        <span
          className="num absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
          style={{ background: "var(--over)", color: "#fff" }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export function CameraIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function weekdayLabel(day: string) {
  const d = new Date(day + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${"일월화수목금토"[d.getDay()]}요일`;
}
