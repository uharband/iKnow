import { NextResponse } from "next/server";
import { memberFromToken } from "@/lib/server/member";
import { audioResponse } from "@/lib/server/messages";

/** One of the member's own photos, or a recording from their own conversation. Nothing else. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const me = await memberFromToken(token);
  if (me instanceof NextResponse) return me;
  const photo = await me.pool.query(`select mime, bytes from media where id = $1 and person_id = $2 and kind = 'photo'`, [
    id,
    me.id,
  ]);
  if (photo.rowCount) {
    return new NextResponse(photo.rows[0].bytes, {
      headers: {
        "Content-Type": photo.rows[0].mime,
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return audioResponse(me.pool, id, me.id);
}
