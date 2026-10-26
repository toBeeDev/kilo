"use client";

import { useCallback, useEffect, useState } from "react";
import { useRepo } from "@/lib/repo-provider";
import { isSupabaseConfigured } from "@/lib/config";
import { GOAL_LABEL } from "@/lib/macros";
import type { BodyRecord } from "@/lib/types";
import { InbodySheet, TargetSummary } from "@/components/Inbody";
import { Button, Card, Empty } from "@/components/ui";
import { CloudRepo } from "@/lib/repo";
import { localCounts, migrateLocalToCloud, wasMigrated, type LocalCounts } from "@/lib/migrate";

export default function MePage() {
  const { repo, user, ready, signOut } = useRepo();
  const [records, setRecords] = useState<BodyRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<LocalCounts | null>(null);
  const [migrating, setMigrating] = useState<string | null>(null);
  const [migrateError, setMigrateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRecords(await repo.listBody());
    if (repo.mode === "cloud" && !wasMigrated()) {
      const c = localCounts();
      setLocal(c.total > 0 ? c : null);
    } else {
      setLocal(null);
    }
  }, [repo]);
  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const migrate = async () => {
    if (!(repo instanceof CloudRepo)) return;
    setMigrateError(null);
    setMigrating("시작");
    try {
      await migrateLocalToCloud(repo, setMigrating);
      setMigrating(null);
      setLocal(null);
      load();
    } catch (e) {
      setMigrateError((e as Error).message);
      setMigrating(null);
    }
  };

  const latest = records[0] ?? null;
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "게스트";
  const avatar = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              {String(name).slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-[17px] font-bold">{name}</div>
            <div className="text-[12px]" style={{ color: "var(--muted)" }}>
              {repo.mode === "cloud" ? "클라우드 저장" : "이 기기에만 저장"}
            </div>
          </div>
        </div>
        {user ? (
          <Button variant="ghost" size="sm" onClick={signOut}>
            로그아웃
          </Button>
        ) : isSupabaseConfigured() ? (
          <a href="/login" className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
            로그인
          </a>
        ) : null}
      </header>

      {local && (
        <Card className="mt-5" style={{ border: "1px solid var(--ink)" }}>
          <div className="text-[15px] font-semibold">이 기기에 남은 기록이 있어</div>
          <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>
            인바디 {local.body} · 식사 {local.meals} · 세트 {local.sets} · 즐겨찾기 {local.favs}. 클라우드로 옮기면 폰에서도 보여.
          </p>
          {migrating ? (
            <p className="mt-3 text-[13px] font-semibold">옮기는 중… {migrating}</p>
          ) : (
            <Button className="mt-3 w-full" onClick={migrate}>
              클라우드로 옮기기
            </Button>
          )}
          {migrateError && (
            <p className="mt-2 text-[12px]" style={{ color: "var(--danger)" }}>
              {migrateError} — 일부는 올라갔을 수 있어. 다시 누르면 중복될 수 있으니 기록 확인 먼저.
            </p>
          )}
        </Card>
      )}

      <div className="mt-5">
        {latest ? <TargetSummary rec={latest} /> : (
          <Card>
            <Empty title="인바디가 아직 없어" body="결과지 사진 한 장이면 목표 칼로리까지 바로 나와." action={<Button onClick={() => setOpen(true)}>인바디 입력</Button>} />
          </Card>
        )}
      </div>

      {latest && (
        <Button className="mt-3 w-full" size="lg" variant="secondary" onClick={() => setOpen(true)}>
          새 인바디 입력
        </Button>
      )}

      {records.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-[15px] font-semibold">기록</h2>
          <Card pad={false}>
            {records.map((r, i) => {
              const prev = records[i + 1];
              const d = (a?: number, b?: number) => (a !== undefined && b !== undefined ? a - b : null);
              const dw = d(r.weight, prev?.weight);
              const df = d(r.bodyFatPct, prev?.bodyFatPct);
              const ds = d(r.skeletalMuscle, prev?.skeletalMuscle);
              return (
                <div key={r.id} className="hairline flex items-center gap-3 px-4 py-3 first:border-t-0">
                  <div className="w-14 shrink-0">
                    <div className="num text-[14px] font-semibold">{r.measuredOn.slice(5).replace("-", "/")}</div>
                    <div className="text-[12px]" style={{ color: "var(--muted)" }}>
                      {GOAL_LABEL[r.goal]}
                      {r.adjustmentKcal ? ` · 보정 ${r.adjustmentKcal > 0 ? "+" : ""}${r.adjustmentKcal}` : ""}
                    </div>
                  </div>
                  <div className="num grid flex-1 grid-cols-3 gap-2 text-right text-[13px]">
                    <Delta v={r.weight} d={dw} unit="kg" neutral />
                    <Delta v={r.bodyFatPct} d={df} unit="%" invert />
                    <Delta v={r.skeletalMuscle} d={ds} unit="kg" />
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-xs"
                    style={{ color: "var(--muted)" }}
                    onClick={async () => {
                      if (confirm(`${r.measuredOn} 기록 삭제?`)) {
                        await repo.deleteBody(r.id);
                        load();
                      }
                    }}
                    aria-label="삭제"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </Card>
          <p className="mt-2 text-[12px]" style={{ color: "var(--muted)" }}>
            체중 · 체지방률 · 골격근량. 2주마다 찍으면 보정 제안이 붙어.
          </p>
        </section>
      )}

      <InbodySheet open={open} onClose={() => setOpen(false)} latest={latest} onSaved={load} />
    </>
  );
}

function Delta({ v, d, unit, invert, neutral }: { v?: number; d: number | null; unit: string; invert?: boolean; neutral?: boolean }) {
  if (v === undefined) return <span style={{ color: "var(--muted)" }}>—</span>;
  const good = d === null || neutral ? null : invert ? d < 0 : d > 0;
  return (
    <span>
      <span className="font-semibold">{v}</span>
      <span className="text-[11px]" style={{ color: "var(--muted)" }}>
        {unit}
      </span>
      {d !== null && d !== 0 && (
        <span className="ml-1 text-[11px]" style={{ color: good === null ? "var(--muted)" : good ? "var(--accent)" : "var(--danger)" }}>
          {d > 0 ? "+" : ""}
          {Math.round(d * 10) / 10}
        </span>
      )}
    </span>
  );
}
