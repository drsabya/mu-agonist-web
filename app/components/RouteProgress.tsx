"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(
    () => `${pathname}?${searchParams?.toString() ?? ""}`,
    [pathname, searchParams]
  );

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    // start
    setVisible(true);
    setProgress(8);

    // trickle towards 80%
    const trickle = setInterval(() => {
      setProgress((p) => Math.min(p + 5 + Math.random() * 10, 80));
    }, 180);

    // finish after a short minimum duration (gives a nice “skeleton-ish” feel)
    const finish = () => {
      clearInterval(trickle);
      setProgress(100);
      setTimeout(() => {
        if (!mounted) return;
        setVisible(false);
        setProgress(0);
      }, 260); // fade out grace
    };

    const doneTimer = setTimeout(finish, 700);

    return () => {
      mounted = false;
      clearInterval(trickle);
      clearTimeout(doneTimer);
    };
  }, [routeKey]);

  return (
    <div className="pointer-events-none absolute bottom-0 left-0 w-full h-[3px]">
      <div
        className="h-full bg-emerald-600 transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
