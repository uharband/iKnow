import { NextResponse } from "next/server";
import { memberFromToken } from "@/lib/server/member";
import { insertMessage, readIncoming } from "@/lib/server/messages";

/** A message from the family member to the player. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const me = await memberFromToken(token);
  if (me instanceof NextResponse) return me;
  const incoming = await readIncoming(req);
  if ("error" in incoming) return NextResponse.json({ error: incoming.error }, { status: incoming.status });
  return NextResponse.json({ id: await insertMessage(me.pool, me.id, false, incoming) });
}
