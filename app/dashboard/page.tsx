"use client";

import { useEffect, useMemo, useState } from "react";

type TelemetryEvent = {
  id: string;
  researchId: string;
  sessionId: string;
  source: string;
  eventType: string;
  gameId: string;
  payload: Record<string, unknown>;
  receivedAt: string | null;
};

export default function DashboardPage() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string>("all");

  async function loadTelemetry() {
    setLoading(true);

    try {
      const response = await fetch("/api/telemetry");
      const data = await response.json();

      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error("Failed to load telemetry", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTelemetry();
  }, []);

  const sessions = useMemo(() => {
    return Array.from(
      new Set(events.map((event) => event.sessionId))
    );
  }, [events]);

  const visibleEvents = useMemo(() => {
    const filtered =
      selectedSession === "all"
        ? events
        : events.filter(
            (event) => event.sessionId === selectedSession
          );

    return [...filtered].sort((a, b) => {
      if (!a.receivedAt || !b.receivedAt) return 0;

      return (
        new Date(a.receivedAt).getTime() -
        new Date(b.receivedAt).getTime()
      );
    });
  }, [events, selectedSession]);

  const gameEvents = visibleEvents.filter(
    (event) => event.source === "game"
  );

  const adEvents = visibleEvents.filter(
    (event) => event.source === "ad"
  );

const adImpressions = visibleEvents.filter(
  (event) => event.eventType === "ad_impression"
);

const adClicks = visibleEvents.filter(
  (event) => event.eventType === "ad_clicked"
);

const adCompletions = visibleEvents.filter(
  (event) => event.eventType === "ad_completed"
);

const adSkips = visibleEvents.filter(
  (event) => event.eventType === "ad_skipped"
);

const gameResumes = visibleEvents.filter(
  (event) => event.eventType === "game_resumed"
);

const sessionAbandonments = visibleEvents.filter(
  (event) => event.eventType === "session_abandoned"
);

const appRestarts = visibleEvents.filter(
  (event) => event.eventType === "app_restarted"
);

const clickRate =
  adImpressions.length > 0
    ? Math.round(
        (adClicks.length / adImpressions.length) * 100
      )
    : 0;

const completionRate =
  adImpressions.length > 0
    ? Math.round(
        (adCompletions.length / adImpressions.length) * 100
      )
    : 0;

const returnRate =
  adImpressions.length > 0
    ? Math.round(
        (gameResumes.length / adImpressions.length) * 100
      )
    : 0;




  const targetHits = visibleEvents.filter(
    (event) => event.eventType === "target_hit"
  );

  const incorrectTaps = visibleEvents.filter(
    (event) => event.eventType === "incorrect_tap"
  );

  const reactionTimes = targetHits
    .map((event) => Number(event.payload.reactionMs))
    .filter((value) => Number.isFinite(value));

  const averageReaction =
    reactionTimes.length > 0
      ? Math.round(
          reactionTimes.reduce((sum, value) => sum + value, 0) /
            reactionTimes.length
        )
      : null;

  const fastestReaction =
    reactionTimes.length > 0
      ? Math.min(...reactionTimes)
      : null;

  const slowestReaction =
    reactionTimes.length > 0
      ? Math.max(...reactionTimes)
      : null;

  const participants = new Set(
    visibleEvents.map((event) => event.researchId)
  ).size;

  function formatTime(timestamp: string | null) {
    if (!timestamp) return "—";

    return new Date(timestamp).toLocaleTimeString();
  }

  function eventLabel(event: TelemetryEvent) {
    switch (event.eventType) {
      case "game_started":
        return "Game started";

      case "target_shown":
        return "Target appeared";

      case "target_hit":
        return `Target hit • ${event.payload.reactionMs ?? "?"} ms`;

      case "incorrect_tap":
        return "Incorrect tap";

      case "game_completed":
        return "Game completed";

      case "ad_impression":
        return "Ad impression";

      case "ad_clicked":
        return "Ad clicked";

      default:
        return event.eventType;
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* HEADER */}

        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">

          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">
              AMY
            </p>

            <h1 className="text-4xl font-bold">
              Behavioral Telemetry
            </h1>

            <p className="mt-3 text-slate-400">
              Gameplay behavior, reaction performance and advertising exposure.
            </p>
          </div>

          <button
            onClick={loadTelemetry}
            className="rounded-lg bg-violet-600 px-5 py-3 font-medium hover:bg-violet-500"
          >
            Refresh Data
          </button>

        </div>

        {/* FILTER */}

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex flex-wrap items-center gap-4">

            <div>
              <label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">
                Session
              </label>

              <select
                value={selectedSession}
                onChange={(event) =>
                  setSelectedSession(event.target.value)
                }
                className="min-w-72 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              >
                <option value="all">
                  All sessions
                </option>

                {sessions.map((session) => (
                  <option key={session} value={session}>
                    {session}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto text-right">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Loaded
              </p>

              <p className="font-semibold">
                {loading ? "Loading..." : `${events.length} events`}
              </p>
            </div>

          </div>

        </section>

        {/* KPI CARDS */}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

          <MetricCard
            label="Participants"
            value={participants}
          />

          <MetricCard
            label="Game Events"
            value={gameEvents.length}
          />

          <MetricCard
            label="Ad Events"
            value={adEvents.length}
          />

          <MetricCard
            label="Avg Reaction"
            value={
              averageReaction !== null
                ? `${averageReaction} ms`
                : "—"
            }
          />

          <MetricCard
            label="Fastest"
            value={
              fastestReaction !== null
                ? `${fastestReaction} ms`
                : "—"
            }
          />

          <MetricCard
            label="Errors"
            value={incorrectTaps.length}
          />

        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">

          {/* TIMELINE */}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <div className="mb-6">

              <h2 className="text-xl font-semibold">
                Session Timeline
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Reconstructed directly from raw telemetry.
              </p>

            </div>

            {visibleEvents.length === 0 ? (

              <p className="py-12 text-center text-slate-500">
                No telemetry available.
              </p>

            ) : (

              <div className="space-y-1">

                {visibleEvents.map((event) => {

                  const isAd = event.source === "ad";
                  const isError =
                    event.eventType === "incorrect_tap";
                  const isHit =
                    event.eventType === "target_hit";

                  return (
                    <div
                      key={event.id}
                      className="grid grid-cols-[90px_20px_1fr] gap-3"
                    >

                      <div className="pt-4 text-right text-xs text-slate-500">
                        {formatTime(event.receivedAt)}
                      </div>

                      <div className="relative flex justify-center">

                        <div className="absolute bottom-0 top-0 w-px bg-slate-800" />

                        <div
                          className={`relative mt-5 h-3 w-3 rounded-full ${
                            isAd
                              ? "bg-amber-400"
                              : isError
                              ? "bg-red-400"
                              : isHit
                              ? "bg-emerald-400"
                              : "bg-violet-400"
                          }`}
                        />

                      </div>

                      <div className="rounded-xl px-4 py-3 hover:bg-slate-950">

                        <div className="flex flex-wrap items-center justify-between gap-2">

                          <p className="font-medium">
                            {eventLabel(event)}
                          </p>

                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              isAd
                                ? "bg-amber-950 text-amber-300"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {event.source}
                          </span>

                        </div>

                        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-500">

                          <span>
                            {event.researchId}
                          </span>

                          <span>
                            {event.gameId}
                          </span>

                        </div>

                      </div>

                    </div>
                  );
                })}

              </div>

            )}

          </section>

          {/* PERFORMANCE */}

          <div className="space-y-6">

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

              <h2 className="mb-5 text-xl font-semibold">
                Reaction Performance
              </h2>

              {reactionTimes.length === 0 ? (

                <p className="text-sm text-slate-500">
                  No reaction data available.
                </p>

              ) : (

                <div className="space-y-4">

                  {reactionTimes.map((reaction, index) => {

                    const width = Math.min(
                      100,
                      Math.max(8, (reaction / 1200) * 100)
                    );

                    return (
                      <div key={index}>

                        <div className="mb-1 flex justify-between text-xs">

                          <span className="text-slate-500">
                            Trial {index + 1}
                          </span>

                          <span className="font-medium">
                            {reaction} ms
                          </span>

                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{
                              width: `${width}%`,
                            }}
                          />

                        </div>

                      </div>
                    );
                  })}

                </div>

              )}

              {slowestReaction !== null && (
                <div className="mt-6 border-t border-slate-800 pt-4">

                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">
                      Range
                    </span>

                    <span>
                      {fastestReaction}–{slowestReaction} ms
                    </span>
                  </div>

                </div>
              )}

            </section>

           <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

  <div className="mb-6">
    <h2 className="text-xl font-semibold">
      Ad Exposure
    </h2>

    <p className="mt-1 text-sm text-slate-400">
      Behavior during and immediately after advertising.
    </p>
  </div>

  <div className="grid grid-cols-2 gap-3">

    <AdMetric
      label="Impressions"
      value={adImpressions.length}
    />

    <AdMetric
      label="Clicks"
      value={adClicks.length}
    />

    <AdMetric
      label="Click Rate"
      value={`${clickRate}%`}
    />

    <AdMetric
      label="Completed"
      value={`${completionRate}%`}
    />

    <AdMetric
      label="Returned"
      value={`${returnRate}%`}
    />

    <AdMetric
      label="Abandoned"
      value={sessionAbandonments.length}
    />

  </div>

  <div className="mt-6 border-t border-slate-800 pt-5">

    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
      Post-Ad Behavior
    </p>

    <div className="space-y-3 text-sm">

      <div className="flex justify-between">
        <span className="text-slate-400">
          Immediate game resumes
        </span>

        <span>{gameResumes.length}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-slate-400">
          Game abandoned
        </span>

        <span>{sessionAbandonments.length}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-slate-400">
          App restarted
        </span>

        <span>{appRestarts.length}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-slate-400">
          Ads skipped
        </span>

        <span>{adSkips.length}</span>
      </div>

    </div>

  </div>

</section>

          </div>

        </div>

      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>

    </div>
  );
}
function AdMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-slate-950 p-4">

      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">
        {value}
      </p>

    </div>
  );
}