"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ApprovedMatchResultRow } from "@/components/ApprovedMatchResultRow";
import { useTierRoster } from "@/components/TierRosterProvider";
import { WinLossDonut } from "@/components/WinLossDonut";
import { useResetViewportZoomOnMount } from "@/hooks/useResetViewportZoomOnMount";
import { usePlayerSession } from "@/hooks/usePlayerSession";
import {
  PROVISIONAL_TIER_INFO,
  PROVISIONAL_TIER_MAX_MATCHES_EXCLUDED,
  resolveDisplayTier,
  type TierCode,
} from "@/lib/eloTier";
import { tierBadgeImageSrc } from "@/lib/tierBranding";
import {
  computeApprovedMatchCareerStats,
  computeRecentGamesDigest,
  fetchMyApprovedMatchLines,
  type CareerFromMatches,
  type Recent10Digest,
} from "@/lib/myPageData";
import type { MatchRecordWithJoins } from "@/lib/matches";
import { fetchRatingsByPlayerIds, getEloSnapshot, type RatingRow } from "@/lib/ratings";

const TIER_BADGE_PX = 66;
const TIER_SYSTEM_MARK_PX = 12;

const TIER_SYSTEM_ROWS: { code: TierCode; line: string }[] = [
  { code: "wimbledon", line: "Wimbledon (Elite)" },
  { code: "us_open", line: "US Open (Pro)" },
  { code: "roland_garros", line: "Roland Garros (Rising)" },
  { code: "australian_open_provisional", line: "Australian Open (임시)" },
];

