import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { DURATIONS, QUEUE_STATUS, REGISTRATION_STATUS } from "./constants";
import { rateLimiter } from "./rateLimiter";
import { ConvexError } from "convex/values";

export const joinQueueOrReserve = mutation({
  args: {
    eventId: v.id("events"),
    sessionId: v.string(),
    ticketQuantity: v.number(),
    registrationId: v.id("registrations"),
  },
  handler: async (ctx, { eventId, sessionId, ticketQuantity, registrationId }) => {
    // 1. Rate limiting by sessionId
    try {
      const rateLimitStatus = await rateLimiter.limit(ctx, "queueJoin", {
        key: sessionId,
      });
      if (!rateLimitStatus.ok) {
        throw new ConvexError("Too many queue attempts. Please wait a moment before trying again.");
      }
    } catch (e: any) {
      // If rate limiter component is initializing, allow proceeding
      if (e instanceof ConvexError) throw e;
    }

    const event = await ctx.db.get(eventId);
    if (!event || event.is_cancelled || event.status === "CANCELLED") {
      throw new Error("This event is cancelled or no longer available.");
    }

    if (Date.now() > event.registrationDeadline) {
      throw new Error("Registration for this event has closed.");
    }

    // 2. Check for existing active queue entry for this session and event
    const existingQueue = await ctx.db
      .query("queue")
      .withIndex("by_session_event", (q) =>
        q.eq("sessionId", sessionId).eq("eventId", eventId)
      )
      .first();

    const now = Date.now();

    if (existingQueue) {
      // If already offered and still active, return current offer
      if (
        existingQueue.status === QUEUE_STATUS.OFFERED &&
        existingQueue.offerExpiresAt &&
        existingQueue.offerExpiresAt > now
      ) {
        return {
          status: QUEUE_STATUS.OFFERED,
          queueId: existingQueue._id,
          offerExpiresAt: existingQueue.offerExpiresAt,
          registrationId: existingQueue.registrationId,
        };
      }

      // If waiting, return waiting position
      if (existingQueue.status === QUEUE_STATUS.WAITING) {
        const waitingList = await ctx.db
          .query("queue")
          .withIndex("by_event_status", (q) =>
            q.eq("eventId", eventId).eq("status", QUEUE_STATUS.WAITING)
          )
          .collect();

        const peopleAhead = waitingList.filter(
          (q) => q._creationTime < existingQueue._creationTime
        ).length;

        return {
          status: QUEUE_STATUS.WAITING,
          queueId: existingQueue._id,
          position: peopleAhead + 1,
          registrationId: existingQueue.registrationId,
        };
      }
    }

    // 3. Concurrency-safe atomic availability calculation
    const availableSpots = Math.max(
      0,
      event.totalTickets - (event.soldCount + event.reservedCount)
    );

    if (availableSpots >= ticketQuantity) {
      // IMMEDIATE OFFER: Spot is available, reserve atomically!
      const offerExpiresAt = now + DURATIONS.TICKET_OFFER;

      // Update event reservedCount atomically
      await ctx.db.patch(eventId, {
        reservedCount: event.reservedCount + ticketQuantity,
      });

      // Update registration status to HELD
      await ctx.db.patch(registrationId, {
        status: REGISTRATION_STATUS.HELD,
        offerExpiresAt,
      });

      // Create or update queue record
      let queueId;
      if (existingQueue) {
        await ctx.db.patch(existingQueue._id, {
          status: QUEUE_STATUS.OFFERED,
          ticketCount: ticketQuantity,
          registrationId,
          offerExpiresAt,
          lastHeartbeat: now,
        });
        queueId = existingQueue._id;
      } else {
        queueId = await ctx.db.insert("queue", {
          eventId,
          sessionId,
          registrationId,
          ticketCount: ticketQuantity,
          status: QUEUE_STATUS.OFFERED,
          offerExpiresAt,
          joinedAt: now,
          lastHeartbeat: now,
        });
      }

      // Schedule auto-expiration
      await ctx.scheduler.runAfter(
        DURATIONS.TICKET_OFFER,
        internal.queue.expireOffer,
        {
          queueId,
          registrationId,
          eventId,
        }
      );

      return {
        status: QUEUE_STATUS.OFFERED,
        queueId,
        offerExpiresAt,
        registrationId,
      };
    } else {
      // CAPACITY EXCEEDED: Place into WAITING queue
      let queueId;
      if (existingQueue) {
        await ctx.db.patch(existingQueue._id, {
          status: QUEUE_STATUS.WAITING,
          ticketCount: ticketQuantity,
          registrationId,
          offerExpiresAt: undefined,
          lastHeartbeat: now,
        });
        queueId = existingQueue._id;
      } else {
        queueId = await ctx.db.insert("queue", {
          eventId,
          sessionId,
          registrationId,
          ticketCount: ticketQuantity,
          status: QUEUE_STATUS.WAITING,
          joinedAt: now,
          lastHeartbeat: now,
        });
      }

      // Update registration to PENDING
      await ctx.db.patch(registrationId, {
        status: REGISTRATION_STATUS.PENDING,
      });

      // Calculate position
      const waitingList = await ctx.db
        .query("queue")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", eventId).eq("status", QUEUE_STATUS.WAITING)
        )
        .collect();

      const peopleAhead = waitingList.filter(
        (q) => q._creationTime < now
      ).length;

      return {
        status: QUEUE_STATUS.WAITING,
        queueId,
        position: peopleAhead + 1,
        registrationId,
      };
    }
  },
});

