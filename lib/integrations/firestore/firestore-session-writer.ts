import crypto from "crypto";

import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebase-admin";

import {
  FirestoreIntegration,
} from "./firestore-integration";

import {
  ProcessedFirestoreSession,
} from "./firestore-session-processor";


export type FirestoreSessionWriteResult = {
  success: true;

  gameId: string;

  sessionId: string;

  received: number;

  created: number;

  duplicates: number;

  writtenAt: string;
};


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


export async function writeProcessedFirestoreSession(
  integration:
    FirestoreIntegration,

  session:
    ProcessedFirestoreSession
): Promise<FirestoreSessionWriteResult> {
  const events =
    session.events;

  if (
    events.length === 0
  ) {
    throw new Error(
      `Session ${session.sessionId} contains no events to write.`
    );
  }

  /*
   * Firestore batches support a maximum of 500 writes.
   *
   * For this first implementation we fail explicitly
   * rather than silently splitting a single session.
   * We can add chunking later.
   */

  if (
    events.length > 500
  ) {
    throw new Error(
      `Session ${session.sessionId} contains more than 500 events.`
    );
  }

  /*
   * Construct deterministic AMY document references.
   *
   * This is what gives us idempotency:
   *
   * same game + same source event ID
   *        ↓
   * same AMY document ID
   */

  const eventRefs =
    events.map(
      (event) =>
        adminDb
          .collection(
            "gameEvents"
          )
          .doc(
            getAmyEventDocumentId(
              integration.gameId,
              event.eventId
            )
          )
    );

  /*
   * Read all potential destinations before writing.
   */

  const existingSnapshots =
    await adminDb.getAll(
      ...eventRefs
    );

  const batch =
    adminDb.batch();

  let created =
    0;

  let duplicates =
    0;

  for (
    let index = 0;
    index < events.length;
    index += 1
  ) {
    const event =
      events[index];

    const eventRef =
      eventRefs[index];

    const existing =
      existingSnapshots[index];

    if (
      !event ||
      !eventRef ||
      !existing
    ) {
      throw new Error(
        "Unexpected mismatch while preparing Firestore session write."
      );
    }

    if (
      existing.exists
    ) {
      duplicates +=
        1;

      continue;
    }

    batch.set(
      eventRef,
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
          integration.environment,

        source:
          event.source,

        /*
         * Session-level metadata is useful downstream
         * without exposing source identity.
         */

        sessionCompleteness:
          session.completeness,

        receivedAt:
          FieldValue.serverTimestamp(),
      }
    );

    created +=
      1;
  }

  /*
   * A batch with zero writes does not need committing.
   */

  if (
    created > 0
  ) {
    await batch.commit();
  }

  return {
    success:
      true,

    gameId:
      integration.gameId,

    sessionId:
      session.sessionId,

    received:
      events.length,

    created,

    duplicates,

    writtenAt:
      new Date().toISOString(),
  };
}