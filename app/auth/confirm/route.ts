import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/";

  // --- OAuth (Google) ---
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient(); // ⬅️ await here
    await supabase.auth.exchangeCodeForSession(code);
    redirect(next);
  }

  // --- Email OTP (magic link, etc.) ---
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (token_hash && type) {
    const supabase = await createClient(); // ⬅️ await here
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) redirect(next);
  }

  redirect("/error");
}
