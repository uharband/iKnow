"use client";

import { del, get, set } from "idb-keyval";
import { useCallback, useEffect, useState } from "react";
import { demoFamily } from "./demo";
import type { Person, Settings } from "./types";

// For now everything lives in this browser only (IndexedDB). The functions here
// are the single seam that will later be pointed at the shared family database.

const PEOPLE = "iknow:people";
const SETTINGS = "iknow:settings";
const voiceKey = (id: string) => `iknow:voice:${id}`;

export const DEFAULT_SETTINGS: Settings = { lang: "he", sound: true, playerHe: "סבתא", playerEn: "Grandma" };

export async function loadPeople(): Promise<Person[]> {
  const stored = await get<Person[]>(PEOPLE);
  if (stored) return stored;
  const demo = demoFamily();
  await set(PEOPLE, demo);
  return demo;
}
export const savePeople = (people: Person[]) => set(PEOPLE, people);

export const saveVoice = (id: string, blob: Blob) => set(voiceKey(id), blob);
export const loadVoice = (id: string) => get<Blob>(voiceKey(id));
export const deleteVoice = (id: string) => del(voiceKey(id));

export function useFamily() {
  const [people, setPeople] = useState<Person[] | null>(null);
  useEffect(() => {
    loadPeople().then(setPeople);
  }, []);
  const update = useCallback(async (next: Person[]) => {
    setPeople(next);
    await savePeople(next);
  }, []);
  return { people, update };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      /* defaults are fine */
    }
    setReady(true);
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
      return next;
    });
  }, []);
  return { settings, update, ready };
}

export const playerName = (s: Settings) => (s.lang === "he" ? s.playerHe : s.playerEn);
