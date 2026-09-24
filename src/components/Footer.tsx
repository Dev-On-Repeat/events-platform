import Link from "next/link";
import Wordmark from "./Wordmark";

const COLUMNS = [
  {
    title: "Navigate",
    links: [
      { label: "All Events", href: "/events" },
      { label: "My Passes", href: "/dashboard" },
      { label: "Admin Portal", href: "/admin" },
      { label: "Gate Scanner", href: "/admin/checkin" },
    ],
  },
  {
    title: "Protocol",
    links: [
      { label: "Instant QR Confirmation", href: "/events" },
      { label: "Razorpay Secure Checkout", href: "/events" },
      { label: " OCC-Safe Inventory", href: "/events" },
      { label: "Zero Paper. Zero Queues.", href: "/events" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-ink-line bg-white print:hidden">
      {/* giant wordmark band */}
      <div className="overflow-hidden border-b border-ink-line px-5 py-10 sm:px-8">
        <Wordmark size="xl" href={null} className="text-outline-faint hover:text-outline transition-colors" />
      </div>

      <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-flourish text-2xl italic leading-snug text-bone">
            Every seat has a{" "}
            <span className="text-acid">departure time.</span>
          </p>
          <p className="mt-5 max-w-sm text-xs leading-relaxed text-bone-faint">
            HackB4 is a ticketing terminal for hackathons, cultural nights,
            robot wars and summits. Claim a pass, flash the QR, walk in.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-bone-faint">
              {col.title}
            </h3>
            <ul className="mt-5 space-y-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="link-sweep text-xs uppercase tracking-[0.14em] text-bone-dim transition-colors hover:text-bone"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-ink-line">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-5 py-5 text-[10px] uppercase tracking-[0.2em] text-bone-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© 2026 HackB4 — All flights final</span>
          <span>
            Convex OCC <span className="text-acid">/</span> Razorpay IN{" "}
            <span className="text-acid">/</span> QR Gate Verify
          </span>
        </div>
      </div>
    </footer>
  );
}
