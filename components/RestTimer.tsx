"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/**
 * 세트 사이 휴식 타이머. 세트 기록 버튼 누르면 자동 시작.
 * 끝나면 진동 + 짧은 비프. 기본 90초, 선호값은 localStorage.
 */

const PREF_KEY = "kilo:rest:v1";
export const REST_OPTIONS = [60, 90, 120, 180] as const;

interface Ctx {
  endsAt: number | null;
  total: number;
  preferred: number;
  setPreferred: (s: number) => void;
  start: (sec?: number) => void;
  add: (sec: number) => void;
  stop: () => void;
}

const noop: Ctx = {
  endsAt: null,
  total: 90,
  preferred: 90,
  setPreferred: () => {},
  start: () => {},
  add: () => {},
  stop: () => {},
};

const RestContext = createContext<Ctx>(noop);

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [total, setTotal] = useState(90);
  const [preferred, setPreferredState] = useState(90);
  const audio = useRef<AudioContext | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(PREF_KEY));
      if (v > 0) setPreferredState(v);
    } catch {
      /* ignore */
    }
  }, []);

  const setPreferred = useCallback((s: number) => {
    setPreferredState(s);
    try {
      localStorage.setItem(PREF_KEY, String(s));
    } catch {
      /* ignore */
    }
  }, []);

  const beep = useCallback(() => {
    try {
      const ctx = audio.current ?? new AudioContext();
      audio.current = ctx;
      const t = ctx.currentTime;
      [0, 0.18, 0.36].forEach((off) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, t + off);
        g.gain.exponentialRampToValueAtTime(0.25, t + off + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.14);
        o.connect(g).connect(ctx.destination);
        o.start(t + off);
        o.stop(t + off + 0.15);
      });
    } catch {
      /* 오디오 못 쓰는 환경 */
    }
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(
    (sec?: number) => {
      const s = sec ?? preferred;
      // 사용자 제스처 안에서 AudioContext 만들어 둬야 나중에 소리 남
      try {
        audio.current = audio.current ?? new AudioContext();
        if (audio.current.state === "suspended") audio.current.resume();
      } catch {
        /* ignore */
      }
      fired.current = false;
      setTotal(s);
      setEndsAt(Date.now() + s * 1000);
    },
    [preferred],
  );

  const add = useCallback((sec: number) => {
    setEndsAt((e) => (e ? e + sec * 1000 : e));
    setTotal((t) => t + sec);
  }, []);

  const stop = useCallback(() => setEndsAt(null), []);

  // 종료 감지
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => {
      if (Date.now() >= endsAt && !fired.current) {
        fired.current = true;
        beep();
        setEndsAt(null);
      }
    }, 250);
    return () => clearInterval(id);
  }, [endsAt, beep]);

  const value = useMemo(
    () => ({ endsAt, total, preferred, setPreferred, start, add, stop }),
    [endsAt, total, preferred, setPreferred, start, add, stop],
  );
  return <RestContext.Provider value={value}>{children}</RestContext.Provider>;
}

export function useRestTimer() {
  return useContext(RestContext);
}

/** 남은 초. 1초마다 갱신. */
function useRemaining(endsAt: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** 시트 안 / 페이지 하단 공용 바 */
export function RestTimerBar({ compact = false }: { compact?: boolean }) {
  const { endsAt, total, add, stop } = useRestTimer();
  const remaining = useRemaining(endsAt);
  if (!endsAt) return null;
  const pct = total ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  return (
    <div
      className={`flex items-center gap-3 rounded-[var(--r-md)] ${compact ? "px-3 py-2" : "px-4 py-3"}`}
      style={{ background: "var(--ink)", color: "#fff" }}
      role="timer"
      aria-live="polite"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>
            휴식
          </span>
          <span className="num text-[22px] font-bold leading-none">{fmt(remaining)}</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#fff", transition: "width 250ms linear" }} />
        </div>
      </div>
      <button type="button" onClick={() => add(30)} className="rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: "rgba(255,255,255,0.15)" }}>
        +30
      </button>
      <button type="button" onClick={stop} className="rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: "rgba(255,255,255,0.15)" }}>
        건너뛰기
      </button>
    </div>
  );
}

/** 페이지 하단(탭바 위) 떠 있는 타이머 */
export function FloatingRestTimer() {
  const { endsAt } = useRestTimer();
  if (!endsAt) return null;
  return (
    <div
      className="fixed inset-x-0 z-30 flex justify-center px-5"
      style={{ bottom: "calc(var(--tab-h) + env(safe-area-inset-bottom) + 10px)" }}
    >
      <div className="w-full max-w-[440px]">
        <RestTimerBar compact />
      </div>
    </div>
  );
}
