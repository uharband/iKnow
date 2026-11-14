"use client";

import { use, useCallback, useEffect, useState } from "react";
import { Conversation } from "@/components/conversation";
import { Icon, LangToggle } from "@/components/ui";
import { chatStrings, type Msg } from "@/lib/chat";
import { toPortrait } from "@/lib/photo";
import { useSettings } from "@/lib/store";

const REFRESH_MS = 20_000;

interface Me {
  person: { id: string; name: string; nameEn: string; gender: "f" | "m"; nicknames: string[]; note: string; noteEn: string; photos: string[] };
  player: { he: string; en: string };
  messages: Msg[];
}

const T = {
  he: {
    hello: (n: string) => `שלום ${n}`,
    with: (n: string) => `השיחה שלך עם ${n}`,
    tabChat: "הודעות",
    tabProfile: "הפרופיל שלי",
    photos: "התמונות שלי",
    photosHelp: (n: string) => `התמונות האלה מופיעות ל${n} במשחקים. תמונה עדכנית וברורה של הפנים עוזרת לה לזהות.`,
    addPhoto: "הוספת תמונה",
    nick: "כינויים (מופרדים בפסיק)",
    nickHelp: (n: string) => `שמות ש${n} קוראת לך בהם. גם הם ייחשבו כתשובה נכונה.`,
    note: "משפט קצר עליי",
    noteEn: "משפט קצר באנגלית",
    noteHelp: "למשל איפה את/ה גר/ה, במה עוסק/ת, מה חדש. מופיע אחרי שהיא מזהה אותך.",
    save: "שמירה",
    saved: "נשמר",
    failed: "השמירה לא הצליחה. אפשר לנסות שוב.",
    gone: "הקישור הזה כבר לא פעיל. אפשר לבקש קישור חדש ממי שמנהל את המשפחה באפליקציה.",
    remove: "הסרה",
    private: "הקישור הזה אישי. מי שמחזיק בו יכול לכתוב בשמך, אז עדיף לא להעביר אותו הלאה.",
  },
  en: {
    hello: (n: string) => `Hello ${n}`,
    with: (n: string) => `Your conversation with ${n}`,
    tabChat: "Messages",
    tabProfile: "My profile",
    photos: "My photos",
    photosHelp: (n: string) => `${n} sees these photos in the games. A recent, clear photo of your face helps her recognise you.`,
    addPhoto: "Add a photo",
    nick: "Nicknames (comma separated)",
    nickHelp: (n: string) => `Names ${n} calls you. They also count as a correct answer.`,
    note: "A short line about me (Hebrew)",
    noteEn: "A short line in English",
    noteHelp: "Where you live, what you do, what's new. Shown after she recognises you.",
    save: "Save",
    saved: "Saved",
    failed: "Saving did not work. Please try again.",
    gone: "This link is no longer active. Ask whoever manages the family in the app for a new one.",
    remove: "Remove",
    private: "This link is personal. Anyone who has it can write in your name, so it is best not to pass it on.",
  },
};

