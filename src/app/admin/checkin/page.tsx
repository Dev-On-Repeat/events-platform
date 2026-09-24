"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { checkInTicketAction } from "@/app/actions/admin";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import AdminShell from "@/components/admin/AdminShell";

export default function GateCheckInPage() {
  const [ticketInput, setTicketInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const allTickets = useQuery(api.tickets.listForAdmin, {});

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketInput.trim()) {
      toast.error("Please enter a ticket number or scan QR payload.");
      return;
    }

    try {
      setIsChecking(true);
      let ticketNum = ticketInput.trim();
      let tok = tokenInput.trim() || undefined;

      // Handle raw JSON QR payloads if scanned directly from webcam / barcode scanner
      if (ticketNum.startsWith("{") && ticketNum.endsWith("}")) {
        try {
          const parsed = JSON.parse(ticketNum);
          ticketNum = parsed.tid;
          tok = parsed.tok;
        } catch {
          // Continue with raw input
        }
      }

      const res = await checkInTicketAction({
        ticketNumber: ticketNum,
        token: tok,
        checkedInBy: "Gate Staff Terminal 1",
      });

      setLastResult(res);

      if (res.ok) {
        toast.success(res.message);
        setTicketInput("");
        setTokenInput("");
      } else {
        if (res.alreadyUsed) {
          toast.error("WARNING: Ticket has ALREADY been scanned!");
        } else {
          toast.error(res.message);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process check-in");
    } finally {
      setIsChecking(false);
    }
  };

  const checkedInCount = allTickets?.filter((t) => t.status === "USED").length || 0;
  const totalCount = allTickets?.length || 0;

  return (
    <AdminShell
      tag="— Gate control"
      title="Gate"
      accent="scanner"
      active="/admin/checkin"
      actions={
        <div className="border border-acid px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] text-acid">
          Turnout {checkedInCount}/{totalCount}
        </div>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* scanner */}
        <div className="border border-ink-line bg-ink-soft/60">
          <div className="border-b border-ink-line px-6 py-4">
            <h2 className="font-display text-xl uppercase tracking-wide">
              Verify <span className="text-outline">&amp; admit</span>
            </h2>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-bone-faint">
              Duplicate scans are rejected in real time
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6 p-6">
            <div>
              <label
                htmlFor="gate-ticket"
                className="mb-1.5 block text-[9px] uppercase tracking-[0.3em] text-bone-faint"
              >
                Ticket no. / QR payload
              </label>
              <input
                id="gate-ticket"
                type="text"
                required
                autoFocus
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
                placeholder="TKT-2026-12345-1 — or scan raw payload"
                className="w-full border border-ink-line bg-ink px-4 py-3.5 font-terminal text-sm text-bone placeholder:text-bone-faint/60 focus:border-acid focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="gate-token"
                className="mb-1.5 block text-[9px] uppercase tracking-[0.3em] text-bone-faint"
              >
                Verification token — optional
              </label>
              <input
                id="gate-token"
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Auto-extracted from raw QR payloads"
                className="w-full border-b border-ink-line bg-transparent py-2.5 font-terminal text-xs text-bone placeholder:text-bone-faint/60 focus:border-acid focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isChecking}
              className="w-full border border-acid bg-acid py-4 text-[12px] uppercase tracking-[0.3em] text-ink transition-colors hover:bg-transparent hover:text-acid disabled:cursor-wait disabled:opacity-60"
            >
              {isChecking ? "Verifying…" : "Verify & check in →"}
            </button>
          </form>

          {/* result */}
          {lastResult && (
            <div
              className={`m-6 mt-0 border p-6 ${
                lastResult.ok
                  ? "border-acid bg-acid/10"
                  : "border-signal bg-signal/10"
              }`}
            >
              <div
                className={`font-display text-3xl uppercase tracking-wide ${
                  lastResult.ok ? "text-acid" : "text-signal"
                }`}
              >
                {lastResult.ok ? "Entry granted" : "Entry denied"}
              </div>
              <p className="mt-2 font-terminal text-xs text-bone-dim">
                {lastResult.message}
              </p>

              {lastResult.ticket && (
                <div className="mt-4 border-t border-ink-line pt-3 text-xs text-bone-dim">
                  <span className="text-bone-faint">Attendee:</span>{" "}
                  <span className="text-bone">
                    {lastResult.ticket.attendeeName}
                  </span>{" "}
                  <span className="text-bone-faint">
                    ({lastResult.ticket.attendeeEmail})
                  </span>
                  <br />
                  <span className="text-bone-faint">Event:</span>{" "}
                  {lastResult.ticket.eventName}
                </div>
              )}
            </div>
          )}
        </div>

        {/* live log */}
        <div className="border border-ink-line bg-ink-soft/60">
          <div className="flex items-center justify-between border-b border-ink-line px-6 py-4">
            <h2 className="font-display text-xl uppercase tracking-wide">
              Live log
            </h2>
            <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-bone-faint">
              <span className="inline-block h-1.5 w-1.5 animate-blink rounded-full bg-acid" />
              Streaming
            </span>
          </div>

          <div className="divide-y divide-ink-line">
            {allTickets?.slice(0, 12).map((t, i) => (
              <div
                key={t._id}
                className="flex items-center justify-between gap-3 px-6 py-3.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-bone">
                    {t.attendeeName}
                  </div>
                  <div className="truncate font-terminal text-[10px] text-bone-faint">
                    {t.ticketNumber} · {t.eventName}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {t.checkedInAt && (
                    <span className="text-[10px] tabular-nums text-bone-faint">
                      {format(new Date(t.checkedInAt), "HH:mm:ss")}
                    </span>
                  )}
                  <span
                    className={`border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] ${
                      t.status === "USED"
                        ? "border-bone-faint text-bone-dim"
                        : t.status === "VALID"
                          ? "border-acid text-acid"
                          : "border-signal text-signal"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
            {allTickets && allTickets.length === 0 && (
              <p className="px-6 py-12 text-center font-flourish text-xl italic text-bone-dim">
                No passes issued yet.
              </p>
            )}
          </div>

          <div className="border-t border-ink-line px-6 py-3 text-[9px] uppercase tracking-[0.2em] text-bone-faint">
            <Link href="/admin" className="transition-colors hover:text-bone">
              ← Ops dashboard
            </Link>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
