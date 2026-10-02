import crypto from "crypto";

import {
  FirestoreIntegration,
} from "./firestore-integration";

import {
  RawFirestoreDocument,
} from "./firestore-mapper";

import {
  CompleteFirestoreSession,
} from "./firestore-session-reader";

import {
  FirestoreSessionIdentity,
} from "./firestore-session-discovery";

import {
  validateFirestoreSessionDocuments,
} from "./firestore-session-validation";

import {
  FirestoreConsentResult,
} from "./firestore-consent";


export type CanonicalFirestoreSessionEvent = {
  eventId: string;

  gameId: string;

  playerHash: string;

  sessionId: string;

  eventSequence: number;

  event: string;

  eventTimestamp: string;

  data: Record<string, unknown>;

  schemaVersion: "1.0";

  source: "firestore";
};


export type ProcessedFirestoreSession = {
  sessionId: string;

  playerHash: string;

  eventCount: number;

  firstEventTimestamp: string;

  lastEventTimestamp: string;

  completeness:
    | "complete"
    | "missing_start"
    | "missing_end"
    | "missing_start_and_end";

  events:
    CanonicalFirestoreSessionEvent[];
};


/*
 * =========================================================
 * FIRESTORE VALUE CONVERSION
 * =========================================================
 */

type FirestoreValue = {
  stringValue?: string;

  integerValue?: string;

  doubleValue?: number;

  booleanValue?: boolean;

  timestampValue?: string;

  nullValue?: null;

  mapValue?: {
    fields?: Record<
      string,
      FirestoreValue
    >;
  };

  arrayValue?: {
    values?: FirestoreValue[];
  };
};


function firestoreValueToJs(
  value: FirestoreValue
): unknown {
  if (
    "stringValue" in value
  ) {
    return value.stringValue;
  }

  if (
    "integerValue" in value
  ) {
    const parsed =
      Number(
        value.integerValue
      );

    return Number.isNaN(
      parsed
    )
      ? value.integerValue
      : parsed;
  }

  if (
    "doubleValue" in value
  ) {
    return value.doubleValue;
  }

  if (
    "booleanValue" in value
  ) {
    return value.booleanValue;
  }

  if (
    "timestampValue" in value
  ) {
    return value.timestampValue;
  }

  if (
    "nullValue" in value
  ) {
    return null;
  }

  if (
    "mapValue" in value
  ) {
    const fields =
      value.mapValue
        ?.fields ?? {};

    return Object.fromEntries(
      Object.entries(
        fields
      ).map(
        ([
          key,
          childValue,
        ]) => [
          key,
          firestoreValueToJs(
            childValue
          ),
        ]
      )
    );
  }

  if (
    "arrayValue" in value
  ) {
    return (
      value.arrayValue
        ?.values ?? []
    ).map(
      firestoreValueToJs
    );
  }

  return null;
}


function convertFields(
  fields: Record<
    string,
    FirestoreValue
  >
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(
      fields
    ).map(
      ([
        key,
        value,
      ]) => [
        key,
        firestoreValueToJs(
          value
        ),
      ]
    )
  );
}


/*
 * =========================================================
 * IDENTIFIERS
 * =========================================================
 */

function hashPlayer(
  gameId: string,
  uid: string
): string {
  return crypto
    .createHash("sha256")
    .update(
      `${gameId}:${uid}`
    )
    .digest("hex");
}


function getDocumentId(
  documentName?: string
): string | null {
  if (!documentName) {
    return null;
  }

  const parts =
    documentName.split("/");

  return (
    parts[
      parts.length - 1
    ] ?? null
  );
}


/*
 * =========================================================
 * CANONICALIZE ONE EVENT
 * =========================================================
 */

