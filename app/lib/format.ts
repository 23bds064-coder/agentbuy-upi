/** Formats a number as Indian Rupee string, e.g. 26399 → "₹26,399" */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** Formats as +₹X,XXX for uplift/upsell */
export function formatINRPlus(amount: number): string {
  return `+₹${amount.toLocaleString("en-IN")}`;
}

/** Formats a percentage, e.g. 6.0 → "+6.0%" */
export function formatUplift(pct: number): string {
  return `+${pct.toFixed(1)}%`;
}
