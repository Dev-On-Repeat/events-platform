"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import Image from "next/image";
import QRCode from "react-qr-code";
import { format } from "date-fns";

function PassSkeleton() {
  return (
    <div className="grid-bg flex min-h-[70vh] items-center justify-center">
      <p className="animate-blink text-[11px] uppercase tracking-[0.4em] text-bone-faint">
        Retrieving pass<span className="text-acid">…</span>
      </p>
    </div>
  );
}

function PassNotFound({ ticketId }: { ticketId: string }) {
  return (
    <div className="grid-bg flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <h2 className="font-display text-5xl uppercase tracking-wide">
        No <span className="text-outline">such pass</span>
      </h2>
      <p className="mt-4 max-w-sm font-flourish text-xl italic text-bone-dim">
        We can&apos;t find a confirmed ticket with identifier{" "}
        <span className="font-terminal not-italic text-acid">{ticketId}</span>.
      </p>
      <Link
        href="/events"
        className="mt-8 border border-acid bg-acid px-8 py-3 text-[11px] uppercase tracking-[0.3em] text-ink transition-colors hover:bg-transparent hover:text-acid"
      >
        ← Departures board
      </Link>
    </div>
  );
}

function PassExpired() {
  return (
    <div className="grid-bg flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <h2 className="font-display text-5xl uppercase tracking-wide">
        Pass <span className="text-outline">expired</span>
      </h2>
      <p className="mt-4 max-w-md font-flourish text-xl italic text-bone-dim">
        This departure has already concluded. The terminal will ping you when
        new gates open.
      </p>
      <Link
        href="/events"
        className="mt-8 border border-acid bg-acid px-8 py-3 text-[11px] uppercase tracking-[0.3em] text-ink transition-colors hover:bg-transparent hover:text-acid"
      >
        Next departures
      </Link>
    </div>
  );
}

function DetailCell({
  k,
  v,
  s,
}: {
  k: string;
  v: string;
  s?: string;
}) {
  return (
    <div>
      <div className="text-[8px] uppercase tracking-[0.3em] text-ink/50">{k}</div>
      <div className="mt-1 font-terminal text-[13px] font-bold uppercase leading-snug text-ink">
        {v}
      </div>
      {s && <div className="text-[9px] text-ink/50">{s}</div>}
    </div>
  );
}

