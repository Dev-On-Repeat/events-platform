"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Wordmark from "./Wordmark";

const NAV = [
  { href: "/events", label: "Events" },
  { href: "/dashboard", label: "My Passes" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/checkin", label: "Gate" },
];

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <span className="tabular-nums text-bone-faint">--:--:-- IST</span>;
  }

  const t = now.toLocaleTimeString("en-IN", {
    hour12: false,
    timeZone: "Asia/Kolkata",
  });

  return (
    <span className="tabular-nums text-bone-dim">
      {t} <span className="text-bone-faint">IST</span>
    </span>
  );
}

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-[0_8px_30px_rgba(30,41,59,0.06)] backdrop-blur-xl print:hidden">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Wordmark size="sm" />

        {/* primary nav — typographic only */}
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/events"
                ? pathname === "/events" || pathname.startsWith("/events/")
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-indigo-700"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 sm:flex">
            <span className="size-2 rounded-full bg-emerald-400" />
            <LiveClock />
          </span>
        </div>
      </div>

      {/* mobile nav strip */}
      <nav className="flex items-center justify-between border-t border-ink-line px-5 py-2.5 md:hidden">
        {NAV.map((item) => {
          const active =
            item.href === "/events"
              ? pathname === "/events" || pathname.startsWith("/events/")
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[10px] uppercase tracking-[0.2em] ${
                active ? "text-acid" : "text-bone-dim"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
