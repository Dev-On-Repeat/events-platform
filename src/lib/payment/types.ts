export type PaymentProviderType = "razorpay" | "mock";

export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export interface CreateOrderParams {
  registrationId: string;
  eventId: string;
  amount: number; // in INR rupees
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
  customer?: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface PaymentOrder {
  orderId: string;
  amount: number; // in INR rupees
  currency: string;
  provider: PaymentProviderType;
  keyId?: string; // Client publishable key
  notes?: Record<string, string>;
  status: PaymentStatus;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature?: string;
}

export interface VerifyPaymentResult {
  isValid: boolean;
  orderId: string;
  paymentId: string;
  status: PaymentStatus;
  amount?: number;
  error?: string;
}

export interface PaymentStatusResult {
  orderId: string;
  paymentId?: string;
  status: PaymentStatus;
  amount: number;
}

export interface RefundParams {
  paymentId: string;
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount: number;
  status: "PENDING" | "PROCESSED" | "FAILED";
  error?: string;
}

export interface PaymentProvider {
  type: PaymentProviderType;
  createOrder(params: CreateOrderParams): Promise<PaymentOrder>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;
  getPaymentStatus(orderId: string): Promise<PaymentStatusResult>;
  refund(params: RefundParams): Promise<RefundResult>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}
