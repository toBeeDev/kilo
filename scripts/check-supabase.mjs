#!/usr/bin/env node
/**
 * Supabase 세팅 점검. 대시보드 작업(schema.sql 실행, 로그인 제공자, 리다이렉트)이 됐는지 밖에서 확인한다.
 *   node scripts/check-supabase.mjs                 # .env.local 의 NEXT_PUBLIC_SUPABASE_* 사용
 *   node scripts/check-supabase.mjs <URL> <ANON_KEY>
 * anon 키만 쓴다 (공개 키). service_role 은 절대 넣지 말 것.
 */
import { readFileSync } from "node:fs";

function fromEnvLocal() {
  try {
    const env = Object.fromEntries(
      readFileSync(".env.local", "utf8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
        .map((l) => l.split("=").map((s) => s.trim())),
    );
    return [env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY];
  } catch {
    return [];
  }
}

const [url, key] = process.argv.length >= 4 ? [process.argv[2], process.argv[3]] : fromEnvLocal();
if (!url || !key) {
  console.error("사용법: node scripts/check-supabase.mjs <PROJECT_URL> <ANON_KEY>  (또는 .env.local 에 채워 두기)");
  process.exit(2);
}
const base = url.replace(/\/$/, "");
const H = { apikey: key, Authorization: `Bearer ${key}` };
const TABLES = ["body_metrics", "meal_logs", "favorite_meals", "workout_routines", "workout_sets", "daily_summary"];
const VIEWS = ["v_daily_intake", "v_daily_workout"];
const SITE = "https://kilo-red.vercel.app";

let fails = 0;
const ok = (label, extra = "") => console.log(`  ✓ ${label}${extra ? "  " + extra : ""}`);
const bad = (label, extra = "") => {
  fails += 1;
  console.log(`  ✗ ${label}${extra ? "  " + extra : ""}`);
};
const get = (path, headers = H) => fetch(base + path, { headers, signal: AbortSignal.timeout(10_000) });

console.log(`\n[1] 연결  ${base}`);
try {
  // 루트(OpenAPI)는 프로젝트 설정에 따라 anon 에 401 을 줄 수 있어 테이블 하나로 확인한다
  const r = await get("/rest/v1/meal_logs?select=id&limit=1", H);
  if (r.status === 200) ok("REST 응답");
  else if (r.status === 401 || r.status === 403) bad("REST 인증 실패", `HTTP ${r.status} — anon 키가 이 프로젝트 것인지 확인`);
  else if (r.status === 404) ok("REST 응답 (스키마는 아래에서 확인)");
  else bad("REST 응답", `HTTP ${r.status}`);
} catch (e) {
  bad("REST 연결 실패", e.message);
  process.exit(1);
}

console.log("\n[2] 스키마 (schema.sql 실행 여부)");
for (const t of [...TABLES, ...VIEWS]) {
  const r = await get(`/rest/v1/${t}?select=*&limit=1`);
  if (r.status === 200) {
    const rows = await r.json();
    // anon 으로는 RLS 때문에 0행이어야 정상. 행이 보이면 RLS 가 빠진 것.
    rows.length === 0 ? ok(t) : bad(t, "anon 키로 행이 보임 → RLS 정책 누락");
  } else if (r.status === 404) bad(t, "없음 → SQL Editor 에서 schema.sql 다시 실행");
  else bad(t, `HTTP ${r.status}`);
}
// 인자까지 맞춰 불러야 404(없음)와 구분된다. anon 은 RLS/권한 때문에 아무 행도 못 바꾸니 안전.
const ZERO = "00000000-0000-0000-0000-000000000000";
for (const [fn, args] of [["touch_favorite_meal", { fav_id: ZERO }], ["touch_workout_routine", { routine_id: ZERO }], ["delete_own_account", {}]]) {
  const r = await fetch(base + `/rest/v1/rpc/${fn}`, { method: "POST", headers: { ...H, "content-type": "application/json" }, body: JSON.stringify(args), signal: AbortSignal.timeout(10_000) });
  if (r.status === 404) bad(`함수 ${fn}`, "없음 → schema.sql 다시 실행");
  else if (fn === "delete_own_account" && r.status === 200) bad(`함수 ${fn}`, "anon 이 실행 가능 → revoke 가 안 먹음");
  else ok(`함수 ${fn}`, fn === "delete_own_account" ? "(anon 차단됨)" : "");
}

console.log("\n[3] 사진 버킷 meal-photos");
{
  const r = await fetch(base + "/storage/v1/object/list/meal-photos", {
    method: "POST",
    headers: { ...H, "content-type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 1 }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await r.text();
  if (r.status === 200) {
    const rows = JSON.parse(body);
    rows.length === 0 ? ok("버킷 있음, anon 으로 목록 비어 있음(정책 OK)") : bad("anon 으로 파일이 보임 → read 정책 확인");
  } else if (/not found/i.test(body) && /bucket/i.test(body)) bad("버킷 없음", "schema.sql 맨 아래 storage 부분 실행 확인");
  else ok("버킷 접근 거부(비공개 정상)", `HTTP ${r.status}`);
  const pub = await get("/storage/v1/object/public/meal-photos/x/y.jpg", {});
  pub.status === 200 ? bad("공개 URL 로 열림 → 버킷 public 을 false 로") : ok("공개 URL 차단");
}

console.log("\n[4] 로그인 제공자 (Authentication → Providers)");
{
  const r = await get("/auth/v1/settings");
  if (!r.ok) bad("auth settings", `HTTP ${r.status}`);
  else {
    const s = await r.json();
    const ext = s.external ?? {};
    const on = ["email", "kakao", "google"].filter((p) => ext[p]);
    on.length ? ok(`켜진 제공자: ${on.join(", ")}`) : bad("Email/Kakao/Google 전부 꺼짐", "Providers 에서 Email 은 기본으로 켜져 있어야 정상");
    if (!ext.email) bad("Email 제공자 꺼짐", "Authentication → Providers → Email 켜기");
    if (s.mailer_autoconfirm === false || s.mailer_autoconfirm === undefined) console.log("  · 가입 시 이메일 확인이 켜져 있을 수 있음 — 혼자 쓰면 Providers → Email → Confirm email 을 꺼도 됨");
  }
}

console.log("\n[5] 리다이렉트 (Authentication → URL Configuration)");
{
  // 허용 목록에 없는 redirect_to 는 Site URL 로 떨어진다. 배포 콜백을 넣고 Location 을 본다.
  const r = await fetch(base + `/auth/v1/authorize?provider=kakao&redirect_to=${encodeURIComponent(SITE + "/auth/callback")}`, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
  const loc = r.headers.get("location") ?? "";
  if (r.status >= 300 && r.status < 400 && /kauth\.kakao|accounts\.google|kakao/i.test(loc)) ok("Kakao authorize 리다이렉트 동작");
  else if (r.status === 400 && /not enabled/i.test(await r.clone().text())) console.log("  · Kakao 제공자 꺼짐 (선택 사항 — 이메일 로그인만 쓰면 무시)");
  else if (r.status === 400) bad("authorize 400", (await r.text()).slice(0, 120));
  else ok("authorize 응답", `HTTP ${r.status}`);
  console.log(`  · Redirect URLs 에 ${SITE}/auth/callback 와 http://localhost:3000/auth/callback 이 있는지는 대시보드에서만 보임`);
}

console.log(fails ? `\n${fails}개 항목 확인 필요\n` : "\n전부 통과. 이제 Vercel 환경변수에 NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY 넣고 Redeploy.\n");
process.exit(fails ? 1 : 0);
