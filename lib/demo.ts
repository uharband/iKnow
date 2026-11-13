import type { Gender, Person, Relation } from "./types";

type Hair = "short" | "long" | "bob" | "bun" | "bald" | "curly";
interface Look {
  bg: string;
  skin: string;
  hair: string;
  style: Hair;
  shirt: string;
  glasses?: boolean;
  beard?: boolean;
}

/** A quiet, faceless editorial portrait used only for the sample family. */
function portrait(l: Look): string {
  const hairBack: Record<Hair, string> = {
    short: "",
    bald: "",
    long: `<path d="M118 150c0-62 34-98 82-98s82 36 82 98v150h-164z" fill="${l.hair}"/>`,
    bob: `<path d="M120 150c0-60 34-96 80-96s80 36 80 96v70h-160z" fill="${l.hair}"/>`,
    bun: `<circle cx="200" cy="52" r="30" fill="${l.hair}"/>`,
    curly: `<g fill="${l.hair}"><circle cx="132" cy="130" r="34"/><circle cx="268" cy="130" r="34"/><circle cx="150" cy="84" r="36"/><circle cx="250" cy="84" r="36"/><circle cx="200" cy="66" r="38"/><circle cx="128" cy="180" r="28"/><circle cx="272" cy="180" r="28"/></g>`,
  };
  const hairFront: Record<Hair, string> = {
    short: `<path d="M134 150c-6-58 24-90 66-90s72 32 66 90c-10-30-28-44-66-44s-56 14-66 44z" fill="${l.hair}"/>`,
    bald: `<path d="M134 176c-2-16 0-30 4-42M266 176c2-16 0-30-4-42" stroke="${l.hair}" stroke-width="9" fill="none" stroke-linecap="round"/>`,
    long: `<path d="M134 156c-8-60 22-94 66-94s74 34 66 94c-12-34-34-50-66-50s-54 16-66 50z" fill="${l.hair}"/>`,
    bob: `<path d="M134 156c-8-60 22-94 66-94s74 34 66 94c-8-38-30-56-78-52-30 4-46 22-54 52z" fill="${l.hair}"/>`,
    bun: `<path d="M134 152c-6-58 24-88 66-88s72 30 66 88c-12-30-32-42-66-42s-54 12-66 42z" fill="${l.hair}"/>`,
    curly: `<path d="M136 146c-4-40 24-72 64-72s68 32 64 72c-14-22-34-32-64-32s-50 10-64 32z" fill="${l.hair}"/>`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
<rect width="400" height="500" fill="${l.bg}"/>
<rect width="400" height="500" fill="url(#g)"/>
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient></defs>
${hairBack[l.style]}
<path d="M40 500c0-110 60-170 160-170s160 60 160 170z" fill="${l.shirt}"/>
<path d="M168 290h64v52c0 18-14 32-32 32s-32-14-32-32z" fill="${l.skin}"/>
<path d="M168 318c20 14 44 14 64 0v-28h-64z" fill="#000" opacity=".1"/>
<ellipse cx="200" cy="190" rx="68" ry="86" fill="${l.skin}"/>
${l.beard ? `<path d="M136 200c4 60 30 82 64 82s60-22 64-82c-10 30-30 40-64 40s-54-10-64-40z" fill="${l.hair}"/>` : ""}
${hairFront[l.style]}
${l.glasses ? `<g fill="none" stroke="#2b2b2b" stroke-width="5"><rect x="150" y="176" width="42" height="32" rx="12"/><rect x="208" y="176" width="42" height="32" rx="12"/><path d="M192 190h16"/></g>` : ""}
</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const SKIN = ["#E8C4A2", "#D9A77F", "#F0D2B6", "#C68E6A"];
const row = (
  id: string,
  name: string,
  nameEn: string,
  gender: Gender,
  relation: Relation,
  parentIds: string[],
  look: Look,
  note: string,
  noteEn: string,
): Person => ({
  id,
  name,
  nameEn,
  nicknames: [],
  gender,
  relation,
  parentIds,
  photos: [portrait(look)],
  note,
  noteEn,
  level: 0,
  seen: 0,
  demo: true,
});

/** A fictional family, so the game can be tried before real photos are added. */
export function demoFamily(): Person[] {
  return [
    row("d-michal", "מיכל", "Michal", "f", "child", [], { bg: "#B9C4C0", skin: SKIN[0], hair: "#5A4634", style: "bob", shirt: "#2F4A3F" }, "גרה בחיפה, מורה למוזיקה", "Lives in Haifa, a music teacher"),
    row("d-danny", "דני", "Danny", "m", "child", [], { bg: "#C9BFAE", skin: SKIN[1], hair: "#8A8A88", style: "short", shirt: "#1E2638", glasses: true }, "מהנדס, אוהב לטייל", "An engineer who loves hiking"),
    row("d-ronit", "רונית", "Ronit", "f", "child", [], { bg: "#D4C2B4", skin: SKIN[2], hair: "#3B2A22", style: "long", shirt: "#7A3E3A" }, "רופאת ילדים", "A pediatrician"),
    row("d-avi", "אבי", "Avi", "m", "inlaw", [], { bg: "#BCC3CE", skin: SKIN[1], hair: "#4A4A4A", style: "bald", shirt: "#5B6472", beard: true }, "בעלה של מיכל", "Michal's husband"),
    row("d-noa", "נועה", "Noa", "f", "grandchild", ["d-michal", "d-avi"], { bg: "#C7CDB8", skin: SKIN[0], hair: "#2B211C", style: "curly", shirt: "#A9824C" }, "אדריכלית, אמא של אורי ומאיה", "An architect, mother of Ori and Maya"),
    row("d-yoav", "יואב", "Yoav", "m", "grandchild", ["d-michal", "d-avi"], { bg: "#B7C2CC", skin: SKIN[0], hair: "#3A2C22", style: "short", shirt: "#3F5C7A", beard: true }, "לומד רפואה בירושלים", "Studying medicine in Jerusalem"),
    row("d-tamar", "תמר", "Tamar", "f", "grandchild", ["d-danny"], { bg: "#D8CBB0", skin: SKIN[3], hair: "#6B3F2A", style: "bun", shirt: "#2F4A3F", glasses: true }, "עורכת דין, אמא של איתי", "A lawyer, mother of Itai"),
    row("d-ido", "עידו", "Ido", "m", "grandchild", ["d-danny"], { bg: "#C2B8C4", skin: SKIN[3], hair: "#1F1A17", style: "curly", shirt: "#4A3F5C" }, "מנגן בגיטרה", "Plays the guitar"),
    row("d-shira", "שירה", "Shira", "f", "grandchild", ["d-ronit"], { bg: "#CDB9B0", skin: SKIN[2], hair: "#B5803F", style: "long", shirt: "#1E2638" }, "סטודנטית לאמנות", "An art student"),
    row("d-ori", "אורי", "Ori", "m", "great", ["d-noa"], { bg: "#BFD0C6", skin: SKIN[0], hair: "#6B4A2E", style: "short", shirt: "#C26A4A" }, "בן שש, אוהב כדורגל", "Six years old, loves football"),
    row("d-maya", "מאיה", "Maya", "f", "great", ["d-noa"], { bg: "#DCCFC0", skin: SKIN[0], hair: "#2B211C", style: "bob", shirt: "#8C5A7A" }, "בת ארבע, אוהבת לצייר", "Four years old, loves to draw"),
    row("d-itai", "איתי", "Itai", "m", "great", ["d-tamar"], { bg: "#C4CBD6", skin: SKIN[3], hair: "#3A2418", style: "curly", shirt: "#2F6A5C" }, "בן שנתיים", "Two years old"),
  ];
}
