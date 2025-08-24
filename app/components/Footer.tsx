import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-200">
      <div className="mx-auto max-w-screen-sm sm:max-w-3xl px-4 py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs sm:text-sm  text-gray-500 text-center sm:text-left">
          © {new Date().getFullYear()} Mu agonist. All rights reserved.
        </p>
        <nav className="flex flex-wrap justify-center gap-4 text-sm ">
          <Link href="/legal/about" className="text-gray-700 hover:underline">About</Link>
          <Link href="/legal/privacy" className="text-gray-700 hover:underline">Privacy</Link>
          <Link href="/legal/terms" className="text-gray-700 hover:underline">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
