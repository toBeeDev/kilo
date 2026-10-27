"use client";

import { useEffect, useRef, useState } from "react";
import { useRepo } from "@/lib/repo-provider";
import { apiFetch } from "@/lib/http";
import type { InbodyParsed } from "@/lib/ai";
import { downscale } from "@/lib/image";
import {
  ACTIVITY_LABEL,
  GOAL_LABEL,
  calcTarget,
  suggestAdjustment,
  type Activity,
  type Goal,
} from "@/lib/macros";
import { todayStr, type BodyRecord } from "@/lib/types";
import { Button, Card, Field, Segmented, Sheet } from "./ui";
import { Spinner } from "./Meal";

const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
};

/** 결과 요약 카드 (마이 탭 상단, 홈 등에서 재사용) */
export function TargetSummary({ rec }: { rec: BodyRecord }) {
  const t = calcTarget(rec, rec.goal, rec.activity, rec.adjustmentKcal);
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{GOAL_LABEL[rec.goal]} 목표</span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {rec.measuredOn} 인바디 기준
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="num text-[40px] font-bold leading-none">{t.kcal}</span>
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          kcal · 유지 {t.tdee}
          {t.surplus !== 0 ? ` ${t.surplus > 0 ? "+" : ""}${t.surplus}` : ""}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MacroPill label="탄수" g={t.carbs} color="var(--carb)" />
        <MacroPill label="단백질" g={t.protein} color="var(--protein)" />
        <MacroPill label="지방" g={t.fat} color="var(--fat)" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[12px]" style={{ color: "var(--muted)" }}>
        <div>
          체중 <b className="num text-[var(--ink)]">{rec.weight}</b>kg
        </div>
        <div>
          체지방 <b className="num text-[var(--ink)]">{rec.bodyFatPct}</b>%
        </div>
        <div>
          골격근 <b className="num text-[var(--ink)]">{rec.skeletalMuscle ?? "—"}</b>kg
        </div>
      </div>
    </Card>
  );
}

