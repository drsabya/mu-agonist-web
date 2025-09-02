// app/tools/page.tsx
import Link from "next/link";

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900 pt-4 sm:pt-6">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">Tools</h1>
        </header>

        {/* Beta notice */}
        <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
          <p className="text-xs sm:text-sm text-neutral-700">
            <span className="mr-2 inline-flex items-center rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide">
              Beta
            </span>
            These tools are in beta — expect occasional breaking changes.
          </p>
        </div>

        <section className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
          {/* Recharge Protocol */}
          <Link
            href="/tools/recharge-protocol"
            className="group block rounded-lg border border-neutral-300 bg-white p-4 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-colors"
            aria-label="Open Recharge Protocol"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">
                Recharge Protocol
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded border border-neutral-200 text-neutral-600">
                Break Timer
              </span>
            </div>
            <p className="mt-2 text-xs text-neutral-600">
              Minimal break timer with guided micro-exercises.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold rounded border border-neutral-900 bg-neutral-900 text-white px-3 py-1 group-hover:bg-neutral-800">
              Open
              <span aria-hidden>→</span>
            </span>
          </Link>

          {/* NEET-PG Subject Pathfinder */}
          {/* <Link
            href="/tools/my-branch"
            className="group block rounded-lg border border-neutral-300 bg-white p-4 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-colors"
            aria-label="Open NEET-PG Subject Pathfinder"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">
                NEET-PG Subject Pathfinder
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded border border-neutral-200 text-neutral-600">
                Psychometric
              </span>
            </div>
            <p className="mt-2 text-xs text-neutral-600">
              Interactive, monochrome decision tool to suggest the best NEET-PG
              subject fit.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold rounded border border-neutral-900 bg-neutral-900 text-white px-3 py-1 group-hover:bg-neutral-800">
              Open
              <span aria-hidden>→</span>
            </span>
          </Link> */}

          {/* Biostats Tests Tool */}
          <Link
            href="/tools/biostats-tests"
            className="group block rounded-lg border border-neutral-300 bg-white p-4 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-colors"
            aria-label="Open Biostats Tests Tool"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">
                Biostats Tests Tool
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded border border-neutral-200 text-neutral-600">
                Learning Aid
              </span>
            </div>
            <p className="mt-2 text-xs text-neutral-600">
              Minimal, interactive tool to practice choosing the right
              statistical test based on variables and study design.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold rounded border border-neutral-900 bg-neutral-900 text-white px-3 py-1 group-hover:bg-neutral-800">
              Open
              <span aria-hidden>→</span>
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}
