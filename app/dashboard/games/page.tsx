import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

type GameRecord = {
  id: string;
  name: string;
  developerName?: string;
  platform?: string;
  environment?: string;
  status?: string;
};

async function getGames(): Promise<GameRecord[]> {
  const snapshot = await adminDb
    .collection("games")
    .orderBy("name")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      name: data.name ?? doc.id,
      developerName: data.developerName,
      platform: data.platform,
      environment: data.environment,
      status: data.status,
    };
  });
}

export default async function GamesPage() {
  const games = await getGames();

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#181817]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-12 flex items-start justify-between gap-6">
          <div>
            <p className="mb-3 text-sm font-medium text-neutral-500">
              AMY Developer
            </p>

            <h1 className="text-4xl font-semibold tracking-tight">
              Games
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600">
              Connect your game to AMY, configure its telemetry,
              and monitor incoming behavioral data.
            </p>
          </div>

          <Link
            href="/dashboard/games/new"
            className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            + Add Game
          </Link>
        </div>

        {games.length === 0 ? (
          <div className="rounded-3xl border border-neutral-200 bg-white p-10">
            <h2 className="text-xl font-semibold">
              Connect your first game
            </h2>

            <p className="mt-2 max-w-xl text-neutral-600">
              Add a game and choose how AMY should receive its
              gameplay telemetry.
            </p>

            <Link
              href="/dashboard/games/new"
              className="mt-6 inline-block rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Add Game
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/dashboard/games/${game.id}`}
                className="group rounded-3xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-400"
              >
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold">
                        {game.name}
                      </h2>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          game.status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {game.status ?? "setup"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-neutral-500">
                      {game.developerName ?? "Unknown developer"}
                      {" · "}
                      {game.platform ?? "Platform not set"}
                      {" · "}
                      {game.environment ?? "Environment not set"}
                    </p>
                  </div>

                  <span className="text-xl text-neutral-400 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}