export const getQueueStatus = query({
  args: {
    eventId: v.id("events"),
    sessionId: v.string(),
  },
  handler: async (ctx, { eventId, sessionId }) => {
    const queueEntry = await ctx.db
      .query("queue")
      .withIndex("by_session_event", (q) =>
        q.eq("sessionId", sessionId).eq("eventId", eventId)
      )
      .first();

    if (!queueEntry) return null;

    const now = Date.now();

    if (queueEntry.status === QUEUE_STATUS.OFFERED) {
      const isExpired = queueEntry.offerExpiresAt
        ? now > queueEntry.offerExpiresAt
        : true;

      return {
        status: isExpired ? QUEUE_STATUS.EXPIRED : QUEUE_STATUS.OFFERED,
        offerExpiresAt: queueEntry.offerExpiresAt,
        timeRemaining: queueEntry.offerExpiresAt
          ? Math.max(0, queueEntry.offerExpiresAt - now)
          : 0,
        registrationId: queueEntry.registrationId,
        ticketCount: queueEntry.ticketCount,
      };
    }

    if (queueEntry.status === QUEUE_STATUS.WAITING) {
      const waitingList = await ctx.db
        .query("queue")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", eventId).eq("status", QUEUE_STATUS.WAITING)
        )
        .collect();

      const peopleAhead = waitingList.filter(
        (q) => q._creationTime < queueEntry._creationTime
      ).length;

      return {
        status: QUEUE_STATUS.WAITING,
        position: peopleAhead + 1,
        totalInQueue: waitingList.length,
        registrationId: queueEntry.registrationId,
        ticketCount: queueEntry.ticketCount,
      };
    }

    return {
      status: queueEntry.status,
      registrationId: queueEntry.registrationId,
    };
  },
});

export const expireOffer = internalMutation({
  args: {
    queueId: v.id("queue"),
    registrationId: v.id("registrations"),
    eventId: v.id("events"),
  },
  handler: async (ctx, { queueId, registrationId, eventId }) => {
    const queueEntry = await ctx.db.get(queueId);
    const registration = await ctx.db.get(registrationId);
    const event = await ctx.db.get(eventId);

    if (!queueEntry || !registration || !event) return;

    // Only expire if still in OFFERED / HELD state
    if (
      queueEntry.status === QUEUE_STATUS.OFFERED &&
      (registration.status === REGISTRATION_STATUS.HELD ||
        registration.status === REGISTRATION_STATUS.PAYMENT_PENDING)
    ) {
      await ctx.db.patch(queueId, { status: QUEUE_STATUS.EXPIRED });
      await ctx.db.patch(registrationId, { status: REGISTRATION_STATUS.EXPIRED });

      // Release reserved tickets atomically
      const newReservedCount = Math.max(
        0,
        event.reservedCount - queueEntry.ticketCount
      );
      await ctx.db.patch(eventId, { reservedCount: newReservedCount });

      // Automatically advance queue to offer newly freed spot to next in line!
      await processQueueHelper(ctx, eventId);
    }
  },
});

