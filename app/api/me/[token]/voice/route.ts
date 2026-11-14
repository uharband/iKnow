import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { memberFromToken } from "@/lib/server/member";

const MAX_VOICE = 4 * 1024 * 1024;

type Ctx = { params: Promise<{ token: string }> };

/** The member's own voice greeting ("Hi Grandma, it's me…"). A new one replaces the previous one. */
export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  const me = await memberFromToken(token);
  if (me instanceof NextResponse) return me;
  const mime = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const bytes = Buffer.from(await req.arrayBuffer());
  // Recordings arrive in many containers (WhatsApp voice notes are ogg/opus, phones record m4a or webm).
  if (!/^(audio|video)\/[\w.+-]+$/.test(mime) && mime !== "application/ogg") {
    return NextResponse.json({ error: "type" }, { status: 400 });
  }
  if (!bytes.length || bytes.length > MAX_VOICE) return NextResponse.json({ error: "size" }, { status: 413 });
  const id = randomUUID();
  await me.pool.query(`delete from media where person_id = $1 and kind = 'voice'`, [me.id]);
  await me.pool.query(`insert into media (id, person_id, kind, mime, bytes) values ($1, $2, 'voice', $3, $4)`, [
    id,
    me.id,
    mime,
    bytes,
  ]);
  return NextResponse.json({ id });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const me = await memberFromToken(token);
  if (me instanceof NextResponse) return me;
  await me.pool.query(`delete from media where person_id = $1 and kind = 'voice'`, [me.id]);
  return NextResponse.json({ ok: true });
}
