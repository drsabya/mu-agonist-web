export default function Home() {
  return (
    <main className="flex flex-col bg-white text-black">
      {/* Hero (mobile-first) */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-20">
        {/* Brand name (small) */}
        <h1 className="text-lg sm:text-xl font-semibold tracking-wide text-center">
          Mu agonist
        </h1>

        {/* Tagline (big + bold) */}
        <p className="mt-3 text-4xl sm:text-9xl font-extrabold tracking-tight text-center text-gray-900 max-w-3xl">
          Keeping you addicted
        </p>

        {/* Subtext */}
        <p className="mt-8 text-base sm:text-lg text-gray-700 text-center max-w-screen-sm sm:max-w-2xl leading-relaxed">
          We want you focused in your preparation for{" "}
          <span className="bg-emerald-100 font-semibold px-1">
            NEET-PG and INICET.
          </span>{" "}
          Stay tuned! Something amazing is coming soon 🚀
        </p>
      </section>
    </main>
  );
}
