import Link from "next/link";

import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

type Game = {
  id: string;
  name: string;
  developerName?: string;
  platform?: string;
  status?: string;
  environment?: string;
};

async function getGames(): Promise<Game[]> {
  const snapshot = await adminDb.collection("games").get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      name: data.name ?? doc.id,
      developerName: data.developerName,
      platform: data.platform,
      status: data.status,
      environment: data.environment,
    };
  });
}

async function getEventCount(gameId: string) {
  const snapshot = await adminDb
    .collection("gameEvents")
    .where("gameId", "==", gameId)
    .count()
    .get();

  return snapshot.data().count;
}

export default async function DashboardPage() {
  const games = await getGames();

  const gamesWithCounts = await Promise.all(
    games.map(async (game) => ({
      ...game,
      eventCount: await getEventCount(game.id),
    }))
  );

  return (
    <main className="min-h-screen bg-[#F7F7F4] text-[#111111]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 md:px-10">
          <div>
            <p className="text-xl font-semibold tracking-[-0.03em]">
              AMY
            </p>
          </div>

          <p className="text-sm text-black/40">
            Developer Data Platform
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-24">
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/35">
              Dashboard
            </p>

            <h1 className="mt-5 text-5xl font-normal tracking-[-0.05em] md:text-7xl">
              Connected Games
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-black/50">
              Games currently sending gameplay data to AMY.
            </p>
          </div>

          <button
            disabled
            className="hidden border border-black/15 px-5 py-3 text-sm text-black/35 md:block"
          >
            + Connect a Game
          </button>
        </div>

        <div className="mt-16 border-t border-black/15">
          {gamesWithCounts.length === 0 ? (
            <div className="py-16">
              <p className="text-black/45">
                No games connected yet.
              </p>
            </div>
          ) : (
            gamesWithCounts.map((game) => (
              <Link
                key={game.id}
                href={`/dashboard/games/${game.id}`}
                className="group block border-b border-black/15 py-10 transition-opacity hover:opacity-60"
              >
                <div className="grid gap-8 md:grid-cols-[2fr_1fr_1fr_auto] md:items-center">
                  <div>
                    <h2 className="text-3xl tracking-[-0.04em]">
                      {game.name}
                    </h2>

                    <p className="mt-3 text-sm text-black/40">
                      {game.developerName ?? "Unknown developer"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-black/30">
                      Environment
                    </p>

                    <p className="mt-2 capitalize text-black/65">
                      {game.environment ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-black/30">
                      Events
                    </p>

                    <p className="mt-2 text-black/65">
                      {game.eventCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="text-sm text-black/45 transition-transform group-hover:translate-x-1">
                    Open Game →
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <span className="border border-black/10 px-3 py-1 text-xs capitalize text-black/45">
                    {game.platform ?? "Unknown platform"}
                  </span>

                  <span className="border border-black/10 px-3 py-1 text-xs capitalize text-black/45">
                    {game.status ?? "Unknown status"}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}