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
