"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./config";
import { CloudRepo, LocalRepo, type Repo } from "./repo";
import { supabaseBrowser } from "./supabase/client";

interface Ctx {
  repo: Repo;
  user: User | null;
  ready: boolean;
  /** 로그인 상태인데 네트워크가 없어 세션 검증을 못 한 상태 */
  offline: boolean;
  signOut: () => Promise<void>;
}

const RepoContext = createContext<Ctx | null>(null);

/** 네트워크 실패(오프라인·DNS·타임아웃)인지, 진짜 인증 실패인지 구분 */
const isNetworkError = (e: AuthError | null) =>
  !!e && (e.name === "AuthRetryableFetchError" || e.status === 0 || /fetch|network|load failed/i.test(e.message));

export function RepoProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured());
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = supabaseBrowser();
    let cancelled = false;

    (async () => {
      // 1) 저장된 세션을 먼저 읽는다 (네트워크 불필요). 서비스 워커가 열어준 오프라인 화면에서도 클라우드 모드를 유지하려고.
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (cancelled) return;
      if (session?.user) setUser(session.user);

      // 2) 서버에 토큰을 검증한다. 네트워크 오류면 1)의 세션을 믿고, 인증 오류면 로그아웃 상태로.
      const { data, error } = await sb.auth.getUser();
      if (cancelled) return;
      if (error && isNetworkError(error)) {
        setOffline(true);
      } else {
        setUser(data.user ?? null);
        setOffline(false);
      }
      setReady(true);
    })();

    const { data: sub } = sb.auth.onAuthStateChange((event: string, session: Session | null) => {
      if (event === "SIGNED_OUT") setUser(null);
      else if (session?.user) setUser(session.user);
    });
    const onOnline = () => {
      sb.auth.getUser().then(({ data, error }) => {
        if (error && isNetworkError(error)) return;
        setUser(data.user ?? null);
        setOffline(false);
      });
    };
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const repo = useMemo<Repo>(() => {
    if (user && isSupabaseConfigured()) return new CloudRepo(supabaseBrowser(), user.id);
    return new LocalRepo();
  }, [user]);

  const signOut = async () => {
    if (isSupabaseConfigured()) await supabaseBrowser().auth.signOut();
    document.cookie = "kilo-guest=; Max-Age=0; path=/";
    window.location.href = "/login";
  };

  return <RepoContext.Provider value={{ repo, user, ready, offline, signOut }}>{children}</RepoContext.Provider>;
}

export function useRepo() {
  const ctx = useContext(RepoContext);
  if (!ctx) throw new Error("useRepo must be used inside RepoProvider");
  return ctx;
}
