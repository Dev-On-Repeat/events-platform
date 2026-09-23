"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Users,
  User,
  Mail,
  Phone,
  GraduationCap,
  Building2,
  MapPin,
  Plus,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500">Loading registration form...</p>
        </div>
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900">
          Event Not Found
        </h2>
        <Link href="/events" className="mt-4 text-xs font-semibold text-blue-600 hover:underline">
          Back to Events
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

  // Prevent registration for past, sold out, cancelled, or completed events
  if (isPastEvent || isRegistrationClosed || isSoldOut || isCancelled || isCompleted) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900">
          {isPastEvent || isCompleted ? "Event Has Ended" : isSoldOut ? "Sold Out" : isCancelled ? "Event Cancelled" : "Registration Closed"}
        </h2>
        <p className="text-sm text-gray-600 mt-2 max-w-md">
          {isPastEvent || isCompleted 
            ? "This event has already concluded. Ticket sales are closed."
            : isSoldOut 
            ? "All tickets for this event have been sold out."
            : isCancelled 
            ? "This event has been cancelled by the organizers."
            : "Registration for this event has closed."}
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Please wait, we will notify you when tickets are live for upcoming events.
        </p>
        <Link href="/events" className="mt-6 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition">
          Browse Other Events
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

  return (
    <div className="min-h-screen bg-gray-50/50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href={`/events/${event.slug || event._id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Event</span>
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
                Guest Registration
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {event.name}
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Zero friction booking. Your digital pass and QR code will be generated immediately.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-right shrink-0">
              <div className="text-[10px] uppercase font-bold text-gray-400">
                Ticket Price
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {event.price === 0 ? "FREE" : `₹${event.price}`}
              </div>
              <div className="text-[10px] text-gray-500">per participant</div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Participation Mode Selection (always show) */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Select Participation Type
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setValue("registrationType", "SOLO")}
              className={`p-4 rounded-xl border text-left flex items-center gap-3.5 transition-all ${
                selectedType === "SOLO"
                  ? "border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              }`}
            >
              <div className="p-2 rounded-lg bg-white shadow-sm border border-gray-100">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-semibold">Individual / Solo</div>
                <div className="text-xs text-gray-500">1 Person</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setValue("registrationType", "TEAM")}
              className={`p-4 rounded-xl border text-left flex items-center gap-3.5 transition-all ${
                selectedType === "TEAM"
                  ? "border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              }`}
            >
              <div className="p-2 rounded-lg bg-white shadow-sm border border-gray-100">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-semibold">Group / Team</div>
                <div className="text-xs text-gray-500">
                  {event.minTeamSize || 2} - {event.maxTeamSize || 5} members
                </div>
              </div>
            </button>
          </div>
        </div>

          {/* Primary Participant Information */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedType === "TEAM"
                    ? "Team Leader / Primary Contact"
                    : "Attendee Information"}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Your digital passes and payment receipt will be sent to this email.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    {...register("fullName")}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="alex@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Phone Number (WhatsApp) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    {...register("phone")}
                    placeholder="+91 9876543210"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                {errors.phone && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  College / Organization *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    {...register("college")}
                    placeholder="e.g. National Institute of Tech"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                {errors.college && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.college.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Course / Major (Optional)
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    {...register("course")}
                    placeholder="B.Tech Computer Science"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  City & State (Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    {...register("cityState")}
                    placeholder="Bengaluru, Karnataka"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Team Members Section (if TEAM) */}
          {selectedType === "TEAM" && (
            <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Team Configuration
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Team size: {event.minTeamSize || 2} to{" "}
                  {event.maxTeamSize || 5} members (including team leader).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Team Name *
                </label>
                <input
                  {...register("teamName")}
                  placeholder="e.g. ByteForce Innovators"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Team Leader Display */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="text-xs font-bold text-blue-800 mb-2">
                  Team Member 1 (Team Leader)
                </div>
                <div className="text-sm text-gray-700">
                  {watch("fullName")} ({watch("email")})
                </div>
              </div>

              {/* Dynamic Members List */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-gray-700">
                    Additional Team Members ({fields.length} added)
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      append({ fullName: "", email: "", phone: "" })
                    }
                    disabled={
                      event.maxTeamSize
                        ? fields.length + 1 >= event.maxTeamSize
                        : false
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Member</span>
                  </button>
                </div>

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 rounded-xl bg-gray-50/50 border border-gray-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">
                        Team Member {index + 2}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <input
                          {...register(`teamMembers.${index}.fullName` as const)}
                          placeholder="Member Name"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <input
                          {...register(`teamMembers.${index}.email` as const)}
                          type="email"
                          placeholder="Member Email"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <input
                          {...register(`teamMembers.${index}.phone` as const)}
                          placeholder="Phone (Optional)"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing & Submit Summary */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-4">
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-sm font-bold text-gray-900">Registration Summary</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Participation Type:</span>
                <span className="font-semibold text-gray-900">
                  {selectedType === "TEAM" ? "Group/Team" : "Individual/Solo"}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Participants:</span>
                <span className="font-semibold text-gray-900">
                  {selectedType === "TEAM" ? `${1 + fields.length} members` : "1 person"}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Price per Person:</span>
                <span className="font-semibold text-gray-900">
                  {event.price === 0 ? "FREE" : `₹${event.price}`}
                </span>
              </div>
              
              <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Total Amount:</span>
                <span className="text-2xl font-bold text-gray-900">
                  {totalCalculated === 0 ? "FREE" : `₹${totalCalculated}`}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Securing Reservation...</span>
                </>
              ) : (
                <>
                  <span>Continue to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
