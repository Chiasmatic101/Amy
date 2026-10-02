import {
  FirestoreIntegration,
} from "./firestore-integration";

import {
  RawFirestoreDocument,
} from "./firestore-mapper";

import {
  FirestoreSessionIdentity,
} from "./firestore-session-discovery";

export type CompleteFirestoreSession = {
  sessionId: string;

  /*
   * uid is required temporarily so the next
   * consent/identity validation layer can verify
   * the source player.
   *
   * It must NOT be written to AMY gameEvents.
   */

  uid: string;

  eventCount: number;

  documents:
    RawFirestoreDocument[];
};

/*
 * =========================================================
 * FIRESTORE REST LIST RESPONSE
 * =========================================================
 */

type FirestoreListDocumentsResponse = {
  documents?:
    RawFirestoreDocument[];

  nextPageToken?:
    string;
};

function getEventTimestamp(
  document: RawFirestoreDocument,
  timestampField: string
): string | null {
  const value =
    document.fields?.[
      timestampField
    ];

  if (
    value &&
    typeof value.timestampValue ===
      "string"
  ) {
    return value.timestampValue;
  }

  return null;
}

function getDocumentId(
  documentName?: string
): string {
  if (!documentName) {
    return "";
  }

  const parts =
    documentName.split("/");

  return (
    parts[
      parts.length - 1
    ] ?? ""
  );
}


/*
 * =========================================================
 * READ ONE COMPLETE SESSION
 * =========================================================
 *
 * Input:
 *
 * users/{uid}/gameTelemetry/{sessionId}/events
 *
 * We explicitly read that complete event collection rather
 * than trusting the events that happened to appear in the
 * synchronization discovery page.
 *
 * This solves the partial-session problem.
 * =========================================================
 */

export async function readCompleteFirestoreSession(
  integration:
    FirestoreIntegration,

  session:
    FirestoreSessionIdentity,

  accessToken:
    string
): Promise<CompleteFirestoreSession> {
  const documents:
    RawFirestoreDocument[] = [];

  let pageToken:
    string | null = null;

  /*
   * Firestore listDocuments supports pagination.
   *
   * A normal gameplay session will probably fit in one
   * request, but we deliberately support larger sessions.
   */

  do {
    const baseUrl =
      `https://firestore.googleapis.com/v1/projects/` +
      `${encodeURIComponent(
        integration.projectId
      )}` +
      `/databases/(default)/documents/` +
      `${session.eventsCollectionPath}`;

    const params =
      new URLSearchParams();

    /*
     * Firestore allows up to 1000 documents per
     * listDocuments request.
     */

    params.set(
      "pageSize",
      "1000"
    );

    /*
     * We do not rely on Firestore's list ordering for
     * eventSequence. We'll sort deterministically after
     * retrieving the complete session.
     */

    if (pageToken) {
      params.set(
        "pageToken",
        pageToken
      );
    }

    const url =
      `${baseUrl}?${params.toString()}`;

    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            Accept:
              "application/json",
          },

          cache:
            "no-store",
        }
      );

    /*
     * If the events collection does not exist,
     * fail closed rather than pretending that we
     * retrieved a complete session.
     */

    if (
      response.status === 404
    ) {
      throw new Error(
        `Firestore session ${session.sessionId} was not found.`
      );
    }

    const result =
      (
        await response.json()
      ) as
        FirestoreListDocumentsResponse & {
          error?: unknown;
        };

    if (!response.ok) {
      throw new Error(
        `Firestore session read failed with status ${response.status}: ${JSON.stringify(
          result
        )}`
      );
    }

    if (
      Array.isArray(
        result.documents
      )
    ) {
      documents.push(
        ...result.documents
      );
    }

    pageToken =
      typeof result.nextPageToken ===
        "string" &&
      result.nextPageToken.length > 0
        ? result.nextPageToken
        : null;
  } while (pageToken);

if (
  documents.length === 0
) {
  throw new Error(
    `Firestore session ${session.sessionId} contains no events.`
  );
}

 
/*
 * =====================================================
 * DETERMINISTIC CHRONOLOGICAL ORDER
 * =====================================================
 *
 * Firestore listDocuments does not guarantee the
 * chronological ordering required by AMY.
 *
 * Sort using:
 *
 *   event timestamp ASC
 *   document ID ASC
 *
 * The document ID acts as the deterministic tie-breaker
 * when two events have identical timestamps.
 */

const sortedDocuments =
  [...documents].sort(
    (a, b) => {
      const aTimestamp =
        getEventTimestamp(
          a,
          integration.timestampField
        );

      const bTimestamp =
        getEventTimestamp(
          b,
          integration.timestampField
        );

      /*
       * Documents without a usable timestamp sort last.
       * The validation/import layer can subsequently
       * reject them rather than silently assigning them
       * an incorrect position.
       */

      if (
        aTimestamp &&
        bTimestamp
      ) {
        const comparison =
          aTimestamp.localeCompare(
            bTimestamp
          );

        if (
          comparison !== 0
        ) {
          return comparison;
        }
      } else if (aTimestamp) {
        return -1;
      } else if (bTimestamp) {
        return 1;
      }

      return getDocumentId(
        a.name
      ).localeCompare(
        getDocumentId(
          b.name
        )
      );
    }
  );

return {
  uid:
    session.uid,

  sessionId:
    session.sessionId,

  eventCount:
    sortedDocuments.length,

  documents:
    sortedDocuments,
};
}

/*
 * =========================================================
 * READ MULTIPLE COMPLETE SESSIONS
 * =========================================================
 *
 * Keep this sequential initially.
 *
 * Later we can introduce controlled concurrency, but a
 * simple sequential implementation is easier to reason
 * about while validating the connector.
 * =========================================================
 */

export async function readCompleteFirestoreSessions(
  integration:
    FirestoreIntegration,

  sessions:
    FirestoreSessionIdentity[],

  accessToken:
    string
): Promise<CompleteFirestoreSession[]> {
  const results:
    CompleteFirestoreSession[] = [];

  for (
    const session of sessions
  ) {
    const completeSession =
      await readCompleteFirestoreSession(
        integration,
        session,
        accessToken
      );

    results.push(
      completeSession
    );
  }

  return results;
}