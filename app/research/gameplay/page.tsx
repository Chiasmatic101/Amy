import Link from "next/link";

export default function MatchThreePage() {
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
              href="/research"
              className="transition-opacity hover:opacity-50"
            >
              Our Research
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
          AMY Research · MatchThree
        </p>

        <h1 className="mt-8 max-w-6xl text-[clamp(4rem,9vw,9rem)] font-normal leading-[0.86] tracking-[-0.065em]">
          Research
          <br />
          hidden inside
          <br />
          a game.
        </h1>

        <div className="mt-16 grid gap-12 md:mt-24 md:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-black/40">
              MatchThree
            </p>
          </div>

          <div className="max-w-xl">
            <p className="text-xl leading-relaxed tracking-[-0.02em] text-black/65 md:text-2xl">
              MatchThree is clone of a leading mobile game, used 
              to help us study the detailed patterns of behavior
              produced during ordinary play.
            </p>
          </div>
        </div>
      </section>

      {/* GAME VIDEO */}

      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-36">

          <div className="grid items-center gap-16 md:grid-cols-2">

            {/* VIDEO */}

            <div className="flex justify-center">
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

            {/* TEXT */}

            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
                The game
              </p>

              <h2 className="mt-7 text-4xl font-normal leading-[1.05] tracking-[-0.045em] md:text-6xl">
            
                <br />
                Extract Data with no changes to core gameplay
              </h2>

              <p className="mt-10 text-lg leading-relaxed text-black/60 md:text-xl">
                MatchThree uses familiar match-style mechanics so
                players can interact naturally rather than feeling
                as though they are completing a research task.
              </p>

              <p className="mt-6 text-lg leading-relaxed text-black/60 md:text-xl">
                Behind the game, AMY records the sequence of
                interactions that make up the session so we can
                relate game play to decision making processes
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* WHAT WE CAPTURE */}

      <section className="border-t border-black/10">
        <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-36">

          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
                What we capture
              </p>
            </div>

            <div>
              <h2 className="max-w-2xl text-4xl font-normal leading-[1.05] tracking-[-0.045em] md:text-6xl">
                The session is the dataset.
              </h2>

              <p className="mt-8 max-w-xl text-lg leading-relaxed text-black/60 md:text-xl">
                Rather than reducing gameplay to a final score,
                we preserve the sequence of behavior that produced
                it.
              </p>
            </div>
          </div>

          <div className="mt-20 grid border-t border-black/15 md:grid-cols-4">

            <Signal
              number="01"
              title="Actions"
              text="Moves, selections, retries, mistakes and other interactions made during play."
            />

            <Signal
              number="02"
              title="Timing"
              text="When actions occur, how quickly decisions are made and how timing changes through a session."
            />

            <Signal
              number="03"
              title="Progression"
              text="Levels, attempts, successes, failures and changes as the player becomes familiar with the game."
            />

            <Signal
              number="04"
              title="Sessions"
              text="How people begin, continue, pause, return to and eventually leave a gameplay session."
              last
            />

          </div>
        </div>
      </section>

      {/* RAW SESSION */}

      <section className="bg-[#111111] text-white">
        <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-36">

          <div className="grid gap-16 md:grid-cols-2">

            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/40">
                Under the surface
              </p>

              <h2 className="mt-8 max-w-xl text-5xl font-normal leading-[0.95] tracking-[-0.05em] md:text-7xl">
                One game.
                <br />
                Thousands of interactions.
              </h2>
            </div>

            {/* FAKE EVENT STREAM */}

            <div className="border-l border-white/20 pl-6 md:pl-10">
              <Event
                sequence="001"
                name="session_started"
                time="00:00.000"
              />

              <Event
                sequence="002"
                name="level_started"
                time="00:02.481"
              />

              <Event
                sequence="003"
                name="tile_selected"
                time="00:04.128"
              />

              <Event
                sequence="004"
                name="move_made"
                time="00:04.842"
              />

              <Event
                sequence="005"
                name="move_made"
                time="00:07.192"
              />

              <Event
                sequence="006"
                name="invalid_move"
                time="00:09.401"
              />

              <Event
                sequence="007"
                name="move_made"
                time="00:10.024"
              />

              <Event
                sequence="008"
                name="level_completed"
                time="01:42.518"
              />

              <Event
                sequence="009"
                name="session_ended"
                time="01:45.201"
              />
            </div>

          </div>
        </div>
      </section>

      {/* RESEARCH GOAL */}

      <section className="bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-24 md:grid-cols-2 md:px-10 md:py-36">

          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
              The research
            </p>
          </div>

          <div className="max-w-2xl">
            <h2 className="text-4xl font-normal leading-[1.05] tracking-[-0.045em] md:text-6xl">
              Which patterns actually mean something?
            </h2>

            <p className="mt-10 text-lg leading-relaxed text-black/60 md:text-xl">
              We don&apos;t assume that a particular move, score or
              gameplay metric represents cognition.
            </p>

            <p className="mt-6 text-lg leading-relaxed text-black/60 md:text-xl">
              Instead, we are building a foundational model to learn what gaming behaviours are indicators of cogntive change
            </p>

            <p className="mt-6 text-lg leading-relaxed text-black/60 md:text-xl">
              The question is whether machine learning
              can identify combinations of gameplay behavior that
              reliably correspond with measurable differences or
              changes in cognitive performance.
            </p>
          </div>

        </div>
      </section>

      {/* CONNECTION */}

      <section className="border-t border-black/10 bg-[#F7F7F4]">
        <div className="mx-auto max-w-[1440px] px-6 py-28 text-center md:px-10 md:py-44">

          <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
            MatchThree + Cognitive Testing
          </p>

          <h2 className="mx-auto mt-8 max-w-5xl text-5xl font-normal leading-[0.95] tracking-[-0.055em] md:text-7xl">
            Play gives us the behavior.
            <br />
            Testing gives us the reference.
          </h2>

          <p className="mx-auto mt-10 max-w-2xl text-lg leading-relaxed text-black/55">
            By collecting both from the same participants, we can
            begin investigating whether everyday gameplay contains
            useful signals of cognitive performance.
          </p>

          <div className="mt-12 flex flex-col justify-center gap-3 sm:flex-row">

            <Link
              href="/research/testing"
              className="rounded-full bg-black px-7 py-4 text-sm font-medium text-white transition hover:bg-black/80"
            >
              Explore Traditional Testing
            </Link>

            <Link
              href="/research"
              className="rounded-full border border-black/20 px-7 py-4 text-sm font-medium transition hover:bg-black/5"
            >
              Back to Our Research
            </Link>

          </div>
        </div>
      </section>

  {/* FOOTER */}

