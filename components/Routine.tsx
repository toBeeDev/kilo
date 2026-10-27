"use client";

import { useCallback, useEffect, useState } from "react";
import { useRepo } from "@/lib/repo-provider";
import { errorText, useToast } from "@/components/Toast";
import { exercise } from "@/lib/exercises";
import type { WorkoutRoutine } from "@/lib/types";
import { Button, Sheet } from "@/components/ui";

/**
 * 루틴 템플릿 시트.
 * - 위: 지금 종목 목록을 이름 붙여 저장 (같은 이름이면 덮어씀)
 * - 아래: 저장된 루틴. 탭하면 그 날 종목 목록에 한 번에 추가.
 */
export function RoutineSheet({
  open,
  onClose,
  currentIds,
  onLoad,
}: {
  open: boolean;
  onClose: () => void;
  /** 오늘 종목 순서 (저장 대상) */
  currentIds: string[];
  /** 불러오기: 종목 id 배열 */
  onLoad: (ids: string[]) => void;
}) {
  const { repo } = useRepo();
  const toast = useToast();
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [name, setName] = useState("");
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRoutines(await repo.listRoutines());
    } catch (e) {
      toast(errorText(e, "루틴을 못 불러왔어."));
    }
  }, [repo, toast]);
  useEffect(() => {
    if (open) {
      setName("");
      setEdit(false);
      load();
    }
  }, [open, load]);

  const canSave = currentIds.length > 0 && name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const n = name.trim();
      const dup = routines.find((r) => r.name === n);
      await repo.saveRoutine({ id: dup?.id, name: n, exerciseIds: currentIds });
      setName("");
      await load();
    } catch (e) {
      toast(errorText(e, "루틴을 저장 못 했어."));
    } finally {
      setSaving(false);
    }
  };

  const pick = async (r: WorkoutRoutine) => {
    onLoad(r.exerciseIds);
    onClose();
    repo.touchRoutine(r.id).catch(() => {}); // 사용 횟수는 통계용. 실패해도 조용히.
  };

  const remove = async (r: WorkoutRoutine) => {
    if (!confirm(`"${r.name}" 루틴 삭제?`)) return;
    try {
      await repo.deleteRoutine(r.id);
    } catch (e) {
      toast(errorText(e, "루틴을 지우지 못했어."));
    }
    await load();
  };

  return (
    <Sheet open={open} onClose={onClose} title="루틴">
      {/* 저장 */}
      <div className="card p-4">
        <div className="text-[13px] font-semibold">지금 종목을 루틴으로 저장</div>
        <div className="mt-1 text-[12px]" style={{ color: "var(--muted)" }}>
          {currentIds.length ? currentIds.map((id) => exercise(id).ko).join(" · ") : "오늘 종목이 없어. 종목부터 추가해."}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-[var(--r-md)] px-4 py-3 outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--line)" }}
            placeholder="가슴날, 등날…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            disabled={!currentIds.length}
          />
          <Button onClick={save} disabled={!canSave}>
            저장
          </Button>
        </div>
      </div>

      {/* 목록 */}
      <div className="mb-2 mt-5 flex items-center justify-between">
        <h3 className="text-[12px]" style={{ color: "var(--muted)" }}>
          저장된 루틴
        </h3>
        {routines.length > 0 && (
          <button type="button" className="text-[12px]" style={{ color: "var(--muted)" }} onClick={() => setEdit((v) => !v)}>
            {edit ? "완료" : "편집"}
          </button>
        )}
      </div>
      {routines.length ? (
        <div className="space-y-2">
          {routines.map((r) => (
            <div key={r.id} className="card flex items-center gap-3 p-4">
              <button type="button" className="min-w-0 flex-1 text-left active:opacity-70" onClick={() => !edit && pick(r)} disabled={edit}>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="truncate text-[15px] font-semibold">{r.name}</div>
                  <span className="num shrink-0 text-[12px]" style={{ color: "var(--muted)" }}>
                    {r.exerciseIds.length}종목{r.useCount ? ` · ${r.useCount}회` : ""}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-[12px]" style={{ color: "var(--muted)" }}>
                  {r.exerciseIds.map((id) => exercise(id).ko).join(" · ")}
                </div>
              </button>
              {edit && (
                <button type="button" className="shrink-0 text-sm" style={{ color: "var(--danger)" }} onClick={() => remove(r)} aria-label="삭제">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-[var(--r-md)] px-4 py-3 text-[13px]" style={{ background: "var(--card)", color: "var(--muted)" }}>
          아직 없어. 오늘 종목을 다 넣은 뒤 위에서 이름 붙여 저장하면 다음부턴 탭 한 번.
        </p>
      )}
    </Sheet>
  );
}
