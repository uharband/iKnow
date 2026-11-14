import type { Metadata } from "next";

// A personal link is a key. Keep it out of search engines, and do not pass it
// along to other sites in the Referer header.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
