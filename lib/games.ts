import type { Lang } from "./types";

/** Every game the home screen offers. Adding a game is one entry here plus its page. */
export interface GameInfo {
  id: string;
  href: string;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
}

export const GAMES: GameInfo[] = [
  {
    id: "who",
    href: "/play",
    title: { he: "מי זה?", en: "Who is this?" },
    description: { he: "תמונה אחת, ולבחור או לומר את השם", en: "One photo; choose or say the name" },
  },
  {
    id: "tree",
    href: "/tree",
    title: { he: "עץ המשפחה", en: "Family tree" },
    description: { he: "להניח כל אחד במקומו בעץ, ענף אחרי ענף", en: "Place everyone in the tree, branch by branch" },
  },
];
