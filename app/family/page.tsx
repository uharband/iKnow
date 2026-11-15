"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Frame } from "@/components/ui";
import { chatStrings, type ConversationSummary } from "@/lib/chat";
import { displayName, relationLabel, t } from "@/lib/i18n";
import { api, useFamily, useSettings } from "@/lib/store";
import { buildTree } from "@/lib/tree";
import type { Person } from "@/lib/types";

/**
 * The player's "Family" screen: faces, not a list of threads. Whoever wrote to
 * her is shown first; below that everyone keeps a fixed place, one household
 * after another, so the same face is always found in the same spot.
 */
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

  const s = t(lang);
  const of = (id: string) => summary.find((c) => c.personId === id);
  const tree = buildTree(people);
  // A branch is one of her children with their partner, then everyone below them, parents before children.
  const below = (group: Person[]): Person[] => [
    ...group,
    ...(tree.units.find((u) => u.id === group[0].id)?.groups.flatMap(below) ?? []),
  ];
  const branches = (tree.units.find((u) => u.id === "root")?.groups ?? []).map((group) => ({
    title: s.treeFamilyOf(group.map((p) => displayName(p, lang)).join(s.and)),
    people: below(group),
  }));
  const sections = [
    ...(tree.spouses.length ? [{ title: "", people: tree.spouses }] : []),
    ...branches,
    ...(tree.unplaced.length ? [{ title: branches.length ? m.others : "", people: tree.unplaced }] : []),
  ];
  const waiting = people
    .filter((p) => of(p.id)?.unread)
    .sort((a, b) => (of(a.id)?.firstUnreadAt ?? 0) - (of(b.id)?.firstUnreadAt ?? 0));

  const face = (p: Person) => (
    <li key={p.id}>
      <Link href={`/family/${p.id}`}>
        {p.photos[0] ? <Frame person={p} /> : <div className="frame" />}
        <strong>{displayName(p, lang)}</strong>
        <small>{relationLabel(p, lang)}</small>
        {!!of(p.id)?.unread && <span className="badge">{m.newBadge}</span>}
      </Link>
    </li>
  );

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
          {waiting.length > 0 && (
            <section className="facegroup waiting">
              <h2>{m.wroteToYou}</h2>
              <ul className="faces">{waiting.map(face)}</ul>
            </section>
          )}
          {sections.map((g, i) => (
            <section className="facegroup" key={i}>
              {g.title && <h2>{g.title}</h2>}
              <ul className="faces">{g.people.map(face)}</ul>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
