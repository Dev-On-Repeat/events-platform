import { PaymentProvider } from "./types";
import { RazorpayProvider } from "./razorpay";
import { MockPaymentProvider } from "./mock";

let razorpayInstance: RazorpayProvider | null = null;
let mockInstance: MockPaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  const mode = process.env.PAYMENT_MODE || "mock";

  if (mode === "razorpay") {
    if (!razorpayInstance) {
      razorpayInstance = new RazorpayProvider();
    }
    return razorpayInstance;
  }

  if (!mockInstance) {
    mockInstance = new MockPaymentProvider();
  }
  return mockInstance;
}
