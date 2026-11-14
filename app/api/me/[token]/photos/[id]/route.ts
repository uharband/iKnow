import { NextResponse } from "next/server";
import { memberFromToken } from "@/lib/server/member";

export async function DELETE(_req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const me = await memberFromToken(token);
  if (me instanceof NextResponse) return me;
  await me.pool.query(`delete from media where id = $1 and person_id = $2 and kind = 'photo'`, [id, me.id]);
  return NextResponse.json({ ok: true });
}
