"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import EventCard from "./EventCard";
import { EventCardSkeleton } from "./Skeleton";
import { CalendarDays, Ticket, Sparkles } from "lucide-react";
import { useState } from "react";

export default function EventList() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const events = useQuery(api.events.list, {
    category: selectedCategory === "All" ? undefined : selectedCategory,
  });

  if (!events) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Upcoming Events
            </h1>
            <p className="mt-1.5 text-gray-600 text-sm">
              Discover and book passes for college festivals, hackathons, and symposiums
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const now = Date.now();
  const upcomingEvents = events
    .filter((event) => event.eventDate > now)
    .sort((a, b) => a.eventDate - b.eventDate);

  const pastEvents = events
    .filter((event) => event.eventDate <= now)
    .sort((a, b) => b.eventDate - a.eventDate);

  const categories = ["All", "Hackathon", "Cultural", "Robotics", "Conference"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Upcoming Events
          </h1>
          <p className="mt-1.5 text-gray-600 text-sm">
            Discover and book passes for college festivals, hackathons, and symposiums
          </p>
        </div>

        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200/80 shrink-0 self-start sm:self-auto">
          <div className="flex items-center gap-2 text-gray-700 text-sm">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <span className="font-semibold">
              {upcomingEvents.length} Active Events
            </span>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedCategory === cat
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Upcoming Events Grid */}
      {upcomingEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {upcomingEvents.map((event) => (
            <EventCard key={event._id} event={event as any} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mb-16 shadow-sm">
          <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">
            No events found in this category
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Check back later or browse all events
          </p>
          <button
            onClick={() => setSelectedCategory("All")}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition"
          >
            Show All Events
          </button>
        </div>
      )}

      {/* Past Events Section */}
      {pastEvents.length > 0 && (
        <div className="pt-8 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Past Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map((event) => (
              <EventCard key={event._id} event={event as any} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
