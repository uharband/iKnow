"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { Conversation, VoiceBubble } from "@/components/conversation";
import { Icon, LangToggle } from "@/components/ui";
import { chatStrings, useRecorder, type Msg } from "@/lib/chat";
import { toPortrait } from "@/lib/photo";
import { useSettings } from "@/lib/store";

const REFRESH_MS = 20_000;

interface Profile {
  id: string;
  name: string;
  nameEn: string;
  gender: "f" | "m";
  nicknames: string[];
  note: string;
  noteEn: string;
  photos: string[];
  voiceUrl: string | null;
}
interface Me {
  person: Profile;
  /** Children whose profile this member looks after. */
  children: Profile[];
  player: { he: string; en: string };
  messages: Msg[];
}

const T = {
  he: {
    hello: (n: string) => `שלום ${n}`,
    with: (n: string) => `השיחה שלך עם ${n}`,
    tabChat: "הודעות",
    tabProfile: "הפרופיל שלי",
    whose: "את הפרופיל של מי לעדכן?",
    mine: "שלי",
    whoseHelp: "לילדים שעוד אין להם טלפון, אפשר לעדכן כאן תמונות, פנייה אישית ופרטים בשמם.",
    photosOf: (c: string) => `התמונות של ${c}`,
    voiceOf: (c: string, n: string) => `הפנייה האישית של ${c} ל${n}`,
    voiceHelpOf: (c: string, n: string) => `הקלטה קצרה בקול של ${c}, למשל ״היי ${n}, זה אני…״. היא שומעת אותה אחרי שהיא מזהה.`,
    nickHelpOf: (c: string, n: string) => `שמות ש${n} קוראת בהם ל${c}. גם הם ייחשבו כתשובה נכונה.`,
    noteOf: (c: string) => `משפט קצר על ${c}`,
    noteHelpOf: "למשל בן/בת כמה, באיזה גן או כיתה, מה אוהב/ת. מופיע אחרי שהיא מזהה.",
    addChild: "הוספת ילד/ה",
    addChildHelp: "לילדים שלך שעדיין לא מופיעים באפליקציה. אחרי ההוספה אפשר להעלות תמונות ופנייה אישית.",
    childName: "שם",
    childNameEn: "שם באנגלית (לא חובה)",
    girl: "בת",
    boy: "בן",
    add: "הוספה",
    cancel: "ביטול",
    childExists: "ילד/ה בשם הזה כבר מופיע/ה אצלך.",
    photos: "התמונות שלי",
    photosHelp: (n: string) => `התמונות האלה מופיעות ל${n} במשחקים. תמונה עדכנית וברורה של הפנים עוזרת לה לזהות.`,
    addPhoto: "הוספת תמונה",
    voice: (n: string) => `הפנייה האישית שלי ל${n}`,
    voiceHelp: (n: string) => `הקלטה קצרה בקול שלך, למשל ״היי ${n}, זה אני…״. היא שומעת אותה אחרי שהיא מזהה אותך.`,
    voicePlay: "להשמיע את ההקלטה",
    voiceNew: "להשמיע את ההקלטה החדשה",
    record: "הקלטה",
    recordAgain: "הקלטה מחדש",
    stopRec: "מקליט… לחיצה לסיום",
    importVoice: "בחירת קובץ הקלטה",
    keep: "שמירת ההקלטה",
    discard: "ביטול",
    removeVoice: "מחיקת ההקלטה",
    voiceTooBig: "ההקלטה גדולה מדי (עד 4MB). פנייה קצרה מספיקה.",
    noMic: "אין גישה למיקרופון. אפשר לאשר אותה בדפדפן, או לבחור קובץ הקלטה.",
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
    whose: "Whose profile would you like to update?",
    mine: "Mine",
    whoseHelp: "For children who do not have a phone yet, you can update their photos, greeting and details here.",
    photosOf: (c: string) => `${c}'s photos`,
    voiceOf: (c: string, n: string) => `${c}'s greeting to ${n}`,
    voiceHelpOf: (c: string, n: string) => `A short recording in ${c}'s own voice, such as “Hi ${n}, it's me…”. She hears it after she recognises them.`,
    nickHelpOf: (c: string, n: string) => `Names ${n} calls ${c}. They also count as a correct answer.`,
    noteOf: (c: string) => `A short line about ${c} (Hebrew)`,
    noteHelpOf: "Age, kindergarten or class, what they love. Shown after she recognises them.",
    addChild: "Add a child",
    addChildHelp: "For your children who are not in the app yet. After adding, you can upload photos and a greeting.",
    childName: "Name (Hebrew)",
    childNameEn: "Name in English (optional)",
    girl: "Girl",
    boy: "Boy",
    add: "Add",
    cancel: "Cancel",
    childExists: "You already have a child with this name here.",
    photos: "My photos",
    photosHelp: (n: string) => `${n} sees these photos in the games. A recent, clear photo of the face helps her recognise it.`,
    addPhoto: "Add a photo",
    voice: (n: string) => `My greeting to ${n}`,
    voiceHelp: (n: string) => `A short recording in your own voice, such as “Hi ${n}, it's me…”. She hears it after she recognises you.`,
    voicePlay: "Play the recording",
    voiceNew: "Play the new recording",
    record: "Record",
    recordAgain: "Record again",
    stopRec: "Recording… tap to finish",
    importVoice: "Choose a recording file",
    keep: "Save the recording",
    discard: "Cancel",
    removeVoice: "Delete recording",
    voiceTooBig: "The recording is too large (up to 4MB). A short greeting is enough.",
    noMic: "No access to the microphone. Allow it in the browser, or choose a recording file.",
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
  /** Whose profile is open in the profile tab: the member's own (null) or one of their children's. */
  const [who, setWho] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [kidName, setKidName] = useState("");
  const [kidNameEn, setKidNameEn] = useState("");
  const [kidGender, setKidGender] = useState<"f" | "m">("f");
  const [nick, setNick] = useState("");
  const [note, setNote] = useState("");
  const [noteEn, setNoteEn] = useState("");
  const [status, setStatus] = useState<{ text: string; good?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const recorder = useRecorder();
  const draft = recorder.blob;
  const draftUrl = useMemo(() => (draft ? URL.createObjectURL(draft) : null), [draft]);
  useEffect(() => () => void (draftUrl && URL.revokeObjectURL(draftUrl)), [draftUrl]);

  const fill = (p: Profile) => {
    setNick(p.nicknames.join(", "));
    setNote(p.note);
    setNoteEn(p.noteEn);
  };

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
      if (fillForm) fill(d.person);
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
  const nameOf = (p: Profile) => (lang === "en" ? p.nameEn || p.name : p.name);
  const myName = nameOf(me.person);
  const child = me.children.find((c) => c.id === who);
  const subject = child ?? me.person;
  const kid = child ? nameOf(child) : "";
  const q = child ? `?for=${encodeURIComponent(child.id)}` : "";
  const choose = (p: Profile | null) => {
    recorder.clear();
    setStatus(null);
    setAdding(false);
    setWho(p ? p.id : null);
    fill(p ?? me.person);
  };

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
        last = await fetch(`${base}/photos${q}`, { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
        if (!last.ok) break;
      }
      return last;
    });

  const addChild = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(`${base}/children`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: kidName, nameEn: kidNameEn, gender: kidGender }),
      });
      if (res.status === 409) setStatus({ text: t.childExists });
      else if (!res.ok) throw new Error(String(res.status));
      else {
        const { id } = (await res.json()) as { id: string };
        await load();
        recorder.clear();
        setWho(id);
        setNick("");
        setNote("");
        setNoteEn("");
        setKidName("");
        setKidNameEn("");
        setAdding(false);
      }
    } catch {
      setStatus({ text: t.failed });
    }
    setBusy(false);
  };

  const MAX_VOICE = 4 * 1024 * 1024;
  const saveVoice = async (blob: Blob) => {
    if (blob.size > MAX_VOICE) {
      setStatus({ text: t.voiceTooBig });
      return;
    }
    await run(() => fetch(`${base}/voice${q}`, { method: "POST", headers: { "Content-Type": blob.type || "audio/ogg" }, body: blob }));
    recorder.clear();
  };

  const saveProfile = () =>
    run(() =>
      fetch(`${base}/profile${q}`, {
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
          <div className="field whose">
            <span>{t.whose}</span>
            <div className="chips">
              <button className={`chip ${!child && !adding ? "on" : ""}`} aria-pressed={!child && !adding} onClick={() => choose(null)}>
                {t.mine}
              </button>
              {me.children.map((c) => (
                <button
                  key={c.id}
                  className={`chip ${!adding && child?.id === c.id ? "on" : ""}`}
                  aria-pressed={!adding && child?.id === c.id}
                  onClick={() => choose(c)}
                >
                  {nameOf(c)}
                </button>
              ))}
              <button
                className={`chip add ${adding ? "on" : ""}`}
                aria-pressed={adding}
                onClick={() => {
                  setStatus(null);
                  setAdding(true);
                }}
              >
                <Icon name="plus" size={18} />
                {t.addChild}
              </button>
            </div>
            <small className="help">{t.whoseHelp}</small>
          </div>
          {adding ? (
            <div className="addchild">
              <small className="help">{t.addChildHelp}</small>
              <label className="field">
                <span>{t.childName}</span>
                <input dir="rtl" value={kidName} onChange={(e) => setKidName(e.target.value)} maxLength={60} />
              </label>
              <label className="field">
                <span>{t.childNameEn}</span>
                <input dir="ltr" value={kidNameEn} onChange={(e) => setKidNameEn(e.target.value)} maxLength={60} />
              </label>
              <div className="chips">
                <button className={`chip ${kidGender === "f" ? "on" : ""}`} aria-pressed={kidGender === "f"} onClick={() => setKidGender("f")}>
                  {t.girl}
                </button>
                <button className={`chip ${kidGender === "m" ? "on" : ""}`} aria-pressed={kidGender === "m"} onClick={() => setKidGender("m")}>
                  {t.boy}
                </button>
              </div>
              {status && <p className={`msg ${status.good ? "good" : ""}`}>{status.text}</p>}
              <div className="row">
                <button className="btn primary" disabled={busy || !kidName.trim()} onClick={addChild}>
                  {t.add}
                </button>
                <button className="btn" disabled={busy} onClick={() => setAdding(false)}>
                  {t.cancel}
                </button>
              </div>
            </div>
          ) : (
            <>
          <div className="field">
            <span>{child ? t.photosOf(kid) : t.photos}</span>
            <small className="help">{t.photosHelp(player)}</small>
            <div className="thumbs">
              {subject.photos.map((src) => (
                <div className="thumb" key={src}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" />
                  <button
                    aria-label={t.remove}
                    disabled={busy}
                    onClick={() => run(() => fetch(`${base}/photos/${src.split("/").pop()}${q}`, { method: "DELETE" }))}
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
          <div className="field">
            <span>{child ? t.voiceOf(kid, player) : t.voice(player)}</span>
            <small className="help">{child ? t.voiceHelpOf(kid, player) : t.voiceHelp(player)}</small>
            <div className="voicebox">
              {recorder.recording ? (
                <button className="btn primary live" onClick={recorder.stop}>
                  <Icon name="mic" />
                  {t.stopRec}
                </button>
              ) : draft && draftUrl ? (
                <>
                  <VoiceBubble key={draftUrl} url={draftUrl} lang={lang} label={t.voiceNew} />
                  <div className="row">
                    <button className="btn primary" disabled={busy} onClick={() => saveVoice(draft)}>
                      {t.keep}
                    </button>
                    <button className="btn" disabled={busy} onClick={recorder.start}>
                      {t.recordAgain}
                    </button>
                    <button className="link" disabled={busy} onClick={recorder.clear}>
                      {t.discard}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {subject.voiceUrl && <VoiceBubble key={subject.voiceUrl} url={subject.voiceUrl} lang={lang} label={t.voicePlay} />}
                  <div className="row">
                    <button className="btn tool" disabled={busy} onClick={recorder.start}>
                      <Icon name="mic" />
                      {subject.voiceUrl ? t.recordAgain : t.record}
                    </button>
                    <label className="btn tool">
                      <Icon name="upload" />
                      {t.importVoice}
                      <input
                        type="file"
                        accept="audio/*,.opus,.ogg,.oga,.m4a,.mp3,.wav,.aac,.amr,.webm"
                        hidden
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) saveVoice(f);
                        }}
                      />
                    </label>
                    {subject.voiceUrl && (
                      <button className="link" disabled={busy} onClick={() => run(() => fetch(`${base}/voice${q}`, { method: "DELETE" }))}>
                        {t.removeVoice}
                      </button>
                    )}
                  </div>
                </>
              )}
              {recorder.denied && <p className="msg">{t.noMic}</p>}
            </div>
          </div>
          <label className="field">
            <span>{t.nick}</span>
            <input value={nick} onChange={(e) => setNick(e.target.value)} />
            <small className="help">{child ? t.nickHelpOf(kid, player) : t.nickHelp(player)}</small>
          </label>
          <label className="field">
            <span>{child ? t.noteOf(kid) : t.note}</span>
            <input dir="rtl" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            <small className="help">{child ? t.noteHelpOf : t.noteHelp}</small>
          </label>
          <label className="field">
            <span>{t.noteEn}</span>
            <input dir="ltr" value={noteEn} onChange={(e) => setNoteEn(e.target.value)} maxLength={200} />
          </label>
          {status && <p className={`msg ${status.good ? "good" : ""}`}>{status.text}</p>}
          <button className="btn primary" disabled={busy} onClick={saveProfile}>
            {t.save}
          </button>
            </>
          )}
          <p className="notice">{t.private}</p>
        </section>
      )}
    </main>
  );
}
