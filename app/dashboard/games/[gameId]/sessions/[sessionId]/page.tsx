import Link from "next/link";
import { notFound } from "next/navigation";
import { calculateBehaviorMetrics } from "@/lib/behavior-metrics";

import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    gameId: string;
    sessionId: string;
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

export default async function SessionDetailPage({
  params,
}: PageProps) {
  const { gameId, sessionId } = await params;

  // --------------------------------------------------
  // Game
  // --------------------------------------------------

  const gameDoc = await adminDb.collection("games").doc(gameId).get();

  if (!gameDoc.exists) {
    notFound();
  }

  const game = gameDoc.data()!;

  // --------------------------------------------------
  // Session events
  // --------------------------------------------------

  const snapshot = await adminDb
    .collection("gameEvents")
    .where("gameId", "==", gameId)
    .where("sessionId", "==", sessionId)
    .get();

  if (snapshot.empty) {
  return (
    <main className="min-h-screen bg-[#F7F7F4] p-10 text-[#111111]">
      <h1 className="text-3xl">Session not found</h1>
      <p className="mt-4 text-black/50">
        No events were found for this session.
      </p>

      <Link
        href={`/dashboard/games/${gameId}/sessions`}
        className="mt-8 inline-block text-sm text-black/50"
      >
        ← Back to Sessions
      </Link>
    </main>
  );
}

const events: GameEvent[] = snapshot.docs
  .map((doc): GameEvent => {
    const data = doc.data();

    return {
      id: doc.id,
      gameId: data.gameId,
      playerHash: data.playerHash,
      sessionId: data.sessionId,
      event: data.event,
      eventTimestamp: data.eventTimestamp,
      data: data.data,
      eventSequence: data.eventSequence,
    };
  })
 .sort((a, b) => {
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

  // --------------------------------------------------
  // Session summary
  // --------------------------------------------------

  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];

  const start = firstEvent?.eventTimestamp
    ? new Date(firstEvent.eventTimestamp)
    : null;

  const end = lastEvent?.eventTimestamp
    ? new Date(lastEvent.eventTimestamp)
    : null;

  const durationMs =
    start && end
      ? Math.max(0, end.getTime() - start.getTime())
      : 0;

  const durationSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  const playerHash = firstEvent?.playerHash ?? "unknown";

  const completed = events.some(
    (event) => event.event === "session_ended"
  );

  const levelStarts = events.filter(
    (event) => event.event === "level_started"
  ).length;

  const levelCompletions = events.filter(
    (event) => event.event === "level_completed"
  ).length;

  const adEvents = events.filter((event) =>
    event.event?.includes("ad")
  ).length;

  const behaviorMetrics = calculateBehaviorMetrics(events);

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
        {/* BACK */}

        <Link
          href={`/dashboard/games/${gameId}/sessions`}
          className="text-sm text-black/40 transition-opacity hover:opacity-50"
        >
          ← Sessions
        </Link>

        {/* TITLE */}

        <div className="mt-12">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/35">
            {game.name ?? gameId}
          </p>

          <h1 className="mt-5 break-all text-4xl font-normal tracking-[-0.045em] md:text-6xl">
            {sessionId}
          </h1>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="border border-black/10 px-3 py-1 text-xs text-black/45">
              {completed ? "Complete" : "Incomplete"}
            </span>

            <span className="border border-black/10 px-3 py-1 text-xs text-black/45">
              {events.length} events
            </span>
          </div>
        </div>

        {/* SUMMARY */}

        <div className="mt-16 grid border-y border-black/15 md:grid-cols-4">
          <Metric
            label="Duration"
            value={`${minutes}m ${seconds}s`}
          />

          <Metric
            label="Levels Started"
            value={levelStarts.toString()}
          />

          <Metric
            label="Levels Completed"
            value={levelCompletions.toString()}
          />

          <Metric
            label="Ad Events"
            value={adEvents.toString()}
            last
          />
        </div>

        {/* SESSION INFO */}

        <div className="mt-12 grid gap-8 border-b border-black/15 pb-12 md:grid-cols-3">
          <Info
            label="Player"
            value={
              playerHash.length > 20
                ? `${playerHash.substring(0, 20)}…`
                : playerHash
            }
            mono
          />

          <Info
            label="Started"
            value={start ? start.toLocaleString() : "—"}
          />

          <Info
            label="Ended"
            value={end ? end.toLocaleString() : "—"}
          />
        </div>

{/* BEHAVIOUR METRICS */}

<div className="mt-20">
  <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/35">
    Behaviour Analysis
  </p>

  <h2 className="mt-4 text-4xl tracking-[-0.04em]">
    Behaviour Metrics
  </h2>

  <p className="mt-4 max-w-2xl text-black/45">
    Metrics derived automatically from the raw gameplay events
    recorded during this session.
  </p>

  {/* DECISION BEHAVIOUR */}

  <MetricSection title="Decision Behaviour">
    <BehaviorMetric
      label="Average Decision Time"
      value={formatMilliseconds(
        behaviorMetrics.decisions.averageDecisionTimeMs
      )}
    />

    <BehaviorMetric
      label="Fastest Decision"
      value={formatMilliseconds(
        behaviorMetrics.decisions.fastestDecisionTimeMs
      )}
    />

    <BehaviorMetric
      label="Slowest Decision"
      value={formatMilliseconds(
        behaviorMetrics.decisions.slowestDecisionTimeMs
      )}
    />

    <BehaviorMetric
      label="Decision Variability"
      value={formatMilliseconds(
        behaviorMetrics.decisions.decisionTimeStdDevMs
      )}
    />
  </MetricSection>

<MetricSection title="Behavioural Dynamics">
  <BehaviorMetric
    label="Decision Trend"
    value={formatDecisionTrend(
      behaviorMetrics.dynamics.decisionTimeTrendMsPerDecision
    )}
  />

  <BehaviorMetric
    label="Decision Variability"
    value={formatPercentage(
      behaviorMetrics.dynamics
        .decisionTimeCoefficientOfVariation
    )}
  />

  <BehaviorMetric
    label="Post-Error Change"
    value={formatSignedPercentage(
      behaviorMetrics.dynamics.postErrorSlowingPercent
    )}
  />

  <BehaviorMetric
    label="Booster Timing"
    value={formatPercentage(
      behaviorMetrics.dynamics.boosterTimingPercent
    )}
  />

  <BehaviorMetric
    label="Baseline Decision"
    value={formatMilliseconds(
      behaviorMetrics.dynamics.baselineDecisionTimeMs
    )}
  />

  <BehaviorMetric
    label="Post-Error Decision"
    value={formatMilliseconds(
      behaviorMetrics.dynamics.postErrorDecisionTimeMs
    )}
  />

  <BehaviorMetric
  label="Failure → Ad Offer"
  value={formatDuration(
    behaviorMetrics.dynamics.failureToAdOfferMs
  )}
/>

<BehaviorMetric
  label="Ad Decision Time"
  value={formatDuration(
    behaviorMetrics.dynamics.adDecisionTimeMs
  )}
/>

<BehaviorMetric
  label="Ad Exposure"
  value={formatDuration(
    behaviorMetrics.dynamics.adExposureTimeMs
  )}
/>

<BehaviorMetric
  label="Post-Ad Resume"
  value={formatDuration(
    behaviorMetrics.dynamics.postAdResumeTimeMs
  )}
/>

<BehaviorMetric
  label="Resume → First Move"
  value={formatDuration(
    behaviorMetrics.dynamics.resumeToFirstMoveMs
  )}
/>

<BehaviorMetric
  label="Total Interruption"
  value={formatDuration(
    behaviorMetrics.dynamics.totalFailureInterruptionMs
  )}
/>
</MetricSection>





  {/* GAMEPLAY */}

  <MetricSection title="Gameplay">
    <BehaviorMetric
      label="Moves"
      value={behaviorMetrics.gameplay.moves.toString()}
    />

    <BehaviorMetric
      label="Invalid Moves"
      value={behaviorMetrics.gameplay.invalidMoves.toString()}
    />

    <BehaviorMetric
      label="Invalid Move Rate"
      value={formatPercentage(
        behaviorMetrics.gameplay.invalidMoveRate
      )}
    />

    <BehaviorMetric
      label="Level Completion Rate"
      value={formatPercentage(
        behaviorMetrics.gameplay.completionRate
      )}
    />
  </MetricSection>

  {/* STRATEGY */}

  <MetricSection title="Strategy">
    <BehaviorMetric
      label="Boosters Used"
      value={behaviorMetrics.strategy.boostersUsed.toString()}
    />

    <BehaviorMetric
      label="Levels Failed"
      value={behaviorMetrics.gameplay.levelsFailed.toString()}
    />

    <BehaviorMetric
      label="Levels Completed"
      value={behaviorMetrics.gameplay.levelsCompleted.toString()}
    />

    <BehaviorMetric
      label="Decision Samples"
      value={behaviorMetrics.decisions.count.toString()}
    />
  </MetricSection>

  {/* ADVERTISING */}

  <MetricSection title="Advertising Behaviour">
    <BehaviorMetric
      label="Ads Offered"
      value={behaviorMetrics.advertising.adsOffered.toString()}
    />

    <BehaviorMetric
      label="Ads Accepted"
      value={behaviorMetrics.advertising.adsAccepted.toString()}
    />

    <BehaviorMetric
      label="Ads Completed"
      value={behaviorMetrics.advertising.adsCompleted.toString()}
    />

    <BehaviorMetric
      label="Acceptance Rate"
      value={formatPercentage(
        behaviorMetrics.advertising.adAcceptanceRate
      )}
    />
  </MetricSection>

  {/* RECOVERY */}

  <MetricSection title="Recovery Behaviour">
    <BehaviorMetric
      label="Resumed After Failure"
      value={formatBoolean(
        behaviorMetrics.recovery.resumedAfterFailure
      )}
    />

    <BehaviorMetric
      label="Completed After Failure"
      value={formatBoolean(
        behaviorMetrics.recovery.completedLevelAfterFailure
      )}
    />

    <BehaviorMetric
      label="Completed After Ad"
      value={formatBoolean(
        behaviorMetrics.recovery.completedLevelAfterAd
      )}
    />
  </MetricSection>
</div>




        {/* TIMELINE */}

        <div className="mt-20">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-black/35">
            Player Behavior
          </p>

          <h2 className="mt-4 text-4xl tracking-[-0.04em]">
            Session Timeline
          </h2>

          <div className="mt-12">
            {events.map((event, index) => (
              <TimelineEvent
                key={event.id}
                event={event}
                first={index === 0}
                last={index === events.length - 1}
                sessionStart={start}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function TimelineEvent({
  event,
  first,
  last,
  sessionStart,
}: {
  event: GameEvent;
  first: boolean;
  last: boolean;
  sessionStart: Date | null;
}) {
  const time = event.eventTimestamp
    ? new Date(event.eventTimestamp)
    : null;

  const offsetMs =
    time && sessionStart
      ? Math.max(0, time.getTime() - sessionStart.getTime())
      : 0;

  const totalSeconds = Math.round(offsetMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const offset =
    minutes > 0
      ? `+${minutes}m ${seconds}s`
      : `+${seconds}s`;

  return (
    <div className="grid grid-cols-[90px_28px_1fr] gap-4 md:grid-cols-[120px_32px_1fr]">
      {/* TIME */}

      <div className="pt-1 text-right">
        <p className="font-mono text-xs text-black/35">
          {first ? "START" : offset}
        </p>
      </div>

      {/* LINE */}

      <div className="relative flex justify-center">
        {!first && (
          <div className="absolute bottom-1/2 top-0 w-px bg-black/15" />
        )}

        {!last && (
          <div className="absolute bottom-0 top-1/2 w-px bg-black/15" />
        )}

        <div className="relative z-10 mt-1 h-3 w-3 rounded-full border border-black/30 bg-[#F7F7F4]" />
      </div>

      {/* EVENT */}

      <div className="pb-10">
        <details className="group">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-lg tracking-[-0.02em]">
                {formatEventName(event.event)}
              </p>

              <span className="text-xs text-black/25">
                {time ? time.toLocaleTimeString() : ""}
              </span>
            </div>

            <EventPreview event={event} />
          </summary>

          <div className="mt-4 bg-black/[0.035] p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-black/30">
              Raw Event Data
            </p>

            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-black/65">
              {JSON.stringify(event.data ?? {}, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
}

function EventPreview({ event }: { event: GameEvent }) {
  const data = event.data ?? {};

  const parts: string[] = [];

  if (typeof data.level === "number") {
    parts.push(`Level ${data.level}`);
  }

  if (typeof data.move === "number") {
    parts.push(`Move ${data.move}`);
  }

  if (typeof data.score === "number") {
    parts.push(`Score ${data.score}`);
  }

  if (typeof data.finalScore === "number") {
    parts.push(`Score ${data.finalScore}`);
  }

  if (typeof data.booster === "string") {
    parts.push(`Booster: ${data.booster}`);
  }

  if (typeof data.placement === "string") {
    parts.push(`Placement: ${data.placement}`);
  }

  if (typeof data.reward === "string") {
    parts.push(`Reward: ${data.reward}`);
  }

  if (typeof data.decisionTimeMs === "number") {
    parts.push(`${data.decisionTimeMs}ms decision`);
  }

  if (parts.length === 0) {
    return null;
  }

  return (
    <p className="mt-2 text-sm text-black/40">
      {parts.join(" · ")}
    </p>
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

      <p className="mt-4 text-3xl tracking-[-0.04em]">
        {value}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.15em] text-black/30">
        {label}
      </p>

      <p
        className={`mt-3 text-sm text-black/60 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatEventName(event?: string) {
  if (!event) return "Unknown Event";

  return event
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}
function MetricSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-12">
      <h3 className="border-b border-black/15 pb-4 text-lg tracking-[-0.02em]">
        {title}
      </h3>

      <div className="grid md:grid-cols-4">
        {children}
      </div>
    </div>
  );
}

function BehaviorMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-black/10 py-6 md:px-5">
      <p className="text-xs uppercase tracking-[0.12em] text-black/30">
        {label}
      </p>

      <p className="mt-3 text-2xl tracking-[-0.03em]">
        {value}
      </p>
    </div>
  );
}

function formatMilliseconds(value: number | null) {
  if (value === null) {
    return "—";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  }

  return `${value} ms`;
}

function formatPercentage(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `${Math.round(value * 100)}%`;
}

function formatBoolean(value: boolean) {
  return value ? "Yes" : "No";
}
function formatDecisionTrend(value: number | null) {
  if (value === null) {
    return "—";
  }

  if (value === 0) {
    return "Stable";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value} ms / decision`;
}

function formatSignedPercentage(value: number | null) {
  if (value === null) {
    return "—";
  }

  const percent = Math.round(value * 100);
  const sign = percent > 0 ? "+" : "";

  return `${sign}${percent}%`;
}

function formatDuration(value: number | null) {
  if (value === null) {
    return "—";
  }

  if (value < 1000) {
    return `${value} ms`;
  }

  return `${(value / 1000).toFixed(2)} s`;
}