"use client";

import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import HeroScene from "@/components/HeroScene";
import Marquee from "@/components/Marquee";
import EventRow, {
  BoardHeaderRow,
  EventRowSkeleton,
} from "@/components/EventRow";

const MARQUEE_ITEMS = [
  "Instant QR passes",
  "Razorpay secure checkout",
  "OCC-safe ticket inventory",
  "Zero paper — zero queues",
  "36-hour hackathons",
  "Gate verification in 2 seconds",
];

const STEPS = [
  {
    n: "01",
    title: "Pick a departure",
    body: "Scan the live board. Hackathons, cultural nights, robot arenas, summits — each with real-time seat counts and a hard boarding time.",
  },
  {
    n: "02",
    title: "Claim your pass",
    body: "Register in under a minute. Pay through Razorpay or grab a free pass. Inventory is OCC-guarded — no double-selling, ever.",
  },
  {
    n: "03",
    title: "Flash and walk in",
    body: "Your digital pass carries a signed QR. At the gate it scans in two seconds. No paper, no printouts, no arguments.",
  },
];

export default function Home() {
  const events = useQuery(api.events.list, {});
  const now = Date.now();
  const upcoming = events
    ? events
        .filter((e) => e.eventDate > now)
        .sort((a, b) => a.eventDate - b.eventDate)
    : [];
  const featured = upcoming.slice(0, 5);

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[92svh] flex-col overflow-hidden">
        <HeroScene className="absolute inset-0" />
        {/* vignette + scanline */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#0B0B09_88%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 animate-scan-drift bg-gradient-to-b from-transparent via-acid/[0.04] to-transparent"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-5 py-24 sm:px-8">
          <p className="animate-rise-in text-[10px] uppercase tracking-[0.4em] text-bone-dim">
            HackB4 Ticketing Terminal <span className="text-acid">—</span> Live{" "}
            <span className="inline-block h-1.5 w-1.5 animate-blink rounded-full bg-acid align-middle" />
          </p>

          <h1
            className="mt-8 font-display uppercase leading-[0.86] tracking-wide"
            style={{ fontSize: "clamp(4rem, 13vw, 11.5rem)" }}
          >
            <span className="block animate-rise-in" style={{ animationDelay: "80ms" }}>
              Show up.
            </span>
            <span
              className="block animate-rise-in font-flourish normal-case italic tracking-normal text-acid"
              style={{ animationDelay: "180ms", fontSize: "0.62em" }}
            >
              board on time,
            </span>
            <span className="block animate-rise-in text-outline" style={{ animationDelay: "280ms" }}>
              never wait.
            </span>
          </h1>

          <p
            className="mt-10 max-w-xl animate-rise-in font-flourish text-xl leading-relaxed text-bone-dim sm:text-2xl"
            style={{ animationDelay: "400ms" }}
          >
            The ticketing terminal for hackathons, cultural carnivals and
            robot wars. Claim a pass, flash the QR,{" "}
            <span className="text-bone">walk straight in.</span>
          </p>

          <div
            className="mt-12 flex flex-wrap items-center gap-4 animate-rise-in"
            style={{ animationDelay: "520ms" }}
          >
            <Link
              href="/events"
              className="border border-acid bg-acid px-8 py-4 text-[12px] uppercase tracking-[0.3em] text-ink shadow-hard-acid transition-all duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              Browse departures →
            </Link>
            <Link
              href="/dashboard"
              className="border border-ink-line px-8 py-4 text-[12px] uppercase tracking-[0.3em] text-bone-dim transition-colors hover:border-bone hover:text-bone"
            >
              My passes
            </Link>
          </div>
        </div>

        {/* stats strip */}
        <div className="relative z-10 border-t border-ink-line bg-ink/70 backdrop-blur-sm">
          <div className="mx-auto grid max-w-[1400px] grid-cols-2 divide-x divide-ink-line sm:grid-cols-4">
            {[
              { v: String(upcoming.length).padStart(2, "0"), l: "Upcoming departures" },
              { v: "04", l: "Event categories" },
              { v: "100%", l: "QR-verified entry" },
              { v: "24×7", l: "Terminal open" },
            ].map((s) => (
              <div key={s.l} className="px-5 py-6 sm:px-8">
                <div className="font-display text-4xl tracking-wide text-bone">
                  {events ? s.v : "··"}
                </div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.25em] text-bone-faint">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────── */}
      <Marquee
        items={MARQUEE_ITEMS}
        className="border-y border-acid/60 bg-acid text-ink"
      />

      {/* ── FEATURED DEPARTURES ──────────────────────────────── */}
      <section className="grid-bg">
        <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-bone-faint">
                Next out the gate
              </p>
              <h2 className="mt-3 font-display text-5xl uppercase tracking-wide sm:text-7xl">
                Featured <span className="text-outline">departures</span>
              </h2>
            </div>
            <Link
              href="/events"
              className="link-sweep pb-2 text-[11px] uppercase tracking-[0.3em] text-acid"
            >
              Full board →
            </Link>
          </div>

          <div className="mt-12 border border-ink-line bg-ink-soft/60">
            <BoardHeaderRow />
            <div className="divide-y divide-ink-line border-t border-ink-line">
              {!events ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <EventRowSkeleton key={i} index={i} />
                ))
              ) : featured.length > 0 ? (
                featured.map((event, i) => (
                  <EventRow key={event._id} event={event} index={i} />
                ))
              ) : (
                <p className="px-6 py-14 text-center font-flourish text-xl italic text-bone-dim">
                  The board is clear — new departures drop soon.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── PROTOCOL / HOW IT WORKS ──────────────────────────── */}
      <section className="border-t border-ink-line bg-bone text-ink">
        <div className="halftone">
          <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-28">
            <p className="text-[10px] uppercase tracking-[0.35em] text-ink/60">
              The protocol
            </p>
            <h2 className="mt-3 font-display text-5xl uppercase tracking-wide sm:text-7xl">
              Three moves.
              <br />
              <span className="text-outline-ink">You&apos;re in.</span>
            </h2>

            <div className="mt-16 grid gap-px border border-ink bg-ink md:grid-cols-3">
              {STEPS.map((step) => (
                <div
                  key={step.n}
                  className="group relative bg-bone p-8 transition-colors duration-300 hover:bg-ink sm:p-10"
                >
                  <span className="font-display text-6xl text-ink/15 transition-colors duration-300 group-hover:text-acid">
                    {step.n}
                  </span>
                  <h3 className="mt-6 font-display text-2xl uppercase tracking-wide transition-colors duration-300 group-hover:text-bone">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-xs leading-relaxed text-ink/70 transition-colors duration-300 group-hover:text-bone-dim">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BAND ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-ink-line">
        <div className="grid-bg-fine">
          <div className="mx-auto max-w-[1400px] px-5 py-24 text-center sm:px-8 sm:py-32">
            <p className="text-[10px] uppercase tracking-[0.4em] text-bone-faint">
              Gate closes without you
            </p>
            <h2 className="mx-auto mt-6 max-w-5xl font-display text-[clamp(3rem,8vw,7rem)] uppercase leading-[0.92] tracking-wide">
              Your seat is{" "}
              <span className="font-flourish normal-case italic tracking-normal text-acid">
                still warm.
              </span>
            </h2>
            <Link
              href="/events"
              className="mt-12 inline-block border border-acid bg-acid px-10 py-4 text-[12px] uppercase tracking-[0.3em] text-ink shadow-hard-acid transition-all duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              Claim it now →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
