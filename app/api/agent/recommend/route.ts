import { NextResponse } from "next/server";
import { buildRecommendation } from "@/app/lib/agentbuy";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string };
    const query = (body.query ?? "Noise cancelling headphones under ₹25,000 for travel").trim();

    if (!query) {
      return NextResponse.json({ ok: false, message: "A buyer request is required." }, { status: 400 });
    }

    const recommendation = buildRecommendation(query);
    return NextResponse.json({ ok: true, recommendation });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unable to generate an agent recommendation.",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 400 }
    );
  }
}
