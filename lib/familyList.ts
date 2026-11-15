import type { Gender, Person, Relation } from "./types";

// A whole family typed as an indented list, one person or couple per line:
//
//   אבי / Avi (ז) + רונית / Ronit (נ)
//     נועה / Noa (נ) + דן / Dan (ז)
//       איתי / Itai (ז)
//   מיכל / Michal (נ)
//
// Lines without indentation are the player's children; each level of
// indentation is one generation down. The first name on a line is the
// descendant, and the name after "+" is their husband, wife or partner.

export interface ListedPerson {
  name: string;
  nameEn: string;
  /** Undefined when the list did not say; the import then asks to complete it. */
  gender?: Gender;
  relation: Relation;
  line: number;
  depth: number;
  /** True for the name after "+". */
  isPartner: boolean;
  /** Index (in the parsed list) of the couple this person's line hangs under. */
  parents: number[];
  /** Index of the other half of the couple, if any. */
  partner?: number;
}

export interface ParsedList {
  people: ListedPerson[];
  /** Line numbers (1-based) that could not be read. */
  badLines: number[];
}

const RELATIONS: [Relation, Relation][] = [
  ["child", "inlaw"],
  ["grandchild", "grandInlaw"],
  ["great", "other"],
];

const GENDER: Record<string, Gender> = { ז: "m", נ: "f", m: "m", f: "f", בן: "m", בת: "f" };

function readPerson(raw: string): { name: string; nameEn: string; gender?: Gender } | null {
  let text = raw.trim();
  let gender: Gender | undefined;
  const mark = text.match(/\(\s*([^()]+?)\s*\)/);
  if (mark) {
    gender = GENDER[mark[1].toLowerCase()];
    text = text.replace(mark[0], " ");
  }
  const [name, nameEn = ""] = text.split("/").map((part) => part.replace(/\s+/g, " ").trim());
  if (!name) return null;
  return { name: name.slice(0, 60), nameEn: nameEn.slice(0, 60), gender };
}

export function parseFamilyList(text: string): ParsedList {
  const people: ListedPerson[] = [];
  const badLines: number[] = [];
  // Indentation widths seen so far, so two spaces, four spaces and tabs all work.
  const widths: number[] = [];
  // The couple most recently seen at each depth.
  const couples: number[][] = [];

  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = rawLine.replace(/^﻿/, "").replace(/[‎‏]/g, "");
    if (!line.trim() || line.trim().startsWith("#")) return;
    const indent = line.match(/^[ \t]*/)![0].replace(/\t/g, "    ").length;
    while (widths.length && indent < widths[widths.length - 1]) widths.pop();
    if (!widths.length || indent > widths[widths.length - 1]) widths.push(indent);
    const depth = widths.length - 1;

    const parts = line.split("+").map(readPerson);
    if (parts.length > 2 || parts.some((p) => !p) || (depth > 0 && !couples[depth - 1])) {
      badLines.push(i + 1);
      return;
    }
    const [own, inlaw] = RELATIONS[Math.min(depth, RELATIONS.length - 1)];
    const first = people.length;
    const parents = depth > 0 ? couples[depth - 1] : [];
    parts.forEach((p, n) => {
      people.push({
        ...p!,
        relation: n === 0 ? own : inlaw,
        line: i + 1,
        depth,
        isPartner: n === 1,
        parents: n === 0 ? parents : [],
        partner: parts.length === 2 ? first + (1 - n) : undefined,
      });
    });
    couples[depth] = parts.map((_, n) => first + n);
    couples.length = depth + 1;
  });
  return { people, badLines };
}

export interface PlannedPerson extends ListedPerson {
  /** The id this entry will have: an existing person's, or a fresh one. */
  id: string;
  /** Set when this entry is someone already in the family, who is then left as is. */
  existing?: Person;
}

/**
 * Decide, for every listed person, whether they are already in the family.
 * A match needs the same name and a place that fits (same parent or partner),
 * or a name that is unique both in the list and in the family, or unique
 * there among people of the same relation.
 */
export function planImport(list: ListedPerson[], family: Person[], newId: () => string): PlannedPerson[] {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const listed = new Map<string, number>();
  for (const p of list) listed.set(norm(p.name), (listed.get(norm(p.name)) ?? 0) + 1);
  const claimed = new Set<string>();
  const plan: PlannedPerson[] = [];

  list.forEach((p, i) => {
    const same = family.filter((f) => !claimed.has(f.id) && norm(f.name) === norm(p.name));
    const parentIds = p.parents.map((n) => plan[n]?.existing?.id).filter(Boolean) as string[];
    // The descendant of a couple is always listed (and planned) before the partner.
    const mate = p.partner !== undefined && p.partner < i ? plan[p.partner]?.existing : undefined;
    const fits =
      same.find((f) => f.parentIds.some((id) => parentIds.includes(id))) ??
      (mate ? same.find((f) => f.partnerId === mate.id || mate.partnerId === f.id) : undefined);
    // Two people may share a name (an aunt and a niece's husband, say); their relation tells them apart.
    const sameKind = same.filter((f) => f.relation === p.relation);
    const listedKind = list.filter((q) => norm(q.name) === norm(p.name) && q.relation === p.relation).length;
    const existing =
      fits ??
      (same.length === 1 && listed.get(norm(p.name)) === 1 ? same[0] : undefined) ??
      (sameKind.length === 1 && listedKind === 1 ? sameKind[0] : undefined);
    if (existing) claimed.add(existing.id);
    plan.push({ ...p, id: existing?.id ?? newId(), existing });
  });
  return plan;
}

/** The new people an import would create, ready to be saved. People already in the family are not touched. */
export function peopleToCreate(plan: PlannedPerson[]): Person[] {
  return plan
    .filter((p) => !p.existing)
    .map((p) => ({
      id: p.id,
      name: p.name,
      nameEn: p.nameEn,
      nicknames: [],
      gender: p.gender ?? "f",
      relation: p.relation,
      parentIds: p.parents.map((n) => plan[n].id).slice(0, 2),
      // An existing person who already has a partner keeps them.
      partnerId:
        p.partner !== undefined && !(plan[p.partner].existing?.partnerId && plan[p.partner].existing?.partnerId !== p.id)
          ? plan[p.partner].id
          : undefined,
      photos: [],
      note: "",
      noteEn: "",
      level: 0,
      seen: 0,
    }));
}
