"use client";

import { Id } from "@/convex/_generated/dataModel";
import {
  CalendarDays,
  MapPin,
  Ticket,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface EventCardProps {
  event: {
    _id: Id<"events">;
    name: string;
    slug: string;
    description: string;
    location: string;
    city?: string;
    eventDate: number;
    price: number;
    totalTickets: number;
    soldCount: number;
    reservedCount: number;
    availableSpots?: number;
    isSoldOut?: boolean;
    imageUrl?: string;
    participationType?: string;
    registrationDeadline?: number;
    status?: string;
    is_cancelled?: boolean;
  };
}

export default function EventCard({ event }: EventCardProps) {
  const router = useRouter();

  const now = Date.now();
  const isPastEvent = event.eventDate < now;
  const isRegistrationClosed = event.registrationDeadline ? event.registrationDeadline < now : false;
  const availableSpots = Math.max(
    0,
    event.totalTickets - (event.soldCount + event.reservedCount)
  );
  const isSoldOut = availableSpots <= 0;
  const isCancelled = event.status === "CANCELLED" || event.is_cancelled;
  const isCompleted = event.status === "COMPLETED";
  const isClosed = event.status === "CLOSED" || isRegistrationClosed;

  return (
    <div
      onClick={() => !isPastEvent && !isCompleted && !isCancelled && !isClosed && router.push(`/events/${event.slug || event._id}`)}
      className={`bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden relative flex flex-col ${
        (isPastEvent || isCompleted || isCancelled || isClosed) ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {/* Event Image */}
      {event.imageUrl && (
        <div className="relative w-full h-48 shrink-0">
          <Image
            src={event.imageUrl}
            alt={event.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      <div className={`p-6 flex-1 flex flex-col justify-between ${event.imageUrl ? "relative" : ""}`}>
        <div>
          <div className="flex justify-between items-start">
            <div className="flex-1 pr-2">
              <h2 className="text-2xl font-bold text-gray-900 leading-snug">{event.name}</h2>
              {isPastEvent && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-2">
                  Past Event
                </span>
              )}
            </div>

            {/* Price Tag */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span
                className={`px-4 py-1.5 font-semibold rounded-full text-sm ${
                  isPastEvent || isCompleted || isCancelled || isClosed
                    ? "bg-gray-50 text-gray-500"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {event.price === 0 ? "Free" : `₹${event.price.toFixed(2)}`}
              </span>
              {isSoldOut && !isPastEvent && !isCompleted && !isCancelled && !isClosed && (
                <span className="px-3 py-1 bg-red-50 text-red-700 font-semibold rounded-full text-xs">
                  Sold Out
                </span>
              )}
              {(isPastEvent || isCompleted) && (
                <span className="px-3 py-1 bg-gray-50 text-gray-600 font-semibold rounded-full text-xs">
                  Ended
                </span>
              )}
              {isCancelled && (
                <span className="px-3 py-1 bg-red-50 text-red-600 font-semibold rounded-full text-xs">
                  Cancelled
                </span>
              )}
              {isClosed && !isPastEvent && !isCompleted && !isCancelled && (
                <span className="px-3 py-1 bg-amber-50 text-amber-600 font-semibold rounded-full text-xs">
                  Registration Closed
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="flex items-center text-gray-600 text-sm">
              <MapPin className="w-4 h-4 mr-2 shrink-0 text-gray-400" />
              <span>
                {event.location}
                {event.city ? `, ${event.city}` : ""}
              </span>
            </div>

            <div className="flex items-center text-gray-600 text-sm">
              <CalendarDays className="w-4 h-4 mr-2 shrink-0 text-gray-400" />
              <span>
                {new Date(event.eventDate).toLocaleDateString()}{" "}
                {isPastEvent && "(Ended)"}
              </span>
            </div>

            <div className="flex items-center text-gray-600 text-sm">
              <Ticket className="w-4 h-4 mr-2 shrink-0 text-gray-400" />
              <span>
                {availableSpots} / {event.totalTickets} available
                {!isPastEvent && event.reservedCount > 0 && (
                  <span className="text-amber-600 text-xs ml-2 font-medium">
                    ({event.reservedCount}{" "}
                    {event.reservedCount === 1 ? "person" : "people"} checking out)
                  </span>
                )}
              </span>
            </div>
          </div>

          <p className="mt-4 text-gray-600 text-sm line-clamp-2">
            {event.description}
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className={`font-semibold ${
            (isPastEvent || isCompleted || isCancelled || isClosed) 
              ? "text-gray-400" 
              : "text-blue-600 hover:text-blue-700"
          }`}>
            {isPastEvent || isCompleted 
              ? "Event Ended" 
              : isCancelled 
              ? "Event Cancelled" 
              : isClosed 
              ? "Registration Closed" 
              : "View Details & Tickets →"}
          </span>
          {event.participationType && (
            <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-medium">
              {event.participationType}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
