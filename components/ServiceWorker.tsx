"use client";

import { useEffect } from "react";

/** 프로덕션에서만 등록. 개발 중엔 HMR과 충돌해서 끈다. */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* 등록 실패해도 앱은 그대로 동작 */
    });
  }, []);
  return null;
}
