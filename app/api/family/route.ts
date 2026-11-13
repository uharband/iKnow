import { NextResponse } from "next/server";
import { guard } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const pool = await db();
  const people = await pool.query(`
    select p.id, p.data,
      coalesce(json_agg(json_build_object('id', m.id, 'kind', m.kind) order by m.created_at)
        filter (where m.id is not null), '[]') as media
    from people p left join media m on m.person_id = p.id
    group by p.id order by p.created_at`);
  const settings = await pool.query(`select key, value from settings`);
  return NextResponse.json({
    people: people.rows.map((r) => {
      const media = r.media as { id: string; kind: string }[];
      const voice = media.find((m) => m.kind === "voice");
      return {
        level: 0,
        seen: 0,
        nicknames: [],
        parentIds: [],
        ...r.data,
        id: r.id,
        photos: media.filter((m) => m.kind === "photo").map((m) => `/api/media/${m.id}`),
        hasVoice: !!voice,
        voiceUrl: voice ? `/api/media/${voice.id}` : undefined,
      };
    }),
    settings: Object.fromEntries(settings.rows.map((r) => [r.key, r.value])),
  });
}
