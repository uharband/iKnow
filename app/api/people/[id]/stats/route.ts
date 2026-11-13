import { NextResponse } from "next/server";
import { guard } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
  const stats = { level: num(b.level, 3), seen: num(b.seen, 1e9), lastSeen: num(b.lastSeen, 1e14) };
  const pool = await db();
  await pool.query(`update people set data = data || $2::jsonb where id = $1`, [id, JSON.stringify(stats)]);
  return NextResponse.json({ ok: true });
}
