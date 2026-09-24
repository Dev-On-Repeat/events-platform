"use client";

import Link from "next/link";
import { format } from "date-fns";

export interface EventRowEvent {
  _id: string;
  slug: string;
  name: string;
  shortDescription?: string;
  description?: string;
  category: string;
  location: string;
  city?: string;
  eventDate: number;
  registrationDeadline: number;
  price: number;
  totalTickets: number;
  availableSpots: number;
  isSoldOut?: boolean;
  status?: string;
  is_cancelled?: boolean;
  participationType?: "SOLO" | "TEAM" | "BOTH";
}

type BoardStatus = {
  label: string;
  tone: "acid" | "signal" | "amber" | "dim";
  bookable: boolean;
};

function getBoardStatus(e: EventRowEvent, now: number): BoardStatus {
  const past = e.eventDate < now;
  const cancelled = e.status === "CANCELLED" || e.is_cancelled;
  const completed = e.status === "COMPLETED" || past;
  const closed = e.registrationDeadline < now || e.status === "CLOSED";
  const soldOut = e.availableSpots <= 0;

  if (cancelled) return { label: "CANCELLED", tone: "signal", bookable: false };
  if (completed) return { label: "DEPARTED", tone: "dim", bookable: false };
  if (closed) return { label: "CLOSED", tone: "dim", bookable: false };
  if (soldOut) return { label: "WAITLIST", tone: "amber", bookable: false };
  if (e.availableSpots < 20)
    return { label: `ONLY ${e.availableSpots} LEFT`, tone: "signal", bookable: true };
  return { label: "BOARDING", tone: "acid", bookable: true };
}

const toneClass: Record<BoardStatus["tone"], string> = {
  acid: "text-acid",
  signal: "text-signal",
  amber: "text-amberish",
  dim: "text-bone-faint",
};

export default function EventRow({
  event,
  index,
  dimmed = false,
}: {
  event: EventRowEvent;
  index: number;
  dimmed?: boolean;
}) {
  const now = Date.now();
  const status = getBoardStatus(event, now);
  const muted = dimmed || !status.bookable;

  const seq = String(index + 1).padStart(2, "0");
  const date = format(new Date(event.eventDate), "EEE d MMM");
  const time = format(new Date(event.eventDate), "HH:mm");
  const fare = event.price === 0 ? "FREE" : `₹${event.price}`;
  const type =
    event.participationType === "TEAM"
      ? "TEAM"
      : event.participationType === "BOTH"
        ? "SOLO+TEAM"
        : "SOLO";

  const inner = (
    <>
      {/* acid rule on hover */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] scale-y-0 bg-acid transition-transform duration-300 group-hover:scale-y-100"
      />

      {/* seq */}
      <span className="col-span-1 text-[11px] tabular-nums text-bone-faint">
        {seq}
      </span>

      {/* event */}
      <span className="col-span-1 min-w-0">
        <span
          className={`block truncate font-display text-xl uppercase leading-tight tracking-wide transition-colors sm:text-2xl ${
            muted ? "text-bone-faint" : "text-bone group-hover:text-acid"
          }`}
        >
          {event.name}
        </span>
        <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.18em] text-bone-faint">
          {event.category} <span className="text-ink-line">/</span>{" "}
          {event.city || event.location} <span className="text-ink-line">/</span>{" "}
          {type}
        </span>
      </span>

      {/* date */}
      <span className="col-span-1 text-right text-xs tabular-nums text-bone-dim sm:text-left">
        {date}
        <span className="block text-[10px] text-bone-faint">{time} IST</span>
      </span>

      {/* status */}
      <span
        className={`col-span-1 text-[10px] font-bold uppercase tracking-[0.22em] sm:text-right ${toneClass[status.tone]} ${
          status.tone === "acid" ? "animate-flicker" : ""
        }`}
      >
        {status.label}
      </span>

      {/* fare */}
      <span
        className={`col-span-1 text-right font-display text-xl tabular-nums tracking-wide ${
          muted ? "text-bone-faint" : "text-bone"
        }`}
      >
        {fare}
      </span>

      {/* action glyph */}
      <span
        className={`col-span-1 justify-self-end text-lg transition-all duration-300 ${
          status.bookable
            ? "text-bone-faint group-hover:translate-x-1 group-hover:text-acid"
            : "text-ink-line"
        }`}
        aria-hidden
      >
        {status.bookable ? "→" : "×"}
      </span>
    </>
  );

  const gridCols =
    "grid grid-cols-[2rem_minmax(0,1fr)_7.5rem_6.5rem_4.5rem_1.5rem] items-center gap-x-3 sm:grid-cols-[3rem_minmax(0,1.6fr)_9rem_9rem_5.5rem_2.5rem] sm:gap-x-6";

  if (!status.bookable) {
    return (
      <div
        className={`group relative ${gridCols} px-4 py-5 sm:px-6 ${
          dimmed ? "opacity-45" : ""
        }`}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/events/${event.slug || event._id}`}
      className={`group relative ${gridCols} px-4 py-5 transition-colors duration-200 hover:bg-bone/[0.04] sm:px-6`}
    >
      {inner}
    </Link>
  );
}

export function BoardHeaderRow() {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)_7.5rem_6.5rem_4.5rem_1.5rem] gap-x-3 px-4 pb-3 text-[9px] uppercase tracking-[0.28em] text-bone-faint sm:grid-cols-[3rem_minmax(0,1.6fr)_9rem_9rem_5.5rem_2.5rem] sm:gap-x-6 sm:px-6">
      <span>No.</span>
      <span>Event</span>
      <span className="text-right sm:text-left">
        Date<span className="hidden sm:inline"> / Time</span>
      </span>
      <span className="text-right sm:text-left">Status</span>
      <span className="text-right">Fare</span>
      <span className="text-right" aria-hidden>
        ·
      </span>
    </div>
  );
}

export function EventRowSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)_7.5rem_6.5rem_4.5rem_1.5rem] items-center gap-x-3 px-4 py-5 sm:grid-cols-[3rem_minmax(0,1.6fr)_9rem_9rem_5.5rem_2.5rem] sm:gap-x-6 sm:px-6">
      <span className="text-[11px] tabular-nums text-bone-faint">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="min-w-0 space-y-2">
        <span className="block h-5 w-3/4 animate-pulse bg-bone/10" />
        <span className="block h-2.5 w-1/3 animate-pulse bg-bone/[0.07]" />
      </span>
      <span className="hidden h-4 w-20 animate-pulse bg-bone/10 sm:block" />
      <span className="h-2.5 w-14 animate-pulse bg-bone/10" />
      <span className="hidden h-5 w-12 animate-pulse bg-bone/10 sm:block" />
      <span className="justify-self-end text-bone-faint">·</span>
    </div>
  );
}
