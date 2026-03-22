"use client";

import { resolveDisplayTier, tierBadgeClass } from "@/lib/eloTier";
import { useTierRoster } from "@/components/TierRosterProvider";

export function TierBadge({
  playerId,
  className = "",
}: {
  playerId: string;
  className?: string;
}) {
  const { roster, ready } = useTierRoster();

  if (!ready || roster.length === 0) {
    return (
      <span
        className={`inline-flex h-5 min-w-[2.5rem] shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-2 text-[9px] font-semibold text-slate-400 sm:h-[1.35rem] sm:text-[10px] ${className}`}
        title="티어 계산 중"
      >
        …
      </span>
    );
  }

  const t = resolveDisplayTier(roster, playerId);
  const title =
    t.code === "australian_open_provisional"
      ? `${t.labelKo} (등록게임수 5게임 미만)`
      : `${t.labelKo} · ${t.labelEn} (전체 대비 상대 티어)`;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold leading-none sm:text-[10px] ${tierBadgeClass(t.code)} ${className}`}
      title={title}
    >
      {t.labelKo}
    </span>
  );
}
