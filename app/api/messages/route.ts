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
