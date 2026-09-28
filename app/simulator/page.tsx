"use client";

import { useRef, useState } from "react";

type EventLog = {
  id: string;
  eventType: string;
  source: string;
  time: string;
  success: boolean;
  detail?: string;
};

const TOTAL_TRIALS = 10;

export default function SimulatorPage() {
  const [developerUserId, setDeveloperUserId] =
    useState("PLAYER_92871");

  const [publisherUserId, setPublisherUserId] =
    useState("PUB_a8f72c");

  const [sessionId, setSessionId] =
    useState("S_TEST_001");

  const [gameRunning, setGameRunning] =
    useState(false);

  const [trial, setTrial] = useState(0);
  const [score, setScore] = useState(0);

  const [targetPosition, setTargetPosition] =
    useState<number | null>(null);

  const [reactionTimes, setReactionTimes] =
    useState<number[]>([]);

  const [logs, setLogs] =
    useState<EventLog[]>([]);

  const targetShownAt =
    useRef<number | null>(null);
  
  const eventSequenceRef = useRef(0);

  function nextEventSequence() {
  eventSequenceRef.current += 1;
  return eventSequenceRef.current;
}


  const timeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  // -------------------------------------------------------
  // TELEMETRY
  // -------------------------------------------------------

  async function sendEvent(
    eventType: string,
    source: "game" | "ad",
    payload: Record<string, unknown> = {}
  ) {
    try {
      let endpoint: string;
      let body: Record<string, unknown>;

      // ---------------------------
      // AD PROVIDER FEED
      // ---------------------------

      if (source === "ad") {
        endpoint = "/api/ad-events";

        body = {
          publisherUserId,
          sessionId,

          eventType,
          gameId: "quick_tap",

          provider: "simulated_applovin",

          adId:
            typeof payload.adId === "string"
              ? payload.adId
              : null,

          placement: "between_games",
          format: "interstitial",

          eventTimestamp:
            new Date().toISOString(),

          payload,
        };
      }

      // ---------------------------
      // GAME DEVELOPER FEED
      // ---------------------------

      else {
        endpoint = "/api/game-events";

        body = {
          developerUserId,
          sessionId,


          eventSequence: nextEventSequence(),

          eventType,
          gameVersion: "1.0.0",
          gameId: "quick_tap",

          eventTimestamp:
            new Date().toISOString(),

          payload,
        };
      }

      console.log(
        `[AMY] Sending ${eventType} (${source}) → ${endpoint}`,
        body
      );

      const response = await fetch(endpoint, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Telemetry request failed"
        );
      }

      setLogs((previous) => [
        {
          id: crypto.randomUUID(),

          eventType,
          source,

          time:
            new Date().toLocaleTimeString(),

          success:
            result.success === true,

          detail:
            payload.reactionMs !== undefined
              ? `${payload.reactionMs} ms`
              : undefined,
        },

        ...previous,
      ]);
    } catch (error) {
      console.error(
        `[AMY] Failed to send ${eventType}`,
        error
      );

      setLogs((previous) => [
        {
          id: crypto.randomUUID(),

          eventType,
          source,

          time:
            new Date().toLocaleTimeString(),

          success: false,
        },

        ...previous,
      ]);
    }
  }

  // -------------------------------------------------------
  // SESSION
  // -------------------------------------------------------

  function createSession() {
    return `S_${Date.now()}`;
  }

  // -------------------------------------------------------
  // TARGET SCHEDULING
  // -------------------------------------------------------

  function scheduleTarget(
    nextTrial: number
  ) {
    setTargetPosition(null);

    const delay =
      Math.floor(Math.random() * 1500) +
      700;

    timeoutRef.current = setTimeout(() => {
      const position =
        Math.floor(Math.random() * 9);

      setTargetPosition(position);

      targetShownAt.current =
        performance.now();

      sendEvent(
        "target_shown",
        "game",
        {
          trial: nextTrial,
          position,
        }
      );
    }, delay);
  }

  // -------------------------------------------------------
  // START GAME
  // -------------------------------------------------------

  async function startGame() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const newSessionId =
      createSession();
      eventSequenceRef.current = 0;

    setSessionId(newSessionId);

    setGameRunning(true);

    setTrial(1);
    setScore(0);

    setReactionTimes([]);

    setTargetPosition(null);

    setLogs([]);

await sendEventWithSession(
  newSessionId,
  "session_started",
  {
    sessionType: "gameplay",
  }
);

