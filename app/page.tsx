"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Frame, LangToggle } from "@/components/ui";
import { greeting, t } from "@/lib/i18n";
import { playerName, useFamily, useSettings } from "@/lib/store";

export default function Home() {
  const { settings, update, ready } = useSettings();
  const { people } = useFamily();
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);

  const s = t(settings.lang);
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
        <p className="lead">{withPhotos.length || !people ? s.homeSub : s.empty}</p>
        {withPhotos.length || !people ? (
          <Link href="/play" className="btn primary xl">
            {s.start}
          </Link>
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
