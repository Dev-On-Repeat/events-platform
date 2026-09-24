"use client";

import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import EventRow, {
  BoardHeaderRow,
  EventRowSkeleton,
} from "./EventRow";
import SearchBar from "./SearchBar";

const CATEGORIES = ["All", "Hackathon", "Cultural", "Robotics", "Conference"];

export default function EventList() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const events = useQuery(api.events.list, {
    category: selectedCategory === "All" ? undefined : selectedCategory,
  });

  const now = Date.now();
  const upcomingEvents = events
    ? events
        .filter((event) => event.eventDate > now)
        .sort((a, b) => a.eventDate - b.eventDate)
    : [];

  const pastEvents = events
    ? events
        .filter((event) => event.eventDate <= now)
        .sort((a, b) => b.eventDate - a.eventDate)
    : [];

  return (
    <div className="grid-bg">
      <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-14 sm:px-8 sm:pt-20">
        {/* masthead */}
        <div className="animate-rise-in">
          <p className="text-[10px] uppercase tracking-[0.35em] text-bone-faint">
            HackB4 <span className="text-acid">/</span> Departures Board
          </p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="font-display text-[clamp(3rem,9vw,7.5rem)] uppercase leading-[0.9] tracking-wide">
              All
              <br />
              <span className="text-outline">Events</span>
              <sup className="ml-3 align-super font-terminal text-sm tracking-[0.2em] text-acid sm:text-lg">
                [{upcomingEvents.length || "··"}]
              </sup>
            </h1>
            <div className="w-full max-w-xl pb-2">
              <SearchBar />
            </div>
          </div>
        </div>

        {/* category filters */}
        <div className="no-scrollbar mt-12 flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 border px-4 py-2 text-[10px] uppercase tracking-[0.25em] transition-all duration-200 ${
                  active
                    ? "border-acid bg-acid text-ink"
                    : "border-ink-line text-bone-dim hover:border-bone-faint hover:text-bone"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* the board */}
        <section className="mt-8 border border-ink-line bg-ink-soft/60">
          <div className="flex items-center justify-between border-b border-ink-line px-4 py-3 sm:px-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-bone-dim">
              Upcoming <span className="text-acid">— Live</span>
            </span>
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-bone-faint">
              <span className="inline-block h-1.5 w-1.5 animate-blink rounded-full bg-acid" />
              Synced {new Date().toLocaleTimeString("en-IN", { hour12: false, timeZone: "Asia/Kolkata" })}
            </span>
          </div>

          <BoardHeaderRow />
          <div className="divide-y divide-ink-line border-t border-ink-line">
            {!events ? (
              Array.from({ length: 6 }).map((_, i) => (
                <EventRowSkeleton key={i} index={i} />
              ))
            ) : upcomingEvents.length > 0 ? (
              upcomingEvents.map((event, i) => (
                <EventRow key={event._id} event={event} index={i} />
              ))
            ) : (
              <div className="px-6 py-16 text-center">
                <p className="font-flourish text-2xl italic text-bone-dim">
                  Nothing on the board for this filter.
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-bone-faint">
                  Check back — new departures are posted weekly
                </p>
                <button
                  onClick={() => setSelectedCategory("All")}
                  className="mt-8 border border-acid bg-acid px-6 py-2.5 text-[11px] uppercase tracking-[0.25em] text-ink transition-colors hover:bg-transparent hover:text-acid"
                >
                  Show all events
                </button>
              </div>
            )}
          </div>
        </section>

        {/* past events */}
        {pastEvents.length > 0 && (
          <section className="mt-16">
            <div className="flex items-baseline justify-between border-b border-ink-line pb-3">
              <h2 className="font-display text-3xl uppercase tracking-wide text-bone-faint">
                Past Departures
              </h2>
              <span className="text-[10px] uppercase tracking-[0.25em] text-bone-faint">
                [{pastEvents.length}] Archived
              </span>
            </div>
            <div className="divide-y divide-ink-line">
              {pastEvents.map((event, i) => (
                <EventRow key={event._id} event={event} index={i} dimmed />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
