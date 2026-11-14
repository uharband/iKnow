"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "./types";

export interface Msg {
  id: string;
  fromPlayer: boolean;
  kind: "text" | "voice";
  text?: string;
  audioUrl?: string;
  at: number;
  read: boolean;
}

export interface ConversationSummary {
  personId: string;
  total: number;
  unread: number;
  lastAt: number;
  firstUnreadAt?: number;
}

const M = {
  he: {
    family: "המשפחה",
    familyDesc: "הודעות ושמירה על קשר",
    newFrom: (n: string) => `הודעה חדשה מ${n}`,
    sentYou: (n: string, f: boolean) => `${n} ${f ? "שלחה" : "שלח"} לך הודעה`,
    newBadge: "הודעה חדשה",
    whoTo: "למי נשלח הודעה?",
    empty: (n: string) => `עדיין אין הודעות עם ${n}. אפשר לשלוח את הראשונה.`,
    record: "להקליט הודעה",
    write: "לכתוב הודעה",
    recording: "מקליטים… לסיום נוגעים שוב",
    ready: "ההודעה מוכנה",
    send: "שליחה",
    discard: "מחיקה",
    cancel: "ביטול",
    sending: "שולח…",
    sent: "ההודעה נשלחה",
    failed: "השליחה לא הצליחה. אפשר לנסות שוב.",
    noMic: "אין גישה למיקרופון במכשיר הזה.",
    typeHere: "כתיבת הודעה…",
    play: "להשמיע",
    stop: "לעצור",
    readAloud: "להקריא",
    voiceMsg: "הודעה קולית",
    today: "היום",
    yesterday: "אתמול",
    seen: "נקראה",
    back: "חזרה",
    cloudOnly: "ההודעות זמינות כשהמשפחה שמורה במסד הנתונים.",
    you: "את",
  },
  en: {
    family: "Family",
    familyDesc: "Messages and staying in touch",
    newFrom: (n: string) => `New message from ${n}`,
    sentYou: (n: string, _f: boolean) => `${n} sent you a message`,
    newBadge: "New message",
    whoTo: "Who shall we write to?",
    empty: (n: string) => `No messages with ${n} yet. You can send the first one.`,
    record: "Record a message",
    write: "Write a message",
    recording: "Recording… touch again to finish",
    ready: "The message is ready",
    send: "Send",
    discard: "Delete",
    cancel: "Cancel",
    sending: "Sending…",
    sent: "Message sent",
    failed: "Sending did not work. Please try again.",
    noMic: "The microphone is not available on this device.",
    typeHere: "Write a message…",
    play: "Play",
    stop: "Stop",
    readAloud: "Read aloud",
    voiceMsg: "Voice message",
    today: "Today",
    yesterday: "Yesterday",
    seen: "Read",
    back: "Back",
    cloudOnly: "Messages are available when the family is stored in the database.",
    you: "You",
  },
};
export const chatStrings = (lang: Lang) => M[lang];

/** "היום 14:20" / "אתמול 09:05" / "12.11 18:30" */
export function formatWhen(at: number, lang: Lang): string {
  const d = new Date(at);
  const now = new Date();
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((dayStart(now) - dayStart(d)) / 86_400_000);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const m = M[lang];
  if (days === 0) return `${m.today} ${time}`;
  if (days === 1) return `${m.yesterday} ${time}`;
  return `${d.getDate()}.${d.getMonth() + 1} ${time}`;
}

/** Prefer a format every phone can play back (AAC in MP4), and fall back to what the browser offers. */
function recordingType(): string | undefined {
  const wanted = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  return wanted.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
}

const MAX_RECORDING_MS = 120_000;

/** Tap to start, tap to stop; the finished recording waits in `blob` until it is sent or discarded. */
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [denied, setDenied] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const stop = useCallback(() => {
    clearTimeout(timer.current);
    if (rec.current?.state === "recording") rec.current.stop();
  }, []);

  const start = useCallback(async () => {
    setBlob(null);
    setDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = recordingType();
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const out = new Blob(chunks, { type: (r.mimeType || type || "audio/webm").split(";")[0] });
        if (out.size) setBlob(out);
      };
      rec.current = r;
      r.start();
      setRecording(true);
      timer.current = setTimeout(stop, MAX_RECORDING_MS);
    } catch {
      setDenied(true);
      setRecording(false);
    }
  }, [stop]);

  useEffect(() => () => {
    clearTimeout(timer.current);
    rec.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  return { recording, blob, denied, start, stop, clear: () => setBlob(null) };
}
