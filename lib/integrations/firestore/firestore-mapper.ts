import crypto from "crypto";

export type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
  mapValue?: {
    fields?: Record<string, FirestoreValue>;
  };
  arrayValue?: {
    values?: FirestoreValue[];
  };
};

export type RawFirestoreDocument = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
};

export type AmyCanonicalEvent = {
  eventId: string;
  gameId: string;
  playerHash: string;
  sessionId: string;
  eventSequence?: number;
  event: string;
  eventTimestamp: string;
  data: Record<string, unknown>;
  schemaVersion: "1.0";
  source: "firestore";
};

function firestoreValueToJs(
  value: FirestoreValue
): unknown {
  if ("stringValue" in value) {
    return value.stringValue;
  }

  if ("integerValue" in value) {
    const parsed = Number(value.integerValue);

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
          firestoreValueToJs(childValue),
        ]
      )
    );
  }

  if ("arrayValue" in value) {
    return (
      value.arrayValue?.values ?? []
    ).map(firestoreValueToJs);
  }

  return null;
}

function convertFields(
  fields: Record<string, FirestoreValue>
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

function hashPlayer(
  gameId: string,
  externalPlayerId: string
): string {
  return crypto
    .createHash("sha256")
    .update(
      `${gameId}:${externalPlayerId}`
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

  return parts[parts.length - 1] ?? null;
}

export function mapFirestoreEvent(
  document: RawFirestoreDocument,
  gameId: string
): AmyCanonicalEvent {
  const documentId =
    getDocumentId(document.name);

  if (!documentId) {
    throw new Error(
      "Firestore event is missing a document ID."
    );
  }

  const rawFields =
    document.fields ?? {};

  const fields =
    convertFields(rawFields);

  const event =
    typeof fields.event === "string"
      ? fields.event
      : null;

  const sessionId =
    typeof fields.sessionId === "string"
      ? fields.sessionId
      : null;

  const externalPlayerId =
    typeof fields.uid === "string"
      ? fields.uid
      : null;

  const eventTimestamp =
    typeof fields.createdAt === "string"
      ? fields.createdAt
      : document.createTime ?? null;

  if (!event) {
    throw new Error(
      `Firestore event ${documentId} is missing event.`
    );
  }

  if (!sessionId) {
    throw new Error(
      `Firestore event ${documentId} is missing sessionId.`
    );
  }

  if (!externalPlayerId) {
    throw new Error(
      `Firestore event ${documentId} is missing uid.`
    );
  }

  if (!eventTimestamp) {
    throw new Error(
      `Firestore event ${documentId} is missing createdAt.`
    );
  }

  /*
   * Everything below is metadata that AMY stores
   * separately in the canonical event.
   *
   * Removing it here also guarantees that the raw
   * external uid is NOT accidentally copied into
   * the canonical event's data object.
   */
  const {
    uid: _uid,
    event: _event,
    sessionId: _sessionId,
    createdAt: _createdAt,
    ...eventData
  } = fields;

  return {
    eventId: documentId,

    gameId,

    playerHash: hashPlayer(
      gameId,
      externalPlayerId
    ),

    sessionId,

    event,

    eventTimestamp,

    data: eventData,

    schemaVersion: "1.0",

    source: "firestore",
  };
}