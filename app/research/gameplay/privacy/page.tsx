import Link from "next/link";

export default function MatchThreePrivacyPage() {
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
            Privacy Policy
          </h1>

          <p className="mt-7 text-sm text-black/45">
            Effective date: Upon first public release
          </p>
        </div>
      </section>

      {/* POLICY */}

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

            <PolicySection title="The short version">
              <ul className="space-y-3">
                <li>
                  We need your account, game progress and crash
                  reports to run the game.
                </li>

                <li>
                  Game analytics are on by default. You can turn
                  them off in Settings → Privacy choices.
                </li>

                <li>
                  Detailed research data — including every move
                  you make and screen recordings of the game — is
                  only collected if you switch it on. It is off by
                  default.
                </li>

                <li>
                  Ads pay for the game. You can opt out of
                  personalised ads at any time. This is our
                  &quot;Do Not Sell or Share&quot; option.
                </li>

                <li>
                  You can delete your account and all your data
                  from inside the game at Settings → Delete
                  account.
                </li>
              </ul>
            </PolicySection>

            <PolicySection title="What we collect">

              <PolicyItem title="Account information">
                When you sign in with Google or with email we
                receive your email address, display name, a unique
                account ID and, for Google, your profile photo
                link. We store your display name, email and ID
                with your game profile.
              </PolicyItem>

              <PolicyItem title="Game progress">
                Levels played, scores, stars, coins, boosters and
                when you last played. We need this information to
                save your progress.
              </PolicyItem>

              <PolicyItem title="Crash and performance data (always on)">
                If the app crashes we receive the error, app
                version, device model, operating system version
                and your account ID. This comes through Google
                Firebase Crashlytics.
              </PolicyItem>

              <PolicyItem title="Game analytics (on by default; you can turn it off)">
                Through Google Firebase Analytics and Performance
                Monitoring we collect which screens you view,
                levels started, finished or failed, boosters used,
                ads watched, session length, app version, device
                type, approximate location (country or region,
                derived from your IP address), and your account
                ID. We use this to find levels that are too hard
                and to improve the game.
              </PolicyItem>

              <PolicyItem title="Research data (off unless you turn it on)">
                If you choose &quot;Help research how people
                play&quot;, we also collect:
              </PolicyItem>

              <ul className="ml-5 mt-5 list-disc space-y-4 text-[17px] leading-8 text-black/65">
                <li>
                  Detailed gameplay events linked to your account.
                  These include each move, which pieces you
                  swapped and in which direction, how long you
                  took to decide, your score and remaining moves,
                  invalid swaps, boosters used, level retries and
                  quits, and when you started, skipped or finished
                  ads.
                </li>

                <li>
                  Session recordings and touch heatmaps of the
                  game screen through UXCam. Text fields such as
                  email and password are always hidden from
                  recordings.
                </li>
              </ul>

              <p className="mt-6 text-[17px] leading-8 text-black/65">
                We use research data to study how people play
                puzzle games and respond to in-game choices, and
                to design better levels. We may publish or share
                findings in aggregated or de-identified form. We
                do not sell research data that identifies you.
              </p>

              <PolicyItem title="Advertising data">
                Google AdMob, our ad provider, collects your
                device&apos;s advertising ID, IP address, device
                information and ad interactions to show ads, cap
                how often you see them, and measure them. If
                personalised ads are on, Google may also use this
                data to choose ads based on your interests.
              </PolicyItem>

              <p className="mt-6 text-[17px] leading-8 text-black/65">
                We do not collect your precise location, contacts,
                photos or files. We only use your date of birth to
                check your age when you first open the game, and
                we don&apos;t store it.
              </p>

            </PolicySection>

            <PolicySection title="How we use it">
              <ul className="space-y-3">
                <li>
                  To run the game: sign-in, saving progress and
                  rewards.
                </li>
                <li>
                  To fix bugs and keep the game secure.
                </li>
                <li>
                  To understand and improve the game: analytics,
                  if on.
                </li>
                <li>
                  For research into play behaviour: research data,
                  only if you opt in.
                </li>
                <li>
                  To show ads, personalised or not, depending on
                  your choice.
                </li>
              </ul>
            </PolicySection>

            <PolicySection title="Who we share it with">
              <p>
                We use the following service providers. They
                process data on our behalf and under their own
                privacy terms:
              </p>

              <div className="mt-6 space-y-4">
                <ExternalLink
                  href="https://firebase.google.com/support/privacy"
                  title="Google Firebase"
                  description="Authentication, Cloud Firestore, Analytics, Crashlytics and Performance Monitoring"
                />

                <ExternalLink
                  href="https://policies.google.com/technologies/ads"
                  title="Google AdMob"
                  description="Advertising and advertising measurement"
                />

                <ExternalLink
                  href="https://policies.google.com/privacy"
                  title="Google Sign-In"
                  description="Authentication"
                />

                <ExternalLink
                  href="https://uxcam.com/privacy-policy"
                  title="UXCam"
                  description="Session recording and heatmaps, only if you opt in to research"
                />
              </div>

              <p className="mt-8">
                Showing personalised ads may count as
                &quot;selling&quot; or &quot;sharing&quot;
                personal information under some US state laws,
                such as California&apos;s CCPA/CPRA. You can opt
                out at any time by turning off{" "}
                <strong>Personalised ads</strong> in Settings →
                Privacy choices.
              </p>

              <p className="mt-5">
                We may also disclose information if required by
                law.
              </p>
            </PolicySection>

            <PolicySection title="How long we keep it">
              <ul className="space-y-3">
                <li>
                  <strong>Account and progress:</strong> until you
                  delete your account.
                </li>

                <li>
                  <strong>Research data:</strong> automatically
                  deleted about 18 months after collection, or
                  sooner if you delete your account.
                </li>

                <li>
                  <strong>Analytics:</strong> kept by Google
                  Analytics for up to 14 months.
                </li>

                <li>
                  <strong>Crash reports:</strong> kept by Firebase
                  Crashlytics for up to 90 days.
                </li>
              </ul>
            </PolicySection>

            <PolicySection title="Your choices and rights">

              <p>
                <strong>Change your choices.</strong> You can
                change your choices at any time in Settings →
                Privacy choices. Turning research off stops new
                research data and recordings from being
                collected.
              </p>

              <p className="mt-5">
                <strong>Delete your account and data.</strong>{" "}
                Use Settings → Delete account. This deletes your
                profile, progress and research data straight away.
                You can also request deletion without the app:
              </p>

              <a
                href="mailto:alankelly@chiasmatic.co?subject=MatchThree%20Data%20Deletion%20Request"
                className="mt-5 inline-flex border-b border-black pb-1 font-medium text-black"
              >
                Request data deletion →
              </a>

              <p className="mt-7">
                <strong>Access or correct your data.</strong>{" "}
                Email us at{" "}
                <a
                  href="mailto:alankelly@chiasmatic.co"
                  className="underline underline-offset-4"
                >
                  alankelly@chiasmatic.co
                </a>
                .
              </p>

              <p className="mt-5">
                Depending on your state — for example California,
                Colorado, Connecticut, Virginia or Utah — you may
                have rights to know, access, correct, delete, or
                opt out of the sale or sharing of your personal
                information, and to appeal our decision.
              </p>

              <p className="mt-5">
                We will not treat you differently for using these
                rights. To use them, email{" "}
                <a
                  href="mailto:alankelly@chiasmatic.co"
                  className="underline underline-offset-4"
                >
                  alankelly@chiasmatic.co
                </a>
                .
              </p>

            </PolicySection>

            <PolicySection title="Age">
              <p>
                The game is only for people aged 18 and over. We
                check age when the game is first opened and
                don&apos;t knowingly collect data from anyone
                under 18.
              </p>

              <p className="mt-5">
                If you believe a minor has used the game, contact
                us and we will delete their data.
              </p>
            </PolicySection>

            <PolicySection title="Security">
              <p>
                Data is sent over encrypted connections and stored
                with Google Cloud (Firebase), with access rules so
                that each player can only reach their own data.
              </p>

              <p className="mt-5">
                No system is perfectly secure, but we take
                reasonable steps to protect your information.
              </p>
            </PolicySection>

            <PolicySection title="Changes">
              <p>
                If we change this policy in a way that affects
                your choices, we will ask you to review your
                choices again in the game.
              </p>
            </PolicySection>

            <PolicySection title="Contact">
              <p>
                Questions about this policy, your data or your
                privacy choices can be sent to:
              </p>

              <a
                href="mailto:alankelly@chiasmatic.co"
                className="mt-5 inline-block text-lg font-medium underline underline-offset-4"
              >
                alankelly@chiasmatic.co
              </a>
            </PolicySection>

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
              className="text-black"
            >
              Privacy
            </Link>

            <Link
              href="/research/gameplay/terms"
              className="hover:text-black"
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

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-black/10 py-12 first:pt-0">
      <h2 className="text-3xl font-normal tracking-[-0.035em]">
        {title}
      </h2>

      <div className="mt-7 text-[17px] leading-8 text-black/65">
        {children}
      </div>
    </section>
  );
}

function PolicyItem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <p className="mt-6 first:mt-0 text-[17px] leading-8 text-black/65">
      <strong className="font-semibold text-black">
        {title}.
      </strong>{" "}
      {children}
    </p>
  );
}

function ExternalLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-l border-black/15 pl-5">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-black underline underline-offset-4"
      >
        {title}
      </a>

      <p className="mt-1 text-sm text-black/45">
        {description}
      </p>
    </div>
  );
}