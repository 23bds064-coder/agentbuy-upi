export type ConditionType = "product" | "local";
export type PaymentStatus = "Successful" | "Pending" | "Failed";

export interface Condition {
  id: string;
  type: ConditionType;
  title: string;
  product: string;
  targetPrice?: number;
  store?: string;
  distanceKm?: number;
  stockAvailable?: boolean;
  enabled: boolean;
  createdAt: string;
  frequency: "instant" | "daily";
}

export interface Notification {
  id: string;
  title: string;
  product: string;
  price: string;
  target: string;
  location?: string;
  type: ConditionType;
  createdAt: string;
  conditionId: string;
}

export interface PaymentRecord {
  id: string;
  merchant: string;
  amount: number;
  status: PaymentStatus;
  date: string;
  method: "UPI" | "Other";
  item: string;
}

export interface AppData {
  balance: number;
  conditions: Condition[];
  notifications: Notification[];
  payments: PaymentRecord[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  features: string[];
  stock: number;
  description: string;
}

export interface Recommendation {
  query: string;
  budget?: number;
  matchedProducts: Product[];
  selectedProduct: Product;
  upsell: Product;
  reasoning: string[];
  total: number;
  uplift: number;
  policy: {
    ok: boolean;
    violations: string[];
    maxOrderValue: number;
    maxUpsellValue: number;
    requireHumanApproval: boolean;
  };
  auditTrail: string[];
}

export const storageKey = "agentbuy-upi-state";

export const catalog: Product[] = [
  {
    id: "sony-wh-1000xm5",
    name: "Sony WH-1000XM5",
    price: 29990,
    category: "audio",
    features: ["active noise cancellation", "wireless", "travel", "premium audio"],
    stock: 12,
    description: "Premium noise-cancelling headphones for commuters and travelers.",
  },
  {
    id: "airpods-pro",
    name: "AirPods Pro",
    price: 24900,
    category: "audio",
    features: ["active noise cancellation", "wireless", "water resistant", "travel"],
    stock: 8,
    description: "Compact premium earbuds with strong travel performance.",
  },
  {
    id: "jbl-tune-770nc",
    name: "JBL Tune 770NC",
    price: 7999,
    category: "audio",
    features: ["noise cancellation", "wireless", "budget choice"],
    stock: 21,
    description: "Budget-friendly wireless headphones with reliable noise control.",
  },
  {
    id: "laptop-stand",
    name: "Laptop Stand",
    price: 2499,
    category: "accessory",
    features: ["travel", "workspace", "ergonomic"],
    stock: 35,
    description: "Travel-friendly desk accessory for work setups and productivity.",
  },
  {
    id: "usb-c-hub",
    name: "USB-C Hub",
    price: 2999,
    category: "accessory",
    features: ["workstation", "productivity"],
    stock: 19,
    description: "Adds expansion ports for hybrid work and mobile setups.",
  },
  {
    id: "wireless-charger",
    name: "Wireless Charger",
    price: 1999,
    category: "accessory",
    features: ["desk", "charging"],
    stock: 28,
    description: "Fast charge stand for phones and earbuds.",
  },
  {
    id: "smart-watch",
    name: "Smart Watch",
    price: 14999,
    category: "wearable",
    features: ["fitness", "notifications", "music"],
    stock: 15,
    description: "Connected wearable for health, notifications, and workouts.",
  },
  {
    id: "portable-speaker",
    name: "Portable Speaker",
    price: 4999,
    category: "audio",
    features: ["bluetooth", "outdoor", "travel"],
    stock: 17,
    description: "Compact speaker for casual listening and travel moments.",
  },
  {
    id: "gaming-mouse",
    name: "Gaming Mouse",
    price: 3499,
    category: "accessory",
    features: ["gaming", "precision", "workstation"],
    stock: 24,
    description: "Precision input device for gaming and productivity.",
  },
  {
    id: "travel-pillow",
    name: "Travel Pillow",
    price: 1299,
    category: "travel",
    features: ["comfort", "flight", "sleep"],
    stock: 42,
    description: "Compact neck support for longer flights and road trips.",
  },
  {
    id: "noise-canceling-earbuds",
    name: "Noise Cancelling Earbuds",
    price: 18999,
    category: "audio",
    features: ["noise cancellation", "wireless", "budget"],
    stock: 10,
    description: "Compact earbuds tuned for commuting and travel listening.",
  },
  {
    id: "premium-travel-case",
    name: "Premium Travel Case",
    price: 2199,
    category: "travel",
    features: ["protection", "carry", "premium"],
    stock: 30,
    description: "Protective premium case for electronics and accessories.",
  },
];

export const policy = {
  maxOrderValue: 30000,
  maxUpsellValue: 5000,
  requireHumanApproval: true,
  allowedPaymentMode: "razorpay_test",
  autoSelectProduct: true,
  autoAddUpsell: true,
} as const;

export const seedConditions: Condition[] = [];
export const seedNotifications: Notification[] = [];
export const seedPayments: PaymentRecord[] = [];

export const seedData: AppData = {
  balance: 25450,
  conditions: seedConditions,
  notifications: seedNotifications,
  payments: seedPayments,
};

export function loadAppData(): AppData {
  if (typeof window === "undefined") return seedData;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return seedData;

    const parsed = JSON.parse(raw) as AppData;
    if (!parsed || !Array.isArray(parsed.conditions) || !Array.isArray(parsed.notifications)) {
      return seedData;
    }

    return parsed;
  } catch {
    return seedData;
  }
}

