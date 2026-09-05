import { NextResponse } from "next/server";
import { aiCatalogService, type CatalogSearchFilter } from "@/app/lib/agentbuy";

/**
 * GET /api/catalog
 * Exposes machine-readable merchant catalog metadata, schema, and ground-truth inventory.
 */
export async function GET() {
  try {
    const summary = aiCatalogService.getSummary();
    const schema = aiCatalogService.getSchema();
    const products = aiCatalogService.search({ availability: "all" });

    return NextResponse.json({
      ok: true,
      summary,
      schema,
      count: products.length,
      products,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to load merchant catalog.",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/catalog
 * Structured backend search interface for AI agents.
 * Supports filtering by category, price bounds, features, availability, and intendedUse.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CatalogSearchFilter;
    const results = aiCatalogService.search(body);

    return NextResponse.json({
      ok: true,
      filterApplied: body,
      count: results.length,
      products: results,
      merchantVerified: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Catalog query failed.",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 400 }
    );
  }
}
