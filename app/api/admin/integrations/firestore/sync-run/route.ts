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

const MAX_PAGES_PER_RUN =
  5;


export async function POST(
  request: NextRequest
) {
  let acquiredLeaseId:
    string | null =
    null;

  try {
    /*
     * =====================================================
     * ADMIN AUTHENTICATION
     * =====================================================
     */

    const adminSecret =
      process.env.AMY_ADMIN_SECRET;

    if (!adminSecret) {
      throw new Error(
        "AMY_ADMIN_SECRET is not configured."
      );
    }

    const suppliedSecret =
      request.headers.get(
        "x-amy-admin-secret"
      );

    if (
      suppliedSecret !==
      adminSecret
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
      throw new Error(
        "Firestore integration is not active."
      );
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
      return NextResponse.json(
        {
          success: false,

          error:
            "Synchronization already in progress.",

          leaseExpiresAt:
            lease.expiresAt,

          message:
            "Another synchronization process currently owns this integration.",
        },
        {
          status: 409,
        }
      );
    }

    acquiredLeaseId =
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
     * MULTI-PAGE SYNCHRONIZATION
     * =====================================================
     *
     * Start with the integration exactly as it was loaded
     * from AMY.
     *
     * After each successful page:
     *
     * 1. persist its watermark
     * 2. update the in-memory cursor
     * 3. continue to the next page
     *
     * Therefore a later page failure does NOT lose the
     * progress from earlier successful pages.
     */

    let currentIntegration =
      originalIntegration;

    let pagesProcessed =
      0;

    let discoveryDocuments =
      0;

    let modernDocuments =
      0;

    let legacyDocuments =
      0;

    let invalidDocuments =
      0;

    let sessionsDiscovered =
      0;

    let sessionsProcessed =
      0;

    let sessionsImported =
      0;

    let sessionsSkippedConsent =
      0;

    let eventsReceived =
      0;

    let eventsCreated =
      0;

    let eventsDuplicates =
      0;

    let caughtUp =
      false;

    let finalCursor:
      {
        timestamp: string;
        documentPath: string;
      } | null =
      null;

    const pageResults:
      Array<{
        page: number;
        documents: number;
        sessionsDiscovered: number;
        sessionsImported: number;
        eventsCreated: number;
        eventsDuplicates: number;
        watermarkAdvanced: boolean;
      }> =
      [];


    for (
      let pageNumber = 1;
      pageNumber <=
        MAX_PAGES_PER_RUN;
      pageNumber += 1
    ) {
      const result =
        await runFirestoreSyncPage(
          currentIntegration,
          token,
          PAGE_SIZE
        );

      /*
       * No documents means we've reached the end of the
       * currently available source data.
       */

      if (
        result.discovery.documents ===
        0
      ) {
        caughtUp =
          true;

        break;
      }

      pagesProcessed +=
        1;

      discoveryDocuments +=
        result.discovery.documents;

      modernDocuments +=
        result.discovery.modernDocuments;

      legacyDocuments +=
        result.discovery.legacyDocuments;

      invalidDocuments +=
        result.discovery.invalidDocuments;

      sessionsDiscovered +=
        result.discovery.sessionsDiscovered;

      sessionsProcessed +=
        result.processing.sessionsProcessed;

      sessionsImported +=
        result.processing.sessionsImported;

      sessionsSkippedConsent +=
        result.processing.sessionsSkippedConsent;

      eventsReceived +=
        result.processing.eventsReceived;

      eventsCreated +=
        result.processing.eventsCreated;

      eventsDuplicates +=
        result.processing.eventsDuplicates;


      /*
       * A non-empty successful discovery page should give
       * us a cursor representing its final source document.
       */

      if (
        !result.nextCursor
      ) {
        throw new Error(
          `Synchronization page ${pageNumber} contained documents but returned no cursor.`
        );
      }


      /*
       * ===================================================
       * COMMIT THIS PAGE
       * ===================================================
       *
       * This is deliberately inside the loop.
       *
       * If page 4 fails, the watermarks from pages 1-3
       * have already been safely persisted.
       */

      await updateFirestoreIntegrationWatermark(
        originalIntegration.id,
        result.nextCursor
      );

      finalCursor =
        result.nextCursor;


      pageResults.push({
        page:
          pageNumber,

        documents:
          result.discovery.documents,

        sessionsDiscovered:
          result.discovery.sessionsDiscovered,

        sessionsImported:
          result.processing.sessionsImported,

        eventsCreated:
          result.processing.eventsCreated,

        eventsDuplicates:
          result.processing.eventsDuplicates,

        watermarkAdvanced:
          true,
      });


      /*
       * Prepare the in-memory integration for the next page.
       *
       * We do not need another Firestore read merely to get
       * the watermark we just wrote.
       */

      currentIntegration =
        withSyncCursor(
          currentIntegration,
          result.nextCursor
        );


      /*
       * If the source reader tells us there isn't another
       * page available, we are caught up.
       */

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
      acquiredLeaseId,
      "synced"
    );

    acquiredLeaseId =
      null;


    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      success:
        true,

      integration: {
        id:
          originalIntegration.id,

        gameId:
          originalIntegration.gameId,

        environment:
          originalIntegration.environment,
      },

      previousWatermark: {
        timestamp:
          originalIntegration.watermarkTimestamp,

        documentPath:
          originalIntegration.watermarkEventId,
      },

      limits: {
        pageSize:
          PAGE_SIZE,

        maxPages:
          MAX_PAGES_PER_RUN,

        maxDiscoveryDocuments:
          PAGE_SIZE *
          MAX_PAGES_PER_RUN,
      },

      summary: {
        pagesProcessed,

        discoveryDocuments,

        modernDocuments,

        legacyDocuments,

        invalidDocuments,

        sessionsDiscovered,

        sessionsProcessed,

        sessionsImported,

        sessionsSkippedConsent,

        eventsReceived,

        eventsCreated,

        eventsDuplicates,
      },

      pageResults,

      caughtUp,

      stoppedAtPageLimit:
        !caughtUp &&
        pagesProcessed ===
          MAX_PAGES_PER_RUN,

      finalWatermark:
        finalCursor,

      lease: {
        acquired:
          true,

        released:
          true,
      },

      message:
        caughtUp
          ? "Firestore synchronization caught up with the currently available source data."
          : "Firestore synchronization stopped safely at the configured page limit.",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown Firestore synchronization error.";

    console.error(
      "Firestore synchronization failed:",
      error
    );


    /*
     * =====================================================
     * FAILURE CLEANUP
     * =====================================================
     */

    if (
      acquiredLeaseId
    ) {
      try {
        await markFirestoreSyncError(
          INTEGRATION_ID,
          acquiredLeaseId,
          errorMessage
        );

        await releaseFirestoreSyncLease(
          INTEGRATION_ID,
          acquiredLeaseId,
          "error"
        );

        acquiredLeaseId =
          null;
      } catch (
        cleanupError
      ) {
        console.error(
          "Firestore synchronization cleanup failed:",
          cleanupError
        );
      }
    }


    return NextResponse.json(
      {
        success:
          false,

        error:
          errorMessage,

        message:
          "Synchronization stopped. Any earlier successfully completed pages retain their committed watermarks.",
      },
      {
        status: 500,
      }
    );
  }
}