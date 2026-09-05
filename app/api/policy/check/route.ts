import { NextResponse } from "next/server";
import { aiCatalogService, checkPolicy, type Product } from "@/app/lib/agentbuy";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      total?: number;
      items?: Product[];
      selectedProduct?: Product;
      upsell?: Product;
    };

    const selectedInput = body.selectedProduct ?? body.items?.[0];
    const upsellInput = body.upsell !== undefined ? body.upsell : (body.items && body.items.length > 1 ? body.items[1] : null);
    const selectedProduct = selectedInput ? aiCatalogService.getById(selectedInput.id) : undefined;
    const upsell = upsellInput ? aiCatalogService.getById(upsellInput.id) : null;
    const total = (selectedProduct?.price ?? 0) + (upsell?.price ?? 0);

    if (!selectedProduct) {
      return NextResponse.json({ ok: false, message: "Cart does not contain a primary product for policy validation." }, { status: 400 });
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
