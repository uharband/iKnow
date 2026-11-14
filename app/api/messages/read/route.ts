import { NextResponse } from "next/server";
import { guard } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { markRead } from "@/lib/server/messages";

/** The player opened a conversation: what the family member wrote is now read. */
export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const person = new URL(req.url).searchParams.get("person") || "";
  await markRead(await db(), person, false);
  return NextResponse.json({ ok: true });
}
