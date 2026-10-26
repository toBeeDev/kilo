"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./config";
import { CloudRepo, LocalRepo, type Repo } from "./repo";
import { supabaseBrowser } from "./supabase/client";

interface Ctx {
  repo: Repo;
  user: User | null;
  ready: boolean;
  signOut: () => Promise<void>;
}

const RepoContext = createContext<Ctx | null>(null);

export function RepoProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = supabaseBrowser();
    sb.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      setUser(data.user ?? null);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e: string, session: Session | null) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
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

  return (
    <RepoContext.Provider value={{ repo, user, ready, signOut }}>
      {children}
    </RepoContext.Provider>
  );
}

export function useRepo() {
  const ctx = useContext(RepoContext);
  if (!ctx) throw new Error("useRepo must be used inside RepoProvider");
  return ctx;
}
