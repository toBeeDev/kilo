"use client";

/* 칼로리 링 — 먹은 / 남은 / 목표 */
export function CalorieRing({
  eaten,
  target,
}: {
  eaten: number;
  target: number | null;
}) {
  const size = 176;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const ratio = target ? Math.min(1, eaten / target) : 0;
  const remaining = target !== null ? Math.round(target - eaten) : null;
  // 신호등: 여유 있으면 초록, 목표의 15% 안쪽이면 노랑, 넘기면 빨강
  const status =
    target === null ? null : eaten > target ? "over" : target - eaten <= target * 0.15 ? "warn" : "ok";
  const over = status === "over";
  const color = status ? `var(--${status})` : "var(--ink)";
  const soft = status ? `var(--${status}-soft)` : "transparent";
  const label = status === "over" ? "초과" : status === "warn" ? "거의 다 찼어" : "남은 칼로리";

  return (
    <div className="flex items-center justify-between">
      <Side label="먹은" value={Math.round(eaten)} />
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--card-2)" strokeWidth={stroke} fill="none" />
          {target !== null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={len}
              strokeDashoffset={len * (1 - ratio)}
              className="ring-progress"
              style={{ ["--ring-len" as string]: len }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {target === null ? (
            <>
              <div className="num text-2xl font-bold">{Math.round(eaten)}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                kcal · 목표 없음
              </div>
            </>
          ) : (
            <>
              <div className="num text-[34px] font-bold leading-none" style={{ color }}>
                {Math.abs(remaining!)}
              </div>
              <div
                className="mt-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: soft, color }}
              >
                {label}
              </div>
            </>
          )}
        </div>
      </div>
      <Side label="목표" value={target === null ? "—" : Math.round(target)} />
    </div>
  );
}

function Side({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="w-16 text-center">
      <div className="num text-xl font-bold">{value}</div>
      <div className="text-xs" style={{ color: "var(--muted)" }}>
        {label}
      </div>
    </div>
  );
}

/* 매크로 3종 진행 바 */
export function MacroBars({
  carbs,
  protein,
  fat,
  target,
}: {
  carbs: number;
  protein: number;
  fat: number;
  target: { carbs: number; protein: number; fat: number } | null;
}) {
  const rows = [
    { label: "탄수화물", v: carbs, t: target?.carbs, color: "var(--carb)" },
    { label: "단백질", v: protein, t: target?.protein, color: "var(--protein)" },
    { label: "지방", v: fat, t: target?.fat, color: "var(--fat)" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {rows.map((r) => {
        const pct = r.t ? Math.min(100, (r.v / r.t) * 100) : 0;
        return (
          <div key={r.label}>
            <div className="mb-1.5 text-[12px]" style={{ color: "var(--muted)" }}>
              {r.label}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--card-2)" }}>
              <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: r.color }} />
            </div>
            <div className="num mt-1.5 text-[13px] font-semibold">
              {Math.round(r.v)}
              <span className="font-normal" style={{ color: "var(--muted)" }}>
                {r.t ? ` / ${Math.round(r.t)}g` : "g"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* 한 끼 요약 바 (탄/단/지 비율) */
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
