import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { guard } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

/**
 * The personal link of a family member. Created on first request; `?reset=1`
 * replaces it, which makes the old link stop working (for a link sent to the wrong person).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;
  const pool = await db();
  const person = await pool.query(`select 1 from people where id = $1`, [id]);
  if (!person.rowCount) return NextResponse.json({ error: "person" }, { status: 404 });
  if (new URL(req.url).searchParams.get("reset")) await pool.query(`delete from links where person_id = $1`, [id]);
  await pool.query(`insert into links (person_id, token) values ($1, $2) on conflict (person_id) do nothing`, [
    id,
    randomBytes(24).toString("base64url"),
  ]);
  const r = await pool.query(`select token from links where person_id = $1`, [id]);
  return NextResponse.json({ path: `/me/${r.rows[0].token}` });
}
