"use client";

import { Suspense } from "react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import EventRow, {
  BoardHeaderRow,
  EventRowSkeleton,
} from "@/components/EventRow";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const searchResults = useQuery(api.events.list, { search: query });

  const now = Date.now();
  const upcoming = searchResults
    ? searchResults
        .filter((event) => event.eventDate > now)
        .sort((a, b) => a.eventDate - b.eventDate)
    : [];
  const past = searchResults
    ? searchResults
        .filter((event) => event.eventDate <= now)
        .sort((a, b) => b.eventDate - a.eventDate)
    : [];

  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-14 sm:px-8 sm:pt-20">
        <p className="animate-rise-in text-[10px] uppercase tracking-[0.35em] text-bone-faint">
          HackB4 <span className="text-acid">/</span> Manifest scan
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.5rem,7vw,6rem)] uppercase leading-[0.95] tracking-wide">
          Results for{" "}
          <span className="font-flourish normal-case italic tracking-normal text-acid">
            “{query}”
          </span>
          <sup className="ml-3 align-super font-terminal text-sm tracking-[0.2em] text-bone-dim">
            [{searchResults ? searchResults.length : "··"}]
          </sup>
        </h1>

        {!searchResults ? (
          <div className="mt-16 border border-ink-line bg-ink-soft/60">
            <BoardHeaderRow />
            <div className="divide-y divide-ink-line border-t border-ink-line">
              {Array.from({ length: 4 }).map((_, i) => (
                <EventRowSkeleton key={i} index={i} />
              ))}
            </div>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="mt-16 border border-ink-line bg-ink-soft/60 px-6 py-20 text-center">
            <p className="font-flourish text-3xl italic text-bone-dim">
              Nothing on the manifest for that.
            </p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.25em] text-bone-faint">
              Try a different call sign — or scan the full board
            </p>
            <Link
              href="/events"
              className="mt-8 inline-block border border-acid bg-acid px-8 py-3 text-[11px] uppercase tracking-[0.3em] text-ink transition-colors hover:bg-transparent hover:text-acid"
            >
              Full departures board
            </Link>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mt-14 border border-ink-line bg-ink-soft/60">
                <div className="border-b border-ink-line px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-bone-dim sm:px-6">
                  Upcoming matches <span className="text-acid">— Live</span>
                </div>
                <BoardHeaderRow />
                <div className="divide-y divide-ink-line border-t border-ink-line">
                  {upcoming.map((event, i) => (
                    <EventRow key={event._id} event={event} index={i} />
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div className="mt-12">
                <div className="flex items-baseline justify-between border-b border-ink-line pb-3">
                  <h2 className="font-display text-2xl uppercase tracking-wide text-bone-faint">
                    Past matches
                  </h2>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-bone-faint">
                    [{past.length}] Archived
                  </span>
                </div>
                <div className="divide-y divide-ink-line">
                  {past.map((event, i) => (
                    <EventRow key={event._id} event={event} index={i} dimmed />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="grid-bg flex min-h-[50vh] items-center justify-center">
          <p className="animate-blink text-[11px] uppercase tracking-[0.4em] text-bone-faint">
            Scanning manifest<span className="text-acid">…</span>
          </p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
