export type Gender = "f" | "m";
/**
 * Relation to the player: her husband/wife, a child, a child's partner, a grandchild,
 * a grandchild's partner, a great-grandchild, or anyone else.
 */
export type Relation = "spouse" | "child" | "inlaw" | "grandchild" | "grandInlaw" | "great" | "other";
export type Lang = "he" | "en";

export interface Person {
  id: string;
  /** Name in Hebrew (primary). */
  name: string;
  /** Name in English (optional, falls back to `name`). */
  nameEn?: string;
  /** Other names that should count as a correct spoken answer. */
  nicknames: string[];
  gender: Gender;
  relation: Relation;
  /** Up to two parents, by id, used for the "daughter of ..." hint. */
  parentIds: string[];
  /** Husband, wife or partner, by id. Recorded on one side is enough; it is read both ways. */
  partnerId?: string;
  /** Photos as data URLs (resized in the browser). */
  photos: string[];
  note?: string;
  noteEn?: string;
  hasVoice?: boolean;
  /** Set when the greeting lives in the shared database. */
  voiceUrl?: string;
  /** Quiet confidence level 0..3, never shown to the player. */
  level: number;
  seen: number;
  lastSeen?: number;
  demo?: boolean;
}

export interface Settings {
  lang: Lang;
  sound: boolean;
  playerHe: string;
  playerEn: string;
}
