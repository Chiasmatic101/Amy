import {
  FirestoreIntegration,
} from "./firestore-integration";

export type FirestoreStructuredQuery = {
  structuredQuery: {
    from: Array<{
      collectionId: string;
      allDescendants: boolean;
    }>;

    orderBy: Array<{
      field: {
        fieldPath: string;
      };
      direction: "ASCENDING";
    }>;

    startAfter?: {
      values: Array<
        | {
            timestampValue: string;
          }
        | {
            referenceValue: string;
          }
      >;
    };

    limit: number;
  };
};

/*
 * =========================================================
 * BUILD INCREMENTAL FIRESTORE QUERY
 * =========================================================
 *
 * Events are always read oldest → newest.
 *
 * First synchronization:
 *
 *   createdAt ASC
 *   document ID ASC
 *
 * Later synchronizations:
 *
 *   start AFTER:
 *
 *   watermarkTimestamp
 *   watermarkEventId
 *
 * This gives us a deterministic cursor even when multiple
 * events have exactly the same createdAt timestamp.
 * =========================================================
 */

export function buildFirestoreSyncQuery(
  integration: FirestoreIntegration,
  pageSize = 100
): FirestoreStructuredQuery {
  if (pageSize < 1) {
    throw new Error(
      "Firestore sync pageSize must be at least 1."
    );
  }

  /*
   * Keep below Firestore's practical query limits.
   */

  if (pageSize > 500) {
    throw new Error(
      "Firestore sync pageSize cannot exceed 500."
    );
  }

  const structuredQuery:
    FirestoreStructuredQuery["structuredQuery"] =
    {
      from: [
        {
          collectionId:
            integration.collectionId,

          allDescendants: true,
        },
      ],

      orderBy: [
        {
          field: {
            fieldPath:
              integration.timestampField,
          },

          direction:
            "ASCENDING",
        },

        /*
         * Firestore document ID.
         *
         * This becomes our deterministic tie-breaker
         * when multiple events share a timestamp.
         */

        {
          field: {
            fieldPath: "__name__",
          },

          direction:
            "ASCENDING",
        },
      ],

      limit: pageSize,
    };

  /*
   * No watermark = first synchronization.
   */

  if (
    !integration.watermarkTimestamp &&
    !integration.watermarkEventId
  ) {
    return {
      structuredQuery,
    };
  }

  /*
   * A partially populated watermark is unsafe.
   *
   * Fail rather than risk skipping events.
   */

  if (
    !integration.watermarkTimestamp ||
    !integration.watermarkEventId
  ) {
    throw new Error(
      "Firestore integration has an incomplete synchronization watermark."
    );
  }

  /*
   * __name__ cursors require the complete Firestore
   * document resource name, not merely the final
   * document ID.
   *
   * watermarkEventId therefore stores the complete
   * source document name.
   */

  const referenceValue =
    `projects/${integration.projectId}` +
    `/databases/(default)/documents/` +
    `${integration.watermarkEventId}`;

  structuredQuery.startAfter = {
    values: [
      {
        timestampValue:
          integration.watermarkTimestamp,
      },

      {
        referenceValue,
      },
    ],
  };

  return {
    structuredQuery,
  };
}