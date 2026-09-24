"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { format } from "date-fns";
import AdminShell from "@/components/admin/AdminShell";

const statusTone: Record<string, string> = {
  CONFIRMED: "border-acid text-acid",
  HELD: "border-amberish text-amberish",
  PAYMENT_PENDING: "border-amberish text-amberish",
  PENDING: "border-amberish text-amberish",
  EXPIRED: "border-signal text-signal",
  CANCELLED: "border-signal text-signal",
};

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
    <AdminShell
      tag="— Passenger manifest"
      title="Regis"
      accent="trations"
      active="/admin/registrations"
      actions={
        <button
          onClick={exportCSV}
          disabled={!registrations || registrations.length === 0}
          className="border border-ink-line px-5 py-2.5 text-[10px] uppercase tracking-[0.25em] text-bone-dim transition-colors hover:border-acid hover:text-acid disabled:opacity-40"
        >
          Export CSV
        </button>
      }
    >
      <div className="border border-ink-line bg-ink-soft/60">
        {/* filters */}
        <div className="flex flex-col gap-4 border-b border-ink-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            placeholder="SCAN NAME / EMAIL / PHONE / COLLEGE / TEAM…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-b border-ink-line bg-transparent py-2 font-terminal text-xs uppercase tracking-[0.12em] text-bone placeholder:text-bone-faint/70 focus:border-acid focus:outline-none sm:max-w-sm"
          />
          <div className="flex items-center gap-px border border-ink-line bg-ink-line">
            {["ALL", "CONFIRMED", "HELD", "PENDING", "EXPIRED"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-2 text-[9px] uppercase tracking-[0.2em] transition-colors ${
                  statusFilter === status
                    ? "bg-acid text-ink"
                    : "bg-ink text-bone-dim hover:text-bone"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink-line text-[9px] uppercase tracking-[0.25em] text-bone-faint">
                <th className="px-6 py-3 font-normal">Attendee</th>
                <th className="px-4 py-3 font-normal">Event</th>
                <th className="px-4 py-3 font-normal">College</th>
                <th className="px-4 py-3 font-normal">Type</th>
                <th className="px-4 py-3 font-normal">Tix</th>
                <th className="px-4 py-3 font-normal">Amt</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-6 py-3 font-normal">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-line">
              {registrations?.map((r) => (
                <tr key={r._id} className="transition-colors hover:bg-bone/[0.03]">
                  <td className="px-6 py-4">
                    <div className="font-bold text-bone">
                      {r.primaryParticipant.fullName}
                    </div>
                    <div className="mt-0.5 text-[10px] text-bone-faint">
                      {r.primaryParticipant.email} · {r.primaryParticipant.phone}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-bone-dim">{r.eventName}</td>
                  <td className="px-4 py-4 text-bone-faint">
                    {r.primaryParticipant.college}
                  </td>
                  <td className="px-4 py-4 text-bone-dim">
                    {r.registrationType === "TEAM"
                      ? `Team — ${r.teamDetails?.teamName || "yes"}`
                      : "Solo"}
                  </td>
                  <td className="px-4 py-4 font-bold tabular-nums text-bone">
                    {r.ticketQuantity}
                  </td>
                  <td className="px-4 py-4 font-bold tabular-nums text-bone">
                    {r.totalAmount === 0 ? "FREE" : `₹${r.totalAmount}`}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] ${
                        statusTone[r.status] || "border-ink-line text-bone-faint"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 tabular-nums text-bone-faint">
                    {format(new Date(r._creationTime), "MMM d HH:mm")}
                  </td>
                </tr>
              ))}
              {registrations && registrations.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-bone-faint">
                    No records in this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
