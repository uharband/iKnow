import { NextResponse } from "next/server";
import { guard } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

/** The player (or the manager) deletes one message. It disappears for both sides. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;
  const r = await (await db()).query(`delete from messages where id = $1`, [id]);
  // A message the other side already deleted is simply gone; that is not an error.
  return NextResponse.json({ deleted: r.rowCount ?? 0 });
}
