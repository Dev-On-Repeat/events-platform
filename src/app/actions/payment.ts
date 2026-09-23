"use server";

import { getPaymentProvider } from "@/lib/payment/provider";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function initiatePaymentOrder(registrationId: string) {
  try {
    const convex = getConvexClient();

    // 1. Fetch registration from Convex
    const registration: any = await convex.query(api.registrations.getById, {
      registrationId: registrationId as Id<"registrations">,
    });

    if (!registration) {
      throw new Error("Registration not found");
    }

    if (
      registration.status !== "HELD" &&
      registration.status !== "PAYMENT_PENDING"
    ) {
      throw new Error(
        `Cannot initiate payment. Registration is in status '${registration.status}'.`
      );
    }

    if (registration.offerExpiresAt && Date.now() > registration.offerExpiresAt) {
      throw new Error("Your 10-minute ticket offer has expired.");
    }

    // 2. Call decoupled PaymentProvider
    const provider = getPaymentProvider();
    const order = await provider.createOrder({
      registrationId: registration._id,
      eventId: registration.eventId,
      amount: registration.totalAmount,
      currency: registration.currency || "INR",
      receipt: `rcpt_${registration._id.substring(0, 10)}`,
      notes: {
        eventName: registration.event?.name || "Event",
        attendeeName: registration.primaryParticipant.fullName,
      },
      customer: {
        name: registration.primaryParticipant.fullName,
        email: registration.primaryParticipant.email,
        phone: registration.primaryParticipant.phone,
      },
    });

    // 3. Record order in Convex
    await convex.mutation(api.payments.recordOrder, {
      registrationId: registration._id,
      eventId: registration.eventId,
      orderId: order.orderId,
      provider: order.provider,
      amount: order.amount,
      currency: order.currency,
    });

    return {
      success: true,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      provider: order.provider,
      keyId: order.keyId,
      customer: {
        name: registration.primaryParticipant.fullName,
        email: registration.primaryParticipant.email,
        phone: registration.primaryParticipant.phone,
      },
      eventName: registration.event?.name,
    };
  } catch (error: any) {
    console.error("Error initiating payment order:", error);
    return {
      success: false,
      error: error.message || "Failed to initiate payment",
    };
  }
}

export async function verifyAndConfirmPayment(params: {
  registrationId: string;
  orderId: string;
  paymentId: string;
  signature?: string;
}) {
  try {
    const convex = getConvexClient();
    const provider = getPaymentProvider();

    // 1. Fetch Authoritative Registration from Database
    const registration: any = await convex.query(api.registrations.getById, {
      registrationId: params.registrationId as Id<"registrations">,
    });

    if (!registration) {
      throw new Error("Registration not found");
    }

    // 2. Order Matching Protection
    if (registration.paymentOrderId && registration.paymentOrderId !== params.orderId) {
      throw new Error("Payment order ID mismatch. Tampering detected.");
    }

    // 3. Expiration Check
    if (
      registration.status === "EXPIRED" ||
      registration.status === "CANCELLED"
    ) {
      throw new Error(
        "RESERVATION_EXPIRED: Ticket hold window expired before payment confirmation. Spot was reallocated to queue."
      );
    }

    // 4. Rigorous Server-Side Verification: NEVER trust client alone
    const verification = await provider.verifyPayment({
      orderId: params.orderId,
      paymentId: params.paymentId,
      signature: params.signature,
    });

    if (!verification.isValid) {
      throw new Error(verification.error || "Payment signature verification failed.");
    }

    // 5. Authoritative Amount Check
    const authoritativeAmount = registration.totalAmount;
    if (
      verification.amount !== undefined &&
      Math.round(verification.amount) !== Math.round(authoritativeAmount)
    ) {
      throw new Error(
        `PAYMENT_AMOUNT_MISMATCH: Authoritative price is ₹${authoritativeAmount}, but gateway reported ₹${verification.amount}.`
      );
    }

    // 6. Atomic Confirmation in Convex with Internal Server Secret
    const serverSecret = process.env.AUTH_SECRET || "internal_hackb4_secret";
    const result: any = await convex.mutation(
      api.payments.confirmPaymentAndIssueTickets,
      {
        registrationId: params.registrationId as Id<"registrations">,
        orderId: params.orderId,
        paymentId: params.paymentId,
        amount: verification.amount ?? authoritativeAmount,
        signature: params.signature,
        provider: provider.type,
        serverSecret,
      }
    );

    return {
      success: true,
      ticketIds: result.ticketIds,
    };
  } catch (error: any) {
    console.error("Payment confirmation failed:", error);
    return {
      success: false,
      error: error.message || "Payment verification failed",
    };
  }
}
