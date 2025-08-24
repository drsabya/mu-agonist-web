import Link from "next/link";

export const metadata = { title: "403 · Forbidden" };

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-screen-md flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-bold">403 — Forbidden</h1>
      <p className="mt-2 text-gray-600">
        You’re signed in, but you don’t have permission to access this page.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
      >
        Go home
      </Link>
    </main>
  );
}
