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
    <header className="sticky top-0 z-50 border-b border-ink-line bg-ink/90 shadow-[0_8px_30px_rgba(33,45,84,0.06)] backdrop-blur-xl print:hidden">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-5 py-5 sm:px-8">
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
                className={`link-sweep font-terminal text-[11px] uppercase tracking-[0.22em] transition-colors ${
                  active
                    ? "link-sweep-active text-acid"
                    : "text-bone-dim hover:text-bone"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-2 text-[11px] uppercase tracking-[0.18em] sm:flex">
            <span className="inline-block h-1.5 w-1.5 animate-blink rounded-full bg-acid" />
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
