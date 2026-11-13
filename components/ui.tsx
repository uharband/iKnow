"use client";

import type { Lang, Person } from "@/lib/types";

export function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="lang" role="group" aria-label="Language / שפה">
      <button className={lang === "he" ? "on" : ""} onClick={() => onChange("he")} aria-pressed={lang === "he"}>
        עברית
      </button>
      <button className={lang === "en" ? "on" : ""} onClick={() => onChange("en")} aria-pressed={lang === "en"}>
        English
      </button>
    </div>
  );
}

export function Frame({ person, className = "" }: { person: Person; className?: string }) {
  return (
    <div className={`frame ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={person.photos[0]} alt="" draggable={false} />
    </div>
  );
}

const paths: Record<string, React.ReactNode> = {
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.800 1-2.500A6 6 0 0 0 12 3z" />
    </>
  ),
  sound: (
    <>
      <path d="M4 10v4h3l5 4V6L7 10z" />
      <path d="M16 9a4 4 0 0 1 0 6M18.500 6.500a8 8 0 0 1 0 11" />
    </>
  ),
  mute: (
    <>
      <path d="M4 10v4h3l5 4V6L7 10z" />
      <path d="M16 9.500l5 5M21 9.500l-5 5" />
    </>
  ),
  play: <path d="M8 5v14l11-7z" />,
  check: <path d="M5 12.500l4.500 4.500L19 7.500" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
};

export function Icon({ name, size = 24 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.800"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}
