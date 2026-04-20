"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LoginRequiredCard } from "@/components/LoginRequiredCard";
import { PageMascot } from "@/components/PageMascot";
import { TierMarkImage } from "@/components/TierMarkImage";
import { useTierRoster } from "@/components/TierRosterProvider";
import { usePlayerSession } from "@/hooks/usePlayerSession";
import { resolveDisplayTier, type EloTierInfo, type TierCode } from "@/lib/eloTier";
import { fetchAllPlayersRankingRows, type PlayerRankingRow } from "@/lib/ratings";

type TierFilterValue = "all" | TierCode;

const TIER_FILTER_OPTIONS: { value: TierFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "wimbledon", label: "Wimbledon (Elite)" },
  { value: "us_open", label: "US Open (Pro)" },
  { value: "roland_garros", label: "Roland Garros (Rising)" },
  { value: "australian_open_provisional", label: "Australian Open (임시)" },
];

type RankRow = PlayerRankingRow & { tier: EloTierInfo };

export default function RankingPage() {
  const { session, ready: sessionReady } = usePlayerSession();
  const { roster, ready: rosterReady } = useTierRoster();
  const [rows, setRows] = useState<PlayerRankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilterValue>("all");

  useEffect(() => {
    if (!sessionReady || !session) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllPlayersRankingRows();
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "랭킹을 불러오지 못했습니다.");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionReady, session]);

  const ranked = useMemo((): RankRow[] => {
    if (!rosterReady || roster.length === 0 || rows.length === 0) return [];
    const withTier: RankRow[] = rows.map((r) => ({
      ...r,
      tier: resolveDisplayTier(roster, r.player_id),
    }));
    const filtered = withTier.filter((r) => {
      if (tierFilter === "all") {
        // 전체 랭킹에서는 0승 0패(경기 미참여) 선수를 숨깁니다.
        return r.wins + r.losses > 0;
      }
      return r.tier.code === tierFilter;
    });
    return filtered.sort((a, b) => {
      if (b.elo !== a.elo) return b.elo - a.elo;
      return a.player_id.localeCompare(b.player_id);
    });
  }, [rows, roster, rosterReady, tierFilter]);

  if (!sessionReady) {
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
        <section className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-slate-800">랭킹</h2>
          <p className="text-xs text-slate-600">로그인 후 랭킹을 확인할 수 있습니다.</p>
        </section>
        <LoginRequiredCard />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
      <section className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800">랭킹</h2>
        <p className="text-xs text-slate-600">Elo 순위 · 티어 필터</p>
      </section>

      <section className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <PageMascot variant="records" />
        <div className="mb-3 flex flex-col gap-2 pr-12 sm:flex-row sm:items-end sm:gap-3">
          <label className="block min-w-0 flex-1 space-y-1">
            <span className="text-[11px] font-semibold text-slate-700">티어</span>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as TierFilterValue)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-300"
            >
              {TIER_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <Link
            href="/match-suggest"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 sm:py-2.5"
          >
            매칭추천
          </Link>
        </div>

        {loading ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">불러오는 중...</div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        ) : !rosterReady ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">티어 정보를 불러오는 중...</div>
        ) : ranked.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            표시할 선수가 없습니다.
          </div>
        ) : (
          <table className="w-full border-separate border-spacing-0 text-center text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="w-10 px-1 py-2">#</th>
                <th className="px-1 py-2">선수</th>
                <th className="w-16 px-1 py-2 tabular-nums">Elo</th>
                <th className="w-14 px-1 py-2 tabular-nums">승/패</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, idx) => (
                <tr key={r.player_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-1 py-2.5 text-center font-semibold tabular-nums text-slate-600">
                    {idx + 1}
                  </td>
                  <td className="px-1 py-2.5">
                    <div className="flex min-w-0 items-center justify-center gap-2">
                      <TierMarkImage playerId={r.player_id} size={28} />
                      <span className="min-w-0 truncate text-center font-medium text-slate-800">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-1 py-2.5 text-center font-semibold tabular-nums text-slate-900">
                    {r.elo}
                  </td>
                  <td className="px-1 py-2.5 text-center text-xs font-medium tabular-nums text-slate-700">
                    {r.wins}/{r.losses}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