export default function MyPage() {
  useResetViewportZoomOnMount();
  const router = useRouter();
  const { session, ready } = usePlayerSession();
  const { roster: tierRoster, ready: tierRosterReady } = useTierRoster();
  const [rating, setRating] = useState<RatingRow | null>(null);
  const [ratingErr, setRatingErr] = useState<string | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);

  const [digest, setDigest] = useState<Recent10Digest | null>(null);
  const [digestErr, setDigestErr] = useState<string | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);

  const [careerStats, setCareerStats] = useState<CareerFromMatches | null>(null);
  const [careerDone, setCareerDone] = useState(false);

  const [myMatches, setMyMatches] = useState<MatchRecordWithJoins[]>([]);
  const [myMatchesLoading, setMyMatchesLoading] = useState(false);
  const [myMatchesErr, setMyMatchesErr] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !session) router.replace("/");
  }, [ready, session, router]);

  useEffect(() => {
    if (!session?.id) return;
    let cancelled = false;
    (async () => {
      setRatingLoading(true);
      setRatingErr(null);
      try {
        const map = await fetchRatingsByPlayerIds([session.id]);
        if (cancelled) return;
        const row = map.get(session.id);
        setRating(row ?? null);
      } catch (e) {
        if (!cancelled) {
          setRatingErr(e instanceof Error ? e.message : "등급 정보를 불러오지 못했습니다.");
          setRating(null);
        }
      } finally {
        if (!cancelled) setRatingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  useEffect(() => {
    if (!session?.id) return;
    let cancelled = false;
    setCareerDone(false);
    (async () => {
      try {
        const c = await computeApprovedMatchCareerStats(session.id);
        if (!cancelled) setCareerStats(c);
      } catch {
        if (!cancelled) setCareerStats(null);
      } finally {
        if (!cancelled) setCareerDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  useEffect(() => {
    if (!session?.id) return;
    let cancelled = false;
    (async () => {
      setDigestLoading(true);
      setDigestErr(null);
      try {
        const d = await computeRecentGamesDigest(session.id, 10);
        if (!cancelled) setDigest(d);
      } catch (e) {
        if (!cancelled) {
          setDigestErr(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다.");
          setDigest(null);
        }
      } finally {
        if (!cancelled) setDigestLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  useEffect(() => {
    if (!session?.id) return;
    let cancelled = false;
    (async () => {
      setMyMatchesLoading(true);
      setMyMatchesErr(null);
      try {
        const rows = await fetchMyApprovedMatchLines(session.id, 80);
        if (!cancelled) setMyMatches(rows);
      } catch (e) {
        if (!cancelled) {
          setMyMatchesErr(e instanceof Error ? e.message : "전적을 불러오지 못했습니다.");
          setMyMatches([]);
        }
      } finally {
        if (!cancelled) setMyMatchesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  if (!ready) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
          불러오는 중...
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
          이동 중...
        </div>
      </div>
    );
  }

  const snap = rating
    ? {
        elo: rating.elo,
        wins: rating.wins,
        losses: rating.losses,
        matches_played: rating.matches_played,
      }
    : getEloSnapshot(new Map(), session.id);

  const recordFromMatches =
    careerDone && careerStats !== null
      ? careerStats
      : {
          wins: snap.wins,
          losses: snap.losses,
          games: snap.matches_played,
          winRatePct:
            snap.matches_played > 0
              ? Math.round((snap.wins / snap.matches_played) * 1000) / 10
              : 0,
        };

  const registeredGamesForTier =
    careerDone && careerStats !== null ? careerStats.games : snap.matches_played;

  const matchesPlayedOverride =
    careerDone && careerStats !== null ? careerStats.games : undefined;

  const tier =
    tierRosterReady && tierRoster.length > 0
      ? resolveDisplayTier(tierRoster, session.id, matchesPlayedOverride)
      : !ratingLoading && registeredGamesForTier < PROVISIONAL_TIER_MAX_MATCHES_EXCLUDED
        ? PROVISIONAL_TIER_INFO
        : null;

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
      <section>
        <h2 className="text-xl font-semibold tracking-tight text-slate-800">My page</h2>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* 1. ELO */}
        <div className="border-b border-slate-100 pb-4">
          <p className="text-sm font-semibold text-slate-800">Elo</p>
          {ratingLoading ? (
            <p className="mt-2 text-sm text-slate-500">불러오는 중...</p>
          ) : ratingErr ? (
            <p className="mt-2 text-sm text-rose-600">
              {ratingErr}
              <span className="mt-1 block text-[11px] text-slate-500">
                ratings 테이블이 없다면 Supabase에서 supabase/ratings.sql 을 실행해 주세요.
              </span>
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex shrink-0 items-stretch gap-2 sm:gap-3">
                  {tier ? (
                    <div
                      className="relative shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm"
                      style={{ width: TIER_BADGE_PX, height: TIER_BADGE_PX }}
                    >
                      <Image
                        src={tierBadgeImageSrc(tier.code)}
                        alt={`${tier.labelKo} 티어 뱃지`}
                        width={TIER_BADGE_PX}
                        height={TIER_BADGE_PX}
                        className="h-full w-full object-contain p-1"
                        sizes={`${TIER_BADGE_PX}px`}
                      />
                    </div>
                  ) : (
                    <div className="shrink-0" style={{ width: TIER_BADGE_PX, height: TIER_BADGE_PX }} aria-hidden />
                  )}
                  <div
                    className="flex min-w-0 flex-1 flex-col"
                    style={{ height: TIER_BADGE_PX }}
                  >
                    <div className="flex min-h-0 flex-[1_1_0] items-center overflow-hidden">
                      <span className="text-xl font-bold tabular-nums leading-none text-slate-900">{snap.elo}</span>
                    </div>
                    <div className="flex min-h-0 flex-[1_1_0] items-center overflow-hidden">
                      {tier ? (
                        <span className="line-clamp-2 w-full text-left text-[11px] font-semibold leading-tight tracking-tight text-slate-800">
                          {tier.labelKo}
                        </span>
                      ) : (
                        <span className="text-[11px] leading-none text-slate-400">티어 계산 중…</span>
                      )}
                    </div>
                    <div className="flex min-h-0 flex-[1_1_0] items-center overflow-hidden">
                      <span className="w-full truncate text-left text-[11px] font-medium leading-none text-slate-600">
                        {session.display_name}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1 border-t border-slate-100 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                  <p className="text-[10px] font-semibold tracking-wide text-slate-700">Tier System</p>
                  <ul className="mt-2 space-y-1">
                    {TIER_SYSTEM_ROWS.map(({ code, line }) => (
                      <li key={code} className="flex items-center gap-1.5 text-[10px] leading-tight text-slate-600">
                        <span
                          className="relative shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white"
                          style={{
                            width: TIER_SYSTEM_MARK_PX,
                            height: TIER_SYSTEM_MARK_PX,
                          }}
                        >
                          <Image
                            src={tierBadgeImageSrc(code)}
                            alt=""
                            width={TIER_SYSTEM_MARK_PX}
                            height={TIER_SYSTEM_MARK_PX}
                            className="h-full w-full object-contain p-px"
                            sizes={`${TIER_SYSTEM_MARK_PX}px`}
                          />
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[8px] leading-snug text-slate-400">
                    *등록게임수 5게임 미만 임시 티어 적용
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                통산 {recordFromMatches.wins}승 {recordFromMatches.losses}패 ·{" "}
                {recordFromMatches.games}경기
                {recordFromMatches.games > 0 ? (
                  <> · 통산 승률 {recordFromMatches.winRatePct}%</>
                ) : null}
                {!careerDone ? (
                  <span className="ml-1 text-slate-400">(집계 중…)</span>
                ) : null}
              </p>
            </div>
          )}
        </div>

        {/* 2. 최근 승률 10게임 */}
        <div className="border-b border-slate-100 py-4">
          <p className="text-sm font-semibold text-slate-800">최근 승률 (10게임)</p>
          {digestLoading ? (
            <p className="mt-2 text-sm text-slate-500">불러오는 중...</p>
          ) : digestErr ? (
            <p className="mt-2 text-sm text-rose-600">{digestErr}</p>
          ) : digest && digest.games === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              최근 기록된 경기가 없습니다, 경기결과를 등록해주세요
            </p>
          ) : digest ? (
            <div className="mt-3 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="relative h-[66px] w-[66px] shrink-0">
                  <WinLossDonut wins={digest.wins} losses={digest.losses} size={66} stroke={7} />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-bold tabular-nums leading-none text-slate-800">
                      {digest.winRatePct}%
                    </span>
                    <span className="mt-0.5 text-[8px] font-medium text-slate-500">승률</span>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-teal-700">{digest.wins}</span>승{" "}
                    <span className="font-semibold text-slate-600">{digest.losses}</span>패
                  </p>
                  <p className="text-[11px] text-slate-500">최근 {digest.games}게임 기준</p>
                </div>
              </div>
              <div className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-slate-600">영혼의 파트너 Top3</p>
                {digest.partners.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">복식 파트너 기록이 없습니다.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {digest.partners.map((p, i) => (
                      <li
                        key={p.player_id}
                        className="flex flex-wrap items-baseline justify-between gap-1 text-sm"
                      >
                        <span className="min-w-0 font-medium text-slate-800">
                          {i + 1}.{p.name}
                        </span>
                        <span className="shrink-0 tabular-nums text-slate-600">
                          ({p.wins}승 {p.losses}패/{p.winRatePct}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* 3. 나의 전적 */}
        <div className="pt-4">
          <p className="text-sm font-semibold text-slate-800">나의 전적</p>
          {myMatchesLoading ? (
            <p className="mt-2 text-sm text-slate-500">불러오는 중...</p>
          ) : myMatchesErr ? (
            <p className="mt-2 text-sm text-rose-600">{myMatchesErr}</p>
          ) : myMatches.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">등록된 경기 기록이 없습니다.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {myMatches.map((m) => (
                <ApprovedMatchResultRow key={m.id} m={m} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
