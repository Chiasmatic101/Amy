import Link from "next/link";

export default function ResearchPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F4] text-[#111111]">
      {/* NAVIGATION */}

      <header className="border-b border-black/10">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 md:px-10">
          <Link
            href="/"
            className="text-xl font-semibold tracking-[-0.03em]"
          >
            AMY
          </Link>

          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/"
              className="transition-opacity hover:opacity-50"
            >
              Home
            </Link>

            <Link
              href="/developer"
              className="rounded-full bg-black px-5 py-2.5 text-white transition-opacity hover:opacity-80"
            >
              Connect a game
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}

      <section className="mx-auto max-w-[1440px] px-6 pb-24 pt-20 md:px-10 md:pb-36 md:pt-32">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
          Our Research
        </p>

        <h1 className="mt-8 max-w-6xl text-[clamp(3.8rem,8vw,8rem)] font-normal leading-[0.9] tracking-[-0.06em]">
          What can the way
          <br />
          we play tell us
          <br />
          about ourselves?
        </h1>

        <div className="mt-16 grid gap-10 md:mt-24 md:grid-cols-2">
          <div />

          <div className="max-w-xl">
            <p className="text-xl leading-relaxed tracking-[-0.02em] text-black/65 md:text-2xl">
              We are exploring whether patterns hidden within
              everyday gameplay can provide meaningful signals
              about cognition, behavior and how people change
              over time.
            </p>
          </div>
        </div>
      </section>

      {/* RESEARCH QUESTION */}

      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-24 md:grid-cols-2 md:px-10 md:py-36">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
              The question
            </p>
          </div>

          <div className="max-w-2xl">
            <h2 className="text-4xl font-normal leading-[1.05] tracking-[-0.045em] md:text-6xl">
              Gameplay is a continuous series of decisions.
            </h2>

            <p className="mt-10 text-lg leading-relaxed text-black/60 md:text-xl">
              Players react, remember, plan, make mistakes,
              change strategies, persist, hesitate and learn.
            </p>

            <p className="mt-6 text-lg leading-relaxed text-black/60 md:text-xl">
              Most games already record parts of this behavior.
              Our research asks whether those patterns can be
              transformed into useful behavioral signals.
            </p>
          </div>
        </div>
      </section>

     {/* TWO RESEARCH APPROACHES */}

<section className="border-t border-black/10 bg-white">
  <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-36">

    {/* SECTION INTRO */}

    <div className="grid gap-12 md:grid-cols-2">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
          Inside the game
        </p>
      </div>

      <div>
        <h2 className="max-w-2xl text-4xl font-normal leading-[1.05] tracking-[-0.045em] md:text-6xl">
          Two ways of measuring how people think.
        </h2>

        <p className="mt-8 max-w-xl text-lg leading-relaxed text-black/60 md:text-xl">
          Our research compares behavior during everyday gameplay
          with established cognitive testing.
        </p>
      </div>
    </div>

    {/* SPLIT SCREEN */}

    <div className="mt-24 grid border-t border-black/15 md:grid-cols-2">

      {/* CANDY CRUSH STYLE GAME */}

      <div className="border-b border-black/15 py-12 md:border-b-0 md:border-r md:py-16 md:pr-12">

        <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
          Gameplay
        </p>

        <h3 className="mt-5 text-4xl font-normal tracking-[-0.045em] md:text-5xl">
          'Match 3' 1 Billion Users
        </h3>

        {/* VIDEO */}

        <div className="mt-12 flex justify-center">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="block h-auto w-3/4"
          >
            <source
              src="/videos/mobilegames.mp4"
              type="video/mp4"
            />
          </video>
        </div>

        {/* DESCRIPTION */}

        <div className="mt-12 max-w-xl">
          <p className="text-lg leading-relaxed text-black/60">
            Players interact naturally with a familiar match-style
            mobile game while AMY captures the detailed sequence of
            decisions that make up each session.
          </p>

          <p className="mt-5 text-lg leading-relaxed text-black/60">
            Moves, timing, mistakes, retries, hesitation and
            progression create a rich behavioral record without
            interrupting normal gameplay.
          </p>

          <Link
            href="/research/gameplay"
            className="mt-10 inline-flex items-center gap-3 border-b border-black pb-1 text-sm font-medium transition-opacity hover:opacity-50"
          >
            Explore the gameplay research
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* TRADITIONAL TESTING */}

      <div className="py-12 md:py-16 md:pl-12">

        <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
          Validation
        </p>

        <h3 className="mt-5 text-4xl font-normal tracking-[-0.045em] md:text-5xl">
          Traditional Testing
        </h3>

        {/* VIDEO */}

        <div className="mt-12 flex justify-center">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="block h-auto w-3/4"
          >
            <source
              src="/videos/mobilegames.mp4"
              type="video/mp4"
            />
          </video>
        </div>

        {/* DESCRIPTION */}

        <div className="mt-12 max-w-xl">
          <p className="text-lg leading-relaxed text-black/60">
            The same participants complete established cognitive
            tasks designed to measure specific aspects of
            performance under controlled conditions.
          </p>

          <p className="mt-5 text-lg leading-relaxed text-black/60">
            These measurements give us a reference point for
            investigating whether patterns within ordinary
            gameplay are associated with measurable cognitive
            performance.
          </p>

          <Link
            href="/research/testing"
            className="mt-10 inline-flex items-center gap-3 border-b border-black pb-1 text-sm font-medium transition-opacity hover:opacity-50"
          >
            Explore traditional testing
            <span>→</span>
          </Link>
        </div>
      </div>

    </div>
  </div>
