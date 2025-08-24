import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

type UserRoleRow = { role: string };

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<UserRoleRow>();

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const pickString = (k: string) =>
    typeof meta[k] === "string" ? (meta[k] as string) : undefined;

  const name =
    pickString("name") ??
    pickString("full_name") ??
    pickString("fullname") ??
    pickString("user_name") ??
    "—";

  const email = user.email ?? "—";
  const role = roleRow?.role ?? "—";

  return (
    <main className="mx-auto max-w-screen-sm px-4 py-10 font-mono">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>
      <div className="space-y-3 text-sm">
        <div><span className="text-gray-500">Name:</span> {name}</div>
        <div><span className="text-gray-500">Email:</span> {email}</div>
        <div><span className="text-gray-500">Role:</span> {role}</div>
      </div>

      <div className="mt-8">
        <a
          href="/auth/signout"
          className="inline-block rounded bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
        >
          Sign out
        </a>
      </div>
    </main>
  );
}
