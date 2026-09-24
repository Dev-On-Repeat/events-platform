import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payment/provider";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    const provider = getPaymentProvider();

    // 1. Signature Verification using Raw Body
    const isValid = provider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("Unauthorized webhook attempt - invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event;
    const eventId = payload.id || payload.payload?.payment?.entity?.id || `evt_${Date.now()}`;

    console.log(`Processing Razorpay webhook event: ${eventType} (ID: ${eventId})`);

    const convex = getConvexClient();

    // 2. Webhook Idempotency Check: Prevent duplicate webhook processing
    const alreadyProcessed = await convex.query(api.payments.isWebhookProcessed, {
      eventId,
    });
    if (alreadyProcessed) {
      console.log(`Webhook event ${eventId} already processed, skipping duplicate.`);
      return NextResponse.json(
        { status: "already_processed", received: true },
        { status: 200 }
      );
    }

    // 3. Confirm for payment.captured or order.paid
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || payload.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;
      const amountPaise = paymentEntity?.amount;
      const amountInRupees = amountPaise ? amountPaise / 100 : undefined;

      if (!orderId) {
        return NextResponse.json(
          { message: "No order ID in payload, ignoring" },
          { status: 200 }
        );
      }

      // Fast indexed query by orderId
      const matchingPayment: any = await convex.query(
        api.payments.getPaymentByOrderId,
        { orderId }
      );

      const registrationId =
        matchingPayment?.registrationId ||
        paymentEntity?.notes?.registrationId ||
        payload.payload?.order?.entity?.notes?.registrationId;

      if (registrationId) {
        const serverSecret = process.env.AUTH_SECRET || "internal_hackb4_secret";

        // Atomic Confirmation in Convex (idempotent, won't duplicate tickets if already processed)
        await convex.mutation(api.payments.confirmPaymentAndIssueTickets, {
          registrationId,
          orderId,
          paymentId: paymentId || matchingPayment?.paymentId || `pay_${orderId}`,
          amount: amountInRupees,
          provider: "razorpay",
          serverSecret,
        });

        // Record webhook as processed for idempotency
        await convex.mutation(api.payments.recordWebhookProcessed, {
          eventId,
          eventType,
          status: "SUCCESS",
        });
      } else {
        console.warn(`Webhook received for order ${orderId}, but no registrationId could be located in DB or notes.`);
      }
    }

    return NextResponse.json({ status: "success", received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    // Return 200 to prevent webhook delivery loops from Razorpay while logging error
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
