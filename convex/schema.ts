import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  events: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    shortDescription: v.optional(v.string()),
    category: v.string(),
    location: v.string(),
    city: v.string(),
    state: v.optional(v.string()),
    eventDate: v.number(), // timestamp
    endDate: v.optional(v.number()),
    registrationDeadline: v.number(),
    price: v.number(), // INR in rupees (0 for free)
    totalTickets: v.number(), // Total capacity
    reservedCount: v.number(), // Currently reserved in active offer windows
    soldCount: v.number(), // Confirmed sold tickets
    participationType: v.union(v.literal("SOLO"), v.literal("TEAM"), v.literal("BOTH")),
    minTeamSize: v.optional(v.number()),
    maxTeamSize: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("DRAFT"),
      v.literal("PUBLISHED"),
      v.literal("CLOSED"),
      v.literal("SOLD_OUT"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED")
    ),
    rules: v.optional(v.array(v.string())),
    prizes: v.optional(v.array(v.string())),
    schedule: v.optional(v.string()),
    faqs: v.optional(
      v.array(
        v.object({
          question: v.string(),
          answer: v.string(),
        })
      )
    ),
    organizerName: v.optional(v.string()),
    organizerEmail: v.optional(v.string()),
    is_cancelled: v.optional(v.boolean()),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  registrations: defineTable({
    eventId: v.id("events"),
    registrationType: v.union(v.literal("SOLO"), v.literal("TEAM")),
    status: v.union(
      v.literal("PENDING"),
      v.literal("HELD"),
      v.literal("PAYMENT_PENDING"),
      v.literal("CONFIRMED"),
      v.literal("EXPIRED"),
      v.literal("CANCELLED"),
      v.literal("REFUNDED")
    ),
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
    ticketQuantity: v.number(),
    totalAmount: v.number(),
    currency: v.string(),
    sessionId: v.string(), // Guest session identifier
    offerExpiresAt: v.optional(v.number()),
    paymentOrderId: v.optional(v.string()),
    paymentId: v.optional(v.string()),
    paymentStatus: v.union(
      v.literal("CREATED"),
      v.literal("PENDING"),
      v.literal("AUTHORIZED"),
      v.literal("CAPTURED"),
      v.literal("FAILED"),
      v.literal("CANCELLED"),
      v.literal("REFUNDED")
    ),
    idempotencyKey: v.string(),
    confirmedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_status", ["status"])
    .index("by_session", ["sessionId"])
    .index("by_event_status", ["eventId", "status"])
    .index("by_order_id", ["paymentOrderId"])
    .index("by_idempotency", ["idempotencyKey"]),

  queue: defineTable({
    eventId: v.id("events"),
    sessionId: v.string(),
    registrationId: v.optional(v.id("registrations")),
    ticketCount: v.number(),
    status: v.union(
      v.literal("WAITING"),
      v.literal("OFFERED"),
      v.literal("PURCHASED"),
      v.literal("EXPIRED"),
      v.literal("ABANDONED")
    ),
    offerExpiresAt: v.optional(v.number()),
    joinedAt: v.number(),
    lastHeartbeat: v.number(),
  })
    .index("by_event_status", ["eventId", "status"])
    .index("by_session_event", ["sessionId", "eventId"])
    .index("by_session", ["sessionId"])
    .index("by_registration", ["registrationId"]),

  tickets: defineTable({
    ticketNumber: v.string(),
    eventId: v.id("events"),
    registrationId: v.id("registrations"),
    attendeeName: v.string(),
    attendeeEmail: v.string(),
    attendeePhone: v.string(),
    ticketType: v.union(v.literal("SOLO"), v.literal("TEAM")),
    qrPayload: v.string(), // Encrypted/signed payload
    verificationToken: v.string(), // Cryptographically random secure token
    status: v.union(
      v.literal("VALID"),
      v.literal("USED"),
      v.literal("CANCELLED"),
      v.literal("REFUNDED"),
      v.literal("EXPIRED")
    ),
    purchasedAt: v.number(),
    checkedInAt: v.optional(v.number()),
    checkedInBy: v.optional(v.string()),
  })
    .index("by_event", ["eventId"])
    .index("by_registration", ["registrationId"])
    .index("by_ticket_number", ["ticketNumber"])
    .index("by_token", ["verificationToken"])
    .index("by_status", ["status"]),

  payments: defineTable({
    registrationId: v.id("registrations"),
    eventId: v.id("events"),
    orderId: v.string(),
    paymentId: v.optional(v.string()),
    signature: v.optional(v.string()),
    provider: v.union(v.literal("razorpay"), v.literal("mock")),
    amount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("CREATED"),
      v.literal("PENDING"),
      v.literal("AUTHORIZED"),
      v.literal("CAPTURED"),
      v.literal("FAILED"),
      v.literal("CANCELLED"),
      v.literal("REFUNDED")
    ),
    webhookReceivedAt: v.optional(v.number()),
    rawWebhookPayload: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_registration", ["registrationId"])
    .index("by_order_id", ["orderId"])
    .index("by_payment_id", ["paymentId"])
    .index("by_event", ["eventId"]),

  webhookEvents: defineTable({
    eventId: v.string(), // unique webhook event ID or payment ID
    eventType: v.string(),
    processedAt: v.number(),
    status: v.union(v.literal("SUCCESS"), v.literal("FAILED"), v.literal("IGNORED")),
  }).index("by_event_id", ["eventId"]),
});
