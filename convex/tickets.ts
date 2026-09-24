import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { TICKET_STATUS } from "./constants";

export const getById = query({
  args: { ticketId: v.string() },
  handler: async (ctx, { ticketId }) => {
    const normalized = ctx.db.normalizeId("tickets", ticketId);
    if (!normalized) return null;

    const ticket = await ctx.db.get(normalized);
    if (!ticket) return null;

    const event = await ctx.db.get(ticket.eventId);
    const registration = await ctx.db.get(ticket.registrationId);

    return {
      ...ticket,
      event,
      registration,
    };
  },
});

export const getByRegistrationId = query({
  args: { registrationId: v.string() },
  handler: async (ctx, { registrationId }) => {
    const normalized = ctx.db.normalizeId("registrations", registrationId);
    if (!normalized) return [];

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_registration", (q) =>
        q.eq("registrationId", normalized)
      )
      .collect();

    const registration = await ctx.db.get(normalized);
    let event = null;
    if (registration) {
      event = await ctx.db.get(registration.eventId);
    }

    return tickets.map((t) => ({
      ...t,
      event,
      registration,
    }));
  },
});

export const listBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    // Get all registrations for this session
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    // Get all tickets for these registrations
    const tickets = [];
    for (const registration of registrations) {
      const registrationTickets = await ctx.db
        .query("tickets")
        .withIndex("by_registration", (q) =>
          q.eq("registrationId", registration._id)
        )
        .collect();

      const event = await ctx.db.get(registration.eventId);

      for (const ticket of registrationTickets) {
        tickets.push({
          ...ticket,
          event,
          registration,
        });
      }
    }

    // Sort by purchase date (newest first)
    return tickets.sort((a, b) => {
      const aDate = a.purchasedAt || 0;
      const bDate = b.purchasedAt || 0;
      return bDate - aDate;
    });
  },
});

export const checkIn = mutation({
  args: {
    ticketNumber: v.string(),
    token: v.optional(v.string()),
    checkedInBy: v.optional(v.string()),
    adminSecret: v.string(),
  },
  handler: async (ctx, { ticketNumber, token, checkedInBy, adminSecret }) => {
    const expectedSecret = process.env.AUTH_SECRET || "internal_hackb4_secret";
    if (adminSecret !== expectedSecret) {
      throw new Error("Unauthorized: Admin gate authorization required to check-in tickets.");
    }

    const ticket = await ctx.db
      .query("tickets")
      .withIndex("by_ticket_number", (q) => q.eq("ticketNumber", ticketNumber))
      .first();

    if (!ticket) {
      return { ok: false, message: "Ticket not found." };
    }

    if (token && ticket.verificationToken !== token) {
      return { ok: false, message: "Invalid verification token. Fraud detected." };
    }

    if (ticket.status === TICKET_STATUS.USED) {
      return {
        ok: false,
        message: `Ticket already scanned on ${new Date(ticket.checkedInAt!).toLocaleString()}`,
        checkedInAt: ticket.checkedInAt,
        alreadyUsed: true,
      };
    }

    if (ticket.status === TICKET_STATUS.CANCELLED || ticket.status === TICKET_STATUS.REFUNDED) {
      return {
        ok: false,
        message: `This ticket has been ${ticket.status.toLowerCase()} and is not valid.`,
      };
    }

    const now = Date.now();
    await ctx.db.patch(ticket._id, {
      status: TICKET_STATUS.USED,
      checkedInAt: now,
      checkedInBy: checkedInBy || "Event Gate Staff",
    });

    const event = await ctx.db.get(ticket.eventId);

    return {
      ok: true,
      message: `Check-in successful! Welcome, ${ticket.attendeeName}!`,
      ticket: {
        ...ticket,
        status: TICKET_STATUS.USED,
        checkedInAt: now,
        eventName: event?.name,
      },
    };
  },
});

export const listForAdmin = query({
  args: {
    eventId: v.optional(v.id("events")),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let tickets = await ctx.db.query("tickets").collect();

    if (args.eventId) {
      tickets = tickets.filter((t) => t.eventId === args.eventId);
    }

    if (args.status && args.status !== "ALL") {
      tickets = tickets.filter((t) => t.status === args.status);
    }

    if (args.search && args.search.trim() !== "") {
      const term = args.search.toLowerCase().trim();
      tickets = tickets.filter(
        (t) =>
          t.ticketNumber.toLowerCase().includes(term) ||
          t.attendeeName.toLowerCase().includes(term) ||
          t.attendeeEmail.toLowerCase().includes(term) ||
          t.attendeePhone.includes(term)
      );
    }

    tickets.sort((a, b) => b._creationTime - a._creationTime);

    const events = await ctx.db.query("events").collect();
    const eventMap = new Map(events.map((e) => [e._id, e.name]));

    return tickets.map((t) => ({
      ...t,
      eventName: eventMap.get(t.eventId) || "Event",
    }));
  },
});
