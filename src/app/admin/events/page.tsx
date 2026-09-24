"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cancelEventAction, updateEventAction } from "@/app/actions/admin";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import AdminShell from "@/components/admin/AdminShell";

const statusTone: Record<string, string> = {
  PUBLISHED: "border-acid text-acid",
  CLOSED: "border-bone-faint text-bone-dim",
  CANCELLED: "border-signal text-signal",
  COMPLETED: "border-bone-faint text-bone-dim",
  SOLD_OUT: "border-amberish text-amberish",
  DRAFT: "border-ink-line text-bone-faint",
};

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
    <AdminShell
      tag="— Manifest control"
      title="Events"
      accent="registry"
      active="/admin/events"
      actions={
        <Link
          href="/admin/events/new"
          className="border border-acid bg-acid px-5 py-2.5 text-[10px] uppercase tracking-[0.25em] text-ink transition-colors hover:bg-transparent hover:text-acid"
        >
          + Create event
        </Link>
      }
    >
      <div className="border border-ink-line bg-ink-soft/60">
        <div className="flex items-center justify-between border-b border-ink-line px-6 py-4">
          <h2 className="font-display text-xl uppercase tracking-wide">
            All departures
          </h2>
          <span className="text-[10px] uppercase tracking-[0.2em] text-bone-faint">
            [{events ? events.length : "··"}] records
          </span>
        </div>

        <div className="divide-y divide-ink-line">
          {events?.map((e, i) => (
            <div
              key={e._id}
              className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[11px] tabular-nums text-bone-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Link
                    href={`/events/${e.slug || e._id}`}
                    target="_blank"
                    className="font-display text-lg uppercase tracking-wide text-bone transition-colors hover:text-acid"
                  >
                    {e.name}
                  </Link>
                  <span
                    className={`border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] ${
                      statusTone[e.status] || "border-ink-line text-bone-faint"
                    }`}
                  >
                    {e.status}
                  </span>
                </div>
                <div className="mt-1.5 text-[10px] uppercase tracking-[0.15em] text-bone-faint">
                  {format(new Date(e.eventDate), "d MMM yyyy · HH:mm")} —{" "}
                  {e.location}, {e.city} — {e.soldCount}/{e.totalTickets} sold (
                  {e.availableSpots} free) — {e.price === 0 ? "FREE" : `₹${e.price}`}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => handleToggleClose(e._id, e.status)}
                  className="border border-ink-line px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-bone-dim transition-colors hover:border-bone hover:text-bone"
                >
                  {e.status === "CLOSED" ? "Reopen" : "Close reg"}
                </button>
                {e.status !== "CANCELLED" && (
                  <button
                    onClick={() => handleCancel(e._id, e.name)}
                    className="border border-ink-line px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-bone-faint transition-colors hover:border-signal hover:text-signal"
                  >
                    Cancel ×
                  </button>
                )}
              </div>
            </div>
          ))}
          {events && events.length === 0 && (
            <p className="px-6 py-12 text-center font-flourish text-xl italic text-bone-dim">
              Nothing registered yet — create the first departure.
            </p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
