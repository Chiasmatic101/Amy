import Link from "next/link";
import { notFound } from "next/navigation";

import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

type GameEvent = {
  id: string;
  gameId?: string;
  playerHash?: string;
  sessionId?: string;
  event?: string;
  eventTimestamp?: string;
  eventSequence?: number;
  data?: Record<string, unknown>;
};

type Session = {
  sessionId: string;
  playerHash: string;
  events: GameEvent[];
  startedAt?: string;
  endedAt?: string;
};

export default async function SessionsPage({ params }: PageProps) {
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
  // Load events
  // --------------------------------------------------

  const snapshot = await adminDb
    .collection("gameEvents")
    .where("gameId", "==", gameId)
    .get();

 const events: GameEvent[] = snapshot.docs.map(
  (doc): GameEvent => {
    const data = doc.data();

    return {
      id: doc.id,
      gameId: data.gameId,
      playerHash: data.playerHash,
      sessionId: data.sessionId,
      event: data.event,
      eventTimestamp: data.eventTimestamp,
      eventSequence: data.eventSequence,
      data: data.data,
    };
  }
);

  // --------------------------------------------------
  // Group events into sessions
  // --------------------------------------------------

  const sessionMap = new Map<string, Session>();

  for (const event of events) {
    if (!event.sessionId) continue;

    const existing = sessionMap.get(event.sessionId);

    if (existing) {
      existing.events.push(event);
    } else {
      sessionMap.set(event.sessionId, {
        sessionId: event.sessionId,
        playerHash: event.playerHash ?? "unknown",
        events: [event],
      });
    }
  }

  const sessions = Array.from(sessionMap.values()).map((session) => {
   session.events.sort((a, b) => {
  if (
    typeof a.eventSequence === "number" &&
    typeof b.eventSequence === "number"
  ) {
    return a.eventSequence - b.eventSequence;
  }

  return (
    new Date(a.eventTimestamp ?? 0).getTime() -
    new Date(b.eventTimestamp ?? 0).getTime()
  );
});

    session.startedAt = session.events[0]?.eventTimestamp;
    session.endedAt =
      session.events[session.events.length - 1]?.eventTimestamp;

    return session;
  });

  sessions.sort((a, b) => {
    return (
      new Date(b.startedAt ?? 0).getTime() -
      new Date(a.startedAt ?? 0).getTime()
    );
  });

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

      <section className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-24">
        {/* GAME NAVIGATION */}

        <Link
          href={`/dashboard/games/${gameId}`}
          className="text-sm text-black/40 transition-opacity hover:opacity-50"
        >
          ← {game.name ?? gameId}
        </Link>

        <div className="mt-12">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/35">
            Gameplay Sessions
          </p>

          <h1 className="mt-5 text-5xl font-normal tracking-[-0.05em] md:text-7xl">
            Sessions
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-black/50">
            Reconstructed player sessions from incoming gameplay events.
          </p>
        </div>

        {/* SUMMARY */}

        <div className="mt-16 grid border-y border-black/15 md:grid-cols-2">
          <Metric
            label="Sessions"
            value={sessions.length.toLocaleString()}
          />

          <Metric
            label="Events"
            value={events.length.toLocaleString()}
            last
          />
        </div>

        {/* SESSION LIST */}

        <div className="mt-20">
          <div className="border-t border-black/15">
            {sessions.length === 0 ? (
              <p className="py-12 text-black/45">
                No sessions received yet.
              </p>
            ) : (
              sessions.map((session) => (
                <SessionRow
                  key={session.sessionId}
                  gameId={gameId}
                  session={session}
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

function SessionRow({
  gameId,
  session,
}: {
  gameId: string;
  session: Session;
}) {
  const start = session.startedAt
    ? new Date(session.startedAt)
    : null;

  const end = session.endedAt
    ? new Date(session.endedAt)
    : null;

  const duration =
    start && end
      ? Math.max(0, end.getTime() - start.getTime())
      : 0;

  const durationSeconds = Math.round(duration / 1000);

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  const player =
    session.playerHash.length > 12
      ? `${session.playerHash.substring(0, 12)}…`
      : session.playerHash;

  const completed =
    session.events.some(
      (event) => event.event === "session_ended"
    );

  return (
    <Link
      href={`/dashboard/games/${gameId}/sessions/${encodeURIComponent(
        session.sessionId
      )}`}
      className="group block border-b border-black/15 py-8 transition-opacity hover:opacity-60"
    >
      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] md:items-center">
        <div>
          <p className="text-lg tracking-[-0.02em]">
            {session.sessionId}
          </p>

          <p className="mt-2 font-mono text-xs text-black/40">
            {player}
          </p>
        </div>

        <div>
          <Label>Started</Label>

          <p className="mt-2 text-sm text-black/60">
            {start ? start.toLocaleString() : "—"}
          </p>
        </div>

        <div>
          <Label>Duration</Label>

          <p className="mt-2 text-sm text-black/60">
            {minutes}m {seconds}s
          </p>
        </div>

        <div>
          <Label>Events</Label>

          <p className="mt-2 text-sm text-black/60">
            {session.events.length}
          </p>
        </div>

        <div>
          <Label>Status</Label>

          <p className="mt-2 text-sm text-black/60">
            {completed ? "Complete" : "Incomplete"}
          </p>
        </div>

        <div className="text-sm text-black/35 transition-transform group-hover:translate-x-1">
          View →
        </div>
      </div>
    </Link>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-[0.12em] text-black/25">
      {children}
    </p>
  );
}