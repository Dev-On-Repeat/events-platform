"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { checkInTicketAction } from "@/app/actions/admin";
import Link from "next/link";
import {
  QrCode,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider border border-green-200">
                Gate Entry Control
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
              QR Ticket Scanner & Verifier
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Real-time gate verification with duplicate scan prevention.
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-right shrink-0">
            <div className="text-[10px] uppercase font-bold text-green-800">
              Turnout Check-Ins
            </div>
            <div className="text-2xl font-bold text-green-700">
              {checkedInCount} / {totalCount}
            </div>
          </div>
        </div>

        {/* Scanner Form */}
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Scan or Enter Ticket ID / QR Payload
              </label>
              <div className="relative">
                <QrCode className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  placeholder="e.g. TKT-2026-12345-1 or scan with camera/scanner"
                  className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-mono text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Optional verification token (auto-extracted if scanning raw QR)"
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-xs font-mono text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isChecking}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isChecking ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : null}
              <span>Verify & Check-In Attendee</span>
            </button>
          </form>

          {/* Result Banner */}
          {lastResult && (
            <div
              className={`p-6 rounded-xl border ${
                lastResult.ok
                  ? "bg-green-50/50 border-green-200"
                  : "bg-red-50/50 border-red-200"
              }`}
            >
              <div className="flex items-start gap-4">
                {lastResult.ok ? (
                  <CheckCircle2 className="w-8 h-8 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600 shrink-0" />
                )}
                <div>
                  <h3
                    className={`text-lg font-bold ${
                      lastResult.ok
                        ? "text-green-900"
                        : "text-red-900"
                    }`}
                  >
                    {lastResult.ok ? "ENTRY GRANTED" : "ENTRY DENIED"}
                  </h3>
                  <p
                    className={`text-xs mt-1 ${
                      lastResult.ok
                        ? "text-green-800"
                        : "text-red-800 font-bold"
                    }`}
                  >
                    {lastResult.message}
                  </p>

                  {lastResult.ticket && (
                    <div className="mt-3 text-xs space-y-1 text-gray-700">
                      <div>
                        <span className="text-gray-500">Attendee:</span>{" "}
                        <strong>{lastResult.ticket.attendeeName}</strong> (
                        {lastResult.ticket.attendeeEmail})
                      </div>
                      <div>
                        <span className="text-gray-500">Event:</span>{" "}
                        {lastResult.ticket.eventName}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Passes List */}
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900">
            Live Ticket Log
          </h2>

          <div className="divide-y divide-gray-100">
            {allTickets?.slice(0, 10).map((t) => (
              <div
                key={t._id}
                className="py-3 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-gray-900">
                    {t.attendeeName}
                  </div>
                  <div className="text-[11px] font-mono text-gray-400">
                    {t.ticketNumber} • {t.eventName}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      t.status === "USED"
                        ? "bg-gray-100 text-gray-700"
                        : t.status === "VALID"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {t.status}
                  </span>
                  {t.checkedInAt && (
                    <span className="text-[10px] text-gray-400">
                      {format(new Date(t.checkedInAt), "HH:mm:ss")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
