import { adminDb } from "@/lib/firebase-admin";
import crypto from "crypto";
import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

export type FirestoreIntegration = {
  id: string;

  gameId: string;
  provider: "firestore";
  projectId: string;

  status: "active" | "inactive";
  environment: "test" | "live";

  collectionId: string;
  timestampField: string;
  playerIdField: string;
  sessionIdField: string;
  eventField: string;

  syncStatus:
    | "never_synced"
    | "syncing"
    | "synced"
    | "error";

  lastSyncAt: Date | null;

  watermarkTimestamp: string | null;
  watermarkEventId: string | null;
};

function optionalDate(
  value: unknown
): Date | null {
  if (!value) {
    return null;
  }

  /*
   * Firestore Timestamp objects expose toDate().
   */

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    return (
      value as {
        toDate: () => Date;
      }
    ).toDate();
  }

  /*
   * Also tolerate ISO strings while we're
   * developing/testing the integration model.
   */

  if (typeof value === "string") {
    const parsed =
      new Date(value);

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return parsed;
    }
  }

  return null;
}

function optionalString(
  value: unknown
): string | null {
  return typeof value === "string"
    ? value
    : null;
}

export async function getFirestoreIntegration(
  integrationId: string
): Promise<FirestoreIntegration> {
  const ref =
    adminDb
      .collection("integrations")
      .doc(integrationId);

  const snapshot =
    await ref.get();

  if (!snapshot.exists) {
    throw new Error(
      `Integration ${integrationId} does not exist.`
    );
  }

  const data =
    snapshot.data();

  if (!data) {
    throw new Error(
      `Integration ${integrationId} has no configuration.`
    );
  }

  /*
   * Required configuration.
   */

  const gameId =
    optionalString(data.gameId);

  const provider =
    optionalString(data.provider);

  const projectId =
    optionalString(data.projectId);

  const status =
    optionalString(data.status);

  const environment =
    optionalString(data.environment);

  const collectionId =
    optionalString(
      data.collectionId
    );

  const timestampField =
    optionalString(
      data.timestampField
    );

  const playerIdField =
    optionalString(
      data.playerIdField
    );

  const sessionIdField =
    optionalString(
      data.sessionIdField
    );

  const eventField =
    optionalString(
      data.eventField
    );

  const syncStatus =
    optionalString(
      data.syncStatus
    );

  /*
   * Fail closed if the integration record
   * is incomplete.
   */

  if (!gameId) {
    throw new Error(
      "Integration is missing gameId."
    );
  }

  if (
    provider !== "firestore"
  ) {
    throw new Error(
      "Integration provider must be firestore."
    );
  }

  if (!projectId) {
    throw new Error(
      "Integration is missing projectId."
    );
  }

  if (
    status !== "active" &&
    status !== "inactive"
  ) {
    throw new Error(
      "Integration has an invalid status."
    );
  }

  if (
    environment !== "test" &&
    environment !== "live"
  ) {
    throw new Error(
      "Integration has an invalid environment."
    );
  }

  if (!collectionId) {
    throw new Error(
      "Integration is missing collectionId."
    );
  }

  if (!timestampField) {
    throw new Error(
      "Integration is missing timestampField."
    );
  }

  if (!playerIdField) {
    throw new Error(
      "Integration is missing playerIdField."
    );
  }

  if (!sessionIdField) {
    throw new Error(
      "Integration is missing sessionIdField."
    );
  }

  if (!eventField) {
    throw new Error(
      "Integration is missing eventField."
    );
  }

  const validSyncStatuses =
    new Set([
      "never_synced",
      "syncing",
      "synced",
      "error",
    ]);

  if (
    !syncStatus ||
    !validSyncStatuses.has(
      syncStatus
    )
  ) {
    throw new Error(
      "Integration has an invalid syncStatus."
    );
  }

  return {
    id:
      snapshot.id,

    gameId,

    provider:
      "firestore",

    projectId,

    status,

    environment,

    collectionId,

    timestampField,

    playerIdField,

    sessionIdField,

    eventField,

    syncStatus:
      syncStatus as
        FirestoreIntegration["syncStatus"],

    lastSyncAt:
      optionalDate(
        data.lastSyncAt
      ),

    watermarkTimestamp:
      optionalString(
        data.watermarkTimestamp
      ),

    watermarkEventId:
      optionalString(
        data.watermarkEventId
      ),
  };
}

export type FirestoreIntegrationWatermark = {
  timestamp: string;
  documentPath: string;
};


