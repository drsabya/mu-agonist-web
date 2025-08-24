"use client";

import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm font-mono text-gray-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
          <h1 className="text-center text-2xl font-extrabold tracking-tight">
            Welcome
          </h1>
          <p className="mt-1 text-center text-xs text-gray-500 dark:text-zinc-400">
            Minimal. Monochrome. Focused.
          </p>

          <div className="mt-6">
            <button
              onClick={handleGoogleLogin}
              type="button"
              className="inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold tracking-wide text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:bg-zinc-100 dark:text-zinc-900 dark:focus:ring-zinc-100"
            >
              Continue with Google
            </button>
          </div>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-gray-500 dark:text-zinc-500">
            By continuing, you agree to our Terms & Privacy.
          </p>
        </div>
      </div>
    </div>
  );
}
