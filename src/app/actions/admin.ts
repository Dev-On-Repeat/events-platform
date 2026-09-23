"use server";

import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const getAdminSecret = () => process.env.AUTH_SECRET || "internal_hackb4_secret";

export async function createEventAction(eventData: any) {
  try {
    const convex = getConvexClient();
    const adminSecret = getAdminSecret();
    const eventId = await convex.mutation(api.events.create, {
      ...eventData,
      adminSecret,
    });
    return { success: true, eventId };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create event" };
  }
}

export async function updateEventAction(args: { eventId: string; updates: any }) {
  try {
    const convex = getConvexClient();
    const adminSecret = getAdminSecret();
    await convex.mutation(api.events.update, {
      eventId: args.eventId as Id<"events">,
      ...args.updates,
      adminSecret,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update event" };
  }
}

export async function cancelEventAction(eventId: string) {
  try {
    const convex = getConvexClient();
    const adminSecret = getAdminSecret();
    await convex.mutation(api.events.cancel, {
      eventId: eventId as Id<"events">,
      adminSecret,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to cancel event" };
  }
}

export async function checkInTicketAction(args: {
  ticketNumber: string;
  token?: string;
  checkedInBy?: string;
}) {
  try {
    const convex = getConvexClient();
    const adminSecret = getAdminSecret();
    const result = await convex.mutation(api.tickets.checkIn, {
      ticketNumber: args.ticketNumber,
      token: args.token,
      checkedInBy: args.checkedInBy,
      adminSecret,
    });
    return { success: true, ...result };
  } catch (error: any) {
    return { success: false, ok: false, alreadyUsed: false, message: error.message || "Failed to check in ticket" };
  }
}
