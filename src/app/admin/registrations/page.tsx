"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
  Download,
  Search,
  Filter,
  FileSpreadsheet,
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

export default function AdminRegistrationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const registrations = useQuery(api.registrations.listForAdmin, {
    status: statusFilter,
    search: search || undefined,
  });

  const exportCSV = () => {
    if (!registrations || registrations.length === 0) return;

    const headers = [
      "Registration ID",
      "Event Name",
      "Attendee Name",
      "Email",
      "Phone",
      "College",
      "Type",
      "Team Name",
      "Tickets",
      "Amount (INR)",
      "Status",
      "Payment Status",
      "Created At",
    ];

    const rows = registrations.map((r) => [
      r._id,
      `"${r.eventName}"`,
      `"${r.primaryParticipant.fullName}"`,
      r.primaryParticipant.email,
      r.primaryParticipant.phone,
      `"${r.primaryParticipant.college}"`,
      r.registrationType,
      `"${r.teamDetails?.teamName || ""}"`,
      r.ticketQuantity,
      r.totalAmount,
      r.status,
      r.paymentStatus,
      format(new Date(r._creationTime), "yyyy-MM-dd HH:mm:ss"),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `hackb4_registrations_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

          <button
            onClick={exportCSV}
            disabled={!registrations || registrations.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Registrations & Attendees
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Audited list of registrations, payment state machine, and team structures.
              </p>
            </div>
            <span className="text-xs font-medium text-gray-400">
              {registrations ? `${registrations.length} records` : "Loading..."}
            </span>
          </div>

          {/* Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by name, email, phone, college, team..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {["ALL", "CONFIRMED", "HELD", "PENDING", "EXPIRED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === status
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Attendee / Leader</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">College</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Tickets</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {registrations?.map((r) => (
                  <tr
                    key={r._id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      <div>{r.primaryParticipant.fullName}</div>
                      <div className="text-[11px] text-gray-500 font-normal">
                        {r.primaryParticipant.email} • {r.primaryParticipant.phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      {r.eventName}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">
                      {r.primaryParticipant.college}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-gray-700">
                        {r.registrationType === "TEAM"
                          ? `Team: ${r.teamDetails?.teamName || "Yes"}`
                          : "Solo"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">{r.ticketQuantity}</td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {r.totalAmount === 0 ? "FREE" : `₹${r.totalAmount}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.status === "CONFIRMED"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : r.status === "HELD" || r.status === "PAYMENT_PENDING"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : r.status === "PENDING"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-400">
                      {format(new Date(r._creationTime), "MMM d, HH:mm")}
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
