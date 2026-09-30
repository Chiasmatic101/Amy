import Link from "next/link";

export default function ChiasmaticCalamityPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F4] text-[#111111]">

      {/* NAVIGATION */}

      <header className="border-b border-black/10">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 md:px-10">
          <Link
            href="/research/gameplay"
            className="text-xl font-semibold tracking-[-0.03em]"
          >
            Chiasmatic Calamity
          </Link>

          <nav className="flex items-center gap-6 text-sm">
            <a
              href="#game"
              className="transition-opacity hover:opacity-50"
            >
              The Game
            </a>

            <a
              href="#how-to-play"
              className="transition-opacity hover:opacity-50"
            >
              How to Play
            </a>

            <Link
              href="/research/gameplay/privacy"
              className="transition-opacity hover:opacity-50"
            >
              Privacy
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}

      <section
        id="game"
        className="mx-auto max-w-[1440px] px-6 pb-24 pt-20 md:px-10 md:pb-36 md:pt-32"
      >
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
          Match-3 Puzzle Game
        </p>

        <h1 className="mt-8 max-w-6xl text-[clamp(3.8rem,8vw,8rem)] font-normal leading-[0.88] tracking-[-0.06em]">
          Chiasmatic
          <br />
          Calamity.
        </h1>

        <div className="mt-16 grid items-center gap-16 md:mt-24 md:grid-cols-2">

          <div className="max-w-xl">
            <p className="text-xl leading-relaxed tracking-[-0.02em] text-black/65 md:text-2xl">
              Match colorful pieces, create powerful combinations,
              and take on increasingly challenging puzzle levels.
            </p>

            <p className="mt-7 text-lg leading-relaxed text-black/55">
              Easy to learn. Increasingly difficult to master.
              Plan your moves carefully, build combinations and
              complete each challenge before you run out of moves.
            </p>
          </div>

          {/* KEEP EXISTING VIDEO */}

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

        </div>
      </section>

      {/* HOW TO PLAY */}

      <section
        id="how-to-play"
        className="border-t border-black/10 bg-white"
      >
        <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-36">

          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
                How to play
              </p>
            </div>

            <div className="max-w-2xl">
              <h2 className="text-4xl font-normal leading-[1.05] tracking-[-0.045em] md:text-6xl">
                Match. Combine.
                <br />
                Clear the board.
              </h2>

              <p className="mt-10 text-lg leading-relaxed text-black/60 md:text-xl">
                Swap neighboring pieces to create a row or column
                of three or more matching pieces.
              </p>

              <p className="mt-6 text-lg leading-relaxed text-black/60 md:text-xl">
                Larger matches create more powerful combinations
                that can clear multiple pieces from the board at
                once.
              </p>

              <p className="mt-6 text-lg leading-relaxed text-black/60 md:text-xl">
                Each level gives you a limited number of moves.
                Complete the objective before those moves run out
                to advance.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* FEATURES */}

      <section className="border-t border-black/10 bg-[#F7F7F4]">
        <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-36">

          <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
            Game features
          </p>

          <div className="mt-16 grid border-t border-black/15 md:grid-cols-4">

            <Feature
              number="01"
              title="Match"
              text="Swap pieces to create matches of three or more."
            />

            <Feature
              number="02"
              title="Combine"
              text="Create larger matches and powerful combinations."
            />

            <Feature
              number="03"
              title="Boost"
              text="Use boosters when you need a little extra help."
            />

            <Feature
              number="04"
              title="Progress"
              text="Complete levels and take on increasingly difficult puzzles."
              last
            />

          </div>
        </div>
      </section>

      {/* GAME CTA */}

      <section className="bg-[#111111] text-white">
        <div className="mx-auto max-w-[1440px] px-6 py-28 text-center md:px-10 md:py-44">

          <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/40">
            Chiasmatic Calamity
          </p>

          <h2 className="mx-auto mt-8 max-w-5xl text-5xl font-normal leading-[0.95] tracking-[-0.055em] md:text-7xl">
            How far can you get?
          </h2>

          <p className="mx-auto mt-10 max-w-xl text-lg leading-relaxed text-white/55">
            Start matching, build combinations and work your way
            through increasingly challenging levels.
          </p>

        </div>
      </section>

      {/* FOOTER */}

      <footer className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1440px] px-6 py-12 md:px-10">

          <div className="grid gap-10 md:grid-cols-2">

            <div>
              <p className="font-semibold tracking-[-0.02em]">
                Chiasmatic Calamity
              </p>

              <p className="mt-3 max-w-sm text-sm leading-relaxed text-black/40">
                A colorful match-3 puzzle game published by
                Chiasmatic.
              </p>
            </div>

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
                  href="mailto:alankelly@chiasmatic.co?subject=Chiasmatic%20Calamity%20Data%20Deletion%20Request"
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
              Chiasmatic Calamity
            </p>
          </div>

        </div>
      </footer>

    </main>
  );
}

function Feature({
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
      className={`py-10 md:min-h-[240px] md:px-8 md:py-12 ${
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