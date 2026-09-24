"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

const statusTone: Record<string, string> = {
  VALID: "border-acid text-acid",
  USED: "border-bone-faint text-bone-dim",
  EXPIRED: "border-bone-faint text-bone-faint",
  CANCELLED: "border-signal text-signal",
};

export default function DashboardPage() {
  const router = useRouter();
  const { session, clearSession } = useAuth();
  const myTickets = useQuery(
    api.tickets.listBySession,
    session ? { sessionId: session } : "skip"
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleLogout = () => {
    clearSession();
    router.push("/events");
  };

  if (!mounted) {
    return (
      <div className="grid-bg flex min-h-[70vh] items-center justify-center">
        <p className="animate-blink text-[11px] uppercase tracking-[0.4em] text-bone-faint">
          Opening terminal<span className="text-acid">…</span>
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="grid-bg flex min-h-[80vh] items-center justify-center px-5">
        <div className="max-w-lg border border-ink-line bg-ink-soft/60 p-10 text-center sm:p-14">
          <p className="text-[10px] uppercase tracking-[0.35em] text-bone-faint">
            Access restricted
          </p>
          <h1 className="mt-5 font-display text-5xl uppercase leading-tight tracking-wide">
            No <span className="text-outline">manifest</span> found
          </h1>
          <p className="mt-4 font-flourish text-xl italic text-bone-dim">
            Register for a departure and your passes will appear here.
          </p>
          <Link
            href="/events"
            className="mt-10 inline-block border border-acid bg-acid px-8 py-3.5 text-[11px] uppercase tracking-[0.3em] text-ink transition-colors hover:bg-transparent hover:text-acid"
          >
            Browse departures →
          </Link>
        </div>
      </div>
    );
  }

  const tickets = myTickets || [];
  const validCount = tickets.filter((t) => t.status === "VALID").length;
  const usedCount = tickets.filter((t) => t.status === "USED").length;

  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-[1200px] px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
        {/* masthead */}
        <div className="animate-rise-in flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-bone-faint">
              HackB4 <span className="text-acid">/</span> Passenger terminal
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.75rem,7vw,5.5rem)] uppercase leading-[0.95] tracking-wide">
              My <span className="text-outline">passes</span>
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="border border-ink-line px-5 py-2.5 text-[10px] uppercase tracking-[0.25em] text-bone-dim transition-colors hover:border-signal hover:text-signal"
          >
            End session ×
          </button>
        </div>

        {/* stats strip */}
        <div className="mt-12 grid grid-cols-3 gap-px border border-ink-line bg-ink-line">
          {[
            { v: tickets.length, l: "Total passes" },
            { v: validCount, l: "Active" },
            { v: usedCount, l: "Used" },
          ].map((s) => (
            <div key={s.l} className="bg-ink-soft px-5 py-6 sm:px-8">
              <div className="font-display text-5xl text-bone">
                {myTickets ? s.v : "··"}
              </div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.25em] text-bone-faint">
                {s.l}
              </div>
            </div>
          ))}
        </div>

        {/* passes */}
        {!myTickets ? (
          <div className="mt-8 border border-ink-line bg-ink-soft/60 p-12 text-center">
            <p className="animate-blink text-[11px] uppercase tracking-[0.4em] text-bone-faint">
              Loading manifest<span className="text-acid">…</span>
            </p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="mt-8 border border-ink-line bg-ink-soft/60 p-12 text-center sm:p-16">
            <p className="font-flourish text-3xl italic text-bone-dim">
              Your wallet is empty.
            </p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.25em] text-bone-faint">
              Claim a pass — the board is live
            </p>
            <Link
              href="/events"
              className="mt-8 inline-block border border-acid bg-acid px-8 py-3 text-[11px] uppercase tracking-[0.3em] text-ink transition-colors hover:bg-transparent hover:text-acid"
            >
              Departures board →
            </Link>
          </div>
        ) : (
          <div className="mt-8 divide-y divide-ink-line border border-ink-line bg-ink-soft/60">
            {tickets.map((ticket, i) => (
              <button
                key={ticket._id}
                onClick={() => router.push(`/ticket/${ticket._id}`)}
                className="group grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-bone/[0.04] sm:grid-cols-[3rem_minmax(0,1fr)_8rem_7rem_2rem] sm:px-6"
              >
                <span className="text-[11px] tabular-nums text-bone-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span className="min-w-0">
                  <span className="block truncate font-display text-xl uppercase tracking-wide text-bone transition-colors group-hover:text-acid sm:text-2xl">
                    {ticket.event?.name || "Pass"}
                  </span>
                  <span className="mt-0.5 block text-[10px] uppercase tracking-[0.18em] text-bone-faint">
                    #{ticket.ticketNumber} ·{" "}
                    {ticket.registration?.registrationType === "TEAM"
                      ? `${ticket.registration?.ticketQuantity} members`
                      : "Solo"}{" "}
                    · {ticket.attendeeName}
                  </span>
                </span>

                <span className="hidden text-xs tabular-nums text-bone-dim sm:block">
                  {ticket.event?.eventDate
                    ? format(new Date(ticket.event.eventDate), "d MMM yyyy")
                    : "TBD"}
                </span>

                <span
                  className={`justify-self-start border px-3 py-1 text-[9px] font-bold uppercase tracking-[0.25em] sm:justify-self-end ${
                    statusTone[ticket.status] || "border-ink-line text-bone-faint"
                  }`}
                >
                  {ticket.status}
                </span>

                <span
                  aria-hidden
                  className="hidden justify-self-end text-bone-faint transition-all duration-300 group-hover:translate-x-1 group-hover:text-acid sm:block"
                >
                  →
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
