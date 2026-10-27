"use client";

import { useEffect, useRef, useState } from "react";
import { todayStr } from "./types";

/**
 * 오늘 날짜. 자정을 넘기거나 탭을 다시 열었을 때 갱신된다.
 * 마운트 시점에 고정해 두면 헬스장에서 자정 넘겨 기록할 때 어제로 들어간다.
 */
export function useToday(): string {
  const [today, setToday] = useState(todayStr);
  useEffect(() => {
    const check = () => setToday((cur) => (cur === todayStr() ? cur : todayStr()));
    const id = setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);
  return today;
}

/**
 * 화면이 보고 있는 날짜(day) + 오늘. 사용자가 "오늘"을 보고 있었으면 자정이 지나도 오늘을 따라간다.
 * 과거 날짜를 보고 있었으면 그대로 둔다.
 */
export function useDay(): [string, (d: string) => void, string] {
  const today = useToday();
  const [day, setDay] = useState(today);
  const prevToday = useRef(today);
  useEffect(() => {
    if (prevToday.current !== today) {
      setDay((d) => (d === prevToday.current ? today : d));
      prevToday.current = today;
    }
  }, [today]);
  return [day, setDay, today];
}

/**
 * 비동기 불러오기 경쟁 방지. 날짜를 빠르게 넘기면 이전 요청이 나중에 끝나 덮어쓸 수 있다.
 * load() 안에서 `const t = token(); ... if (!fresh(t)) return;` 로 쓴다.
 */
export function useLatest() {
  const seq = useRef(0);
  const token = () => ++seq.current;
  const fresh = (t: number) => t === seq.current;
  return { token, fresh };
}
