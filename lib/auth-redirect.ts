/** OAuth 콜백의 next 파라미터는 같은 출처의 경로만. "//evil.com", "https://…", 개행 섞인 값은 "/"로 떨어뜨린다 (오픈 리다이렉트 방지). */
export function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\") || /[\r\n\s]/.test(raw)) return "/";
  if (raw.startsWith("/auth") || raw.startsWith("/api")) return "/"; // 콜백·API로 되돌아가는 루프 방지
  return raw;
}
