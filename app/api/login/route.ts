import { NextResponse } from "next/server";
import { checkPassword, COOKIE, sessionToken } from "@/lib/server/auth";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (typeof password !== "string" || !checkPassword(password)) {
    // A short pause makes guessing slow without bothering a person who mistyped.
    await new Promise((r) => setTimeout(r, 700));
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}
