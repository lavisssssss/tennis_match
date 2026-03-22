"use client";

import { useState } from "react";
import { PageMascot } from "@/components/PageMascot";
import { createPlayer, tryLoginPlayer } from "@/lib/players";
import type { Player } from "@/lib/players";

type Props = {
  onLoggedIn: (player: Player) => void;
};

export function PlayerLoginCard({ onLoggedIn }: Props) {
  const [name, setName] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [signupPrompt, setSignupPrompt] = useState(false);

  async function handleLogin() {
    setMessage(null);
    setSignupPrompt(false);
    setBusy(true);
    try {
      const result = await tryLoginPlayer({ name, phone_last4: phoneLast4 });
      if (result.kind === "ok" && result.player) {
        onLoggedIn(result.player);
        return;
      }
      setSignupPrompt(true);
      setMessage(
        "입력하신 이름과 연락처 뒷자리 조합으로 등록된 계정이 없습니다. 회원가입 하시겠습니까?",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "로그인 처리 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignupYes() {
    setMessage(null);
    setBusy(true);
    try {
      const player = await createPlayer({ name, phone_last4: phoneLast4 });
      setSignupPrompt(false);
      onLoggedIn(player);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "회원가입 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function handleSignupNo() {
    setSignupPrompt(false);
    setMessage(null);
  }

  return (
    <section className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <PageMascot variant="participate" />
      <div className="mb-4 pr-14">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">로그인</p>
        <h2 className="text-lg font-semibold leading-snug text-slate-800">
          이름과 휴대폰 번호 뒷자리를 입력하세요.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <label className="space-y-1">
          <span className="text-[11px] font-medium text-slate-600">이름</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="username"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-800 outline-none ring-teal-500 focus:ring-2"
            placeholder="홍길동"
          />
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-medium text-slate-600">휴대폰 번호 뒷자리 4자리</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={phoneLast4}
            onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
            autoComplete="current-password"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-800 outline-none ring-teal-500 focus:ring-2"
            placeholder="1234"
          />
        </label>

        {message ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {message}
          </div>
        ) : null}

        {signupPrompt ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleSignupYes}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              예, 가입하기
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSignupNo}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              아니오
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={handleLogin}
            className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "확인 중..." : "로그인"}
          </button>
        )}
      </div>
    </section>
  );
}
