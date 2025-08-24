// utils/supabase/getUserRole.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getUserRole() {
  const cookieStore = await cookies(); // now asynchronous

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // in RSC, cookies() is read-only — so setAll only works in Route Handlers or Middleware
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (error) return null;
  return data.role as string;
}
