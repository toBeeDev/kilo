/** 환경변수 유무로 모드 결정. 둘 다 없으면 로컬 저장 모드로 동작. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = () =>
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/** 서버 전용 */
export const isAiConfigured = () => (process.env.ANTHROPIC_API_KEY ?? "").length > 0;

export const AI_MODEL = process.env.AI_MODEL ?? "claude-haiku-5-5";

export const GUEST_COOKIE = "kilo-guest";

/** 서버 전용. 식약처 식품영양성분 DB (공공데이터포털) */
export const isMfdsConfigured = () => (process.env.MFDS_API_KEY ?? "").length > 0;
