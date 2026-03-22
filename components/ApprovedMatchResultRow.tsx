"use client";

import { TierMarkImage } from "@/components/TierMarkImage";
import { parseScore, type MatchRecordWithJoins } from "@/lib/matches";

type JoinedPlayer = NonNullable<MatchRecordWithJoins["teamA_p1"]>;

function playerLabel(p: JoinedPlayer | null | undefined, fallbackId: string) {
  return p?.name ?? p?.display_name ?? `${fallbackId.slice(0, 8)}…`;
}

function PlayerMarkName({
  playerId,
  player,
}: {
  playerId: string;
  player: JoinedPlayer | null | undefined;
}) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1">
      <TierMarkImage playerId={playerId} size={14} />
      <span className="min-w-0 truncate font-medium">{playerLabel(player, playerId)}</span>
    </span>
  );
}

/** 결과 조회·My page 나의 전적 등 동일 양식 — 2줄(팀 A / 팀 B), 가운데 스코어 */
export function ApprovedMatchResultRow({ m }: { m: MatchRecordWithJoins }) {
  const { a, b } = parseScore(m.set1_score);
  const winnerSide: "A" | "B" | null = a === b ? null : a > b ? "A" : "B";

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">
      {winnerSide === "A" ? (
        <span
          className="absolute left-2 top-1/2 z-[1] -translate-y-1/2 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
          aria-label="승"
        >
          W
        </span>
      ) : null}
      {winnerSide === "B" ? (
        <span
          className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
          aria-label="승"
        >
          W
        </span>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] grid-rows-2 gap-x-2 gap-y-2 px-6 sm:px-7">
        <div className="flex min-w-0 items-center justify-end">
          <PlayerMarkName playerId={m.teama_player1} player={m.teamA_p1} />
        </div>
        <div className="row-span-2 flex items-center justify-center self-stretch px-0.5">
          <span className="shrink-0 text-base font-bold tabular-nums leading-none text-slate-900">
            {a}:{b}
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-start">
          <PlayerMarkName playerId={m.teama_player2} player={m.teamA_p2} />
        </div>
        <div className="flex min-w-0 items-center justify-end">
          <PlayerMarkName playerId={m.teamb_player1} player={m.teamB_p1} />
        </div>
        <div className="flex min-w-0 items-center justify-start">
          <PlayerMarkName playerId={m.teamb_player2} player={m.teamB_p2} />
        </div>
      </div>
    </div>
  );
}
