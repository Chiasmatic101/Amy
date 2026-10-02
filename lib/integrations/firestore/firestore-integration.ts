import { adminDb } from "@/lib/firebase-admin";

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