import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import crypto from "crypto";
import { aiCatalogService, checkPolicy, policy } from "@/app/lib/agentbuy";

export interface ApprovalCartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category: string;
  isUpsell: boolean;
}

export interface ApprovalPolicyChecks {
  withinSpendingLimit: boolean;
  productsVerified: boolean;
  stockVerified: boolean;
  upsellWithinLimit: boolean;
  humanApprovalRequired: boolean;
}

export interface ApprovalRecord {
  id: string;
  approvalToken: string;
  cart: {
    items: ApprovalCartItem[];
    subtotal: number;
    total: number;
  };
  policyChecks: ApprovalPolicyChecks;
  paymentMode: string;
  status: "approved" | "consumed" | "rejected";
  createdAt: string;
  expiresAt: string;
  consumedAt?: string;
  approvedBy: string;
}

const approvalsFilePath = path.join(process.cwd(), "data", "approvals.json");

// In-memory fallback / cache
const memoryApprovals = new Map<string, ApprovalRecord>();

function readApprovalsFromDisk(): Record<string, ApprovalRecord> {
  try {
    if (!existsSync(approvalsFilePath)) {
      mkdirSync(path.dirname(approvalsFilePath), { recursive: true });
      writeFileSync(approvalsFilePath, JSON.stringify({}, null, 2));
      return {};
    }
    const raw = readFileSync(approvalsFilePath, "utf-8");
    return JSON.parse(raw) as Record<string, ApprovalRecord>;
  } catch {
    const obj: Record<string, ApprovalRecord> = {};
    for (const [id, record] of memoryApprovals.entries()) {
      obj[id] = record;
    }
    return obj;
  }
}

function writeApprovalsToDisk(approvals: Record<string, ApprovalRecord>) {
  try {
    mkdirSync(path.dirname(approvalsFilePath), { recursive: true });
    writeFileSync(approvalsFilePath, JSON.stringify(approvals, null, 2));
  } catch {
    // Keep in memory
  }
  for (const [id, record] of Object.entries(approvals)) {
    memoryApprovals.set(id, record);
  }
}

