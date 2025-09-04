// app/profile/delete-account/page.tsx
"use client";

import * as React from "react";

const EMAIL = "muagonistapp@gmail.com";
const SUBJECT = "Delete Account Request";

export default function DeleteAccountPage() {
  const [copied, setCopied] = React.useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = EMAIL;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  const mailtoHref = `mailto:${EMAIL}?subject=${encodeURIComponent(SUBJECT)}`;

  return (
    <main className="min-h-[calc(100svh-0px)] bg-white text-black dark:bg-black dark:text-white font-mono">
      <section className="mx-auto w-full max-w-2xl px-6 py-16">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Delete Account</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Request deletion of your account and associated data.
          </p>
        </header>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
          <div className="space-y-4">
            <p className="leading-relaxed">
              To delete your account and associated data, please email us at{" "}
              <span className="underline decoration-dotted underline-offset-4">
                {EMAIL}
              </span>{" "}
              with the subject{" "}
              <span className="whitespace-nowrap">
                &lsquo;{SUBJECT}&rsquo;.
              </span>
            </p>

            <p className="leading-relaxed">
              We will delete your account data from database within{" "}
              <strong>30 days</strong>.
            </p>

            <p className="leading-relaxed">
              Some <em>anonymized</em> analytics data may be retained for
              internal reporting.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyEmail}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 active:scale-[0.99] transition"
              >
                <span className="inline-block h-3.5 w-3.5">
                  {/* copy icon (monochrome inline SVG) */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-full w-full"
                  >
                    <rect
                      x="9"
                      y="9"
                      width="13"
                      height="13"
                      rx="2"
                      className="stroke-current"
                      strokeWidth="1.5"
                    />
                    <rect
                      x="2"
                      y="2"
                      width="13"
                      height="13"
                      rx="2"
                      className="stroke-current"
                      strokeWidth="1.5"
                    />
                  </svg>
                </span>
                {copied ? "Copied" : "Copy email"}
              </button>

              <a
                href={mailtoHref}
                className="inline-flex items-center gap-2 rounded-xl bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm hover:opacity-90 active:scale-[0.99] transition"
              >
                <span className="inline-block h-3.5 w-3.5">
                  {/* send/mail icon (monochrome inline SVG) */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-full w-full"
                  >
                    <path
                      d="M22 2L11 13"
                      className="stroke-current"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M22 2L15 22l-4-9-9-4 20-7z"
                      className="stroke-current"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </span>
                Email request
              </a>
            </div>

            <div
              className="sr-only"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {copied ? "Email copied to clipboard" : ""}
            </div>

            <hr className="my-6 border-neutral-200 dark:border-neutral-800" />

            <details className="group">
              <summary className="list-none cursor-pointer select-none text-sm text-neutral-600 dark:text-neutral-400">
                <span className="mr-2 inline-block h-3 w-3 rotate-0 transition-transform group-open:rotate-90">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-full w-full"
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      className="stroke-current"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                What happens after I email you?
              </summary>
              <div className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    We verify ownership of the account associated with the
                    request.
                  </li>
                  <li>
                    We queue your database records for deletion and confirm once
                    complete (within 30 days).
                  </li>
                  <li>
                    We retain only aggregated/anonymized analytics that cannot
                    identify you.
                  </li>
                </ol>
              </div>
            </details>
          </div>
        </div>

        <footer className="mt-8 text-xs text-neutral-500 dark:text-neutral-500">
          If you emailed by mistake, reply to the same thread to cancel your
          request before processing is complete.
        </footer>
      </section>
    </main>
  );
}
