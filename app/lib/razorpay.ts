import crypto from "crypto";

export interface RazorpayOrder {
  id: string;
  entity: "order";
  amount: number; // in paise
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: "created" | "attempted" | "paid";
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_agentbuy_demo";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "agentbuy_test_secret_key_12345";
  return { keyId, keySecret };
}

/**
 * Server-Side Razorpay Test Order Creator
 * Strictly runs in test/sandbox mode with test currency and paise conversion.
 */
export function createRazorpayTestOrder(params: {
  amountInRupees: number;
  receipt?: string;
  notes?: Record<string, string>;
}): RazorpayOrder {
  const { amountInRupees, receipt, notes = {} } = params;
  const amountInPaise = Math.round(amountInRupees * 100);

  const orderId = `order_test_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  return {
    id: orderId,
    entity: "order",
    amount: amountInPaise,
    amount_paid: 0,
    amount_due: amountInPaise,
    currency: "INR",
    receipt: receipt || `rcpt_${Date.now()}`,
    status: "created",
    attempts: 0,
    notes: {
      ...notes,
      mode: "razorpay_test",
      environment: "sandbox",
    },
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Razorpay Test-Mode Signature Verification
 * Follows Razorpay's HMAC-SHA256 protocol: HMAC_SHA256(order_id + "|" + payment_id, secret)
 */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { orderId, paymentId, signature } = params;
  if (!orderId || !paymentId || !signature) return false;

  const { keySecret } = getRazorpayCredentials();

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "utf-8"),
      Buffer.from(expectedSignature, "utf-8")
    );
  } catch {
    return signature === expectedSignature;
  }
}

/**
 * Generates an authentic test signature for checkout simulation
 */
export function generateTestSignature(orderId: string, paymentId: string): string {
  const { keySecret } = getRazorpayCredentials();
  return crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

/**
 * Safely exports frontend-accessible configuration (Key ID only, NEVER Key Secret)
 */
export function getClientPaymentConfig() {
  const { keyId } = getRazorpayCredentials();
  return {
    keyId,
    mode: "razorpay_test" as const,
    currency: "INR",
    isSandbox: true,
  };
}
