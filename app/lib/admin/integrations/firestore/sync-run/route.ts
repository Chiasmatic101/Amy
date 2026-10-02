import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getFirestoreIntegration,
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
     * PROCESS ONE PAGE
     * =====================================================
     *
     * The sync engine:
     *
     * - reads from the CURRENT saved watermark
     * - discovers sessions
     * - validates identity
     * - checks consent
     * - canonicalizes
     * - writes idempotently
     *
     * If an actual processing failure occurs,
     * runFirestoreSyncPage throws.
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
     * We reach this code only if the page was handled
     * successfully.
     *
     * If there is no nextCursor, there was nothing new
     * to process, so there is nothing to advance.
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
     * SAFE RESPONSE
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

      message:
        watermarkAdvanced
          ? "Firestore synchronization page completed and watermark advanced."
          : "Firestore synchronization completed with no new watermark to persist.",
    });
  } catch (error) {
    console.error(
      "Firestore synchronization failed:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown Firestore synchronization error.",

        message:
          "Synchronization failed. Watermark was not advanced.",
      },
      {
        status: 500,
      }
    );
  }
}