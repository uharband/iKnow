"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { applyOutcome, shuffle, type Outcome } from "@/lib/game";
import { displayName, hintsFor, t, thisIs } from "@/lib/i18n";
import { chime, speak } from "@/lib/speech";
import { playerName, useFamily, useSettings } from "@/lib/store";
import { buildTree, frontier, type Unit } from "@/lib/tree";
import type { Person } from "@/lib/types";

/** How many photos wait in the tray at once; more arrive as these are placed. */
const TRAY_SIZE = 4;
/** After this many tries for one photo, its place is shown rather than letting her struggle. */
const TRIES_BEFORE_SHOWING = 2;

interface Help {
  wrong: number;
  hints: number;
  shown: boolean;
}
const NO_HELP: Help = { wrong: 0, hints: 0, shown: false };

export default function TreeGame() {
  const { settings, update: updateSettings } = useSettings();
  const { people, recordProgress } = useFamily();
  const lang = settings.lang;
  const s = t(lang);

  // The tree is drawn from the family as it was when the game opened, so that
  // saving progress in the background never reshuffles the board.
  const base = useRef<Person[] | null>(null);
  if (people && !base.current) base.current = people;
  const family = base.current;
  const tree = useMemo(() => (family ? buildTree(family) : null), [family]);

  const [unitId, setUnitId] = useState("root");
  const [done, setDone] = useState<Set<string>>(new Set());
  const [placed, setPlaced] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [help, setHelp] = useState<Record<string, Help>>({});
  const [message, setMessage] = useState<{ text: string; good?: boolean } | null>(null);

  const unit: Unit | undefined = tree?.units.find((u) => u.id === unitId);
  const members = useMemo(() => unit?.groups.flat() ?? [], [unit]);

  // A fresh household: shuffle the photos that need placing.
  useEffect(() => {
    setOrder(shuffle(members.filter((p) => p.photos.length)).map((p) => p.id));
    setSelected(null);
    setMessage(null);
  }, [members]);

  if (!people || !family || !tree) return <main className="tree" />;

  const byId = (id: string) => family.find((p) => p.id === id)!;
  const waiting = order.filter((id) => !placed.has(id));
  const tray = waiting.slice(0, TRAY_SIZE).map(byId);
  const unitComplete = !!unit && waiting.length === 0;
  const chosen = selected ? byId(selected) : null;
  const helpOf = (id: string) => help[id] ?? NO_HELP;
  const bump = (id: string, patch: Partial<Help>) => setHelp((h) => ({ ...h, [id]: { ...helpOf(id), ...patch } }));

  const names = (list: Person[]) => list.map((p) => displayName(p, lang)).join(s.and);
  const title = unit?.root || !unit ? s.treeFamilyOf(playerName(settings)) : s.treeFamilyOf(names(unit.parents));

  const place = (p: Person) => {
    const h = helpOf(p.id);
    const outcome: Outcome = h.shown ? "revealed" : h.wrong || h.hints ? "helped" : "clean";
    recordProgress(applyOutcome(people.find((x) => x.id === p.id) ?? p, outcome));
    setPlaced((prev) => new Set(prev).add(p.id));
    setSelected(null);
    setMessage({ text: `${outcome === "revealed" ? "" : s.correct + ". "}${thisIs(p, lang)}.`, good: true });
    if (settings.sound) {
      chime();
      setTimeout(() => speak(displayName(p, lang), lang), 500);
    }
  };

  const tapSlot = (p: Person) => {
    if (placed.has(p.id) || !p.photos.length) return;
    if (!chosen) {
      setMessage({ text: s.treePickFirst });
      return;
    }
    if (chosen.id === p.id) {
      place(p);
      return;
    }
    // Never a "wrong" mark: the photo simply stays in hand, and help arrives quickly.
    const wrong = helpOf(chosen.id).wrong + 1;
    const shown = wrong >= TRIES_BEFORE_SHOWING;
    bump(chosen.id, { wrong, shown: shown || helpOf(chosen.id).shown });
    setMessage({ text: shown ? s.treeShown : s.treeTryOther });
  };

  const moreHelp = () => {
    const target = chosen ?? tray[0];
    if (!target) return;
    if (!chosen) setSelected(target.id);
    const h = helpOf(target.id);
    const available = hintsFor(target, family, lang).length;
    if (h.hints < available) {
      bump(target.id, { hints: h.hints + 1 });
      setMessage(null);
    } else {
      bump(target.id, { shown: true });
      setMessage({ text: s.treeShown });
    }
  };

  const finishUnit = (next?: string) => {
    const nowDone = new Set(done).add(unitId);
    setDone(nowDone);
    if (next) setUnitId(next);
    else setUnitId("");
  };

  const hintLines = chosen ? hintsFor(chosen, family, lang).slice(0, helpOf(chosen.id).hints) : [];
  const nextUnits = unit ? frontier(tree, new Set(done).add(unit.id)) : frontier(tree, done);

  const header = (
    <header className="topbar">
      <Link href="/" className="quiet">
        {s.finish}
      </Link>
      <span className="crumb">{title}</span>
      <button
        className="quiet icon"
        onClick={() => updateSettings({ sound: !settings.sound })}
        aria-label={settings.sound ? s.soundOn : s.soundOff}
        title={settings.sound ? s.soundOn : s.soundOff}
      >
        <Icon name={settings.sound ? "sound" : "mute"} />
      </button>
    </header>
  );

  if (!tree.units.length) {
    return (
      <main className="done in">
        <p className="lead">{s.treeEmpty}</p>
        <Link href="/admin" className="btn primary">
          {s.manage}
        </Link>
      </main>
    );
  }

  // Everything that was offered has been placed.
  if (!unit) {
    return (
      <main className="done in">
        <p className="eyebrow">iKnow</p>
        <h1>{nextUnits.length ? s.treeUnitDone : s.treeAllDone}</h1>
        <div className="rule" />
        {nextUnits.length > 0 && <p className="lead">{s.treeContinue}</p>}
        <div className="row branches">
          {nextUnits.slice(0, 4).map((u) => (
            <button key={u.id} className="btn" onClick={() => setUnitId(u.id)}>
              {s.treeFamilyOf(names(u.parents))}
            </button>
          ))}
        </div>
        <div className="row">
          <Link href="/" className="btn ghost">
            {s.home}
          </Link>
        </div>
      </main>
    );
  }

  const slot = (p: Person) => {
    const isPlaced = placed.has(p.id) || !p.photos.length;
    const glow = !isPlaced && chosen?.id === p.id && helpOf(p.id).shown;
    return (
      <button
        key={p.id}
        className={`slot ${isPlaced ? "filled" : ""} ${glow ? "glow" : ""}`}
        onClick={() => tapSlot(p)}
        disabled={isPlaced}
      >
        <span className="slotframe">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {isPlaced && p.photos[0] && <img src={p.photos[0]} alt="" draggable={false} />}
        </span>
        <span className="slotname">{displayName(p, lang)}</span>
      </button>
    );
  };

  const head = (p: Person) => (
    <span key={p.id} className="slot filled static">
      <span className="slotframe">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.photos[0] && <img src={p.photos[0]} alt="" draggable={false} />}
      </span>
      <span className="slotname">{displayName(p, lang)}</span>
    </span>
  );

  return (
    <main className="tree">
      {header}

      <section className="board" key={unit.id}>
        <div className="tparents">
          {unit.root && <span className="plaque">{playerName(settings)}</span>}
          {(unit.root ? tree.spouses : unit.parents).map(head)}
        </div>
        <div className="tline" />
        <div className="tkids">
          {unit.groups.map((group) => (
            <div key={group[0].id} className={`tgroup ${group.length > 1 ? "couple" : ""}`}>
              {group.map(slot)}
            </div>
          ))}
        </div>
      </section>

      <section className="traybar" aria-live="polite">
        {unitComplete ? (
          <>
            <p className="msg good">{s.treeUnitDone}</p>
            <div className="row">
              {nextUnits.slice(0, 3).map((u) => (
                <button key={u.id} className="btn primary" onClick={() => finishUnit(u.id)}>
                  {s.treeFamilyOf(names(u.parents))}
                </button>
              ))}
              <button className={`btn ${nextUnits.length ? "ghost" : "primary"}`} onClick={() => finishUnit()}>
                {nextUnits.length ? s.finish : s.next}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="trayhead">
              {message ? (
                <p className={`msg ${message.good ? "good" : ""}`}>{message.text}</p>
              ) : (
                <p className="msg">{chosen ? s.treePlace : s.treePick}</p>
              )}
              {hintLines.map((h) => (
                <p className="hintline" key={h}>
                  {h}
                </p>
              ))}
            </div>
            <div className="tray">
              {tray.map((p) => (
                <button
                  key={p.id}
                  className={`trayphoto ${selected === p.id ? "on" : ""}`}
                  onClick={() => {
                    setSelected(selected === p.id ? null : p.id);
                    setMessage(null);
                  }}
                  aria-pressed={selected === p.id}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photos[0]} alt="" draggable={false} />
                </button>
              ))}
              <button className="btn tool trayhint" onClick={moreHelp}>
                <Icon name="bulb" />
                {!chosen || helpOf(chosen.id).hints === 0
                  ? s.hint
                  : helpOf(chosen.id).hints < hintsFor(chosen, family, lang).length
                    ? s.anotherHint
                    : s.showPlace}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
