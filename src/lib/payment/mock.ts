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

export class MockPaymentProvider implements PaymentProvider {
  type = "mock" as const;
  private orders = new Map<
    string,
    {
      order: PaymentOrder;
      paymentId?: string;
      status: "CREATED" | "PENDING" | "CAPTURED" | "FAILED" | "REFUNDED";
    }
  >();

  async createOrder(params: CreateOrderParams): Promise<PaymentOrder> {
    const orderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const order: PaymentOrder = {
      orderId,
      amount: params.amount,
      currency: params.currency || "INR",
      provider: "mock",
      keyId: "rzp_test_mock_key",
      notes: params.notes,
      status: "CREATED",
    };

    this.orders.set(orderId, {
      order,
      status: "CREATED",
    });

    return order;
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    // In mock provider, any payment starting with "pay_mock" or "mock_pay" is accepted
    const isMockPayment =
      params.paymentId.startsWith("pay_mock_") ||
      params.paymentId.startsWith("mock_pay_") ||
      params.paymentId.length > 5;

    if (!isMockPayment) {
      return {
        isValid: false,
        orderId: params.orderId,
        paymentId: params.paymentId,
        status: "FAILED",
        error: "Invalid mock payment format",
      };
    }

    const record = this.orders.get(params.orderId);
    if (record) {
      record.paymentId = params.paymentId;
      record.status = "CAPTURED";
    }

    return {
      isValid: true,
      orderId: params.orderId,
      paymentId: params.paymentId,
      status: "CAPTURED",
      amount: record?.order.amount,
    };
  }

  async getPaymentStatus(orderId: string): Promise<PaymentStatusResult> {
    const record = this.orders.get(orderId);
    if (!record) {
      return {
        orderId,
        status: "FAILED",
        amount: 0,
      };
    }

    return {
      orderId,
      paymentId: record.paymentId,
      status: record.status as any,
      amount: record.order.amount,
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    return {
      success: true,
      refundId: `rfnd_mock_${Date.now()}`,
      amount: params.amount || 0,
      status: "PROCESSED",
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    return signature === "mock-webhook-signature" || signature.length > 0;
  }
}
