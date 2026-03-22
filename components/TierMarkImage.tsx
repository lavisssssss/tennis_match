"use client";

import Image from "next/image";
import { useTierRoster } from "@/components/TierRosterProvider";
import { resolveDisplayTier } from "@/lib/eloTier";
import { tierBadgeImageSrc } from "@/lib/tierBranding";

export function TierMarkImage({
  playerId,
  size = 14,
  className = "",
}: {
  playerId: string;
  size?: number;
  className?: string;
}) {
  const { roster, ready } = useTierRoster();

  if (!ready || roster.length === 0) {
    return (
      <span
        className={`inline-block shrink-0 rounded-full bg-slate-200 ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  const tier = resolveDisplayTier(roster, playerId);
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={tierBadgeImageSrc(tier.code)}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain p-px"
        sizes={`${size}px`}
      />
    </span>
  );
}
