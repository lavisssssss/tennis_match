"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageMascot } from "@/components/PageMascot";
import { submitMatchResult } from "@/lib/matches";
import { usePlayerSession } from "@/hooks/usePlayerSession";
import { listAttendingPlayerIdsForSession } from "@/lib/attendance";
import { listPlayers, type Player } from "@/lib/players";
import { listSessions, listUpcomingOpenSessions, type Session } from "@/lib/matchs";

function formatTime(t: string) {
  return t.slice(0, 5);
}

function sortSessionsDesc(a: Session, b: Session) {
  if (a.date !== b.date) return b.date.localeCompare(a.date);
  if (a.start_time !== b.start_time) return b.start_time.localeCompare(a.start_time);
  return b.created_at.localeCompare(a.created_at);
}

function playerOptions(pool: Player[], selectedIds: Set<string>, keepId: string) {
  return pool.filter((p) => p.id === keepId || !selectedIds.has(p.id));
}

export default function MatchEntryPage() {
  const { session, ready: sessionReady } = usePlayerSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState("");

  const [attendingIds, setAttendingIds] = useState<string[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [b1, setB1] = useState("");
  const [b2, setB2] = useState("");

  const [teamAGames, setTeamAGames] = useState<number | null>(null);
  const [teamBGames, setTeamBGames] = useState<number | null>(null);

  const createdByName = useMemo(() => {
    if (!session) return "";
    const p = players.find((x) => x.id === session.id);
    return p?.display_name ?? session.display_name;
  }, [players, session]);

  const defaultA1ForSessionRef = useRef<string | null>(null);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessions, sessionId],
  );

  const duplicateError = useMemo(() => {
    const ids = [a1, a2, b1, b2].filter(Boolean);
    if (ids.length < 4) return null;
    return new Set(ids).size === 4 ? null : "선수 4명은 모두 달라야 합니다.";
  }, [a1, a2, b1, b2]);

  const selectedIds = useMemo(() => new Set([a1, a2, b1, b2].filter(Boolean)), [a1, a2, b1, b2]);

  const eligiblePlayers = useMemo(() => {
    const allow = new Set(attendingIds);
    return players
      .filter((p) => allow.has(p.id))
      .sort((a, b) => a.display_name.localeCompare(b.display_name, "ko"));
  }, [players, attendingIds]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [s, p, upcoming] = await Promise.all([
        listSessions({ statuses: ["open"] }),
        listPlayers(),
        listUpcomingOpenSessions({ limit: 10 }),
      ]);
      const sorted = [...s].sort(sortSessionsDesc);
      setSessions(sorted);
      setPlayers(p);
      const preferId = upcoming[0]?.id;
      const defaultSessionId =
        preferId && sorted.some((x) => x.id === preferId) ? preferId : sorted[0]?.id ?? "";
      setSessionId((cur) => {
        if (cur && sorted.some((x) => x.id === cur)) return cur;
        return defaultSessionId;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setAttendingIds([]);
      setAttendanceError(null);
      setAttendanceLoading(false);
      setA1("");
      setA2("");
      setB1("");
      setB2("");
      return;
    }
    setA1("");
    setA2("");
    setB1("");
    setB2("");
    defaultA1ForSessionRef.current = null;

    let cancelled = false;
    setAttendanceLoading(true);
    setAttendanceError(null);
    listAttendingPlayerIdsForSession(sessionId)
      .then((ids) => {
        if (!cancelled) setAttendingIds(ids);
      })
      .catch((e) => {
        if (!cancelled) {
          setAttendingIds([]);
          setAttendanceError(
            e instanceof Error ? e.message : "참석자 목록을 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setAttendanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionReady || !session?.id) return;
    setB1((cur) => (cur === session.id ? "" : cur));
    setB2((cur) => (cur === session.id ? "" : cur));
  }, [sessionReady, session?.id]);

  useEffect(() => {
    if (!sessionId || attendanceLoading || attendanceError) return;
    if (!session?.id || !attendingIds.includes(session.id)) return;
    if (defaultA1ForSessionRef.current === sessionId) return;
    defaultA1ForSessionRef.current = sessionId;
    setA1(session.id);
  }, [
    sessionId,
    attendanceLoading,
    attendanceError,
    attendingIds,
    session?.id,
    sessionReady,
  ]);

  async function onSubmit() {
    setOk(null);
    setError(null);
    if (duplicateError) {
      setError(duplicateError);
      return;
    }
    if (teamAGames === null || teamBGames === null) {
      setError("Team A/Team B 승리 게임 수를 선택해 주세요.");
      return;
    }

    setSaving(true);
    try {
      const score = `${teamAGames}-${teamBGames}`;
      const { record: row, autoApproved, eloMessage } = await submitMatchResult({
        session_id: sessionId,
        teamA_player1: a1,
        teamA_player2: a2,
        teamB_player1: b1,
        teamB_player2: b2,
        set1_score: score,
        set2_score: score,
        set3_score: null,
        created_by: createdByName,
      });

      if (autoApproved) {
        setOk(
          `등록 완료 · 자동 승인 · ${eloMessage ?? "Elo 처리"} (${row.id.slice(0, 8)})`,
        );
      } else {
        setOk(`등록 완료: 승인 대기 (${row.id.slice(0, 8)})`);
      }
      setTeamAGames(null);
      setTeamBGames(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    sessionReady &&
    !!session &&
    !loading &&
    !saving &&
    sessionId &&
    a1 &&
    a2 &&
    b1 &&
    b2 &&
    teamAGames !== null &&
    teamBGames !== null &&
    !duplicateError;

  if (!sessionReady) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
        <section className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-slate-800">결과 등록</h2>
        </section>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
          확인 중...
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
        <section className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-slate-800">결과 등록</h2>
          <p className="text-xs text-slate-600">
            경기 결과를 입력합니다.(현재 복식만 지원)
          </p>
        </section>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
          <p className="font-medium">로그인이 필요합니다.</p>
          <p className="mt-2 text-xs text-amber-800/90">
            입력자는 로그인한 계정으로만 기록됩니다. 홈에서 로그인한 뒤 다시 오세요.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            홈(로그인)으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
      <section className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800">결과 등록</h2>
        <p className="text-xs text-slate-600">
          경기 결과를 입력합니다.(현재 복식만 지원)
        </p>
      </section>

      <section className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <PageMascot variant="entry" />
        {loading ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">불러오는 중...</div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {ok ? (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {ok}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3">
          <div className="block space-y-1 pr-14">
            <span className="text-xs font-semibold text-slate-700">입력자</span>
            <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
              {session.display_name}
            </div>
            <p className="text-[11px] text-slate-500">로그인한 계정으로 고정됩니다.</p>
          </div>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-700">경기 일정(매치)</span>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-300"
            >
              <option value="">선택하세요</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.date} {formatTime(s.start_time)} · {s.location}
                </option>
              ))}
            </select>
            {selectedSession ? (
              <p className="text-[11px] text-slate-500">
                선택됨: {selectedSession.date} {formatTime(selectedSession.start_time)}–{formatTime(selectedSession.end_time)}
                {selectedSession.description ? ` · ${selectedSession.description}` : ""}
              </p>
            ) : null}
            {sessionId && attendanceError ? (
              <p className="text-[11px] text-rose-600">참석자 조회: {attendanceError}</p>
            ) : null}
            {sessionId && attendanceLoading ? (
              <p className="text-[11px] text-slate-500">이 매치 참석(확정) 인원 목록을 불러오는 중...</p>
            ) : null}
            {sessionId && !attendanceLoading && !attendanceError && attendingIds.length === 0 ? (
              <p className="text-[11px] text-amber-700">
                이 일정에 참석으로 신청한 인원이 없습니다. 참여 신청에서 참석을 먼저 등록해 주세요.
              </p>
            ) : null}
            {sessionId && !attendanceLoading && !attendanceError && attendingIds.length > 0 ? (
              <p className="text-[11px] text-slate-500">
                아래 목록은 이 매치에 <span className="font-medium text-slate-700">참석</span>으로 등록된 인원만
                표시합니다. (대기/취소 제외)
              </p>
            ) : null}
          </label>

          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">선수 선택 (복식 2:2)</p>

            {duplicateError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {duplicateError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-2">
              <p className="text-[11px] font-semibold text-slate-600">Team A</p>
              <select
                value={a1}
                onChange={(e) => setA1(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-300"
              >
                <option value="">A1 선택</option>
                {playerOptions(eligiblePlayers, selectedIds, a1).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
              <select
                value={a2}
                onChange={(e) => setA2(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-300"
              >
                <option value="">A2 선택</option>
                {playerOptions(eligiblePlayers, selectedIds, a2).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>

              <div className="mt-1 space-y-1">
                <p className="text-[11px] font-semibold text-slate-600">승리 게임 수</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const active = teamAGames === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTeamAGames(i)}
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                          active
                            ? "border-teal-200 bg-teal-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <p className="text-[11px] font-semibold text-slate-600">Team B</p>
              <select
                value={b1}
                onChange={(e) => setB1(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-300"
              >
                <option value="">B1 선택</option>
                {playerOptions(eligiblePlayers, selectedIds, b1).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
              <select
                value={b2}
                onChange={(e) => setB2(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-300"
              >
                <option value="">B2 선택</option>
                {playerOptions(eligiblePlayers, selectedIds, b2).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>

              <div className="mt-1 space-y-1">
                <p className="text-[11px] font-semibold text-slate-600">승리 게임 수</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const active = teamBGames === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTeamBGames(i)}
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                          active
                            ? "border-teal-200 bg-teal-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onSubmit()}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
              canSubmit ? "bg-teal-600 hover:bg-teal-700" : "bg-slate-300"
            }`}
          >
            {saving ? "저장 중..." : "결과 제출(승인 대기)"}
          </button>

          <p className="text-[11px] text-slate-500">
            제출 후 Admin의 “경기 기록 승인”에서 승인/반려됩니다.
          </p>
          <p className="text-[11px] text-slate-500">
            스코어는 현재 “게임 수(0~6)”를 간단 입력으로 저장합니다. (예: Team A 4, Team B 2 → DB에는 4-2로 저장)
          </p>
        </div>
      </section>
    </div>
  );
}

