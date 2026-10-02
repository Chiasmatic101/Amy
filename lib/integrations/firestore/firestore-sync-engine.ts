import {
  RawFirestoreDocument,
} from "./firestore-mapper";

import {
  FirestoreIntegration,
} from "./firestore-integration";

import {
  readFirestoreSyncPage,
  FirestoreSyncCursor,
} from "./firestore-sync-reader";

import {
  discoverFirestoreSessions,
} from "./firestore-session-discovery";

import {
  readCompleteFirestoreSession,
} from "./firestore-session-reader";

import {
  validateFirestoreSessionDocuments,
} from "./firestore-session-validation";

import {
  evaluateFirestoreConsent,
} from "./firestore-consent";

import {
  processFirestoreSession,
} from "./firestore-session-processor";

import {
  writeProcessedFirestoreSession,
} from "./firestore-session-writer";


export type FirestoreSyncEngineResult = {
  success: true;

  integrationId: string;
  gameId: string;

  discovery: {
    documents: number;
    modernDocuments: number;
    legacyDocuments: number;
    invalidDocuments: number;
    sessionsDiscovered: number;
  };

  processing: {
    sessionsProcessed: number;
    sessionsImported: number;
    sessionsSkippedConsent: number;
    sessionsFailed: number;

    eventsReceived: number;
    eventsCreated: number;
    eventsDuplicates: number;
  };

  nextCursor:
    FirestoreSyncCursor | null;

  hasMore: boolean;

  /*
   * Safe diagnostic errors only.
   * Never include UID/profile information here.
   */
  errors: Array<{
    sessionId: string;
    reason: string;
  }>;
};


async function readFirestoreUserDocument(
  projectId: string,
  uid: string,
  accessToken: string
): Promise<RawFirestoreDocument | null> {
  const url =
    `https://firestore.googleapis.com/v1/projects/` +
    `${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents/users/` +
    `${encodeURIComponent(uid)}`;

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

  if (
    response.status === 404
  ) {
    return null;
  }

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      `Firestore user read failed with status ${response.status}: ${JSON.stringify(
        result
      )}`
    );
  }

  return result as
    RawFirestoreDocument;
}


/*
 * =========================================================
 * PROCESS ONE DISCOVERY PAGE
 * =========================================================
 *
 * IMPORTANT:
 *
 * This function DOES NOT persist the synchronization
 * watermark.
 *
 * It returns the cursor that is safe to persist only after
 * the entire page has been handled successfully.
 *
 * Step 4 will own that state transition.
 * =========================================================
 */

