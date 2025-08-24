import { redirect, notFound } from "next/navigation";
import { getUserRole } from "@/utils/supabase/getUserRole";

export const metadata = { title: "CMS" };

export default async function CMSLayout({ children }: { children: React.ReactNode }) {
  const role = await getUserRole(); // uses SSR cookies
  if (!role) redirect("/auth/login?next=/cms");   // not signed in
  if (role !== "admin") notFound();               // or redirect("/403")
  return <>{children}</>;
}
