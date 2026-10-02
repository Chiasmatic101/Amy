import {
  FirestoreIntegration,
} from "./firestore-integration";

import {
  buildFirestoreSyncQuery,
} from "./firestore-sync";

import {
  RawFirestoreDocument,
} from "./firestore-mapper";

export type FirestoreSyncCursor = {
  timestamp: string;
  documentPath: string;
};

export type FirestoreSyncPage = {
  documents: RawFirestoreDocument[];

  count: number;

  hasMore: boolean;

  nextCursor:
    FirestoreSyncCursor | null;
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
    documentName.indexOf(marker);

  if (index === -1) {
    return null;
  }

  return documentName.substring(
    index + marker.length
  );
}

function getTimestamp(
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

export async function readFirestoreSyncPage(
  integration: FirestoreIntegration,
  accessToken: string,
  pageSize = 100
): Promise<FirestoreSyncPage> {
  /*
   * Build the query using whatever watermark
   * currently exists on the supplied integration.
   */

  const query =
    buildFirestoreSyncQuery(
      integration,
      pageSize
    );

  const queryUrl =
    `https://firestore.googleapis.com/v1/projects/` +
    `${encodeURIComponent(
      integration.projectId
    )}` +
    `/databases/(default)/documents:runQuery`;

  const response =
    await fetch(
      queryUrl,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",

          Accept:
            "application/json",
        },

        body:
          JSON.stringify(query),

        cache:
          "no-store",
      }
    );

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      `Firestore synchronization query failed with status ${response.status}: ${JSON.stringify(
        result
      )}`
    );
  }

  const queryResults =
    Array.isArray(result)
      ? result
      : [];

  const documents =
    queryResults
      .map(
        (item) =>
          item.document
      )
      .filter(Boolean) as
      RawFirestoreDocument[];

  /*
   * Empty page = nothing more to synchronize.
   */

  if (
    documents.length === 0
  ) {
    return {
      documents: [],

      count: 0,

      hasMore: false,

      nextCursor: null,
    };
  }

  /*
   * The last document becomes the cursor
   * for the next page.
   */

  const lastDocument =
    documents[
      documents.length - 1
    ];

  const timestamp =
    getTimestamp(
      lastDocument,
      integration.timestampField
    );

  const documentPath =
    getDocumentPath(
      lastDocument.name
    );

  if (
    !timestamp ||
    !documentPath
  ) {
    throw new Error(
      "Unable to construct synchronization cursor from the final Firestore document."
    );
  }

  return {
    documents,

    count:
      documents.length,

    /*
     * Exactly pageSize means there MAY be
     * another page.
     *
     * The next request will determine whether
     * one actually exists.
     */

    hasMore:
      documents.length ===
      pageSize,

    nextCursor: {
      timestamp,
      documentPath,
    },
  };
}

/*
 * =========================================================
 * ADVANCE AN IN-MEMORY INTEGRATION CURSOR
 * =========================================================
 *
 * This does NOT update Firestore.
 *
 * It produces the configuration for requesting
 * the next page during the same synchronization run.
 * =========================================================
 */

export function withSyncCursor(
  integration: FirestoreIntegration,
  cursor: FirestoreSyncCursor
): FirestoreIntegration {
  return {
    ...integration,

    watermarkTimestamp:
      cursor.timestamp,

    watermarkEventId:
      cursor.documentPath,
  };
}