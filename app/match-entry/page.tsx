"use client";

import { useEffect, useMemo, useState } from "react";
import { PageMascot } from "@/components/PageMascot";
import { createPendingMatch } from "@/lib/matches";
import { listPlayers, type Player } from "@/lib/players";
import { listSessions, type Session } from "@/lib/matchs";

function formatTime(t: string) {
  return t.slice(0, 5);
}

function sortSessionsDesc(a: Session, b: Session) {
  if (a.date !== b.date) return b.date.localeCompare(a.date);
  if (a.start_time !== b.start_time) return b.start_time.localeCompare(a.start_time);
  return b.created_at.localeCompare(a.created_at);
}

function playerOptions(players: Player[], selectedIds: Set<string>, keepId: string) {
  return players.filter((p) => p.id === keepId || !selectedIds.has(p.id));
}

export default function MatchEntryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);

  const [createdByPlayerId, setCreatedByPlayerId] = useState("");
  const [sessionId, setSessionId] = useState("");

  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [b1, setB1] = useState("");
  const [b2, setB2] = useState("");

  const [teamAGames, setTeamAGames] = useState<number | null>(null);
  const [teamBGames, setTeamBGames] = useState<number | null>(null);

  const createdByName = useMemo(() => {
    const p = players.find((x) => x.id === createdByPlayerId);
    return p?.display_name ?? "";
  }, [players, createdByPlayerId]);

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

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [s, p] = await Promise.all([
        listSessions({ statuses: ["open"] }),
        listPlayers(),
      ]);
      setSessions([...s].sort(sortSessionsDesc));
      setPlayers(p);
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
    if (!createdByPlayerId) return;
    // 입력자 선택 시 Team A의 A1을 자동 세팅하고, 중복이 생기면 다른 칸에서 제거한다.
    setA1(createdByPlayerId);
    setA2((cur) => (cur === createdByPlayerId ? "" : cur));
    setB1((cur) => (cur === createdByPlayerId ? "" : cur));
    setB2((cur) => (cur === createdByPlayerId ? "" : cur));
  }, [createdByPlayerId]);

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
      const row = await createPendingMatch({
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

      setOk(`등록 완료: pending (${row.id.slice(0, 8)})`);
      setTeamAGames(null);
      setTeamBGames(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    !loading &&
    !saving &&
    createdByPlayerId &&
    sessionId &&
    a1 &&
    a2 &&
    b1 &&
    b2 &&
    teamAGames !== null &&
    teamBGames !== null &&
    !duplicateError;

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
          <label className="block space-y-1 pr-14">
            <span className="text-xs font-semibold text-slate-700">입력자</span>
            <select
              value={createdByPlayerId}
              onChange={(e) => setCreatedByPlayerId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-300"
            >
              <option value="">선택하세요</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </label>

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
                {playerOptions(players, selectedIds, a1).map((p) => (
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
                {playerOptions(players, selectedIds, a2).map((p) => (
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
                {playerOptions(players, selectedIds, b1).map((p) => (
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
                {playerOptions(players, selectedIds, b2).map((p) => (
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

