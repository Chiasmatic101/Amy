import {
  RawFirestoreDocument,
} from "./firestore-mapper";

import {
  FirestoreSessionIdentity,
} from "./firestore-session-discovery";

export type SessionValidationResult = {
  valid: boolean;

  documentCount: number;

  validDocumentCount: number;

  invalidDocumentCount: number;

  errors: Array<{
    documentId: string | null;
    reason: string;
  }>;
};

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

export function validateFirestoreSessionDocuments(
  expectedSession:
    FirestoreSessionIdentity,

  documents:
    RawFirestoreDocument[]
): SessionValidationResult {
  const errors:
    SessionValidationResult["errors"] =
    [];

  let validDocumentCount =
    0;

  for (
    const document of documents
  ) {
    const documentId =
      getDocumentId(
        document.name
      );

    const path =
      getDocumentPath(
        document.name
      );

    if (!path) {
      errors.push({
        documentId,
        reason:
          "Document has no usable Firestore path.",
      });

      continue;
    }

    const parts =
      path.split("/");

    /*
     * Expected:
     *
     * users/{uid}/gameTelemetry/{sessionId}/events/{eventId}
     */

    if (
      parts.length !== 6 ||
      parts[0] !== "users" ||
      parts[2] !==
        "gameTelemetry" ||
      parts[4] !== "events"
    ) {
      errors.push({
        documentId,
        reason:
          "Document does not use the expected modern telemetry path.",
      });

      continue;
    }

    const pathUid =
      parts[1];

    const pathSessionId =
      parts[3];

    if (
      pathUid !==
      expectedSession.uid
    ) {
      errors.push({
        documentId,
        reason:
          "Document path UID does not match the discovered session UID.",
      });

      continue;
    }

    if (
      pathSessionId !==
      expectedSession.sessionId
    ) {
      errors.push({
        documentId,
        reason:
          "Document path sessionId does not match the discovered session.",
      });

      continue;
    }

    /*
     * Validate the duplicated UID stored inside
     * the event document.
     */

    const eventUid =
      document.fields
        ?.uid
        ?.stringValue;

    if (
      !eventUid
    ) {
      errors.push({
        documentId,
        reason:
          "Event document is missing uid.",
      });

      continue;
    }

    if (
      eventUid !==
      expectedSession.uid
    ) {
      errors.push({
        documentId,
        reason:
          "Event uid does not match the session UID.",
      });

      continue;
    }

    /*
     * Validate the duplicated sessionId stored
     * inside the event document.
     */

    const eventSessionId =
      document.fields
        ?.sessionId
        ?.stringValue;

    if (
      !eventSessionId
    ) {
      errors.push({
        documentId,
        reason:
          "Event document is missing sessionId.",
      });

      continue;
    }

    if (
      eventSessionId !==
      expectedSession.sessionId
    ) {
      errors.push({
        documentId,
        reason:
          "Event sessionId does not match the session path.",
      });

      continue;
    }

    validDocumentCount +=
      1;
  }

  return {
    valid:
      errors.length === 0,

    documentCount:
      documents.length,

    validDocumentCount,

    invalidDocumentCount:
      errors.length,

    errors,
  };
}