import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let events = await ctx.db.query("events").collect();

    if (args.status) {
      events = events.filter((e) => e.status === args.status);
    } else {
      // Default: show published, sold out, or closed events
      events = events.filter((e) => e.status !== "DRAFT");
    }

    if (args.category && args.category !== "All") {
      events = events.filter(
        (e) => e.category.toLowerCase() === args.category!.toLowerCase()
      );
    }

    if (args.search && args.search.trim() !== "") {
      const term = args.search.toLowerCase().trim();
      events = events.filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          e.location.toLowerCase().includes(term) ||
          e.city.toLowerCase().includes(term) ||
          e.description.toLowerCase().includes(term)
      );
    }

    // Sort by eventDate ascending
    events.sort((a, b) => a.eventDate - b.eventDate);

    // Attach computed availability
    return events.map((event) => {
      const availableSpots = Math.max(
        0,
        event.totalTickets - (event.soldCount + event.reservedCount)
      );
      return {
        ...event,
        availableSpots,
        isSoldOut: availableSpots <= 0,
      };
    });
  },
});

export const getById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event) return null;

    const availableSpots = Math.max(
      0,
      event.totalTickets - (event.soldCount + event.reservedCount)
    );

    return {
      ...event,
      availableSpots,
      isSoldOut: availableSpots <= 0,
    };
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!event) return null;

    const availableSpots = Math.max(
      0,
      event.totalTickets - (event.soldCount + event.reservedCount)
    );

    return {
      ...event,
      availableSpots,
      isSoldOut: availableSpots <= 0,
    };
  },
});

export const getAvailability = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

    const availableSpots = Math.max(
      0,
      event.totalTickets - (event.soldCount + event.reservedCount)
    );

    return {
      eventId: event._id,
      name: event.name,
      totalTickets: event.totalTickets,
      soldCount: event.soldCount,
      reservedCount: event.reservedCount,
      availableSpots,
      isSoldOut: availableSpots <= 0,
      status: event.status,
      registrationDeadline: event.registrationDeadline,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    shortDescription: v.optional(v.string()),
    category: v.string(),
    location: v.string(),
    city: v.string(),
    state: v.optional(v.string()),
    eventDate: v.number(),
    endDate: v.optional(v.number()),
    registrationDeadline: v.number(),
    price: v.number(),
    totalTickets: v.number(),
    participationType: v.union(v.literal("SOLO"), v.literal("TEAM"), v.literal("BOTH")),
    minTeamSize: v.optional(v.number()),
    maxTeamSize: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
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
    adminSecret: v.string(),
  },
  handler: async (ctx, args) => {
    // Authorization Check: Require valid admin secret
    const expectedSecret = process.env.AUTH_SECRET || "internal_hackb4_secret";
    if (args.adminSecret !== expectedSecret) {
      throw new Error("Unauthorized: Admin authorization required to create events.");
    }

    // Ensure slug uniqueness
    const existing = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error(`Event with slug '${args.slug}' already exists.`);
    }

    const { adminSecret, ...eventData } = args;

    const eventId = await ctx.db.insert("events", {
      ...eventData,
      reservedCount: 0,
      soldCount: 0,
      status: "PUBLISHED",
      is_cancelled: false,
    });

    return eventId;
  },
});

export const update = mutation({
  args: {
    eventId: v.id("events"),
    adminSecret: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    shortDescription: v.optional(v.string()),
    category: v.optional(v.string()),
    location: v.optional(v.string()),
    city: v.optional(v.string()),
    eventDate: v.optional(v.number()),
    registrationDeadline: v.optional(v.number()),
    price: v.optional(v.number()),
    totalTickets: v.optional(v.number()),
    participationType: v.optional(v.union(v.literal("SOLO"), v.literal("TEAM"), v.literal("BOTH"))),
    minTeamSize: v.optional(v.number()),
    maxTeamSize: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("DRAFT"),
        v.literal("PUBLISHED"),
        v.literal("CLOSED"),
        v.literal("SOLD_OUT"),
        v.literal("COMPLETED"),
        v.literal("CANCELLED")
      )
    ),
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.AUTH_SECRET || "internal_hackb4_secret";
    if (args.adminSecret !== expectedSecret) {
      throw new Error("Unauthorized: Admin authorization required to update events.");
    }

    const { eventId, adminSecret, ...updates } = args;
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

    if (
      updates.totalTickets !== undefined &&
      updates.totalTickets < event.soldCount + event.reservedCount
    ) {
      throw new Error(
        `Cannot reduce capacity below currently committed tickets (${event.soldCount} sold + ${event.reservedCount} reserved).`
      );
    }

    await ctx.db.patch(eventId, updates);
    return eventId;
  },
});

export const cancel = mutation({
  args: {
    eventId: v.id("events"),
    adminSecret: v.string(),
  },
  handler: async (ctx, { eventId, adminSecret }) => {
    const expectedSecret = process.env.AUTH_SECRET || "internal_hackb4_secret";
    if (adminSecret !== expectedSecret) {
      throw new Error("Unauthorized: Admin authorization required to cancel events.");
    }

    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

    await ctx.db.patch(eventId, {
      status: "CANCELLED",
      is_cancelled: true,
    });

    return { success: true };
  },
});

