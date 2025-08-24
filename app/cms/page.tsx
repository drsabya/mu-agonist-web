import AdminGuard from "@/app/components/auth/AdminGuard";

export const metadata = { title: "CMS · Mu agonist" };

const stats = [
  { label: "Total Lessons", value: 128 },
  { label: "Drafts", value: 17 },
  { label: "Published", value: 111 },
  { label: "Pending Reviews", value: 6 },
];

const recent = [
  { id: "LI-001", title: "Acid–Base Balance (Slider Mover)", author: "Dr. Rao", status: "draft", updatedAt: "2025-08-21" },
  { id: "LI-002", title: "Cardiac Murmurs (Drag & Drop)",   author: "Shreya P", status: "published", updatedAt: "2025-08-20" },
  { id: "LI-003", title: "HPV Genotypes Quick Ref",         author: "Team",     status: "published", updatedAt: "2025-08-18" },
  { id: "LI-004", title: "AMR: Carbapenemases Map",          author: "Dr. K",    status: "pending",   updatedAt: "2025-08-17" },
];

export default function CMSPage() {
  return (
    <AdminGuard>
      <main className="mx-auto w-full max-w-screen-lg p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">CMS Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Admin-only controls & insights</p>
        </header>

        {/* Stats */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="mt-2 text-2xl font-semibold">{s.value}</p>
            </div>
          ))}
        </section>

        {/* Recent */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold">Recent Lesson Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.id}</td>
                    <td className="px-4 py-3">{r.title}</td>
                    <td className="px-4 py-3">{r.author}</td>
                    <td className="px-4 py-3 capitalize">
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AdminGuard>
  );
}
