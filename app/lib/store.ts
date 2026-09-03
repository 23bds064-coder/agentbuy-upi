import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { seedData, type AppData } from "@/app/lib/agentbuy";

const dataFilePath = path.join(process.cwd(), "data", "agentbuy.json");

export function readAppDataFromDisk(): AppData {
  try {
    if (!existsSync(dataFilePath)) {
      mkdirSync(path.dirname(dataFilePath), { recursive: true });
      writeFileSync(dataFilePath, JSON.stringify(seedData, null, 2));
      return seedData;
    }

    const raw = readFileSync(dataFilePath, "utf-8");
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed || !Array.isArray(parsed.conditions) || !Array.isArray(parsed.notifications)) {
      return seedData;
    }

    return parsed;
  } catch {
    return seedData;
  }
}

export function writeAppDataToDisk(data: AppData) {
  try {
    mkdirSync(path.dirname(dataFilePath), { recursive: true });
    writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  } catch {
    // no-op: fallback to in-memory localStorage on client routes
  }
}
