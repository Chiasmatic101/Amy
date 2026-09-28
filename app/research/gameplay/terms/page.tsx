import Link from "next/link";

export default function MatchThreeTermsPage() {
  return (
    <main className="min-h-screen bg-white text-[#111111]">

      {/* NAVIGATION */}

      <header className="border-b border-black/10 bg-[#F7F7F4]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 md:px-10">
          <Link
            href="/"
            className="text-xl font-semibold tracking-[-0.03em]"
          >
            AMY
          </Link>

          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/research/gameplay"
              className="transition-opacity hover:opacity-50"
            >
              MatchThree
            </Link>

            <Link
              href="/research"
              className="transition-opacity hover:opacity-50"
            >
              Our Research
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}

      <section className="border-b border-black/10 bg-[#F7F7F4]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-10 md:py-28">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/40">
            MatchThree · Legal
          </p>

          <h1 className="mt-7 text-5xl font-normal tracking-[-0.055em] md:text-7xl">
            Terms of Service
          </h1>

          <p className="mt-7 text-sm text-black/45">
            Effective date: Upon first public release
          </p>
        </div>
      </section>

      {/* TERMS */}

      <article className="mx-auto max-w-[1200px] px-6 py-20 md:px-10 md:py-28">
        <div className="grid gap-16 md:grid-cols-[260px_1fr]">

          {/* SIDEBAR */}

          <aside>
            <div className="sticky top-10">
              <p className="text-sm font-medium">
                MatchThree
              </p>

              <p className="mt-3 text-sm leading-relaxed text-black/45">
                Published by Chiasmatic
                <br />
                United States
                <br />
                Ages 18+
              </p>

              <a
                href="mailto:alankelly@chiasmatic.co"
                className="mt-6 inline-block text-sm underline underline-offset-4 transition-opacity hover:opacity-50"
              >
                Contact us
              </a>
            </div>
          </aside>

          {/* CONTENT */}

          <div className="max-w-3xl">

            <div className="border-b border-black/10 pb-12">
              <p className="text-[17px] leading-8 text-black/65">
                These Terms of Service apply when you use
                MatchThree (&quot;the game&quot;), published by
                Chiasmatic (&quot;we&quot;, &quot;us&quot;).
                By playing the game, you agree to these terms.
              </p>
            </div>

            <TermsSection title="Who can play">
              <p>
                You must be 18 or older and live in the United
                States to use MatchThree. You are responsible for
                keeping your sign-in details secure.
              </p>
            </TermsSection>

            <TermsSection title="Your account">
              <p>
                You can delete your account at any time from
                Settings → Delete account.
              </p>

              <p className="mt-5">
                We may suspend or close accounts that cheat,
                exploit bugs, interfere with the game, or misuse
                the game or other players.
              </p>
            </TermsSection>

            <TermsSection title="Virtual items">
              <p>
                Coins, boosters, lives and other in-game items
                have no real-world monetary value. They cannot be
                exchanged for money and are not your property.
              </p>

              <p className="mt-5">
                We may change, remove or adjust virtual items,
                rewards and game mechanics as the game develops.
              </p>
            </TermsSection>

            <TermsSection title="Ads">
              <p>
                MatchThree is free to play and shows
                advertisements. Some optional in-game rewards may
                be available in exchange for watching ads.
              </p>

              <p className="mt-5">
                Our Privacy Policy explains how advertising data
                is handled and the choices available to you.
              </p>
            </TermsSection>

            <TermsSection title="Research participation">
              <p>
                MatchThree may give you the option to contribute
                detailed gameplay information to research into
                how people play games.
              </p>

              <p className="mt-5">
                Participation in this additional research data
                collection is optional. Research data collection
                is off by default and can be enabled or disabled
                through the game&apos;s privacy settings.
              </p>

              <p className="mt-5">
                Our Privacy Policy explains what information may
                be collected for research and how it is used.
              </p>
            </TermsSection>

            <TermsSection title="Acceptable use">
              <p>
                You must not reverse-engineer, modify or interfere
                with the game or its servers.
              </p>

              <p className="mt-5">
                You must not use bots, automation, exploits or
                other methods intended to manipulate the game,
                its rewards or its systems.
              </p>

              <p className="mt-5">
                You must not use MatchThree for any unlawful
                purpose.
              </p>
            </TermsSection>

            <TermsSection title='The game is provided "as is"'>
              <p>
                We work to keep MatchThree running, secure and
                fair, but the game is provided &quot;as is&quot;
                without warranties to the fullest extent
                permitted by law.
              </p>

              <p className="mt-5">
                Features, levels, rewards and other parts of the
                game may change, and the game may be temporarily
                unavailable or discontinued.
              </p>

              <p className="mt-5">
                To the fullest extent allowed by law, Chiasmatic
                is not liable for indirect or consequential
                losses arising from your use of the game.
              </p>

              <p className="mt-5">
                To the fullest extent permitted by law, our total
                liability relating to your use of MatchThree is
                limited to US $50.
              </p>
            </TermsSection>

            <TermsSection title="Privacy">
              <p>
                Our Privacy Policy explains what information we
                collect, how we use it, and the choices available
                to you.
              </p>

              <Link
                href="/research/gameplay/privacy"
                className="mt-5 inline-flex border-b border-black pb-1 font-medium text-black"
              >
                Read the Privacy Policy →
              </Link>
            </TermsSection>

            <TermsSection title="Changes">
              <p>
                We may update these terms from time to time. If a
                change is significant, we will let you know in
                the game.
              </p>

              <p className="mt-5">
                Continuing to use MatchThree after updated terms
                take effect means you accept the updated terms.
              </p>
            </TermsSection>

            <TermsSection title="Contact">
              <p>
                If you have questions about these terms, contact:
              </p>

              <a
                href="mailto:alankelly@chiasmatic.co"
                className="mt-5 inline-block text-lg font-medium underline underline-offset-4"
              >
                alankelly@chiasmatic.co
              </a>
            </TermsSection>

          </div>
        </div>
      </article>

      {/* FOOTER */}

      <footer className="border-t border-black/10 bg-[#F7F7F4]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-6 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-10">

          <p className="font-semibold">
            MatchThree
          </p>

          <div className="flex flex-wrap gap-5 text-black/45">

            <Link
              href="/research/gameplay/privacy"
              className="hover:text-black"
            >
              Privacy
            </Link>

            <Link
              href="/research/gameplay/terms"
              className="text-black"
            >
              Terms
            </Link>

            <a
              href="mailto:alankelly@chiasmatic.co?subject=MatchThree%20Data%20Deletion%20Request"
              className="hover:text-black"
            >
              Delete My Data
            </a>

          </div>

          <p className="text-black/35">
            © {new Date().getFullYear()} Chiasmatic
          </p>

        </div>
      </footer>

    </main>
  );
}

function TermsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-black/10 py-12">
      <h2 className="text-3xl font-normal tracking-[-0.035em]">
        {title}
      </h2>

      <div className="mt-7 text-[17px] leading-8 text-black/65">
        {children}
      </div>
    </section>
  );
}