export function saveAppData(data: AppData) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, JSON.stringify(data));
  }
}

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function extractBudget(query: string): number | undefined {
  const match = query.match(/(?:under|below|within|upto|up to|less than|<=|max)\s*₹?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+)/i);
  if (!match) {
    const fallback = query.match(/₹?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+)/i);
    if (!fallback) return undefined;
    return Number(fallback[1].replace(/,/g, ""));
  }

  return Number(match[1].replace(/,/g, ""));
}

export function searchCatalog(query: string): Product[] {
  const normalized = normalizeText(query);
  const terms = normalized.split(" ").filter(Boolean);

  return catalog
    .map((product) => {
      const haystack = `${product.name} ${product.category} ${product.description} ${product.features.join(" ")}`.toLowerCase();
      const score = terms.reduce((total, term) => {
        if (!term) return total;
        if (product.name.toLowerCase().includes(term) || product.category.toLowerCase().includes(term)) {
          return total + 3;
        }
        if (haystack.includes(term)) {
          return total + 1;
        }
        return total;
      }, 0);

      return { product, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product);
}

export function checkPolicy(total: number, selectedProduct: Product, upsell: Product) {
  const violations: string[] = [];

  if (total > policy.maxOrderValue) {
    violations.push(`Order total ₹${total.toLocaleString("en-IN")} exceeds the ₹${policy.maxOrderValue.toLocaleString("en-IN")} policy cap.`);
  }

  if (selectedProduct.stock <= 0) {
    violations.push(`${selectedProduct.name} is out of stock.`);
  }

  if (upsell.price > policy.maxUpsellValue) {
    violations.push(`${upsell.name} exceeds the ₹${policy.maxUpsellValue.toLocaleString("en-IN")} upsell cap.`);
  }

  if (upsell.stock <= 0) {
    violations.push(`${upsell.name} is out of stock.`);
  }

  return {
    ok: violations.length === 0,
    violations,
    maxOrderValue: policy.maxOrderValue,
    maxUpsellValue: policy.maxUpsellValue,
    requireHumanApproval: policy.requireHumanApproval,
  };
}

export function buildRecommendation(query: string): Recommendation {
  const budget = extractBudget(query) ?? 25000;
  const matchedProducts = searchCatalog(query)
    .filter((product) => product.price <= budget && (product.category === "audio" || product.category === "travel" || product.category === "wearable"));

  const audioOptions = catalog
    .filter((product) => product.category === "audio" && product.stock > 0)
    .sort((a, b) => b.price - a.price);

  const shouldFailBudget = budget > policy.maxOrderValue;

  const selectedProduct = shouldFailBudget
    ? audioOptions.find((product) => product.price >= policy.maxOrderValue * 0.8) ?? audioOptions[0]
    : matchedProducts.find((product) => product.name.toLowerCase().includes("airpods") || product.name.toLowerCase().includes("headphone")) ??
      matchedProducts[0] ??
      audioOptions[0] ??
      catalog[0];

  const upsell = catalog.find(
    (product) =>
      product.category === "accessory" &&
      product.stock > 0 &&
      product.price <= policy.maxUpsellValue &&
      product.features.some((feature) => /travel|work|desk|workspace|productivity/i.test(feature))
  ) ?? {
    ...catalog.find((product) => product.category === "accessory")!,
  };

  const total = selectedProduct.price + upsell.price;
  const policyResult = checkPolicy(total, selectedProduct, upsell);

  const reasoning = [
    `Category identified: ${selectedProduct.category}`,
    `Budget identified: ₹${budget.toLocaleString("en-IN")}`,
    `${matchedProducts.length || 1} products matched the intent`,
    `Best match selected: ${selectedProduct.name} — ₹${selectedProduct.price.toLocaleString("en-IN")}`,
    `Upsell matched: ${upsell.name} — ₹${upsell.price.toLocaleString("en-IN")}`,
    `Policy check: ${policyResult.ok ? "PASS" : "FAIL"}`,
  ];

  const uplift = Number((((upsell.price / selectedProduct.price) * 100) || 0).toFixed(1));

  const auditTrail = [
    "USER REQUEST",
    `"${query}"`,
    "CATALOG SEARCH",
    `${catalog.length} products evaluated`,
    "CONSTRAINT CHECK",
    `Budget: ${budget <= policy.maxOrderValue ? "PASS" : "FAIL"}`,
    `Stock: ${selectedProduct.stock > 0 && upsell.stock > 0 ? "PASS" : "FAIL"}`,
    "PRODUCT SELECTION",
    selectedProduct.name,
    "UPSELL",
    `${upsell.name} — contextual relevance + in-stock`,
    "USER APPROVAL",
    policy.requireHumanApproval ? "Required" : "Not required",
    "PAYMENT",
    policy.allowedPaymentMode,
    "ORDER CREATED",
  ];

  return {
    query,
    budget,
    matchedProducts,
    selectedProduct,
    upsell,
    reasoning,
    total,
    uplift,
    policy: {
      ok: policyResult.ok,
      violations: policyResult.violations,
      maxOrderValue: policyResult.maxOrderValue,
      maxUpsellValue: policyResult.maxUpsellValue,
      requireHumanApproval: policyResult.requireHumanApproval,
    },
    auditTrail,
  };
}

export function buildConditionNotification(condition: Condition): Notification | null {
  if (!condition.enabled) return null;

  if (condition.type === "product" && typeof condition.targetPrice === "number") {
    const target = condition.targetPrice;
    const product = catalog.find((item) => item.name.toLowerCase() === condition.product.toLowerCase());
    if (product && product.price <= target) {
      return {
        id: `ntf-${condition.id}`,
        title: "Price condition met",
        product: condition.product,
        price: `₹${product.price.toLocaleString("en-IN")}`,
        target: `Target: ₹${target.toLocaleString("en-IN")}`,
        type: "product",
        createdAt: new Date().toISOString(),
        conditionId: condition.id,
      };
    }
  }

  return null;
}

export function createPaymentRecord(item: string, amount: number, method: "UPI" | "Other"): PaymentRecord {
  return {
    id: `pay-${Date.now()}`,
    merchant: "AgentBuy Merchant",
    amount,
    status: "Successful",
    date: new Date().toISOString(),
    method,
    item,
  };
}
