import Link from "next/link";
import { notFound } from "next/navigation";

import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

export default async function GameDashboardPage({
  params,
}: PageProps) {
  const { gameId } = await params;

  // --------------------------------------------------
  // Game
  // --------------------------------------------------

  const gameDoc = await adminDb.collection("games").doc(gameId).get();

  if (!gameDoc.exists) {
    notFound();
  }

  const game = gameDoc.data()!;

  // --------------------------------------------------
  // Events
  // --------------------------------------------------

  const eventsSnapshot = await adminDb
    .collection("gameEvents")
    .where("gameId", "==", gameId)
    .get();

  const events = eventsSnapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .sort((a: any, b: any) => {
      const aTime = new Date(a.eventTimestamp ?? 0).getTime();
      const bTime = new Date(b.eventTimestamp ?? 0).getTime();

      return bTime - aTime;
    });

  // --------------------------------------------------
  // Basic metrics
  // --------------------------------------------------

  const uniquePlayers = new Set(
    events.map((event: any) => event.playerHash)
  ).size;

  const uniqueSessions = new Set(
    events.map((event: any) => event.sessionId)
  ).size;

  return (
    <main className="min-h-screen bg-[#F7F7F4] text-[#111111]">
      {/* HEADER */}

      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 md:px-10">
          <Link
            href="/dashboard"
            className="text-xl font-semibold tracking-[-0.03em]"
          >
            AMY
          </Link>

          <p className="text-sm text-black/40">
            Developer Data Platform
          </p>
        </div>
      </header>

      {/* GAME */}

      <section className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-24">
        <Link
          href="/dashboard"
          className="text-sm text-black/40 transition-opacity hover:opacity-50"
        >
          ← Connected Games
        </Link>

        <div className="mt-12">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/35">
            {game.environment ?? "Unknown"} environment
          </p>

          <h1 className="mt-5 text-5xl font-normal tracking-[-0.05em] md:text-7xl">
            {game.name ?? gameId}
          </h1>

          <div className="mt-6 flex gap-3">
            <span className="border border-black/10 px-3 py-1 text-xs capitalize text-black/45">
              {game.platform ?? "Unknown platform"}
            </span>

            <span className="border border-black/10 px-3 py-1 text-xs capitalize text-black/45">
              {game.status ?? "Unknown status"}
            </span>
          </div>
        </div>

{/* NAVIGATION */}

<div className="mt-12 flex gap-8 border-b border-black/15">
  <Link
    href={`/dashboard/games/${gameId}`}
    className="border-b-2 border-black pb-4 text-sm font-medium"
  >
    Overview
  </Link>

  <Link
    href={`/dashboard/games/${gameId}/sessions`}
    className="pb-4 text-sm text-black/45 transition-opacity hover:opacity-60"
  >
    Sessions
  </Link>
</div>

        {/* METRICS */}

        <div className="mt-16 grid border-y border-black/15 md:grid-cols-3">
          <Metric
            label="Events"
            value={events.length.toLocaleString()}
          />

          <Metric
            label="Players"
            value={uniquePlayers.toLocaleString()}
          />

          <Metric
            label="Sessions"
            value={uniqueSessions.toLocaleString()}
            last
          />
        </div>

        {/* EVENTS */}

        <div className="mt-20">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/35">
              Incoming Data
            </p>

            <h2 className="mt-4 text-4xl tracking-[-0.04em]">
              Recent Events
            </h2>
          </div>

          <div className="mt-10 border-t border-black/15">
            {events.length === 0 ? (
              <p className="py-12 text-black/45">
                No events received yet.
              </p>
            ) : (
              events.slice(0, 50).map((event: any) => (
                <EventRow
                  key={event.id}
                  event={event}
                />
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`py-8 md:px-8 md:py-10 ${
        last
          ? ""
          : "border-b border-black/15 md:border-b-0 md:border-r"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.15em] text-black/30">
        {label}
      </p>

      <p className="mt-4 text-4xl tracking-[-0.04em]">
        {value}
      </p>
    </div>
  );
}

function EventRow({ event }: { event: any }) {
  const timestamp = event.eventTimestamp
    ? new Date(event.eventTimestamp).toLocaleString()
    : "Unknown time";

  const player =
    typeof event.playerHash === "string"
      ? event.playerHash.substring(0, 12)
      : "Unknown";

  return (
    <details className="group border-b border-black/15">
      <summary className="grid cursor-pointer list-none gap-4 py-6 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] md:items-center">
        <div>
          <p className="text-lg tracking-[-0.02em]">
            {event.event ?? "Unknown event"}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-black/25">
            Player
          </p>

          <p className="mt-1 font-mono text-xs text-black/55">
            {player}…
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-black/25">
            Session
          </p>

          <p className="mt-1 text-sm text-black/55">
            {event.sessionId ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-black/25">
            Time
          </p>

          <p className="mt-1 text-sm text-black/55">
            {timestamp}
          </p>
        </div>

        <span className="text-black/30">
          +
        </span>
      </summary>

      <div className="pb-6">
        <div className="bg-black/[0.035] p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-black/30">
            Event Data
          </p>

          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-black/65">
            {JSON.stringify(event.data ?? {}, null, 2)}
          </pre>
        </div>
      </div>
    </details>
  );
}