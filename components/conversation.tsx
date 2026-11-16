"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { chatStrings, formatWhen, useRecorder, type Msg } from "@/lib/chat";
import { toMessagePhoto } from "@/lib/photo";
import { speak } from "@/lib/speech";
import type { Lang } from "@/lib/types";
import { Icon } from "./ui";

export function VoiceBubble({ url, lang, label }: { url: string; lang: Lang; label?: string }) {
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
      {playing ? m.stop : (label ?? m.voiceMsg)}
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
  onDelete,
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
  /** Deleting one message removes it for both sides. */
  onDelete?: (id: string) => Promise<void>;
}) {
  const m = chatStrings(lang);
  const end = useRef<HTMLDivElement | null>(null);
  const recorder = useRecorder();
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; good?: boolean } | null>(null);
  const preview = useMemo(() => (recorder.blob ? URL.createObjectURL(recorder.blob) : null), [recorder.blob]);
  const picker = useRef<HTMLInputElement | null>(null);
  const camera = useRef<HTMLInputElement | null>(null);
  // On a phone or tablet the gallery picker does not offer the camera, so the two are asked for separately.
  const [choosing, setChoosing] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const photoPreview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  const [viewing, setViewing] = useState<string | null>(null);
  // The message that "delete" was touched on; it is deleted only after a second, explicit yes.
  const [asking, setAsking] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const remove = async (id: string) => {
    if (!onDelete) return;
    setDeleting(true);
    setStatus(null);
    try {
      await onDelete(id);
      setStatus({ text: m.deleted, good: true });
    } catch {
      setStatus({ text: m.deleteFailed });
    }
    setAsking(null);
    setDeleting(false);
  };

  // Every photo is shrunk here, in the browser, before it goes anywhere.
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setChoosing(false);
    setStatus(null);
    try {
      setPhoto(await toMessagePhoto(file));
    } catch {
      setStatus({ text: m.photoFailed });
    }
  };

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
      setPhoto(null);
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
              {msg.kind === "text" ? (
                <p>{msg.text}</p>
              ) : msg.kind === "photo" ? (
                <button className="photomsg" onClick={() => setViewing(msg.imageUrl!)} aria-label={m.photoMsg}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={msg.imageUrl} alt={m.photoMsg} loading="lazy" />
                </button>
              ) : (
                <VoiceBubble url={msg.audioUrl!} lang={lang} />
              )}
              <span className="meta">
                {big && !mine && msg.kind === "text" && (
                  <button className="link" onClick={() => speak(msg.text ?? "", lang)}>
                    {m.readAloud}
                  </button>
                )}
                <time>{formatWhen(msg.at, lang)}</time>
                {mine && msg.read && !readOnly && <span>· {m.seen}</span>}
                {onDelete && asking !== msg.id && (
                  <button className="link delmsg" onClick={() => setAsking(msg.id)}>
                    {m.deleteMsg}
                  </button>
                )}
              </span>
              {asking === msg.id && (
                <div className="askdelete" role="alertdialog" aria-label={m.deleteAsk}>
                  <span>{m.deleteAsk}</span>
                  <button className="btn danger" disabled={deleting} onClick={() => remove(msg.id)}>
                    {m.deleteYes}
                  </button>
                  <button className="btn ghost" disabled={deleting} onClick={() => setAsking(null)}>
                    {m.cancel}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={end} />
      </div>

      {readOnly && status && (
        <div className="composer" aria-live="polite">
          <p className={`msg ${status.good ? "good" : ""}`}>{status.text}</p>
        </div>
      )}

      {!readOnly && (
        <div className="composer" aria-live="polite">
          {status && <p className={`msg ${status.good ? "good" : ""}`}>{status.text}</p>}
          {recorder.denied && <p className="msg">{m.noMic}</p>}

          {[picker, camera].map((ref) => (
            <input
              key={ref === camera ? "camera" : "gallery"}
              ref={ref}
              type="file"
              accept="image/*"
              capture={ref === camera ? "environment" : undefined}
              hidden
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          ))}

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
          ) : choosing ? (
            <div className="row">
              <button className="btn primary" onClick={() => camera.current?.click()}>
                {m.takePhoto}
              </button>
              <button className="btn" onClick={() => picker.current?.click()}>
                {m.choosePhoto}
              </button>
              <button className="btn ghost" onClick={() => setChoosing(false)}>
                {m.cancel}
              </button>
            </div>
          ) : photo ? (
            <div className="row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {photoPreview && <img className="photopreview" src={photoPreview} alt={m.photoReady} />}
              <span className="msg good">{m.photoReady}</span>
              <button className="btn primary" disabled={busy} onClick={() => send(photo)}>
                {busy ? m.sending : m.send}
              </button>
              <button className="btn ghost" disabled={busy} onClick={() => setPhoto(null)}>
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
              <button
                className="btn"
                onClick={() => {
                  setStatus(null);
                  if (window.matchMedia("(pointer: coarse)").matches) setChoosing(true);
                  else picker.current?.click();
                }}
              >
                {m.photo}
              </button>
            </div>
          )}
        </div>
      )}

      {viewing && (
        <div className="photoview" role="dialog" aria-modal="true" onClick={() => setViewing(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewing} alt={m.photoMsg} />
          <button className="btn">{m.close}</button>
        </div>
      )}
    </div>
  );
}
