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

  const toggleId = "nav-toggle";

  return (
    <header className="relative w-full border-b border-gray-200 bg-white">
      {/* progress bar anchored to header bottom */}
      <RouteProgress />

      {/* Top bar */}
      <div className="mx-auto max-w-screen-lg px-4 py-4 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight text-gray-900"
        >
          μ<sup>+</sup>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-600 items-center">
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

        {/* Mobile hamburger (label toggles hidden checkbox below) */}
        <label
          htmlFor={toggleId}
          className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 cursor-pointer"
          aria-controls="mobile-menu"
          aria-label="Toggle navigation menu"
        >
          {/* Hamburger / Close icons (pure SVG, server-safe) */}
          <svg
            className="h-5 w-5 peer-checked:hidden"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <svg
            className="h-5 w-5 hidden peer-checked:block"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </label>
      </div>

      {/* Hidden checkbox MUST be a previous sibling of the menu */}
      <input
        id={toggleId}
        type="checkbox"
        className="peer hidden md:hidden"
        tabIndex={-1}
      />

      {/* Mobile Menu (peer-controlled) */}
      <div
        id="mobile-menu"
        className="md:hidden overflow-hidden max-h-0 peer-checked:max-h-96 transition-[max-height] duration-300 ease-out border-t border-gray-200"
      >
        <div className="mx-auto max-w-screen-lg px-4 py-3 space-y-2 text-sm font-medium text-gray-700">
          <Link href="/" className="block hover:text-gray-900">
            Home
          </Link>
          <Link href="/legal/about" className="block hover:text-gray-900">
            About
          </Link>
          {canSeeCMS && (
            <Link href="/cms" className="block hover:text-gray-900">
              CMS
            </Link>
          )}
          {user ? (
            <Link href="/profile" className="block hover:text-gray-900">
              Profile
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="block text-emerald-600 hover:text-emerald-800"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
