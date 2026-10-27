"use client";

export function MacroRatioBar({
  carbs,
  protein,
  fat,
}: {
  carbs: number;
  protein: number;
  fat: number;
}) {
  const c = carbs * 4;
  const p = protein * 4;
  const f = fat * 9;
  const total = c + p + f || 1;
  return (
    <div>
      <div className="flex h-1.5 overflow-hidden rounded-full" style={{ background: "var(--card-2)" }}>
        <div style={{ width: `${(c / total) * 100}%`, background: "var(--carb)" }} />
        <div style={{ width: `${(p / total) * 100}%`, background: "var(--protein)" }} />
        <div style={{ width: `${(f / total) * 100}%`, background: "var(--fat)" }} />
      </div>
      <div className="mt-1.5 flex gap-3 text-[12px]" style={{ color: "var(--muted)" }}>
        <span>탄 {Math.round((c / total) * 100)}%</span>
        <span>단 {Math.round((p / total) * 100)}%</span>
        <span>지 {Math.round((f / total) * 100)}%</span>
      </div>
    </div>
  );
}
