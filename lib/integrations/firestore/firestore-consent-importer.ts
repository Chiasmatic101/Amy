import crypto from "crypto";

import {
  evaluateFirestoreConsent,
} from "./firestore-consent";

import {
  FirestoreValue,
  RawFirestoreDocument,
} from "./firestore-mapper";

export type ConsentAwareImportEvent = {
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

export type ConsentAwareImportSession = {
  sessionId: string;
  playerHash: string;
  eventCount: number;
  firstEventTimestamp: string;
  lastEventTimestamp: string;
  events: ConsentAwareImportEvent[];
};

export type ConsentAwareImportResult = {
  gameId: string;

  sourceDocumentCount: number;

  eligibleDocumentCount: number;

  skippedIdentity: number;

  skippedIdentityMismatch: number;

  skippedConsent: number;

  invalidDocuments: number;

  playersChecked: number;

  eligiblePlayers: number;

  sessionCount: number;

  sessions: ConsentAwareImportSession[];
};

type SourceIdentity = {
  uid: string;
  sessionId: string;
};

type ValidatedSourceEvent = {
  document: RawFirestoreDocument;
  uid: string;
  sessionId: string;
};

type ConsentLookup = (
  uid: string
) => Promise<RawFirestoreDocument | null>;

/*
 * ---------------------------------------------------------
 * Firestore value conversion
 * ---------------------------------------------------------
 */

function firestoreValueToJs(
  value: FirestoreValue
): unknown {
  if ("stringValue" in value) {
    return value.stringValue;
  }

  if ("integerValue" in value) {
    const parsed =
      Number(value.integerValue);

    return Number.isNaN(parsed)
      ? value.integerValue
      : parsed;
  }

  if ("doubleValue" in value) {
    return value.doubleValue;
  }

  if ("booleanValue" in value) {
    return value.booleanValue;
  }

  if ("timestampValue" in value) {
    return value.timestampValue;
  }

  if ("nullValue" in value) {
    return null;
  }

  if ("mapValue" in value) {
    const fields =
      value.mapValue?.fields ?? {};

    return Object.fromEntries(
      Object.entries(fields).map(
        ([key, childValue]) => [
          key,
          firestoreValueToJs(
            childValue
          ),
        ]
      )
    );
  }

  if ("arrayValue" in value) {
    return (
      value.arrayValue?.values ?? []
    ).map(
      firestoreValueToJs
    );
  }

  return null;
}

function convertFields(
  fields:
    Record<string, FirestoreValue>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(
      ([key, value]) => [
        key,
        firestoreValueToJs(value),
      ]
    )
  );
}

/*
 * ---------------------------------------------------------
 * Source path helpers
 * ---------------------------------------------------------
 */

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

function getSourceIdentity(
  document: RawFirestoreDocument
): SourceIdentity | null {
  if (!document.name) {
    return null;
  }

  const pathParts =
    document.name.split("/");

  /*
   * Expected modern structure:
   *
   * users/{uid}/
   *   gameTelemetry/{sessionId}/
   *     events/{eventId}
   */

  const usersIndex =
    pathParts.lastIndexOf(
      "users"
    );

  const gameTelemetryIndex =
    pathParts.lastIndexOf(
      "gameTelemetry"
    );

  if (
    usersIndex < 0 ||
    usersIndex + 1 >=
      pathParts.length
  ) {
    return null;
  }

  if (
    gameTelemetryIndex < 0 ||
    gameTelemetryIndex + 1 >=
      pathParts.length
  ) {
    return null;
  }

  const pathUid =
    pathParts[
      usersIndex + 1
    ];

  const pathSessionId =
    pathParts[
      gameTelemetryIndex + 1
    ];

  if (
    !pathUid ||
    !pathSessionId
  ) {
    return null;
  }

  return {
    uid: pathUid,
    sessionId:
      pathSessionId,
  };
}

/*
 * ---------------------------------------------------------
 * Pseudonymization
 * ---------------------------------------------------------
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

/*
 * ---------------------------------------------------------
 * Canonical mapping
 * ---------------------------------------------------------
 */

function mapValidatedEvent(
  source:
    ValidatedSourceEvent,
  gameId: string
): Omit<
  ConsentAwareImportEvent,
  "eventSequence"