function MacroPill({ label, g, color }: { label: string; g: number; color: string }) {
  return (
    <div className="rounded-[var(--r-md)] px-3 py-2.5" style={{ background: "var(--card-2)" }}>
      <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--muted)" }}>
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <div className="num text-lg font-bold">
        {g}
        <span className="text-xs font-normal">g</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 인바디 입력 시트: 사진 → 자동 입력 → 확인 → 저장                       */
/* ------------------------------------------------------------------ */

export function InbodySheet({
  open,
  onClose,
  latest,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  latest: BodyRecord | null;
  onSaved: (r: BodyRecord) => void;
}) {
  const { repo } = useRepo();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onPick(f);
    e.target.value = "";
  };
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [smm, setSmm] = useState("");
  const [date, setDate] = useState(todayStr());
  const [goal, setGoal] = useState<Goal>(latest?.goal ?? "lean_bulk");
  const [activity, setActivity] = useState<Activity>(latest?.activity ?? "moderate");
  const [adj, setAdj] = useState(latest?.adjustmentKcal ?? 0);
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWeight("");
    setFat("");
    setSmm("");
    setDate(todayStr());
    setGoal(latest?.goal ?? "lean_bulk");
    setActivity(latest?.activity ?? "moderate");
    setAdj(latest?.adjustmentKcal ?? 0);
    setReadNote(null);
    setError(null);
  }, [open, latest]);

  async function onPick(f: File) {
    setError(null);
    setReadNote(null);
    setReading(true);
    try {
      const small = await downscale(f, 1600, 0.85);
      const form = new FormData();
      form.append("image", small.blob, "inbody.jpg");
      const json = await apiFetch<InbodyParsed>("/api/inbody/parse", { method: "POST", body: form });
      if (json.weight) setWeight(String(json.weight));
      if (json.bodyFatPct) setFat(String(json.bodyFatPct));
      if (json.skeletalMuscle) setSmm(String(json.skeletalMuscle));
      if (json.measuredOn) setDate(json.measuredOn);
      const conf = json.confidence === "high" ? "" : json.confidence === "medium" ? " 숫자 한 번 확인해." : " 흐려서 자신 없음. 꼭 확인해.";
      setReadNote(`읽었어.${conf}${json.notes ? ` (${json.notes})` : ""}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(false);
    }
  }

  const w = num(weight);
  const bf = num(fat);
  const sm = num(smm);
  const rangeError =
    w !== undefined && (w < 20 || w > 300)
      ? "체중은 20~300kg 사이로."
      : bf !== undefined && (bf < 1 || bf > 70)
        ? "체지방률은 1~70% 사이로."
        : sm !== undefined && (sm < 5 || sm > 100 || (w !== undefined && sm > w))
          ? "골격근량이 이상해. 체중보다 작아야 해."
          : date > todayStr()
            ? "측정일이 미래야."
            : null;
  const curr = w !== undefined && bf !== undefined && !rangeError ? { weight: w, bodyFatPct: bf, skeletalMuscle: sm, date } : null;

  const prevMetrics = latest
    ? { weight: latest.weight, bodyFatPct: latest.bodyFatPct, skeletalMuscle: latest.skeletalMuscle, date: latest.measuredOn }
    : null;
  const suggestion = curr && prevMetrics && prevMetrics.date !== date ? suggestAdjustment(prevMetrics, { ...curr, date }, goal) : null;
  const target = curr ? calcTarget(curr, goal, activity, adj) : null;

  async function save() {
    if (!curr) return;
    setSaving(true);
    try {
      const saved = await repo.saveBody({
        measuredOn: date,
        weight: curr.weight,
        bodyFatPct: curr.bodyFatPct,
        skeletalMuscle: curr.skeletalMuscle,
        goal,
        activity,
        adjustmentKcal: adj,
      });
      onSaved(saved);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="인바디 입력" tall>
      <div
        className="rounded-[var(--r-lg)] p-4"
        style={{ background: "var(--card)", border: "1.5px dashed var(--line)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--accent-soft)" }}>
            {reading ? <Spinner /> : <SheetIcon />}
          </div>
          <div>
            <div className="text-[15px] font-semibold">{reading ? "결과지 읽는 중…" : "결과지 사진으로 자동 입력"}</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              체중·체지방률·골격근량·날짜를 읽어와
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="sm" variant="primary" disabled={reading} onClick={() => cameraRef.current?.click()}>
            지금 찍기
          </Button>
          <Button size="sm" variant="secondary" disabled={reading} onClick={() => galleryRef.current?.click()}>
            앨범에서 고르기
          </Button>
        </div>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      {readNote && (
        <p className="mt-2 text-[13px]" style={{ color: "var(--accent)" }}>
          {readNote}
        </p>
      )}
      {(error || rangeError) && (
        <p className="mt-2 text-[13px]" style={{ color: "var(--danger)" }}>
          {error ?? rangeError}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="체중" unit="kg" value={weight} onChange={setWeight} placeholder="75.0" />
        <Field label="체지방률" unit="%" value={fat} onChange={setFat} placeholder="15.0" />
        <Field label="골격근량" unit="kg" value={smm} onChange={setSmm} placeholder="선택" />
        <Field label="측정일" type="date" value={date} onChange={setDate} />
      </div>

      <div className="mt-5">
        <div className="mb-1.5 text-[13px]" style={{ color: "var(--muted)" }}>
          목표
        </div>
        <Segmented<Goal>
          value={goal}
          onChange={setGoal}
          options={(Object.keys(GOAL_LABEL) as Goal[]).map((g) => ({ value: g, label: GOAL_LABEL[g] }))}
        />
        <div className="mb-1.5 mt-3 text-[13px]" style={{ color: "var(--muted)" }}>
          운동 빈도
        </div>
        <Segmented<Activity>
          value={activity}
          onChange={setActivity}
          options={(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => ({ value: a, label: ACTIVITY_LABEL[a] }))}
        />
      </div>

      {suggestion && (
        <div className="mt-4 rounded-[var(--r-md)] p-4" style={{ background: "var(--accent-soft)" }}>
          <div className="text-[13px]" style={{ color: "var(--muted)" }}>
            지난 인바디({latest!.measuredOn}) 대비
          </div>
          <div className="mt-1 text-[15px] font-semibold">
            {suggestion.deltaKcal === 0 ? "보정 없음" : `${suggestion.deltaKcal > 0 ? "+" : ""}${suggestion.deltaKcal} kcal 제안`}
          </div>
          <div className="mt-0.5 text-[13px]" style={{ color: "var(--muted)" }}>
            {suggestion.reason}
          </div>
          {suggestion.deltaKcal !== 0 && adj === (latest?.adjustmentKcal ?? 0) && (
            <Button size="sm" variant="primary" className="mt-3" onClick={() => setAdj(adj + suggestion.deltaKcal)}>
              적용 (누적 {adj + suggestion.deltaKcal > 0 ? "+" : ""}
              {adj + suggestion.deltaKcal})
            </Button>
          )}
          {adj !== (latest?.adjustmentKcal ?? 0) && (
            <div className="mt-2 text-[13px] font-semibold" style={{ color: "var(--accent)" }}>
              적용됨 · 누적 {adj > 0 ? "+" : ""}
              {adj} kcal
            </div>
          )}
        </div>
      )}

      {target && (
        <div className="card mt-4 p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">목표 칼로리</span>
            <span className="num text-3xl font-bold">
              {target.kcal}
              <span className="text-sm font-normal" style={{ color: "var(--muted)" }}>
                kcal
              </span>
            </span>
          </div>
          <div className="mt-1 text-right text-[12px]" style={{ color: "var(--muted)" }}>
            제지방 {target.lbm}kg · BMR {target.bmr} · 유지 {target.tdee}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MacroPill label="탄수" g={target.carbs} color="var(--carb)" />
            <MacroPill label="단백질" g={target.protein} color="var(--protein)" />
            <MacroPill label="지방" g={target.fat} color="var(--fat)" />
          </div>
        </div>
      )}

      <Button className="mt-4 w-full" size="lg" disabled={!curr || saving} onClick={save}>
        {saving ? "저장 중…" : "저장"}
      </Button>
    </Sheet>
  );
}

function SheetIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}
