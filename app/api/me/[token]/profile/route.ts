import { NextResponse } from "next/server";
import { memberFromToken } from "@/lib/server/member";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** A family member may update only the parts of their profile that change over time. */
export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const me = await memberFromToken(token);
  if (me instanceof NextResponse) return me;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch = {
    nicknames: Array.isArray(b.nicknames) ? b.nicknames.map((n) => text(n, 40)).filter(Boolean).slice(0, 10) : [],
    note: text(b.note, 200),
    noteEn: text(b.noteEn, 200),
  };
  await me.pool.query(`update people set data = data || $2::jsonb where id = $1`, [me.id, JSON.stringify(patch)]);
  return NextResponse.json({ ok: true });
}
