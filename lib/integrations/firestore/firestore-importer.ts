import crypto from "crypto";

import { adminDb } from "@/lib/firebase-admin";

import {
  AmyCanonicalEvent,
  RawFirestoreDocument,
  mapFirestoreEvent,
} from "./firestore-mapper";

import {
  ConsentAwareImportResult,
} from "./firestore-consent-importer";

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

/*
 * =========================================================
 * EXISTING DRY-RUN PREPARATION
 * =========================================================
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

function groupEventsBySession(
  events: AmyCanonicalEvent[]
): Map<string, AmyCanonicalEvent[]> {
  const sessions =
    new Map<
      string,
      AmyCanonicalEvent[]
    >();

  for (const event of events) {
    const key =
      `${event.playerHash}:` +
      `${event.sessionId}`;

    const existing =
      sessions.get(key) ?? [];

    existing.push(event);

    sessions.set(
      key,
      existing
    );
  }

  return sessions;
}

export function prepareFirestoreImport(
  documents:
    RawFirestoreDocument[],
  gameId:
    string
): FirestoreImportDryRun {
  const mappedEvents =
    documents.map(
      (document) =>
        mapFirestoreEvent(
          document,
          gameId
        )
    );

  const grouped =
    groupEventsBySession(
      mappedEvents
    );

  const sessions:
    ImportSession[] = [];

  for (
    const sessionEvents of
    grouped.values()
  ) {
    const sorted =
      sortSessionEvents(
        sessionEvents
      );

    const sequenced:
      SequencedAmyEvent[] =
      sorted.map(
        (event, index) => ({
          ...event,
          eventSequence:
            index + 1,
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

  sessions.sort(
    (a, b) => {
      const timestampComparison =
        a.firstEventTimestamp.localeCompare(
          b.firstEventTimestamp
        );

      if (
        timestampComparison !==
        0
      ) {
        return timestampComparison;
      }

      return (
        a.sessionId.localeCompare(
          b.sessionId
        )
      );
    }
  );

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

/*
 * =========================================================
 * CONSENT-AWARE AMY WRITER
 * =========================================================
 */

export type AmyImportWriteResult = {
  success: boolean;

  gameId: string;

  received: number;

  created: number;

  duplicates: number;

  sessionCount: number;

  writtenAt: string;
};

/*
 * Generate the same AMY document ID every
 * time the same external event is imported.
 *
 * This makes retries idempotent.
 */

function getAmyEventDocumentId(
  gameId: string,
  eventId: string
): string {
  return crypto
    .createHash("sha256")
    .update(
      `${gameId}:${eventId}`
    )
    .digest("hex");
}

/*
 * ---------------------------------------------------------
 * writeConsentAwareImportToAmy
 * ---------------------------------------------------------
 *
 * IMPORTANT:
 *
 * This function accepts ONLY the output of our
 * consent-aware preparation layer.
 *
 * Therefore, by the time an event reaches here:
 *
 * ✓ source identity has been validated
 * ✓ path UID and event UID matched
 * ✓ research consent was verified
 * ✓ age verification was verified
 * ✓ player identity has been pseudonymized
 * ✓ raw UID has been discarded
 * ✓ events have been grouped into sessions
 * ✓ eventSequence has been assigned
 *
 * This function never needs the original UID.
 * ---------------------------------------------------------
 */

export async function
writeConsentAwareImportToAmy(
  prepared:
    ConsentAwareImportResult
): Promise<AmyImportWriteResult> {
  const gameId =
    prepared.gameId;

  /*
   * Flatten reconstructed sessions back
   * into canonical sequenced events.
   */

  const events =
    prepared.sessions.flatMap(
      (session) =>
        session.events
    );

  /*
   * Nothing to write.
   */

  if (events.length === 0) {
    return {
      success: true,

      gameId,

      received: 0,

      created: 0,

      duplicates: 0,

      sessionCount:
        prepared.sessionCount,

      writtenAt:
        new Date().toISOString(),
    };
  }

  /*
   * Build deterministic Firestore references.
   */

  const eventRefs =
    events.map(
      (event) => {
        const documentId =
          getAmyEventDocumentId(
            gameId,
            event.eventId
          );

        return adminDb
          .collection(
            "gameEvents"
          )
          .doc(documentId);
      }
    );

  /*
   * -------------------------------------------------------
   * Check which events already exist.
   *
   * adminDb.getAll() lets us perform the existence
   * check in a single Firestore operation rather than
   * reading every event individually.
   * -------------------------------------------------------
   */

  const existingSnapshots =
    await adminDb.getAll(
      ...eventRefs
    );

  /*
   * -------------------------------------------------------
   * Write only missing events.
   * -------------------------------------------------------
   */

  const batch =
    adminDb.batch();

  let created = 0;
  let duplicates = 0;

  const receivedAt =
    new Date();

  for (
    let index = 0;
    index < events.length;
    index += 1
  ) {
    const event =
      events[index];

    const ref =
      eventRefs[index];

    const snapshot =
      existingSnapshots[index];

    if (
      !event ||
      !ref ||
      !snapshot
    ) {
      continue;
    }

    /*
     * Already imported.
     */

    if (snapshot.exists) {
      duplicates += 1;
      continue;
    }

    /*
     * -----------------------------------------------------
     * Canonical AMY event
     * -----------------------------------------------------
     *
     * Notice what is NOT stored:
     *
     * - Firebase UID
     * - email
     * - displayName
     * - source user document
     * - consent profile
     *
     * Only the pseudonymous playerHash survives.
     * -----------------------------------------------------
     */

    batch.set(
      ref,
      {
        eventId:
          event.eventId,

        gameId:
          event.gameId,

        playerHash:
          event.playerHash,

        sessionId:
          event.sessionId,

        eventSequence:
          event.eventSequence,

        event:
          event.event,

        eventTimestamp:
          event.eventTimestamp,

        data:
          event.data,

        schemaVersion:
          event.schemaVersion,

        environment:
          "test",

        source:
          event.source,

        receivedAt,
      }
    );

    created += 1;
  }

  /*
   * Firestore rejects an empty commit,
   * so only commit if something is new.
   */

  if (created > 0) {
    await batch.commit();
  }

  return {
    success: true,

    gameId,

    received:
      events.length,

    created,

    duplicates,

    sessionCount:
      prepared.sessionCount,

    writtenAt:
      receivedAt.toISOString(),
  };
}