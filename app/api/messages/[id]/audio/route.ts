import { guard } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { audioResponse } from "@/lib/server/messages";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;
  return audioResponse(await db(), id);
}
