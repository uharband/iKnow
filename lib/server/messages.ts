import { randomUUID } from "crypto";
import type { Pool } from "pg";

// A conversation is always between the player (Grandma) and one family member.
// `from_player` says which of the two wrote the message.

export const MAX_TEXT = 2000;
export const MAX_VOICE_BYTES = 4 * 1024 * 1024;

export type Incoming =
  | { kind: "text"; body: string }
  | { kind: "voice"; mime: string; bytes: Buffer }
  | { error: string; status: number };

/** A message arrives either as JSON `{ text }` or as the raw bytes of a recording. */
export async function readIncoming(req: Request): Promise<Incoming> {
  const mime = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (mime === "application/json") {
    const b = (await req.json().catch(() => ({}))) as { text?: unknown };
    const body = typeof b.text === "string" ? b.text.trim().slice(0, MAX_TEXT) : "";
    return body ? { kind: "text", body } : { error: "empty", status: 400 };
  }
  if (/^(audio|video)\/[\w.+-]+$/.test(mime) || mime === "application/ogg") {
    const bytes = Buffer.from(await req.arrayBuffer());
    if (!bytes.length) return { error: "empty", status: 400 };
    if (bytes.length > MAX_VOICE_BYTES) return { error: "size", status: 413 };
    return { kind: "voice", mime, bytes };
  }
  return { error: "type", status: 400 };
}

export async function insertMessage(pool: Pool, personId: string, fromPlayer: boolean, m: Incoming) {
  if ("error" in m) throw new Error(m.error);
  const id = randomUUID();
  await pool.query(
    `insert into messages (id, person_id, from_player, kind, body, mime, bytes) values ($1, $2, $3, $4, $5, $6, $7)`,
    [id, personId, fromPlayer, m.kind, m.kind === "text" ? m.body : null, m.kind === "voice" ? m.mime : null, m.kind === "voice" ? m.bytes : null],
  );
  return id;
}

export async function listMessages(pool: Pool, personId: string, audioUrl: (id: string) => string) {
  const r = await pool.query(
    `select id, from_player, kind, body, created_at, read_at from messages where person_id = $1 order by created_at`,
    [personId],
  );
  return r.rows.map((m) => ({
    id: m.id as string,
    fromPlayer: m.from_player as boolean,
    kind: m.kind as "text" | "voice",
    text: m.body ?? undefined,
    audioUrl: m.kind === "voice" ? audioUrl(m.id) : undefined,
    at: new Date(m.created_at).getTime(),
    read: !!m.read_at,
  }));
}

/** Mark as read the messages written by the other side. */
export const markRead = (pool: Pool, personId: string, writtenByPlayer: boolean) =>
  pool.query(`update messages set read_at = now() where person_id = $1 and from_player = $2 and read_at is null`, [
    personId,
    writtenByPlayer,
  ]);

export async function audioResponse(pool: Pool, messageId: string, personId?: string) {
  const r = await pool.query(
    `select mime, bytes from messages where id = $1 and kind = 'voice' and ($2::text is null or person_id = $2)`,
    [messageId, personId ?? null],
  );
  if (!r.rowCount) return new Response(null, { status: 404 });
  return new Response(r.rows[0].bytes, {
    headers: {
      "Content-Type": r.rows[0].mime,
      "Content-Length": String(r.rows[0].bytes.length),
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
