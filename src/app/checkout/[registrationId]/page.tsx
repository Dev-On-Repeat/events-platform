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
import {
  Clock,
  CreditCard,
  Ticket,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

declare global {
  interface Window {
    Razorpay: any;
  }
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
        setTimeRemaining("00:00 - Offer Expired");
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
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500">Retrieving checkout session...</p>
        </div>
      </div>
    );
  }

  if (registration === null) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900">
          Registration Not Found
        </h2>
        <p className="text-xs text-gray-500 mt-2">
          This registration session does not exist or has been cancelled.
        </p>
      </div>
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
        <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900">
            {isPastEvent || isCompleted ? "Event Has Ended" : isCancelled ? "Event Cancelled" : "Registration Closed"}
          </h2>
          <p className="text-sm text-gray-600 mt-2 max-w-md">
            {isPastEvent || isCompleted 
              ? "This event has already concluded. Your registration has been cancelled."
              : isCancelled 
              ? "This event has been cancelled by the organizers. Your registration has been cancelled."
              : "Registration for this event has closed. Your registration has been cancelled."}
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
  }

  const isPendingConfirmation = registration.status === "PAYMENT_PENDING";

  const isHeld =
    (registration.status === "HELD" || queueStatus?.status === "OFFERED") &&
    !isPendingConfirmation;

  const isWaiting =
    registration.status === "PENDING" || queueStatus?.status === "WAITING";

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
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
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
          color: "#4f46e5",
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
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
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
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
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

  return (
    <div className="min-h-screen bg-gray-50/50 pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* State 1: Active Waiting List Queue */}
        {isWaiting && (
          <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200 mb-3">
                <span>Real-Time Queue Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                You&apos;re in Line for {registration.event?.name}
              </h1>
              <p className="mt-2 text-xs text-gray-500 max-w-md mx-auto">
                Demand is currently high! Your position is strictly server-guaranteed
                FIFO. Do not close this window.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-gray-50/50 border border-gray-200 max-w-sm mx-auto">
              <div className="text-xs text-gray-400 uppercase font-semibold">
                Your Queue Position
              </div>
              <div className="text-5xl font-black text-blue-600 my-2">
                #{queueStatus?.position || 1}
              </div>
              <div className="text-[11px] text-gray-500">
                {queueStatus?.position === 1
                  ? "You're next! We're reserving your spot as soon as checkout opens."
                  : `${(queueStatus?.position || 2) - 1} attendee(s) ahead of you`}
              </div>
            </div>

            <div className="text-xs text-gray-400 flex items-center justify-center">
              <span>When a spot opens, you will get a 10-minute purchase window.</span>
            </div>
          </div>
        )}

        {/* State 2: Expired Offer */}
        {isExpired && !isWaiting && (
          <div className="bg-white rounded-xl p-8 border border-red-200 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
              <XCircle className="w-8 h-8" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Ticket Reservation Window Expired
              </h1>
              <p className="mt-2 text-xs text-gray-500 max-w-md mx-auto">
                The 10-minute purchase window for this reservation has elapsed. The
                spot has been safely released to the next person in line.
              </p>
            </div>

            <button
              onClick={() =>
                router.push(`/register/${registration.eventId}`)
              }
              className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              Rejoin Waitlist / Register Again
            </button>
          </div>
        )}

        {/* State 3: Payment Received - Awaiting Gateway Confirmation */}
        {isPendingConfirmation && (
          <div className="bg-white rounded-xl p-8 border border-blue-200 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 mb-3">
                <span>Payment Processing</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Payment received. We&apos;re confirming your registration.
              </h1>
              <p className="mt-2 text-xs text-gray-500 max-w-md mx-auto">
                Your payment was received and is being verified by our server and webhook pipeline. Your digital ticket pass will load automatically. Please do not close this window or retry payment.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-200 max-w-sm mx-auto text-xs text-gray-500">
              Registration ID: <span className="font-mono text-gray-800">{registration._id}</span>
            </div>
          </div>
        )}

        {/* State 4: Active Timed Offer (10-Minute Checkout HUD) */}
        {isHeld && !isExpired && (
          <div className="space-y-6">
            {/* Top Timer Bar */}
            <div className="bg-blue-600 text-white p-5 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-white/10">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs uppercase font-bold tracking-wider text-blue-100">
                    Guaranteed Ticket Hold
                  </div>
                  <div className="text-sm font-semibold">
                    Complete purchase before timer runs out
                  </div>
                </div>
              </div>

              <div className="text-right bg-white/10 px-4 py-2 rounded-lg border border-white/20">
                <div className="text-[10px] uppercase font-bold text-blue-100">
                  Time Remaining
                </div>
                <div className="text-2xl font-mono font-bold tracking-wider text-white">
                  {timeRemaining || "10:00"}
                </div>
              </div>
            </div>

            {/* Order Review Card */}
            <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Review & Checkout
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Registration ID: {registration._id}
                </p>
              </div>

              {/* Event Details */}
              <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-200 space-y-2">
                <div className="text-xs font-semibold text-gray-400 uppercase">
                  Event
                </div>
                <div className="text-base font-bold text-gray-900">
                  {registration.event?.name}
                </div>
                <div className="text-xs text-gray-500">
                  {registration.event?.location}, {registration.event?.city}
                </div>
              </div>

              {/* Participant Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5">Participation Type:</span>
                  <span className="font-semibold text-gray-800">
                    {registration.registrationType === "TEAM" ? "Group/Team" : "Individual/Solo"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Total Participants:</span>
                  <span className="font-semibold text-gray-800">
                    {registration.ticketQuantity} {registration.ticketQuantity === 1 ? "person" : "people"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Team Leader:</span>
                  <span className="font-semibold text-gray-800">
                    {registration.primaryParticipant.fullName}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Email:</span>
                  <span className="font-semibold text-gray-800">
                    {registration.primaryParticipant.email}
                  </span>
                </div>
                {registration.teamDetails && (
                  <>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Team Name:</span>
                      <span className="font-semibold text-gray-800">
                        {registration.teamDetails.teamName}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray-400 block mb-0.5">Team Members:</span>
                      <div className="font-semibold text-gray-800 mt-1">
                        {registration.teamDetails.members.map((m, i) => `${i + 2}. ${m.fullName} (${m.email})`).join(", ")}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Price Calculation */}
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>
                    Base Pass (₹{registration.event?.price} ×{" "}
                    {registration.ticketQuantity})
                  </span>
                  <span>₹{registration.totalAmount}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Platform & Processing Fee</span>
                  <span className="text-green-700 font-semibold">₹0 (Waived)</span>
                </div>
                <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-900">
                    Total Due
                  </span>
                  <span className="text-3xl font-bold text-gray-900">
                    {registration.totalAmount === 0
                      ? "FREE"
                      : `₹${registration.totalAmount}`}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handlePay}
                  disabled={isProcessing}
                  className="w-full py-3.5 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing Gateway Order...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>
                        {registration.totalAmount === 0
                          ? "Confirm Free Pass"
                          : `Pay ₹${registration.totalAmount} Now`}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRelease}
                  className="w-full py-2.5 text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
                >
                  Release Reservation & Return to Events
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 pt-2">
                <span>
                  Encrypted transaction • Verified payment confirmation
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Mock Payment Modal (for Local Dev & Demo) */}
      {mockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 sm:p-8 max-w-md w-full border border-gray-200 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  ₹
                </div>
                <h3 className="font-bold text-gray-900">
                  Mock Gateway Simulator
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                Local Dev Mode
              </span>
            </div>

            <p className="text-xs text-gray-500">
              You are running in mock payment mode. You can simulate a successful
              gateway response or test failure recovery without real money.
            </p>

            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Order ID:</span>
                <span className="font-mono text-gray-800 font-semibold">
                  {mockOrderDetails?.orderId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-bold text-gray-900">
                  ₹{mockOrderDetails?.amount}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleMockPaymentSuccess}
                disabled={isProcessing}
                className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simulate Successful Payment</span>
              </button>

              <button
                onClick={() => {
                  setMockModalOpen(false);
                  toast.error("Payment was cancelled or rejected by user.");
                }}
                className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-900"
              >
                Simulate Payment Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
