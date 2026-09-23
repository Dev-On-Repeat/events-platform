"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Ticket, Calendar, User, Mail, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { session, clearSession } = useAuth();
  const myTickets = useQuery(api.tickets.listBySession, { sessionId: session || "" });

  const handleLogout = () => {
    clearSession();
    router.push("/events");
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please register for an event to access your dashboard</p>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your tickets and registrations</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Clear Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-50">
                <Ticket className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {myTickets?.length || 0}
                </div>
                <div className="text-xs text-gray-500">Total Tickets</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-50">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {myTickets?.filter(t => t.status === "VALID").length || 0}
                </div>
                <div className="text-xs text-gray-500">Active Tickets</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gray-50">
                <User className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {myTickets?.filter(t => t.status === "USED").length || 0}
                </div>
                <div className="text-xs text-gray-500">Used Tickets</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">My Tickets</h2>
          </div>

          {!myTickets || myTickets.length === 0 ? (
            <div className="p-12 text-center">
              <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No tickets yet</h3>
              <p className="text-sm text-gray-500 mb-6">
                Register for an event to get your tickets
              </p>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
              >
                Browse Events
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myTickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className="p-6 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => router.push(`/ticket/${ticket._id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            ticket.status === "VALID"
                              ? "bg-green-50 text-green-700"
                              : ticket.status === "USED"
                              ? "bg-blue-50 text-blue-700"
                              : ticket.status === "EXPIRED"
                              ? "bg-gray-50 text-gray-600"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {ticket.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          #{ticket.ticketNumber}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">
                        {ticket.event?.name}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {ticket.event?.eventDate
                              ? new Date(ticket.event.eventDate).toLocaleDateString()
                              : "TBD"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          <span>{ticket.attendeeDetails?.fullName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {ticket.event?.price === 0 ? "FREE" : `₹${ticket.event?.price}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ticket.registration?.registrationType === "TEAM"
                          ? `${ticket.registration?.ticketQuantity} members`
                          : "Solo"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
