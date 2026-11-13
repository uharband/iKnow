import { NextResponse } from "next/server";
import { guard } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string }> };

/** Photos and recordings are only ever served to a signed-in device, never from a public address. */
export async function GET(_req: Request, { params }: Ctx) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;
  const pool = await db();
  const r = await pool.query(`select mime, bytes from media where id = $1`, [id]);
  if (!r.rowCount) return new NextResponse(null, { status: 404 });
  return new NextResponse(r.rows[0].bytes, {
    headers: {
      "Content-Type": r.rows[0].mime,
      "Content-Length": String(r.rows[0].bytes.length),
      // A media id never changes its content, so the tablet can keep it for good.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;
  const pool = await db();
  await pool.query(`delete from media where id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
