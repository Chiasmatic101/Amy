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
  getAmyGoogleAuthClient,
} from "@/lib/integrations/firestore/vercel-google-auth";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const INTEGRATION_ID =
  "chiasmatic-calamity-firestore";


export async function POST(
  request: NextRequest
) {
  /*
   * Keep the lease ID outside the main try block so
   * error handling knows whether this request actually
   * acquired ownership.
   */

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

    const integration =
      await getFirestoreIntegration(
        INTEGRATION_ID
      );

    if (
      integration.status !==
      "active"
    ) {
      throw new Error(
        "Firestore integration is not active."
      );
    }


    /*
     * =====================================================
     * ACQUIRE SYNC LEASE
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


    /*
     * =====================================================
     * PROCESS ONE DISCOVERY PAGE
     * =====================================================
     */

    const result =
      await runFirestoreSyncPage(
        integration,
        accessToken.token,
        100
      );


    /*
     * =====================================================
     * PERSIST WATERMARK
     * =====================================================
     *
     * runFirestoreSyncPage only returns successfully if
     * every non-skippable operation on the page succeeded.
     */

    let watermarkAdvanced =
      false;

    if (
      result.nextCursor
    ) {
      await updateFirestoreIntegrationWatermark(
        integration.id,
        result.nextCursor
      );

      watermarkAdvanced =
        true;
    }


    /*
     * =====================================================
     * RELEASE LEASE
     * =====================================================
     */

    await releaseFirestoreSyncLease(
      integration.id,
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
          integration.id,

        gameId:
          integration.gameId,

        environment:
          integration.environment,
      },

      previousWatermark: {
        timestamp:
          integration.watermarkTimestamp,

        documentPath:
          integration.watermarkEventId,
      },

      sync:
        result,

      watermarkAdvanced,

      newWatermark:
        result.nextCursor
          ? {
              timestamp:
                result.nextCursor.timestamp,

              documentPath:
                result.nextCursor.documentPath,
            }
          : null,

      lease: {
        acquired:
          true,

        released:
          true,
      },

      message:
        watermarkAdvanced
          ? "Firestore synchronization page completed, watermark advanced, and lease released."
          : "Firestore synchronization completed with no new watermark to persist. Lease released.",
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
     *
     * Only attempt cleanup if this request actually
     * acquired the lease.
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
          "Synchronization failed. The watermark was not intentionally advanced by the failed processing stage.",
      },
      {
        status: 500,
      }
    );
  }
}