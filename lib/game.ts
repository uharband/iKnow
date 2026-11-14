import type { Person } from "./types";

export const MAX_LEVEL = 3;

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/**
 * Pick who appears in a round. Faces that are harder, or have not been seen
 * for a while, come up more often; the round opens and closes on the two
 * most familiar faces so that it starts and ends with a success.
 */
export function buildRound(people: Person[], size = 6): Person[] {
  const pool = people.filter((p) => p.photos.length > 0);
  const now = Date.now();
  const need = (p: Person) => {
    const days = p.lastSeen ? Math.min((now - p.lastSeen) / 86_400_000, 7) : 7;
    // The difficulty term is a gentle lean, deliberately smaller than the random spread,
    // so a hard face returns a little more often without the round feeling repetitive.
    return (MAX_LEVEL - p.level) * 2 + days * 0.5 + (p.difficulty ?? 0) * 2.5 + Math.random() * 3;
  };
  const picked = shuffle(pool)
    .sort((a, b) => need(b) - need(a))
    .slice(0, size);
  if (picked.length < 3) return picked;
  const byEase = [...picked].sort((a, b) => b.level - a.level);
  const first = byEase[0];
  const last = byEase[1];
  const middle = shuffle(picked.filter((p) => p !== first && p !== last));
  return [first, ...middle, last];
}

/** Two names to choose from at first, growing to four as confidence grows. */
export function optionsFor(target: Person, people: Person[]): Person[] {
  const count = Math.min(target.level <= 0 ? 2 : target.level === 1 ? 3 : 4, people.length);
  const others = shuffle(people.filter((p) => p.id !== target.id));
  // The more confident she is, the closer the alternatives (same gender, same generation).
  const closeness = (p: Person) =>
    (p.gender === target.gender ? 2 : 0) + (p.relation === target.relation ? 1 : 0);
  const sorted =
    target.level >= 2
      ? others.sort((a, b) => closeness(b) - closeness(a))
      : others.sort((a, b) => (b.gender === target.gender ? 1 : 0) - (a.gender === target.gender ? 1 : 0));
  return shuffle([target, ...sorted.slice(0, count - 1)]);
}

export { shuffle };

export type Outcome = "clean" | "helped" | "revealed";

/** Above this, a person is quietly marked in the family screen as worth reinforcing. */
export const HARD_THRESHOLD = 0.3;

const STRUGGLE: Record<Outcome, number> = { clean: 0, helped: 0.5, revealed: 1 };

export function applyOutcome(p: Person, outcome: Outcome): Person {
  const delta = outcome === "clean" ? 1 : outcome === "revealed" ? -1 : 0;
  return {
    ...p,
    difficulty: Math.round(((p.difficulty ?? 0) * 0.7 + STRUGGLE[outcome] * 0.3) * 1000) / 1000,
    level: Math.max(0, Math.min(MAX_LEVEL, p.level + delta)),
    seen: p.seen + 1,
    lastSeen: Date.now(),
  };
}
