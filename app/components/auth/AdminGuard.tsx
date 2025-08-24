"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
// If you don't have a path alias, switch this to a relative import:
// import { useAuth } from "../../providers/AuthProvider";
import { useAuth } from "@/app/providers/AuthProvider";

type Props = { children: React.ReactNode };

export default function AdminGuard({ children }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search?.get("next") ?? "/cms";

  const { role } = useAuth(); // role is provided by your AuthProvider

  useEffect(() => {
    // Not admin → kick to 403. (Auth is already handled by your middleware)
    if (role !== null && role !== "admin") {
      router.replace(`/403?next=${encodeURIComponent(next)}`);
    }
  }, [role, router, next]);

  // While role is still unknown, show a tiny placeholder
  if (role === null) {
    return (
      <div className="p-6 text-sm text-gray-500">Checking permissions…</div>
    );
  }

  if (role !== "admin") return null; // prevent flash while redirecting

  return <>{children}</>;
}
