"use client";

import { useState } from "react";
import { createEventAction } from "@/app/actions/admin";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Events List</span>
        </Link>

        <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm">
          <div className="pb-6 border-b border-gray-100 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Create New Event
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Add a new event with configurable pricing, capacity, and team sizes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder="e.g. AI Innovation Summit 2026"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="ai-innovation-summit-2026"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Hackathon">Hackathon</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Robotics">Robotics</option>
                  <option value="Conference">Conference</option>
                  <option value="Sports">Sports</option>
                  <option value="Workshop">Workshop</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Short Tagline
                </label>
                <input
                  type="text"
                  value={formData.shortDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, shortDescription: e.target.value })
                  }
                  placeholder="A flagship 2-day technical summit."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">
                  Full Description
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe the event, rules, schedule, and attendee benefits..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Venue / Location *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Main Auditorium, Tech Campus"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="Bengaluru"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Ticket Price (₹ INR) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-gray-400">Set 0 for free events</span>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Capacity (Total Tickets) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.totalTickets}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalTickets: Number(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Participation Mode
                </label>
                <select
                  value={formData.participationType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      participationType: e.target.value as any,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SOLO">Solo (Individual Only)</option>
                  <option value="TEAM">Team Only</option>
                  <option value="BOTH">Both (Solo or Team)</option>
                </select>
              </div>

              {formData.participationType !== "SOLO" && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block font-semibold text-gray-700 mb-1">
                      Min Team Size
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={formData.minTeamSize}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minTeamSize: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block font-semibold text-gray-700 mb-1">
                      Max Team Size
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={formData.maxTeamSize}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxTeamSize: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">
                  Banner Image URL
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, imageUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
              <Link
                href="/admin/events"
                className="px-5 py-2 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Publish Event</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
