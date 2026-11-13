import type { Lang } from "./types";

const LOCALE: Record<Lang, string> = { he: "he-IL", en: "en-US" };

export function canListen(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Listen once and resolve with every alternative the engine offers (empty if nothing was heard). */
export function listenOnce(lang: Lang): { promise: Promise<string[]>; stop: () => void } {
  const w = window as any;
  const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
  const rec = new Rec();
  rec.lang = LOCALE[lang];
  rec.maxAlternatives = 5;
  rec.interimResults = false;
  const promise = new Promise<string[]>((resolve) => {
    let out: string[] = [];
    rec.onresult = (e: any) => {
      out = Array.from(e.results[0] as ArrayLike<{ transcript: string }>).map((a) => a.transcript);
    };
    rec.onerror = () => resolve([]);
    rec.onend = () => resolve(out);
    try {
      rec.start();
    } catch {
      resolve([]);
    }
  });
  return { promise, stop: () => rec.abort() };
}

export function speak(text: string, lang: Lang) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LOCALE[lang];
  const prefix = lang === "he" ? ["he", "iw"] : ["en"];
  const voice = synth.getVoices().find((v) => prefix.some((p) => v.lang.toLowerCase().startsWith(p)));
  if (voice) u.voice = voice;
  u.rate = 0.9;
  synth.speak(u);
}

let ctx: AudioContext | null = null;

/** A soft two-note chime; deliberately quiet and warm, never a buzzer. */
export function chime() {
  try {
    ctx = ctx ?? new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    [523.25, 783.99].forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, now + i * 0.16);
      g.gain.linearRampToValueAtTime(0.12, now + i * 0.16 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 1.1);
      o.connect(g).connect(ctx!.destination);
      o.start(now + i * 0.16);
      o.stop(now + i * 0.16 + 1.2);
    });
  } catch {
    /* sound is optional */
  }
}

export function playBlob(blob: Blob): Promise<void> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    const done = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    a.onended = done;
    a.onerror = done;
    a.play().catch(done);
  });
}
