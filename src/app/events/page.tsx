import type { Metadata } from "next";
import EventList from "@/components/EventList";

export const metadata: Metadata = {
  title: "Departures — All Events | HackB4",
  description:
    "The live board of every HackB4 departure: hackathons, cultural carnivals, robot wars and summits. Claim a pass before the gate closes.",
};

export default function EventsPage() {
  return (
    <EventList />
  );
}
