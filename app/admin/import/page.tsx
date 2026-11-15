"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui";
import { parseFamilyList, peopleToCreate, planImport } from "@/lib/familyList";
import { useFamily, useSettings } from "@/lib/store";

const EXAMPLE = `אבי / Avi (ז) + רונית / Ronit (נ)
      נועה / Noa (נ) + דן / Dan (ז)
            איתי / Itai (ז)
      יואב / Yoav (ז)
מיכל / Michal (נ)`;

const T = {
  he: {
    title: "ייבוא רשימה",
    back: "חזרה",
    intro: "רשימה של כל המשפחה בקובץ טקסט אחד. לכל אחד נוצר פרופיל ראשוני עם השם והמקום במשפחה, ואת התמונות וההקלטות מוסיפים אחר כך.",
    format: "שורה לכל אדם או זוג, והזחה לכל דור. שורות בלי הזחה הן הילדים. הראשון בשורה הוא הצאצא, ואחרי ה-״+״ בן או בת הזוג. אחרי ״/״ השם באנגלית, ו-(ז) או (נ) למין.",
    choose: "בחירת קובץ",
    paste: "או להדביק כאן את הרשימה",
    preview: "תצוגה מקדימה",
    isNew: "חדש",
    exists: "כבר קיים",
    noGender: "חסר (ז) או (נ)",
    summary: (n: number, e: number) => `${n} פרופילים חדשים ייווצרו. ${e} כבר קיימים ולא ישתנו.`,
    bad: (l: string) => `לא הצלחתי לקרוא את השורות האלה: ${l}. כדאי לבדוק את ההזחה, ושיש לכל היותר ״+״ אחד בשורה.`,
    needGender: "יש שמות בלי מין. צריך להוסיף להם (ז) או (נ) לפני הייבוא.",
    go: (n: number) => `ייבוא ${n} פרופילים`,
    working: "מייבא…",
    done: (n: number) => `${n} פרופילים נוצרו.`,
    failed: "הייבוא נעצר באמצע. מי שכבר נוצר נשמר, ואפשר ללחוץ שוב כדי להשלים את השאר.",
    nothing: "כל מי שברשימה כבר קיים.",
    toFamily: "למסך המשפחה",
  },
  en: {
    title: "Import a list",
    back: "Back",
    intro: "The whole family in one text file. Everyone gets a first profile with their name and place in the family; photos and recordings are added later.",
    format: "One person or couple per line, indented once per generation. Lines without indentation are the children. The first name on a line is the descendant, and the name after “+” is their partner. English name after “/”, and (ז) or (נ), or (m) or (f), for gender.",
    choose: "Choose a file",
    paste: "Or paste the list here",
    preview: "Preview",
    isNew: "New",
    exists: "Already there",
    noGender: "Missing (m) or (f)",
    summary: (n: number, e: number) => `${n} new profiles will be created. ${e} already exist and will not change.`,
    bad: (l: string) => `These lines could not be read: ${l}. Check the indentation, and that a line has at most one “+”.`,
    needGender: "Some names have no gender. Add (m) or (f) to them before importing.",
    go: (n: number) => `Import ${n} profiles`,
    working: "Importing…",
    done: (n: number) => `${n} profiles created.`,
    failed: "The import stopped part way. Everyone already created is saved; press again to finish the rest.",
    nothing: "Everyone on the list is already there.",
    toFamily: "To the family screen",
  },
};

/** Create first profiles for the whole family from one indented text list. */
export default function ImportList() {
  const { settings } = useSettings();
  const { people, addPeople } = useFamily();
  const lang = settings.lang;
  const t = T[lang];
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; good?: boolean } | null>(null);

  const parsed = useMemo(() => parseFamilyList(text), [text]);
  const plan = useMemo(
    () => (people ? planImport(parsed.people, people, () => crypto.randomUUID()) : []),
    [parsed, people],
  );

  if (!people) return <main className="admin" />;

  const fresh = peopleToCreate(plan);
  const missingGender = plan.some((p) => !p.existing && !p.gender);

  const run = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await addPeople(fresh);
      setStatus({ text: t.done(fresh.length), good: true });
    } catch {
      setStatus({ text: t.failed });
    }
    setBusy(false);
  };

  return (
    <main className="admin importpage">
      <header className="topbar">
        <Link href="/admin" className="quiet">
          {t.back}
        </Link>
      </header>
      <div className="adminhead">
        <h1>{t.title}</h1>
      </div>
      <p className="lead">{t.intro}</p>
      <p className="notice">{t.format}</p>
      <pre className="listexample" dir="rtl">
        {EXAMPLE}
      </pre>

      <div className="row importpick">
        <label className="btn tool">
          <Icon name="upload" />
          {t.choose}
          <input
            type="file"
            accept=".txt,text/plain"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) {
                setStatus(null);
                setText(await f.text());
              }
            }}
          />
        </label>
      </div>
      <label className="field">
        <span>{t.paste}</span>
        <textarea
          dir="rtl"
          rows={8}
          value={text}
          onChange={(e) => {
            setStatus(null);
            setText(e.target.value);
          }}
        />
      </label>

      {parsed.badLines.length > 0 && <p className="msg">{t.bad(parsed.badLines.join(", "))}</p>}

      {plan.length > 0 && (
        <section className="importpreview">
          <h2>{t.preview}</h2>
          <ul>
            {plan.map((p, i) => (
              <li key={i} className={p.existing ? "known" : ""} style={{ paddingInlineStart: `${p.depth * 28 + (p.isPartner ? 18 : 0)}px` }}>
                <span className="who">
                  {p.isPartner && <span aria-hidden>+ </span>}
                  <strong>{p.name}</strong>
                  {p.nameEn && <span dir="ltr">{p.nameEn}</span>}
                </span>
                {!p.existing && !p.gender && <span className="tag warn">{t.noGender}</span>}
                <span className={`tag ${p.existing ? "" : "new"}`}>{p.existing ? t.exists : t.isNew}</span>
              </li>
            ))}
          </ul>
          <p className="lead">{fresh.length ? t.summary(fresh.length, plan.length - fresh.length) : t.nothing}</p>
          {missingGender && <p className="msg">{t.needGender}</p>}
          {status && <p className={`msg ${status.good ? "good" : ""}`}>{status.text}</p>}
          <div className="row">
            {fresh.length > 0 && (
              <button className="btn primary" disabled={busy || missingGender || parsed.badLines.length > 0} onClick={run}>
                {busy ? t.working : t.go(fresh.length)}
              </button>
            )}
            <Link href="/admin" className="btn">
              {t.toFamily}
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
