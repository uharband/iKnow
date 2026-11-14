"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatWhen, type ConversationSummary } from "@/lib/chat";
import { displayName } from "@/lib/i18n";
import { api, useFamily, useSettings } from "@/lib/store";

const T = {
  he: { title: "שיחות", back: "חזרה", none: "עדיין אין שיחות.", count: (n: number) => `${n} הודעות`, waiting: (n: number) => `${n} מחכות לה` },
  en: { title: "Conversations", back: "Back", none: "No conversations yet.", count: (n: number) => `${n} messages`, waiting: (n: number) => `${n} waiting for her` },
};

/** The manager's overview of every conversation. Opening one here never marks anything as read. */
export default function AdminMessages() {
  const { settings } = useSettings();
  const { people } = useFamily();
  const lang = settings.lang;
  const t = T[lang];
  const [summary, setSummary] = useState<ConversationSummary[] | null>(null);

  useEffect(() => {
    api("/api/messages")
      .then((r) => r.json())
      .then((d) => setSummary(d.conversations))
      .catch(() => setSummary([]));
  }, []);

  if (!people || !summary) return <main className="admin" />;
  const rows = [...summary].sort((a, b) => b.lastAt - a.lastAt);

  return (
    <main className="admin">
      <header className="topbar">
        <Link href="/admin" className="quiet">
          {t.back}
        </Link>
      </header>
      <div className="adminhead">
        <h1>{t.title}</h1>
      </div>
      {rows.length === 0 && <p className="notice">{t.none}</p>}
      <ul className="convlist">
        {rows.map((c) => {
          const p = people.find((x) => x.id === c.personId);
          if (!p) return null;
          return (
            <li key={c.personId}>
              <Link href={`/family/${c.personId}?admin=1`}>
                <strong>{displayName(p, lang)}</strong>
                <span>
                  {t.count(c.total)}
                  {c.unread ? ` · ${t.waiting(c.unread)}` : ""}
                </span>
                <time>{formatWhen(c.lastAt, lang)}</time>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
