"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatWhen, type ConversationSummary } from "@/lib/chat";
import { displayName } from "@/lib/i18n";
import { api, useFamily, useSettings } from "@/lib/store";

const T = {
  he: { title: "שיחות", back: "חזרה", none: "עדיין אין שיחות.", count: (n: number) => `${n} הודעות`, waiting: (n: number) => `${n} מחכות לה`,
    del: "מחיקת השיחה",
    delConfirm: (n: string, c: number) => `למחוק את כל ${c} ההודעות בשיחה עם ${n}? אי אפשר לשחזר אותן.`,
    delAll: "מחיקת כל ההודעות",
    delAllConfirm: (c: number) => `למחוק את כל ההודעות של כל בני המשפחה (${c} הודעות)? אי אפשר לשחזר אותן.`,
    delAllConfirm2: "זו אזהרה אחרונה: כל השיחות וההקלטות שבהן יימחקו לצמיתות. להמשיך?",
    failed: "המחיקה לא הצליחה. אפשר לנסות שוב.",
  },
  en: { title: "Conversations", back: "Back", none: "No conversations yet.", count: (n: number) => `${n} messages`, waiting: (n: number) => `${n} waiting for her`,
    del: "Delete conversation",
    delConfirm: (n: string, c: number) => `Delete all ${c} messages in the conversation with ${n}? They cannot be restored.`,
    delAll: "Delete all messages",
    delAllConfirm: (c: number) => `Delete every message of every family member (${c} messages)? They cannot be restored.`,
    delAllConfirm2: "Last warning: all conversations and the recordings in them will be deleted for good. Continue?",
    failed: "Deleting did not work. Please try again.",
  },
};

/** The manager's overview of every conversation. Opening one here never marks anything as read. */
export default function AdminMessages() {
  const { settings } = useSettings();
  const { people } = useFamily();
  const lang = settings.lang;
  const t = T[lang];
  const [summary, setSummary] = useState<ConversationSummary[] | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const load = () =>
    api("/api/messages")
      .then((r) => r.json())
      .then((d) => setSummary(d.conversations))
      .catch(() => setSummary([]));

  useEffect(() => {
    load();
  }, []);

  const remove = async (query: string) => {
    setBusy(true);
    setError(false);
    try {
      await api(`/api/messages?${query}`, { method: "DELETE" });
    } catch {
      setError(true);
    }
    await load();
    setBusy(false);
  };

  if (!people || !summary) return <main className="admin" />;
  const rows = [...summary].sort((a, b) => b.lastAt - a.lastAt);

  return (
    <main className="admin">
      <header className="topbar">
        <Link href="/admin" className="quiet">
          {t.back}
        </Link>
      </header>
      <div className="adminhead">
        <h1>{t.title}</h1>
      </div>
      {error && <p className="msg">{t.failed}</p>}
      {rows.length === 0 && <p className="notice">{t.none}</p>}
      <ul className="convlist">
        {rows.map((c) => {
          const p = people.find((x) => x.id === c.personId);
          if (!p) return null;
          return (
            <li key={c.personId}>
              <Link href={`/family/${c.personId}?admin=1`}>
                <strong>{displayName(p, lang)}</strong>
                <span>
                  {t.count(c.total)}
                  {c.unread ? ` · ${t.waiting(c.unread)}` : ""}
                </span>
                <time>{formatWhen(c.lastAt, lang)}</time>
              </Link>
              <button
                className="link danger"
                disabled={busy}
                onClick={() => {
                  if (confirm(t.delConfirm(displayName(p, lang), c.total))) remove(`person=${encodeURIComponent(c.personId)}`);
                }}
              >
                {t.del}
              </button>
            </li>
          );
        })}
      </ul>
      {rows.length > 0 && (
        <div className="dangerzone">
          <button
            className="btn"
            disabled={busy}
            onClick={() => {
              const total = rows.reduce((n, c) => n + c.total, 0);
              // Wiping everything takes two separate confirmations.
              if (confirm(t.delAllConfirm(total)) && confirm(t.delAllConfirm2)) remove("all=1");
            }}
          >
            {t.delAll}
          </button>
        </div>
      )}
    </main>
  );
}
