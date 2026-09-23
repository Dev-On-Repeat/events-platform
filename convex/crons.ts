import { cronJobs } from "convex/server";
import { internalMutation } from "./_generated/server";

const crons = cronJobs();

// Fail-safe cleanup of expired ticket reservations every 1 minute
crons.interval(
  "cleanup-expired-reservations",
  { minutes: 1 },
  "queue:cleanupExpiredOffers"
);

// Update event statuses every hour (close registration for past deadlines, mark completed events)
crons.interval(
  "update-event-statuses",
  { hours: 1 },
  "crons:updateEventStatuses"
);

// Expire tickets for past events every 6 hours
crons.interval(
  "expire-past-event-tickets",
  { hours: 6 },
  "crons:expirePastEventTickets"
);

// Update event statuses automatically
export const updateEventStatuses = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    
    // Close registration for events past their deadline
    const pastDeadlineEvents = await ctx.db
      .query("events")
      .filter((q) => q.lt(q.field("registrationDeadline"), now))
      .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
      .collect();

    for (const event of pastDeadlineEvents) {
      await ctx.db.patch(event._id, { status: "CLOSED" });
    }

    // Mark events as completed if they've ended
    const pastEvents = await ctx.db
      .query("events")
      .filter((q) => q.lt(q.field("eventDate"), now))
      .filter((q) => q.or(
        q.eq(q.field("status"), "PUBLISHED"),
        q.eq(q.field("status"), "CLOSED")
      ))
      .collect();

    for (const event of pastEvents) {
      await ctx.db.patch(event._id, { status: "COMPLETED" });
    }

    return { updatedEvents: pastDeadlineEvents.length + pastEvents.length };
  },
});

// Expire tickets for past events
export const expirePastEventTickets = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    
    // Find all completed events
    const completedEvents = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("status"), "COMPLETED"))
      .collect();

    let expiredCount = 0;

    for (const event of completedEvents) {
      // Mark all VALID tickets for this event as EXPIRED
      const tickets = await ctx.db
        .query("tickets")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .filter((q) => q.eq(q.field("status"), "VALID"))
        .collect();

      for (const ticket of tickets) {
        await ctx.db.patch(ticket._id, { status: "EXPIRED" });
        expiredCount++;
      }
    }

    return { expiredTickets: expiredCount };
  },
});

export default crons;
