"use client";

import { useEffect } from "react";

/** 프로덕션에서만 등록. 개발 중엔 HMR과 충돌해서 끈다. */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    // ?v= 가 바뀌면 새 SW로 인식돼 activate 때 이전 빌드 캐시를 지운다
    const v = process.env.NEXT_PUBLIC_SW_VERSION || "dev";
    navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(v)}`).catch(() => {
      /* 등록 실패해도 앱은 그대로 동작 */
    });
  }, []);
  return null;
}
