import Link from "next/link";
import { ReactNode } from "react";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/registrations", label: "Registrations" },
  { href: "/admin/checkin", label: "Gate" },
];

/**
 * Shared chrome for the /admin operations area.
 */
export default function AdminShell({
  title,
  accent,
  tag,
  actions,
  active,
  children,
}: {
  title: string;
  accent?: string;
  tag: string;
  actions?: ReactNode;
  active: string;
  children: ReactNode;
}) {
  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-[1300px] px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
        <p className="text-[10px] uppercase tracking-[0.35em] text-bone-faint">
          HackB4 <span className="text-acid">/</span> Ops {tag}
        </p>

        <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-display text-[clamp(2.25rem,5vw,4.5rem)] uppercase leading-[0.95] tracking-wide">
            {title} {accent && <span className="text-outline">{accent}</span>}
          </h1>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>

        {/* tab rail */}
        <nav className="mt-10 flex items-center gap-px border border-ink-line bg-ink-line">
          {TABS.map((tab) => {
            const isActive = tab.href === active;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-5 py-2.5 text-[10px] uppercase tracking-[0.25em] transition-colors ${
                  isActive
                    ? "bg-acid text-ink"
                    : "bg-ink text-bone-dim hover:bg-ink-soft hover:text-bone"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