</section>

      {/* RESEARCH MODEL */}

      <section className="bg-[#111111] text-white">
        <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-36">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/40">
            Our approach
          </p>

          <h2 className="mt-8 max-w-5xl text-5xl font-normal leading-[0.95] tracking-[-0.05em] md:text-7xl">
            Compare how people play with how they perform.
          </h2>

          <div className="mt-24 grid gap-0 border-t border-white/20 md:grid-cols-3">
            <DarkStep
              number="01"
              title="Play"
              text="Capture detailed, pseudonymized behavioral sessions from real gameplay."
            />

            <DarkStep
              number="02"
              title="Measure"
              text="Use validated cognitive assessments and research measures to establish reference outcomes."
            />

            <DarkStep
              number="03"
              title="Learn"
              text="Investigate which patterns of gameplay are associated with measurable differences and changes in performance."
              last
            />
          </div>
        </div>
      </section>

      {/* WHY RAW DATA */}

      <section className="bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-24 md:grid-cols-2 md:px-10 md:py-36">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
              A different approach
            </p>
          </div>

          <div className="max-w-2xl">
            <h2 className="text-4xl font-normal leading-[1.05] tracking-[-0.045em] md:text-6xl">
              We don&apos;t want to decide what matters too early.
            </h2>

            <p className="mt-10 text-lg leading-relaxed text-black/60 md:text-xl">
              A traditional analytics system might reduce a
              gameplay session to a few averages and scores.
            </p>

            <p className="mt-6 text-lg leading-relaxed text-black/60 md:text-xl">
              AMY is being designed to preserve the detailed
              behavioral sequence so that new hypotheses,
              analytical techniques and models can be tested
              against the original record.
            </p>
          </div>
        </div>
      </section>

      {/* LONG TERM */}

      <section className="border-t border-black/10">
        <div className="mx-auto max-w-[1440px] px-6 py-28 md:px-10 md:py-44">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
                Where this could lead
              </p>
            </div>

            <div className="max-w-2xl">
              <h2 className="text-4xl font-normal leading-[1.05] tracking-[-0.045em] md:text-6xl">
                Games could become a new way to study human
                behavior at scale.
              </h2>

              <p className="mt-10 text-lg leading-relaxed text-black/60 md:text-xl">
                Our first focus is cognition: understanding
                whether natural gameplay contains signals related
                to areas such as attention, processing speed and
                working memory.
              </p>

              <p className="mt-6 text-lg leading-relaxed text-black/60 md:text-xl">
                Longer term, the same infrastructure could allow
                researchers to ask new questions using behavioral
                data generated during ordinary play.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}

      <section className="border-t border-black/10 bg-[#F7F7F4]">
        <div className="mx-auto max-w-[1440px] px-6 py-28 text-center md:px-10 md:py-40">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
            AMY Research
          </p>

          <h2 className="mx-auto mt-8 max-w-4xl text-5xl font-normal leading-[0.95] tracking-[-0.055em] md:text-7xl">
            There may be more in play than we think.
          </h2>

          <Link
            href="/"
            className="mt-12 inline-flex rounded-full bg-black px-7 py-4 text-sm font-medium text-white transition hover:bg-black/80"
          >
            Back to AMY
          </Link>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="border-t border-black/10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-10">
          <p className="font-semibold tracking-[-0.02em]">
            AMY
          </p>

          <p className="text-black/40">
            Behavioral data from the way we play.
          </p>

          <p className="text-black/40">
            © {new Date().getFullYear()} AMY
          </p>
        </div>
      </footer>
    </main>
  );
}

function ResearchSignal({
  number,
  title,
  text,
  last = false,
}: {
  number: string;
  title: string;
  text: string;
  last?: boolean;
}) {
  return (
    <div
      className={`py-10 md:min-h-[260px] md:px-8 md:py-12 ${
        last
          ? ""
          : "border-b border-black/15 md:border-b-0 md:border-r"
      }`}
    >
      <p className="text-sm text-black/35">{number}</p>

      <h3 className="mt-10 text-2xl tracking-[-0.035em]">
        {title}
      </h3>

      <p className="mt-5 max-w-xs leading-relaxed text-black/55">
        {text}
      </p>
    </div>
  );
}

function DarkStep({
  number,
  title,
  text,
  last = false,
}: {
  number: string;
  title: string;
  text: string;
  last?: boolean;
}) {
  return (
    <div
      className={`py-10 md:min-h-[300px] md:py-12 ${
        last
          ? ""
          : "border-b border-white/20 md:border-b-0 md:border-r md:pr-10"
      } ${number === "01" ? "" : "md:pl-10"}`}
    >
      <p className="text-sm text-white/35">{number}</p>

      <h3 className="mt-10 text-3xl font-normal tracking-[-0.04em]">
        {title}
      </h3>

      <p className="mt-6 max-w-sm leading-relaxed text-white/55">
        {text}
      </p>
    </div>
  );
}