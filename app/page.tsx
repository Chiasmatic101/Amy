import Link from "next/link";

export default function Home() {
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
            <a
              href="#about"
              className="hidden transition-opacity hover:opacity-50 sm:block"
            >
              About
            </a>

            <Link
              href="/research"
              className="hidden transition-opacity hover:opacity-50 sm:block"
            >
              Research
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
        <div className="max-w-5xl">
          <p className="mb-8 text-sm font-medium uppercase tracking-[0.18em] text-black/45">
            Gameplay · Behavior · Research
          </p>

          <h1 className="max-w-5xl text-[clamp(3.7rem,8vw,8.5rem)] font-normal leading-[0.88] tracking-[-0.065em]">
            Turning 3 Billion Gamers into Digital Clinical Endpoints
            <br />
        
          </h1>
        </div>

        <div className="mt-16 grid gap-10 md:mt-24 md:grid-cols-2">
          <div />

          <div className="max-w-xl">
            <p className="text-xl leading-relaxed tracking-[-0.02em] text-black/70 md:text-2xl">
              AMY is a foundational model that turns everyday gameplay into privacy-conscious
              behavioral data for the clinical trial industry
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/developer"
                className="inline-flex items-center justify-center rounded-full bg-black px-7 py-4 text-sm font-medium text-white transition hover:bg-black/80"
              >
                I&apos;m a Game Developer
                <span className="ml-3">→</span>
              </Link>

              <Link
                href="/research"
                className="inline-flex items-center justify-center rounded-full border border-black/20 px-7 py-4 text-sm font-medium transition hover:bg-black/5"
              >
                I&apos;m a Researcher
                <span className="ml-3">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

    {/* INTRODUCTION */}

<section
  id="about"
  className="border-t border-black/10 bg-white"
>
  <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-36">

    <div className="grid items-start gap-12 md:grid-cols-2 md:gap-20">

      {/* LEFT SIDE */}

      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
          The idea
        </p>

        <div className="mt-12">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="block h-auto w-3/4"
          >
            <source
              src="/videos/mobilegames.mp4"
              type="video/mp4"
            />
          </video>
        </div>
      </div>

      {/* RIGHT SIDE */}

      <div className="max-w-2xl">
        <h2 className="text-4xl font-normal leading-[1.05] tracking-[-0.045em] md:text-6xl">
          Games already measure thousands of decisions.
        </h2>

        <p className="mt-10 max-w-xl text-lg leading-relaxed text-black/60 md:text-xl">
          Every session contains a detailed record of choices,
          timing, mistakes, persistence and interaction.
        </p>

        <p className="mt-8 max-w-xl text-lg leading-relaxed text-black/60 md:text-xl">
          AMY provides the means to securely convert these actions into validated cognitive testing sessions that can be explored without exposing the player&apos;s
          identity.
        </p>
      </div>

    </div>

  </div>
</section>

      {/* TWO AUDIENCES */}

      <section className="border-t border-black/10">
        <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-36">
          <div className="mb-20">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
              One platform. Two sides.
            </p>
          </div>

          <div className="grid border-t border-black/15 md:grid-cols-2">
            {/* DEVELOPER */}

            <div className="border-b border-black/15 py-12 md:border-b-0 md:border-r md:py-16 md:pr-16">
              <p className="mb-8 text-sm text-black/40">
                01
              </p>

              <h3 className="text-4xl font-normal tracking-[-0.04em] md:text-5xl">
                Game Developers
              </h3>

              <p className="mt-8 max-w-lg text-lg leading-relaxed text-black/60">
                Turn existing gameplay telemetry into
                a brand new source of reliable income. 
              </p>

              <Link
                href="/developer"
                className="mt-12 inline-flex items-center gap-3 border-b border-black pb-1 text-sm font-medium"
              >
                Explore developer tools
                <span>→</span>
              </Link>
            </div>

            {/* RESEARCHER */}

            <div className="py-12 md:py-16 md:pl-16">
              <p className="mb-8 text-sm text-black/40">
                02
              </p>

              <h3 className="text-4xl font-normal tracking-[-0.04em] md:text-5xl">
                Researchers
              </h3>

              <p className="mt-8 max-w-lg text-lg leading-relaxed text-black/60">
                Create trials, recruit volunteers, track interventions withouth behaviour change...
              </p>

              <Link
                href="/research"
                className="mt-12 inline-flex items-center gap-3 border-b border-black pb-1 text-sm font-medium"
              >
                Explore research tools
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS */}

      <section className="bg-[#111111] text-white">
        <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-36">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/40">
            From play to discovery
          </p>

          <h2 className="mt-8 max-w-4xl text-5xl font-normal leading-[0.95] tracking-[-0.05em] md:text-7xl">
        
            <br />
