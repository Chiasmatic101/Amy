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

    /*
     * Firestore REST StructuredQuery uses startAt.
     *
     * before: false means:
     *
     * start strictly AFTER the supplied cursor.
     */

    startAt?: {
      before: false;

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
 *   __name__ ASC
 *
 * Later synchronizations:
 *
 *   start after:
 *
 *   watermarkTimestamp
 *   watermark document path
 *
 * The document name is our deterministic tie-breaker when
 * several events have the same createdAt timestamp.
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

        {
          field: {
            fieldPath:
              "__name__",
          },

          direction:
            "ASCENDING",
        },
      ],

      limit:
        pageSize,
    };

  /*
   * =====================================================
   * FIRST SYNCHRONIZATION
   * =====================================================
   *
   * No cursor yet.
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
   * =====================================================
   * WATERMARK VALIDATION
   * =====================================================
   *
   * Having only half of the cursor is unsafe.
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
   * =====================================================
   * BUILD DOCUMENT REFERENCE
   * =====================================================
   *
   * watermarkEventId currently contains the complete
   * document path beneath /documents/, for example:
   *
   * users/ABC123/gameTelemetry/SESSION/events/EVENT
   *
   * Firestore's __name__ cursor requires the full
   * resource name.
   */

  const referenceValue =
    `projects/${integration.projectId}` +
    `/databases/(default)/documents/` +
    `${integration.watermarkEventId}`;

  /*
   * =====================================================
   * FIRESTORE CURSOR
   * =====================================================
   *
   * Firestore REST does not have a StructuredQuery
   * "startAfter" field.
   *
   * Instead:
   *
   * startAt.before = false
   *
   * means start strictly AFTER this cursor.
   */

  structuredQuery.startAt = {
    before:
      false,

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