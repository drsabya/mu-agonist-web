// app/cms/page.tsx
import Link from "next/link";
import AdminGuard from "@/app/components/auth/AdminGuard";
import { createClient } from "@/utils/supabase/server";
import { ALLOWED_TYPES, type ContentType } from "@/utils/cms";

export const metadata = { title: "CMS · Mu agonist" };

const CREATE_TYPES: Array<{ type: ContentType; label: string }> = [
  { type: "drag-drop", label: "Drag Drop" },
  { type: "slider-mover", label: "Slider Mover" },
  { type: "slider-resizer", label: "Slider Resizer" },
  { type: "media-overlay", label: "Media Overlay" },
];

export default async function CMSPage() {
  const supabase = await createClient();

  const { data: lessons, error } = await supabase
    .from("lesson_items")
    .select("id, title, type, status")
    .order("updated_at", { ascending: false });

  if (error) console.error("Error fetching lessons:", error.message);

  const total = lessons?.length ?? 0;
  const drafts = lessons?.filter((l) => l.status === "draft").length ?? 0;
  const published =
    lessons?.filter((l) => l.status === "published").length ?? 0;

  const stats = [
    { label: "Total Lessons", value: total },
    { label: "Drafts", value: drafts },
    { label: "Published", value: published },
  ];

  return (
    <AdminGuard>
      <main className="mx-auto w-full max-w-screen-lg p-6">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CMS Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Admin-only controls & insights
            </p>
          </div>

          {/* Quick create (optional top-right button to default type) */}
          <Link
            href={`/cms/new?type=${ALLOWED_TYPES[0]}`}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-black/50"
          >
            + New item
          </Link>
        </header>

        {/* Stats */}
        <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="mt-2 text-2xl font-semibold">{s.value}</p>
            </div>
          ))}
        </section>

        {/* Create links */}
        <section className="mb-8">
          <p className="mb-3 text-sm font-medium text-gray-700">Create item:</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CREATE_TYPES.map(({ type, label }) => (
              <Link
                key={type}
                href={`/cms/new?type=${type}`}
                className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-black/50"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

        {/* Lessons */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold">Lesson Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {lessons?.map((l) => (
                  <tr key={l.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <Link href={`/cms/${l.id}`} className="hover:underline">
                        {l.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{l.type}</td>
                    <td className="px-4 py-3 capitalize">
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!lessons?.length && (
                  <tr>
                    <td className="px-4 py-8 text-gray-500" colSpan={3}>
                      No items yet. Create your first one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AdminGuard>
  );
}
