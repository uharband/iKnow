"use client";

import { HARD_THRESHOLD } from "@/lib/game";
import { displayName } from "@/lib/i18n";
import type { Tree } from "@/lib/tree";
import type { Lang, Person } from "@/lib/types";

const T = {
  he: { noPhoto: "אין תמונה", noVoice: "אין הקלטה", hard: "כדאי לחזק", loose: "עדיין לא משויכים למשפחה", edit: "עריכת" },
  en: { noPhoto: "No photo", noVoice: "No recording", hard: "Worth reinforcing", loose: "Not yet placed in the family", edit: "Edit" },
};

/**
 * The manager's view of the family as a tree: each child of the player heads
 * a branch, with their partner beside them and their own children nested
 * below. Every person opens for editing, and shows what is still missing.
 */
export function FamilyTree({
  tree,
  player,
  lang,
  onEdit,
}: {
  tree: Tree;
  player: string;
  lang: Lang;
  onEdit: (p: Person) => void;
}) {
  const t = T[lang];
  const unitOf = (id: string) => tree.units.find((u) => u.id === id);

  const person = (p: Person) => (
    <button key={p.id} className="tperson" onClick={() => onEdit(p)} aria-label={`${t.edit} ${displayName(p, lang)}`}>
      <span className="tface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.photos[0] && <img src={p.photos[0]} alt="" />}
      </span>
      <span className="tname">
        <strong>{displayName(p, lang)}</strong>
        <small>
          {[!p.photos.length && t.noPhoto, !p.hasVoice && t.noVoice, (p.difficulty ?? 0) >= HARD_THRESHOLD && t.hard]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </span>
    </button>
  );

  const branch = (group: Person[]) => {
    const below = unitOf(group[0].id);
    return (
      <li key={group[0].id}>
        <div className={`tcouple ${group.length > 1 ? "two" : ""}`}>{group.map(person)}</div>
        {below && <ul className="tbranch">{below.groups.map(branch)}</ul>}
      </li>
    );
  };

  const root = unitOf("root");

  return (
    <div className="ftree">
      <div className="troot">
        <span className="plaque">{player}</span>
        {tree.spouses.map(person)}
      </div>
      {root && <ul className="tbranches">{root.groups.map(branch)}</ul>}
      {tree.unplaced.length > 0 && (
        <section className="tloose">
          <h2>{t.loose}</h2>
          <div className="tcouple wrap">{tree.unplaced.map(person)}</div>
        </section>
      )}
    </div>
  );
}
