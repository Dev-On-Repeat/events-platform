"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
  Calendar,
  Ticket,
  Users,
  CreditCard,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboardPage() {
  const metrics = useQuery(api.registrations.getMetrics);
  const events = useQuery(api.events.list, { status: undefined });
  const seedEvents = useMutation(api.events.seedInitialEvents);

  const handleSeed = async () => {
    try {
      await seedEvents();
      toast.success("Initial events seeded!");
    } catch (e: any) {
      toast.error(e.message || "Seeding failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Top Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-200">
                Management Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
              Organizer & Admin Overview
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Live capacity monitoring, registration audits, and gate check-in controls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/events/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </Link>

            <Link
              href="/admin/checkin"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium shadow-sm transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Gate Scanner</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
          <Link
            href="/admin"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 text-white shadow-sm"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/events"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Events
          </Link>
          <Link
            href="/admin/registrations"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Registrations
          </Link>
          <Link
            href="/admin/checkin"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Gate Check-in
          </Link>
        </div>

        {/* High-Level Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
              <span>Total Revenue</span>
              <CreditCard className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ₹{metrics ? metrics.totalRevenue.toLocaleString() : "0"}
            </div>
            <div className="text-[11px] text-green-700 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Razorpay / Mock Verified</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
              <span>Tickets Confirmed</span>
              <Ticket className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {metrics ? metrics.totalTicketsSold : "0"}
            </div>
            <div className="text-[11px] text-gray-500">
              {metrics ? metrics.confirmedRegistrations : "0"} registrations confirmed
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
              <span>Active Events</span>
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {events ? events.length : "0"}
            </div>
            <div className="text-[11px] text-gray-500">Events published on platform</div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
              <span>Pending / In Queue</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {metrics ? metrics.pendingRegistrations : "0"}
            </div>
            <div className="text-[11px] text-amber-600 font-semibold">
              Currently held in 10-min windows
            </div>
          </div>
        </div>

        {/* Live Event Availability & Capacity Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Live Capacity & Inventory Tracker
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Atomic OCC inventory guarantees zero overselling across high-traffic bursts.
              </p>
            </div>

            {(!events || events.length === 0) && (
              <button
                onClick={handleSeed}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
              >
                <span>Seed Sample Events</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-6">Event Name</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Sold</th>
                  <th className="py-3 px-4">Reserved (In Checkout)</th>
                  <th className="py-3 px-4">Available</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events?.map((e) => (
                  <tr
                    key={e._id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-4 px-6 font-bold text-gray-900">
                      <Link
                        href={`/events/${e.slug || e._id}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {e.name}
                      </Link>
                      <div className="text-[11px] text-gray-500 font-normal">
                        {e.city} • {e.category}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold">
                      {e.price === 0 ? "FREE" : `₹${e.price}`}
                    </td>
                    <td className="py-4 px-4 font-semibold">{e.totalTickets}</td>
                    <td className="py-4 px-4 font-bold text-green-700">
                      {e.soldCount}
                    </td>
                    <td className="py-4 px-4 font-bold text-amber-600">
                      {e.reservedCount}
                    </td>
                    <td className="py-4 px-4 font-bold text-blue-600">
                      {e.availableSpots}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          e.isSoldOut
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-green-50 text-green-700 border border-green-200"
                        }`}
                      >
                        {e.isSoldOut ? "Sold Out" : e.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/events/${e.slug || e._id}`}
                        className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                      >
                        <span>View</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
