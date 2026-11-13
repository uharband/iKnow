import { NextResponse } from "next/server";
import { guard } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

const KEYS = ["playerHe", "playerEn"];

export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const pool = await db();
  for (const key of KEYS) {
    if (typeof b[key] !== "string") continue;
    await pool.query(
      `insert into settings (key, value) values ($1, $2::jsonb)
       on conflict (key) do update set value = excluded.value`,
      [key, JSON.stringify((b[key] as string).slice(0, 40))],
    );
  }
  return NextResponse.json({ ok: true });
}
