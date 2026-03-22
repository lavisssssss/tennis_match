"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlayerLoginCard } from "@/components/PlayerLoginCard";
import { usePlayerSession } from "@/hooks/usePlayerSession";
import type { Player } from "@/lib/players";

export default function HomePage() {
  const router = useRouter();
  const { session, ready, login } = usePlayerSession();

  useEffect(() => {
    if (ready && session) router.replace("/my-page");
  }, [ready, session, router]);

  function onLoggedIn(player: Player) {
    login(player);
    router.replace("/my-page");
  }

  if (!ready) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
          불러오는 중...
        </div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
          My page로 이동 중...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
      <section className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800">Home</h2>
        <p className="text-xs text-slate-600">
          로그인 후 My page로 이동합니다. 참석 신청은 상단 메뉴의 참여신청에서 할 수 있습니다.
        </p>
      </section>
      <PlayerLoginCard onLoggedIn={onLoggedIn} />
    </div>
  );
}
