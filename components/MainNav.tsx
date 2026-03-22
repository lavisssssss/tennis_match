"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlayerSession } from "@/hooks/usePlayerSession";

const NAV_PUBLIC = [
  { href: "/my-page", label: "My", exact: true, auth: false as const },
  { href: "/participate", label: "참여신청", exact: true, auth: false as const },
] as const;

const NAV_AUTH = [
  { href: "/matchs", label: "매치조회", exact: false, auth: true as const },
  { href: "/match-entry", label: "결과등록", exact: false, auth: true as const },
  { href: "/match-records", label: "결과조회", exact: false, auth: true as const },
  { href: "/ranking", label: "랭킹", exact: true, auth: true as const },
] as const;

export function MainNav() {
  const pathname = usePathname() ?? "";
  const { session, ready } = usePlayerSession();

  const items = [...NAV_PUBLIC, ...(ready && session ? NAV_AUTH : [])];

  return (
    <nav className="flex w-full min-w-0 flex-nowrap items-center justify-center gap-px overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] min-[400px]:gap-0.5 sm:gap-1 [&::-webkit-scrollbar]:hidden">
      {items.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "shrink-0 whitespace-nowrap rounded-full bg-teal-500 px-1 py-1 text-[9px] font-semibold leading-none text-white shadow-sm transition hover:bg-teal-600 min-[360px]:px-1.5 min-[360px]:text-[10px] sm:px-2.5 sm:py-1.5 sm:text-xs"
                : "shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white px-1 py-1 text-[9px] font-medium leading-none text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 min-[360px]:px-1.5 min-[360px]:text-[10px] sm:px-2.5 sm:py-1.5 sm:text-xs"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
