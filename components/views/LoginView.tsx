"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { setGuestCookie } from "@/lib/guest";
import { supabaseBrowser } from "@/lib/supabase/client";

type Provider = "google" | "kakao";
export type AuthMode = "login" | "signup";

/**
 * 로그인 / 회원가입.
 * - 이메일+비밀번호: Supabase 기본 제공. 카카오·구글 개발자 등록 없이도 바로 된다.
 * - 카카오·구글: Supabase Providers 에서 켠 것만 버튼이 동작한다 (안 켰으면 에러 문구).
 * 가입 시 "이메일 확인"이 켜져 있으면 메일 링크를 눌러야 로그인된다 (Authentication → Providers → Email 에서 끌 수 있음).
 */
export default function LoginView({ mode: initialMode = "login" }: { mode?: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<Provider | "email" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [standaloneIos, setStandaloneIos] = useState(false);
  const configured = isSupabaseConfigured();

  // iOS 홈 화면 앱에서 OAuth를 시작하면 Safari로 빠져나가고 세션이 Safari에만 남는다 → 미리 안내
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    setStandaloneIos(standalone && ios);
    const q = new URLSearchParams(window.location.search);
    if (q.get("error") === "auth") setError("로그인 처리에 실패했어. 다시 시도해.");
    if (q.get("reset") === "sent") setNotice("비밀번호 재설정 메일을 보냈어. 메일의 링크를 눌러.");
  }, []);

  async function signIn(provider: Provider) {
    setBusy(provider);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(friendly(error.message));
      setBusy(null);
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim();
    if (!em || !password) return;
    if (mode === "signup" && password.length < 8) {
      setError("비밀번호는 8자 이상.");
      return;
    }
    setBusy("email");
    setError(null);
    setNotice(null);
    const sb = supabaseBrowser();
    if (mode === "login") {
      const { error } = await sb.auth.signInWithPassword({ email: em, password });
      if (error) {
        setError(friendly(error.message));
        setBusy(null);
        return;
      }
      window.location.href = "/";
      return;
    }
    const { data, error } = await sb.auth.signUp({
      email: em,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(friendly(error.message));
      setBusy(null);
      return;
    }
    if (data.session) {
      window.location.href = "/"; // 이메일 확인 꺼진 프로젝트: 바로 로그인
      return;
    }
    setNotice(`${em} 로 확인 메일을 보냈어. 링크를 누르면 가입이 끝나.`);
    setBusy(null);
  }

  async function resetPassword() {
    const em = email.trim();
    if (!em) {
      setError("위에 이메일을 먼저 적어.");
      return;
    }
    setBusy("reset");
    setError(null);
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(em, {
      redirectTo: `${window.location.origin}/auth/callback?next=/me?password=1`,
    });
    setBusy(null);
    if (error) setError(friendly(error.message));
    else setNotice("비밀번호 재설정 메일을 보냈어. 링크를 누르면 마이 탭에서 새 비밀번호를 정할 수 있어.");
  }

  function guest() {
    setGuestCookie();
    window.location.href = "/";
  }

  const isSignup = mode === "signup";

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-10 pt-16">
      <div className="flex-1">
        <svg width="52" height="52" viewBox="0 0 64 64" className="mb-6" aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--accent)" />
          <circle cx="32" cy="32" r="15" fill="none" stroke="var(--bg)" strokeWidth="5" strokeLinecap="round" strokeDasharray="70 100" transform="rotate(-90 32 32)" />
        </svg>
        <h1 className="text-[30px] font-bold leading-tight tracking-tight">
          {isSignup ? (
            <>
              계정 하나 만들면
              <br />
              폰·노트북이 같은 기록.
            </>
          ) : (
            <>
              인바디로 목표 잡고,
              <br />
              사진으로 기록하고.
            </>
          )}
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: "var(--muted)" }}>
          {isSignup ? "이메일 하나면 돼. 사진은 비공개 저장소에만 올라가." : "로그인하면 폰·노트북 어디서든 같은 기록을 봐."}
        </p>

        {configured && (
          <form onSubmit={submitEmail} className="mt-8 space-y-2.5">
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-13 w-full rounded-[var(--r-md)] px-4 py-3.5 text-[15px] outline-none"
              style={{ background: "var(--card)", border: "1px solid var(--line)" }}
            />
            <input
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={isSignup ? 8 : undefined}
              placeholder={isSignup ? "비밀번호 (8자 이상)" : "비밀번호"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[var(--r-md)] px-4 py-3.5 text-[15px] outline-none"
              style={{ background: "var(--card)", border: "1px solid var(--line)" }}
            />
            <button
              type="submit"
              disabled={busy !== null}
              className="flex h-14 w-full items-center justify-center rounded-[var(--r-md)] text-[15px] font-semibold active:scale-[0.98] disabled:opacity-60"
              style={{ background: "var(--ink)", color: "#fff" }}
            >
              {busy === "email" ? "잠깐…" : isSignup ? "가입하기" : "이메일로 로그인"}
            </button>
            <div className="flex items-center justify-between px-1 text-[13px]" style={{ color: "var(--muted)" }}>
              {isSignup ? (
                <button type="button" onClick={() => switchMode("login")}>
                  이미 계정 있어 → <span className="font-semibold underline underline-offset-2">로그인</span>
                </button>
              ) : (
                <button type="button" onClick={() => switchMode("signup")}>
                  처음이야 → <span className="font-semibold underline underline-offset-2">회원가입</span>
                </button>
              )}
              {!isSignup && (
                <button type="button" onClick={resetPassword} disabled={busy !== null} className="underline underline-offset-2">
                  {busy === "reset" ? "보내는 중…" : "비밀번호 찾기"}
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      <div className="mt-8 space-y-2.5">
        {configured && standaloneIos && (
          <p className="rounded-[var(--r-md)] px-4 py-3 text-[13px]" style={{ background: "var(--warn-soft)", color: "var(--ink)" }}>
            홈 화면 앱에서는 카카오·구글 로그인이 Safari로 열려. 이메일 로그인은 앱 안에서 바로 돼.
          </p>
        )}
        {configured ? (
          <>
            <div className="flex items-center gap-3 py-1 text-[12px]" style={{ color: "var(--muted)" }}>
              <span className="h-px flex-1" style={{ background: "var(--line)" }} />
              또는
              <span className="h-px flex-1" style={{ background: "var(--line)" }} />
            </div>
            <OAuthButton onClick={() => signIn("kakao")} busy={busy === "kakao"} style={{ background: "#FEE500", color: "#191919" }}>
              <KakaoIcon /> 카카오로 계속하기
            </OAuthButton>
            <OAuthButton onClick={() => signIn("google")} busy={busy === "google"} style={{ background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)" }}>
              <GoogleIcon /> Google로 계속하기
            </OAuthButton>
          </>
        ) : (
          <p className="rounded-[var(--r-md)] px-4 py-3 text-[13px]" style={{ background: "var(--card)", color: "var(--muted)" }}>
            Supabase 키가 없어서 로그인은 꺼져 있어. 기록은 이 기기에만 저장돼.
          </p>
        )}
        <button type="button" onClick={guest} className="w-full py-3 text-[14px] font-semibold" style={{ color: "var(--muted)" }}>
          로그인 없이 이 기기에서만 쓰기
        </button>
        {notice && (
          <p className="rounded-[var(--r-md)] px-4 py-3 text-center text-[13px]" style={{ background: "var(--ok-soft)", color: "var(--ink)" }}>
            {notice}
          </p>
        )}
        {error && (
          <p className="text-center text-[13px]" style={{ color: "var(--danger)" }} role="alert">
            {error}
          </p>
        )}
        <p className="pt-2 text-center text-[12px]" style={{ color: "var(--muted)" }}>
          {isSignup ? (
            <Link href="/login" className="underline underline-offset-2">
              로그인 화면으로
            </Link>
          ) : (
            <Link href="/signup" className="underline underline-offset-2">
              회원가입 화면으로
            </Link>
          )}
        </p>
      </div>
    </main>
  );

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setNotice(null);
    window.history.replaceState(null, "", next === "signup" ? "/signup" : "/login");
  }
}

/** Supabase 영문 오류 → 사람 말 */
function friendly(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "이메일 또는 비밀번호가 틀렸어.";
  if (m.includes("email not confirmed")) return "메일함에서 확인 링크를 먼저 눌러.";
  if (m.includes("user already registered") || m.includes("already been registered")) return "이미 가입된 이메일이야. 로그인해.";
  if (m.includes("password should be at least")) return "비밀번호는 8자 이상.";
  if (m.includes("rate limit") || m.includes("too many")) return "요청이 너무 잦아. 잠시 후 다시.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) return "이 로그인 방식은 아직 안 켜져 있어. 이메일로 들어와.";
  if (m.includes("invalid email")) return "이메일 형식을 확인해.";
  return msg;
}

function OAuthButton({
  children,
  onClick,
  busy,
  style,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  style: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex h-14 w-full items-center justify-center gap-2.5 rounded-[var(--r-md)] text-[15px] font-semibold active:scale-[0.98] disabled:opacity-60"
      style={style}
    >
      {children}
    </button>
  );
}

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3C6.5 3 2 6.6 2 10.9c0 2.7 1.8 5.1 4.5 6.5l-1 3.7c-.1.3.3.6.6.4l4.4-2.9c.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-7.8S17.5 3 12 3z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6c-.3 1.4-1 2.5-2.2 3.3v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.1z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H2.1v2.9C3.9 20.5 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.8 14c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V6.9H2.1C1.4 8.4 1 10.1 1 11.9s.4 3.5 1.1 5l3.7-2.9z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.7 1 3.9 3.5 2.1 6.9L5.8 9.8c.9-2.7 3.3-4.4 6.2-4.4z" />
    </svg>
  );
}