export function recordApproval(params: {
  cart: Array<{
    id: string;
    name: string;
    quantity?: number;
    price: number;
    category?: string;
    isUpsell?: boolean;
  }>;
  total?: number;
  paymentMode?: string;
  approvedBy?: string;
}): { ok: boolean; approval?: ApprovalRecord; violations?: string[]; error?: string } {
  const { cart: inputItems, paymentMode = "razorpay_test", approvedBy = "human_buyer" } = params;

  if (!inputItems || inputItems.length === 0) {
    return { ok: false, error: "Cart is empty. Cannot approve an empty cart." };
  }

  const items: ApprovalCartItem[] = [];
  for (const item of inputItems) {
    const catalogItem = aiCatalogService.getById(item.id);
    if (!catalogItem) {
      return { ok: false, error: `Approval rejected: Product '${item.id}' is not in the verified merchant catalog.` };
    }
    items.push({
      id: catalogItem.id,
      name: catalogItem.name,
      quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
      price: catalogItem.price,
      category: catalogItem.category,
      isUpsell: Boolean(item.isUpsell),
    });
  }

  const calculatedSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = calculatedSubtotal;

  const violations: string[] = [];

  // Policy check 1: Within spending limit
  const withinSpendingLimit = total <= policy.maxOrderValue;
  if (!withinSpendingLimit) {
    violations.push(`Order total ₹${total.toLocaleString("en-IN")} exceeds the policy spending limit of ₹${policy.maxOrderValue.toLocaleString("en-IN")}.`);
  }

  // Policy check 2: Products verified in merchant catalog
  let productsVerified = true;
  let stockVerified = true;
  let upsellWithinLimit = true;

  const catalogProducts = aiCatalogService.search({ availability: "all" });

  for (const item of items) {
    const found = catalogProducts.find((p) => p.id === item.id);
    if (!found) {
      productsVerified = false;
      violations.push(`Product '${item.name}' (${item.id}) is not a merchant-verified catalog item.`);
    } else {
      if (found.stock <= 0 || found.availability === "out_of_stock") {
        stockVerified = false;
        violations.push(`Product '${item.name}' is out of stock in warehouse.`);
      }

      if (item.isUpsell && item.price > policy.maxUpsellValue) {
        upsellWithinLimit = false;
        violations.push(`Upsell item '${item.name}' (₹${item.price.toLocaleString("en-IN")}) exceeds the upsell cap of ₹${policy.maxUpsellValue.toLocaleString("en-IN")}.`);
      }
    }
  }

  const policyResult = checkPolicy(
    total,
    catalogProducts.find((product) => product.id === items[0].id)!,
    items.length > 1 ? catalogProducts.find((product) => product.id === items[1].id) : null,
  );
  for (const violation of policyResult.violations) {
    if (!violations.includes(violation)) violations.push(violation);
  }

  const policyChecks: ApprovalPolicyChecks = {
    withinSpendingLimit,
    productsVerified,
    stockVerified,
    upsellWithinLimit,
    humanApprovalRequired: true,
  };

  if (violations.length > 0) {
    return {
      ok: false,
      violations,
      error: "Approval rejected: Guardrail policy violations detected.",
    };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString(); // 30 minutes
  const id = `appr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const approvalToken = crypto
    .createHash("sha256")
    .update(`${id}:${total}:${expiresAt}:${approvedBy}`)
    .digest("hex");

  const approval: ApprovalRecord = {
    id,
    approvalToken,
    cart: {
      items,
      subtotal: calculatedSubtotal,
      total,
    },
    policyChecks,
    paymentMode,
    status: "approved",
    createdAt: now.toISOString(),
    expiresAt,
    approvedBy,
  };

  const store = readApprovalsFromDisk();
  store[id] = approval;
  writeApprovalsToDisk(store);

  return { ok: true, approval };
}

export function getApproval(approvalId: string): ApprovalRecord | undefined {
  if (!approvalId) return undefined;
  const store = readApprovalsFromDisk();
  return store[approvalId] || memoryApprovals.get(approvalId);
}

export function verifyAndConsumeApproval(
  approvalId: string,
  requestedTotal: number
): { valid: boolean; approval?: ApprovalRecord; error?: string } {
  if (!approvalId) {
    return {
      valid: false,
      error: "Human approval required: No approvalId provided. The AI is not permitted to create payments directly.",
    };
  }

  const approval = getApproval(approvalId);
  if (!approval) {
    return {
      valid: false,
      error: "Payment creation rejected: Approval record not found in server approval registry.",
    };
  }

  if (approval.status === "consumed") {
    return {
      valid: false,
      error: "Payment creation rejected: This approval record has already been consumed for a previous payment creation.",
    };
  }

  if (approval.status !== "approved") {
    return {
      valid: false,
      error: `Payment creation rejected: Approval status is '${approval.status}'. Explicit human approval is required.`,
    };
  }

  const now = new Date();
  if (new Date(approval.expiresAt) < now) {
    return {
      valid: false,
      error: "Payment creation rejected: Human approval has expired. Please re-approve before initiating payment.",
    };
  }

  // Allow small rounding tolerance (1 paisa)
  if (Math.abs(approval.cart.total - requestedTotal) > 0.01) {
    return {
      valid: false,
      error: `Payment creation rejected: Amount mismatch. Approved amount is ₹${approval.cart.total}, but requested payment amount is ₹${requestedTotal}.`,
    };
  }

  const currentCatalogTotal = approval.cart.items.reduce((sum, item) => {
    const currentProduct = aiCatalogService.getById(item.id);
    if (!currentProduct || currentProduct.price !== item.price) return NaN;
    return sum + currentProduct.price * item.quantity;
  }, 0);

  if (!Number.isFinite(currentCatalogTotal) || Math.abs(currentCatalogTotal - approval.cart.total) > 0.01) {
    return {
      valid: false,
      error: "Payment creation rejected: Cart prices changed after approval. Please rebuild the cart and request approval again.",
    };
  }

  // Mark as consumed
  approval.status = "consumed";
  approval.consumedAt = now.toISOString();

  const store = readApprovalsFromDisk();
  store[approval.id] = approval;
  writeApprovalsToDisk(store);

  return { valid: true, approval };
}
