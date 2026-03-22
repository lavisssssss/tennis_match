"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TierBadge } from "@/components/TierBadge";
import { PageMascot } from "@/components/PageMascot";
import { LoginRequiredCard } from "@/components/LoginRequiredCard";
import { listAttendanceForSession, type AttendanceRowWithPlayer } from "@/lib/attendance";
import { usePlayerSession } from "@/hooks/usePlayerSession";
import { DEFAULT_ELO, listAllPlayersWithElo } from "@/lib/ratings";
import { listUpcomingOpenSessions, type Session } from "@/lib/matchs";
import {
  suggestCourtsFromAttendees,
  type AttendeeForMatching,
  type SuggestedCourt,
} from "@/lib/teamMatching";

function formatTime(t: string) {
  return t.slice(0, 5);
}

/** Fisher–Yates, 새 배열 반환 */
function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 본인 필수. 이미 고른 참석자는 유지하고, 부족분은 참석 전원 풀에서 무작위로 채움.
 */
function resolveFourPlayerIds(
  selfId: string,
  attendIds: string[],
  selectedIds: Set<string>,
): string[] | null {
  const pool = new Set(attendIds);
  if (!pool.has(selfId)) return null;

  const chosen: string[] = [selfId];
  const chosenSet = new Set<string>(chosen);

  const othersOrdered = attendIds.filter((id) => id !== selfId);
  for (const id of othersOrdered) {
    if (!selectedIds.has(id) || chosenSet.has(id)) continue;
    if (chosen.length >= 4) break;
    chosen.push(id);
    chosenSet.add(id);
  }

  const need = 4 - chosen.length;
  if (need === 0) return chosen;

  const rest = shuffle(attendIds.filter((id) => !chosenSet.has(id)));
  if (rest.length < need) return null;
  chosen.push(...rest.slice(0, need));
  return chosen;
}

function PlayerEloLine({ p }: { p: AttendeeForMatching }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      <span className="font-medium">{p.display_name}</span>
      <span className="text-[11px] tabular-nums text-slate-500">Elo {p.elo}</span>
      <TierBadge playerId={p.player_id} />
    </div>
  );
}

