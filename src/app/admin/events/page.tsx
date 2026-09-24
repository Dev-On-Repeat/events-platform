"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cancelEventAction, updateEventAction } from "@/app/actions/admin";
import Link from "next/link";
import {
  Plus,
  Calendar,
  Pencil,
  Trash2,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminEventsPage() {
  const events = useQuery(api.events.list, { status: undefined });

  const handleCancel = async (eventId: Id<"events">, name: string) => {
    if (confirm(`Are you sure you want to cancel '${name}'? This will freeze registrations.`)) {
      try {
        const res = await cancelEventAction(eventId);
        if (!res.success) throw new Error(res.error);
        toast.success(`Event '${name}' has been cancelled.`);
      } catch (e: any) {
        toast.error(e.message || "Failed to cancel event");
      }
    }
  };

  const handleToggleClose = async (eventId: Id<"events">, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === "CLOSED" ? "PUBLISHED" : "CLOSED";
      const res = await updateEventAction({
        eventId,
        updates: { status: nextStatus },
      });
      if (!res.success) throw new Error(res.error);
      toast.success(`Registration status updated to ${nextStatus}.`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update event");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>

          <Link
            href="/admin/events/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between pb-6 border-b border-gray-100">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Events Management
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Configure ticket pricing, set team limits, and monitor registration capacity.
              </p>
            </div>
            <span className="text-xs font-medium text-gray-400">
              {events?.length || 0} Total Events
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {events?.map((e) => (
              <div
                key={e._id}
                className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-gray-900">
                      {e.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        e.status === "PUBLISHED"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : e.status === "CLOSED"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {e.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span>
                      📅 {format(new Date(e.eventDate), "d MMM yyyy, h:mm a")}
                    </span>
                    <span>📍 {e.location}, {e.city}</span>
                    <span>
                      🎟️ {e.soldCount} / {e.totalTickets} confirmed (
                      {e.availableSpots} available)
                    </span>
                    <span>💰 {e.price === 0 ? "FREE" : `₹${e.price}`}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <Link
                    href={`/events/${e.slug || e._id}`}
                    target="_blank"
                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    title="View Public Page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => handleToggleClose(e._id, e.status)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {e.status === "CLOSED" ? "Reopen" : "Close Reg"}
                  </button>

                  {e.status !== "CANCELLED" && (
                    <button
                      onClick={() => handleCancel(e._id, e.name)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
