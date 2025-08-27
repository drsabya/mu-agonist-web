import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/";
  const supabase = await createClient();

  // --- OAuth (e.g., Google) ---
  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const dest = new URL(error ? "/auth/login?error=oauth" : next, url.origin);
    return NextResponse.redirect(dest);
  }

  // --- Email OTP / Magic Link ---
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    const dest = new URL(error ? "/auth/login?error=otp" : next, url.origin);
    return NextResponse.redirect(dest);
  }

  // Nothing to handle
  return NextResponse.redirect(
    new URL("/auth/login?error=missing_params", url.origin)
  );
}
