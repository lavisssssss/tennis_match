"use client";

import { TierMarkImage } from "@/components/TierMarkImage";
import { parseScore, type MatchRecordWithJoins } from "@/lib/matches";

type JoinedPlayer = NonNullable<MatchRecordWithJoins["teamA_p1"]>;

function playerLabel(p: JoinedPlayer | null | undefined, fallbackId: string) {
  return p?.name ?? p?.display_name ?? `${fallbackId.slice(0, 8)}…`;
}

/** 한글 음절만 이루어진 이름은 글자마다 띄어 씀 (예: 소웅 → 소 웅) */
function spacedHangulName(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  const chars = Array.from(t);
  const allHangul = chars.every((c) => {
    const cp = c.codePointAt(0);
    return cp !== undefined && cp >= 0xac00 && cp <= 0xd7a3;
  });
  return allHangul ? chars.join(" ") : t;
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

type Props = {
  m: MatchRecordWithJoins;
  /** 결과 조회: W·티어 마크 없이 선수명·스코어만 */
  variant?: "full" | "records";
};

/** 결과 조회(`records`)·My page 나의 전적(`full`) */
export function ApprovedMatchResultRow({ m, variant = "full" }: Props) {
  const { a, b } = parseScore(m.set1_score);
  const winnerSide: "A" | "B" | null = a === b ? null : a > b ? "A" : "B";

  if (variant === "records") {
    const toneA =
      winnerSide === "A" ? "font-semibold text-teal-600" : "font-medium text-slate-800";
    const toneB =
      winnerSide === "B" ? "font-semibold text-teal-600" : "font-medium text-slate-800";

    const la1 = spacedHangulName(playerLabel(m.teamA_p1, m.teama_player1));
    const la2 = spacedHangulName(playerLabel(m.teamA_p2, m.teama_player2));
    const lb1 = spacedHangulName(playerLabel(m.teamB_p1, m.teamb_player1));
    const lb2 = spacedHangulName(playerLabel(m.teamB_p2, m.teamb_player2));

    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:gap-x-3">
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-1 text-right leading-snug">
            <span className={`min-w-0 ${toneA}`}>{la1}</span>
            <span className="shrink-0 text-slate-300">·</span>
            <span className={`min-w-0 ${toneA}`}>{la2}</span>
          </div>
          <div className="flex w-full min-w-[3rem] shrink-0 justify-center px-1 sm:min-w-[3.25rem]">
            <span className="font-bold tabular-nums text-slate-900">{a}:{b}</span>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-start gap-x-1 text-left leading-snug">
            <span className={`min-w-0 ${toneB}`}>{lb1}</span>
            <span className="shrink-0 text-slate-300">·</span>
            <span className={`min-w-0 ${toneB}`}>{lb2}</span>
          </div>
        </div>
      </div>
    );
  }

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
