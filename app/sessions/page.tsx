"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type SessionEvent = {
  id: string;
  schemaVersion: string;
  researchId: string;
  sessionId: string;
  eventSequence: number | null;
  eventTimestamp: string | null;
  receivedAt: string | null;
  source: string;
  ingestionSource: string;
  gameId: string;
  gameVersion: string;
  eventType: string;
  payload: Record<string, unknown>;
};

type Session = {
  researchId: string;
  sessionId: string;
  gameId: string;
  gameVersion: string;

  eventCount: number;

  started: boolean;
  ended: boolean;
  gameCompleted: boolean;

  status:
    | "complete"
    | "incomplete"
    | "sequence_error";

  durationMs: number | null;

  startedAt: string | null;
  endedAt: string | null;

  missingSequences: number[];
  duplicateSequences: number[];

  events: SessionEvent[];
};

type SessionsResponse = {
  success: boolean;
  sessionCount: number;
  sessions: Session[];
};

function formatDuration(
  durationMs: number | null
) {
  if (durationMs === null) {
    return "—";
  }

  const seconds =
    Math.floor(durationMs / 1000);

  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function formatTime(
  timestamp: string | null
) {
  if (!timestamp) {
    return "—";
  }

  return new Date(
    timestamp
  ).toLocaleTimeString();
}

function formatDate(
  timestamp: string | null
) {
  if (!timestamp) {
    return "Unknown date";
  }

  return new Date(
    timestamp
  ).toLocaleString();
}

export default function SessionsPage() {
  const [sessions, setSessions] =
    useState<Session[]>([]);

  const [selectedSessionId, setSelectedSessionId] =
    useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  // --------------------------------------------------
  // LOAD SESSIONS
  // --------------------------------------------------

  async function loadSessions() {
    try {
      setLoading(true);
      setError(null);

      const response =
        await fetch(
          "/api/sessions",
          {
            cache: "no-store",
          }
        );

      const result:
        SessionsResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          "Failed to load sessions"
        );
      }

      setSessions(
        result.sessions ?? []
      );

      if (
        !selectedSessionId &&
        result.sessions.length > 0
      ) {
        setSelectedSessionId(
          result.sessions[0].sessionId
        );
      }
    } catch (error) {
      console.error(error);

      setError(
        "Unable to load AMY sessions."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  // --------------------------------------------------
  // SELECTED SESSION
  // --------------------------------------------------

  const selectedSession =
    useMemo(() => {
      return (
        sessions.find(
          (session) =>
            session.sessionId ===
            selectedSessionId
        ) ?? null
      );
    }, [
      sessions,
      selectedSessionId,
    ]);

  const selectedEvent =
    useMemo(() => {
      if (!selectedSession) {
        return null;
      }

      return (
        selectedSession.events.find(
          (event) =>
            event.id ===
            selectedEventId
        ) ?? null
      );
    }, [
      selectedSession,
      selectedEventId,
    ]);

  // --------------------------------------------------
  // COUNTS
  // --------------------------------------------------

  const completeSessions =
    sessions.filter(
      (session) =>
        session.status === "complete"
    ).length;

  const incompleteSessions =
    sessions.filter(
      (session) =>
        session.status === "incomplete"
    ).length;

  const sequenceErrors =
    sessions.filter(
      (session) =>
        session.status ===
        "sequence_error"
    ).length;

  const participantCount =
    new Set(
      sessions.map(
        (session) =>
          session.researchId
      )
    ).size;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* HEADER */}

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">

          <div>

            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">
              AMY
            </p>

            <h1 className="text-4xl font-bold">
              Session Explorer
            </h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              Inspect pseudonymized gameplay sessions and verify
              that raw behavioral telemetry has been captured
              completely.
            </p>

          </div>

          <button
            onClick={loadSessions}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium hover:bg-slate-800"
          >
            Refresh
          </button>

        </div>

        {/* SUMMARY */}

        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

          <StatCard
            label="Participants"
            value={participantCount}
          />

          <StatCard
            label="Sessions"
            value={sessions.length}
          />

          <StatCard
            label="Complete"
            value={completeSessions}
          />

          <StatCard
            label="Incomplete"
            value={incompleteSessions}
          />

          <StatCard
            label="Sequence Errors"
            value={sequenceErrors}
          />

        </div>

        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading sessions...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-900 bg-red-950/40 p-6 text-red-300">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          sessions.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
              No sessions found.
            </div>
          )}

        {!loading &&
          !error &&
          sessions.length > 0 && (

            <div className="grid gap-6 lg:grid-cols-[340px_1fr]">

              {/* SESSION LIST */}

              <section className="rounded-2xl border border-slate-800 bg-slate-900">

                <div className="border-b border-slate-800 p-4">

                  <h2 className="font-semibold">
                    Sessions
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {sessions.length} captured
                  </p>

                </div>

                <div className="max-h-[760px] overflow-y-auto">

                  {sessions.map(
                    (session) => {

                      const selected =
                        session.sessionId ===
                        selectedSessionId;

                      return (
                        <button
                          key={`${session.researchId}-${session.sessionId}`}
                          onClick={() => {
                            setSelectedSessionId(
                              session.sessionId
                            );

                            setSelectedEventId(
                              null
                            );
                          }}
                          className={`w-full border-b border-slate-800 p-4 text-left transition ${
                            selected
                              ? "bg-slate-800"
                              : "hover:bg-slate-800/60"
                          }`}
                        >

                          <div className="mb-2 flex items-center justify-between gap-2">

                            <span className="truncate font-mono text-xs text-slate-300">
                              {session.sessionId}
                            </span>

                            <StatusBadge
                              status={
                                session.status
                              }
                            />

                          </div>

                          <p className="truncate text-xs text-violet-300">
                            {session.researchId}
                          </p>

                          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">

                            <span>
                              {session.eventCount} events
                            </span>

                            <span>
                              {formatDuration(
                                session.durationMs
                              )}
                            </span>

                          </div>

                        </button>
                      );
                    }
                  )}

                </div>

              </section>

              {/* SESSION DETAIL */}

              {selectedSession && (

                <div className="space-y-6">

                  {/* SESSION HEADER */}

                  <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                    <div className="flex flex-wrap items-start justify-between gap-4">

                      <div>

                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Research Participant
                        </p>

                        <h2 className="mt-1 font-mono text-lg text-violet-300">
                          {selectedSession.researchId}
                        </h2>

                        <p className="mt-3 font-mono text-sm text-slate-300">
                          {selectedSession.sessionId}
                        </p>

                      </div>

                      <StatusBadge
                        status={
                          selectedSession.status
                        }
                      />

                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                      <Detail
                        label="Game"
                        value={
                          selectedSession.gameId
                        }
                      />

                      <Detail
                        label="Version"
                        value={
                          selectedSession.gameVersion
                        }
                      />

                      <Detail
                        label="Events"
                        value={
                          String(
                            selectedSession.eventCount
                          )
                        }
                      />

                      <Detail
                        label="Duration"
                        value={
                          formatDuration(
                            selectedSession.durationMs
                          )
                        }
                      />

                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">

                      <Detail
                        label="Started"
                        value={
                          formatDate(
                            selectedSession.startedAt
                          )
                        }
                      />

                      <Detail
                        label="Ended"
                        value={
                          formatDate(
                            selectedSession.endedAt
                          )
                        }
                      />

                    </div>

                    {/* INTEGRITY WARNINGS */}

                    {selectedSession
                      .missingSequences
                      .length > 0 && (

                      <div className="mt-5 rounded-lg border border-red-900 bg-red-950/30 p-4">

                        <p className="font-medium text-red-300">
                          Missing event sequences
                        </p>

                        <p className="mt-1 font-mono text-sm text-red-400">
                          {selectedSession.missingSequences.join(
                            ", "
                          )}
                        </p>

                      </div>

                    )}

                    {selectedSession
                      .duplicateSequences
                      .length > 0 && (

                      <div className="mt-5 rounded-lg border border-amber-900 bg-amber-950/30 p-4">

                        <p className="font-medium text-amber-300">
                          Duplicate event sequences
                        </p>

                        <p className="mt-1 font-mono text-sm text-amber-400">
                          {selectedSession.duplicateSequences.join(
                            ", "
                          )}
                        </p>

                      </div>

                    )}

                  </section>

                  {/* EVENT STREAM */}

                  <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

                    <div className="border-b border-slate-800 p-5">

                      <h2 className="font-semibold">
                        Raw Event Stream
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Complete pseudonymized behavioral record.
                      </p>

                    </div>

                    <div className="overflow-x-auto">

                      <table className="w-full text-left text-sm">

                        <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">

                          <tr>

                            <th className="px-4 py-3">
                              #
                            </th>

                            <th className="px-4 py-3">
                              Time
                            </th>

                            <th className="px-4 py-3">
                              Event
                            </th>

                            <th className="px-4 py-3">
                              Source
                            </th>

                            <th className="px-4 py-3">
                              Payload
                            </th>

                          </tr>

                        </thead>

                        <tbody>

                          {selectedSession.events.map(
                            (event) => (

                              <tr
                                key={event.id}
                                onClick={() =>
                                  setSelectedEventId(
                                    event.id
                                  )
                                }
                                className={`cursor-pointer border-t border-slate-800 ${
                                  selectedEventId ===
                                  event.id
                                    ? "bg-slate-800"
                                    : "hover:bg-slate-800/50"
                                }`}
                              >

                                <td className="px-4 py-3 font-mono text-slate-400">

                                  {event.eventSequence ??
                                    "—"}

                                </td>

                                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">

                                  {formatTime(
                                    event.eventTimestamp
                                  )}

                                </td>

                                <td className="px-4 py-3 font-medium">

                                  {event.eventType}

                                </td>

                                <td className="px-4 py-3 text-xs text-slate-400">

                                  {event.source}

                                </td>

                                <td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs text-slate-500">

                                  {JSON.stringify(
                                    event.payload
                                  )}

                                </td>

                              </tr>

                            )
                          )}

                        </tbody>

                      </table>

                    </div>

                  </section>

                  {/* EVENT INSPECTOR */}

                  {selectedEvent && (

                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

                      <div className="mb-4">

                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Event Inspector
                        </p>

                        <h2 className="mt-1 text-lg font-semibold">
                          {selectedEvent.eventType}
                        </h2>

                      </div>

                      <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-300">
                        {JSON.stringify(
                          selectedEvent,
                          null,
                          2
                        )}
                      </pre>

                    </section>

                  )}

                </div>

              )}

            </div>

          )}

      </div>

    </main>
  );
}

// --------------------------------------------------
// COMPONENTS
// --------------------------------------------------

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">

      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>

    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-all text-sm text-slate-200">
        {value}
      </p>

    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    | "complete"
    | "incomplete"
    | "sequence_error";
}) {
  if (
    status === "complete"
  ) {
    return (
      <span className="rounded-full bg-emerald-950 px-2.5 py-1 text-xs font-medium text-emerald-400">
        Complete
      </span>
    );
  }

  if (
    status ===
    "sequence_error"
  ) {
    return (
      <span className="rounded-full bg-red-950 px-2.5 py-1 text-xs font-medium text-red-400">
        Sequence Error
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-950 px-2.5 py-1 text-xs font-medium text-amber-400">
      Incomplete
    </span>
  );
}