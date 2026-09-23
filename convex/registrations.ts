import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { REGISTRATION_STATUS, PAYMENT_STATUS } from "./constants";

export const create = mutation({
  args: {
    eventId: v.id("events"),
    registrationType: v.union(v.literal("SOLO"), v.literal("TEAM")),
    primaryParticipant: v.object({
      fullName: v.string(),
      email: v.string(),
      phone: v.string(),
      college: v.string(),
      course: v.optional(v.string()),
      year: v.optional(v.string()),
      cityState: v.optional(v.string()),
    }),
    teamDetails: v.optional(
      v.object({
        teamName: v.string(),
        teamSize: v.number(),
        members: v.array(
          v.object({
            fullName: v.string(),
            email: v.string(),
            phone: v.optional(v.string()),
          })
        ),
      })
    ),
    sessionId: v.string(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Idempotency Check: Return existing registration if submitted twice
    const existing = await ctx.db
      .query("registrations")
      .withIndex("by_idempotency", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey)
      )
      .first();

    if (existing) {
      return existing;
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    if (event.is_cancelled || event.status === "CANCELLED") {
      throw new Error("Cannot register for a cancelled event");
    }

    if (Date.now() > event.registrationDeadline) {
      throw new Error("Registration deadline has passed");
    }

    // Determine ticket count
    let ticketQuantity = 1;
    if (args.registrationType === "TEAM") {
      if (!args.teamDetails) {
        throw new Error("Team details are required for team registrations");
      }
      if (
        event.minTeamSize &&
        args.teamDetails.teamSize < event.minTeamSize
      ) {
        throw new Error(
          `Minimum team size for this event is ${event.minTeamSize}`
        );
      }
      if (
        event.maxTeamSize &&
        args.teamDetails.teamSize > event.maxTeamSize
      ) {
        throw new Error(
          `Maximum team size for this event is ${event.maxTeamSize}`
        );
      }
      ticketQuantity = args.teamDetails.teamSize;
    }

    const totalAmount = event.price * ticketQuantity;

    const registrationId = await ctx.db.insert("registrations", {
      eventId: args.eventId,
      registrationType: args.registrationType,
      status: REGISTRATION_STATUS.PENDING,
      primaryParticipant: args.primaryParticipant,
      teamDetails: args.teamDetails,
      ticketQuantity,
      totalAmount,
      currency: "INR",
      sessionId: args.sessionId,
      paymentStatus: PAYMENT_STATUS.CREATED,
      idempotencyKey: args.idempotencyKey,
    });

    return await ctx.db.get(registrationId);
  },
});

export const getById = query({
  args: { registrationId: v.id("registrations") },
  handler: async (ctx, { registrationId }) => {
    const registration = await ctx.db.get(registrationId);
    if (!registration) return null;

    const event = await ctx.db.get(registration.eventId);
    return {
      ...registration,
      event,
    };
  },
});

export const getBySession = query({
  args: {
    sessionId: v.string(),
    eventId: v.id("events"),
  },
  handler: async (ctx, { sessionId, eventId }) => {
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .filter((q) => q.eq(q.field("eventId"), eventId))
      .collect();

    if (registrations.length === 0) return null;

    // Return the latest one
    registrations.sort((a, b) => b._creationTime - a._creationTime);
    return registrations[0];
  },
});

export const updatePaymentOrder = mutation({
  args: {
    registrationId: v.id("registrations"),
    paymentOrderId: v.string(),
  },
  handler: async (ctx, { registrationId, paymentOrderId }) => {
    const registration = await ctx.db.get(registrationId);
    if (!registration) throw new Error("Registration not found");

    await ctx.db.patch(registrationId, {
      paymentOrderId,
      paymentStatus: PAYMENT_STATUS.PENDING,
      status: REGISTRATION_STATUS.PAYMENT_PENDING,
    });

    return { success: true };
  },
});

export const listForAdmin = query({
  args: {
    eventId: v.optional(v.id("events")),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let regs = await ctx.db.query("registrations").collect();

    if (args.eventId) {
      regs = regs.filter((r) => r.eventId === args.eventId);
    }

    if (args.status && args.status !== "ALL") {
      regs = regs.filter((r) => r.status === args.status);
    }

    if (args.search && args.search.trim() !== "") {
      const term = args.search.toLowerCase().trim();
      regs = regs.filter((r) => {
        const p = r.primaryParticipant;
        const teamName = r.teamDetails?.teamName || "";
        return (
          p.fullName.toLowerCase().includes(term) ||
          p.email.toLowerCase().includes(term) ||
          p.phone.includes(term) ||
          p.college.toLowerCase().includes(term) ||
          teamName.toLowerCase().includes(term)
        );
      });
    }

    // Sort descending by creation
    regs.sort((a, b) => b._creationTime - a._creationTime);

    // Populate event title
    const events = await ctx.db.query("events").collect();
    const eventMap = new Map(events.map((e) => [e._id, e.name]));

    return regs.map((r) => ({
      ...r,
      eventName: eventMap.get(r.eventId) || "Unknown Event",
    }));
  },
});

export const getMetrics = query({
  handler: async (ctx) => {
    const registrations = await ctx.db.query("registrations").collect();
    const confirmed = registrations.filter(
      (r) => r.status === REGISTRATION_STATUS.CONFIRMED
    );

    const totalRevenue = confirmed.reduce((acc, r) => acc + r.totalAmount, 0);
    const totalTicketsSold = confirmed.reduce(
      (acc, r) => acc + r.ticketQuantity,
      0
    );

    const pending = registrations.filter(
      (r) =>
        r.status === REGISTRATION_STATUS.HELD ||
        r.status === REGISTRATION_STATUS.PAYMENT_PENDING ||
        r.status === REGISTRATION_STATUS.PENDING
    );

    const events = await ctx.db.query("events").collect();

    return {
      totalEvents: events.length,
      totalRegistrations: registrations.length,
      confirmedRegistrations: confirmed.length,
      pendingRegistrations: pending.length,
      totalTicketsSold,
      totalRevenue,
    };
  },
});
