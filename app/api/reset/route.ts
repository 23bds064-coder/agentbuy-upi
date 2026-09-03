import { NextResponse } from "next/server";
import { saveAppData, seedData } from "@/app/lib/agentbuy";
import { writeAppDataToDisk } from "@/app/lib/store";

export async function POST() {
  saveAppData(seedData);
  writeAppDataToDisk(seedData);
  return NextResponse.json({ ok: true, message: "State reset to seed data" });
}