await sendEventWithSession(
  newSessionId,
  "game_started",
  {
    totalTrials: TOTAL_TRIALS,
  }
);

    scheduleTarget(1);
  }

  // -------------------------------------------------------
  // GAME EVENT WITH EXPLICIT SESSION
  // -------------------------------------------------------

  async function sendEventWithSession(
    specificSessionId: string,
    eventType: string,
    payload: Record<string, unknown>
  ) {
    try {
      const response =
        await fetch(
          "/api/game-events",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              developerUserId,

              sessionId:
                specificSessionId,

                 eventSequence: nextEventSequence(),

              eventType,

              gameId:
                "quick_tap",
                gameVersion: "1.0.0",

              eventTimestamp:
                new Date().toISOString(),

              payload,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Telemetry request failed"
        );
      }

      setLogs((previous) => [
        {
          id:
            crypto.randomUUID(),

          eventType,

          source:
            "game",

          time:
            new Date().toLocaleTimeString(),

          success:
            result.success === true,
        },

        ...previous,
      ]);
    } catch (error) {
      console.error(
        `[AMY] Failed to send ${eventType}`,
        error
      );
    }
  }

  // -------------------------------------------------------
  // TARGET HIT
  // -------------------------------------------------------

  async function hitTarget(
    position: number
  ) {
    if (
      !gameRunning ||
      targetPosition === null
    ) {
      return;
    }

    if (
      position !== targetPosition
    ) {
      return;
    }

    const now =
      performance.now();

    const reactionMs =
      targetShownAt.current !== null
        ? Math.round(
            now -
              targetShownAt.current
          )
        : 0;

    const updatedTimes = [
      ...reactionTimes,
      reactionMs,
    ];

    const updatedScore =
      score + 1;

    setReactionTimes(
      updatedTimes
    );

    setScore(
      updatedScore
    );

    setTargetPosition(null);

    await sendEvent(
      "target_hit",
      "game",
      {
        trial,
        position,
        reactionMs,
        score:
          updatedScore,
      }
    );

    if (
      trial >=
      TOTAL_TRIALS
    ) {
      finishGame(
        updatedTimes,
        updatedScore
      );

      return;
    }

    const nextTrial =
      trial + 1;

    setTrial(nextTrial);

    scheduleTarget(
      nextTrial
    );
  }

  // -------------------------------------------------------
  // INCORRECT TAP
  // -------------------------------------------------------

  async function registerMiss(
    position: number
  ) {
    if (
      !gameRunning ||
      targetPosition === null
    ) {
      return;
    }

    if (
      position ===
      targetPosition
    ) {
      await hitTarget(
        position
      );

      return;
    }

    await sendEvent(
      "incorrect_tap",
      "game",
      {
        trial,

        tappedPosition:
          position,

        targetPosition,
      }
    );
  }

  // -------------------------------------------------------
  // FINISH GAME
  // -------------------------------------------------------

  async function finishGame(
    times: number[],
    finalScore: number
  ) {
    setGameRunning(false);

    setTargetPosition(null);

    const averageReaction =
      times.length > 0
        ? Math.round(
            times.reduce(
              (
                sum,
                value
              ) =>
                sum +
                value,
              0
            ) /
              times.length
          )
        : 0;

    await sendEvent(
      "game_completed",
      
      "game",
      {
        totalTrials:
          TOTAL_TRIALS,

        score:
          finalScore,

        averageReactionMs:
          averageReaction,

        fastestReactionMs:
          times.length > 0
            ? Math.min(
                ...times
              )
            : null,

        slowestReactionMs:
          times.length > 0
            ? Math.max(
                ...times
              )
            : null,
      }
    );
await sendEvent(
  "session_ended",
  "game",
  {
    reason: "game_completed",
  }
);



  }

  // -------------------------------------------------------
  // AD JOURNEY SIMULATOR
  // -------------------------------------------------------

  async function simulateAdJourney(
    outcome:
      | "watched"
      | "skipped"
      | "clicked"
      | "abandoned"
      | "restarted"
  ) {
    const adId =
      `AD_${Date.now()}`;

    // Ad requested

    await sendEvent(
      "ad_requested",
      "ad",
      {
        adId,

        provider:
          "simulated_applovin",

        format:
          "interstitial",

        placement:
          "between_games",
      }
    );

    // Ad shown

    await sendEvent(
      "ad_impression",
      "ad",
      {
        adId,

        provider:
          "simulated_applovin",

        format:
          "interstitial",

        placement:
          "between_games",
      }
    );

    // ---------------------------
    // WATCHED
    // ---------------------------

    if (
      outcome ===
      "watched"
    ) {
      await sendEvent(
        "ad_completed",
        "ad",
        {
          adId,

          watchedSeconds:
            30,

          completionRate:
            1,
        }
      );

      await sendEvent(
        "ad_closed",
        "ad",
        {
          adId,

          closeMethod:
            "completed",
        }
      );

      await sendEvent(
        "game_resumed",
        "game",
        {
          adId,

          returnDelaySeconds:
            1,
        }
      );
    }

    // ---------------------------
    // SKIPPED
    // ---------------------------

    if (
      outcome ===
      "skipped"
    ) {
      await sendEvent(
        "ad_skipped",
        "ad",
        {
          adId,

          watchedSeconds:
            6,

          completionRate:
            0.2,
        }
      );

      await sendEvent(
        "ad_closed",
        "ad",
        {
          adId,

          closeMethod:
            "skip",
        }
      );

      await sendEvent(
        "game_resumed",
        "game",
        {
          adId,

          returnDelaySeconds:
            1,
        }
      );
    }

    // ---------------------------
    // CLICKED + RETURN
    // ---------------------------

    if (
      outcome ===
      "clicked"
    ) {
      await sendEvent(
        "ad_clicked",
        "ad",
        {
          adId,

          destination:
            "app_store",
        }
      );

      await sendEvent(
        "external_destination_opened",
        "ad",
        {
          adId,

          destination:
            "app_store",
        }
      );

      await sendEvent(
        "game_resumed",
        "game",
        {
          adId,

          returnDelaySeconds:
            42,
        }
      );
    }

    // ---------------------------
    // ABANDONED
    // ---------------------------

    if (
      outcome ===
      "abandoned"
    ) {
      await sendEvent(
        "ad_closed",
        "ad",
        {
          adId,

          closeMethod:
            "app_exit",
        }
      );

      await sendEvent(
        "session_abandoned",
        "game",
        {
          adId,

          reason:
            "after_ad",
        }
      );
    }

    // ---------------------------
    // CLICK + RESTART
    // ---------------------------

    if (
      outcome ===
      "restarted"
    ) {
      await sendEvent(
        "ad_clicked",
        "ad",
        {
          adId,

          destination:
            "app_store",
        }
      );

      await sendEvent(
        "app_backgrounded",
        "game",
        {
          adId,
        }
      );

      await sendEvent(
        "app_restarted",
        "game",
        {
          adId,

          returnDelaySeconds:
            185,
        }
      );
    }
  }

  // -------------------------------------------------------
  // PERFORMANCE
  // -------------------------------------------------------

  const averageReaction =
    reactionTimes.length > 0
      ? Math.round(
          reactionTimes.reduce(
            (
              sum,
              value
            ) =>
              sum +
              value,
            0
          ) /
            reactionTimes.length
        )
      : null;

  // -------------------------------------------------------
  // UI
  // -------------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* HEADER */}

        <div className="mb-10">

          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">
            AMY
          </p>

          <h1 className="text-4xl font-bold">
            Game Telemetry Lab
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Play a simple reaction game while AMY records behavioral
            telemetry and advertising interactions in real time.
          </p>

        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* GAME */}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

              <div>

                <h2 className="text-2xl font-semibold">
                  Quick Tap
                </h2>

                <p className="text-sm text-slate-400">
                  Tap the target as quickly as possible.
                </p>

              </div>

              <button
                onClick={startGame}
                className="rounded-lg bg-violet-600 px-5 py-3 font-semibold hover:bg-violet-500"
              >
                {gameRunning
                  ? "Restart Game"
                  : "Start Game"}
              </button>

            </div>

            {/* STATS */}

            <div className="mb-6 grid grid-cols-3 gap-3">

              <div className="rounded-xl bg-slate-950 p-4">

                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Trial
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {gameRunning
                    ? trial
                    : "—"}
                </p>

              </div>

              <div className="rounded-xl bg-slate-950 p-4">

                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Score
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {score}
                </p>

              </div>

              <div className="rounded-xl bg-slate-950 p-4">

                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Avg RT
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {averageReaction !==
                  null
                    ? `${averageReaction} ms`
                    : "—"}
                </p>

              </div>

            </div>

            {/* GAME BOARD */}

            <div className="grid aspect-square max-h-[560px] w-full grid-cols-3 gap-3">

              {Array.from({
                length: 9,
              }).map(
                (
                  _,
                  position
                ) => {
                  const isTarget =
                    gameRunning &&
                    targetPosition ===
                      position;

                  return (
                    <button
                      key={
                        position
                      }
                      onClick={() =>
                        registerMiss(
                          position
                        )
                      }
                      disabled={
                        !gameRunning
                      }
                      className={`flex items-center justify-center rounded-2xl border transition ${
                        isTarget
                          ? "border-violet-400 bg-violet-600"
                          : "border-slate-800 bg-slate-950 hover:bg-slate-800"
                      }`}
                    >
                      {isTarget && (
                        <div className="h-16 w-16 rounded-full bg-white shadow-lg" />
                      )}
                    </button>
                  );
                }
              )}

            </div>

            <div className="mt-5 text-center text-sm text-slate-500">

              {gameRunning
                ? targetPosition ===
                  null
                  ? "Get ready..."
                  : "Tap!"
                : "Press Start Game to begin"}

            </div>

          </section>

          {/* SIDEBAR */}

          <div className="space-y-6">

            {/* PARTICIPANT */}

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

              <h2 className="mb-4 font-semibold">
                Participant
              </h2>

              <label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">
                Game Developer User ID
              </label>

              <input
                value={
                  developerUserId
                }
                onChange={(e) =>
                  setDeveloperUserId(
                    e.target.value
                  )
                }
                disabled={
                  gameRunning
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              />

              <label className="mb-2 mt-4 block text-xs uppercase tracking-wide text-slate-500">
                Ad Publisher User ID
              </label>

              <input
                value={
                  publisherUserId
                }
                onChange={(e) =>
                  setPublisherUserId(
                    e.target.value
                  )
                }
                disabled={
                  gameRunning
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              />

              <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">
                Session
              </p>

              <p className="mt-1 break-all font-mono text-xs text-slate-300">
                {sessionId}
              </p>

            </section>

            {/* AD SIMULATOR */}

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

              <h2 className="mb-2 font-semibold">
                Ad Journey Simulator
              </h2>

              <p className="mb-5 text-sm text-slate-400">
                Simulate different user behaviors after an interstitial ad.
              </p>

              <div className="space-y-2">

                <button
                  onClick={() =>
                    simulateAdJourney(
                      "watched"
                    )
                  }
                  disabled={
                    gameRunning
                  }
                  className="w-full rounded-lg bg-slate-800 px-4 py-3 text-left hover:bg-slate-700 disabled:opacity-40"
                >
                  ▶ Watch Full Ad
                </button>

                <button
                  onClick={() =>
                    simulateAdJourney(
                      "skipped"
                    )
                  }
                  disabled={
                    gameRunning
                  }
                  className="w-full rounded-lg bg-slate-800 px-4 py-3 text-left hover:bg-slate-700 disabled:opacity-40"
                >
                  ↪ Skip Ad
                </button>

                <button
                  onClick={() =>
                    simulateAdJourney(
                      "clicked"
                    )
                  }
                  disabled={
                    gameRunning
                  }
                  className="w-full rounded-lg bg-slate-800 px-4 py-3 text-left hover:bg-slate-700 disabled:opacity-40"
                >
                  ↗ Click Ad + Return
                </button>

                <button
                  onClick={() =>
                    simulateAdJourney(
                      "abandoned"
                    )
                  }
                  disabled={
                    gameRunning
                  }
                  className="w-full rounded-lg bg-slate-800 px-4 py-3 text-left hover:bg-slate-700 disabled:opacity-40"
                >
                  ✕ Leave Game After Ad
                </button>

                <button
                  onClick={() =>
                    simulateAdJourney(
                      "restarted"
                    )
                  }
                  disabled={
                    gameRunning
                  }
                  className="w-full rounded-lg bg-amber-800 px-4 py-3 text-left hover:bg-amber-700 disabled:opacity-40"
                >
                  ↻ Click Ad + Restart Game
                </button>

              </div>

            </section>

            {/* LIVE TELEMETRY */}

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

              <div className="mb-4 flex items-center justify-between">

                <h2 className="font-semibold">
                  Live Telemetry
                </h2>

                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs">
                  {logs.length}
                </span>

              </div>

              {logs.length === 0 ? (

                <p className="text-sm text-slate-500">
                  No telemetry yet.
                </p>

              ) : (

                <div className="max-h-[420px] space-y-2 overflow-y-auto">

                  {logs.map(
                    (log) => (
                      <div
                        key={
                          log.id
                        }
                        className="rounded-lg bg-slate-950 px-3 py-2"
                      >

                        <div className="flex items-center justify-between gap-3">

                          <div className="min-w-0">

                            <p className="truncate text-sm font-medium">
                              {
                                log.eventType
                              }
                            </p>

                            <p className="text-xs text-slate-500">
                              {
                                log.source
                              }

                              {log.detail
                                ? ` • ${log.detail}`
                                : ""}
                            </p>

                          </div>

                          <span
                            className={
                              log.success
                                ? "text-emerald-400"
                                : "text-red-400"
                            }
                          >
                            ●
                          </span>

                        </div>

                      </div>
                    )
                  )}

                </div>

              )}

            </section>

          </div>

        </div>

      </div>

    </main>
  );
}