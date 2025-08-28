import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import RouteProgress from "@/app/components/RouteProgress";
import { getUserRole } from "@/utils/supabase/getUserRole";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // SSR role lookup (reads cookies server-side)
  const role = await getUserRole();

  const canSeeCMS = role === "admin" || role === "superadmin";

  return (
    <header className="relative w-full border-b border-gray-200 bg-white">
      {/* progress bar anchored to header bottom */}
      <RouteProgress />

      <div className="mx-auto max-w-screen-lg px-4 py-4 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight text-gray-900"
        >
          μ<sup>+</sup>
        </Link>

        {/* Navigation */}
        <nav className="flex gap-6 text-sm font-medium text-gray-600 items-center">
          <Link href="/" className="hover:text-gray-900">
            Home
          </Link>
          <Link href="/legal/about" className="hover:text-gray-900">
            About
          </Link>

          {canSeeCMS && (
            <Link href="/cms" className="hover:text-gray-900">
              CMS
            </Link>
          )}

          {user ? (
            <Link href="/profile" className="hover:text-gray-900">
              Profile
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="text-emerald-600 hover:text-emerald-800"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
