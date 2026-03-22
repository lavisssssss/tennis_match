/**
 * 티어는 **전체 등록 선수** Elo 기준 상대 순위로 부여합니다.
 * - 상위 30% (Elo 내림차순 앞쪽) → Wimbledon (Elite)
 * - 하위 30% → Roland Garros (Rising)
 * - 그 사이 → US Open (Pro)
 * 인원이 적을 때는 상·하위 구간이 겹치지 않도록 자동으로 줄입니다. (1명만 있으면 전원 US Open)
 */

export type TierRosterEntry = {
  player_id: string;
  elo: number;
  /** `ratings.matches_played`, 행 없으면 0 */
  matches_played: number;
};

export type TierCode =
  | "roland_garros"
  | "us_open"
  | "wimbledon"
  | "australian_open_provisional";

export type EloTierInfo = {
  code: TierCode;
  labelKo: string;
  labelEn: string;
};

/** 목록·매치 조회 등: 임시 티어는 한글만, 그 외 `KO · EN`. */
export function formatTierListLabel(t: EloTierInfo): string {
  if (t.code === "australian_open_provisional") return t.labelKo;
  return `${t.labelKo} · ${t.labelEn}`;
}

/** 상·하위 각각 목표 비율 (합이 1 초과 시 eloTier에서 구간 축소) */
export const TIER_TOP_FRACTION = 0.3;
export const TIER_BOTTOM_FRACTION = 0.3;

/** `ratings.matches_played`(등록게임수)가 이 미만이면 상대 티어 대신 임시 티어를 씁니다. */
export const PROVISIONAL_TIER_MAX_MATCHES_EXCLUDED = 5;

export const PROVISIONAL_TIER_INFO: EloTierInfo = {
  code: "australian_open_provisional",
  labelKo: "4. Australian Open (임시)",
  labelEn: "Provisional",
};

/**
 * UI·뱃지용: 등록게임수 5미만이면 임시 티어, 아니면 전체 Elo 상대 순위 티어.
 * @param matchesPlayedOverride My page 등에서 승인 경기 집계값. DB `matches_played`와 어긋날 수 있어,
 *   임시 티어 판정에는 **roster의 matches_played와 둘 중 큰 값**을 씁니다(랭킹과 동일한 상대 티어 노출).
 */
export function resolveDisplayTier(
  roster: TierRosterEntry[],
  playerId: string,
  matchesPlayedOverride?: number,
): EloTierInfo {
  const entry = roster.find((p) => p.player_id === playerId);
  const fromRoster = entry?.matches_played ?? 0;
  const played =
    matchesPlayedOverride !== undefined
      ? Math.max(fromRoster, matchesPlayedOverride)
      : fromRoster;
  if (played < PROVISIONAL_TIER_MAX_MATCHES_EXCLUDED) {
    return PROVISIONAL_TIER_INFO;
  }
  return getEloTierRelative(roster, playerId);
}

/** 상대 순위만 (임시 티어 없음). `resolveDisplayTier` 내부용·테스트용. */
export function getEloTierRelative(roster: TierRosterEntry[], playerId: string): EloTierInfo {
  const n = roster.length;
  if (n <= 1) {
    return { code: "us_open", labelKo: "US Open", labelEn: "Pro" };
  }

  const sorted = [...roster].sort((a, b) => {
    if (b.elo !== a.elo) return b.elo - a.elo;
    return a.player_id.localeCompare(b.player_id);
  });

  const idx = sorted.findIndex((p) => p.player_id === playerId);
  if (idx < 0) {
    return { code: "us_open", labelKo: "US Open", labelEn: "Pro" };
  }

  let topN = Math.ceil(TIER_TOP_FRACTION * n);
  let botN = Math.ceil(TIER_BOTTOM_FRACTION * n);
  while (topN + botN > n) {
    if (topN >= botN && topN > 0) topN--;
    else if (botN > 0) botN--;
    else break;
  }

  if (topN > 0 && idx < topN) {
    return { code: "wimbledon", labelKo: "Wimbledon", labelEn: "Elite" };
  }
  if (botN > 0 && idx >= n - botN) {
    return { code: "roland_garros", labelKo: "Roland Garros", labelEn: "Rising" };
  }
  return { code: "us_open", labelKo: "US Open", labelEn: "Pro" };
}

export function tierBadgeClass(code: TierCode): string {
  if (code === "wimbledon") return "border-amber-200 bg-amber-50 text-amber-900";
  if (code === "us_open") return "border-sky-200 bg-sky-50 text-sky-900";
  if (code === "australian_open_provisional")
    return "border-sky-300 bg-sky-50 text-sky-950";
  return "border-orange-200 bg-orange-50 text-orange-900";
}
