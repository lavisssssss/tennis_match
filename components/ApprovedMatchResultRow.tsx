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
    <span className="inline-flex max-w-[9rem] items-center gap-0.5 sm:max-w-none">
      <TierMarkImage playerId={playerId} size={14} />
      <span className="truncate font-medium">{playerLabel(player, playerId)}</span>
    </span>
  );
}

/** 결과 조회·My page 나의 전적 등 동일 양식 */
export function ApprovedMatchResultRow({ m }: { m: MatchRecordWithJoins }) {
  const { a, b } = parseScore(m.set1_score);
  const winnerSide: "A" | "B" | null = a === b ? null : a > b ? "A" : "B";

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">
      {winnerSide === "A" ? (
        <span className="absolute left-2 top-1/2 z-[1] -translate-y-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
          Win
        </span>
      ) : null}
      {winnerSide === "B" ? (
        <span className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
          Win
        </span>
      ) : null}
      <div className="mx-auto flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-1 px-10 text-center text-sm leading-snug">
        <span className="font-medium text-slate-600">[</span>
        <span className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5">
          <PlayerMarkName playerId={m.teama_player1} player={m.teamA_p1} />
          <PlayerMarkName playerId={m.teama_player2} player={m.teamA_p2} />
        </span>
        <span className="shrink-0 px-0.5 font-semibold tabular-nums text-slate-900">
          {a}:{b}
        </span>
        <span className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5">
          <PlayerMarkName playerId={m.teamb_player1} player={m.teamB_p1} />
          <PlayerMarkName playerId={m.teamb_player2} player={m.teamB_p2} />
        </span>
        <span className="font-medium text-slate-600">]</span>
      </div>
    </div>
  );
}
