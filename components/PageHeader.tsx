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
 * 탭 공용 헤더 (시안 5: 한 줄).
 * 왼쪽 큰 제목(형광펜 하이라이트) + 선택적 회색 한 줄, 오른쪽 탭 컨트롤 + 계정 버튼.
 * 날짜 조작은 DayHeader의 스테퍼가 아랫줄에서 맡는다.
 */
export function AppHeader({
  title,
  subtitle,
  highlight,
  actions,
  account = true,
}: {
  title: string;
  subtitle?: string;
  /** 제목 뒤 형광펜 색 (CSS color). 예: "var(--hl-workout)" */
  highlight?: string;
  actions?: React.ReactNode;
  /** 계정 버튼 숨김 */
  account?: boolean;
}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0 pt-1">
        <h1 className="text-[28px] font-bold leading-[1.15] tracking-tight">
          <span
            className="box-decoration-clone rounded-[6px] px-1 -mx-1"
            style={highlight ? { backgroundImage: `linear-gradient(to top, ${highlight} 0 42%, transparent 42%)` } : undefined}
          >
            {title}
          </span>
        </h1>
        {subtitle && (
          <div className="mt-1 truncate text-[14px]" style={{ color: "var(--muted)" }}>
            {subtitle}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        {account && <AccountButton />}
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
