"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Frame, Icon } from "@/components/ui";
import { applyOutcome, buildRound, optionsFor, type Outcome } from "@/lib/game";
import { displayName, parentPhrase, relationPhrase, t, thisIs, whoQuestion } from "@/lib/i18n";
import { judgeSpoken } from "@/lib/match";
import { canListen, chime, listenOnce, playBlob, speak } from "@/lib/speech";
import { loadVoice, playerName, useFamily, useSettings } from "@/lib/store";
import type { Person } from "@/lib/types";

const ROUND_SIZE = 6;

export default function Play() {
  const { settings, update: updateSettings } = useSettings();
  const { people, update } = useFamily();
  const lang = settings.lang;
  const s = t(lang);

  const [queue, setQueue] = useState<Person[] | null>(null);
  const [index, setIndex] = useState(0);
  const [options, setOptions] = useState<Person[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [hints, setHints] = useState(0);
  const [answered, setAnswered] = useState<Outcome | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [met, setMet] = useState<Person[]>([]);
  const [micOk, setMicOk] = useState(false);
  const repeated = useRef(new Set<string>());
  const stopListening = useRef<(() => void) | null>(null);

  useEffect(() => setMicOk(canListen()), []);

  const startRound = useCallback((from: Person[]) => {
    repeated.current = new Set();
    setQueue(buildRound(from, ROUND_SIZE));
    setIndex(0);
    setMet([]);
  }, []);

  useEffect(() => {
    if (people && !queue) startRound(people);
  }, [people, queue, startRound]);

  const target = queue && index < queue.length ? queue[index] : null;

  // A fresh card: new set of names, no hints, no marks.
  useEffect(() => {
    if (!target || !people) return;
    const live = people.find((p) => p.id === target.id) ?? target;
    setOptions(optionsFor(live, people.filter((p) => p.photos.length)));
    setWrong([]);
    setHints(0);
    setAnswered(null);
    setMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, queue]);

  const hintList = useMemo(() => {
    if (!target || !people) return [];
    const name = displayName(target, lang);
    return [relationPhrase(target, lang), parentPhrase(target, people, lang), s.startsWith(name[0])].filter(
      (x): x is string => !!x,
    );
  }, [target, people, lang, s]);

  const finishCard = useCallback(
    async (outcome: Outcome) => {
      if (!target || !people || answered) return;
      stopListening.current?.();
      setAnswered(outcome);
      setMessage(null);
      setMet((m) => (m.some((p) => p.id === target.id) ? m : [...m, target]));
      update(people.map((p) => (p.id === target.id ? applyOutcome(p, outcome) : p)));

      // Spaced retrieval: a face that needed help comes back once, a little later in the round.
      if (outcome !== "clean" && !repeated.current.has(target.id)) {
        repeated.current.add(target.id);
        setQueue((q) => {
          if (!q) return q;
          const next = [...q];
          next.splice(Math.min(index + 3, next.length), 0, target);
          return next;
        });
      }

      if (!settings.sound) return;
      if (outcome !== "revealed") chime();
      const voice = target.hasVoice ? await loadVoice(target.id) : undefined;
      const line = `${outcome === "revealed" ? "" : s.correct + ". "}${thisIs(target, lang)}, ${relationPhrase(target, lang)}.`;
      setTimeout(() => (voice ? playBlob(voice) : speak(line, lang)), outcome === "revealed" ? 100 : 700);
    },
    [target, people, answered, update, index, settings.sound, s, lang],
  );

  const choose = (p: Person) => {
    if (!target || answered) return;
    if (p.id === target.id) {
      finishCard(wrong.length === 0 && hints === 0 ? "clean" : "helped");
      return;
    }
    // Never a "wrong" mark: the name quietly steps back and a hint steps forward.
    setWrong((w) => [...w, p.id]);
    if (hints < hintList.length) {
      setHints((h) => Math.max(h, 1));
      setMessage(s.almost);
    } else {
      setMessage(s.almostPlain);
    }
  };

  const moreHelp = () => {
    if (!target || answered) return;
    setMessage(null);
    if (hints < hintList.length) setHints(hints + 1);
    else finishCard("revealed");
  };

  const listen = async () => {
    if (!target || !people || answered || listening) return;
    setMessage(null);
    setListening(true);
    const { promise, stop } = listenOnce(lang);
    stopListening.current = stop;
    const heard = await promise;
    stopListening.current = null;
    setListening(false);
    const result = heard.length ? judgeSpoken(heard, target, people) : "unknown";
    if (result === "correct") finishCard(wrong.length === 0 && hints === 0 ? "clean" : "helped");
    else if (result === "other") {
      if (hints < hintList.length) setHints((h) => Math.max(h, 1));
      setMessage(hints < hintList.length ? s.almost : s.almostPlain);
    } else setMessage(s.notHeard);
  };

  const playVoice = async () => {
    if (!target) return;
    const voice = await loadVoice(target.id);
    if (voice) playBlob(voice);
  };

  if (!people || !queue) return <main className="play" />;

  if (!queue.length) {
    return (
      <main className="done in">
        <p className="lead">{s.empty}</p>
        <Link href="/admin" className="btn primary">
          {s.emptyCta}
        </Link>
      </main>
    );
  }

  if (!target) {
    return (
      <main className="done in">
        <p className="eyebrow">iKnow</p>
        <h1>{s.doneTitle(playerName(settings))}</h1>
        <div className="rule" />
        <p className="lead">{s.doneSub(met.length)}</p>
        <div className="met">
          {met.map((p) => (
            <figure key={p.id}>
              <Frame person={p} />
              <figcaption>{displayName(p, lang)}</figcaption>
            </figure>
          ))}
        </div>
        <div className="row">
          <button className="btn primary" onClick={() => startRound(people)}>
            {s.again}
          </button>
          <Link href="/" className="btn ghost">
            {s.home}
          </Link>
        </div>
      </main>
    );
  }

  const name = displayName(target, lang);
  const note = lang === "en" ? target.noteEn || "" : target.note || "";
  const parents = parentPhrase(target, people, lang);

  return (
    <main className="play">
      <header className="topbar">
        <Link href="/" className="quiet">
          {s.finish}
        </Link>
        <div className="progress" aria-label={`${index + 1} ${s.of} ${queue.length}`}>
          {queue.map((_, i) => (
            <i key={i} className={i < index ? "past" : i === index ? "now" : ""} />
          ))}
        </div>
        <button
          className="quiet icon"
          onClick={() => updateSettings({ sound: !settings.sound })}
          aria-label={settings.sound ? s.soundOn : s.soundOff}
          title={settings.sound ? s.soundOn : s.soundOff}
        >
          <Icon name={settings.sound ? "sound" : "mute"} />
        </button>
      </header>

      <div className="card" key={`${index}-${target.id}`}>
        <div className="photo">
          <Frame person={target} className={answered ? "big lit" : "big"} />
        </div>

        {!answered ? (
          <section className="ask">
            <h1 className="question">{whoQuestion(target, lang)}</h1>

            <div className="hints" aria-live="polite">
              {message && <p className="msg">{message}</p>}
              {hintList.slice(0, hints).map((h) => (
                <p className="hintline" key={h}>
                  {h}
                </p>
              ))}
            </div>

            <div className={`options n${options.length}`}>
              {options.map((p) => (
                <button
                  key={p.id}
                  className={`option ${wrong.includes(p.id) ? "back" : ""}`}
                  disabled={wrong.includes(p.id)}
                  onClick={() => choose(p)}
                >
                  {displayName(p, lang)}
                </button>
              ))}
            </div>

            <div className="tools">
              {micOk && (
                <button className={`btn tool ${listening ? "live" : ""}`} onClick={listen}>
                  <Icon name="mic" />
                  {listening ? s.listening : s.say}
                </button>
              )}
              <button className="btn tool" onClick={moreHelp}>
                <Icon name="bulb" />
                {hints === 0 ? s.hint : hints < hintList.length ? s.anotherHint : s.reveal}
              </button>
              {target.hasVoice && hints > 0 && (
                <button className="btn tool" onClick={playVoice}>
                  <Icon name="play" />
                  {s.hearVoice}
                </button>
              )}
            </div>
          </section>
        ) : (
          <section className="answer" aria-live="polite">
            {answered !== "revealed" && (
              <p className="yes">
                <Icon name="check" size={22} />
                {s.correct}
              </p>
            )}
            <h1 className="name">{answered === "revealed" ? thisIs(target, lang) : name}</h1>
            <div className="rule draw" />
            <p className="relation">
              {relationPhrase(target, lang)}
              {parents ? ` · ${parents}` : ""}
            </p>
            {note && <p className="note">{note}</p>}
            <button className="btn primary xl" onClick={() => setIndex(index + 1)} autoFocus>
              {s.next}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
