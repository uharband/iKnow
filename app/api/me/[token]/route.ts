import { NextResponse } from "next/server";
import { childrenOf, memberFromToken } from "@/lib/server/member";
import { listMessages, markRead } from "@/lib/server/messages";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/** Everything a family member's page needs: their profile and their conversation with the player. */
export async function GET(req: Request, { params }: Ctx) {
  const { token } = await params;
  const me = await memberFromToken(token);
  if (me instanceof NextResponse) return me;
  const base = `/api/me/${token}/media`;
  const kids = await childrenOf(me);
  const media = await me.pool.query(
    `select id, kind, person_id from media where person_id = any($1::text[]) order by created_at`,
    [[me.id, ...kids.map((k) => k.id)]],
  );
  const profile = (id: string, d: Record<string, unknown>) => {
    const mine = media.rows.filter((m) => m.person_id === id);
    const voice = mine.find((m) => m.kind === "voice");
    return {
      id,
      name: d.name,
      nameEn: d.nameEn ?? "",
      gender: d.gender,
      nicknames: d.nicknames ?? [],
      note: d.note ?? "",
      noteEn: d.noteEn ?? "",
      photos: mine.filter((m) => m.kind === "photo").map((m) => `${base}/${m.id}`),
      voiceUrl: voice ? `${base}/${voice.id}` : null,
    };
  };
  const settings = await me.pool.query(`select key, value from settings where key in ('playerHe', 'playerEn')`);
  const names = Object.fromEntries(settings.rows.map((r) => [r.key, r.value]));
  // Reading the conversation is what marks the player's messages as read.
  if (!new URL(req.url).searchParams.get("peek")) await markRead(me.pool, me.id, true);
  return NextResponse.json({
    person: profile(me.id, me.data),
    children: kids.map((k) => profile(k.id, k.data)),
    player: { he: names.playerHe ?? "סבתא", en: names.playerEn ?? "Grandma" },
    messages: await listMessages(me.pool, me.id, (id) => `${base}/${id}`),
  });
}