Solve Three Problems within The Clinical Trial Industry          </h2>

          <div className="mt-24 grid gap-0 border-t border-white/20 md:grid-cols-3">
            <ProcessStep
              number="01"
              title="Recruitment"
              text="With over 3 billion players worldwide, Gamers come in all ages, demographics and locations."
            />

            <ProcessStep
              number="02"
              title="Retention"
              text="Amy is game and device agnostic, meaning volunteers do not need to change their normal behaviour when taking part in a trial"
            />

            <ProcessStep
              number="03"
              title="Resources"
              text="Complete automation, targeted demographic and pre-trial identification of healthy/unhealthy volunteers reduce total trial costs"
              last
            />
          </div>
        </div>
      </section>

      {/* RAW BEHAVIOR */}

      <section className="bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-16 px-6 py-24 md:grid-cols-2 md:px-10 md:py-36">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
              Preserve first. Interpret later.
            </p>
          </div>

          <div className="max-w-2xl">
            <h2 className="text-4xl font-normal leading-[1.05] tracking-[-0.045em] md:text-6xl">
              Amy decides what to track.
            </h2>

            <p className="mt-10 text-lg leading-relaxed text-black/60 md:text-xl">
              Complete gameplay sessions are preserved so
              researchers can return to the original behavioral
              record as new questions, methods and models emerge.
            </p>

            <div className="mt-14 border-l border-black/20 pl-6">
              <p className="font-mono text-sm leading-8 text-black/50">
                001&nbsp;&nbsp; session_started
                <br />
                002&nbsp;&nbsp; level_started
                <br />
                003&nbsp;&nbsp; move_made
                <br />
                004&nbsp;&nbsp; move_made
                <br />
                005&nbsp;&nbsp; incorrect_move
                <br />
                006&nbsp;&nbsp; move_made
                <br />
                007&nbsp;&nbsp; level_completed
                <br />
                008&nbsp;&nbsp; session_ended
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}

      <section className="border-t border-black/10">
        <div className="mx-auto max-w-[1440px] px-6 py-28 text-center md:px-10 md:py-44">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
            AMY
          </p>

          <h2 className="mx-auto mt-8 max-w-4xl text-5xl font-normal leading-[0.95] tracking-[-0.055em] md:text-8xl">
            Gameplay is behavior.
          </h2>

          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-black/55">
            Build the datasets that help us understand it.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/developer"
              className="rounded-full bg-black px-7 py-4 text-sm font-medium text-white transition hover:bg-black/80"
            >
              Connect a game
            </Link>

            <Link
              href="/research"
              className="rounded-full border border-black/20 px-7 py-4 text-sm font-medium transition hover:bg-black/5"
            >
              Explore the research
            </Link>
          </div>
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

function ProcessStep({
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
      <p className="text-sm text-white/35">
        {number}
      </p>

      <h3 className="mt-10 text-3xl font-normal tracking-[-0.04em]">
        {title}
      </h3>

      <p className="mt-6 max-w-sm leading-relaxed text-white/55">
        {text}
      </p>
    </div>
  );
}