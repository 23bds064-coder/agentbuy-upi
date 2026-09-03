import { NextResponse } from "next/server";
import {
  buildConditionNotification,
  saveAppData,
  type Condition,
} from "@/app/lib/agentbuy";
import { readAppDataFromDisk, writeAppDataToDisk } from "@/app/lib/store";

export async function GET() {
  const data = readAppDataFromDisk();
  return NextResponse.json({ conditions: data.conditions, notifications: data.notifications });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Condition> & {
      product?: string;
      targetPrice?: number;
      store?: string;
      distanceKm?: number;
      stockAvailable?: boolean;
    };

    const state = readAppDataFromDisk();
    const newCondition: Condition = {
      id: `cond-${Date.now()}`,
      type: body.type ?? "product",
      title: body.title ?? "Custom condition",
      product: body.product ?? "iPhone 17 Pro",
      targetPrice: body.targetPrice,
      store: body.store,
      distanceKm: body.distanceKm,
      stockAvailable: body.stockAvailable,
      enabled: body.enabled ?? true,
      createdAt: new Date().toISOString(),
      frequency: body.frequency ?? "instant",
    };

    const nextConditions = [newCondition, ...state.conditions];
    const notification = buildConditionNotification(newCondition);
    const nextNotifications = notification ? [notification, ...state.notifications] : state.notifications;

    const next = {
      ...state,
      conditions: nextConditions,
      notifications: nextNotifications,
    };

    saveAppData(next);
    writeAppDataToDisk(next);

    return NextResponse.json({ ok: true, condition: newCondition, notification });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unable to create condition",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 400 }
    );
  }
}
