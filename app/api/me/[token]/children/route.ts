import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { childrenOf, memberFromToken } from "@/lib/server/member";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const MAX_CHILDREN = 15;

/** One generation below the parent, in the player's terms. */
const CHILD_RELATION: Record<string, string> = {
  child: "grandchild",
  inlaw: "grandchild",
  grandchild: "great",
  grandInlaw: "great",
  great: "great",
};

/**
 * A parent adds a child who is not in the family list yet. Only the name and
 * gender are asked; the place in the family follows from the parent, and the
 * manager can adjust anything later.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const me = await memberFromToken(token);
  if (me instanceof NextResponse) return me;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = text(b.name, 60);
  if (!name) return NextResponse.json({ error: "name" }, { status: 400 });

  const kids = await childrenOf(me);
  if (kids.some((k) => k.data.name === name)) return NextResponse.json({ error: "exists" }, { status: 409 });
  if (kids.length >= MAX_CHILDREN) return NextResponse.json({ error: "too-many" }, { status: 400 });

  const partner = await me.pool.query(
    `select id from people where id <> $1 and (id = $2 or data->>'partnerId' = $1) limit 1`,
    [me.id, typeof me.data.partnerId === "string" ? me.data.partnerId : ""],
  );
  const id = randomUUID();
  const data = {
    name,
    nameEn: text(b.nameEn, 60),
    nicknames: [],
    gender: b.gender === "m" ? "m" : "f",
    relation: CHILD_RELATION[me.data.relation as string] ?? "other",
    parentIds: [me.id, ...partner.rows.map((r) => r.id)],
    partnerId: "",
    note: "",
    noteEn: "",
    level: 0,
    seen: 0,
  };
  await me.pool.query(`insert into people (id, data) values ($1, $2::jsonb)`, [id, JSON.stringify(data)]);
  return NextResponse.json({ id });
}
