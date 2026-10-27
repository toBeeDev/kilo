/** 환경변수 유무로 모드 결정. 둘 다 없으면 로컬 저장 모드로 동작. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = () =>
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/** 서버 전용. GOOGLE_API_KEY가 있으면 Gemini, 없으면 Anthropic. 둘 다 없으면 AI 기능 비활성. */
export type AiProvider = "gemini" | "anthropic";

export const isGeminiConfigured = () => (process.env.GOOGLE_API_KEY ?? "").length > 0;
export const isAnthropicConfigured = () => (process.env.ANTHROPIC_API_KEY ?? "").length > 0;
export const isAiConfigured = () => isGeminiConfigured() || isAnthropicConfigured();

export const aiProvider = (): AiProvider | null => (isGeminiConfigured() ? "gemini" : isAnthropicConfigured() ? "anthropic" : null);

/** provider별 모델. AI_MODEL로 덮어쓸 수 있다. */
export const GEMINI_MODEL = process.env.AI_MODEL ?? "gemini-2.5-flash";
export const ANTHROPIC_MODEL = process.env.AI_MODEL ?? "claude-haiku-5-5";
/** 지금 실제로 쓰는 모델명 (응답 메타용) */
export const aiModel = () => (aiProvider() === "gemini" ? GEMINI_MODEL : ANTHROPIC_MODEL);

export const GUEST_COOKIE = "kilo-guest";

/** 서버 전용. 식약처 식품영양성분 DB (공공데이터포털) */
export const isMfdsConfigured = () => (process.env.MFDS_API_KEY ?? "").length > 0;
