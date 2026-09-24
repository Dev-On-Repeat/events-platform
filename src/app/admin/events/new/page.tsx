"use client";

import { useState } from "react";
import { createEventAction } from "@/app/actions/admin";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import AdminShell from "@/components/admin/AdminShell";

const inputCls =
  "w-full border-b border-ink-line bg-transparent py-2.5 font-terminal text-sm text-bone placeholder:text-bone-faint/60 focus:border-acid focus:outline-none transition-colors";

const labelCls =
  "mb-1 block text-[9px] uppercase tracking-[0.3em] text-bone-faint";

const selectCls =
  "w-full border-b border-ink-line bg-ink py-2.5 font-terminal text-sm text-bone focus:border-acid focus:outline-none";

export default function CreateEventPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    shortDescription: "",
    category: "Hackathon",
    location: "",
    city: "Bengaluru",
    state: "Karnataka",
    eventDate: "",
    registrationDeadline: "",
    price: 499,
    totalTickets: 100,
    participationType: "BOTH" as "SOLO" | "TEAM" | "BOTH",
    minTeamSize: 2,
    maxTeamSize: 4,
    imageUrl:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
    organizerName: "Tech Organization",
    organizerEmail: "contact@techorg.in",
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug === "" || prev.slug === generateSlug(prev.name) ? generateSlug(name) : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug || !formData.location) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      const eventTimestamp = formData.eventDate
        ? new Date(formData.eventDate).getTime()
        : Date.now() + 14 * 24 * 60 * 60 * 1000;

      const deadlineTimestamp = formData.registrationDeadline
        ? new Date(formData.registrationDeadline).getTime()
        : eventTimestamp - 2 * 24 * 60 * 60 * 1000;

      const res = await createEventAction({
        name: formData.name,
        slug: formData.slug,
        description: formData.description || formData.name,
        shortDescription: formData.shortDescription || undefined,
        category: formData.category,
        location: formData.location,
        city: formData.city,
        state: formData.state || undefined,
        eventDate: eventTimestamp,
        registrationDeadline: deadlineTimestamp,
        price: Number(formData.price),
        totalTickets: Number(formData.totalTickets),
        participationType: formData.participationType,
        minTeamSize:
          formData.participationType !== "SOLO"
            ? Number(formData.minTeamSize)
            : undefined,
        maxTeamSize:
          formData.participationType !== "SOLO"
            ? Number(formData.maxTeamSize)
            : undefined,
        imageUrl: formData.imageUrl || undefined,
        organizerName: formData.organizerName || undefined,
        organizerEmail: formData.organizerEmail || undefined,
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to create event");
      }

      toast.success("Event created and published successfully!");
      router.push("/admin/events");
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminShell
      tag="— New departure"
      title="Create"
      accent="event"
      active="/admin/events"
    >
      <form onSubmit={handleSubmit} className="max-w-3xl border border-ink-line bg-ink-soft/60">
        <div className="border-b border-ink-line px-6 py-4 sm:px-8">
          <h2 className="font-display text-xl uppercase tracking-wide">
            Manifest <span className="text-outline">details</span>
          </h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-bone-faint">
            Pricing, capacity and team rules go live instantly on publish
          </p>
        </div>

        <div className="grid gap-x-10 gap-y-7 px-6 py-8 sm:grid-cols-2 sm:px-8">
          <div>
            <label htmlFor="ev-name" className={labelCls}>Event name *</label>
            <input id="ev-name" type="text" required value={formData.name} onChange={handleNameChange} placeholder="e.g. AI Innovation Summit 2026" className={inputCls} />
          </div>
          <div>
            <label htmlFor="ev-slug" className={labelCls}>URL slug *</label>
            <input id="ev-slug" type="text" required value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="ai-innovation-summit-2026" className={inputCls} />
          </div>
          <div>
            <label htmlFor="ev-cat" className={labelCls}>Category</label>
            <select id="ev-cat" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={selectCls}>
              <option value="Hackathon">Hackathon</option>
              <option value="Cultural">Cultural</option>
              <option value="Robotics">Robotics</option>
              <option value="Conference">Conference</option>
              <option value="Sports">Sports</option>
              <option value="Workshop">Workshop</option>
            </select>
          </div>
          <div>
            <label htmlFor="ev-tag" className={labelCls}>Short tagline</label>
            <input id="ev-tag" type="text" value={formData.shortDescription} onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })} placeholder="A flagship 2-day technical summit." className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ev-desc" className={labelCls}>Full description</label>
            <textarea id="ev-desc" rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the event, rules, schedule, and attendee benefits…" className={`${inputCls} resize-y`} />
          </div>
          <div>
            <label htmlFor="ev-loc" className={labelCls}>Venue / location *</label>
            <input id="ev-loc" type="text" required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Main Auditorium, Tech Campus" className={inputCls} />
          </div>
          <div>
            <label htmlFor="ev-city" className={labelCls}>City</label>
            <input id="ev-city" type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Bengaluru" className={inputCls} />
          </div>
          <div>
            <label htmlFor="ev-price" className={labelCls}>Ticket price ₹ *</label>
            <input id="ev-price" type="number" min="0" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} className={inputCls} />
            <span className="mt-1 block text-[9px] uppercase tracking-[0.15em] text-bone-faint">
              Set 0 for free events
            </span>
          </div>
          <div>
            <label htmlFor="ev-cap" className={labelCls}>Capacity (total tickets) *</label>
            <input id="ev-cap" type="number" min="1" required value={formData.totalTickets} onChange={(e) => setFormData({ ...formData, totalTickets: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label htmlFor="ev-mode" className={labelCls}>Participation mode</label>
            <select id="ev-mode" value={formData.participationType} onChange={(e) => setFormData({ ...formData, participationType: e.target.value as any })} className={selectCls}>
              <option value="SOLO">Solo (individual only)</option>
              <option value="TEAM">Team only</option>
              <option value="BOTH">Both (solo or team)</option>
            </select>
          </div>
          {formData.participationType !== "SOLO" && (
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label htmlFor="ev-min" className={labelCls}>Min team size</label>
                <input id="ev-min" type="number" min="2" value={formData.minTeamSize} onChange={(e) => setFormData({ ...formData, minTeamSize: Number(e.target.value) })} className={inputCls} />
              </div>
              <div>
                <label htmlFor="ev-max" className={labelCls}>Max team size</label>
                <input id="ev-max" type="number" min="2" value={formData.maxTeamSize} onChange={(e) => setFormData({ ...formData, maxTeamSize: Number(e.target.value) })} className={inputCls} />
              </div>
            </div>
          )}
          <div className="sm:col-span-2">
            <label htmlFor="ev-img" className={labelCls}>Banner image URL</label>
            <input id="ev-img" type="url" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://…" className={`${inputCls} text-[11px]`} />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-ink-line px-6 py-5 sm:px-8">
          <Link
            href="/admin/events"
            className="text-[10px] uppercase tracking-[0.25em] text-bone-faint transition-colors hover:text-bone"
          >
            ← Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="border border-acid bg-acid px-8 py-3 text-[11px] uppercase tracking-[0.3em] text-ink transition-colors hover:bg-transparent hover:text-acid disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Publishing…" : "Publish event →"}
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
