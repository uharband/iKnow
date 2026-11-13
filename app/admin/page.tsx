"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon, LangToggle } from "@/components/ui";
import { displayName, partnerOf, relationLabel } from "@/lib/i18n";
import { playBlob } from "@/lib/speech";
import { loadVoice, useFamily, useSettings, type VoiceChange } from "@/lib/store";
import type { Gender, Lang, Person, Relation } from "@/lib/types";

const A = {
  he: {
    title: "המשפחה",
    back: "חזרה",
    signOut: "יציאה",
    add: "הוספת בן משפחה",
    local: "בגרסה הזו התמונות והשמות נשמרים רק במכשיר הזה.",
    demo: "זו משפחה לדוגמה, כדי שאפשר יהיה לנסות את המשחק. אפשר להסיר אותה ולהוסיף את המשפחה שלכם.",
    removeDemo: "הסרת משפחת הדוגמה",
    player: "איך פונים אליה",
    name: "שם בעברית",
    nameEn: "שם באנגלית",
    nick: "כינויים (מופרדים בפסיק)",
    gender: "מין",
    f: "אישה",
    m: "גבר",
    relation: "הקשר אליה",
    rel: {
      spouse: "בעל / אישה (סבא)",
      child: "בן / בת",
      inlaw: "חתן / כלה (בן או בת זוג של ילד)",
      grandchild: "נכד / נכדה",
      grandInlaw: "בן / בת זוג של נכד או נכדה",
      great: "נין / נינה",
      other: "אחר",
    },
    partner: "בן / בת הזוג",
    parents: "הורים (לרמז ״הבת של…״)",
    none: "ללא",
    note: "משפט קצר עליו/עליה (עברית)",
    noteEn: "משפט קצר (אנגלית)",
    photos: "תמונות",
    addPhoto: "הוספת תמונה",
    voice: "ברכה קולית (״היי סבתא, זה אני…״)",
    record: "הקלטה",
    importVoice: "ייבוא קובץ הקלטה",
    voiceTooBig: "קובץ ההקלטה גדול מדי (עד 4MB). ברכה קצרה מספיקה.",
    saving: "שומר…",
    saveFailed: "השמירה לא הצליחה. כדאי לנסות שוב.",
    stop: "עצירה",
    listen: "השמעה",
    removeVoice: "מחיקת ההקלטה",
    save: "שמירה",
    cancel: "ביטול",
    del: "מחיקה",
    confirmDel: "למחוק את",
    needName: "צריך שם",
    edit: "עריכה",
    newPerson: "בן משפחה חדש",
    noPhoto: "אין תמונה",
  },
  en: {
    title: "The family",
    back: "Back",
    signOut: "Sign out",
    add: "Add a family member",
    local: "In this version, photos and names are stored on this device only.",
    demo: "This is a sample family so you can try the game. You can remove it and add your own.",
    removeDemo: "Remove the sample family",
    player: "What she is called",
    name: "Name in Hebrew",
    nameEn: "Name in English",
    nick: "Nicknames (comma separated)",
    gender: "Gender",
    f: "Woman",
    m: "Man",
    relation: "Relation to her",
    rel: {
      spouse: "Husband / wife (Grandpa)",
      child: "Son / daughter",
      inlaw: "Son / daughter-in-law",
      grandchild: "Grandchild",
      grandInlaw: "Grandchild's husband / wife",
      great: "Great-grandchild",
      other: "Other",
    },
    partner: "Husband / wife / partner",
    parents: "Parents (for the “daughter of…” hint)",
    none: "None",
    note: "A short line about them (Hebrew)",
    noteEn: "A short line (English)",
    photos: "Photos",
    addPhoto: "Add a photo",
    voice: "Voice greeting (“Hi Grandma, it's me…”)",
    record: "Record",
    importVoice: "Import a recording",
    voiceTooBig: "The recording is too large (up to 4MB). A short greeting is enough.",
    saving: "Saving…",
    saveFailed: "Saving did not work. Please try again.",
    stop: "Stop",
    listen: "Play",
    removeVoice: "Delete recording",
    save: "Save",
    cancel: "Cancel",
    del: "Delete",
    confirmDel: "Delete",
    needName: "A name is needed",
    edit: "Edit",
    newPerson: "New family member",
    noPhoto: "No photo",
  },
} as const;

const MAX_VOICE_BYTES = 4 * 1024 * 1024;

const blank = (): Person => ({
  id: crypto.randomUUID(),
  name: "",
  nameEn: "",
  nicknames: [],
  gender: "f",
  relation: "grandchild",
  parentIds: [],
  photos: [],
  note: "",
  noteEn: "",
  level: 0,
  seen: 0,
});

