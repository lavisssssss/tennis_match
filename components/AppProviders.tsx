"use client";

import type { ReactNode } from "react";
import { PlayerSessionProvider } from "@/components/PlayerSessionProvider";
import { TierRosterProvider } from "@/components/TierRosterProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <PlayerSessionProvider>
      <TierRosterProvider>{children}</TierRosterProvider>
    </PlayerSessionProvider>
  );
}
