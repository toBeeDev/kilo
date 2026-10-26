"use client";

import { useEffect, useRef, useState } from "react";
import { useRepo } from "@/lib/repo-provider";
import { downscale, thumbnail } from "@/lib/image";
import {
  SLOTS,
  SLOT_LABEL,
  scaleItem,
  sumItems,
  type FavoriteMeal,
  type MealItem,
  type MealLog,
  type MealSlot,
} from "@/lib/types";
import { Button, Field, Segmented, Sheet } from "./ui";
import { MacroRatioBar } from "./Nutrition";

/* ------------------------------------------------------------------ */
/* 사진 + 음식 칩 (roution식 라벨 오버레이)                             */
/* ------------------------------------------------------------------ */

export function MealPhoto({
  src,
  items,
  className = "",
  rounded = "var(--r-lg)",
}: {
  src?: string;
  items: MealItem[];
  className?: string;
  rounded?: string;
}) {
  if (!src) {
    return (
      <div
        className={`flex flex-wrap gap-1.5 p-4 ${className}`}
        style={{ background: "var(--card-2)", borderRadius: rounded }}
      >
        {items.map((i, idx) => (
          <Chip key={idx}>{i.name}</Chip>
        ))}
      </div>
    );
  }
  // 음식 칩은 사진 하단에 한 줄로 모아서. 위치 검출은 안 함.
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ borderRadius: rounded }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="block h-full w-full object-cover" />
      {items.length > 0 && (
        <div
          className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 px-3 pb-3 pt-10"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))" }}
        >
          {items.slice(0, 6).map((i, idx) => (
            <Chip key={idx} dark>
              {i.name}
            </Chip>
          ))}
          {items.length > 6 && <Chip dark>+{items.length - 6}</Chip>}
        </div>
      )}
    </div>
  );
}

