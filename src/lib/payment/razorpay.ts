import Razorpay from "razorpay";
import crypto from "crypto";
import {
  PaymentProvider,
  CreateOrderParams,
  PaymentOrder,
  VerifyPaymentParams,
  VerifyPaymentResult,
  PaymentStatusResult,
  RefundParams,
  RefundResult,
} from "./types";

export class RazorpayProvider implements PaymentProvider {
  type = "razorpay" as const;
  private client: Razorpay;
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || process.env.PAYMENT_KEY_ID || "";
    this.keySecret =
      process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_KEY_SECRET || "";
    this.webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      process.env.PAYMENT_WEBHOOK_SECRET ||
      "";

    this.client = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  async createOrder(params: CreateOrderParams): Promise<PaymentOrder> {
    if (!this.keyId || !this.keySecret) {
      throw new Error(
        "Razorpay credentials missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET or use PAYMENT_MODE=mock."
      );
    }

    // Razorpay requires amounts in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(params.amount * 100);

    const order = await this.client.orders.create({
      amount: amountInPaise,
      currency: params.currency || "INR",
      receipt: params.receipt,
      notes: {
        registrationId: params.registrationId,
        eventId: params.eventId,
        ...params.notes,
      },
    });

    return {
      orderId: order.id,
      amount: params.amount,
      currency: params.currency || "INR",
      provider: "razorpay",
      keyId: this.keyId,
      notes: params.notes,
      status: "CREATED",
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    if (!params.signature) {
      return {
        isValid: false,
        orderId: params.orderId,
        paymentId: params.paymentId,
        status: "FAILED",
        error: "Missing payment signature from gateway",
      };
    }

    try {
      const generatedSignature = crypto
        .createHmac("sha256", this.keySecret)
        .update(`${params.orderId}|${params.paymentId}`)
        .digest("hex");

      const isValid = generatedSignature === params.signature;

      if (!isValid) {
        return {
          isValid: false,
          orderId: params.orderId,
          paymentId: params.paymentId,
          status: "FAILED",
          error: "Invalid Razorpay payment signature",
        };
      }

      // Fetch payment from Razorpay API to confirm capture status
      const payment: any = await this.client.payments.fetch(params.paymentId);
      const isCaptured = payment.status === "captured";

      return {
        isValid: true,
        orderId: params.orderId,
        paymentId: params.paymentId,
        status: isCaptured ? "CAPTURED" : "AUTHORIZED",
        amount: payment.amount ? payment.amount / 100 : undefined,
      };
    } catch (err: any) {
      return {
        isValid: false,
        orderId: params.orderId,
        paymentId: params.paymentId,
        status: "FAILED",
        error: err.message || "Failed to verify Razorpay payment",
      };
    }
  }

  async getPaymentStatus(orderId: string): Promise<PaymentStatusResult> {
    try {
      const order = await this.client.orders.fetch(orderId);
      const payments = await this.client.orders.fetchPayments(orderId);

      let status = "PENDING" as any;
      let paymentId = undefined;

      if (order.status === "paid") {
        status = "CAPTURED";
      } else if (order.status === "attempted") {
        status = "AUTHORIZED";
      }

      if (payments.items && payments.items.length > 0) {
        paymentId = payments.items[0].id;
      }

      return {
        orderId,
        paymentId,
        status,
        amount: Number(order.amount) / 100,
      };
    } catch (err: any) {
      return {
        orderId,
        status: "FAILED",
        amount: 0,
      };
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    try {
      const refundOptions: any = {
        notes: { reason: params.reason || "Event refund" },
      };

      if (params.amount) {
        refundOptions.amount = Math.round(params.amount * 100);
      }

      const refund = await this.client.payments.refund(
        params.paymentId,
        refundOptions
      );

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount ? refund.amount / 100 : params.amount || 0,
        status: "PROCESSED",
      };
    } catch (err: any) {
      return {
        success: false,
        amount: params.amount || 0,
        status: "FAILED",
        error: err.message || "Refund failed",
      };
    }
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret || !signature) return false;

    try {
      const expectedSignature = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(rawBody)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(signature, "utf-8"),
        Buffer.from(expectedSignature, "utf-8")
      );
    } catch {
      return false;
    }
  }
}