/** A family member's own page, opened from their personal link. No password. */
export default function MePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { settings, update } = useSettings();
  const lang = settings.lang;
  const t = T[lang];
  const m = chatStrings(lang);
  const base = `/api/me/${token}`;

  const [me, setMe] = useState<Me | null>(null);
  const [gone, setGone] = useState(false);
  const [tab, setTab] = useState<"chat" | "profile">("chat");
  const [nick, setNick] = useState("");
  const [note, setNote] = useState("");
  const [noteEn, setNoteEn] = useState("");
  const [status, setStatus] = useState<{ text: string; good?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (fillForm = false) => {
      const res = await fetch(base);
      if (res.status === 404) {
        setGone(true);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const d = (await res.json()) as Me;
      setMe(d);
      if (fillForm) {
        setNick(d.person.nicknames.join(", "));
        setNote(d.person.note);
        setNoteEn(d.person.noteEn);
      }
    },
    [base],
  );

  useEffect(() => {
    load(true).catch(() => undefined);
    const timer = setInterval(() => load().catch(() => undefined), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (gone) {
    return (
      <main className="done in">
        <p className="eyebrow">iKnow</p>
        <p className="lead">{t.gone}</p>
      </main>
    );
  }
  if (!me) return <main className="mepage" />;

  const player = me.player[lang];
  const myName = lang === "en" ? me.person.nameEn || me.person.name : me.person.name;

  const send = async (payload: string | Blob) => {
    const res =
      typeof payload === "string"
        ? await fetch(`${base}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: payload }) })
        : await fetch(`${base}/messages`, { method: "POST", headers: { "Content-Type": payload.type || "audio/webm" }, body: payload });
    if (!res.ok) throw new Error(String(res.status));
    await load();
  };

  const run = async (work: () => Promise<Response>) => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await work();
      if (!res.ok) throw new Error(String(res.status));
      await load();
      setStatus({ text: t.saved, good: true });
    } catch {
      setStatus({ text: t.failed });
    }
    setBusy(false);
  };

  const addPhotos = (files: FileList | null) =>
    run(async () => {
      let last = new Response(null, { status: 200 });
      for (const f of Array.from(files ?? [])) {
        const blob = await (await fetch(await toPortrait(f))).blob();
        last = await fetch(`${base}/photos`, { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
        if (!last.ok) break;
      }
      return last;
    });

  const saveProfile = () =>
    run(() =>
      fetch(`${base}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicknames: nick.split(",").map((x) => x.trim()).filter(Boolean), note, noteEn }),
      }),
    );

  return (
    <main className="mepage">
      <header className="topbar">
        <span className="wordmark">iKnow</span>
        <LangToggle lang={lang} onChange={(l) => update({ lang: l })} />
      </header>

      <div className="mehead">
        <h1>{t.hello(myName)}</h1>
        <p className="lead">{t.with(player)}</p>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "chat"} className={tab === "chat" ? "on" : ""} onClick={() => setTab("chat")}>
          {t.tabChat}
        </button>
        <button role="tab" aria-selected={tab === "profile"} className={tab === "profile" ? "on" : ""} onClick={() => setTab("profile")}>
          {t.tabProfile}
        </button>
      </div>

      {tab === "chat" ? (
        <Conversation
          messages={me.messages}
          lang={lang}
          viewer="member"
          names={{ player, member: myName }}
          emptyText={m.empty(player)}
          onSend={send}
        />
      ) : (
        <section className="profile">
          <div className="field">
            <span>{t.photos}</span>
            <small className="help">{t.photosHelp(player)}</small>
            <div className="thumbs">
              {me.person.photos.map((src) => (
                <div className="thumb" key={src}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" />
                  <button
                    aria-label={t.remove}
                    disabled={busy}
                    onClick={() => run(() => fetch(`${base}/photos/${src.split("/").pop()}`, { method: "DELETE" }))}
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              ))}
              <label className="thumb addthumb">
                <Icon name="plus" />
                <small>{t.addPhoto}</small>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <label className="field">
            <span>{t.nick}</span>
            <input value={nick} onChange={(e) => setNick(e.target.value)} />
            <small className="help">{t.nickHelp(player)}</small>
          </label>
          <label className="field">
            <span>{t.note}</span>
            <input dir="rtl" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            <small className="help">{t.noteHelp}</small>
          </label>
          <label className="field">
            <span>{t.noteEn}</span>
            <input dir="ltr" value={noteEn} onChange={(e) => setNoteEn(e.target.value)} maxLength={200} />
          </label>
          {status && <p className={`msg ${status.good ? "good" : ""}`}>{status.text}</p>}
          <button className="btn primary" disabled={busy} onClick={saveProfile}>
            {t.save}
          </button>
          <p className="notice">{t.private}</p>
        </section>
      )}
    </main>
  );
}