export async function updateFirestoreIntegrationWatermark(
  integrationId: string,
  watermark: FirestoreIntegrationWatermark
): Promise<void> {
  const integrationRef =
    adminDb
      .collection("integrations")
      .doc(integrationId);

  await adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          integrationRef
        );

      if (!snapshot.exists) {
        throw new Error(
          `Integration ${integrationId} does not exist.`
        );
      }

      transaction.update(
        integrationRef,
        {
          watermarkTimestamp:
            watermark.timestamp,

          /*
           * Historical field name.
           *
           * The value stored here is actually the complete
           * source Firestore document path.
           *
           * We'll migrate the field name later without
           * changing sync behavior.
           */
          watermarkEventId:
            watermark.documentPath,

          syncStatus:
            "synced",

          lastSyncAt:
            FieldValue.serverTimestamp(),
        }
      );
    }
  );
}
export type FirestoreSyncLeaseResult = {
  acquired: boolean;
  leaseId: string | null;
  expiresAt: string | null;
};


const FIRESTORE_SYNC_LEASE_MS =
  5 * 60 * 1000;


export async function acquireFirestoreSyncLease(
  integrationId: string
): Promise<FirestoreSyncLeaseResult> {
  const integrationRef =
    adminDb
      .collection("integrations")
      .doc(integrationId);

  const leaseId =
    crypto.randomUUID();

  const now =
    new Date();

  const expiresAt =
    new Date(
      now.getTime() +
        FIRESTORE_SYNC_LEASE_MS
    );

  return adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          integrationRef
        );

      if (!snapshot.exists) {
        throw new Error(
          `Integration ${integrationId} does not exist.`
        );
      }

      const data =
        snapshot.data();

      const existingLeaseId =
        typeof data?.syncLeaseId ===
        "string"
          ? data.syncLeaseId
          : null;

      const existingExpiresAt =
        data?.syncLeaseExpiresAt &&
        typeof data.syncLeaseExpiresAt.toDate ===
          "function"
          ? data.syncLeaseExpiresAt.toDate()
          : null;

      /*
       * An active, unexpired lease already owns
       * this integration.
       */

      if (
        existingLeaseId &&
        existingExpiresAt &&
        existingExpiresAt.getTime() >
          now.getTime()
      ) {
        return {
          acquired:
            false,

          leaseId:
            null,

          expiresAt:
            existingExpiresAt.toISOString(),
        };
      }

      /*
       * No active lease, or the previous lease expired.
       */

      transaction.update(
        integrationRef,
        {
          syncLeaseId:
            leaseId,

          syncLeaseExpiresAt:
            Timestamp.fromDate(
              expiresAt
            ),

          syncStatus:
            "syncing",

          syncStartedAt:
            FieldValue.serverTimestamp(),

          syncLastError:
            FieldValue.delete(),
        }
      );

      return {
        acquired:
          true,

        leaseId,

        expiresAt:
          expiresAt.toISOString(),
      };
    }
  );
}


export async function releaseFirestoreSyncLease(
  integrationId: string,
  leaseId: string,
  status:
    | "synced"
    | "error"
): Promise<void> {
  const integrationRef =
    adminDb
      .collection("integrations")
      .doc(integrationId);

  await adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          integrationRef
        );

      if (!snapshot.exists) {
        throw new Error(
          `Integration ${integrationId} does not exist.`
        );
      }

      const data =
        snapshot.data();

      /*
       * Only the process that owns the current lease
       * is allowed to release it.
       */

      if (
        data?.syncLeaseId !==
        leaseId
      ) {
        throw new Error(
          "Synchronization lease ownership changed before release."
        );
      }

      transaction.update(
        integrationRef,
        {
          syncLeaseId:
            FieldValue.delete(),

          syncLeaseExpiresAt:
            FieldValue.delete(),

          syncStatus:
            status,

          syncFinishedAt:
            FieldValue.serverTimestamp(),
        }
      );
    }
  );
}


export async function markFirestoreSyncError(
  integrationId: string,
  leaseId: string,
  errorMessage: string
): Promise<void> {
  const integrationRef =
    adminDb
      .collection("integrations")
      .doc(integrationId);

  await adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          integrationRef
        );

      if (!snapshot.exists) {
        return;
      }

      const data =
        snapshot.data();

      /*
       * Don't allow an old failed process to overwrite
       * the status of a newer lease.
       */

      if (
        data?.syncLeaseId !==
        leaseId
      ) {
        return;
      }

      transaction.update(
        integrationRef,
        {
          syncLastError:
            errorMessage.substring(
              0,
              1000
            ),

          syncLastErrorAt:
            FieldValue.serverTimestamp(),
        }
      );
    }
  );
}