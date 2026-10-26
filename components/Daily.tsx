"use client";

import { useRef, useState } from "react";
import { sodiumStatus } from "@/lib/macros";
import type { DaySummary } from "@/lib/types";
import { Card } from "./ui";

/* ---------- 물 · 나트륨 ---------- */

const WATER_STEPS = [250, 500, 1000] as const;

export function WaterSodium({
  water,
  waterTarget,
  sodium,
  onWater,
  editable,
}: {
  water: number;
  waterTarget: number;
  sodium: number;
  onWater: (ml: number) => void;
  editable: boolean;
}) {
  const pct = Math.min(100, (water / waterTarget) * 100);
  const na = sodiumStatus(sodium);
  const naColor = na === "ok" ? "var(--ink)" : `var(--${na})`;
  const history = useRef<number[]>([]); // 이 세션에서 더한 양 (되돌리기용)
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const add = (ml: number) => {
    history.current.push(ml);
    onWater(water + ml);
  };
  const undo = () => {
    const last = history.current.pop() ?? 250;
    onWater(Math.max(0, water - last));
  };
  const commitDraft = () => {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n) && n >= 0) {
      history.current = [];
      onWater(n);
    }
    setEditing(false);
  };

  return (
    <div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[12px]" style={{ color: "var(--muted)" }}>
            물
          </span>
          {editing ? (
            <form
              className="flex items-baseline gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                commitDraft();
              }}
            >
              <input
                autoFocus
                inputMode="numeric"
                className="num w-16 rounded-md px-1.5 py-0.5 text-right text-[13px] font-semibold outline-none"
                style={{ background: "var(--card-2)" }}
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
                onBlur={commitDraft}
                aria-label="물 총량 mL"
              />
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                mL
              </span>
            </form>
          ) : (
            <button
              type="button"
              className="num text-[13px] font-semibold"
              onClick={() => {
                if (!editable) return;
                setDraft(String(water));
                setEditing(true);
              }}
              title="탭해서 직접 입력"
            >
              {water.toLocaleString()}
              <span className="font-normal" style={{ color: "var(--muted)" }}>
                {" "}
                / {waterTarget.toLocaleString()}mL
              </span>
            </button>
          )}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--card-2)" }}>
          <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: "var(--ok)" }} />
        </div>
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[12px]" style={{ color: "var(--muted)" }}>
            나트륨
          </span>
          <span className="num text-[13px] font-semibold" style={{ color: naColor }}>
            {Math.round(sodium).toLocaleString()}
            <span className="font-normal" style={{ color: "var(--muted)" }}>
              mg
            </span>
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--card-2)" }}>
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${Math.min(100, (sodium / 3500) * 100)}%`, background: na === "ok" ? "var(--line)" : naColor }}
          />
        </div>
        <div className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
          {na === "over" ? "3,500 넘음 · 물 더 마셔" : na === "warn" ? "권장 2,300 넘음" : "권장 2,300 이하"}
        </div>
      </div>
    </div>
    {editable && (
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={undo}
          className="h-8 w-8 shrink-0 rounded-full text-base"
          style={{ background: "var(--card-2)" }}
          aria-label="마지막으로 더한 물 빼기"
          disabled={water <= 0}
        >
          −
        </button>
        {WATER_STEPS.map((ml) => (
          <button
            key={ml}
            type="button"
            onClick={() => add(ml)}
            className="num h-8 flex-1 rounded-full text-[12px] font-semibold"
            style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
          >
            +{ml >= 1000 ? `${ml / 1000}L` : `${ml}mL`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setDraft(String(water));
            setEditing(true);
          }}
          className="h-8 shrink-0 rounded-full px-3 text-[12px]"
          style={{ background: "var(--card-2)", color: "var(--muted)" }}
        >
          직접
        </button>
      </div>
    )}
    </div>
  );
}

/* ---------- 하루 총평 ---------- */

export function SummaryCard({
  summary,
  canGenerate,
  onGenerate,
}: {
  day: string;
  summary: DaySummary | null;
  canGenerate: boolean;
  onGenerate: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onGenerate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!summary && !canGenerate) return null;

  if (!summary) {
    return (
      <Card pad={false} className="px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold">총평</div>
            <div className="truncate text-[12px]" style={{ color: "var(--muted)" }}>
              {error ?? "먹은 거·운동 보고 3줄 + 내일 할 것 하나"}
            </div>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="shrink-0 text-[13px] font-semibold disabled:opacity-50"
            style={{ color: "var(--ink)" }}
          >
            {busy ? "생성 중…" : "받기 ›"}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ background: "var(--ink)", color: "#fff" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>
          총평
        </h3>
        <button type="button" onClick={run} disabled={busy} className="text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>
          {busy ? "생성 중…" : "다시 생성"}
        </button>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed">{summary.summary}</p>
      <div className="mt-3 rounded-[var(--r-md)] px-3.5 py-3" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>
          내일
        </div>
        <div className="mt-0.5 text-[14px] font-semibold">{summary.nextStep}</div>
      </div>
      {error && (
        <p className="mt-2 text-[12px]" style={{ color: "#ffb4ad" }}>
          {error}
        </p>
      )}
    </Card>
  );
}

