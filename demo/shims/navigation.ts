import { useSyncExternalStore } from "react";

/** 데모 번들용 해시 라우터. 아티팩트 뷰어는 #token 형태만 허용. */
const TOKENS: Record<string, string> = { home: "/", meals: "/meals", workout: "/workout", me: "/me" };

export function pathFromHash(): string {
  const t = typeof location === "undefined" ? "" : location.hash.replace(/^#/, "");
  return TOKENS[t] ?? "/";
}
export function hashFromPath(p: string): string {
  const t = Object.entries(TOKENS).find(([, v]) => v === p)?.[0];
  return "#" + (t ?? "home");
}
const subscribe = (cb: () => void) => {
  addEventListener("hashchange", cb);
  return () => removeEventListener("hashchange", cb);
};
export function usePathname() {
  return useSyncExternalStore(subscribe, pathFromHash, () => "/");
}
export function useRouter() {
  return {
    push: (p: string) => {
      location.hash = hashFromPath(p);
    },
    replace: (p: string) => {
      location.hash = hashFromPath(p);
    },
    back: () => history.back(),
  };
}
