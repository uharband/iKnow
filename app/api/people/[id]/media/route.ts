import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { guard } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO = 1.5 * 1024 * 1024;
const MAX_VOICE = 4 * 1024 * 1024;
const MAX_PHOTOS_PER_PERSON = 10;

/** Upload one photo, or the voice greeting (which replaces the previous one). The body is the raw file. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;
  const kind = new URL(req.url).searchParams.get("kind");
  const mime = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const bytes = Buffer.from(await req.arrayBuffer());
  const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

  if (kind === "photo") {
    if (!PHOTO_TYPES.includes(mime)) return bad("type");
    if (!bytes.length || bytes.length > MAX_PHOTO) return bad("size", 413);
  } else if (kind === "voice") {
    // Recordings arrive in many containers (WhatsApp voice notes are ogg/opus, phones record m4a or webm).
    if (!/^(audio|video)\/[\w.+-]+$/.test(mime) && mime !== "application/ogg") return bad("type");
    if (!bytes.length || bytes.length > MAX_VOICE) return bad("size", 413);
  } else return bad("kind");

  const pool = await db();
  const person = await pool.query(`select 1 from people where id = $1`, [id]);
  if (!person.rowCount) return bad("person", 404);
  if (kind === "voice") {
    await pool.query(`delete from media where person_id = $1 and kind = 'voice'`, [id]);
  } else {
    const count = await pool.query(`select count(*)::int as n from media where person_id = $1 and kind = 'photo'`, [id]);
    if (count.rows[0].n >= MAX_PHOTOS_PER_PERSON) return bad("too-many");
  }
  const mediaId = randomUUID();
  await pool.query(`insert into media (id, person_id, kind, mime, bytes) values ($1, $2, $3, $4, $5)`, [
    mediaId,
    id,
    kind,
    mime,
    bytes,
  ]);
  return NextResponse.json({ id: mediaId, url: `/api/media/${mediaId}` });
}
