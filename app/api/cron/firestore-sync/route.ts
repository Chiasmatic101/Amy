import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  acquireFirestoreSyncLease,
  getFirestoreIntegration,
  markFirestoreSyncError,
  releaseFirestoreSyncLease,
  updateFirestoreIntegrationWatermark,
} from "@/lib/integrations/firestore/firestore-integration";

import {
  runFirestoreSyncPage,
} from "@/lib/integrations/firestore/firestore-sync-engine";

import {
  withSyncCursor,
} from "@/lib/integrations/firestore/firestore-sync-reader";

import {
  getAmyGoogleAuthClient,
} from "@/lib/integrations/firestore/vercel-google-auth";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const INTEGRATION_ID =
  "chiasmatic-calamity-firestore";

const PAGE_SIZE =
  100;

const MAX_PAGES =
  5;


export async function GET(
  request: NextRequest
) {
  let leaseId:
    string | null =
    null;

  try {
    /*
     * =====================================================
     * CRON AUTHENTICATION
     * =====================================================
     */

    const cronSecret =
      process.env.CRON_SECRET;

    if (!cronSecret) {
      throw new Error(
        "CRON_SECRET is not configured."
      );
    }

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      authorization !==
      `Bearer ${cronSecret}`
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }


    /*
     * =====================================================
     * LOAD INTEGRATION
     * =====================================================
     */

    const originalIntegration =
      await getFirestoreIntegration(
        INTEGRATION_ID
      );

    if (
      originalIntegration.status !==
      "active"
    ) {
      return NextResponse.json({
        success: true,

        skipped: true,

        reason:
          "Integration is not active.",
      });
    }


    /*
     * =====================================================
     * ACQUIRE LEASE
     * =====================================================
     */

    const lease =
      await acquireFirestoreSyncLease(
        originalIntegration.id
      );

    if (
      !lease.acquired ||
      !lease.leaseId
    ) {
      /*
       * For cron, an existing lease is not an error.
       * Another process is already doing the work.
       */

      return NextResponse.json({
        success: true,

        skipped: true,

        reason:
          "Synchronization already in progress.",

        leaseExpiresAt:
          lease.expiresAt,
      });
    }

    leaseId =
      lease.leaseId;


    /*
     * =====================================================
     * GOOGLE AUTHENTICATION
     * =====================================================
     */

    const authClient =
      getAmyGoogleAuthClient();

    const accessToken =
      await authClient.getAccessToken();

    if (
      !accessToken.token
    ) {
      throw new Error(
        "Google Workload Identity Federation did not return an access token."
      );
    }

    const token =
      accessToken.token;


    /*
     * =====================================================
     * BOUNDED MULTI-PAGE SYNC
     * =====================================================
     */

    let currentIntegration =
      originalIntegration;

    let pagesProcessed =
      0;

    let documentsProcessed =
      0;

    let sessionsImported =
      0;

    let sessionsSkippedConsent =
      0;

    let eventsCreated =
      0;

    let eventsDuplicates =
      0;

    let caughtUp =
      false;

    let finalWatermark:
      {
        timestamp: string;
        documentPath: string;
      } | null =
      null;


    for (
      let pageNumber = 1;
      pageNumber <= MAX_PAGES;
      pageNumber += 1
    ) {
      const result =
        await runFirestoreSyncPage(
          currentIntegration,
          token,
          PAGE_SIZE
        );

      if (
        result.discovery.documents === 0
      ) {
        caughtUp =
          true;

        break;
      }

      if (
        !result.nextCursor
      ) {
        throw new Error(
          `Cron synchronization page ${pageNumber} returned documents without a cursor.`
        );
      }

      /*
       * Commit every successful page independently.
       */

      await updateFirestoreIntegrationWatermark(
        originalIntegration.id,
        result.nextCursor
      );

      pagesProcessed +=
        1;

      documentsProcessed +=
        result.discovery.documents;

      sessionsImported +=
        result.processing.sessionsImported;

      sessionsSkippedConsent +=
        result.processing.sessionsSkippedConsent;

      eventsCreated +=
        result.processing.eventsCreated;

      eventsDuplicates +=
        result.processing.eventsDuplicates;

      finalWatermark =
        result.nextCursor;


      /*
       * Advance our in-memory cursor.
       */

      currentIntegration =
        withSyncCursor(
          currentIntegration,
          result.nextCursor
        );


      if (
        !result.hasMore
      ) {
        caughtUp =
          true;

        break;
      }
    }


    /*
     * =====================================================
     * RELEASE LEASE
     * =====================================================
     */

    await releaseFirestoreSyncLease(
      originalIntegration.id,
      leaseId,
      "synced"
    );

    leaseId =
      null;


    return NextResponse.json({
      success: true,

      automated: true,

      integrationId:
        originalIntegration.id,

      pagesProcessed,

      documentsProcessed,

      sessionsImported,

      sessionsSkippedConsent,

      eventsCreated,

      eventsDuplicates,

      caughtUp,

      stoppedAtPageLimit:
        !caughtUp &&
        pagesProcessed === MAX_PAGES,

      finalWatermark,

      message:
        caughtUp
          ? "Automated Firestore synchronization is caught up."
          : "Automated Firestore synchronization stopped at the configured page limit.",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown automated Firestore synchronization error.";

    console.error(
      "Automated Firestore synchronization failed:",
      error
    );


    if (
      leaseId
    ) {
      try {
        await markFirestoreSyncError(
          INTEGRATION_ID,
          leaseId,
          errorMessage
        );

        await releaseFirestoreSyncLease(
          INTEGRATION_ID,
          leaseId,
          "error"
        );
      } catch (
        cleanupError
      ) {
        console.error(
          "Automated sync cleanup failed:",
          cleanupError
        );
      }
    }


    return NextResponse.json(
      {
        success: false,

        error:
          errorMessage,
      },
      {
        status: 500,
      }
    );
  }
}