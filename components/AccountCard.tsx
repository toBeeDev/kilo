"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRepo } from "@/lib/repo-provider";
import { CloudRepo } from "@/lib/repo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button, Card, Field } from "./ui";
import { errorText, useToast } from "./Toast";

/**
 * 마이 탭 "계정" 카드. 로그인 사용자만.
 * - 이메일 가입자: 비밀번호 변경 (재설정 메일 링크로 들어오면 ?password=1 로 자동 펼침)
 * - 모두: 회원 탈퇴 — 사진 파일 → 모든 기록(cascade) → auth 사용자 순으로 지운다. 되돌릴 수 없다.
 */
export function AccountCard({ user }: { user: User }) {
  const { repo, signOut } = useRepo();
  const toast = useToast();
  const isEmail = user.app_metadata?.provider === "email";
  const providerLabel = ({ email: "이메일", kakao: "카카오", google: "Google" } as Record<string, string>)[user.app_metadata?.provider ?? ""] ?? "SSO";

  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delWord, setDelWord] = useState("");
  const [delBusy, setDelBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("password") === "1") setPwOpen(true);
  }, []);

  async function changePassword() {
    if (pw.length < 8) {
      toast("비밀번호는 8자 이상.");
      return;
    }
    setPwBusy(true);
    try {
      const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
      if (error) throw error;
      toast("비밀번호를 바꿨어.", "info");
      setPw("");
      setPwOpen(false);
      window.history.replaceState(null, "", "/me");
    } catch (e) {
      toast(errorText(e, "비밀번호를 못 바꿨어."));
    } finally {
      setPwBusy(false);
    }
  }

  async function deleteAccount() {
    if (delWord.trim() !== "탈퇴") return;
    if (!(repo instanceof CloudRepo)) return;
    setDelBusy(true);
    try {
      await repo.deleteAccount();
      await signOut();
    } catch (e) {
      toast(errorText(e, "탈퇴 처리에 실패했어. 다시 시도해."));
      setDelBusy(false);
    }
  }

  return (
    <Card className="mt-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">계정</h2>
        <span className="text-[12px]" style={{ color: "var(--muted)" }}>
          {providerLabel} · {user.email ?? "이메일 없음"}
        </span>
      </div>

      {isEmail && (
        <div className="mt-3">
          {pwOpen ? (
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1.5 block text-[13px]" style={{ color: "var(--muted)" }}>
                  새 비밀번호
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="8자 이상"
                  className="w-full rounded-[var(--r-md)] px-3.5 py-3 outline-none"
                  style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}
                />
              </label>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={changePassword} disabled={pwBusy}>
                  {pwBusy ? "바꾸는 중…" : "비밀번호 변경"}
                </Button>
                <Button variant="ghost" onClick={() => setPwOpen(false)}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <button type="button" className="text-[13px] underline underline-offset-2" style={{ color: "var(--muted)" }} onClick={() => setPwOpen(true)}>
              비밀번호 변경
            </button>
          )}
        </div>
      )}

      <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--line)" }}>
        {delOpen ? (
          <div className="space-y-2">
            <p className="text-[13px]" style={{ color: "var(--danger)" }}>
              인바디·식단·운동·사진이 전부 지워지고 되돌릴 수 없어. 계속하려면 아래에 <b>탈퇴</b> 라고 적어.
            </p>
            <Field value={delWord} onChange={setDelWord} type="text" inputMode="text" placeholder="탈퇴" />
            <div className="flex gap-2">
              <Button variant="danger" className="flex-1" onClick={deleteAccount} disabled={delBusy || delWord.trim() !== "탈퇴"}>
                {delBusy ? "지우는 중…" : "계정 삭제"}
              </Button>
              <Button variant="ghost" onClick={() => setDelOpen(false)} disabled={delBusy}>
                취소
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" className="text-[13px] underline underline-offset-2" style={{ color: "var(--muted)" }} onClick={() => setDelOpen(true)}>
            회원 탈퇴
          </button>
        )}
      </div>
    </Card>
  );
}