> | null {
  const document =
    source.document;

  const documentId =
    getDocumentId(
      document.name
    );

  if (!documentId) {
    return null;
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

  const fieldSessionId =
    typeof fields.sessionId ===
    "string"
      ? fields.sessionId
      : null;

  const eventTimestamp =
    typeof fields.createdAt ===
    "string"
      ? fields.createdAt
      : document.createTime ??
        null;

  if (
    !event ||
    !fieldSessionId ||
    !eventTimestamp
  ) {
    return null;
  }

  /*
   * Session ID in the event must agree
   * with the Firestore path.
   */

  if (
    fieldSessionId !==
    source.sessionId
  ) {
    return null;
  }

  /*
   * Remove identity and canonical
   * metadata from event-specific data.
   *
   * In particular, raw UID must never
   * enter the canonical data object.
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
    eventId:
      documentId,

    gameId,

    playerHash:
      hashPlayer(
        gameId,
        source.uid
      ),

    sessionId:
      source.sessionId,

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
 * ---------------------------------------------------------
 * Main consent-aware preparation function
 * ---------------------------------------------------------
 *
 * IMPORTANT:
 *
 * This function DOES NOT write anything
 * into AMY.
 *
 * It:
 *
 * 1. validates identity
 * 2. validates UID integrity
 * 3. checks consent once per player
 * 4. removes ineligible events
 * 5. pseudonymizes eligible players
 * 6. maps canonical events
 * 7. reconstructs sessions
 * 8. assigns eventSequence
 *
 * A later writer will persist the result.
 * ---------------------------------------------------------
 */

export async function
prepareConsentAwareFirestoreImport(
  documents:
    RawFirestoreDocument[],

  gameId:
    string,

  getUserDocument:
    ConsentLookup
): Promise<ConsentAwareImportResult> {
  let skippedIdentity = 0;

  let skippedIdentityMismatch =
    0;

  let skippedConsent = 0;

  let invalidDocuments = 0;

  /*
   * -------------------------------------------------------
   * 1. Validate source identity
   * -------------------------------------------------------
   */

  const validated:
    ValidatedSourceEvent[] =
    [];

  for (
    const document of
    documents
  ) {
    const identity =
      getSourceIdentity(
        document
      );

    /*
     * Legacy telemetry such as:
     *
     * gameTelemetry/{sessionId}/events/...
     *
     * has no stable player UID.
     */

    if (!identity) {
      skippedIdentity += 1;
      continue;
    }

    const eventUid =
      document
        .fields
        ?.uid
        ?.stringValue ??
      null;

    if (!eventUid) {
      skippedIdentity += 1;
      continue;
    }

    /*
     * UID stored in event must agree
     * with UID encoded in the path.
     */

    if (
      eventUid !==
      identity.uid
    ) {
      skippedIdentityMismatch +=
        1;

      continue;
    }

    validated.push({
      document,

      uid:
        identity.uid,

      sessionId:
        identity.sessionId,
    });
  }

  /*
   * -------------------------------------------------------
   * 2. Determine unique players
   * -------------------------------------------------------
   */

  const uniqueUids =
    [
      ...new Set(
        validated.map(
          (item) =>
            item.uid
        )
      ),
    ];

  /*
   * IMPORTANT:
   *
   * UID exists only inside this temporary
   * source-processing stage.
   *
   * It is never returned by this function.
   */

  const consentByUid =
    new Map<
      string,
      boolean
    >();

  let eligiblePlayers = 0;

  /*
   * -------------------------------------------------------
   * 3. Check consent ONCE per player
   * -------------------------------------------------------
   */

  for (
    const uid of
    uniqueUids
  ) {
    try {
      const userDocument =
        await getUserDocument(
          uid
        );

      if (!userDocument) {
        consentByUid.set(
          uid,
          false
        );

        continue;
      }

      const consent =
        evaluateFirestoreConsent(
          userDocument
        );

      consentByUid.set(
        uid,
        consent.eligible
      );

      if (
        consent.eligible
      ) {
        eligiblePlayers +=
          1;
      }
    } catch {
      /*
       * Fail closed.
       *
       * If AMY cannot prove consent,
       * that player's data is not
       * eligible for import.
       */

      consentByUid.set(
        uid,
        false
      );
    }
  }

  /*
   * -------------------------------------------------------
   * 4. Filter by consent and map
   * -------------------------------------------------------
   */

  const mappedEvents:
    Omit<
      ConsentAwareImportEvent,
      "eventSequence"
    >[] =
    [];

  for (
    const sourceEvent of
    validated
  ) {
    const eligible =
      consentByUid.get(
        sourceEvent.uid
      ) === true;

    if (!eligible) {
      skippedConsent +=
        1;

      continue;
    }

    const mapped =
      mapValidatedEvent(
        sourceEvent,
        gameId
      );

    if (!mapped) {
      invalidDocuments +=
        1;

      continue;
    }

    mappedEvents.push(
      mapped
    );
  }

  /*
   * -------------------------------------------------------
   * 5. Group by pseudonymous player + session
   * -------------------------------------------------------
   */

  const sessionGroups =
    new Map<
      string,
      typeof mappedEvents
    >();

  for (
    const event of
    mappedEvents
  ) {
    const key =
      `${event.playerHash}:` +
      `${event.sessionId}`;

    const existing =
      sessionGroups.get(
        key
      ) ?? [];

    existing.push(
      event
    );

    sessionGroups.set(
      key,
      existing
    );
  }

  /*
   * -------------------------------------------------------
   * 6. Sort each session and assign sequence
   * -------------------------------------------------------
   */

  const sessions:
    ConsentAwareImportSession[] =
    [];

  for (
    const events of
    sessionGroups.values()
  ) {
    const sorted =
      [...events].sort(
        (a, b) => {
          const timeComparison =
            a.eventTimestamp.localeCompare(
              b.eventTimestamp
            );

          if (
            timeComparison !==
            0
          ) {
            return timeComparison;
          }

          /*
           * Deterministic tie breaker.
           */

          return (
            a.eventId.localeCompare(
              b.eventId
            )
          );
        }
      );

    const sequenced:
      ConsentAwareImportEvent[] =
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

    if (
      !first ||
      !last
    ) {
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

  /*
   * Deterministic ordering of sessions.
   */

  sessions.sort(
    (a, b) => {
      const timeComparison =
        a.firstEventTimestamp.localeCompare(
          b.firstEventTimestamp
        );

      if (
        timeComparison !== 0
      ) {
        return timeComparison;
      }

      return (
        a.sessionId.localeCompare(
          b.sessionId
        )
      );
    }
  );

  /*
   * -------------------------------------------------------
   * 7. Return SAFE import preparation result
   * -------------------------------------------------------
   *
   * Notice:
   *
   * No raw UID is returned.
   * No email is returned.
   * No profile information is returned.
   * -------------------------------------------------------
   */

  return {
    gameId,

    sourceDocumentCount:
      documents.length,

    eligibleDocumentCount:
      mappedEvents.length,

    skippedIdentity,

    skippedIdentityMismatch,

    skippedConsent,

    invalidDocuments,

    playersChecked:
      uniqueUids.length,

    eligiblePlayers,

    sessionCount:
      sessions.length,

    sessions,
  };
}