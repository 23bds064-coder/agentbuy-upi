import { NextResponse } from "next/server";
import { seedData, storageKey } from "@/app/lib/agentbuy";

export async function GET() {
  return NextResponse.json({
    message: "Seed data ready",
    data: seedData,
    storageKey,
  });
}
