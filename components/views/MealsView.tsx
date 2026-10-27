"use client";

import { useCallback, useEffect, useState } from "react";
import { useRepo } from "@/lib/repo-provider";
import { SLOTS, SLOT_LABEL, todayStr, type FavoriteMeal, type MealLog } from "@/lib/types";
import { FavoriteCard, MealPhoto, MealSheet } from "@/components/Meal";
import { MacroRatioBar } from "@/components/Nutrition";
import { Button, Card, Empty } from "@/components/ui";
import { CameraIcon, IconButton } from "@/components/PageHeader";
import { DayHeader } from "@/components/DayNav";

export default function MealsView() {
  const { repo, ready } = useRepo();
  const today = todayStr();
  const [day, setDay] = useState(today);
  const isToday = day === today;
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [favs, setFavs] = useState<FavoriteMeal[]>([]);
  const [editFavs, setEditFavs] = useState(false);
  const [sheet, setSheet] = useState<{ existing?: MealLog; preset?: FavoriteMeal } | null>(null);

  const load = useCallback(async () => {
    const [m, f] = await Promise.all([repo.listMeals(day), repo.listFavorites()]);
    setMeals(m);
    setFavs(f);
  }, [repo, day]);
  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const total = meals.reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, carbs: a.carbs + m.carbs, protein: a.protein + m.protein, fat: a.fat + m.fat }),
    { kcal: 0, carbs: 0, protein: 0, fat: 0 },
  );

  return (
    <>
      <DayHeader
        title="식단"
        highlight="var(--hl-meal)"
        day={day}
        onChange={setDay}
        right={
          <IconButton onClick={() => setSheet({})} label="사진으로 기록">
            <CameraIcon />
          </IconButton>
        }
      />

      {/* 즐겨찾기 */}
      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[12px]" style={{ color: "var(--muted)" }}>
            자주 먹는 식단
          </h2>
          {favs.length > 0 && (
            <button type="button" className="text-[12px]" style={{ color: "var(--muted)" }} onClick={() => setEditFavs((v) => !v)}>
              {editFavs ? "완료" : "편집"}
            </button>
          )}
        </div>
        {favs.length ? (
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 pt-2">
            {favs.map((f) => (
              <FavoriteCard
                key={f.id}
                fav={f}
                onClick={() => !editFavs && setSheet({ preset: f })}
                onDelete={
                  editFavs
                    ? async () => {
                        await repo.deleteFavorite(f.id);
                        load();
                      }
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <p className="rounded-[var(--r-md)] px-4 py-3 text-[13px]" style={{ background: "var(--card)", color: "var(--muted)" }}>
            기록할 때 "☆ 즐겨찾기에 추가" 누르면 여기 쌓여. 다음부턴 탭 한 번에 기록.
          </p>
        )}
      </section>

      {/* 오늘 합계 */}
      {meals.length > 0 && (
        <Card className="mt-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">{isToday ? "오늘 합계" : "합계"}</span>
            <span className="num text-2xl font-bold">
              {Math.round(total.kcal)}
              <span className="text-sm font-normal" style={{ color: "var(--muted)" }}>
                kcal
              </span>
            </span>
          </div>
          <div className="mt-3">
            <MacroRatioBar carbs={total.carbs} protein={total.protein} fat={total.fat} />
          </div>
        </Card>
      )}

      {/* 오늘 기록 */}
      <section className="mt-5 space-y-3">
        {SLOTS.map((slot) => {
          const list = meals.filter((m) => m.slot === slot);
          if (!list.length) return null;
          return (
            <div key={slot}>
              <h3 className="mb-2 text-[15px] font-semibold">{SLOT_LABEL[slot]}</h3>
              <div className="space-y-2">
                {list.map((m) => (
                  <button key={m.id} type="button" onClick={() => setSheet({ existing: m })} className="card w-full overflow-hidden text-left active:scale-[0.99]">
                    {m.photo && <MealPhoto src={m.photo} items={m.items} className="aspect-[16/9]" rounded="0" />}
                    <div className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0 flex-1 truncate text-[14px]">{m.items.map((i) => i.name).join(", ") || m.rawInput || "기록"}</div>
                        <div className="num shrink-0 text-[15px] font-bold">
                          {Math.round(m.kcal)}
                          <span className="text-[11px] font-normal" style={{ color: "var(--muted)" }}>
                            kcal
                          </span>
                        </div>
                      </div>
                      <div className="num mt-0.5 text-[12px]" style={{ color: "var(--muted)" }}>
                        탄 {Math.round(m.carbs)}g · 단 {Math.round(m.protein)}g · 지 {Math.round(m.fat)}g
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {!meals.length && (
          <Empty title={isToday ? "오늘 아직 기록 없음" : "이 날 기록 없음"} body="위 카메라로 찍거나, 자주 먹는 식단 탭하거나." action={<Button onClick={() => setSheet({})}>첫 끼 기록하기</Button>} />
        )}
      </section>

      <MealSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        day={day}
        existing={sheet?.existing}
        preset={sheet?.preset}
        onSaved={load}
      />
    </>
  );
}
