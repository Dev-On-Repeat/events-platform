"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { toast } from "sonner";
import AdminShell from "@/components/admin/AdminShell";

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
    <AdminShell
      tag="— Control room"
      title="Ops"
      accent="overview"
      active="/admin"
      actions={
        <>
          <Link
            href="/admin/events/new"
            className="border border-acid bg-acid px-5 py-2.5 text-[10px] uppercase tracking-[0.25em] text-ink transition-colors hover:bg-transparent hover:text-acid"
          >
            + Create event
          </Link>
          <Link
            href="/admin/checkin"
            className="border border-ink-line px-5 py-2.5 text-[10px] uppercase tracking-[0.25em] text-bone-dim transition-colors hover:border-bone hover:text-bone"
          >
            Gate scanner
          </Link>
        </>
      }
    >
      {/* metrics */}
      <div className="grid grid-cols-2 gap-px border border-ink-line bg-ink-line lg:grid-cols-4">
        {[
          {
            l: "Total revenue",
            v: metrics ? `₹${metrics.totalRevenue.toLocaleString()}` : "··",
            s: "Razorpay / mock verified",
            tone: "text-acid",
          },
          {
            l: "Tickets confirmed",
            v: metrics ? String(metrics.totalTicketsSold) : "··",
            s: metrics ? `${metrics.confirmedRegistrations} registrations` : "—",
            tone: "text-bone",
          },
          {
            l: "Active events",
            v: events ? String(events.length) : "··",
            s: "Published on platform",
            tone: "text-bone",
          },
          {
            l: "Pending / queue",
            v: metrics ? String(metrics.pendingRegistrations) : "··",
            s: "Held in 10-min windows",
            tone: "text-amberish",
          },
        ].map((m) => (
          <div key={m.l} className="bg-ink-soft px-6 py-7">
            <div className="text-[9px] uppercase tracking-[0.3em] text-bone-faint">
              {m.l}
            </div>
            <div className={`mt-3 font-display text-4xl tracking-wide ${m.tone}`}>
              {m.v}
            </div>
            <div className="mt-1.5 text-[10px] uppercase tracking-[0.15em] text-bone-faint">
              {m.s}
            </div>
          </div>
        ))}
      </div>

      {/* capacity table */}
      <div className="mt-8 border border-ink-line bg-ink-soft/60">
        <div className="flex items-center justify-between border-b border-ink-line px-6 py-4">
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide">
              Live capacity tracker
            </h2>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-bone-faint">
              Atomic OCC inventory — zero overselling under burst load
            </p>
          </div>
          {(!events || events.length === 0) && (
            <button
              onClick={handleSeed}
              className="shrink-0 border border-ink-line px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-bone-dim transition-colors hover:border-acid hover:text-acid"
            >
              Seed sample events
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink-line text-[9px] uppercase tracking-[0.25em] text-bone-faint">
                <th className="px-6 py-3 font-normal">Event</th>
                <th className="px-4 py-3 font-normal">Fare</th>
                <th className="px-4 py-3 font-normal">Cap</th>
                <th className="px-4 py-3 font-normal">Sold</th>
                <th className="px-4 py-3 font-normal">Held</th>
                <th className="px-4 py-3 font-normal">Free</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-6 py-3 text-right font-normal">·</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-line">
              {events?.map((e) => (
                <tr key={e._id} className="transition-colors hover:bg-bone/[0.03]">
                  <td className="px-6 py-4">
                    <Link
                      href={`/events/${e.slug || e._id}`}
                      className="font-display text-sm uppercase tracking-wide text-bone transition-colors hover:text-acid"
                    >
                      {e.name}
                    </Link>
                    <div className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-bone-faint">
                      {e.city} / {e.category}
                    </div>
                  </td>
                  <td className="px-4 py-4 tabular-nums text-bone-dim">
                    {e.price === 0 ? "FREE" : `₹${e.price}`}
                  </td>
                  <td className="px-4 py-4 tabular-nums text-bone-dim">
                    {e.totalTickets}
                  </td>
                  <td className="px-4 py-4 font-bold tabular-nums text-acid">
                    {e.soldCount}
                  </td>
                  <td className="px-4 py-4 font-bold tabular-nums text-amberish">
                    {e.reservedCount}
                  </td>
                  <td className="px-4 py-4 font-bold tabular-nums text-bone">
                    {e.availableSpots}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] ${
                        e.isSoldOut
                          ? "border-signal text-signal"
                          : "border-acid text-acid"
                      }`}
                    >
                      {e.isSoldOut ? "Sold out" : e.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-bone-faint">
                    <Link
                      href={`/events/${e.slug || e._id}`}
                      className="transition-colors hover:text-acid"
                      aria-label={`View ${e.name}`}
                    >
                      →
                    </Link>
                  </td>
                </tr>
              ))}
              {events && events.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-bone-faint">
                    No events yet — seed the board to begin.
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