function PassCard({
  ticket,
  index,
  total,
}: {
  ticket: {
    _id: string;
    status: string;
    attendeeName: string;
    attendeeEmail: string;
    ticketNumber: string;
    qrPayload: string;
    purchasedAt: number;
    event?: {
      name?: string;
      eventDate?: number;
      location?: string;
      city?: string;
      price?: number;
      imageUrl?: string;
    } | null;
  };
  index: number;
  total: number;
}) {
  const event = ticket.event;
  const isValid = ticket.status === "VALID";
  const statusTone = isValid
    ? "bg-acid text-ink"
    : ticket.status === "USED"
      ? "bg-ink text-bone"
      : "bg-signal text-bone";

  return (
    <article className="relative border border-ink-line bg-bone text-ink shadow-hard-lg">
      {/* header strip */}
      <div className="flex items-center justify-between bg-ink px-5 py-3 text-bone">
        <span className="font-display text-xl uppercase tracking-[0.08em]">
          HackB<span className="text-acid">4</span>
        </span>
        <span className="text-[9px] uppercase tracking-[0.35em] text-bone-dim">
          Boarding pass
          {total > 1 ? ` — ${index + 1} of ${total}` : ""}
        </span>
        <span
          className={`px-3 py-1 text-[9px] font-bold uppercase tracking-[0.25em] ${statusTone}`}
        >
          {ticket.status}
        </span>
      </div>

      {/* event banner */}
      {event?.imageUrl && (
        <div className="relative h-36 w-full overflow-hidden sm:h-44">
          <Image
            src={event.imageUrl}
            alt={event.name || "Event"}
            fill
            sizes="(max-width: 768px) 100vw, 700px"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
          <h2 className="absolute bottom-3 left-5 font-display text-2xl uppercase tracking-wide text-bone sm:text-3xl">
            {event.name}
          </h2>
        </div>
      )}

      {/* body: details + perforated stub */}
      <div className="relative grid sm:grid-cols-[1.7fr_1fr]">
        {/* punched notches on the perforation line */}
        <span
          aria-hidden
          className="absolute -top-3 right-0 hidden h-6 w-6 rounded-full border border-ink-line bg-ink sm:right-[calc(37%-0.75rem)]"
        />
        <span
          aria-hidden
          className="absolute -bottom-3 right-0 hidden h-6 w-6 rounded-full border border-ink-line bg-ink sm:right-[calc(37%-0.75rem)]"
        />

        {/* details */}
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
            <DetailCell k="Passenger" v={ticket.attendeeName} s={ticket.attendeeEmail} />
            <DetailCell
              k="Departure"
              v={
                event?.eventDate
                  ? format(new Date(event.eventDate), "d MMM yyyy")
                  : "Confirmed"
              }
              s={
                event?.eventDate
                  ? format(new Date(event.eventDate), "EEE · HH:mm 'IST'")
                  : undefined
              }
            />
            <DetailCell
              k="Gate / Venue"
              v={event?.city || event?.location || "—"}
              s={event?.city ? event.location : undefined}
            />
            <DetailCell k="Fare paid" v={event?.price === 0 ? "FREE" : `₹${event?.price ?? "—"}`} />
            <DetailCell k="Class" v="General admission" />
            <DetailCell k="Issued" v={format(new Date(ticket.purchasedAt), "d MMM yyyy")} />
          </div>

          <div className="perf-h mt-6 h-3 opacity-40" />

          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-[8px] uppercase tracking-[0.3em] text-ink/50">
                Ticket no.
              </div>
              <div className="mt-1 font-terminal text-sm font-bold tracking-wider text-ink">
                {ticket.ticketNumber}
              </div>
            </div>
            <div className="text-right text-[8px] uppercase leading-relaxed tracking-[0.25em] text-ink/40">
              Valid ID + this pass
              <br />
              Non-transferable
            </div>
          </div>
        </div>

        {/* stub */}
        <div className="relative border-t border-dashed border-ink/30 p-5 sm:border-l sm:border-t-0 sm:p-6">
          <div className="perf-v absolute inset-y-4 left-0 w-3 sm:inset-y-0 sm:left-0 sm:h-auto" />
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 shadow-[4px_4px_0_0_rgba(11,11,9,1)]">
              <QRCode
                value={ticket.qrPayload}
                size={150}
                level="H"
                className="h-auto w-full"
              />
            </div>
            <p className="mt-4 text-[9px] uppercase tracking-[0.3em] text-ink/60">
              Scan at gate — 2 sec entry
            </p>
            <span className="mt-4 hidden font-display text-lg uppercase tracking-widest text-ink/25 sm:block [writing-mode:vertical-rl]">
              HackB4 · Terminal 4
            </span>
          </div>
        </div>
      </div>

      {/* footer strip */}
      <div className="flex items-center justify-between border-t border-ink/15 px-5 py-2.5 text-[8px] uppercase tracking-[0.25em] text-ink/45">
        <span>Issued by HackB4 ticketing system</span>
        <span>Thanks for flying with us</span>
      </div>
    </article>
  );
}

export default function TicketPassPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);

  const directTicket = useQuery(api.tickets.getById, {
    ticketId: ticketId as Id<"tickets">,
  });
  const registrationTickets = useQuery(api.tickets.getByRegistrationId, {
    registrationId: ticketId as Id<"registrations">,
  });

  const tickets = directTicket ? [directTicket] : registrationTickets || [];

  if (directTicket === undefined && registrationTickets === undefined) {
    return <PassSkeleton />;
  }
  if (tickets.length === 0) {
    return <PassNotFound ticketId={ticketId} />;
  }
  if (tickets.some((t) => String(t.status) === "EXPIRED")) {
    return <PassExpired />;
  }

  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        {/* actions */}
        <div className="no-print mb-8 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="link-sweep text-[10px] uppercase tracking-[0.3em] text-bone-faint hover:text-bone"
          >
            ← My passes
          </Link>
          <button
            onClick={() => window.print()}
            className="border border-ink-line px-5 py-2 text-[10px] uppercase tracking-[0.25em] text-bone-dim transition-colors hover:border-acid hover:bg-acid hover:text-ink"
          >
            Print pass
          </button>
        </div>

        <div className="space-y-10">
          {tickets.map((ticket, i) => (
            <PassCard
              key={ticket._id}
              ticket={ticket}
              index={i}
              total={tickets.length}
            />
          ))}
        </div>

        <p className="no-print mt-10 text-center font-flourish text-lg italic text-bone-faint">
          Keep this pass on your phone — the gate reads it off glass, no
          printout needed.
        </p>
      </div>
    </div>
  );
}
