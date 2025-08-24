// app/auth/signout/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const url = new URL("/auth/login", request.url); // ✅ base from current request
  return NextResponse.redirect(url);
}
