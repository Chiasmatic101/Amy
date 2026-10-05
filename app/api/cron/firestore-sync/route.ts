import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  acquireFirestoreSyncLease,
  listActiveFirestoreIntegrations,
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


const PAGE_SIZE =
  100;

const MAX_PAGES =
  5;


/*
 * =========================================================
 * SYNC ONE INTEGRATION
 * =========================================================
 */

async function syncIntegration(
  integration: any,
  token: string
) {
  let leaseId:
    string | null =
    null;

  try {
    /*
     * =====================================================
     * ACQUIRE INTEGRATION-SPECIFIC LEASE
     * =====================================================
     */

    const lease =
      await acquireFirestoreSyncLease(
        integration.id
      );

    if (
      !lease.acquired ||
      !lease.leaseId
    ) {
      return {
        success: true,

        integrationId:
          integration.id,

        gameId:
          integration.gameId,

        skipped: true,

        reason:
          "Synchronization already in progress.",

        leaseExpiresAt:
          lease.expiresAt,

        pagesProcessed: 0,
        documentsProcessed: 0,
        sessionsImported: 0,
        sessionsSkippedConsent: 0,
        eventsCreated: 0,
        eventsDuplicates: 0,
        caughtUp: false,
        stoppedAtPageLimit: false,
        finalWatermark: null,
      };
    }

    leaseId =
      lease.leaseId;


    /*
     * =====================================================
     * BOUNDED MULTI-PAGE SYNC
     * =====================================================
     */

    let currentIntegration =
      integration;

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
          `Synchronization page ${pageNumber} returned documents without a cursor.`
        );
      }


      /*
       * Commit every successful page independently.
       */

      await updateFirestoreIntegrationWatermark(
        integration.id,
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
       * Advance the in-memory cursor.
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
     * RELEASE INTEGRATION-SPECIFIC LEASE
     * =====================================================
     */

    await releaseFirestoreSyncLease(
      integration.id,
      leaseId,
      "synced"
    );

    leaseId =
      null;


    return {
      success: true,

      integrationId:
        integration.id,

      gameId:
        integration.gameId,

      skipped: false,

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
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown Firestore synchronization error.";

    console.error(
      `Automated synchronization failed for integration ${integration.id}:`,
      error
    );


    /*
     * =====================================================
     * CLEAN UP THIS INTEGRATION ONLY
     * =====================================================
     */

    if (
      leaseId
    ) {
      try {
        await markFirestoreSyncError(
          integration.id,
          leaseId,
          errorMessage
        );

        await releaseFirestoreSyncLease(
          integration.id,
          leaseId,
          "error"
        );
      } catch (
        cleanupError
      ) {
        console.error(
          `Synchronization cleanup failed for integration ${integration.id}:`,
          cleanupError
        );
      }
    }


    /*
     * IMPORTANT:
     *
     * We return the error instead of throwing it.
     *
     * This means one developer's broken integration
     * will not prevent the remaining integrations
     * from synchronizing.
     */

    return {
      success: false,

      integrationId:
        integration.id,

      gameId:
        integration.gameId,

      skipped: false,

      error:
        errorMessage,

      pagesProcessed: 0,
      documentsProcessed: 0,
      sessionsImported: 0,
      sessionsSkippedConsent: 0,
      eventsCreated: 0,
      eventsDuplicates: 0,
      caughtUp: false,
      stoppedAtPageLimit: false,
      finalWatermark: null,
    };
  }
}


/*
 * =========================================================
 * CRON ENTRY POINT
 * =========================================================
 */

export async function GET(
  request: NextRequest
) {
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
     * DISCOVER ACTIVE FIRESTORE INTEGRATIONS
     * =====================================================
     */

    const integrations =
      await listActiveFirestoreIntegrations();


    if (
      integrations.length === 0
    ) {
      return NextResponse.json({
        success: true,

        automated: true,

        integrationsFound: 0,

        message:
          "No active Firestore integrations were found.",
      });
    }


    /*
     * =====================================================
     * GOOGLE AUTHENTICATION
     * =====================================================
     *
     * We obtain the AMY Google access token once for this
     * cron invocation and reuse it for each Firestore
     * integration.
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
     * PROCESS ACTIVE INTEGRATIONS
     * =====================================================
     *
     * Sequential processing is intentional for now.
     *
     * It keeps the prototype predictable and avoids
     * unnecessary concurrent work against Firestore.
     */

    const results = [];

    for (
      const integration of integrations
    ) {
      const result =
        await syncIntegration(
          integration,
          token
        );

      results.push(
        result
      );
    }


    /*
     * =====================================================
     * BUILD RUN SUMMARY
     * =====================================================
     */

    const successful =
      results.filter(
        (result) =>
          result.success
      ).length;

    const failed =
      results.filter(
        (result) =>
          !result.success
      ).length;

    const skipped =
      results.filter(
        (result) =>
          result.skipped
      ).length;

    const pagesProcessed =
      results.reduce(
        (total, result) =>
          total +
          result.pagesProcessed,
        0
      );

    const documentsProcessed =
      results.reduce(
        (total, result) =>
          total +
          result.documentsProcessed,
        0
      );

    const sessionsImported =
      results.reduce(
        (total, result) =>
          total +
          result.sessionsImported,
        0
      );

    const sessionsSkippedConsent =
      results.reduce(
        (total, result) =>
          total +
          result.sessionsSkippedConsent,
        0
      );

    const eventsCreated =
      results.reduce(
        (total, result) =>
          total +
          result.eventsCreated,
        0
      );

    const eventsDuplicates =
      results.reduce(
        (total, result) =>
          total +
          result.eventsDuplicates,
        0
      );


    return NextResponse.json({
      success:
        failed === 0,

      automated: true,

      integrationsFound:
        integrations.length,

      summary: {
        successful,
        failed,
        skipped,

        pagesProcessed,
        documentsProcessed,

        sessionsImported,
        sessionsSkippedConsent,

        eventsCreated,
        eventsDuplicates,
      },

      integrations:
        results,

      message:
        failed === 0
          ? "Automated Firestore synchronization completed."
          : "Automated Firestore synchronization completed with one or more integration errors.",
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


    return NextResponse.json(
      {
        success: false,

        automated: true,

        error:
          errorMessage,
      },
      {
        status: 500,
      }
    );
  }
}