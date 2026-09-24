"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  MapPin,
  Ticket,
  Users,
  ArrowLeft,
} from "lucide-react";
import Spinner from "@/components/Spinner";
import EventCard from "@/components/EventCard";

export default function EventDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  // Attempt to query by slug first
  const eventBySlug = useQuery(api.events.getBySlug, { slug });

  const event = eventBySlug;

  if (event === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Event Not Found</h2>
        <p className="text-gray-600 text-sm mt-2">
          The event you are looking for does not exist or may have been removed.
        </p>
        <Link
          href="/events"
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          Back to Events
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

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Back Link */}
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Events</span>
        </Link>

        {/* Main Event Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {event.imageUrl && (
            <div className="aspect-[21/9] relative w-full">
              <Image
                src={event.imageUrl}
                alt={event.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 80vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          )}

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
              {/* Left 2 Columns: Details */}
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                      {event.category}
                    </span>
                    {event.participationType && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        {event.participationType} Registration
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
                    {event.name}
                  </h1>
                  <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>
                </div>

                {/* 4 Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center text-gray-600 mb-1">
                      <CalendarDays className="w-4 h-4 mr-1.5 text-blue-600" />
                      <span className="text-xs font-medium">Date</span>
                    </div>
                    <p className="text-gray-900 font-semibold text-sm">
                      {new Date(event.eventDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center text-gray-600 mb-1">
                      <MapPin className="w-4 h-4 mr-1.5 text-blue-600" />
                      <span className="text-xs font-medium">Location</span>
                    </div>
                    <p className="text-gray-900 font-semibold text-sm truncate">
                      {event.city || event.location}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center text-gray-600 mb-1">
                      <Ticket className="w-4 h-4 mr-1.5 text-blue-600" />
                      <span className="text-xs font-medium">Price</span>
                    </div>
                    <p className="text-gray-900 font-semibold text-sm">
                      {event.price === 0 ? "Free" : `₹${event.price.toFixed(2)}`}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center text-gray-600 mb-1">
                      <Users className="w-4 h-4 mr-1.5 text-blue-600" />
                      <span className="text-xs font-medium">Availability</span>
                    </div>
                    <p className="text-gray-900 font-semibold text-sm">
                      {availableSpots} / {event.totalTickets}
                    </p>
                  </div>
                </div>

                {/* Rules & Prizes if available */}
                {event.rules && event.rules.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900">Rules & Regulations</h3>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600">
                      {event.rules.map((rule: string, i: number) => (
                        <li key={i}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column: Sticky Booking Card */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 space-y-6">
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-6">
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ticket Price
                      </div>
                      <div className="text-3xl font-extrabold text-gray-900 mt-1">
                        {event.price === 0 ? "Free Access" : `₹${event.price.toFixed(2)}`}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Includes entry pass, workshop kit & certificate
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 space-y-2 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Available Capacity:</span>
                        <strong className="text-gray-900">{availableSpots} tickets</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Capped:</span>
                        <span className="text-gray-900">{event.totalTickets} tickets</span>
                      </div>
                      {event.reservedCount > 0 && (
                        <div className="flex justify-between text-amber-600 font-medium">
                          <span>Active Checkouts:</span>
                          <span>{event.reservedCount} in progress</span>
                        </div>
                      )}
                    </div>

                    {!isPastEvent && !isCompleted && !isCancelled && !isRegistrationClosed ? (
                      <Link
                        href={`/register/${event._id}`}
                        className="block w-full"
                      >
                        <button
                          className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
                            isSoldOut
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {isSoldOut ? (
                            <>
                              <span>Sold Out</span>
                            </>
                          ) : (
                            <>
                              <span>Book Ticket Pass</span>
                            </>
                          )}
                        </button>
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="w-full py-3.5 px-4 rounded-xl bg-gray-100 text-gray-400 font-semibold text-sm cursor-not-allowed"
                      >
                        {isPastEvent || isCompleted ? "Event Has Ended" : isCancelled ? "Event Cancelled" : "Registration Closed"}
                      </button>
                    )}

                    <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 pt-1">
                      <span>Instant Confirmation • Secure QR Pass</span>
                    </div>
                  </div>

                  {/* Organizer info */}
                  {event.organizerName && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 text-xs text-gray-600">
                      <div className="font-semibold text-gray-900">
                        Organized by {event.organizerName}
                      </div>
                      {event.organizerEmail && (
                        <div className="text-gray-500 mt-0.5">{event.organizerEmail}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
