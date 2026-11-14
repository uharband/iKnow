import { NextResponse } from "next/server";
import { memberFromToken } from "@/lib/server/member";
import { listMessages, markRead } from "@/lib/server/messages";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/** Everything a family member's page needs: their profile and their conversation with the player. */
export async function GET(req: Request, { params }: Ctx) {
  const { token } = await params;
  const me = await memberFromToken(token);
  if (me instanceof NextResponse) return me;
  const base = `/api/me/${token}/media`;
  const media = await me.pool.query(
    `select id, kind from media where person_id = $1 order by created_at`,
    [me.id],
  );
  const settings = await me.pool.query(`select key, value from settings where key in ('playerHe', 'playerEn')`);
  const names = Object.fromEntries(settings.rows.map((r) => [r.key, r.value]));
  // Reading the conversation is what marks the player's messages as read.
  if (!new URL(req.url).searchParams.get("peek")) await markRead(me.pool, me.id, true);
  const d = me.data;
  const voice = media.rows.find((m) => m.kind === "voice");
  return NextResponse.json({
    person: {
      id: me.id,
      name: d.name,
      nameEn: d.nameEn ?? "",
      gender: d.gender,
      nicknames: d.nicknames ?? [],
      note: d.note ?? "",
      noteEn: d.noteEn ?? "",
      photos: media.rows.filter((m) => m.kind === "photo").map((m) => `${base}/${m.id}`),
      voiceUrl: voice ? `${base}/${voice.id}` : null,
    },
    player: { he: names.playerHe ?? "סבתא", en: names.playerEn ?? "Grandma" },
    messages: await listMessages(me.pool, me.id, (id) => `${base}/${id}`),
  });
}
