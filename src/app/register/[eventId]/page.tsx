"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "temp_session";
  let sessionId = localStorage.getItem("hackb4_guest_session");
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem("hackb4_guest_session", sessionId);
  }
  return sessionId;
}

const registrationSchema = z.object({
  registrationType: z.enum(["SOLO", "TEAM"]),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  college: z.string().min(2, "College/Institution is required"),
  course: z.string().optional(),
  year: z.string().optional(),
  cityState: z.string().optional(),
  teamName: z.string().optional(),
  teamMembers: z
    .array(
      z.object({
        fullName: z.string().min(2, "Member name is required"),
        email: z.string().email("Invalid member email"),
        phone: z.string().optional(),
      })
    )
    .optional(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const inputCls =
  "w-full border-b border-ink-line bg-transparent py-2.5 font-terminal text-sm text-bone placeholder:text-bone-faint/60 focus:border-acid focus:outline-none transition-colors";

const labelCls =
  "mb-1 block text-[9px] uppercase tracking-[0.3em] text-bone-faint";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 text-[10px] uppercase tracking-[0.15em] text-signal">
      ▲ {msg}
    </p>
  );
}

export default function RegisterEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const event = useQuery(api.events.getById, {
    eventId: eventId as Id<"events">,
  });

  const createRegistration = useMutation(api.registrations.create);
  const joinQueueOrReserve = useMutation(api.queue.joinQueueOrReserve);

  const defaultRegType =
    event?.participationType === "TEAM" ? "TEAM" :
    event?.participationType === "SOLO" ? "SOLO" : "SOLO";

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      registrationType: defaultRegType,
      fullName: "",
      email: "",
      phone: "",
      college: "",
      course: "",
      year: "",
      cityState: "",
      teamName: "",
      teamMembers: [],
    },
  });

  const selectedType = watch("registrationType");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "teamMembers",
  });

  useEffect(() => {
    if (event?.participationType === "TEAM") {
      setValue("registrationType", "TEAM");
    } else if (event?.participationType === "SOLO") {
      setValue("registrationType", "SOLO");
    }
  }, [event, setValue]);

  if (event === undefined) {
    return (
      <div className="grid-bg flex min-h-[70vh] items-center justify-center">
        <p className="animate-blink text-[11px] uppercase tracking-[0.4em] text-bone-faint">
          Preparing manifest<span className="text-acid">…</span>
        </p>
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="grid-bg flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <h2 className="font-display text-5xl uppercase tracking-wide">
          Lost <span className="text-outline">manifest</span>
        </h2>
        <Link
          href="/events"
          className="mt-8 border border-acid bg-acid px-8 py-3 text-[11px] uppercase tracking-[0.3em] text-ink transition-colors hover:bg-transparent hover:text-acid"
        >
          ← Departures board
        </Link>
      </div>
    );
  }

  const now = Date.now();
  const isPastEvent = event.eventDate < now;
  const isRegistrationClosed = event.registrationDeadline < now;
  const isSoldOut = event.soldCount >= event.totalTickets;
  const isCancelled = event.status === "CANCELLED" || event.is_cancelled;
  const isCompleted = event.status === "COMPLETED";

  if (isPastEvent || isRegistrationClosed || isSoldOut || isCancelled || isCompleted) {
    const reason = isPastEvent || isCompleted
      ? "This departure has already concluded."
      : isSoldOut
      ? "Every seat on this departure has been claimed."
      : isCancelled
      ? "This departure was pulled by the organizers."
      : "The gate closed for this departure.";
    return (
      <div className="grid-bg flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.35em] text-signal">
          {isPastEvent || isCompleted
            ? "Departed"
            : isSoldOut
            ? "Waitlist only"
            : isCancelled
            ? "Cancelled"
            : "Gate closed"}
        </p>
        <h2 className="mt-4 font-display text-5xl uppercase tracking-wide">
          Can&apos;t <span className="text-outline">board</span>
        </h2>
        <p className="mt-4 max-w-md font-flourish text-xl italic text-bone-dim">
          {reason}
        </p>
        <Link
          href="/events"
          className="mt-8 border border-acid bg-acid px-8 py-3 text-[11px] uppercase tracking-[0.3em] text-ink transition-colors hover:bg-transparent hover:text-acid"
        >
          Other departures
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      setIsSubmitting(true);
      const sessionId = getOrCreateSessionId();

      let teamDetails = undefined;
      let ticketQuantity = 1;

      if (data.registrationType === "TEAM") {
        if (!data.teamName || data.teamName.trim().length === 0) {
          toast.error("Please enter a team name.");
          setIsSubmitting(false);
          return;
        }

        const members = data.teamMembers || [];
        const totalTeamCount = 1 + members.length; // Leader + members

        if (event.minTeamSize && totalTeamCount < event.minTeamSize) {
          toast.error(
            `Minimum team size is ${event.minTeamSize}. Please add ${
              event.minTeamSize - totalTeamCount
            } more member(s).`
          );
          setIsSubmitting(false);
          return;
        }

        if (event.maxTeamSize && totalTeamCount > event.maxTeamSize) {
          toast.error(`Maximum team size is ${event.maxTeamSize}.`);
          setIsSubmitting(false);
          return;
        }

        ticketQuantity = totalTeamCount;
        teamDetails = {
          teamName: data.teamName,
          teamSize: totalTeamCount,
          members: members.map((m) => ({
            fullName: m.fullName,
            email: m.email,
            phone: m.phone || "",
          })),
        };
      }

      const idempotencyKey = `idemp_${sessionId}_${event._id}_${Date.now()}`;

      // 1. Create Registration
      const reg = await createRegistration({
        eventId: event._id,
        registrationType: data.registrationType,
        primaryParticipant: {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          college: data.college,
          course: data.course || undefined,
          year: data.year || undefined,
          cityState: data.cityState || undefined,
        },
        teamDetails,
        sessionId,
        idempotencyKey,
      });

      if (!reg) {
        throw new Error("Could not create registration");
      }

      // 2. Reserve Spot or Join Queue (Atomic)
      const queueResult = await joinQueueOrReserve({
        eventId: event._id,
        sessionId,
        ticketQuantity,
        registrationId: reg._id,
      });

      if (queueResult.status === "OFFERED") {
        toast.success("Spot reserved! You have 10 minutes to complete checkout.");
      } else {
        toast.info(
          `Added to waiting list. You are position #${queueResult.position} in line.`
        );
      }

      router.push(`/checkout/${reg._id}`);
    } catch (err: any) {
      console.error("Registration submission failed:", err);
      toast.error(err.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCalculated =
    event.price *
    (selectedType === "TEAM" ? 1 + (fields.length || 0) : 1);

  const teamAllowed =
    event.participationType === "TEAM" || event.participationType === "BOTH";

  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-6xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
        <Link
          href={`/events/${event.slug || event._id}`}
          className="link-sweep inline-block text-[10px] uppercase tracking-[0.3em] text-bone-faint hover:text-bone"
        >
          ← {event.name}
        </Link>

        <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_320px]">
          {/* ── form column ── */}
          <form onSubmit={handleSubmit(onSubmit)} className="order-2 lg:order-1">
            {/* participation mode */}
            <section className="border border-ink-line bg-ink-soft/60 p-6 sm:p-8">
              <h2 className="text-[10px] uppercase tracking-[0.35em] text-bone-faint">
                01 — Manifest type
              </h2>
              <div className="mt-5 grid grid-cols-2 gap-px border border-ink-line bg-ink-line">
                <button
                  type="button"
                  onClick={() => setValue("registrationType", "SOLO")}
                  className={`p-4 text-left transition-colors ${
                    selectedType === "SOLO"
                      ? "bg-acid text-ink"
                      : "bg-ink text-bone-dim hover:text-bone"
                  } ${!teamAllowed ? "cursor-not-allowed opacity-40" : ""}`}
                  disabled={!teamAllowed}
                >
                  <span className="block font-display text-xl uppercase tracking-wide">
                    Solo
                  </span>
                  <span className="mt-1 block text-[10px] uppercase tracking-[0.2em]">
                    1 person · one pass
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setValue("registrationType", "TEAM")}
                  className={`p-4 text-left transition-colors ${
                    selectedType === "TEAM"
                      ? "bg-acid text-ink"
                      : "bg-ink text-bone-dim hover:text-bone"
                  } ${!teamAllowed ? "cursor-not-allowed opacity-40" : ""}`}
                  disabled={!teamAllowed}
                >
                  <span className="block font-display text-xl uppercase tracking-wide">
                    Team
                  </span>
                  <span className="mt-1 block text-[10px] uppercase tracking-[0.2em]">
                    {event.minTeamSize || 2}–{event.maxTeamSize || 5} members
                  </span>
                </button>
              </div>
            </section>

            {/* primary participant */}
            <section className="mt-6 border border-ink-line bg-ink-soft/60 p-6 sm:p-8">
              <h2 className="text-[10px] uppercase tracking-[0.35em] text-bone-faint">
                02 — {selectedType === "TEAM" ? "Team leader" : "Passenger details"}
              </h2>
              <p className="mt-2 font-flourish text-base italic text-bone-dim">
                Passes and receipts land in this inbox.
              </p>

              <div className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2">
                <div>
                  <label htmlFor="fullName" className={labelCls}>Full name *</label>
                  <input id="fullName" {...register("fullName")} placeholder="e.g. Alex Morgan" className={inputCls} />
                  <FieldError msg={errors.fullName?.message} />
                </div>
                <div>
                  <label htmlFor="email" className={labelCls}>Email *</label>
                  <input id="email" {...register("email")} type="email" placeholder="alex@example.com" className={inputCls} />
                  <FieldError msg={errors.email?.message} />
                </div>
                <div>
                  <label htmlFor="phone" className={labelCls}>Phone / WhatsApp *</label>
                  <input id="phone" {...register("phone")} placeholder="+91 98765 43210" className={inputCls} />
                  <FieldError msg={errors.phone?.message} />
                </div>
                <div>
                  <label htmlFor="college" className={labelCls}>College / Organization *</label>
                  <input id="college" {...register("college")} placeholder="e.g. National Institute of Tech" className={inputCls} />
                  <FieldError msg={errors.college?.message} />
                </div>
                <div>
                  <label htmlFor="course" className={labelCls}>Course / Major — optional</label>
                  <input id="course" {...register("course")} placeholder="B.Tech Computer Science" className={inputCls} />
                </div>
                <div>
                  <label htmlFor="cityState" className={labelCls}>City &amp; State — optional</label>
                  <input id="cityState" {...register("cityState")} placeholder="Bengaluru, Karnataka" className={inputCls} />
                </div>
              </div>
            </section>

            {/* team members */}
            {selectedType === "TEAM" && (
              <section className="mt-6 border border-ink-line bg-ink-soft/60 p-6 sm:p-8">
                <h2 className="text-[10px] uppercase tracking-[0.35em] text-bone-faint">
                  03 — Crew configuration
                </h2>
                <p className="mt-2 font-flourish text-base italic text-bone-dim">
                  {event.minTeamSize || 2} to {event.maxTeamSize || 5} members,
                  leader included.
                </p>

                <div className="mt-8">
                  <label htmlFor="teamName" className={labelCls}>Team name *</label>
                  <input id="teamName" {...register("teamName")} placeholder="e.g. ByteForce Innovators" className={inputCls} />
                </div>

                <div className="mt-6 border border-ink-line bg-ink px-4 py-3">
                  <div className="text-[9px] uppercase tracking-[0.3em] text-acid">
                    Member 01 — leader
                  </div>
                  <div className="mt-1 font-terminal text-xs text-bone">
                    {watch("fullName") || "—"}{" "}
                    <span className="text-bone-faint">
                      ({watch("email") || "email pending"})
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-bone-dim">
                    Crew ({fields.length} added)
                  </span>
                  <button
                    type="button"
                    onClick={() => append({ fullName: "", email: "", phone: "" })}
                    disabled={
                      event.maxTeamSize
                        ? fields.length + 1 >= event.maxTeamSize
                        : false
                    }
                    className="border border-ink-line px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-bone-dim transition-colors hover:border-acid hover:text-acid disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    + Add member
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border border-ink-line bg-ink p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase tracking-[0.3em] text-bone-faint">
                          Member {String(index + 2).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-[10px] uppercase tracking-[0.2em] text-bone-faint transition-colors hover:text-signal"
                        >
                          Remove ×
                        </button>
                      </div>
                      <div className="mt-3 grid gap-4 sm:grid-cols-3">
                        <input
                          {...register(`teamMembers.${index}.fullName` as const)}
                          placeholder="Member name"
                          className={inputCls}
                        />
                        <input
                          {...register(`teamMembers.${index}.email` as const)}
                          type="email"
                          placeholder="Member email"
                          className={inputCls}
                        />
                        <input
                          {...register(`teamMembers.${index}.phone` as const)}
                          placeholder="Phone (optional)"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* summary + submit */}
            <section className="mt-6 border border-ink-line bg-ink-soft/60 p-6 sm:p-8">
              <h2 className="text-[10px] uppercase tracking-[0.35em] text-bone-faint">
                04 — Fare summary
              </h2>

              <dl className="mt-6 space-y-3 text-xs">
                <div className="flex justify-between">
                  <dt className="uppercase tracking-[0.2em] text-bone-faint">Type</dt>
                  <dd className="text-bone">{selectedType === "TEAM" ? "Team" : "Solo"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="uppercase tracking-[0.2em] text-bone-faint">Headcount</dt>
                  <dd className="text-bone">
                    {selectedType === "TEAM" ? `${1 + fields.length} members` : "1 person"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="uppercase tracking-[0.2em] text-bone-faint">Per head</dt>
                  <dd className="text-bone">{event.price === 0 ? "FREE" : `₹${event.price}`}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-ink-line pt-4">
                  <dt className="text-[10px] uppercase tracking-[0.25em] text-bone-dim">
                    Total
                  </dt>
                  <dd className="font-display text-4xl text-acid">
                    {totalCalculated === 0 ? "FREE" : `₹${totalCalculated}`}
                  </dd>
                </div>
              </dl>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-8 w-full border border-acid bg-acid py-4 text-[12px] uppercase tracking-[0.3em] text-ink transition-all duration-200 hover:bg-transparent hover:text-acid disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting ? "Securing reservation…" : "Continue to checkout →"}
              </button>
              <p className="mt-3 text-center text-[9px] uppercase tracking-[0.2em] text-bone-faint">
                Seat holds for 10 minutes at checkout
              </p>
            </section>
          </form>

          {/* ── event summary rail ── */}
          <aside className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-28 border border-ink-line bg-ink-soft/60">
              <div className="flex items-center justify-between border-b border-ink-line px-5 py-3">
                <span className="text-[9px] uppercase tracking-[0.3em] text-bone-dim">
                  Departure brief
                </span>
                <span className="text-[9px] uppercase tracking-[0.2em] text-bone-faint">
                  HackB4
                </span>
              </div>
              <div className="p-5">
                <h3 className="font-display text-2xl uppercase leading-tight tracking-wide text-bone">
                  {event.name}
                </h3>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-acid">
                  {event.category}
                </p>

                <dl className="mt-6 space-y-4 text-xs">
                  <div>
                    <dt className="text-[9px] uppercase tracking-[0.3em] text-bone-faint">
                      Boards
                    </dt>
                    <dd className="mt-1 text-bone">
                      {format(new Date(event.eventDate), "EEE d MMM · HH:mm 'IST'")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase tracking-[0.3em] text-bone-faint">
                      Gate
                    </dt>
                    <dd className="mt-1 text-bone">
                      {event.location}
                      {event.city ? `, ${event.city}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase tracking-[0.3em] text-bone-faint">
                      Fare
                    </dt>
                    <dd className="mt-1 font-display text-3xl text-bone">
                      {event.price === 0 ? "FREE" : `₹${event.price}`}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="border-t border-ink-line px-5 py-3 text-[9px] uppercase leading-relaxed tracking-[0.2em] text-bone-faint">
                Instant QR pass
                <br />
                OCC-safe seat hold
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