export async function runFirestoreSyncPage(
  integration:
    FirestoreIntegration,

  accessToken:
    string,

  pageSize = 100
): Promise<FirestoreSyncEngineResult> {
  /*
   * =====================================================
   * DISCOVER SOURCE EVENTS
   * =====================================================
   */

  const page =
    await readFirestoreSyncPage(
      integration,
      accessToken,
      pageSize
    );

  /*
   * Nothing new.
   */

  if (
    page.documents.length === 0
  ) {
    return {
      success: true,

      integrationId:
        integration.id,

      gameId:
        integration.gameId,

      discovery: {
        documents: 0,
        modernDocuments: 0,
        legacyDocuments: 0,
        invalidDocuments: 0,
        sessionsDiscovered: 0,
      },

      processing: {
        sessionsProcessed: 0,
        sessionsImported: 0,
        sessionsSkippedConsent: 0,
        sessionsFailed: 0,

        eventsReceived: 0,
        eventsCreated: 0,
        eventsDuplicates: 0,
      },

      nextCursor: null,

      hasMore: false,

      errors: [],
    };
  }

  /*
   * =====================================================
   * SESSION DISCOVERY
   * =====================================================
   */

  const discovery =
    discoverFirestoreSessions(
      page.documents
    );

  let sessionsProcessed =
    0;

  let sessionsImported =
    0;

  let sessionsSkippedConsent =
    0;

  let sessionsFailed =
    0;

  let eventsReceived =
    0;

  let eventsCreated =
    0;

  let eventsDuplicates =
    0;

  const errors:
    FirestoreSyncEngineResult["errors"] =
    [];

  /*
   * =====================================================
   * PROCESS EACH UNIQUE MODERN SESSION
   * =====================================================
   */

  for (
    const identity of
      discovery.sessions
  ) {
    sessionsProcessed +=
      1;

    try {
      /*
       * Fetch the complete session, not merely the
       * documents appearing on this discovery page.
       */

      const completeSession =
        await readCompleteFirestoreSession(
          integration,
          identity,
          accessToken
        );

      /*
       * Identity integrity check.
       */

      const validation =
        validateFirestoreSessionDocuments(
          identity,
          completeSession.documents
        );

      if (
        !validation.valid
      ) {
        sessionsFailed +=
          1;

        errors.push({
          sessionId:
            identity.sessionId,

          reason:
            "Session failed identity validation.",
        });

        continue;
      }

      /*
       * Fetch consent/profile document.
       */

      const userDocument =
        await readFirestoreUserDocument(
          integration.projectId,
          identity.uid,
          accessToken
        );

      /*
       * Missing profile = fail closed on research
       * eligibility, but it is not a synchronization
       * infrastructure failure.
       */

      if (!userDocument) {
        sessionsSkippedConsent +=
          1;

        continue;
      }

      const consent =
        evaluateFirestoreConsent(
          userDocument
        );

      if (
        !consent.eligible
      ) {
        sessionsSkippedConsent +=
          1;

        continue;
      }

      /*
       * Privacy boundary + canonicalization.
       */

      const processedSession =
        processFirestoreSession(
          integration,
          identity,
          completeSession,
          consent
        );

      /*
       * Idempotent AMY write.
       */

      const writeResult =
        await writeProcessedFirestoreSession(
          integration,
          processedSession
        );

      sessionsImported +=
        1;

      eventsReceived +=
        writeResult.received;

      eventsCreated +=
        writeResult.created;

      eventsDuplicates +=
        writeResult.duplicates;
    } catch (error) {
      sessionsFailed +=
        1;

      errors.push({
        sessionId:
          identity.sessionId,

        reason:
          error instanceof Error
            ? error.message
            : "Unknown session processing error.",
      });
    }
  }

  /*
   * =====================================================
   * FAIL PAGE IF A SESSION FAILED
   * =====================================================
   *
   * This distinction is important.
   *
   * Consent-ineligible sessions are intentionally skipped.
   * They do NOT prevent watermark advancement.
   *
   * Actual processing/integrity failures DO prevent it.
   *
   * We throw here so the caller cannot accidentally treat
   * this page as safely completed.
   */

  if (
    sessionsFailed > 0
  ) {
    throw new Error(
      `Firestore synchronization page failed: ${sessionsFailed} session(s) could not be processed. Watermark must not advance. ${JSON.stringify(
        errors
      )}`
    );
  }

  /*
   * =====================================================
   * SAFE PAGE COMPLETION
   * =====================================================
   *
   * At this point:
   *
   * - legacy documents were intentionally skipped
   * - consent-ineligible sessions were intentionally skipped
   * - eligible sessions were imported idempotently
   * - no processing failures occurred
   *
   * Therefore the page cursor is safe for Step 4 to persist.
   */

  return {
    success:
      true,

    integrationId:
      integration.id,

    gameId:
      integration.gameId,

    discovery: {
      documents:
        page.documents.length,

      modernDocuments:
        discovery.modernDocumentCount,

      legacyDocuments:
        discovery.legacyDocumentCount,

      invalidDocuments:
        discovery.invalidDocumentCount,

      sessionsDiscovered:
        discovery.uniqueSessionCount,
    },

    processing: {
      sessionsProcessed,

      sessionsImported,

      sessionsSkippedConsent,

      sessionsFailed,

      eventsReceived,

      eventsCreated,

      eventsDuplicates,
    },

    nextCursor:
      page.nextCursor,

    hasMore:
      page.hasMore,

    errors,
  };
}