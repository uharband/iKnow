"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Frame, LangToggle } from "@/components/ui";
import { GAMES } from "@/lib/games";
import { greeting, t } from "@/lib/i18n";
import { chatStrings, type ConversationSummary } from "@/lib/chat";
import { displayName } from "@/lib/i18n";
import { api, playerName, useFamily, useSettings } from "@/lib/store";

export default function Home() {
  const { settings, update, ready } = useSettings();
  const { people, mode } = useFamily();
  const [unread, setUnread] = useState<ConversationSummary[]>([]);

  useEffect(() => {
    if (mode !== "cloud") return;
    api("/api/messages")
      .then((r) => r.json())
      .then((d) => setUnread((d.conversations as ConversationSummary[]).filter((c) => c.unread)))
      .catch(() => undefined);
  }, [mode]);
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);

  const s = t(settings.lang);
  const m = chatStrings(settings.lang);
  // The longest-waiting unread message is offered first.
  const waiting = [...unread].sort((a, b) => (a.firstUnreadAt ?? 0) - (b.firstUnreadAt ?? 0))[0];
  const newFrom = waiting ? (people ?? []).find((p) => p.id === waiting.personId) : undefined;
  const withPhotos = (people ?? []).filter((p) => p.photos.length);

  return (
    <main className={`home ${ready && people && hour !== null ? "in" : ""}`}>
      <header className="topbar">
        <span className="wordmark">iKnow</span>
        <LangToggle lang={settings.lang} onChange={(lang) => update({ lang })} />
      </header>

      <section className="hero">
        <p className="eyebrow">{hour !== null ? greeting(settings.lang, hour) : " "}</p>
        <h1>{playerName(settings)}</h1>
        <div className="rule" />
        <p className="lead">{withPhotos.length || !people ? s.choose : s.empty}</p>
        {withPhotos.length || !people ? (
          <nav className="games">
            {newFrom && (
              <Link href={`/family/${newFrom.id}`} className="gamecard newmsg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {newFrom.photos[0] && <img src={newFrom.photos[0]} alt="" />}
                <strong>{m.sentYou(displayName(newFrom, settings.lang), newFrom.gender === "f")}</strong>
              </Link>
            )}
            {GAMES.map((g) => (
              <Link key={g.id} href={g.href} className="gamecard">
                <strong>{g.title[settings.lang]}</strong>
                <span>{g.description[settings.lang]}</span>
              </Link>
            ))}
            {mode === "cloud" && (
              <Link href="/family" className="gamecard">
                <strong>{m.family}</strong>
                <span>{m.familyDesc}</span>
              </Link>
            )}
          </nav>
        ) : (
          <Link href="/admin" className="btn primary xl">
            {s.emptyCta}
          </Link>
        )}
      </section>

      <section className="wall" aria-hidden>
        {withPhotos.slice(0, 6).map((p, i) => (
          <Frame key={p.id} person={p} className={`w${i % 6}`} />
        ))}
      </section>

      <footer className="foot">
        <Link href="/admin">{s.manage}</Link>
      </footer>
    </main>
  );
}
