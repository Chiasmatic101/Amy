import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

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

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("telemetryEvents")
      .orderBy("receivedAt", "desc")
      .limit(2000)
      .get();

    const events: SessionEvent[] = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,

        schemaVersion:
          data.schemaVersion ?? "unknown",

        researchId:
          data.researchId ?? "unknown",

        sessionId:
          data.sessionId ?? "unknown",

        eventSequence:
          typeof data.eventSequence === "number"
            ? data.eventSequence
            : null,

        eventTimestamp:
          data.eventTimestamp ?? null,

        receivedAt:
          data.receivedAt?.toDate?.()?.toISOString() ?? null,

        source:
          data.source ?? "unknown",

        ingestionSource:
          data.ingestionSource ?? "unknown",

        gameId:
          data.gameId ?? "unknown",

        gameVersion:
          data.gameVersion ?? "unknown",

        eventType:
          data.eventType ?? "unknown",

        payload:
          data.payload ?? {},
      };
    });

    // ---------------------------------------------
    // GROUP EVENTS INTO SESSIONS
    // ---------------------------------------------

    const grouped = new Map<
      string,
      {
        researchId: string;
        sessionId: string;
        events: SessionEvent[];
      }
    >();

    for (const event of events) {
      const key =
        `${event.researchId}::${event.sessionId}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          researchId: event.researchId,
          sessionId: event.sessionId,
          events: [],
        });
      }

      grouped.get(key)!.events.push(event);
    }

    // ---------------------------------------------
    // BUILD SESSION SUMMARIES
    // ---------------------------------------------

    const sessions = Array.from(grouped.values()).map(
      (session) => {
        const sortedEvents = [...session.events].sort(
          (a, b) => {
            // Prefer eventSequence when available.

            if (
              a.eventSequence !== null &&
              b.eventSequence !== null
            ) {
              return a.eventSequence - b.eventSequence;
            }

            // Fall back to eventTimestamp.

            const aTime =
              a.eventTimestamp
                ? new Date(a.eventTimestamp).getTime()
                : 0;

            const bTime =
              b.eventTimestamp
                ? new Date(b.eventTimestamp).getTime()
                : 0;

            return aTime - bTime;
          }
        );

        const firstEvent =
          sortedEvents[0] ?? null;

        const lastEvent =
          sortedEvents[sortedEvents.length - 1] ?? null;

        const started =
          sortedEvents.some(
            (event) =>
              event.eventType === "session_started"
          );

        const ended =
          sortedEvents.some(
            (event) =>
              event.eventType === "session_ended"
          );

        const gameCompleted =
          sortedEvents.some(
            (event) =>
              event.eventType === "game_completed"
          );

        const firstTimestamp =
          firstEvent?.eventTimestamp
            ? new Date(firstEvent.eventTimestamp).getTime()
            : null;

        const lastTimestamp =
          lastEvent?.eventTimestamp
            ? new Date(lastEvent.eventTimestamp).getTime()
            : null;

        const durationMs =
          firstTimestamp !== null &&
          lastTimestamp !== null
            ? Math.max(
                0,
                lastTimestamp - firstTimestamp
              )
            : null;

        // -----------------------------------------
        // CHECK SEQUENCE INTEGRITY
        // -----------------------------------------

        const sequenceNumbers =
          sortedEvents
            .map((event) => event.eventSequence)
            .filter(
              (value): value is number =>
                typeof value === "number"
            );

        const missingSequences: number[] = [];

        if (sequenceNumbers.length > 0) {
          const uniqueSequences = [
            ...new Set(sequenceNumbers),
          ].sort((a, b) => a - b);

          const minSequence =
            uniqueSequences[0];

          const maxSequence =
            uniqueSequences[
              uniqueSequences.length - 1
            ];

          for (
            let i = minSequence;
            i <= maxSequence;
            i++
          ) {
            if (!uniqueSequences.includes(i)) {
              missingSequences.push(i);
            }
          }
        }

        const duplicateSequences =
          sequenceNumbers.filter(
            (sequence, index) =>
              sequenceNumbers.indexOf(sequence) !== index
          );

        let status:
          | "complete"
          | "incomplete"
          | "sequence_error";

        if (
          missingSequences.length > 0 ||
          duplicateSequences.length > 0
        ) {
          status = "sequence_error";
        } else if (started && ended) {
          status = "complete";
        } else {
          status = "incomplete";
        }

        return {
          researchId:
            session.researchId,

          sessionId:
            session.sessionId,

          gameId:
            firstEvent?.gameId ?? "unknown",

          gameVersion:
            firstEvent?.gameVersion ?? "unknown",

          eventCount:
            sortedEvents.length,

          started,
          ended,
          gameCompleted,

          status,

          durationMs,

          startedAt:
            firstEvent?.eventTimestamp ?? null,

          endedAt:
            lastEvent?.eventTimestamp ?? null,

          missingSequences,

          duplicateSequences: [
            ...new Set(duplicateSequences),
          ],

          events:
            sortedEvents,
        };
      }
    );

    // Newest sessions first.

    sessions.sort((a, b) => {
      const aTime =
        a.startedAt
          ? new Date(a.startedAt).getTime()
          : 0;

      const bTime =
        b.startedAt
          ? new Date(b.startedAt).getTime()
          : 0;

      return bTime - aTime;
    });

    return NextResponse.json({
      success: true,
      sessionCount: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error(
      "Session explorer API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load sessions",
      },
      { status: 500 }
    );
  }
}