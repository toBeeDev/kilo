"use client";

import { useState } from "react";
import type { DaySummary } from "@/lib/types";
import { Card } from "./ui";

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

