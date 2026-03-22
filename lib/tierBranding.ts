import type { TierCode } from "@/lib/eloTier";

export function tierBadgeImageSrc(code: TierCode): string {
  const map: Record<TierCode, string> = {
    wimbledon: "/tiers/wimbledon.png",
    us_open: "/tiers/us-open.png",
    roland_garros: "/tiers/roland-garros.png",
    australian_open_provisional: "/tiers/australian-open-provisional.png",
  };
  return map[code];
}

/** My page 등에 쓰는 한 줄 설명 (상대 순위 티어 기준) */
export function tierShortDescriptionKo(code: TierCode): string {
  switch (code) {
    case "wimbledon":
      return "전체 회원 Elo 순위 상위 30%입니다. 가장 높은 권위의 티어로, 최상위 실력을 의미합니다.";
    case "us_open":
      return "상위·하위 30% 사이의 중간 구간입니다. 동호회의 주력 실력층에 해당합니다.";
    case "roland_garros":
      return "전체 회원 중 하위 30%입니다. 기본기를 다지며 차근차근 올라가는 성장 단계입니다.";
    case "australian_open_provisional":
      return "등록게임수가 5게임 미만일 때 부여되는 임시 티어입니다. 경기를 더 치면 전체 순위 기준 티어로 바뀝니다.";
    default:
      return "";
  }
}
