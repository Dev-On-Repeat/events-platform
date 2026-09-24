"use client";

import Link from "next/link";
import { Search, MapPin, ArrowUpRight, Sparkles, Ticket, CalendarDays } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

const categories = ["For you", "Hackathons", "Music", "Comedy", "Workshops", "Sports"];
const visualThemes = [
  "from-indigo-500 via-violet-500 to-fuchsia-400",
  "from-orange-400 via-rose-500 to-purple-600",
  "from-cyan-400 via-blue-500 to-indigo-700",
  "from-amber-300 via-orange-500 to-red-600",
  "from-emerald-400 via-teal-500 to-cyan-700",
];

function EventVisual({ index, category }: { index: number; category: string }) {
  return (
    <div className={`relative aspect-[1.32] overflow-hidden rounded-t-[1.25rem] bg-gradient-to-br ${visualThemes[index % visualThemes.length]}`}>
      <div className="absolute -right-8 -top-12 size-40 rounded-full border-[18px] border-white/20" />
      <div className="absolute -bottom-16 -left-10 size-44 rounded-full bg-white/15 blur-sm" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,.35),transparent_22%),linear-gradient(135deg,transparent_35%,rgba(15,23,42,.22))]" />
      <div className="absolute bottom-4 left-4 rounded-full border border-white/35 bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
        {category}
      </div>
      <Sparkles className="absolute right-5 top-5 size-5 text-white/80" />
    </div>
  );
}

export default function Home() {
  const events = useQuery(api.events.list, {});
  const upcoming = events?.filter((event) => event.eventDate > Date.now()).sort((a, b) => a.eventDate - b.eventDate) ?? [];
  const featured = upcoming.slice(0, 5);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="bg-[#f8f7ff] pb-16 pt-10 sm:pb-24 sm:pt-16">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm">
                <span className="size-2 rounded-full bg-emerald-400" /> Live in your city
              </div>
              <h1 className="max-w-2xl text-5xl font-bold tracking-[-0.055em] text-slate-950 sm:text-7xl">
                Make plans.<br /><span className="text-indigo-600">Make memories.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
                Discover the best events, hackathons, concerts and experiences happening around you.
              </p>
              <Link href="/events" className="mt-8 inline-flex items-center gap-3 rounded-full bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(79,70,229,.25)] transition hover:-translate-y-0.5 hover:bg-indigo-700">
                Explore events <ArrowUpRight className="size-4" />
              </Link>
            </div>
            <div className="relative mx-auto w-full max-w-[480px]">
              <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-indigo-200/50 via-fuchsia-100/50 to-amber-100/60 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2.25rem] border border-white bg-gradient-to-br from-indigo-500 via-violet-500 to-rose-400 p-5 shadow-[0_24px_70px_rgba(79,70,229,.22)]">
                <div className="flex items-center justify-between text-white/80"><span className="text-xs font-semibold uppercase tracking-[.2em]">Your weekend</span><CalendarDays className="size-5" /></div>
                <div className="mt-16 flex items-end justify-between"><div><div className="text-6xl font-bold tracking-[-.08em] text-white">12</div><div className="mt-1 text-sm text-white/75">things worth showing up for</div></div><div className="relative size-28 rounded-[2rem] bg-white/20 p-4 backdrop-blur-md"><Ticket className="size-full text-white" /></div></div>
                <div className="mt-8 flex gap-2"><span className="rounded-full bg-white/20 px-3 py-1 text-xs text-white">Fri 18</span><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700">Sat 19</span><span className="rounded-full bg-white/20 px-3 py-1 text-xs text-white">Sun 20</span></div>
              </div>
            </div>
          </div>
          <div className="relative z-10 mx-auto mt-12 flex max-w-4xl items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_14px_40px_rgba(30,41,59,.1)] sm:mt-16">
            <Search className="ml-3 size-5 text-indigo-500" /><input aria-label="Search events" placeholder="Search events, experiences and places" className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" /><button className="hidden rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600 sm:block">Search</button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">{categories.map((category, index) => <Link key={category} href="/events" className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${index === 0 ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"}`}>{category}</Link>)}</div>
        <div className="mt-12 flex items-end justify-between"><div><p className="text-sm font-semibold text-indigo-600">Curated for you</p><h2 className="mt-2 text-3xl font-bold tracking-[-.04em] text-slate-950 sm:text-4xl">Happening near you</h2></div><Link href="/events" className="hidden items-center gap-1 text-sm font-semibold text-indigo-600 sm:flex">See all <ArrowUpRight className="size-4" /></Link></div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {!events ? Array.from({ length: 5 }).map((_, index) => <div key={index} className="overflow-hidden rounded-[1.25rem] border border-slate-100 bg-white shadow-sm"><div className="aspect-[1.32] animate-pulse bg-slate-100" /><div className="space-y-3 p-4"><div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" /><div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" /></div></div>) : featured.length ? featured.map((event, index) => <Link href={`/events/${event.slug || event._id}`} key={event._id} className="group overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_5px_18px_rgba(30,41,59,.05)] transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_35px_rgba(79,70,229,.14)]"><EventVisual index={index} category={event.category} /><div className="p-4"><h3 className="line-clamp-2 text-base font-bold leading-5 text-slate-900">{event.name}</h3><p className="mt-3 flex items-center gap-1 text-xs text-slate-500"><MapPin className="size-3.5 text-indigo-500" /> {event.city || event.location}</p><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className="font-semibold text-indigo-600">{event.price === 0 ? "Free entry" : `From ₹${event.price}`}</span><span className="text-slate-400">Book now</span></div></div></Link>) : <div className="col-span-full rounded-2xl bg-slate-50 p-12 text-center text-slate-500">New experiences are arriving soon.</div>}
        </div>
      </section>

      <section className="border-y border-indigo-100 bg-indigo-50/60"><div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-12 sm:grid-cols-3 sm:px-8 sm:py-16">{[{ icon: Ticket, title: "Instant digital passes", body: "Book in seconds and keep every ticket in one place." }, { icon: MapPin, title: "Made for your city", body: "Find memorable things to do close to where you are." }, { icon: Sparkles, title: "Plans worth sharing", body: "Bring your people along for the next great story." }].map(({ icon: Icon, title, body }) => <div key={title} className="flex gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm"><Icon className="size-5" /></div><div><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{body}</p></div></div>)}</div></section>
    </main>
  );
}
