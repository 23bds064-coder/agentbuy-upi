import { NextResponse } from "next/server";
import { checkPolicy, type Product } from "@/app/lib/agentbuy";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      total?: number;
      items?: Product[];
      selectedProduct?: Product;
      upsell?: Product;
    };

    const selectedProduct = body.selectedProduct ?? body.items?.[0];
    const upsell = body.upsell ?? body.items?.[1];
    const total = Number(body.total ?? (selectedProduct && upsell ? selectedProduct.price + upsell.price : 0));

    if (!selectedProduct || !upsell) {
      return NextResponse.json({ ok: false, message: "Cart does not contain the required items for policy validation." }, { status: 400 });
    }

    const policyResult = checkPolicy(total, selectedProduct, upsell);
    return NextResponse.json({
      ok: policyResult.ok,
      message: policyResult.ok ? "Policy check passed." : "Policy check failed.",
      violations: policyResult.violations,
      policy: policyResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Policy validation failed.",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 400 }
    );
  }
}