export const seedInitialEvents = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("events").first();
    if (existing) {
      return { message: "Events already seeded." };
    }

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const sampleEvents = [
      {
        name: "National HackSphere 2026",
        slug: "hacksphere-2026",
        description:
          "The premier 36-hour inter-collegiate hackathon bringing together 1,500+ builders, creators, and engineers to solve real-world problems with AI, Cloud, and Systems Engineering.",
        shortDescription: "36-Hour flagship national hackathon with ₹5,00,000 in prizes.",
        category: "Hackathon",
        location: "Auditorium Complex & Innovation Labs, Tech Campus",
        city: "Bengaluru",
        state: "Karnataka",
        eventDate: now + 14 * day,
        endDate: now + 16 * day,
        registrationDeadline: now + 10 * day,
        price: 499,
        totalTickets: 250,
        reservedCount: 0,
        soldCount: 0,
        participationType: "BOTH" as const,
        minTeamSize: 2,
        maxTeamSize: 5,
        imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
        status: "PUBLISHED" as const,
        rules: [
          "All code must be written during the 36-hour hackathon window.",
          "Pre-existing APIs and open-source libraries are permitted with declaration.",
          "Every team must submit a GitHub repo and functional demo video.",
        ],
        prizes: [
          "1st Place: ₹2,50,000 + Cloud Credits",
          "2nd Place: ₹1,50,000 + Hardware Kits",
          "3rd Place: ₹1,00,000 + Mentorship",
        ],
        schedule: "Day 1: 09:00 AM Check-in & Keynote | 11:00 AM Hacking Starts | Day 2: 05:00 PM Demos & Awards",
        faqs: [
          { question: "Is food and lodging provided?", answer: "Yes, high-speed Wi-Fi, 6 meals, snacks, and resting pods are provided." },
          { question: "Can I participate solo?", answer: "Yes, you can register solo or join as a team of 2-4 members." },
        ],
        organizerName: "TechSphere Society",
        organizerEmail: "organizer@hacksphere.org",
        is_cancelled: false,
      },
      {
        name: "Pulse 2026: Annual Cultural Carnival",
        slug: "pulse-carnival-2026",
        description:
          "Experience music, live indie bands, street dances, culinary stalls, and star-studded DJ nights over two electrifying evenings.",
        shortDescription: "2 days of music, arts, food, and celebrity performances.",
        category: "Cultural",
        location: "Grand Open Grounds, Sector 4",
        city: "Mumbai",
        state: "Maharashtra",
        eventDate: now + 21 * day,
        endDate: now + 22 * day,
        registrationDeadline: now + 18 * day,
        price: 299,
        totalTickets: 500,
        reservedCount: 0,
        soldCount: 0,
        participationType: "SOLO" as const,
        imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
        status: "PUBLISHED" as const,
        rules: [
          "Valid ID card along with digital QR ticket required for entry.",
          "Gates close at 08:30 PM.",
        ],
        prizes: ["Trophies and cash prizes for dance and band battle winners"],
        schedule: "Day 1: 04:00 PM Gates Open | Day 2: 06:00 PM Headline DJ Set",
        faqs: [
          { question: "Can I transfer my ticket?", answer: "Tickets are non-transferable and mapped to the registered attendee." },
        ],
        organizerName: "Cultural Affairs Council",
        organizerEmail: "pulse@culturafest.in",
        is_cancelled: false,
      },
      {
        name: "RoboWars: Steel Arena Championship",
        slug: "robowars-steel-arena",
        description:
          "High-octane 30kg combat robotics tournament. Watch custom bots battle inside a bulletproof polycarbonate arena.",
        shortDescription: "30kg Combat Robotics tournament with fierce collisions.",
        category: "Robotics",
        location: "Mechanical Arena & Workshop 3",
        city: "Hyderabad",
        state: "Telangana",
        eventDate: now + 30 * day,
        endDate: now + 31 * day,
        registrationDeadline: now + 25 * day,
        price: 999,
        totalTickets: 80,
        reservedCount: 0,
        soldCount: 0,
        participationType: "TEAM" as const,
        minTeamSize: 2,
        maxTeamSize: 5,
        imageUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80",
        status: "PUBLISHED" as const,
        rules: [
          "Robot weight limit: 30kg strictly calibrated.",
          "Weapons: Spinners, wedges, lifters, and drums allowed.",
          "Remote fail-safe switch mandatory.",
        ],
        prizes: ["₹1,50,000 Champion Trophy", "₹75,000 Runner-up"],
        schedule: "Round 1 qualifiers, semifinals, and grand final.",
        faqs: [
          { question: "Are pit spaces equipped with power?", answer: "Yes, 230V AC supplies and battery charging zones are available." },
        ],
        organizerName: "Robotics Club",
        organizerEmail: "robowars@techarena.io",
        is_cancelled: false,
      },
      {
        name: "AI & Cloud Architecture Summit",
        slug: "ai-cloud-summit-2026",
        description:
          "A full-day conference featuring tech leads from top engineering companies discussing Large Language Model infrastructure, distributed databases, and high-scale systems.",
        shortDescription: "Keynotes and architecture deep-dives by industry leaders.",
        category: "Conference",
        location: "Convention Center Hall A",
        city: "New Delhi",
        state: "Delhi",
        eventDate: now + 45 * day,
        endDate: now + 45 * day,
        registrationDeadline: now + 40 * day,
        price: 0, // Free event
        totalTickets: 300,
        reservedCount: 0,
        soldCount: 0,
        participationType: "SOLO" as const,
        imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
        status: "PUBLISHED" as const,
        rules: ["Registration confirmation email/QR ticket mandatory."],
        schedule: "10:00 AM - 05:00 PM with lunch and networking session.",
        faqs: [
          { question: "Is this event free to attend?", answer: "Yes, free with prior registration, but seats are strictly capped." },
        ],
        organizerName: "Cloud Community",
        organizerEmail: "hello@cloudsummit.org",
        is_cancelled: false,
      },
    ];

    for (const event of sampleEvents) {
      await ctx.db.insert("events", event);
    }

    return { message: "Seeded 4 initial events successfully." };
  },
});
