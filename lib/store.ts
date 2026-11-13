"use client";

import { del, get, set } from "idb-keyval";
import { useCallback, useEffect, useState } from "react";
import { demoFamily } from "./demo";
import type { Person, Settings } from "./types";

// Two homes for the family data, behind one set of functions:
//  - "cloud": the shared database, reached through /api (when the site has one configured)
//  - "local": this browser only (IndexedDB), used for trying the game without any setup

export type Mode = "local" | "cloud";
interface Session {
  mode: Mode;
  authed: boolean;
  passwordSet: boolean;
}
type SharedSettings = Partial<Pick<Settings, "playerHe" | "playerEn">>;
interface Family {
  people: Person[];
  settings: SharedSettings;
}

const PEOPLE = "iknow:people";
const SETTINGS = "iknow:settings";
const voiceKey = (id: string) => `iknow:voice:${id}`;

export const DEFAULT_SETTINGS: Settings = { lang: "he", sound: true, playerHe: "סבתא", playerEn: "Grandma" };

let sessionP: Promise<Session> | null = null;
export function getSession(): Promise<Session> {
  sessionP ??= fetch("/api/session")
    .then((r) => r.json() as Promise<Session>)
    .catch(() => ({ mode: "local" as Mode, authed: true, passwordSet: false }));
  return sessionP;
}
export const resetSession = () => {
  sessionP = null;
  familyP = null;
};

const toLogin = () => {
  if (location.pathname !== "/login") location.replace("/login");
};

async function api(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, init);
  if (res.status === 401) {
    toLogin();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res;
}
const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

async function fetchFamily(): Promise<{ mode: Mode; family: Family } | null> {
  const session = await getSession();
  if (session.mode === "cloud") {
    if (!session.authed) {
      toLogin();
      return null;
    }
    return { mode: "cloud", family: await (await api("/api/family")).json() };
  }
  let people = await get<Person[]>(PEOPLE);
  if (!people) {
    people = demoFamily();
    await set(PEOPLE, people);
  }
  return { mode: "local", family: { people, settings: {} } };
}

// One load shared by every hook on the page.
let familyP: ReturnType<typeof fetchFamily> | null = null;
const loadFamily = (fresh = false) => {
  if (fresh || !familyP) familyP = fetchFamily();
  return familyP;
};

const mediaId = (url: string) => url.split("/").pop()!;
const isNewPhoto = (src: string) => src.startsWith("data:");

export async function loadVoice(p: Person): Promise<Blob | undefined> {
  if (p.voiceUrl) return (await api(p.voiceUrl)).blob();
  return get<Blob>(voiceKey(p.id));
}

/** `voice`: a Blob replaces the greeting, null removes it, undefined leaves it alone. */
export type VoiceChange = Blob | null | undefined;

export function useFamily() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [mode, setMode] = useState<Mode>("local");

  const reload = useCallback(async (fresh = false) => {
    const loaded = await loadFamily(fresh);
    if (!loaded) return;
    setMode(loaded.mode);
    setPeople(loaded.family.people);
  }, []);

  useEffect(() => {
    reload().catch(() => setPeople([]));
  }, [reload]);

  const saveLocal = useCallback(async (next: Person[]) => {
    setPeople(next);
    await set(PEOPLE, next);
    familyP = null;
  }, []);

  const savePerson = useCallback(
    async (p: Person, voice: VoiceChange) => {
      const list = people ?? [];
      const before = list.find((x) => x.id === p.id);
      if (mode === "local") {
        if (voice) await set(voiceKey(p.id), voice);
        if (voice === null) await del(voiceKey(p.id));
        await saveLocal(before ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p]);
        return;
      }
      // Photos travel separately as files, never inside the JSON.
      const { photos: _photos, voiceUrl: _voiceUrl, ...fields } = p;
      await api(`/api/people/${p.id}`, json("PUT", fields));
      for (const gone of (before?.photos ?? []).filter((src) => !p.photos.includes(src))) {
        await api(`/api/media/${mediaId(gone)}`, { method: "DELETE" });
      }
      for (const src of p.photos.filter(isNewPhoto)) {
        const blob = await (await fetch(src)).blob();
        await api(`/api/people/${p.id}/media?kind=photo`, {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: blob,
        });
      }
      if (voice) {
        await api(`/api/people/${p.id}/media?kind=voice`, {
          method: "POST",
          headers: { "Content-Type": voice.type || "audio/ogg" },
          body: voice,
        });
      } else if (voice === null && before?.voiceUrl) {
        await api(`/api/media/${mediaId(before.voiceUrl)}`, { method: "DELETE" });
      }
      await reload(true);
    },
    [people, mode, saveLocal, reload],
  );

  const removePerson = useCallback(
    async (id: string) => {
      if (mode === "local") {
        await del(voiceKey(id));
        await saveLocal(
          (people ?? []).filter((x) => x.id !== id).map((x) => ({ ...x, parentIds: x.parentIds.filter((y) => y !== id) })),
        );
        return;
      }
      await api(`/api/people/${id}`, { method: "DELETE" });
      await reload(true);
    },
    [people, mode, saveLocal, reload],
  );

  /** Local mode only: drop the fictional sample family. */
  const removeDemo = useCallback(async () => {
    const keep = (people ?? []).filter((p) => !p.demo);
    const ids = new Set(keep.map((p) => p.id));
    await saveLocal(keep.map((p) => ({ ...p, parentIds: p.parentIds.filter((id) => ids.has(id)) })));
  }, [people, saveLocal]);

  /** Store the quiet progress of one person after a card. Never blocks the game. */
  const recordProgress = useCallback(
    (p: Person) => {
      const next = (people ?? []).map((x) => (x.id === p.id ? p : x));
      if (mode === "local") {
        void saveLocal(next);
        return;
      }
      setPeople(next);
      familyP = null;
      api(`/api/people/${p.id}/stats`, json("POST", { level: p.level, seen: p.seen, lastSeen: p.lastSeen })).catch(
        () => undefined,
      );
    },
    [people, mode, saveLocal],
  );

  return { people, mode, savePerson, removePerson, removeDemo, recordProgress };
}

let settingsTimer: ReturnType<typeof setTimeout> | undefined;

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let local: Partial<Settings> = {};
    try {
      local = JSON.parse(localStorage.getItem(SETTINGS) || "{}");
    } catch {
      /* defaults are fine */
    }
    setSettings((s) => ({ ...s, ...local }));
    setReady(true);
    // What she is called is shared between devices; language and sound stay per device.
    if (location.pathname !== "/login") {
      loadFamily()
        .then((loaded) => {
          if (loaded?.mode === "cloud") setSettings((s) => ({ ...s, ...loaded.family.settings }));
        })
        .catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = settings.lang;
    document.documentElement.dir = settings.lang === "he" ? "rtl" : "ltr";
  }, [settings.lang]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(SETTINGS, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      if ("playerHe" in patch || "playerEn" in patch) {
        clearTimeout(settingsTimer);
        settingsTimer = setTimeout(async () => {
          if ((await getSession()).mode !== "cloud") return;
          familyP = null;
          api("/api/settings", json("PUT", { playerHe: next.playerHe, playerEn: next.playerEn })).catch(() => undefined);
        }, 600);
      }
      return next;
    });
  }, []);

  return { settings, update, ready };
}

export const playerName = (s: Settings) => (s.lang === "he" ? s.playerHe : s.playerEn);
