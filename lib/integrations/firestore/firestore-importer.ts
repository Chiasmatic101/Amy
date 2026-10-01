import {
  AmyCanonicalEvent,
  RawFirestoreDocument,
  mapFirestoreEvent,
} from "./firestore-mapper";

export type SequencedAmyEvent =
  AmyCanonicalEvent & {
    eventSequence: number;
  };

export type ImportSession = {
  sessionId: string;
  playerHash: string;
  eventCount: number;
  firstEventTimestamp: string;
  lastEventTimestamp: string;
  events: SequencedAmyEvent[];
};

export type FirestoreImportDryRun = {
  gameId: string;
  documentCount: number;
  mappedEventCount: number;
  sessionCount: number;
  sessions: ImportSession[];
};

/**
 * Sort events deterministically.
 *
 * Primary:
 *   eventTimestamp
 *
 * Tie-breaker:
 *   eventId
 *
 * This means importing the same source data repeatedly
 * will always produce the same ordering.
 */
function sortSessionEvents(
  events: AmyCanonicalEvent[]
): AmyCanonicalEvent[] {
  return [...events].sort((a, b) => {
    const timestampComparison =
      a.eventTimestamp.localeCompare(
        b.eventTimestamp
      );

    if (timestampComparison !== 0) {
      return timestampComparison;
    }

    return a.eventId.localeCompare(
      b.eventId
    );
  });
}

/**
 * Group canonical events by player + session.
 *
 * We include playerHash in the grouping key because
 * external systems could theoretically reuse the same
 * sessionId for different players.
 */
function groupEventsBySession(
  events: AmyCanonicalEvent[]
): Map<string, AmyCanonicalEvent[]> {
  const sessions =
    new Map<string, AmyCanonicalEvent[]>();

  for (const event of events) {
    const key =
      `${event.playerHash}:${event.sessionId}`;

    const existing =
      sessions.get(key) ?? [];

    existing.push(event);

    sessions.set(key, existing);
  }

  return sessions;
}

/**
 * Convert raw external Firestore documents into
 * AMY canonical events and reconstruct sessions.
 *
 * DRY RUN ONLY:
 * This function performs no database writes.
 */
export function prepareFirestoreImport(
  documents: RawFirestoreDocument[],
  gameId: string
): FirestoreImportDryRun {
  const mappedEvents =
    documents.map((document) =>
      mapFirestoreEvent(
        document,
        gameId
      )
    );

  const grouped =
    groupEventsBySession(mappedEvents);

  const sessions: ImportSession[] = [];

  for (const sessionEvents of grouped.values()) {
    const sorted =
      sortSessionEvents(sessionEvents);

    const sequenced:
      SequencedAmyEvent[] =
      sorted.map(
        (event, index) => ({
          ...event,
          eventSequence: index + 1,
        })
      );

    const first =
      sequenced[0];

    const last =
      sequenced[
        sequenced.length - 1
      ];

    if (!first || !last) {
      continue;
    }

    sessions.push({
      sessionId:
        first.sessionId,

      playerHash:
        first.playerHash,

      eventCount:
        sequenced.length,

      firstEventTimestamp:
        first.eventTimestamp,

      lastEventTimestamp:
        last.eventTimestamp,

      events:
        sequenced,
    });
  }

  /**
   * Make the session ordering deterministic too.
   */
  sessions.sort((a, b) => {
    const timestampComparison =
      a.firstEventTimestamp.localeCompare(
        b.firstEventTimestamp
      );

    if (timestampComparison !== 0) {
      return timestampComparison;
    }

    return a.sessionId.localeCompare(
      b.sessionId
    );
  });

  return {
    gameId,

    documentCount:
      documents.length,

    mappedEventCount:
      mappedEvents.length,

    sessionCount:
      sessions.length,

    sessions,
  };
}