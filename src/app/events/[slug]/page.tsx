"use client";

import { use, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";

function Countdown({ to }: { to: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) {
    return <span className="tabular-nums text-bone-faint">--d --h --m --s</span>;
  }
  const diff = Math.max(0, to - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <span className="tabular-nums text-acid">
      {String(d).padStart(2, "0")}d {String(h).padStart(2, "0")}h{" "}
      {String(m).padStart(2, "0")}m{" "}
      <span className="animate-blink">{String(s).padStart(2, "0")}s</span>
    </span>
  );
}

function CapacityMeter({ available, total }: { available: number; total: number }) {
  const SEGMENTS = 24;
  const filled = total > 0 ? Math.round((available / total) * SEGMENTS) : 0;
  return (
    <div className="flex gap-[3px]" aria-label={`${available} of ${total} seats available`}>
      {Array.from({ length: SEGMENTS }).map((_, i) => (
        <span
          key={i}
          className={`h-4 flex-1 ${
            i < filled
              ? available <= 20
                ? "bg-signal"
                : "bg-acid"
              : "bg-ink-line"
          }`}
        />
      ))}
    </div>
  );
}

export default function EventDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const event = useQuery(api.events.getBySlug, { slug });

  if (event === undefined) {
    return (
      <div className="grid-bg flex min-h-[70vh] items-center justify-center">
        <p className="animate-blink text-[11px] uppercase tracking-[0.4em] text-bone-faint">
          Establishing uplink<span className="text-acid">…</span>
        </p>
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="grid-bg flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <h2 className="font-display text-5xl uppercase tracking-wide text-bone">
          Lost <span className="text-outline">manifest</span>
        </h2>
        <p className="mt-4 max-w-sm font-flourish text-xl italic text-bone-dim">
          This departure isn&apos;t on our board — it may have been pulled.
        </p>
        <Link
          href="/events"
          className="mt-8 border border-acid bg-acid px-8 py-3 text-[11px] uppercase tracking-[0.3em] text-ink transition-colors hover:bg-transparent hover:text-acid"
        >
          ← Back to departures
        </Link>
      </div>
    );
  }

  const now = Date.now();
  const isPastEvent = event.eventDate < now;
  const isRegistrationClosed = event.registrationDeadline < now;
  const availableSpots = Math.max(
    0,
    event.totalTickets - (event.soldCount + event.reservedCount)
  );
  const isSoldOut = availableSpots <= 0;
  const isCancelled = event.status === "CANCELLED" || event.is_cancelled;
  const isCompleted = event.status === "COMPLETED";
  const bookable =
    !isPastEvent && !isCompleted && !isCancelled && !isRegistrationClosed;

  const type =
    event.participationType === "TEAM"
      ? "TEAM ENTRY"
      : event.participationType === "BOTH"
        ? "SOLO + TEAM"
        : "SOLO ENTRY";

  return (
    <div>
      {/* ── POSTER HEADER ─────────────────────────────────── */}
      <header className="grid-bg relative overflow-hidden border-b border-ink-line">
        <div className="mx-auto max-w-[1400px] px-5 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-14">
          <Link
            href="/events"
            className="link-sweep inline-block text-[10px] uppercase tracking-[0.3em] text-bone-faint hover:text-bone"
          >
            ← Departures board
          </Link>

          <div className="mt-10 grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
            <div className="animate-rise-in">
              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.25em]">
                <span className="border border-acid px-3 py-1 text-acid">
                  {event.category}
                </span>
                <span className="border border-ink-line px-3 py-1 text-bone-dim">
                  {type}
                </span>
                {event.status === "CANCELLED" && (
                  <span className="border border-signal px-3 py-1 text-signal">
                    Cancelled
                  </span>
                )}
              </div>

              <h1 className="mt-6 font-display text-[clamp(2.75rem,7vw,6.5rem)] uppercase leading-[0.92] tracking-wide">
                {event.name}
              </h1>

              {event.shortDescription && (
                <p className="mt-6 max-w-2xl font-flourish text-2xl italic leading-snug text-bone-dim">
                  {event.shortDescription}
                </p>
              )}

              {/* meta strip */}
              <dl className="mt-10 grid grid-cols-2 gap-px border border-ink-line bg-ink-line sm:grid-cols-4">
                {[
                  {
                    k: "Departs",
                    v: format(new Date(event.eventDate), "d MMM yyyy"),
                    s: format(new Date(event.eventDate), "EEE · HH:mm 'IST'"),
                  },
                  {
                    k: "Gate / Venue",
                    v: event.city || event.location,
                    s: event.city ? event.location : undefined,
                  },
                  {
                    k: "Fare",
                    v: event.price === 0 ? "FREE" : `₹${event.price}`,
                    s: event.price === 0 ? "No charge" : "All-inclusive",
                  },
                  {
                    k: "Seats left",
                    v: `${availableSpots}/${event.totalTickets}`,
                    s: isSoldOut ? "Waitlist only" : "Live count",
                  },
                ].map((m) => (
                  <div key={m.k} className="bg-ink px-4 py-4">
                    <dt className="text-[9px] uppercase tracking-[0.25em] text-bone-faint">
                      {m.k}
                    </dt>
                    <dd className="mt-2 font-display text-lg uppercase tracking-wide text-bone">
                      {m.v}
                    </dd>
                    {m.s && (
                      <dd className="mt-0.5 text-[10px] text-bone-faint">{m.s}</dd>
                    )}
                  </div>
                ))}
              </dl>
            </div>

            {/* poster image */}
            {event.imageUrl && (
              <div className="group relative min-h-[280px] overflow-hidden border border-ink-line lg:min-h-full">
                <Image
                  src={event.imageUrl}
                  alt={event.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover grayscale transition-all duration-700 group-hover:scale-[1.03] group-hover:grayscale-0"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-acid/50 bg-ink/85 px-4 py-2.5 text-[9px] uppercase tracking-[0.3em]">
                  <span className="text-acid">Official poster</span>
                  <span className="text-bone-faint">
                    HackB4 / {event.slug}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── BODY ──────────────────────────────────────────── */}
      <div className="mx-auto grid max-w-[1400px] gap-16 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.5fr_1fr]">
        {/* left — editorial content */}
        <div>
          {event.description && (
            <section>
              <h2 className="text-[10px] uppercase tracking-[0.35em] text-bone-faint">
                Flight notes
              </h2>
              <p className="mt-5 max-w-2xl whitespace-pre-line font-flourish text-xl leading-relaxed text-bone">
                {event.description}
              </p>
            </section>
          )}

          {event.rules && event.rules.length > 0 && (
            <section className="mt-16">
              <h2 className="border-b border-ink-line pb-3 text-[10px] uppercase tracking-[0.35em] text-bone-faint">
                Rules of engagement
              </h2>
              <ol className="divide-y divide-ink-line">
                {event.rules.map((rule: string, i: number) => (
                  <li key={i} className="flex gap-5 py-4">
                    <span className="font-display text-lg text-acid">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-xs leading-relaxed text-bone-dim">
                      {rule}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {event.prizes && event.prizes.length > 0 && (
            <section className="mt-16">
              <h2 className="border-b border-ink-line pb-3 text-[10px] uppercase tracking-[0.35em] text-bone-faint">
                Cargo — prizes
              </h2>
              <ul className="mt-5 grid gap-px border border-ink-line bg-ink-line sm:grid-cols-3">
                {event.prizes.map((prize: string, i: number) => (
                  <li key={i} className="crop-marks relative bg-ink-soft p-5">
                    <span className="font-display text-3xl text-outline-acid">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-3 text-xs leading-relaxed text-bone-dim">
                      {prize}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {event.schedule && (
            <section className="mt-16">
              <h2 className="border-b border-ink-line pb-3 text-[10px] uppercase tracking-[0.35em] text-bone-faint">
                Flight plan — schedule
              </h2>
              <p className="mt-5 border-l-2 border-acid bg-ink-soft px-5 py-4 font-terminal text-xs leading-loose text-bone-dim">
                {event.schedule}
              </p>
            </section>
          )}

          {event.faqs && event.faqs.length > 0 && (
            <section className="mt-16">
              <h2 className="border-b border-ink-line pb-3 text-[10px] uppercase tracking-[0.35em] text-bone-faint">
                Control tower — FAQ
              </h2>
              <div className="divide-y divide-ink-line">
                {event.faqs.map((faq: { question: string; answer: string }, i: number) => (
                  <details key={i} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4">
                      <span className="text-xs uppercase tracking-[0.12em] text-bone group-hover:text-acid">
                        <span className="mr-3 text-bone-faint">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {faq.question}
                      </span>
                      <span
                        aria-hidden
                        className="text-bone-faint transition-transform duration-300 group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-3 pl-8 text-xs leading-relaxed text-bone-dim">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* right — boarding stub */}
        <aside>
          <div className="sticky top-28 border border-ink-line bg-ink-soft">
            <div className="flex items-center justify-between border-b border-ink-line px-6 py-3">
              <span className="text-[10px] uppercase tracking-[0.3em] text-bone-dim">
                Boarding pass
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-bone-faint">
                HackB4
              </span>
            </div>

            <div className="px-6 py-6">
              <div className="text-[9px] uppercase tracking-[0.3em] text-bone-faint">
                Fare
              </div>
              <div className="mt-2 font-display text-5xl tracking-wide text-bone">
                {event.price === 0 ? "FREE" : `₹${event.price}`}
                <span className="ml-2 align-middle font-terminal text-[10px] uppercase tracking-[0.2em] text-bone-faint">
                  {event.price === 0 ? "no charge" : "/ seat"}
                </span>
              </div>

              {/* live countdown */}
              {bookable && (
                <div className="mt-6 border border-ink-line bg-ink px-4 py-3">
                  <div className="text-[9px] uppercase tracking-[0.3em] text-bone-faint">
                    Boards in
                  </div>
                  <div className="mt-1 font-terminal text-lg">
                    <Countdown to={event.eventDate} />
                  </div>
                </div>
              )}

              {/* capacity */}
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-[0.25em] text-bone-faint">
                  <span>Cabin load</span>
                  <span className={availableSpots <= 20 ? "text-signal" : "text-bone-dim"}>
                    {availableSpots} of {event.totalTickets} free
                  </span>
                </div>
                <CapacityMeter available={availableSpots} total={event.totalTickets} />
                {event.reservedCount > 0 && (
                  <p className="mt-2 text-[10px] uppercase tracking-[0.15em] text-amberish">
                    {event.reservedCount} in checkout right now
                  </p>
                )}
              </div>

              {/* CTA */}
              {bookable ? (
                <Link
                  href={`/register/${event._id}`}
                  className="mt-8 block border border-acid bg-acid py-4 text-center text-[12px] uppercase tracking-[0.3em] text-ink transition-all duration-200 hover:bg-transparent hover:text-acid"
                >
                  {isSoldOut ? "Join waitlist" : "Claim your pass →"}
                </Link>
              ) : (
                <div className="mt-8 block cursor-not-allowed border border-ink-line py-4 text-center text-[12px] uppercase tracking-[0.3em] text-bone-faint">
                  {isPastEvent || isCompleted
                    ? "Departed"
                    : isCancelled
                      ? "Cancelled"
                      : "Gate closed"}
                </div>
              )}

              <p className="mt-4 text-center text-[9px] uppercase tracking-[0.2em] text-bone-faint">
                Instant confirmation — signed QR pass
              </p>
            </div>

            {event.organizerName && (
              <div className="border-t border-ink-line px-6 py-4">
                <div className="text-[9px] uppercase tracking-[0.3em] text-bone-faint">
                  Operated by
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.12em] text-bone">
                  {event.organizerName}
                </div>
                {event.organizerEmail && (
                  <div className="mt-0.5 text-[10px] text-bone-faint">
                    {event.organizerEmail}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
