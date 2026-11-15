import { NextResponse } from "next/server";
import type { Pool } from "pg";
import { db, hasDb } from "./db";

// A family member has no password. Their personal link carries a long random
// token, and that token is all they need; it only ever opens their own
// profile and their own conversation.

export interface Member {
  pool: Pool;
  id: string;
  data: Record<string, unknown>;
}

export async function memberFromToken(token: string): Promise<Member | NextResponse> {
  if (!hasDb || !/^[\w-]{20,80}$/.test(token)) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const pool = await db();
  const r = await pool.query(
    `select p.id, p.data from links l join people p on p.id = l.person_id where l.token = $1`,
    [token],
  );
  if (!r.rowCount) return NextResponse.json({ error: "not-found" }, { status: 404 });
  return { pool, id: r.rows[0].id, data: r.rows[0].data };
}

/** The people whose profile this member looks after: their own children and their partner's children. */
export async function childrenOf(me: Member): Promise<{ id: string; data: Record<string, unknown> }[]> {
  const r = await me.pool.query(
    `with parents as (
       select $1::text as id
       union select data->>'partnerId' from people where id = $1 and data->>'partnerId' is not null
       union select id from people where data->>'partnerId' = $1
     )
     select c.id, c.data from people c
     where c.id <> $1 and exists (
       select 1 from parents p where coalesce(c.data->'parentIds', '[]'::jsonb) ? p.id
     )
     order by c.data->>'name'`,
    [me.id],
  );
  return r.rows;
}

/**
 * Whose profile a request is about: the member's own, or with `?for=<id>` one of
 * their children's. Small children have no phone, so a parent keeps their
 * photos, greeting and details up to date. Conversations are never shared this way.
 */
export async function profileTarget(req: Request, token: string): Promise<Member | NextResponse> {
  const me = await memberFromToken(token);
  if (me instanceof NextResponse) return me;
  const wanted = new URL(req.url).searchParams.get("for");
  if (!wanted || wanted === me.id) return me;
  const child = (await childrenOf(me)).find((c) => c.id === wanted);
  if (!child) return NextResponse.json({ error: "not-found" }, { status: 404 });
  return { pool: me.pool, id: child.id, data: child.data };
}
