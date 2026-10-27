"use client";

import { GUEST_COOKIE } from "./config";

/** "로그인 없이 쓰기" 쿠키. 미들웨어가 이 값으로 /login 리다이렉트를 건너뛴다. */
export function setGuestCookie() {
  document.cookie = `${GUEST_COOKIE}=1; Max-Age=31536000; path=/; SameSite=Lax`;
}
export function clearGuestCookie() {
  document.cookie = `${GUEST_COOKIE}=; Max-Age=0; path=/`;
}
