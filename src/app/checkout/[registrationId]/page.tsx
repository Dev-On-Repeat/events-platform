"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  initiatePaymentOrder,
  verifyAndConfirmPayment,
} from "@/app/actions/payment";
import { toast } from "sonner";
import confetti from "canvas-confetti";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const CONFETTI_COLORS = ["#D8FF3E", "#EDE8DC", "#FF4B1F"];

function TerminalLoader({ label }: { label: string }) {
  return (
    <div className="grid-bg flex min-h-[70vh] items-center justify-center">
      <div className="text-center">
        <p className="animate-blink text-[11px] uppercase tracking-[0.4em] text-bone-faint">
          {label}
          <span className="text-acid">…</span>
        </p>
      </div>
    </div>
  );
}

function TerminalNotice({
  tag,
  tone = "dim",
  title,
  accent,
  body,
  children,
}: {
  tag: string;
  tone?: "dim" | "signal" | "acid";
  title: string;
  accent?: string;
  body: string;
  children?: React.ReactNode;
}) {
  const toneCls =
    tone === "signal"
      ? "border-signal text-signal"
      : tone === "acid"
        ? "border-acid text-acid"
        : "border-ink-line text-bone-dim";
  return (
    <div className="grid-bg flex min-h-[70vh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-lg border border-ink-line bg-ink-soft/60 p-8 text-center sm:p-10">
        <span className={`inline-block border px-3 py-1 text-[9px] uppercase tracking-[0.3em] ${toneCls}`}>
          {tag}
        </span>
        <h1 className="mt-6 font-display text-4xl uppercase leading-tight tracking-wide">
          {title}{" "}
          {accent && <span className="text-outline">{accent}</span>}
        </h1>
        <p className="mt-4 font-flourish text-lg italic leading-relaxed text-bone-dim">
          {body}
        </p>
        {children}
      </div>
    </div>
  );
}

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ registrationId: string }>;
}) {
  const { registrationId } = use(params);
  const router = useRouter();

  const registration = useQuery(api.registrations.getById, {
    registrationId: registrationId as Id<"registrations">,
  });

  const queueStatus = useQuery(
    api.queue.getQueueStatus,
    registration?.eventId && registration?.sessionId
      ? {
          eventId: registration.eventId,
          sessionId: registration.sessionId,
        }
      : "skip"
  );

  const releaseOffer = useMutation(api.queue.releaseOffer);

  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState<number>(600);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mockModalOpen, setMockModalOpen] = useState(false);
  const [mockOrderDetails, setMockOrderDetails] = useState<any>(null);

  // If already confirmed, redirect to ticket immediately
  useEffect(() => {
    if (registration?.status === "CONFIRMED") {
      router.push(`/ticket/${registration._id}`);
    }
  }, [registration?.status, registration?._id, router]);

  // Live Countdown Timer
  useEffect(() => {
    if (!registration?.offerExpiresAt) return;

    const calculateTime = () => {
      const diff = registration.offerExpiresAt! - Date.now();
      if (diff <= 0) {
        setTimeRemaining("00:00");
        setSecondsLeft(0);
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      setSecondsLeft(totalSec);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      setTimeRemaining(
        `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      );
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [registration?.offerExpiresAt]);

  if (registration === undefined) {
    return <TerminalLoader label="Retrieving checkout session" />;
  }

  if (registration === null) {
    return (
      <TerminalNotice
        tag="Error 404"
        tone="signal"
        title="No such"
        accent="session"
        body="This registration session does not exist or has been cancelled."
      />
    );
  }

  // Check if event is still valid for purchase
  const now = Date.now();
  const event = registration.event;
  if (event) {
    const isPastEvent = event.eventDate < now;
    const isRegistrationClosed = event.registrationDeadline < now;
    const isCancelled = event.status === "CANCELLED" || event.is_cancelled;
    const isCompleted = event.status === "COMPLETED";

    if (isPastEvent || isRegistrationClosed || isCancelled || isCompleted) {
      return (
        <TerminalNotice
          tag="Gate closed"
          tone="signal"
          title="Departure"
          accent="unavailable"
          body="This event can no longer be booked — your registration has been cancelled. The terminal will ping you when new gates open."
        >
          <Link
            href="/events"
            className="mt-8 inline-block border border-acid bg-acid px-8 py-3 text-[11px] uppercase tracking-[0.3em] text-ink transition-colors hover:bg-transparent hover:text-acid"
          >
            Other departures
          </Link>
        </TerminalNotice>
      );
    }
  }

  const isPendingConfirmation = registration.status === "PAYMENT_PENDING";

  const isWaiting =
    registration.status === "PENDING" || queueStatus?.status === "WAITING";

  const isHeld =
    (registration.status === "HELD" || queueStatus?.status === "OFFERED") &&
    !isPendingConfirmation &&
    !isWaiting;

  const isExpired =
    registration.status === "EXPIRED" ||
    queueStatus?.status === "EXPIRED" ||
    secondsLeft <= 0;

  // Handle Free Event Registration (Instant Confirmation)
  const handleFreeRegistration = async () => {
    try {
      setIsProcessing(true);
      const freePaymentId = `free_pass_${Date.now()}`;
      const freeOrderId = `order_free_${Date.now()}`;

      const res = await verifyAndConfirmPayment({
        registrationId: registration._id,
        orderId: freeOrderId,
        paymentId: freePaymentId,
        signature: "free_event_signature",
      });

      if (res.success && res.ticketIds && res.ticketIds.length > 0) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: CONFETTI_COLORS });
        toast.success("Free pass confirmed! Generating your digital pass...");
        router.push(`/ticket/${res.ticketIds[0]}`);
      } else {
        throw new Error(res.error || "Confirmation failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm registration");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Payment Trigger
  const handlePay = async () => {
    if (registration.totalAmount === 0) {
      return handleFreeRegistration();
    }

    try {
      setIsProcessing(true);

      const orderResult = await initiatePaymentOrder(registration._id);
      if (!orderResult.success) {
        throw new Error(orderResult.error || "Failed to create payment order");
      }

      if (orderResult.provider === "mock") {
        // Open Mock Checkout Modal
        setMockOrderDetails(orderResult);
        setMockModalOpen(true);
        setIsProcessing(false);
        return;
      }

      // Razorpay Checkout Modal
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const options = {
        key: orderResult.keyId,
        amount: Math.round((orderResult.amount || 0) * 100),
        currency: orderResult.currency || "INR",
        name: "HackB4",
        description: orderResult.eventName || "Event Pass",
        order_id: orderResult.orderId,
        prefill: {
          name: orderResult.customer?.name || "",
          email: orderResult.customer?.email || "",
          contact: orderResult.customer?.phone || "",
        },
        theme: {
          color: "#0B0B09",
        },
        handler: async function (response: any) {
          try {
            toast.loading("Verifying payment with gateway...");
            const confirmRes = await verifyAndConfirmPayment({
              registrationId: registration._id,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            if (confirmRes.success && confirmRes.ticketIds) {
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: CONFETTI_COLORS });
              toast.success("Payment verified! Pass confirmed.");
              router.push(`/ticket/${confirmRes.ticketIds[0]}`);
            } else {
              toast.error(confirmRes.error || "Payment verification failed");
            }
          } catch (e: any) {
            toast.error(e.message || "Error verifying payment");
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Payment initiation failed");
      setIsProcessing(false);
    }
  };

  // Mock Payment Confirmation (for local test & demo)
  const handleMockPaymentSuccess = async () => {
    try {
      setIsProcessing(true);
      setMockModalOpen(false);

      const mockPaymentId = `pay_mock_${Date.now()}`;
      const res = await verifyAndConfirmPayment({
        registrationId: registration._id,
        orderId: mockOrderDetails.orderId,
        paymentId: mockPaymentId,
        signature: "mock_signature_valid",
      });

      if (res.success && res.ticketIds && res.ticketIds.length > 0) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: CONFETTI_COLORS });
        toast.success("Mock payment simulated successfully! Ticket issued.");
        router.push(`/ticket/${res.ticketIds[0]}`);
      } else {
        toast.error(res.error || "Failed to confirm payment");
      }
    } catch (err: any) {
      toast.error(err.message || "Payment simulation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  // Release offer voluntarily
  const handleRelease = async () => {
    if (confirm("Are you sure you want to release your reserved ticket?")) {
      await releaseOffer({
        eventId: registration.eventId,
        sessionId: registration.sessionId,
      });
      toast.info("Ticket reservation released.");
      router.push(`/events/${registration.event?.slug || registration.eventId}`);
    }
  };

  const urgent = secondsLeft > 0 && secondsLeft < 120;

  return (
    <div className="grid-bg min-h-screen pb-24">
      <div className="mx-auto max-w-3xl px-5 pt-10 sm:px-8 sm:pt-14">
        {/* ── State 1: Active Waiting List Queue ── */}
        {isWaiting && (
          <div className="border border-ink-line bg-ink-soft/60 p-8 text-center sm:p-12">
            <span className="inline-block border border-amberish px-3 py-1 text-[9px] uppercase tracking-[0.3em] text-amberish">
              Real-time queue active
            </span>
            <h1 className="mt-6 font-display text-4xl uppercase leading-tight tracking-wide">
              In line for{" "}
              <span className="text-outline">{registration.event?.name}</span>
            </h1>
            <p className="mx-auto mt-4 max-w-md font-flourish text-lg italic text-bone-dim">
              Demand is high. Your position is server-guaranteed — keep this
              window open.
            </p>

            <div className="mx-auto mt-10 max-w-xs border border-ink-line bg-ink px-6 py-8">
              <div className="text-[9px] uppercase tracking-[0.3em] text-bone-faint">
                Queue position
              </div>
              <div className="my-2 font-display text-7xl text-acid">
                #{queueStatus?.position || 1}
              </div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-bone-faint">
                {queueStatus?.position === 1
                  ? "You're next — hold tight"
                  : `${(queueStatus?.position || 2) - 1} ahead of you`}
              </div>
            </div>

            <p className="mt-8 text-[10px] uppercase tracking-[0.2em] text-bone-faint">
              When a spot opens, you get a 10-minute purchase window
            </p>
          </div>
        )}

        {/* ── State 2: Expired Offer ── */}
        {isExpired && !isWaiting && (
          <TerminalNotice
            tag="Window elapsed"
            tone="signal"
            title="Hold"
            accent="released"
            body="The 10-minute purchase window elapsed and the seat was safely passed to the next person in line."
          >
            <button
              onClick={() => router.push(`/register/${registration.eventId}`)}
              className="mt-8 border border-acid bg-acid px-8 py-3 text-[11px] uppercase tracking-[0.3em] text-ink transition-colors hover:bg-transparent hover:text-acid"
            >
              Register again
            </button>
          </TerminalNotice>
        )}

        {/* ── State 3: Payment Received — Awaiting Gateway Confirmation ── */}
        {isPendingConfirmation && (
          <TerminalNotice
            tag="Payment processing"
            tone="acid"
            title="Received —"
            accent="confirming."
            body="Payment received — our server and webhook pipeline are verifying it. Your pass will load automatically. Don't close or retry."
          >
            <div className="mt-8 border border-ink-line bg-ink px-4 py-3 font-terminal text-[10px] text-bone-faint">
              REG: <span className="text-bone">{registration._id}</span>
            </div>
          </TerminalNotice>
        )}

        {/* ── State 4: Active Timed Offer (10-Minute Checkout HUD) ── */}
        {isHeld && !isExpired && (
          <div>
            {/* timer bar */}
            <div
              className={`flex flex-col gap-4 border p-5 sm:flex-row sm:items-center sm:justify-between ${
                urgent
                  ? "border-signal bg-signal/10"
                  : "border-acid bg-acid text-ink"
              }`}
            >
              <div>
                <div
                  className={`text-[9px] uppercase tracking-[0.3em] ${
                    urgent ? "text-signal" : "text-ink/60"
                  }`}
                >
                  Guaranteed ticket hold
                </div>
                <div className="mt-1 font-display text-2xl uppercase tracking-wide">
                  {urgent ? "Boarding closes soon" : "Your seat is locked"}
                </div>
              </div>
              <div
                className={`self-start px-5 py-2 sm:self-auto ${
                  urgent
                    ? "border border-signal"
                    : "border border-ink/30 bg-ink text-acid"
                }`}
              >
                <div
                  className={`text-[8px] uppercase tracking-[0.3em] ${
                    urgent ? "text-signal/80" : "text-bone-faint"
                  }`}
                >
                  Time left
                </div>
                <div className="font-terminal text-3xl tabular-nums tracking-wider">
                  <span className={urgent ? "animate-blink" : ""}>
                    {timeRemaining || "10:00"}
                  </span>
                </div>
              </div>
            </div>

            {/* order review */}
            <div className="mt-6 border border-ink-line bg-ink-soft/60">
              <div className="border-b border-ink-line px-6 py-4">
                <h2 className="font-display text-2xl uppercase tracking-wide">
                  Review <span className="text-outline">&amp; checkout</span>
                </h2>
                <p className="mt-1 font-terminal text-[10px] text-bone-faint">
                  REG: {registration._id}
                </p>
              </div>

              <div className="p-6 sm:p-8">
                {/* event */}
                <div className="border border-ink-line bg-ink p-4">
                  <div className="text-[9px] uppercase tracking-[0.3em] text-bone-faint">
                    Departure
                  </div>
                  <div className="mt-1 font-display text-xl uppercase tracking-wide text-bone">
                    {registration.event?.name}
                  </div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-bone-dim">
                    {registration.event?.location}, {registration.event?.city}
                  </div>
                </div>

                {/* manifest */}
                <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 text-xs sm:grid-cols-2">
                  {[
                    ["Type", registration.registrationType === "TEAM" ? "Team" : "Solo"],
                    [
                      "Headcount",
                      `${registration.ticketQuantity} ${registration.ticketQuantity === 1 ? "person" : "people"}`,
                    ],
                    ["Team leader", registration.primaryParticipant.fullName],
                    ["Email", registration.primaryParticipant.email],
                    ...(registration.teamDetails
                      ? ([
                          ["Team name", registration.teamDetails.teamName],
                        ] as [string, string][])
                      : []),
                  ].map(([k, v]) => (
                    <div key={k as string}>
                      <dt className="text-[9px] uppercase tracking-[0.3em] text-bone-faint">
                        {k}
                      </dt>
                      <dd className="mt-1 text-bone">{v}</dd>
                    </div>
                  ))}
                  {registration.teamDetails && (
                    <div className="sm:col-span-2">
                      <dt className="text-[9px] uppercase tracking-[0.3em] text-bone-faint">
                        Crew
                      </dt>
                      <dd className="mt-1 leading-relaxed text-bone">
                        {registration.teamDetails.members
                          .map((m, i) => `${i + 2}. ${m.fullName} (${m.email})`)
                          .join("  ·  ")}
                      </dd>
                    </div>
                  )}
                </dl>

                {/* fare */}
                <div className="mt-8 border-t border-ink-line pt-6">
                  <div className="flex justify-between text-xs">
                    <span className="uppercase tracking-[0.15em] text-bone-dim">
                      Base pass — ₹{registration.event?.price} ×{" "}
                      {registration.ticketQuantity}
                    </span>
                    <span className="tabular-nums text-bone">
                      ₹{registration.totalAmount}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="uppercase tracking-[0.15em] text-bone-dim">
                      Platform &amp; processing
                    </span>
                    <span className="text-acid">₹0 — waived</span>
                  </div>
                  <div className="mt-5 flex items-baseline justify-between border-t border-ink-line pt-5">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-bone-dim">
                      Total due
                    </span>
                    <span className="font-display text-5xl text-acid">
                      {registration.totalAmount === 0
                        ? "FREE"
                        : `₹${registration.totalAmount}`}
                    </span>
                  </div>
                </div>

                {/* actions */}
                <div className="mt-8">
                  <button
                    onClick={handlePay}
                    disabled={isProcessing}
                    className="w-full border border-acid bg-acid py-4 text-[12px] uppercase tracking-[0.3em] text-ink transition-all duration-200 hover:bg-transparent hover:text-acid disabled:cursor-wait disabled:opacity-60"
                  >
                    {isProcessing
                      ? "Processing gateway order…"
                      : registration.totalAmount === 0
                        ? "Confirm free pass →"
                        : `Pay ₹${registration.totalAmount} now →`}
                  </button>

                  <button
                    type="button"
                    onClick={handleRelease}
                    className="mt-4 w-full py-2 text-[10px] uppercase tracking-[0.25em] text-bone-faint transition-colors hover:text-signal"
                  >
                    Release reservation &amp; return
                  </button>
                </div>

                <p className="mt-6 text-center text-[9px] uppercase tracking-[0.2em] text-bone-faint">
                  Encrypted transaction — verified confirmation — Razorpay IN
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Mock Payment Modal (local dev & demo) ── */}
      {mockModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-ink-line bg-ink-soft shadow-hard-lg">
            <div className="flex items-center justify-between border-b border-ink-line px-6 py-4">
              <h3 className="font-display text-xl uppercase tracking-wide">
                Mock <span className="text-acid">gateway</span>
              </h3>
              <span className="border border-acid px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] text-acid">
                Local dev mode
              </span>
            </div>

            <div className="p-6">
              <p className="text-xs leading-relaxed text-bone-dim">
                You&apos;re running in mock payment mode. Simulate a successful
                gateway response or test failure recovery — no real money
                moves.
              </p>

              <div className="mt-6 space-y-1.5 border border-ink-line bg-ink p-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-bone-faint">Order ID</span>
                  <span className="font-terminal text-bone">
                    {mockOrderDetails?.orderId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bone-faint">Amount</span>
                  <span className="font-display text-lg text-acid">
                    ₹{mockOrderDetails?.amount}
                  </span>
                </div>
              </div>

              <button
                onClick={handleMockPaymentSuccess}
                disabled={isProcessing}
                className="mt-6 w-full border border-acid bg-acid py-3.5 text-[11px] uppercase tracking-[0.3em] text-ink transition-colors hover:bg-transparent hover:text-acid disabled:opacity-60"
              >
                Simulate successful payment
              </button>

              <button
                onClick={() => {
                  setMockModalOpen(false);
                  toast.error("Payment was cancelled or rejected by user.");
                }}
                className="mt-3 w-full py-2 text-[10px] uppercase tracking-[0.25em] text-bone-faint transition-colors hover:text-signal"
              >
                Simulate payment cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
