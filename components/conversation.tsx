"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { chatStrings, formatWhen, useRecorder, type Msg } from "@/lib/chat";
import { speak } from "@/lib/speech";
import type { Lang } from "@/lib/types";
import { Icon } from "./ui";

function VoiceBubble({ url, lang }: { url: string; lang: Lang }) {
  const m = chatStrings(lang);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  const toggle = () => {
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    const a = audio.current ?? new Audio(url);
    audio.current = a;
    a.currentTime = 0;
    a.onended = () => setPlaying(false);
    a.onerror = () => setPlaying(false);
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  return (
    <button className={`voice ${playing ? "live" : ""}`} onClick={toggle}>
      <Icon name={playing ? "close" : "play"} />
      {playing ? m.stop : m.voiceMsg}
    </button>
  );
}

export function Conversation({
  messages,
  lang,
  viewer,
  big = false,
  readOnly = false,
  names,
  emptyText,
  onSend,
}: {
  messages: Msg[];
  lang: Lang;
  /** Whose screen this is: the player's, or the family member's. */
  viewer: "player" | "member";
  /** Larger type and buttons, for the player's tablet. */
  big?: boolean;
  /** The manager's view: both sides labelled, nothing can be sent. */
  readOnly?: boolean;
  names: { player: string; member: string };
  emptyText: string;
  onSend?: (payload: string | Blob) => Promise<void>;
}) {
  const m = chatStrings(lang);
  const end = useRef<HTMLDivElement | null>(null);
  const recorder = useRecorder();
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; good?: boolean } | null>(null);
  const preview = useMemo(() => (recorder.blob ? URL.createObjectURL(recorder.blob) : null), [recorder.blob]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = async (payload: string | Blob) => {
    if (!onSend) return;
    setBusy(true);
    setStatus(null);
    try {
      await onSend(payload);
      setText("");
      setWriting(false);
      recorder.clear();
      setStatus({ text: m.sent, good: true });
    } catch {
      setStatus({ text: m.failed });
    }
    setBusy(false);
  };

  return (
    <div className={`chat ${big ? "big" : ""}`}>
      <div className="thread">
        {messages.length === 0 && <p className="lead emptychat">{emptyText}</p>}
        {messages.map((msg) => {
          const mine = (viewer === "player") === msg.fromPlayer;
          return (
            <div key={msg.id} className={`bubble ${mine ? "mine" : "theirs"}`}>
              {readOnly && <small className="who">{msg.fromPlayer ? names.player : names.member}</small>}
              {msg.kind === "text" ? <p>{msg.text}</p> : <VoiceBubble url={msg.audioUrl!} lang={lang} />}
              <span className="meta">
                {big && !mine && msg.kind === "text" && (
                  <button className="link" onClick={() => speak(msg.text ?? "", lang)}>
                    {m.readAloud}
                  </button>
                )}
                <time>{formatWhen(msg.at, lang)}</time>
                {mine && msg.read && !readOnly && <span>· {m.seen}</span>}
              </span>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      {!readOnly && (
        <div className="composer" aria-live="polite">
          {status && <p className={`msg ${status.good ? "good" : ""}`}>{status.text}</p>}
          {recorder.denied && <p className="msg">{m.noMic}</p>}

          {recorder.recording ? (
            <button className="btn primary live wide" onClick={recorder.stop}>
              <Icon name="mic" />
              {m.recording}
            </button>
          ) : recorder.blob ? (
            <div className="row">
              <span className="msg good">{m.ready}</span>
              {preview && <VoiceBubble key={preview} url={preview} lang={lang} />}
              <button className="btn primary" disabled={busy} onClick={() => send(recorder.blob!)}>
                {busy ? m.sending : m.send}
              </button>
              <button className="btn ghost" disabled={busy} onClick={recorder.clear}>
                {m.discard}
              </button>
            </div>
          ) : writing ? (
            <form
              className="writebox"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) send(text.trim());
              }}
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={m.typeHere}
                rows={big ? 3 : 2}
                maxLength={2000}
                autoFocus
              />
              <div className="row">
                <button className="btn primary" disabled={busy || !text.trim()}>
                  {busy ? m.sending : m.send}
                </button>
                <button type="button" className="btn ghost" onClick={() => setWriting(false)}>
                  {m.cancel}
                </button>
              </div>
            </form>
          ) : (
            <div className="row">
              <button
                className="btn primary"
                onClick={() => {
                  setStatus(null);
                  recorder.start();
                }}
              >
                <Icon name="mic" />
                {m.record}
              </button>
              <button
                className="btn"
                onClick={() => {
                  setStatus(null);
                  setWriting(true);
                }}
              >
                {m.write}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
