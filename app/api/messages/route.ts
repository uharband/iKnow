import { NextResponse } from "next/server";
import { guard } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { insertMessage, listMessages, readIncoming } from "@/lib/server/messages";

export const dynamic = "force-dynamic";

const audioUrl = (id: string) => `/api/messages/${id}/audio`;

/** Without `?person`: one summary row per conversation. With it: that conversation. */
export async function GET(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const pool = await db();
  const person = new URL(req.url).searchParams.get("person");
  if (person) return NextResponse.json({ messages: await listMessages(pool, person, audioUrl) });
  const r = await pool.query(`
    select person_id,
      count(*)::int as total,
      count(*) filter (where not from_player and read_at is null)::int as unread,
      max(created_at) as last_at,
      min(created_at) filter (where not from_player and read_at is null) as first_unread_at
    from messages group by person_id`);
  return NextResponse.json({
    conversations: r.rows.map((c) => ({
      personId: c.person_id,
      total: c.total,
      unread: c.unread,
      lastAt: new Date(c.last_at).getTime(),
      firstUnreadAt: c.first_unread_at ? new Date(c.first_unread_at).getTime() : undefined,
    })),
  });
}

/** A message from the player to one family member. */
export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const person = new URL(req.url).searchParams.get("person") || "";
  const pool = await db();
  const exists = await pool.query(`select 1 from people where id = $1`, [person]);
  if (!exists.rowCount) return NextResponse.json({ error: "person" }, { status: 404 });
  const incoming = await readIncoming(req);
  if ("error" in incoming) return NextResponse.json({ error: incoming.error }, { status: incoming.status });
  const id = await insertMessage(pool, person, true, incoming);
  return NextResponse.json({ id });
}

/**
 * The manager clears history: `?person=<id>` removes one person's whole
 * conversation, `?all=1` removes every message. Recordings go with them.
 * Nothing is deleted without one of the two, so a bare call cannot wipe everything.
 */
export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const q = new URL(req.url).searchParams;
  const person = q.get("person");
  const pool = await db();
  if (person) {
    const r = await pool.query(`delete from messages where person_id = $1`, [person]);
    return NextResponse.json({ deleted: r.rowCount ?? 0 });
  }
  if (q.get("all") === "1") {
    const r = await pool.query(`delete from messages`);
    return NextResponse.json({ deleted: r.rowCount ?? 0 });
  }
  return NextResponse.json({ error: "scope" }, { status: 400 });
}