function Chip({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 text-[12px] font-semibold"
      style={
        dark
          ? { background: "rgba(31,27,22,0.78)", color: "#fff", backdropFilter: "blur(6px)" }
          : { background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)" }
      }
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 기록 시트: 사진/설명 → AI 파싱 → 확인·수정 → 저장                     */
/* ------------------------------------------------------------------ */

type Stage = "capture" | "parsing" | "review";

export function MealSheet({
  open,
  onClose,
  day,
  slot: initialSlot,
  existing,
  preset,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  day: string;
  slot?: MealSlot;
  existing?: MealLog;
  /** 즐겨찾기에서 바로 열 때 */
  preset?: FavoriteMeal;
  onSaved: (m: MealLog) => void;
}) {
  const { repo } = useRepo();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [slot, setSlot] = useState<MealSlot>(initialSlot ?? guessSlot());
  const [stage, setStage] = useState<Stage>(existing ? "review" : "capture");
  const [photo, setPhoto] = useState<string | undefined>(existing?.photo);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [text, setText] = useState(existing?.rawInput ?? "");
  const [items, setItems] = useState<MealItem[]>(existing?.items ?? []);
  const [note, setNote] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // 즐겨찾기
  const [favs, setFavs] = useState<FavoriteMeal[]>([]);
  const [fromFav, setFromFav] = useState<FavoriteMeal | null>(null);
  const [favName, setFavName] = useState<string | null>(null); // null = 입력창 닫힘
  const [favSaved, setFavSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSlot(initialSlot ?? existing?.slot ?? guessSlot());
    setBlob(null);
    setText(existing?.rawInput ?? "");
    setNote(undefined);
    setError(null);
    setFavName(null);
    setFavSaved(false);
    if (preset) {
      applyFavorite(preset, false);
    } else {
      setStage(existing ? "review" : "capture");
      setPhoto(existing?.photo);
      setItems(existing?.items ?? []);
      setFromFav(null);
    }
    repo.listFavorites().then(setFavs).catch(() => setFavs([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSlot, existing, preset, repo]);

  function applyFavorite(f: FavoriteMeal, touch = true) {
    setItems(f.items.map((i) => ({ ...i })));
    setPhoto(f.photo);
    setBlob(null);
    setFromFav(f);
    setStage("review");
    if (touch) repo.touchFavorite(f.id).catch(() => {});
  }

  function defaultFavName() {
    const names = items.map((i) => i.name.trim()).filter(Boolean);
    return names.length > 3 ? `${names.slice(0, 3).join(", ")} 외 ${names.length - 3}` : names.join(", ");
  }

  async function saveFavorite() {
    const name = (favName ?? "").trim() || defaultFavName();
    if (!name) return;
    try {
      let photoUrl = photo;
      if (blob && photo) photoUrl = await repo.uploadPhoto(photo, blob);
      const sum = sumItems(items);
      const saved = await repo.saveFavorite({ name, photo: photoUrl, items: items.filter((i) => i.name.trim()), ...sum });
      setFavs((cur) => [saved, ...cur.filter((x) => x.id !== saved.id)]);
      setFromFav(saved);
      setFavName(null);
      setFavSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onPick(f: File) {
    setError(null);
    const t = await thumbnail(f);
    setPhoto(t.dataUrl);
    setBlob(t.blob);
  }
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onPick(f);
    e.target.value = "";
  };

  async function analyze() {
    setError(null);
    setStage("parsing");
    try {
      const form = new FormData();
      if (blob) {
        const small = await downscale(blob, 1024, 0.8);
        form.append("image", small.blob, "meal.jpg");
      }
      if (text.trim()) form.append("text", text.trim());
      const res = await fetch("/api/meal/parse", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "분석 실패");
      setItems(((json.items ?? []) as MealItem[]).map((i) => ({ ...i, source: "ai" as const })));
      setNote(json.note);
      setStage("review");
    } catch (e) {
      setError((e as Error).message);
      // AI 없어도 수동 입력으로 진행
      setItems((cur) => (cur.length ? cur : [emptyItem()]));
      setStage("review");
    }
  }

  async function save() {
    setSaving(true);
    try {
      let photoUrl = photo;
      if (blob && photo) photoUrl = await repo.uploadPhoto(photo, blob);
      const sum = sumItems(items);
      const saved = await repo.saveMeal({
        id: existing?.id,
        eatenOn: day,
        slot,
        rawInput: text.trim() || undefined,
        photo: photoUrl,
        items: items.filter((i) => i.name.trim()),
        ...sum,
      });
      onSaved(saved);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const sum = sumItems(items);

  return (
    <Sheet open={open} onClose={onClose} title={existing ? "기록 수정" : "식사 기록"} tall>
      <Segmented<MealSlot>
        value={slot}
        onChange={setSlot}
        options={SLOTS.map((s) => ({ value: s, label: SLOT_LABEL[s] }))}
      />

      {/* 즐겨찾기 */}
      {stage === "capture" && favs.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[13px]" style={{ color: "var(--muted)" }}>
            자주 먹는 식단
          </div>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {favs.map((f) => (
              <FavoriteCard key={f.id} fav={f} onClick={() => applyFavorite(f)} />
            ))}
          </div>
        </div>
      )}

      {/* 사진 영역 */}
      <div className="mt-4">
        {photo ? (
          <>
            <MealPhoto src={photo} items={stage === "review" ? items : []} className="aspect-[4/3]" />
            <div className="mt-2 flex gap-2">
              <PhotoAction onClick={() => cameraRef.current?.click()} icon={<CameraIcon size={16} />}>
                다시 찍기
              </PhotoAction>
              <PhotoAction onClick={() => galleryRef.current?.click()} icon={<GalleryIcon />}>
                앨범
              </PhotoAction>
              <PhotoAction
                onClick={() => {
                  setPhoto(undefined);
                  setBlob(null);
                }}
              >
                빼기
              </PhotoAction>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-[var(--r-lg)]"
              style={{ background: "var(--card)", border: "1.5px dashed var(--line)" }}
            >
              <CameraIcon />
              <span className="text-[15px] font-semibold">사진 찍기</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                찍기만 하면 음식이랑 양을 읽어줘
              </span>
            </button>
            <div className="mt-2 flex gap-2">
              <PhotoAction onClick={() => galleryRef.current?.click()} icon={<GalleryIcon />}>
                앨범에서 고르기
              </PhotoAction>
            </div>
          </>
        )}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      </div>

      {/* 설명 */}
      <div className="mt-4">
        <Field
          label="설명 (선택)"
          value={text}
          onChange={setText}
          placeholder="햇반 + 훈제닭가슴살 2팩 + 계란 2개"
          inputMode="text"
        />
      </div>

      {stage === "capture" && (
        <Button className="mt-4 w-full" size="lg" disabled={!photo && !text.trim()} onClick={analyze}>
          분석하기
        </Button>
      )}

      {stage === "parsing" && (
        <div className="mt-6 flex items-center justify-center gap-2 py-6 text-sm" style={{ color: "var(--muted)" }}>
          <Spinner /> 읽는 중…
        </div>
      )}

      {stage === "review" && (
        <div className="mt-5">
          {error && (
            <p className="mb-3 rounded-[var(--r-sm)] px-3 py-2 text-[13px]" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
              {error} — 아래에서 직접 입력해도 돼.
            </p>
          )}
          {note && (
            <p className="mb-3 text-[13px]" style={{ color: "var(--muted)" }}>
              {note}
            </p>
          )}

          <div className="card overflow-hidden">
            {items.map((it, idx) => (
              <ItemRow
                key={idx}
                item={it}
                onChange={(n) => setItems((cur) => cur.map((x, i) => (i === idx ? n : x)))}
                onRemove={() => setItems((cur) => cur.filter((_, i) => i !== idx))}
              />
            ))}
            <button
              type="button"
              className="hairline w-full py-3 text-sm font-semibold"
              style={{ color: "var(--accent)" }}
              onClick={() => setItems((cur) => [...cur, emptyItem()])}
            >
              + 음식 추가
            </button>
          </div>

          <div className="card mt-3 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">총 칼로리</span>
              <span className="num text-xl font-bold">
                {Math.round(sum.kcal)}
                <span className="text-sm font-normal" style={{ color: "var(--muted)" }}>
                  kcal
                </span>
              </span>
            </div>
            <div className="mt-3">
              <MacroRatioBar carbs={sum.carbs} protein={sum.protein} fat={sum.fat} />
            </div>
          </div>

          {/* 즐겨찾기 저장 */}
          <div className="mt-3">
            {fromFav || favSaved ? (
              <p className="text-[13px]" style={{ color: "var(--muted)" }}>
                ★ 즐겨찾기 {favSaved ? "저장됨" : `· ${fromFav!.name}`}
              </p>
            ) : favName === null ? (
              <button
                type="button"
                className="text-[13px] font-semibold"
                style={{ color: "var(--ink)" }}
                onClick={() => setFavName(defaultFavName())}
                disabled={!items.some((i) => i.name.trim())}
              >
                ☆ 즐겨찾기에 추가
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  autoFocus
                  className="field min-w-0 flex-1 rounded-[12px] px-3 py-2 text-[14px] outline-none"
                  style={{ background: "var(--card)", border: "1px solid var(--line)" }}
                  value={favName}
                  placeholder="이름"
                  onChange={(e) => setFavName(e.target.value)}
                />
                <Button size="sm" onClick={saveFavorite}>
                  저장
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setFavName(null)}>
                  취소
                </Button>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {!existing && !fromFav && (
              <Button variant="secondary" className="flex-1" size="lg" onClick={analyze}>
                다시 분석
              </Button>
            )}
            <Button className="flex-[2]" size="lg" onClick={save} disabled={saving || !items.length}>
              {saving ? "저장 중…" : "저장"}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

export function FavoriteCard({
  fav,
  onClick,
  onDelete,
}: {
  fav: FavoriteMeal;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="relative w-32 shrink-0">
      <button
        type="button"
        onClick={onClick}
        className="card w-full overflow-hidden text-left active:scale-[0.98]"
        style={{ border: "1px solid var(--line)" }}
      >
        {fav.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fav.photo} alt="" className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/3] w-full flex-wrap content-start gap-1 overflow-hidden p-2" style={{ background: "var(--card-2)" }}>
            {fav.items.slice(0, 2).map((i, idx) => (
              <Chip key={idx}>{i.name.length > 9 ? i.name.slice(0, 9) + "…" : i.name}</Chip>
            ))}
            {fav.items.length > 2 && <Chip>+{fav.items.length - 2}</Chip>}
          </div>
        )}
        <div className="px-3 py-2">
          <div className="truncate text-[13px] font-semibold">{fav.name}</div>
          <div className="num text-[12px]" style={{ color: "var(--muted)" }}>
            {Math.round(fav.kcal)}kcal · 단 {Math.round(fav.protein)}g
          </div>
        </div>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs"
          style={{ background: "var(--ink)", color: "#fff" }}
          aria-label="즐겨찾기 삭제"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function ItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: MealItem;
  onChange: (i: MealItem) => void;
  onRemove: () => void;
}) {
  const [openDetail, setOpenDetail] = useState(false);
  const [lookup, setLookup] = useState(false);
  const n = (k: keyof MealItem) => (v: string) => {
    if (k === "grams") return onChange(scaleItem(item, Number(v) || 0));
    // 수치를 손으로 고치면 per100 기준은 버린다
    const next = { ...item, [k]: k === "name" ? v : Number(v) || 0 } as MealItem;
    if (k !== "name") {
      delete next.per100;
      next.source = "manual";
    }
    onChange(next);
  };
  const numInput = "num w-full bg-transparent text-right outline-none";
  return (
    <div className="hairline px-4 py-3 first:border-t-0">
      <div className="flex items-center gap-2">
        <input
          className="min-w-0 flex-1 bg-transparent font-semibold outline-none"
          value={item.name}
          placeholder="음식명"
          onChange={(e) => n("name")(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setLookup(true)}
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{
            background: item.source === "mfds" ? "var(--ink)" : "var(--card-2)",
            color: item.source === "mfds" ? "#fff" : "var(--muted)",
          }}
          aria-label="식약처 DB에서 찾기"
          title="식약처 DB"
        >
          DB
        </button>
        <div className="flex items-center gap-1 text-sm" style={{ color: "var(--muted)" }}>
          <input inputMode="numeric" className={`${numInput} w-12`} value={item.grams} onChange={(e) => n("grams")(e.target.value)} />g
        </div>
        <div className="num w-16 text-right text-sm font-semibold">{item.kcal}kcal</div>
        <button type="button" onClick={() => setOpenDetail((v) => !v)} className="text-xs" style={{ color: "var(--muted)" }} aria-label="상세">
          {openDetail ? "▴" : "▾"}
        </button>
      </div>
      {openDetail && (
        <div className="mt-2 grid grid-cols-5 gap-2 text-[12px]" style={{ color: "var(--muted)" }}>
          {(["kcal", "carbs", "protein", "fat", "sodium"] as const).map((k) => (
            <label key={k} className="rounded-[10px] px-2 py-1.5" style={{ background: "var(--card-2)" }}>
              <div>{{ kcal: "kcal", carbs: "탄 g", protein: "단 g", fat: "지 g", sodium: "나트륨" }[k]}</div>
              <input inputMode="numeric" className={numInput} value={item[k] ?? 0} onChange={(e) => n(k)(e.target.value)} />
            </label>
          ))}
          <div className="col-span-5 mt-1 flex justify-between text-xs">
            <span style={{ color: "var(--muted)" }}>
              {item.source === "mfds" ? "식약처 DB 값 · g 바꾸면 자동 계산" : item.source === "manual" ? "직접 입력" : "AI 추정"}
            </span>
            <button type="button" style={{ color: "var(--danger)" }} onClick={onRemove}>
              이 음식 삭제
            </button>
          </div>
        </div>
      )}
      <FoodSearchSheet
        open={lookup}
        onClose={() => setLookup(false)}
        initialQuery={item.name}
        onPick={(hit) => {
          const grams = item.grams > 0 ? item.grams : (hit.servingG ?? 100);
          onChange(scaleItem({ ...item, name: hit.name, per100: hit.per100, source: "mfds" }, grams));
          setLookup(false);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 식약처 DB 검색                                                      */
/* ------------------------------------------------------------------ */

export interface FoodHit {
  name: string;
  maker?: string;
  category?: string;
  servingG?: number;
  per100: { kcal: number; protein: number; fat: number; carbs: number; sodium: number };
}

function FoodSearchSheet({
  open,
  onClose,
  initialQuery,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  initialQuery: string;
  onPick: (hit: FoodHit) => void;
}) {
  const [q, setQ] = useState(initialQuery);
  const [hits, setHits] = useState<FoodHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQ(initialQuery);
    setHits([]);
    setError(null);
    if (initialQuery.trim()) search(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function search(term: string) {
    const t = term.trim();
    if (!t) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(t)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "검색 실패");
      setHits(json.hits ?? []);
    } catch (e) {
      setError((e as Error).message);
      setHits([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="식약처 DB" tall>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search(q);
        }}
      >
        <input
          autoFocus
          className="field min-w-0 flex-1 rounded-[var(--r-md)] px-4 py-3 outline-none"
          style={{ background: "var(--card)", border: "1px solid var(--line)" }}
          placeholder="닭가슴살, 햇반, 연세 복숭아…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" disabled={busy}>
          {busy ? <Spinner /> : "검색"}
        </Button>
      </form>
      {error && (
        <p className="mt-3 rounded-[var(--r-sm)] px-3 py-2 text-[13px]" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <div className="card mt-3 overflow-hidden">
        {hits.map((h, i) => (
          <button key={i} type="button" onClick={() => onPick(h)} className="hairline flex w-full items-center gap-3 px-4 py-3 text-left first:border-t-0">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold">{h.name}</div>
              <div className="truncate text-[12px]" style={{ color: "var(--muted)" }}>
                {[h.maker, h.category, h.servingG ? `1회 ${h.servingG}g` : null].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="num shrink-0 text-right text-[12px]" style={{ color: "var(--muted)" }}>
              <div className="text-[14px] font-bold" style={{ color: "var(--ink)" }}>
                {h.per100.kcal}
                <span className="text-[11px] font-normal">kcal/100g</span>
              </div>
              탄 {h.per100.carbs} · 단 {h.per100.protein} · 지 {h.per100.fat}
            </div>
          </button>
        ))}
        {!busy && !hits.length && !error && (
          <p className="px-4 py-6 text-center text-[13px]" style={{ color: "var(--muted)" }}>
            검색어 넣고 검색. 브랜드명 붙이면 가공식품도 잡혀.
          </p>
        )}
      </div>
      <p className="mt-3 text-[11px]" style={{ color: "var(--muted)" }}>
        식품의약품안전처 식품영양성분DB. 100g당 값으로 환산해서 g에 맞춰 계산.
      </p>
    </Sheet>
  );
}

function emptyItem(): MealItem {
  return { name: "", grams: 0, kcal: 0, protein: 0, fat: 0, carbs: 0, sodium: 0 };
}

export function guessSlot(): MealSlot {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

function PhotoAction({
  children,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[12px] px-2 text-[13px] font-semibold"
      style={{ background: "var(--card)", border: "1px solid var(--line)" }}
    >
      {icon}
      {children}
    </button>
  );
}

function GalleryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 16l-5-5-8 8" />
    </svg>
  );
}

function CameraIcon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="var(--line)" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
