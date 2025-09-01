// app/legal/terms/page.tsx
export const dynamic = "force-static"; // safe for a public legal page

// ---- Update constants here ----
const BRAND = "Mu agonist";
const CONTACT_EMAIL = "muagonistapp@gmail.com";
// const POSTAL_ADDRESS = "[Update with full postal address, India]";
const JURISDICTION_CITY = "Mumbai"; // e.g., "Mumbai"
const EFFECTIVE_DATE = "September 1, 2025";
// --------------------------------

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl bg-white text-black px-6 py-10">
      <header className="mb-6">
        <h1 className="text-4xl font-bold font-mono">Terms of Service</h1>
        <p className="mt-3 text-gray-700">Effective date: {EFFECTIVE_DATE}</p>
        <p className="mt-3 text-gray-700">
          Welcome to {BRAND}. By accessing or using our website, mobile
          application, or related services (“Services”), you agree to be bound
          by these Terms of Service (“Terms”). Please read them carefully.
        </p>
      </header>

      <nav aria-label="Table of contents" className="my-6">
        <ol className="list-decimal pl-5 space-y-1 text-gray-900">
          <li>
            <a className="underline" href="#eligibility">
              Eligibility
            </a>
          </li>
          <li>
            <a className="underline" href="#account">
              Account Registration & Security
            </a>
          </li>
          <li>
            <a className="underline" href="#use">
              Acceptable Use
            </a>
          </li>
          <li>
            <a className="underline" href="#subscriptions">
              Subscriptions & Payments
            </a>
          </li>
          <li>
            <a className="underline" href="#content">
              Content & Intellectual Property
            </a>
          </li>
          <li>
            <a className="underline" href="#thirdparty">
              Third-Party Services
            </a>
          </li>
          <li>
            <a className="underline" href="#termination">
              Suspension & Termination
            </a>
          </li>
          <li>
            <a className="underline" href="#disclaimer">
              Disclaimers
            </a>
          </li>
          <li>
            <a className="underline" href="#liability">
              Limitation of Liability
            </a>
          </li>
          <li>
            <a className="underline" href="#indemnity">
              Indemnity
            </a>
          </li>
          <li>
            <a className="underline" href="#changes">
              Changes to Terms
            </a>
          </li>
          <li>
            <a className="underline" href="#law">
              Governing Law & Jurisdiction
            </a>
          </li>
          <li>
            <a className="underline" href="#contact">
              Contact Us
            </a>
          </li>
        </ol>
      </nav>

      <section id="eligibility" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          1) Eligibility
        </h2>
        <p className="text-gray-800">
          You must be at least 18 years of age or the age of majority in your
          jurisdiction to use our Services. By using the Services, you represent
          that you have the legal capacity to enter into a binding agreement.
        </p>
      </section>

      <section id="account" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          2) Account Registration & Security
        </h2>
        <p className="text-gray-800">
          To access certain features, you may need to create an account. You
          agree to provide accurate information and keep it updated. You are
          responsible for maintaining the confidentiality of your login
          credentials and for all activities under your account.
        </p>
      </section>

      <section id="use" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          3) Acceptable Use
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-800">
          <li>
            Do not use the Services for unlawful, harmful, or abusive purposes.
          </li>
          <li>Do not attempt to hack, disrupt, or gain unauthorized access.</li>
          <li>
            Do not post or transmit content that infringes intellectual
            property, is defamatory, obscene, or otherwise objectionable.
          </li>
          <li>
            Use the Services in compliance with applicable Indian laws including
            the IT Act, 2000 and DPDP Act, 2023 (as applicable).
          </li>
        </ul>
      </section>

      <section id="subscriptions" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          4) Subscriptions & Payments
        </h2>
        <p className="text-gray-800">
          Certain features may require payment or a subscription. All fees are
          displayed before purchase and must be paid through authorized
          platforms such as Google Play Billing or RevenueCat. Payments are
          subject to the terms of those platforms. Except where required by law,
          subscriptions and purchases are non-refundable.
        </p>
      </section>

      <section id="content" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          5) Content & Intellectual Property
        </h2>
        <p className="text-gray-800">
          All intellectual property in the Services, including logos, designs,
          study materials, and software, belongs to {BRAND} or its licensors.
          You may use the Services only for your personal, non-commercial use,
          unless expressly authorized. Unauthorized reproduction, distribution,
          or modification is prohibited.
        </p>
      </section>

      <section id="thirdparty" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          6) Third-Party Services
        </h2>
        <p className="text-gray-800">
          Our Services may include integrations or links to third-party
          platforms. We are not responsible for third-party services, and your
          use of them may be governed by their own terms and privacy policies.
        </p>
      </section>

      <section id="termination" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          7) Suspension & Termination
        </h2>
        <p className="text-gray-800">
          We may suspend or terminate your access if you breach these Terms or
          use the Services in a manner that could cause harm to us, other users,
          or the public. You may stop using the Services at any time.
        </p>
      </section>

      <section id="disclaimer" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          8) Disclaimers
        </h2>
        <p className="text-gray-800">
          The Services are provided on an “as is” and “as available” basis. We
          make no warranties, express or implied, including fitness for a
          particular purpose or non-infringement. We do not guarantee
          uninterrupted or error-free operation.
        </p>
      </section>

      <section id="liability" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          9) Limitation of Liability
        </h2>
        <p className="text-gray-800">
          To the maximum extent permitted by law, {BRAND} and its affiliates
          shall not be liable for indirect, incidental, or consequential damages
          arising out of or related to your use of the Services. Our total
          liability for any claim shall not exceed the amount paid by you (if
          any) in the 12 months preceding the claim.
        </p>
      </section>

      <section id="indemnity" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">10) Indemnity</h2>
        <p className="text-gray-800">
          You agree to indemnify and hold harmless {BRAND}, its officers,
          employees, and partners from any claims, damages, or expenses arising
          out of your use of the Services or breach of these Terms.
        </p>
      </section>

      <section id="changes" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          11) Changes to Terms
        </h2>
        <p className="text-gray-800">
          We may update these Terms from time to time. If we make material
          changes, we will provide notice (for example, on our website or via
          email). Please review this page periodically for the latest version.
        </p>
      </section>

      <section id="law" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          12) Governing Law & Jurisdiction
        </h2>
        <p className="text-gray-800">
          These Terms are governed by the laws of India. Any disputes shall be
          subject to the exclusive jurisdiction of the courts at{" "}
          {JURISDICTION_CITY}, India.
        </p>
      </section>

      <section id="contact" className="mt-8">
        <h2 className="text-2xl font-semibold font-mono mb-2">
          13) Contact Us
        </h2>
        <p className="text-gray-800">
          If you have questions about these Terms, please contact us:
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
    </main>
  );
}
