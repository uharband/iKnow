import { NextResponse } from "next/server";
import { guard } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string }> };

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const RELATIONS = ["child", "grandchild", "great", "inlaw", "other"];

/** Create or update the descriptive fields of a person. Photos, voice and progress have their own routes. */
export async function PUT(req: Request, { params }: Ctx) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = text(b?.name, 60);
  if (!b || !name || !/^[\w-]{1,64}$/.test(id)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const data = {
    name,
    nameEn: text(b.nameEn, 60),
    nicknames: Array.isArray(b.nicknames) ? b.nicknames.map((n) => text(n, 40)).filter(Boolean).slice(0, 10) : [],
    gender: b.gender === "m" ? "m" : "f",
    relation: RELATIONS.includes(b.relation as string) ? b.relation : "other",
    parentIds: Array.isArray(b.parentIds) ? b.parentIds.map((p) => text(p, 64)).filter(Boolean).slice(0, 2) : [],
    note: text(b.note, 200),
    noteEn: text(b.noteEn, 200),
  };
  const pool = await db();
  // Merging keeps the quiet progress fields (level, seen, lastSeen) of an existing person.
  await pool.query(
    `insert into people (id, data) values ($1, $2::jsonb)
     on conflict (id) do update set data = people.data || excluded.data`,
    [id, JSON.stringify(data)],
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;
  const pool = await db();
  await pool.query(`delete from people where id = $1`, [id]);
  // Nobody should keep pointing at a parent who is no longer in the family list.
  await pool.query(
    `update people set data = jsonb_set(data, '{parentIds}', (data->'parentIds') - $1::text)
     where data->'parentIds' ? $1`,
    [id],
  );
  return NextResponse.json({ ok: true });
}