/** Shrink a photo in the browser to a 4:5 portrait of at most 720px wide. */
async function toPortrait(file: File): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const ratio = 4 / 5;
  let sw = bmp.width;
  let sh = bmp.height;
  if (sw / sh > ratio) sw = sh * ratio;
  else sh = sw / ratio;
  const w = Math.min(720, Math.round(sw));
  const h = Math.round(w / ratio);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  // Keep the crop slightly above centre, where faces usually are.
  const sx = (bmp.width - sw) / 2;
  const sy = (bmp.height - sh) * 0.35;
  c.getContext("2d")!.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.84);
}

export default function Admin() {
  const { settings, update: updateSettings } = useSettings();
  const { people, mode, savePerson, removePerson, removeDemo } = useFamily();
  const [editing, setEditing] = useState<Person | null>(null);
  const lang = settings.lang;
  const a = A[lang];

  if (!people) return <main className="admin" />;
  const hasDemo = people.some((p) => p.demo);

  const save = async (p: Person, voice: VoiceChange) => {
    await savePerson(p, voice);
    setEditing(null);
  };

  const remove = async (p: Person) => {
    if (!confirm(`${a.confirmDel} ${displayName(p, lang)}?`)) return;
    await removePerson(p.id);
    setEditing(null);
  };

  return (
    <main className="admin">
      <header className="topbar">
        <Link href="/" className="quiet">
          {a.back}
        </Link>
        <div className="row">
          {mode === "cloud" && (
            <button
              className="quiet"
              onClick={async () => {
                await fetch("/api/login", { method: "DELETE" });
                location.href = "/login";
              }}
            >
              {a.signOut}
            </button>
          )}
          <LangToggle lang={lang} onChange={(l) => updateSettings({ lang: l })} />
        </div>
      </header>

      <div className="adminhead">
        <h1>{a.title}</h1>
        <button className="btn primary" onClick={() => setEditing(blank())}>
          <Icon name="plus" />
          {a.add}
        </button>
      </div>

      {mode === "local" && <p className="notice">{a.local}</p>}
      {hasDemo && (
        <p className="notice">
          {a.demo}{" "}
          <button className="link" onClick={removeDemo}>
            {a.removeDemo}
          </button>
        </p>
      )}

      <label className="field inline">
        <span>{a.player}</span>
        <input
          value={lang === "he" ? settings.playerHe : settings.playerEn}
          onChange={(e) => updateSettings(lang === "he" ? { playerHe: e.target.value } : { playerEn: e.target.value })}
        />
      </label>

      <ul className="people">
        {people.map((p) => (
          <li key={p.id}>
            <button onClick={() => setEditing(p)} aria-label={`${a.edit} ${displayName(p, lang)}`}>
              <div className="frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.photos[0] ? <img src={p.photos[0]} alt="" /> : <span className="nophoto">{a.noPhoto}</span>}
              </div>
              <strong>{displayName(p, lang)}</strong>
              <small>{relationLabel(p, lang)}</small>
            </button>
          </li>
        ))}
      </ul>

      {editing && (
        <Editor
          key={editing.id}
          person={editing}
          people={people}
          lang={lang}
          isNew={!people.some((x) => x.id === editing.id)}
          onSave={save}
          onDelete={remove}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}

function Editor({
  person,
  people,
  lang,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  person: Person;
  people: Person[];
  lang: Lang;
  isNew: boolean;
  onSave: (p: Person, voice: VoiceChange) => Promise<void>;
  onDelete: (p: Person) => Promise<void>;
  onClose: () => void;
}) {
  const a = A[lang];
  const [p, setP] = useState<Person>(person);
  const [nick, setNick] = useState(person.nicknames.join(", "));
  // undefined = unchanged, null = removed, Blob = newly recorded
  const [voice, setVoice] = useState<VoiceChange>(undefined);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const others = people.filter((x) => x.id !== p.id);
  const hasVoice = voice ? true : voice === null ? false : !!p.hasVoice;

  useEffect(() => () => recorder.current?.stream.getTracks().forEach((tr) => tr.stop()), []);

  const set = (patch: Partial<Person>) => setP((prev) => ({ ...prev, ...patch }));

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      try {
        urls.push(await toPortrait(f));
      } catch {
        /* skip files the browser cannot read */
      }
    }
    setP((prev) => ({ ...prev, photos: [...prev.photos, ...urls] }));
  };

  const toggleRecord = async () => {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setVoice(new Blob(chunks, { type: rec.mimeType }));
        setRecording(false);
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  };

  const listen = async () => {
    const blob = voice ?? (await loadVoice(person).catch(() => undefined));
    if (blob) playBlob(blob);
  };

  const importVoice = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_VOICE_BYTES) {
      setError(a.voiceTooBig);
      return;
    }
    setError("");
    setVoice(file);
  };

  const submit = async () => {
    if (!p.name.trim()) {
      setError(a.needName);
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave(
        {
          ...p,
          name: p.name.trim(),
          nameEn: p.nameEn?.trim(),
          nicknames: nick.split(",").map((x) => x.trim()).filter(Boolean),
          hasVoice,
          demo: false,
        },
        voice,
      );
    } catch {
      setError(a.saveFailed);
      setSaving(false);
    }
  };

  const parentSelect = (slot: 0 | 1) => (
    <select
      value={p.parentIds[slot] ?? ""}
      onChange={(e) => {
        const ids = [...p.parentIds];
        ids[slot] = e.target.value;
        set({ parentIds: ids.filter(Boolean) });
      }}
    >
      <option value="">{a.none}</option>
      {others.map((x) => (
        <option key={x.id} value={x.id}>
          {displayName(x, lang)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="sheetwrap" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <div className="sheethead">
          <h2>{isNew ? a.newPerson : displayName(person, lang)}</h2>
          <button className="quiet icon" onClick={onClose} aria-label={a.cancel}>
            <Icon name="close" />
          </button>
        </div>

        <div className="grid2">
          <label className="field">
            <span>{a.name}</span>
            <input dir="rtl" value={p.name} onChange={(e) => set({ name: e.target.value })} autoFocus={isNew} />
          </label>
          <label className="field">
            <span>{a.nameEn}</span>
            <input dir="ltr" value={p.nameEn ?? ""} onChange={(e) => set({ nameEn: e.target.value })} />
          </label>
          <label className="field">
            <span>{a.relation}</span>
            <select value={p.relation} onChange={(e) => set({ relation: e.target.value as Relation })}>
              {(Object.keys(a.rel) as Relation[]).map((r) => (
                <option key={r} value={r}>
                  {a.rel[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{a.gender}</span>
            <select value={p.gender} onChange={(e) => set({ gender: e.target.value as Gender })}>
              <option value="f">{a.f}</option>
              <option value="m">{a.m}</option>
            </select>
          </label>
          <div className="field">
            <span>{a.parents}</span>
            <div className="pair">
              {parentSelect(0)}
              {parentSelect(1)}
            </div>
          </div>
          <label className="field">
            <span>{a.partner}</span>
            <select
              value={partnerOf(p, people)?.id ?? ""}
              disabled={p.relation === "spouse"}
              onChange={(e) => set({ partnerId: e.target.value || undefined })}
            >
              <option value="">{a.none}</option>
              {others.map((x) => (
                <option key={x.id} value={x.id}>
                  {displayName(x, lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{a.nick}</span>
            <input value={nick} onChange={(e) => setNick(e.target.value)} />
          </label>
          <label className="field">
            <span>{a.note}</span>
            <input dir="rtl" value={p.note ?? ""} onChange={(e) => set({ note: e.target.value })} />
          </label>
          <label className="field">
            <span>{a.noteEn}</span>
            <input dir="ltr" value={p.noteEn ?? ""} onChange={(e) => set({ noteEn: e.target.value })} />
          </label>
        </div>

        <div className="field">
          <span>{a.photos}</span>
          <div className="thumbs">
            {p.photos.map((src, i) => (
              <div className="thumb" key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" />
                <button
                  aria-label={a.del}
                  onClick={() => set({ photos: p.photos.filter((_, k) => k !== i) })}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
            <label className="thumb addthumb">
              <Icon name="plus" />
              <small>{a.addPhoto}</small>
              <input type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
            </label>
          </div>
        </div>

        <div className="field">
          <span>{a.voice}</span>
          <div className="row start">
            <button className={`btn tool ${recording ? "live" : ""}`} onClick={toggleRecord}>
              <Icon name="mic" />
              {recording ? a.stop : a.record}
            </button>
            {!recording && (
              <label className="btn tool">
                <Icon name="upload" />
                {a.importVoice}
                <input
                  type="file"
                  accept="audio/*,.opus,.ogg,.oga,.m4a,.mp3,.wav,.aac,.amr,.webm"
                  hidden
                  onChange={(e) => {
                    importVoice(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            {hasVoice && !recording && (
              <>
                <button className="btn tool" onClick={listen}>
                  <Icon name="play" />
                  {a.listen}
                </button>
                <button className="link" onClick={() => setVoice(null)}>
                  {a.removeVoice}
                </button>
              </>
            )}
          </div>
        </div>

        {error && <p className="msg">{error}</p>}

        <div className="sheetfoot">
          <button className="btn primary" onClick={submit} disabled={saving}>
            {saving ? a.saving : a.save}
          </button>
          <button className="btn ghost" onClick={onClose}>
            {a.cancel}
          </button>
          {!isNew && (
            <button className="link danger" onClick={() => onDelete(person)}>
              {a.del}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
