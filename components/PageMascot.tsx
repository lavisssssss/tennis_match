/** 본문 카드 우측 상단 장식 (2×2 스프라이트) */
export type PageMascotVariant = "participate" | "matchs" | "entry" | "records";

const BG_POS: Record<PageMascotVariant, string> = {
  participate: "0% 0%",
  matchs: "100% 0%",
  entry: "0% 100%",
  records: "100% 100%",
};

export function PageMascot({ variant }: { variant: PageMascotVariant }) {
  return (
    <div
      className="pointer-events-none absolute right-0 top-2 z-[1] bg-no-repeat [background-size:200%_200%] sm:right-1 sm:top-3"
      style={{
        width: 48,
        height: 48,
        backgroundImage: "url(/mascot-nav.png)",
        backgroundPosition: BG_POS[variant],
      }}
      aria-hidden
    />
  );
}
