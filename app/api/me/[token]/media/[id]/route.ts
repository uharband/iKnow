import { NextResponse } from "next/server";
import { memberFromToken } from "@/lib/server/member";
import { audioResponse } from "@/lib/server/messages";

/** One of the member's own photos, their own voice greeting, or a recording from their own conversation. Nothing else. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const me = await memberFromToken(token);
  if (me instanceof NextResponse) return me;
  const own = await me.pool.query(`select mime, bytes from media where id = $1 and person_id = $2`, [
    id,
    me.id,
  ]);
  if (own.rowCount) {
    return new NextResponse(own.rows[0].bytes, {
      headers: {
        "Content-Type": own.rows[0].mime,
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return audioResponse(me.pool, id, me.id);
}
