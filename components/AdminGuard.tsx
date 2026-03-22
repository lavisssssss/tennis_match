"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePlayerSession } from "@/hooks/usePlayerSession";

export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, ready, isStaff } = usePlayerSession();

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/");
    else if (!isStaff) router.replace("/my-page");
  }, [ready, session, isStaff, router]);

  if (!ready) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
          불러오는 중...
        </div>
      </div>
    );
  }

  if (!session || !isStaff) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
          이동 중...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