export const releaseOffer = mutation({
  args: {
    eventId: v.id("events"),
    sessionId: v.string(),
  },
  handler: async (ctx, { eventId, sessionId }) => {
    const queueEntry = await ctx.db
      .query("queue")
      .withIndex("by_session_event", (q) =>
        q.eq("sessionId", sessionId).eq("eventId", eventId)
      )
      .first();

    if (!queueEntry) return { success: false };

    const event = await ctx.db.get(eventId);
    if (!event) return { success: false };

    if (queueEntry.status === QUEUE_STATUS.OFFERED) {
      await ctx.db.patch(queueEntry._id, { status: QUEUE_STATUS.EXPIRED });

      if (queueEntry.registrationId) {
        await ctx.db.patch(queueEntry.registrationId, {
          status: REGISTRATION_STATUS.CANCELLED,
        });
      }

      const newReservedCount = Math.max(
        0,
        event.reservedCount - queueEntry.ticketCount
      );
      await ctx.db.patch(eventId, { reservedCount: newReservedCount });

      // Advance queue to next waiting person
      await processQueueHelper(ctx, eventId);
    }

    return { success: true };
  },
});

export const cleanupExpiredOffers = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const allOffered = await ctx.db
      .query("queue")
      .filter((q) => q.eq(q.field("status"), QUEUE_STATUS.OFFERED))
      .collect();

    const expired = allOffered.filter(
      (entry) => entry.offerExpiresAt && entry.offerExpiresAt < now
    );

    // Group by event
    const eventGroups = new Map<string, typeof expired>();
    for (const entry of expired) {
      const list = eventGroups.get(entry.eventId) || [];
      list.push(entry);
      eventGroups.set(entry.eventId, list);
    }

    for (const [eventId, entries] of eventGroups.entries()) {
      const event: any = await ctx.db.get(eventId as any);
      if (!event) continue;

      let releasedSeats = 0;
      for (const entry of entries) {
        await ctx.db.patch(entry._id, { status: QUEUE_STATUS.EXPIRED });
        if (entry.registrationId) {
          const reg = await ctx.db.get(entry.registrationId);
          if (
            reg &&
            (reg.status === REGISTRATION_STATUS.HELD ||
              reg.status === REGISTRATION_STATUS.PAYMENT_PENDING)
          ) {
            await ctx.db.patch(entry.registrationId, {
              status: REGISTRATION_STATUS.EXPIRED,
            });
            releasedSeats += entry.ticketCount;
          }
        }
      }

      if (releasedSeats > 0) {
        const newReserved = Math.max(0, event.reservedCount - releasedSeats);
        await ctx.db.patch(event._id, { reservedCount: newReserved });
        await processQueueHelper(ctx, event._id);
      }
    }
  },
});

// Helper function to advance waiting users FIFO
export async function processQueueHelper(ctx: any, eventId: any) {
  const event = await ctx.db.get(eventId);
  if (!event || event.is_cancelled) return;

  let availableSpots = Math.max(
    0,
    event.totalTickets - (event.soldCount + event.reservedCount)
  );

  if (availableSpots <= 0) return;

  // Retrieve waiting entries sorted FIFO by creation time
  const waitingEntries = await ctx.db
    .query("queue")
    .withIndex("by_event_status", (q: any) =>
      q.eq("eventId", eventId).eq("status", QUEUE_STATUS.WAITING)
    )
    .order("asc")
    .collect();

  const now = Date.now();

  for (const entry of waitingEntries) {
    if (availableSpots <= 0) break;

    // Check if remaining available spots can accommodate this entry's tickets
    if (entry.ticketCount <= availableSpots) {
      const offerExpiresAt = now + DURATIONS.TICKET_OFFER;

      // Offer spot
      await ctx.db.patch(entry._id, {
        status: QUEUE_STATUS.OFFERED,
        offerExpiresAt,
      });

      if (entry.registrationId) {
        await ctx.db.patch(entry.registrationId, {
          status: REGISTRATION_STATUS.HELD,
          offerExpiresAt,
        });
      }

      // Update counters
      availableSpots -= entry.ticketCount;
      event.reservedCount += entry.ticketCount;

      await ctx.db.patch(eventId, {
        reservedCount: event.reservedCount,
      });

      // Schedule auto-expiration for newly promoted user
      await ctx.scheduler.runAfter(
        DURATIONS.TICKET_OFFER,
        internal.queue.expireOffer,
        {
          queueId: entry._id,
          registrationId: entry.registrationId,
          eventId,
        }
      );
    }
  }
}
