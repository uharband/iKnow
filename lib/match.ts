import type { Person } from "./types";

const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

/** Lower-case, strip niqqud and punctuation, unify Hebrew final letters. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[֑-ׇ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/\s+/g, " ")
    .trim();
}

/** Drop the Hebrew vowel letters so that נועה / נעה compare equal. */
const skeleton = (s: string) => s.replace(/[וי]/g, "");

function lev(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function tokenMatch(heard: string, want: string): boolean {
  if (heard === want) return true;
  const isHeb = /[א-ת]/.test(want);
  if (isHeb && want.length >= 3 && skeleton(heard) === skeleton(want) && skeleton(want).length >= 2) return true;
  if (want.length >= 5 && lev(heard, want) <= 1) return true;
  return false;
}

export function namesOf(p: Person): string[] {
  return [p.name, p.nameEn ?? "", ...p.nicknames].map(normalize).filter(Boolean);
}

/** Does any of the phrases the engine heard contain one of this person's names? */
export function heardPerson(alternatives: string[], p: Person): boolean {
  const names = namesOf(p);
  return alternatives.some((alt) => {
    const words = normalize(alt).split(" ");
    return names.some((n) => {
      const parts = n.split(" ");
      for (let i = 0; i + parts.length <= words.length; i++) {
        if (parts.every((part, k) => tokenMatch(words[i + k], part))) return true;
      }
      return false;
    });
  });
}

export type HeardResult = "correct" | "other" | "unknown";

/** Lenient on purpose: the right name anywhere in any alternative counts. */
export function judgeSpoken(alternatives: string[], target: Person, all: Person[]): HeardResult {
  if (heardPerson(alternatives, target)) return "correct";
  const top = alternatives.slice(0, 1);
  if (all.some((p) => p.id !== target.id && heardPerson(top, p))) return "other";
  return "unknown";
}
