"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Conversation } from "@/components/conversation";
import { Frame } from "@/components/ui";
import { chatStrings, type Msg } from "@/lib/chat";
import { displayName, relationPhrase } from "@/lib/i18n";
import { api, json, playerName, useFamily, useSettings } from "@/lib/store";

const REFRESH_MS = 20_000;

/** The player's conversation with one family member. With `?admin=1` it is the manager's read-only view. */
export default function Chat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { settings } = useSettings();
  const { people } = useFamily();
  const lang = settings.lang;
  const m = chatStrings(lang);
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [admin, setAdmin] = useState(false);

  const load = useCallback(async () => {
    const isAdmin = new URLSearchParams(location.search).has("admin");
    setAdmin(isAdmin);
    const d = await (await api(`/api/messages?person=${encodeURIComponent(id)}`)).json();
    setMessages(d.messages);
    // Only the player opening the conversation counts as reading it.
    if (!isAdmin && d.messages.some((x: Msg) => !x.fromPlayer && !x.read)) {
      api(`/api/messages/read?person=${encodeURIComponent(id)}`, { method: "POST" }).catch(() => undefined);
    }
  }, [id]);

  useEffect(() => {
    load().catch(() => setMessages([]));
    const t = setInterval(() => load().catch(() => undefined), REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const person = people?.find((p) => p.id === id);
  if (!people || !messages) return <main className="chatpage" />;
  if (!person) {
    return (
      <main className="done in">
        <Link href="/family" className="btn primary">
          {m.back}
        </Link>
      </main>
    );
  }

  const name = displayName(person, lang);
  const send = async (payload: string | Blob) => {
    const url = `/api/messages?person=${encodeURIComponent(id)}`;
    if (typeof payload === "string") await api(url, json("POST", { text: payload }));
    else await api(url, { method: "POST", headers: { "Content-Type": payload.type || "audio/webm" }, body: payload });
    await load();
  };

  return (
    <main className="chatpage">
      <header className="topbar">
        <Link href={admin ? "/admin/messages" : "/family"} className="quiet">
          {m.back}
        </Link>
        <div className="chathead">
          {person.photos[0] && <Frame person={person} />}
          <div>
            <strong>{name}</strong>
            <small>{relationPhrase(person, people, lang)}</small>
          </div>
        </div>
        <span className="quiet icon" />
      </header>
      <Conversation
        messages={messages}
        lang={lang}
        viewer="player"
        big={!admin}
        readOnly={admin}
        names={{ player: playerName(settings), member: name }}
        emptyText={m.empty(name)}
        onSend={send}
      />
    </main>
  );
}