export default function MatchSuggestPage() {
  const { session, ready: sessionReady } = usePlayerSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsErr, setSessionsErr] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState("");

  const [attendance, setAttendance] = useState<AttendanceRowWithPlayer[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attErr, setAttErr] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestErr, setSuggestErr] = useState<string | null>(null);
  const [court, setCourt] = useState<SuggestedCourt | null>(null);

  const selfId = session?.id ?? "";

  const attendRows = useMemo(
    () => attendance.filter((r) => r.status === "attend"),
    [attendance],
  );

  const selfInAttend = useMemo(
    () => attendRows.some((r) => r.player_id === selfId),
    [attendRows, selfId],
  );

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessions, sessionId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSessionsLoading(true);
      setSessionsErr(null);
      try {
        const list = await listUpcomingOpenSessions({ limit: 20 });
        if (cancelled) return;
        setSessions(list);
        setSessionId((cur) => {
          if (cur && list.some((s) => s.id === cur)) return cur;
          return list[0]?.id ?? "";
        });
      } catch (e) {
        if (!cancelled) {
          setSessionsErr(e instanceof Error ? e.message : "매치 목록을 불러오지 못했습니다.");
          setSessions([]);
          setSessionId("");
        }
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadAttendance = useCallback(async (sid: string) => {
    if (!sid) {
      setAttendance([]);
      return;
    }
    setAttLoading(true);
    setAttErr(null);
    try {
      const rows = await listAttendanceForSession(sid);
      setAttendance(rows);
    } catch (e) {
      setAttendance([]);
      setAttErr(e instanceof Error ? e.message : "출석 목록을 불러오지 못했습니다.");
    } finally {
      setAttLoading(false);
    }
  }, []);

  useEffect(() => {
    setCourt(null);
    setSuggestErr(null);
    void loadAttendance(sessionId);
  }, [sessionId, loadAttendance]);

  useEffect(() => {
    const attend = attendance.filter((r) => r.status === "attend");
    const attendIds = new Set(attend.map((r) => r.player_id));
    if (selfId && attendIds.has(selfId)) {
      setSelectedIds(new Set([selfId]));
    } else {
      setSelectedIds(new Set());
    }
    setCourt(null);
    setSuggestErr(null);
  }, [sessionId, selfId, attendance]);

  function togglePlayer(pid: string) {
    if (pid === selfId) return;
    setCourt(null);
    setSuggestErr(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) {
        next.delete(pid);
        return next;
      }
      if (next.size >= 4) return next;
      next.add(pid);
      return next;
    });
  }

  async function runSuggest() {
    if (!selfId || !selfInAttend || attendRows.length < 4) {
      setSuggestErr("참석 인원이 4명 이상이어야 합니다.");
      return;
    }
    const attendIds = attendRows.map((r) => r.player_id);
    const four = resolveFourPlayerIds(selfId, attendIds, selectedIds);
    if (!four || four.length !== 4) {
      setSuggestErr("참석 4명을 구성할 수 없습니다.");
      return;
    }
    setSelectedIds(new Set(four));

    setSuggestBusy(true);
    setSuggestErr(null);
    setCourt(null);
    try {
      const distribution = await listAllPlayersWithElo();
      const eloMap = new Map(distribution.map((x) => [x.player_id, x.elo]));
      const attendees: AttendeeForMatching[] = four.map((pid) => {
        const row = attendRows.find((r) => r.player_id === pid);
        return {
          player_id: pid,
          display_name: row?.player?.display_name ?? pid,
          elo: eloMap.get(pid) ?? DEFAULT_ELO,
        };
      });
      const { courts } = suggestCourtsFromAttendees(attendees);
      const first = courts[0] ?? null;
      setCourt(first);
      if (!first) setSuggestErr("팀 조합을 만들 수 없습니다.");
    } catch (e) {
      setSuggestErr(
        e instanceof Error ? e.message : "Elo 조회에 실패했습니다. ratings 테이블을 확인해 주세요.",
      );
    } finally {
      setSuggestBusy(false);
    }
  }

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
          <h2 className="text-xl font-semibold tracking-tight text-slate-800">매칭추천</h2>
          <p className="text-xs text-slate-600">로그인 후 이용할 수 있습니다.</p>
        </section>
        <LoginRequiredCard />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
      <section className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-slate-800">매칭추천</h2>
          <p className="text-xs text-slate-600">
            Rating 기반 파트너와 매칭상대를 제안합니다.
          </p>
        </div>
        <Link
          href="/ranking"
          className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
        >
          랭킹으로
        </Link>
      </section>

      <section className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <PageMascot variant="records" />
        <div className="space-y-4 pr-10">
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-slate-700">다가오는 매치</span>
            {sessionsLoading ? (
              <p className="text-sm text-slate-500">불러오는 중...</p>
            ) : sessionsErr ? (
              <p className="text-sm text-rose-600">{sessionsErr}</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-slate-600">예정된 open 매치가 없습니다.</p>
            ) : (
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-300"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.date} {formatTime(s.start_time)} · {s.location}
                  </option>
                ))}
              </select>
            )}
          </label>

          {selectedSession ? (
            <p className="text-[11px] text-slate-500">
              선택: {selectedSession.date} {formatTime(selectedSession.start_time)}–
              {formatTime(selectedSession.end_time)}
              {selectedSession.description ? ` · ${selectedSession.description}` : ""}
            </p>
          ) : null}

          {attLoading ? (
            <p className="text-sm text-slate-500">참석 명단 불러오는 중...</p>
          ) : attErr ? (
            <p className="text-sm text-rose-600">{attErr}</p>
          ) : !sessionId ? null : attendRows.length < 4 ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              이 매치에 참석(attend)으로 등록된 인원이 4명 미만입니다. 참여신청에서 참석을 먼저
              맞춰 주세요.
            </p>
          ) : !selfInAttend ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              이 매치에 <span className="font-semibold">참석</span>으로 등록되어 있어야 매칭추천을 쓸 수
              있습니다. 참여신청 메뉴에서 참석으로 저장해 주세요.
            </p>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-[11px] text-slate-600">
                  본인을 제외한 플레이어를 선택해주세요.
                </p>
                <p className="text-[11px] text-slate-600">
                  선택하지 않을 경우 전체 인원을 대상으로 경기상대를 제안합니다.
                </p>
                <ul className="mt-2 space-y-2">
                  {attendRows.map((row) => {
                    const pid = row.player_id;
                    const isSelf = pid === selfId;
                    const checked = selectedIds.has(pid);
                    return (
                      <li key={row.id}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                            checked
                              ? "border-teal-300 bg-teal-50/50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          } ${isSelf ? "ring-1 ring-teal-200" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isSelf}
                            onChange={() => togglePlayer(pid)}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:opacity-100"
                          />
                          <span className="min-w-0 flex-1 font-medium text-slate-800">
                            {row.player?.display_name ?? pid}
                            {isSelf ? (
                              <span className="ml-2 text-[10px] font-semibold text-teal-700">(나)</span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <button
                type="button"
                disabled={suggestBusy}
                onClick={() => void runSuggest()}
                className="w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {suggestBusy ? "계산 중…" : "팀 제안 보기"}
              </button>

              {suggestErr ? (
                <p className="text-[11px] font-medium text-rose-700">{suggestErr}</p>
              ) : null}

              {court ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                  <p className="text-[11px] font-semibold text-slate-500">
                    추천 팀 · 평균 Elo 차 {court.avgEloDiff.toFixed(1)}
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-white p-2 shadow-sm">
                      <p className="text-[10px] font-bold text-teal-800">Team A</p>
                      <PlayerEloLine p={court.teamA[0]} />
                      <PlayerEloLine p={court.teamA[1]} />
                    </div>
                    <div className="rounded-lg bg-white p-2 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-700">Team B</p>
                      <PlayerEloLine p={court.teamB[0]} />
                      <PlayerEloLine p={court.teamB[1]} />
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
