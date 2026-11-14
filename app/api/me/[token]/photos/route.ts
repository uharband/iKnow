import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { memberFromToken } from "@/lib/server/member";

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO = 1.5 * 1024 * 1024;
const MAX_PHOTOS_PER_PERSON = 10;

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const me = await memberFromToken(token);
  if (me instanceof NextResponse) return me;
  const mime = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const bytes = Buffer.from(await req.arrayBuffer());
  if (!PHOTO_TYPES.includes(mime)) return NextResponse.json({ error: "type" }, { status: 400 });
  if (!bytes.length || bytes.length > MAX_PHOTO) return NextResponse.json({ error: "size" }, { status: 413 });
  const count = await me.pool.query(`select count(*)::int as n from media where person_id = $1 and kind = 'photo'`, [me.id]);
  if (count.rows[0].n >= MAX_PHOTOS_PER_PERSON) return NextResponse.json({ error: "too-many" }, { status: 400 });
  const id = randomUUID();
  await me.pool.query(`insert into media (id, person_id, kind, mime, bytes) values ($1, $2, 'photo', $3, $4)`, [
    id,
    me.id,
    mime,
    bytes,
  ]);
  return NextResponse.json({ id });
}
