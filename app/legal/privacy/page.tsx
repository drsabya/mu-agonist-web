// app/legal/privacy/page.tsx
export const dynamic = "force-static"; // safe default for a public legal page

// ---- Update these in one place ----
const BRAND = "Mu agonist";
const CONTACT_EMAIL = "muagonistapp@gmail.com";
// const POSTAL_ADDRESS = "[Update with full postal address, India]";
const JURISDICTION_CITY = "Mumbai"; // e.g., "Mumbai"
const EFFECTIVE_DATE = "September 1, 2025";
// -----------------------------------

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl bg-white text-black px-6 py-10">
      <header className="mb-6">
        <h1 className="text-4xl font-bold font-mono">Privacy Policy</h1>
        <p className="mt-3 text-gray-700">Effective date: {EFFECTIVE_DATE}</p>
        <p className="mt-3 text-gray-700">
          This Privacy Policy explains how {BRAND} (“we”, “us”, “our”) collects,
          uses, shares, stores, and protects your personal data when you use our
          website, mobile application, and related services (collectively, the
          “Services”).
        </p>
        <p className="mt-3 text-gray-700">
          We comply with applicable Indian laws including the Digital Personal
          Data Protection Act, 2023 (“DPDP Act”) (to the extent notified and in
          force) and the Information Technology Act, 2000 and its rules,
          including the Information Technology (Reasonable Security Practices
          and Procedures and Sensitive Personal Data or Information) Rules, 2011
          (“SPDI Rules”). Where you are located outside India, local laws may
          also apply.
        </p>
      </header>

      <nav aria-label="Table of contents" className="my-6">
        <ol className="list-decimal pl-5 space-y-1 text-gray-900">
          <li>
            <a className="underline" href="#scope">
              Scope & Roles
            </a>
          </li>
          <li>
            <a className="underline" href="#data-we-collect">
              Personal Data We Collect
            </a>
          </li>
          <li>
            <a className="underline" href="#sources">
              Sources of Data
            </a>
          </li>
          <li>
            <a className="underline" href="#use-of-data">
              How & Why We Use Data
            </a>
          </li>
          <li>
            <a className="underline" href="#cookies">
              Cookies & Similar Technologies
            </a>
          </li>
          <li>
            <a className="underline" href="#sharing">
              Sharing & Service Providers
            </a>
          </li>
          <li>
            <a className="underline" href="#transfers">
              International Data Transfers
            </a>
          </li>
          <li>
            <a className="underline" href="#retention">
              Data Retention
            </a>
          </li>
          <li>
            <a className="underline" href="#security">
              Data Security
            </a>
          </li>
          <li>
            <a className="underline" href="#children">
              Children’s Data
            </a>
          </li>
          <li>
            <a className="underline" href="#your-rights">
              Your Rights & Choices
            </a>
          </li>
          <li>
            <a className="underline" href="#contact">
              Contact Us
            </a>
          </li>
          <li>
            <a className="underline" href="#changes">
              Changes to this Policy
            </a>
          </li>
          <li>
            <a className="underline" href="#law">
              Governing Law & Jurisdiction
            </a>
          </li>
        </ol>
      </nav>

      <section id="scope" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          1) Scope & Roles
        </h2>
        <p className="text-gray-800">
          This Policy applies to personal data processed in connection with our
          Services. For the purposes of the DPDP Act, {BRAND} typically acts as
          the “Data Fiduciary” (similar to “controller”) and engages certain
          “Data Processors” (service providers) to process data on our behalf.
        </p>
      </section>

      <section id="data-we-collect" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          2) Personal Data We Collect
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-800">
          <li>
            <span className="font-semibold">Account & Profile Data:</span> name,
            email, authentication identifiers, and basic profile information you
            provide.
          </li>
          <li>
            <span className="font-semibold">Subscription & Payments Data:</span>{" "}
            purchase history, subscription status, transaction identifiers and
            receipts (processed via app stores and payment processors; we do not
            store complete card details).
          </li>
          <li>
            <span className="font-semibold">Usage & Analytics:</span>{" "}
            pages/screens viewed, features used, session counts, app version,
            time spent, referrers, clicks.
          </li>
          <li>
            <span className="font-semibold">Device & Log Data:</span> IP
            address, device model, OS/browser, unique identifiers, crash logs,
            diagnostic logs.
          </li>
          <li>
            <span className="font-semibold">Communications:</span> queries,
            support requests, and feedback you send us.
          </li>
          <li>
            <span className="font-semibold">Optional Data You Submit:</span> any
            content you voluntarily provide through our website or app (e.g.,
            forms).
          </li>
        </ul>
        <p className="mt-3 text-gray-700">
          We do not intentionally collect sensitive personal data unless you
          explicitly provide it and it is necessary for the Services or required
          by law.
        </p>
      </section>

      <section id="sources" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          3) Sources of Data
        </h2>
        <p className="text-gray-800">
          We obtain data directly from you, from your device/browser, from our
          service providers, and (where permitted) from sign-in providers (e.g.,
          Google OAuth) to set up or authenticate your account.
        </p>
      </section>

      <section id="use-of-data" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          4) How & Why We Use Data
        </h2>
        <p className="text-gray-800">
          We process personal data with your consent and/or for legitimate uses
          permitted under the DPDP Act, such as providing and improving the
          Services, performing a contract with you, complying with legal
          obligations, and preventing fraud or misuse.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-800 mt-2">
          <li>Provide, operate, and maintain the Services.</li>
          <li>Authenticate users; manage accounts and subscriptions.</li>
          <li>Process purchases and send transactional communications.</li>
          <li>Monitor performance, fix bugs, and improve features.</li>
          <li>Measure usage and engagement (analytics).</li>
          <li>Send service updates, security alerts, and support notices.</li>
          <li>
            Comply with law, enforce terms, and protect our rights and users.
          </li>
        </ul>
        <p className="mt-3 text-gray-700">
          Where required by law, we will seek your consent (and allow withdrawal
          of consent) for specific processing activities.
        </p>
      </section>

      <section id="cookies" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          5) Cookies & Similar Technologies
        </h2>
        <p className="text-gray-800">
          Our website uses essential cookies (e.g., for authentication/session)
          and may use analytics cookies or local storage to understand how the
          Services are used. You can manage cookies through your browser
          settings. If we use non-essential cookies, we will provide appropriate
          notice and choices.
        </p>
      </section>

      <section id="sharing" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          6) Sharing & Service Providers
        </h2>
        <p className="text-gray-800">
          We share personal data with trusted service providers who process it
          on our behalf, under contracts that require appropriate safeguards:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-800 mt-2">
          <li>Hosting/CDN (e.g., Vercel)</li>
          <li>Authentication & Database (e.g., Supabase)</li>
          <li>Analytics (e.g., PostHog)</li>
          <li>
            Payments & Subscriptions (e.g., RevenueCat, Google Play Billing)
          </li>
          <li>Email/Notifications (e.g., Mailgun, Resend)</li>
        </ul>
        <p className="mt-3 text-gray-700">
          We may also disclose data if required by law, as part of business
          transfers (e.g., merger/acquisition), or with your consent.
        </p>
      </section>

      <section id="transfers" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          7) International Data Transfers
        </h2>
        <p className="text-gray-800">
          Our service providers may process data in countries other than India.
          Where required, we implement appropriate contractual or legal
          safeguards and limit transfers to what is necessary for the purposes
          described here.
        </p>
      </section>

      <section id="retention" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          8) Data Retention
        </h2>
        <p className="text-gray-800">
          We retain personal data for as long as necessary for the purposes set
          out in this Policy, to comply with legal obligations, resolve
          disputes, and enforce agreements. If you request deletion, we will
          take reasonable steps to delete or de-identify your data, unless
          retention is required by law.
        </p>
      </section>

      <section id="security" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          9) Data Security
        </h2>
        <p className="text-gray-800">
          We implement reasonable technical and organizational measures to
          protect personal data against unauthorized access, alteration,
          disclosure, or destruction. However, no method of transmission or
          storage is completely secure, and we cannot guarantee absolute
          security.
        </p>
      </section>

      <section id="children" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          10) Children’s Data
        </h2>
        <p className="text-gray-800">
          Our Services are intended for adults. Under the DPDP Act, “children”
          are persons under 18 years of age. We do not knowingly process
          children’s personal data without verifiable consent from a parent or
          lawful guardian. If you believe a child has provided personal data to
          us, please contact us so we can take appropriate action.
        </p>
      </section>

      <section id="your-rights" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          11) Your Rights & Choices
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-800">
          <li>Request access to your personal data.</li>
          <li>Request correction of inaccurate or incomplete data.</li>
          <li>
            Request deletion of personal data, subject to legal retention
            obligations.
          </li>
          <li>Withdraw consent where consent is the basis for processing.</li>
        </ul>
        <p className="mt-3 text-gray-700">
          To exercise these rights, please contact us at{" "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          . We may need to verify your identity before acting on your request.
        </p>
      </section>

      <section id="contact" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          12) Contact Us
        </h2>
        <p className="text-gray-800">
          If you have any questions or concerns about this Privacy Policy or our
          practices, please contact us:
        </p>
        <div className="mt-3 rounded-md border border-gray-200 p-4">
          <p>
            Email:{" "}
            <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
          {/* <p>Postal Address: {POSTAL_ADDRESS}</p> */}
        </div>
      </section>

      <section id="changes" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          13) Changes to this Policy
        </h2>
        <p className="text-gray-800">
          We may update this Policy from time to time. If we make material
          changes, we will provide a prominent notice (for example, on our
          website or via email). Please review this page periodically for the
          latest information.
        </p>
      </section>

      <section id="law" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          14) Governing Law & Jurisdiction
        </h2>
        <p className="text-gray-800">
          This Policy and any disputes arising from it are governed by the laws
          of India, and the courts at {JURISDICTION_CITY}, India shall have
          exclusive jurisdiction, subject to applicable law.
        </p>
      </section>
    </main>
  );
}
