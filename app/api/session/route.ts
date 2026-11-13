import { NextResponse } from "next/server";
import { isAuthed, passwordSet } from "@/lib/server/auth";
import { hasDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    mode: hasDb ? "cloud" : "local",
    authed: hasDb ? await isAuthed() : true,
    passwordSet: passwordSet(),
  });
}
