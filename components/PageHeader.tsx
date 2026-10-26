"use client";

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

export function PageHeader({
  title,
  subtitle,
  avatar,
  right,
}: {
  title: string;
  subtitle?: string;
  /** 있으면 아바타형(홈) */
  avatar?: { src?: string; initial: string };
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {avatar &&
          (avatar.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar.src} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
          ) : (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              {avatar.initial}
            </div>
          ))}
        <div className="min-w-0">
          {avatar ? (
            <>
              <div className="text-[12px]" style={{ color: "var(--muted)" }}>
                {subtitle}
              </div>
              <div className="truncate text-[20px] font-bold leading-tight tracking-tight">{title}</div>
            </>
          ) : (
            <>
              <h1 className="text-[26px] font-bold leading-tight tracking-tight">{title}</h1>
              {subtitle && (
                <div className="text-[12px]" style={{ color: "var(--muted)" }}>
                  {subtitle}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
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
