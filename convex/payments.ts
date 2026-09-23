import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  REGISTRATION_STATUS,
  PAYMENT_STATUS,
  TICKET_STATUS,
  QUEUE_STATUS,
} from "./constants";
import { processQueueHelper } from "./queue";

export const recordOrder = mutation({
  args: {
    registrationId: v.id("registrations"),
    eventId: v.id("events"),
    orderId: v.string(),
    provider: v.union(v.literal("razorpay"), v.literal("mock")),
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if order already recorded
    const existing = await ctx.db
      .query("payments")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .first();

    if (existing) return existing._id;

    const paymentId = await ctx.db.insert("payments", {
      registrationId: args.registrationId,
      eventId: args.eventId,
      orderId: args.orderId,
      provider: args.provider,
      amount: args.amount,
      currency: args.currency,
      status: PAYMENT_STATUS.PENDING,
    });

    await ctx.db.patch(args.registrationId, {
      paymentOrderId: args.orderId,
      paymentStatus: PAYMENT_STATUS.PENDING,
      status: REGISTRATION_STATUS.PAYMENT_PENDING,
    });

    return paymentId;
  },
});

export const confirmPaymentAndIssueTickets = mutation({
  args: {
    registrationId: v.id("registrations"),
    paymentId: v.string(),
    orderId: v.string(),
    amount: v.optional(v.number()),
    signature: v.optional(v.string()),
    provider: v.union(v.literal("razorpay"), v.literal("mock")),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    // 0. Authorization Check: Require valid server secret
    const expectedSecret = process.env.AUTH_SECRET || "internal_hackb4_secret";
    if (args.serverSecret !== expectedSecret) {
      throw new Error("Unauthorized: confirmPaymentAndIssueTickets requires valid server authorization");
    }

    const registration = await ctx.db.get(args.registrationId);
    if (!registration) throw new Error("Registration not found");

    // 1. Idempotency: If already confirmed, return existing tickets
    if (registration.status === REGISTRATION_STATUS.CONFIRMED) {
      const existingTickets = await ctx.db
        .query("tickets")
        .withIndex("by_registration", (q) =>
          q.eq("registrationId", args.registrationId)
        )
        .collect();

      return {
        success: true,
        alreadyConfirmed: true,
        ticketIds: existingTickets.map((t) => t._id),
      };
    }

    // 2. Reservation Expiration Protection (Critical Race Condition A)
    // An expired or cancelled reservation must NEVER be confirmed!
    if (
      registration.status === REGISTRATION_STATUS.EXPIRED ||
      registration.status === REGISTRATION_STATUS.CANCELLED
    ) {
      throw new Error(
        "RESERVATION_EXPIRED: The 10-minute hold window for this registration has already expired. Spot was released to waitlist. A refund will be initiated."
      );
    }

    // 3. Authoritative Amount Security Check
    if (
      args.amount !== undefined &&
      Math.round(args.amount) !== Math.round(registration.totalAmount)
    ) {
      throw new Error(
        `PAYMENT_AMOUNT_MISMATCH: Authoritative price is ₹${registration.totalAmount}, but received ₹${args.amount}`
      );
    }

    const event = await ctx.db.get(registration.eventId);
    if (!event) throw new Error("Event not found");

    // 4. Strict Concurrency & Inventory Invariant Guard:
    if (event.soldCount + registration.ticketQuantity > event.totalTickets) {
      throw new Error(
        `Critical error: Event capacity exceeded. Max: ${event.totalTickets}, Sold: ${event.soldCount}, Requested: ${registration.ticketQuantity}`
      );
    }

    const now = Date.now();

    // 5. Atomically update event counters
    const newSoldCount = event.soldCount + registration.ticketQuantity;
    const newReservedCount = Math.max(
      0,
      event.reservedCount - registration.ticketQuantity
    );

    await ctx.db.patch(event._id, {
      soldCount: newSoldCount,
      reservedCount: newReservedCount,
      status: newSoldCount >= event.totalTickets ? "SOLD_OUT" : event.status,
    });

    // 6. Update registration status
    await ctx.db.patch(args.registrationId, {
      status: REGISTRATION_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.CAPTURED,
      paymentId: args.paymentId,
      confirmedAt: now,
    });

    // 7. Update queue entry
    const queueEntry = await ctx.db
      .query("queue")
      .withIndex("by_registration", (q) =>
        q.eq("registrationId", args.registrationId)
      )
      .first();

    if (queueEntry) {
      await ctx.db.patch(queueEntry._id, {
        status: QUEUE_STATUS.PURCHASED,
      });
    }

    // 8. Update or record payment entry
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .first();

    if (payment) {
      await ctx.db.patch(payment._id, {
        paymentId: args.paymentId,
        signature: args.signature,
        status: PAYMENT_STATUS.CAPTURED,
      });
    } else {
      await ctx.db.insert("payments", {
        registrationId: args.registrationId,
        eventId: event._id,
        orderId: args.orderId,
        paymentId: args.paymentId,
        signature: args.signature,
        provider: args.provider,
        amount: registration.totalAmount,
        currency: registration.currency,
        status: PAYMENT_STATUS.CAPTURED,
      });
    }

    // 9. Issue Tickets with OPAQUE QR Tokens (Zero Personal Data Inside QR Code!)
    const ticketIds = [];

    const generateSecureToken = () =>
      Math.random().toString(36).substring(2, 10) +
      Date.now().toString(36).substring(4);

    const generateTicketNumber = (index: number) => {
      const year = new Date().getFullYear();
      const rand = Math.floor(10000 + Math.random() * 90000);
      return `TKT-${year}-${rand}-${index + 1}`;
    };

    if (
      registration.registrationType === "TEAM" &&
      registration.teamDetails &&
      registration.teamDetails.members.length > 0
    ) {
      // Issue tickets for each team member
      const allAttendees = [
        {
          name: registration.primaryParticipant.fullName,
          email: registration.primaryParticipant.email,
          phone: registration.primaryParticipant.phone,
        },
        ...registration.teamDetails.members.map((m) => ({
          name: m.fullName,
          email: m.email,
          phone: m.phone || registration.primaryParticipant.phone,
        })),
      ];

      for (let i = 0; i < allAttendees.length; i++) {
        const attendee = allAttendees[i];
        const ticketNumber = generateTicketNumber(i);
        const verificationToken = generateSecureToken();

        // Opaque QR payload: Contains only ticketNumber & verificationToken. NO personal data!
        const qrPayload = JSON.stringify({
          tid: ticketNumber,
          tok: verificationToken,
        });

        const tid = await ctx.db.insert("tickets", {
          ticketNumber,
          eventId: event._id,
          registrationId: args.registrationId,
          attendeeName: attendee.name,
          attendeeEmail: attendee.email,
          attendeePhone: attendee.phone,
          ticketType: "TEAM",
          qrPayload,
          verificationToken,
          status: TICKET_STATUS.VALID,
          purchasedAt: now,
        });
        ticketIds.push(tid);
      }
    } else {
      // Solo attendee
      const ticketNumber = generateTicketNumber(0);
      const verificationToken = generateSecureToken();

      // Opaque QR payload: Contains only ticketNumber & verificationToken. NO personal data!
      const qrPayload = JSON.stringify({
        tid: ticketNumber,
        tok: verificationToken,
      });

      const tid = await ctx.db.insert("tickets", {
        ticketNumber,
        eventId: event._id,
        registrationId: args.registrationId,
        attendeeName: registration.primaryParticipant.fullName,
        attendeeEmail: registration.primaryParticipant.email,
        attendeePhone: registration.primaryParticipant.phone,
        ticketType: "SOLO",
        qrPayload,
        verificationToken,
        status: TICKET_STATUS.VALID,
        purchasedAt: now,
      });
      ticketIds.push(tid);
    }

    // 10. Advance queue for other waiting attendees
    await processQueueHelper(ctx, event._id);

    return {
      success: true,
      ticketIds,
    };
  },
});

export const getPaymentByOrderId = query({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_order_id", (q) => q.eq("orderId", orderId))
      .first();
  },
});

export const isWebhookProcessed = query({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) => {
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_event_id", (q) => q.eq("eventId", eventId))
      .first();
    return !!existing;
  },
});

export const recordWebhookProcessed = mutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    status: v.union(v.literal("SUCCESS"), v.literal("FAILED"), v.literal("IGNORED")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("webhookEvents", {
      eventId: args.eventId,
      eventType: args.eventType,
      processedAt: Date.now(),
      status: args.status,
    });
  },
});

export const listPaymentsForAdmin = query({
  args: {
    eventId: v.optional(v.id("events")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let payments = await ctx.db.query("payments").collect();

    if (args.eventId) {
      payments = payments.filter((p) => p.eventId === args.eventId);
    }
    if (args.status && args.status !== "ALL") {
      payments = payments.filter((p) => p.status === args.status);
    }

    payments.sort((a, b) => b._creationTime - a._creationTime);

    const events = await ctx.db.query("events").collect();
    const eventMap = new Map(events.map((e) => [e._id, e.name]));

    return payments.map((p) => ({
      ...p,
      eventName: eventMap.get(p.eventId) || "Event",
    }));
  },
});
