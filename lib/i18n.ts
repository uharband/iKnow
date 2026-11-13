import type { Lang, Person } from "./types";

const he = {
  morning: "בוקר טוב",
  noon: "צהריים טובים",
  evening: "ערב טוב",
  night: "לילה טוב",
  homeSub: "בואי ניפגש עם המשפחה",
  start: "נתחיל",
  manage: "ניהול המשפחה",
  finish: "סיום",
  hint: "רמז",
  anotherHint: "רמז נוסף",
  reveal: "גלי לי",
  say: "לומר את השם",
  listening: "אני מקשיבה…",
  notHeard: "לא שמעתי היטב. אפשר לנסות שוב, או לבחור מהשמות.",
  almost: "כמעט. הנה רמז קטן.",
  almostPlain: "כמעט. אפשר לנסות שוב.",
  correct: "נכון",
  next: "הלאה",
  startsWith: (l: string) => `השם מתחיל באות ${l}׳`,
  hearVoice: "לשמוע את הקול",
  doneTitle: (n: string) => `היה נעים, ${n}`,
  doneSub: (c: number) => `פגשנו היום ${c} בני משפחה`,
  again: "סבב נוסף",
  home: "חזרה לדף הבית",
  empty: "עדיין אין תמונות של בני משפחה.",
  emptyCta: "להוספת בני משפחה",
  soundOn: "הקול פועל",
  soundOff: "הקול כבוי",
  of: "מתוך",
};

const en: typeof he = {
  morning: "Good morning",
  noon: "Good afternoon",
  evening: "Good evening",
  night: "Good night",
  homeSub: "Let's visit with the family",
  start: "Begin",
  manage: "Manage family",
  finish: "Finish",
  hint: "Hint",
  anotherHint: "Another hint",
  reveal: "Show me",
  say: "Say the name",
  listening: "Listening…",
  notHeard: "I didn't quite catch that. Try again, or choose a name.",
  almost: "Almost. Here is a small hint.",
  almostPlain: "Almost. Try again.",
  correct: "That's right",
  next: "Continue",
  startsWith: (l: string) => `The name begins with “${l}”`,
  hearVoice: "Hear the voice",
  doneTitle: (n: string) => `That was lovely, ${n}`,
  doneSub: (c: number) => `We met ${c} family members today`,
  again: "Another round",
  home: "Back to home",
  empty: "There are no family photos yet.",
  emptyCta: "Add family members",
  soundOn: "Sound on",
  soundOff: "Sound off",
  of: "of",
};

export const strings = { he, en };
export const t = (lang: Lang) => strings[lang];
export const dirOf = (lang: Lang) => (lang === "he" ? "rtl" : "ltr");

export function displayName(p: Person, lang: Lang): string {
  return lang === "en" ? p.nameEn?.trim() || p.name : p.name;
}

const REL_HE: Record<string, [string, string]> = {
  child: ["הבן", "הבת"],
  grandchild: ["הנכד", "הנכדה"],
  great: ["הנין", "הנינה"],
  inlaw: ["החתן", "הכלה"],
  other: ["קרוב משפחה", "קרובת משפחה"],
};
const REL_EN: Record<string, [string, string]> = {
  child: ["son", "daughter"],
  grandchild: ["grandson", "granddaughter"],
  great: ["great-grandson", "great-granddaughter"],
  inlaw: ["son-in-law", "daughter-in-law"],
  other: ["relative", "relative"],
};

/** "הנכדה" / "Granddaughter", used as a short label. */
export function relationLabel(p: Person, lang: Lang): string {
  const i = p.gender === "f" ? 1 : 0;
  if (lang === "en") {
    const s = REL_EN[p.relation][i];
    return s[0].toUpperCase() + s.slice(1);
  }
  return REL_HE[p.relation][i];
}

/** "הנכדה שלך" / "Your granddaughter". */
export function relationPhrase(p: Person, lang: Lang): string {
  const i = p.gender === "f" ? 1 : 0;
  if (lang === "en") return `Your ${REL_EN[p.relation][i]}`;
  return `${REL_HE[p.relation][i]} שלך`;
}

/** "הבת של מיכל ודני" / "Michal and Danny's daughter". Null when no parents are known. */
export function parentPhrase(p: Person, all: Person[], lang: Lang): string | null {
  const parents = p.parentIds
    .map((id) => all.find((x) => x.id === id))
    .filter((x): x is Person => !!x);
  if (!parents.length) return null;
  const names = parents.map((x) => displayName(x, lang));
  if (lang === "en") {
    return `${names.join(" and ")}’s ${p.gender === "f" ? "daughter" : "son"}`;
  }
  return `${p.gender === "f" ? "הבת" : "הבן"} של ${names.join(" ו")}`;
}

export function whoQuestion(p: Person, lang: Lang): string {
  if (lang === "en") return "Who is this?";
  return p.gender === "f" ? "מי זו?" : "מי זה?";
}

/** "זו נועה" / "This is Noa". */
export function thisIs(p: Person, lang: Lang): string {
  const n = displayName(p, lang);
  if (lang === "en") return `This is ${n}`;
  return `${p.gender === "f" ? "זו" : "זה"} ${n}`;
}

export function greeting(lang: Lang, hour: number): string {
  const s = t(lang);
  if (hour >= 5 && hour < 12) return s.morning;
  if (hour >= 12 && hour < 17) return s.noon;
  if (hour >= 17 && hour < 22) return s.evening;
  return s.night;
}
