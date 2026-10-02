import {
  RawFirestoreDocument,
} from "./firestore-mapper";

export type FirestoreSessionIdentity = {
  uid: string;
  sessionId: string;

  /*
   * Path to the session document beneath
   * /documents/.
   *
   * Example:
   *
   * users/ABC123/gameTelemetry/123456789/events
   */

  eventsCollectionPath: string;
};

export type FirestoreSessionDiscoveryResult = {
  sourceDocumentCount: number;

  modernDocumentCount: number;

  legacyDocumentCount: number;

  invalidDocumentCount: number;

  uniqueSessionCount: number;

  sessions:
    FirestoreSessionIdentity[];
};

function getDocumentPath(
  documentName?: string
): string | null {
  if (!documentName) {
    return null;
  }

  const marker =
    "/documents/";

  const index =
    documentName.indexOf(
      marker
    );

  if (index === -1) {
    return null;
  }

  return documentName.substring(
    index + marker.length
  );
}

/*
 * =========================================================
 * PARSE MODERN TELEMETRY PATH
 * =========================================================
 *
 * Expected:
 *
 * users/{uid}/gameTelemetry/{sessionId}/events/{eventId}
 *
 * Legacy telemetry:
 *
 * gameTelemetry/{sessionId}/events/{eventId}
 *
 * is intentionally NOT treated as a modern session because
 * it contains no stable player identity.
 * =========================================================
 */

export function parseModernSessionIdentity(
  document:
    RawFirestoreDocument
): FirestoreSessionIdentity | null {
  const path =
    getDocumentPath(
      document.name
    );

  if (!path) {
    return null;
  }

  const parts =
    path.split("/");

  /*
   * Exact modern shape:
   *
   * 0 users
   * 1 uid
   * 2 gameTelemetry
   * 3 sessionId
   * 4 events
   * 5 eventId
   */

  if (
    parts.length !== 6 ||
    parts[0] !== "users" ||
    parts[2] !==
      "gameTelemetry" ||
    parts[4] !== "events"
  ) {
    return null;
  }

  const uid =
    parts[1];

  const sessionId =
    parts[3];

  const eventId =
    parts[5];

  if (
    !uid ||
    !sessionId ||
    !eventId
  ) {
    return null;
  }

  return {
    uid,

    sessionId,

    eventsCollectionPath:
      `users/${uid}` +
      `/gameTelemetry/${sessionId}` +
      `/events`,
  };
}

function isLegacyTelemetryDocument(
  document:
    RawFirestoreDocument
): boolean {
  const path =
    getDocumentPath(
      document.name
    );

  if (!path) {
    return false;
  }

  const parts =
    path.split("/");

  /*
   * Legacy shape:
   *
   * gameTelemetry/{sessionId}/events/{eventId}
   */

  return (
    parts.length === 4 &&
    parts[0] ===
      "gameTelemetry" &&
    parts[2] ===
      "events"
  );
}

/*
 * =========================================================
 * DISCOVER UNIQUE MODERN SESSIONS
 * =========================================================
 *
 * A 100-event synchronization page may contain:
 *
 * - many events from one session
 * - parts of several sessions
 * - legacy events
 * - modern events
 *
 * We only need each modern session once.
 * =========================================================
 */

export function discoverFirestoreSessions(
  documents:
    RawFirestoreDocument[]
): FirestoreSessionDiscoveryResult {
  const sessions =
    new Map<
      string,
      FirestoreSessionIdentity
    >();

  let modernDocumentCount =
    0;

  let legacyDocumentCount =
    0;

  let invalidDocumentCount =
    0;

  for (
    const document of documents
  ) {
    const identity =
      parseModernSessionIdentity(
        document
      );

    if (identity) {
      modernDocumentCount +=
        1;

      const key =
        `${identity.uid}:` +
        `${identity.sessionId}`;

      if (
        !sessions.has(key)
      ) {
        sessions.set(
          key,
          identity
        );
      }

      continue;
    }

    if (
      isLegacyTelemetryDocument(
        document
      )
    ) {
      legacyDocumentCount +=
        1;

      continue;
    }

    invalidDocumentCount +=
      1;
  }

  return {
    sourceDocumentCount:
      documents.length,

    modernDocumentCount,

    legacyDocumentCount,

    invalidDocumentCount,

    uniqueSessionCount:
      sessions.size,

    sessions:
      Array.from(
        sessions.values()
      ),
  };
}