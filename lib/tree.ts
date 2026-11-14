import { partnerOf } from "./i18n";
import type { Person } from "./types";

/**
 * The tree is played one household at a time, so the screen never fills up:
 * a couple at the top, and below them their children, each beside their partner.
 */
export interface Unit {
  id: string;
  /** The couple at the top. Empty for the first unit, where the player herself (and her spouse) head the tree. */
  parents: Person[];
  root: boolean;
  /** Each group is a child of the couple, followed by their partner when there is one. */
  groups: Person[][];
  /** The unit that must be finished before this one is offered. */
  parentUnit?: string;
}

export interface Tree {
  units: Unit[];
  /** The player's husband or wife, shown beside her at the top. */
  spouses: Person[];
  /** People who cannot be drawn because nothing links them to the tree. */
  unplaced: Person[];
}

export function buildTree(people: Person[]): Tree {
  const spouses = people.filter((p) => p.relation === "spouse");
  const childrenOf = (couple: Person[]) =>
    people.filter((x) => couple.some((c) => x.parentIds.includes(c.id)) && !couple.includes(x));

  const units: Unit[] = [];
  const drawn = new Set<string>(spouses.map((p) => p.id));

  const addUnit = (id: string, parents: Person[], kids: Person[], parentUnit?: string) => {
    const fresh = kids.filter((k) => !drawn.has(k.id));
    if (!fresh.length) return;
    const groups = fresh.map((k) => {
      drawn.add(k.id);
      const partner = partnerOf(k, people);
      if (partner && !drawn.has(partner.id) && !fresh.includes(partner)) {
        drawn.add(partner.id);
        return [k, partner];
      }
      return [k];
    });
    units.push({ id, parents, root: !parentUnit, groups, parentUnit });
    for (const group of groups) addUnit(group[0].id, group, childrenOf(group), id);
  };

  // Her children: marked as such, or listed as children of her spouse.
  const firstGeneration = people.filter(
    (p) => p.relation === "child" || spouses.some((s) => p.parentIds.includes(s.id)),
  );
  addUnit("root", [], firstGeneration);

  return { units, spouses, unplaced: people.filter((p) => !drawn.has(p.id)) };
}

/** The units that can be offered next: not yet finished, and hanging from a finished one. */
export function frontier(tree: Tree, done: Set<string>): Unit[] {
  return tree.units.filter((u) => !done.has(u.id) && (!u.parentUnit || done.has(u.parentUnit)));
}
