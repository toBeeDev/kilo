"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabase/client";

type Provider = "google" | "kakao";

export default function LoginView() {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [standaloneIos, setStandaloneIos] = useState(false);
  const configured = isSupabaseConfigured();

  // iOS 홈 화면 앱에서 OAuth를 시작하면 Safari로 빠져나가고 세션이 Safari에만 남는다 → 미리 안내
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    setStandaloneIos(standalone && ios);
  }, []);

  async function signIn(provider: Provider) {
    setBusy(provider);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setBusy(null);
    }
  }

  function guest() {
    document.cookie = "kilo-guest=1; Max-Age=31536000; path=/; SameSite=Lax";
    window.location.href = "/";
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-10 pt-24">
      <div className="flex-1">
        <svg width="52" height="52" viewBox="0 0 64 64" className="mb-6" aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--accent)" />
          <circle cx="32" cy="32" r="15" fill="none" stroke="var(--bg)" strokeWidth="5" strokeLinecap="round" strokeDasharray="70 100" transform="rotate(-90 32 32)" />
        </svg>
        <h1 className="text-[32px] font-bold leading-tight tracking-tight">
          인바디로 목표 잡고,
          <br />
          사진으로 기록하고.
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: "var(--muted)" }}>
          로그인하면 폰·노트북 어디서든 같은 기록을 봐.
        </p>
      </div>

      <div className="space-y-2.5">
        {configured && standaloneIos && (
          <p className="rounded-[var(--r-md)] px-4 py-3 text-[13px]" style={{ background: "var(--warn-soft)", color: "var(--ink)" }}>
            홈 화면 앱에서는 로그인이 Safari로 열려. 로그인이 안 붙으면 Safari에서 먼저 로그인한 뒤 홈 화면 아이콘으로 다시 열어.
          </p>
        )}
        {configured ? (
          <>
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
        {error && (
          <p className="text-center text-[13px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>
    </main>
  );
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
