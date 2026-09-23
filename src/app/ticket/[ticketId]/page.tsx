"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import Image from "next/image";
import QRCode from "react-qr-code";
import {
  CalendarDays,
  MapPin,
  User,
  Ticket as TicketIcon,
  ArrowLeft,
  Printer,
  IdCard,
} from "lucide-react";
import Spinner from "@/components/Spinner";

export default function TicketPassPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);

  // Query as ticket ID
  const directTicket = useQuery(api.tickets.getById, {
    ticketId: ticketId as Id<"tickets">,
  });

  // Query as registration ID (fallback)
  const registrationTickets = useQuery(api.tickets.getByRegistrationId, {
    registrationId: ticketId as Id<"registrations">,
  });

  const tickets = directTicket ? [directTicket] : registrationTickets || [];

  if (directTicket === undefined && registrationTickets === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <TicketIcon className="w-12 h-12 text-gray-400 mb-3" />
        <h2 className="text-xl font-bold text-gray-900">
          Ticket Pass Not Found
        </h2>
        <p className="text-xs text-gray-500 mt-2">
          Unable to locate a confirmed ticket with identifier &apos;{ticketId}&apos;.
        </p>
        <Link
          href="/events"
          className="mt-6 text-xs font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Back to Events
        </Link>
      </div>
    );
  }

  // Check if any ticket is expired
  const expiredTickets = tickets.filter(t => t.status === "EXPIRED");
  if (expiredTickets.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <TicketIcon className="w-12 h-12 text-gray-400 mb-3" />
        <h2 className="text-xl font-bold text-gray-900">
          Ticket Has Expired
        </h2>
        <p className="text-sm text-gray-600 mt-2 max-w-md">
          This ticket has expired because the event has already concluded.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Please wait, we will notify you when tickets are live for upcoming events.
        </p>
        <Link
          href="/events"
          className="mt-6 text-xs font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Browse Other Events
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Print Actions */}
        <div className="flex items-center justify-between no-print">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Events</span>
          </Link>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            <span>Print Ticket Pass</span>
          </button>
        </div>

        {/* Tickets Cards */}
        {tickets.map((ticket, index) => {
          const event = ticket.event;
          return (
            <div
              key={ticket._id}
              className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-200"
            >
              {/* Event Header Banner */}
              <div className="relative">
                {event?.imageUrl && (
                  <div className="relative w-full aspect-[21/9]">
                    <Image
                      src={event.imageUrl}
                      alt={event.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 80vw"
                      className="object-cover object-center"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80" />
                  </div>
                )}
                <div
                  className={`px-6 py-4 ${
                    event?.imageUrl
                      ? "absolute bottom-0 left-0 right-0"
                      : "bg-blue-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase font-bold tracking-wider text-blue-200">
                        Official Entry Pass {tickets.length > 1 ? `(#${index + 1})` : ""}
                      </span>
                      <h2 className="text-2xl font-bold text-white mt-0.5">
                        {event?.name || "Confirmed Event Pass"}
                      </h2>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        ticket.status === "VALID"
                          ? "bg-green-500/20 text-green-300 border border-green-400/40"
                          : "bg-gray-500/20 text-gray-300"
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ticket Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Details */}
                  <div className="space-y-4">
                    <div className="flex items-center text-gray-600">
                      <CalendarDays className="w-5 h-5 mr-3 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Date & Time</p>
                        <p className="font-semibold text-gray-900 text-sm">
                          {event?.eventDate
                            ? new Date(event.eventDate).toLocaleDateString()
                            : "Confirmed"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-5 h-5 mr-3 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Location</p>
                        <p className="font-semibold text-gray-900 text-sm">
                          {event?.location}
                          {event?.city ? `, ${event.city}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <User className="w-5 h-5 mr-3 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Ticket Holder</p>
                        <p className="font-semibold text-gray-900 text-sm">
                          {ticket.attendeeName}
                        </p>
                        <p className="text-xs text-gray-500">{ticket.attendeeEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center text-gray-600 break-all">
                      <IdCard className="w-5 h-5 mr-3 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Ticket Number</p>
                        <p className="font-mono font-bold text-gray-900 text-sm">
                          {ticket.ticketNumber}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - QR Code */}
                  <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <QRCode
                        value={ticket.qrPayload}
                        size={170}
                        level="H"
                        className="w-full h-auto"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-3 text-center font-medium">
                      Scan at gate for entry
                    </p>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Issued by HackB4 Ticketing System</span>
                  <span>Registered: {new Date(ticket.purchasedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
