import { NextResponse } from "next/server";
import { GUEST_COOKIE, isSupabaseConfigured } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    const sb = await supabaseServer();
    await sb.auth.signOut();
  }
  const res = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  res.cookies.set(GUEST_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
