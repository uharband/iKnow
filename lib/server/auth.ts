import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hasDb } from "./db";

export const COOKIE = "iknow_session";
const password = () => process.env.ADMIN_PASSWORD || "";
export const passwordSet = () => !!password();

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** The session cookie is a keyed hash of the password, so changing the password signs everyone out. */
export const sessionToken = () => createHmac("sha256", password()).update("iknow-session-v1").digest("hex");

export const checkPassword = (given: string) => passwordSet() && safeEqual(given, password());

export async function isAuthed(): Promise<boolean> {
  if (!passwordSet()) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  return !!value && safeEqual(value, sessionToken());
}

/** Returns an error response when the request may not touch family data, otherwise null. */
export async function guard(): Promise<NextResponse | null> {
  if (!hasDb) return NextResponse.json({ error: "no-database" }, { status: 404 });
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}
