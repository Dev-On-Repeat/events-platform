"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  CalendarDays,
  MapPin,
  Ticket,
  Users,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export interface EventCardProps {
  event: {
    _id: string;
    slug: string;
    name: string;
    shortDescription?: string;
    category: string;
    location: string;
    city: string;
    eventDate: number;
    registrationDeadline: number;
    price: number;
    totalTickets: number;
    availableSpots: number;
    isSoldOut: boolean;
    imageUrl?: string;
    status: string;
    participationType: "SOLO" | "TEAM" | "BOTH";
  };
}

export default function EventCard({ event }: EventCardProps) {
  const isPast = Date.now() > event.eventDate;
  const isDeadlinePassed = Date.now() > event.registrationDeadline;

  const getStatusBadge = () => {
    if (event.status === "CANCELLED") {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
          Cancelled
        </span>
      );
    }
    if (isPast || event.status === "COMPLETED") {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          Completed
        </span>
      );
    }
    if (event.isSoldOut || event.status === "SOLD_OUT") {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-200 dark:border-amber-900 animate-pulse">
          Waitlist Open
        </span>
      );
    }
    if (isDeadlinePassed || event.status === "CLOSED") {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          Registration Closed
        </span>
      );
    }
    if (event.availableSpots < 20) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-400 border border-orange-200 dark:border-orange-900">
          Only {event.availableSpots} left
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
        Available
      </span>
    );
  };

  const formattedDate = format(new Date(event.eventDate), "EEE, d MMM yyyy • h:mm a");

  return (
    <div className="group flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
      {/* Banner Image */}
      <div className="relative h-48 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <img
          src={
            event.imageUrl ||
            "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80"
          }
          alt={event.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 backdrop-blur-md shadow-sm">
            {event.category}
          </span>
          {getStatusBadge()}
        </div>

        {/* Pricing Badge */}
        <div className="absolute bottom-3 right-3">
          <div className="px-3 py-1 rounded-xl bg-zinc-950/80 dark:bg-white/90 text-white dark:text-zinc-950 backdrop-blur-md text-sm font-bold shadow-md">
            {event.price === 0 ? "FREE" : `₹${event.price}`}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-1.5 font-medium">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
            <span>{formattedDate}</span>
          </div>

          <h3 className="text-lg font-bold text-zinc-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {event.name}
          </h3>

          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {event.shortDescription ||
              "Join fellow participants for an engaging event with competitions, keynotes, and networking."}
          </p>

          <div className="mt-3.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
            <span className="truncate">
              {event.location}, {event.city}
            </span>
          </div>
        </div>

        {/* Footer Meta & Action */}
        <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span>
              {event.participationType === "SOLO"
                ? "Solo"
                : event.participationType === "TEAM"
                  ? "Team"
                  : "Solo / Team"}
            </span>
          </div>

          <Link
            href={`/events/${event.slug || event._id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 transition-all duration-200"
          >
            <span>Details</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
