"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Frame } from "@/components/ui";
import { chatStrings, type ConversationSummary } from "@/lib/chat";
import { displayName, relationLabel } from "@/lib/i18n";
import { api, useFamily, useSettings } from "@/lib/store";

/** The player's "Family" screen: faces, not a list of threads. New messages come first. */
export default function Family() {
  const { settings } = useSettings();
  const { people, mode } = useFamily();
  const lang = settings.lang;
  const m = chatStrings(lang);
  const [summary, setSummary] = useState<ConversationSummary[]>([]);

  useEffect(() => {
    if (mode !== "cloud") return;
    api("/api/messages")
      .then((r) => r.json())
      .then((d) => setSummary(d.conversations))
      .catch(() => undefined);
  }, [mode]);

  if (!people) return <main className="familypage" />;

  const of = (id: string) => summary.find((c) => c.personId === id);
  const sorted = [...people].sort((a, b) => {
    const x = of(a.id);
    const y = of(b.id);
    return (y?.unread ? 1 : 0) - (x?.unread ? 1 : 0) || (y?.lastAt ?? 0) - (x?.lastAt ?? 0);
  });

  return (
    <main className="familypage">
      <header className="topbar">
        <Link href="/" className="quiet">
          {m.back}
        </Link>
        <span className="crumb">{m.family}</span>
        <span className="quiet icon" />
      </header>
      {mode !== "cloud" ? (
        <p className="notice">{m.cloudOnly}</p>
      ) : (
        <>
          <p className="lead center">{m.whoTo}</p>
          <ul className="faces">
            {sorted.map((p) => (
              <li key={p.id}>
                <Link href={`/family/${p.id}`}>
                  {p.photos[0] ? <Frame person={p} /> : <div className="frame" />}
                  <strong>{displayName(p, lang)}</strong>
                  <small>{relationLabel(p, lang)}</small>
                  {!!of(p.id)?.unread && <span className="badge">{m.newBadge}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
