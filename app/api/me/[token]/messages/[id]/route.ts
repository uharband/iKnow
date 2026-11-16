import { NextResponse } from "next/server";
import { memberFromToken } from "@/lib/server/member";

/** A family member deletes one message of their own conversation. It disappears for both sides. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const me = await memberFromToken(token);
  if (me instanceof NextResponse) return me;
  const r = await me.pool.query(`delete from messages where id = $1 and person_id = $2`, [id, me.id]);
  // A message the other side already deleted is simply gone; that is not an error.
  return NextResponse.json({ deleted: r.rowCount ?? 0 });
}