function canonicalizeEvent(
  document:
    RawFirestoreDocument,

  integration:
    FirestoreIntegration,

  playerHash:
    string,

  sessionId:
    string,

  eventSequence:
    number
): CanonicalFirestoreSessionEvent {
  const eventId =
    getDocumentId(
      document.name
    );

  if (!eventId) {
    throw new Error(
      "Firestore event is missing a document ID."
    );
  }

  const fields =
    convertFields(
      document.fields ?? {}
    );

  const event =
    typeof fields.event ===
      "string"
      ? fields.event
      : null;

  const eventTimestamp =
    typeof fields[
      integration.timestampField
    ] === "string"
      ? (
          fields[
            integration.timestampField
          ] as string
        )
      : null;

  if (!event) {
    throw new Error(
      `Firestore event ${eventId} is missing event.`
    );
  }

  if (!eventTimestamp) {
    throw new Error(
      `Firestore event ${eventId} is missing ${integration.timestampField}.`
    );
  }

  /*
   * =====================================================
   * PRIVACY BOUNDARY
   * =====================================================
   *
   * These source identity / structural fields must never
   * be copied into canonical event data.
   */

  const {
    uid: _uid,
    event: _event,
    sessionId: _sessionId,
    createdAt: _createdAt,
    expireAt: _expireAt,
    ...eventData
  } = fields;

  return {
    eventId,

    gameId:
      integration.gameId,

    playerHash,

    sessionId,

    eventSequence,

    event,

    eventTimestamp,

    data:
      eventData,

    schemaVersion:
      "1.0",

    source:
      "firestore",
  };
}


/*
 * =========================================================
 * PROCESS COMPLETE SESSION
 * =========================================================
 */

export function processFirestoreSession(
  integration:
    FirestoreIntegration,

  identity:
    FirestoreSessionIdentity,

  session:
    CompleteFirestoreSession,

  consent:
    FirestoreConsentResult
): ProcessedFirestoreSession {
  /*
   * Identity must be revalidated at the privacy boundary.
   */

  const validation =
    validateFirestoreSessionDocuments(
      identity,
      session.documents
    );

  if (!validation.valid) {
    throw new Error(
      `Session ${session.sessionId} failed identity validation.`
    );
  }

  /*
   * Fail closed on consent.
   */

  if (!consent.eligible) {
    throw new Error(
      `Session ${session.sessionId} is not eligible for research import: ${consent.reason}.`
    );
  }

  if (
    session.uid !==
    identity.uid
  ) {
    throw new Error(
      `Session ${session.sessionId} UID does not match discovered identity.`
    );
  }

  if (
    session.sessionId !==
    identity.sessionId
  ) {
    throw new Error(
      `Session ${session.sessionId} does not match discovered session identity.`
    );
  }

  /*
   * The session reader already returns deterministic
   * chronological ordering.
   */

  const playerHash =
    hashPlayer(
      integration.gameId,
      identity.uid
    );

  const events =
    session.documents.map(
      (
        document,
        index
      ) =>
        canonicalizeEvent(
          document,
          integration,
          playerHash,
          session.sessionId,
          index + 1
        )
    );

  if (
    events.length === 0
  ) {
    throw new Error(
      `Session ${session.sessionId} contains no canonical events.`
    );
  }

  const firstEvent =
    events[0];

  const lastEvent =
    events[
      events.length - 1
    ];

  if (
    !firstEvent ||
    !lastEvent
  ) {
    throw new Error(
      `Session ${session.sessionId} could not determine event boundaries.`
    );
  }

  /*
   * Session completeness is descriptive.
   *
   * We do NOT manufacture missing start/end events.
   */

  const containsStart =
    events.some(
      (event) =>
        event.event ===
        "game_session_started"
    );

  const containsEnd =
    events.some(
      (event) =>
        event.event ===
        "game_session_ended"
    );

  let completeness:
    ProcessedFirestoreSession["completeness"];

  if (
    containsStart &&
    containsEnd
  ) {
    completeness =
      "complete";
  } else if (
    !containsStart &&
    containsEnd
  ) {
    completeness =
      "missing_start";
  } else if (
    containsStart &&
    !containsEnd
  ) {
    completeness =
      "missing_end";
  } else {
    completeness =
      "missing_start_and_end";
  }

  return {
    sessionId:
      session.sessionId,

    playerHash,

    eventCount:
      events.length,

    firstEventTimestamp:
      firstEvent.eventTimestamp,

    lastEventTimestamp:
      lastEvent.eventTimestamp,

    completeness,

    events,
  };
}