<footer className="border-t border-black/10 bg-white">
  <div className="mx-auto max-w-[1440px] px-6 py-12 md:px-10">

    <div className="grid gap-10 md:grid-cols-2">
      
      {/* BRAND */}

      <div>
        <p className="font-semibold tracking-[-0.02em]">
          MatchThree
        </p>

        <p className="mt-3 max-w-sm text-sm leading-relaxed text-black/40">
          An experimental mobile game developed as part of
          AMY&apos;s research into gameplay and human behavior.
        </p>
      </div>

      {/* GAME INFORMATION */}

      <div className="md:text-right">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/35">
          Game Information
        </p>

        <div className="mt-5 flex flex-col gap-3 text-sm md:items-end">

          <Link
            href="/research/gameplay/privacy"
            className="w-fit transition-opacity hover:opacity-50"
          >
            Google Play Privacy Statement
          </Link>

          <Link
            href="/research/gameplay/terms"
            className="w-fit transition-opacity hover:opacity-50"
          >
            Terms and Conditions
          </Link>

          <a
            href="mailto:alankelly@chiasmatic.co?subject=MatchThree%20Data%20Deletion%20Request"
            className="w-fit transition-opacity hover:opacity-50"
          >
            Delete My Data
          </a>

        </div>
      </div>

    </div>

    <div className="mt-12 flex flex-col gap-4 border-t border-black/10 pt-6 text-xs text-black/35 md:flex-row md:items-center md:justify-between">
      <p>
        © {new Date().getFullYear()} Chiasmatic
      </p>

      <p>
        MatchThree · AMY Research
      </p>
    </div>

  </div>
</footer>

    </main>
  );
}

function Signal({
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
      <p className="text-sm text-black/35">
        {number}
      </p>

      <h3 className="mt-10 text-2xl tracking-[-0.035em]">
        {title}
      </h3>

      <p className="mt-5 max-w-xs leading-relaxed text-black/55">
        {text}
      </p>
    </div>
  );
}

function Event({
  sequence,
  name,
  time,
}: {
  sequence: string;
  name: string;
  time: string;
}) {
  return (
    <div className="grid grid-cols-[50px_1fr_auto] gap-4 border-b border-white/10 py-5 font-mono text-sm">
      <span className="text-white/25">
        {sequence}
      </span>

      <span className="text-white/75">
        {name}
      </span>

      <span className="text-white/30">
        {time}
      </span>
    </div>
  );
}