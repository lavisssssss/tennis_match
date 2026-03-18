"use client";

import { useMemo, useState } from "react";
import { buildDisplayName, createPlayer, updatePlayer, type Player } from "@/lib/players";
import { usePlayers } from "@/hooks/usePlayers";

type EditState = {
  id: string;
  name: string;
  phone_last4: string;
  display_name: string;
  is_custom_display_name: boolean;
};

function formatCreatedAt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ko-KR", { hour12: false });
}

export default function AdminPlayersPage() {
  const { players, loading, error, refresh } = usePlayers();
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone_last4: "" });
  const [edit, setEdit] = useState<EditState | null>(null);

  const previewDisplayName = useMemo(
    () => buildDisplayName(form.name, form.phone_last4),
    [form.name, form.phone_last4],
  );

  async function onCreate() {
    setToast(null);
    setCreating(true);
    try {
      await createPlayer(form);
      setForm({ name: "", phone_last4: "" });
      setToast("선수를 추가했습니다.");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "선수 추가 중 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  }

  function beginEdit(p: Player) {
    setToast(null);
    const auto = buildDisplayName(p.name, p.phone_last4);
    const isCustom = p.display_name.trim() !== auto.trim();
    setEdit({
      id: p.id,
      name: p.name,
      phone_last4: p.phone_last4,
      display_name: p.display_name,
      is_custom_display_name: isCustom,
    });
  }

  async function onSaveEdit() {
    if (!edit) return;
    setToast(null);
    setSavingId(edit.id);
    try {
      await updatePlayer(edit.id, {
        name: edit.name,
        phone_last4: edit.phone_last4,
        ...(edit.is_custom_display_name ? { display_name: edit.display_name } : {}),
      });
      setEdit(null);
      setToast("수정 내용을 저장했습니다.");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "선수 수정 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
      <section className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800">
          선수 관리 (Admin · Phase 2)
        </h2>
        <p className="text-xs text-slate-600">
          선수 목록을 조회하고, 새 선수를 추가하거나 기존 정보를 수정합니다.
        </p>
      </section>

      {toast ? (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          {toast}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-slate-800">새 선수 추가</p>
            <p className="text-[11px] text-slate-500">
              `display_name`은 <span className="font-medium">이름 + 연락처 뒤 4자리</span>로 자동 생성됩니다.
            </p>
          </div>
          <span className="rounded-full bg-teal-500 px-3 py-1 text-[11px] font-medium text-white">
            Create
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-slate-600">이름</span>
            <input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-teal-500 focus:ring-2"
              placeholder="예: 오형선"
              autoComplete="off"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-slate-600">연락처 뒤 4자리</span>
            <input
              inputMode="numeric"
              value={form.phone_last4}
              onChange={(e) => setForm((s) => ({ ...s, phone_last4: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-teal-500 focus:ring-2"
              placeholder="예: 4025"
              autoComplete="off"
              maxLength={8}
            />
          </label>

          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">미리보기 display_name</span>
              <span className="font-medium text-slate-800">{previewDisplayName || "-"}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCreate}
            disabled={creating}
            className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "추가 중..." : "추가하기"}
          </button>
        </div>
      </section>

      <section className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-slate-800">선수 목록</p>
            <p className="text-[11px] text-slate-500">
              총 <span className="font-medium text-slate-700">{players.length}</span>명
            </p>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-white hover:bg-slate-900"
          >
            새로고침
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            불러오는 중...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : players.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            아직 등록된 선수가 없습니다.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full table-fixed">
              <thead className="bg-slate-50">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="w-2/5 px-3 py-2">display_name</th>
                  <th className="w-1/5 px-3 py-2">이름</th>
                  <th className="w-1/5 px-3 py-2">뒤4자리</th>
                  <th className="w-1/5 px-3 py-2">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {players.map((p) => {
                  const isEditing = edit?.id === p.id;
                  const autoDisplayName = isEditing
                    ? buildDisplayName(edit.name, edit.phone_last4)
                    : buildDisplayName(p.name, p.phone_last4);
                  const isCustom = isEditing
                    ? edit.is_custom_display_name
                    : p.display_name.trim() !== autoDisplayName.trim();
                  const displayName = isEditing
                    ? isCustom
                      ? edit.display_name
                      : autoDisplayName
                    : p.display_name;
                  const isSaving = savingId === p.id;

                  return (
                    <tr key={p.id} className="text-sm text-slate-800">
                      <td className="px-3 py-2 align-top">
                        <div className="min-w-0">
                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate font-semibold text-slate-800">
                                  {isCustom ? edit.display_name : autoDisplayName}
                                </p>
                                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={edit.is_custom_display_name}
                                    onChange={(e) => {
                                      const next = e.target.checked;
                                      setEdit((s) => {
                                        if (!s) return s;
                                        return {
                                          ...s,
                                          is_custom_display_name: next,
                                          display_name: next ? s.display_name || autoDisplayName : autoDisplayName,
                                        };
                                      });
                                    }}
                                    className="h-4 w-4 accent-teal-600"
                                  />
                                  display_name 직접 입력
                                </label>
                              </div>

                              {edit.is_custom_display_name ? (
                                <input
                                  value={edit.display_name}
                                  onChange={(e) =>
                                    setEdit((s) =>
                                      s ? { ...s, display_name: e.target.value } : s,
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none ring-teal-500 focus:ring-2"
                                  placeholder={autoDisplayName}
                                />
                              ) : (
                                <div className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                                  자동 생성: <span className="font-medium text-slate-700">{autoDisplayName}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="truncate font-semibold text-slate-800">{displayName}</p>
                              {isCustom ? (
                                <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                  custom
                                </span>
                              ) : null}
                            </div>
                          )}
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            생성: {formatCreatedAt(p.created_at)}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        {isEditing ? (
                          <input
                            value={edit.name}
                            onChange={(e) =>
                              setEdit((s) => {
                                if (!s) return s;
                                const nextName = e.target.value;
                                const nextAuto = buildDisplayName(nextName, s.phone_last4);
                                return {
                                  ...s,
                                  name: nextName,
                                  ...(s.is_custom_display_name ? {} : { display_name: nextAuto }),
                                };
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none ring-teal-500 focus:ring-2"
                          />
                        ) : (
                          <p className="truncate">{p.name}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {isEditing ? (
                          <input
                            inputMode="numeric"
                            value={edit.phone_last4}
                            onChange={(e) =>
                              setEdit((s) => {
                                if (!s) return s;
                                const nextPhone = e.target.value;
                                const nextAuto = buildDisplayName(s.name, nextPhone);
                                return {
                                  ...s,
                                  phone_last4: nextPhone,
                                  ...(s.is_custom_display_name ? {} : { display_name: nextAuto }),
                                };
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none ring-teal-500 focus:ring-2"
                            maxLength={8}
                          />
                        ) : (
                          <p className="truncate">{p.phone_last4}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={onSaveEdit}
                              disabled={isSaving}
                              className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isSaving ? "저장 중..." : "저장"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEdit(null)}
                              disabled={isSaving}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => beginEdit(p)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            수정
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

