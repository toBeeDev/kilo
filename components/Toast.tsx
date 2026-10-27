"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/**
 * 하단 토스트. 쓰기 실패·불러오기 실패처럼 화면에 자리가 없는 오류를 알린다.
 * 탭바 위에 뜨고 3.5초 뒤 사라진다. 같은 문구가 연달아 오면 하나로 합친다.
 */

type Kind = "error" | "info";
interface Toast {
  id: number;
  text: string;
  kind: Kind;
}
interface Ctx {
  toast: (text: string, kind?: Kind) => void;
}

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);

  const toast = useCallback((text: string, kind: Kind = "error") => {
    setItems((cur) => {
      if (cur.some((t) => t.text === text)) return cur;
      return [...cur.slice(-2), { id: ++seq.current, text, kind }];
    });
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={items} onDone={(id) => setItems((cur) => cur.filter((t) => t.id !== id))} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx.toast;
}

/** 오류 객체 → 사람 말. 반복되는 try/catch 뒤처리용. */
export function errorText(e: unknown, fallback = "저장 못 했어. 다시 시도해.") {
  const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  const name = e instanceof Error ? e.name : "";
  if (name === "QuotaExceededError" || /exceeded the quota|quota/i.test(msg)) {
    return "이 기기 저장 공간이 꽉 찼어. 사진 기록을 지우거나 로그인해서 클라우드로 옮겨.";
  }
  if (!msg || /failed to fetch|networkerror|load failed/i.test(msg)) {
    return typeof navigator !== "undefined" && navigator.onLine === false ? "오프라인이야. 연결되면 다시 시도해." : fallback;
  }
  return msg.length > 120 ? fallback : msg;
}

function ToastViewport({ items, onDone }: { items: Toast[]; onDone: (id: number) => void }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-5"
      style={{ bottom: "calc(var(--tab-h) + env(safe-area-inset-bottom) + 12px)" }}
      role="status"
      aria-live="polite"
    >
      {items.map((t) => (
        <ToastItem key={t.id} toast={t} onDone={() => onDone(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 3500);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <div
      className="toast-enter pointer-events-auto w-full max-w-[440px] rounded-[var(--r-md)] px-4 py-3 text-[14px] font-medium shadow-lg"
      style={{
        background: toast.kind === "error" ? "var(--ink)" : "var(--card)",
        color: toast.kind === "error" ? "#fff" : "var(--ink)",
        border: toast.kind === "error" ? "none" : "1px solid var(--line)",
      }}
    >
      {toast.text}
    </div>
  );
}
