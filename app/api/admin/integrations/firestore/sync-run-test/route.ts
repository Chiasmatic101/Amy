import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getFirestoreIntegration,
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
     * RUN EXACTLY ONE SYNC PAGE
     * =====================================================
     *
     * IMPORTANT:
     *
     * This endpoint does NOT persist the returned cursor.
     *
     * We are testing the engine first.
     */

    const result =
      await runFirestoreSyncPage(
        integration,
        accessToken.token,
        100
      );


    /*
     * =====================================================
     * SAFE RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      dryRunWatermark:
        true,

      currentWatermark: {
        timestamp:
          integration.watermarkTimestamp,

        documentPath:
          integration.watermarkEventId,
      },

      sync:
        result,

      message:
        "One Firestore synchronization page processed successfully. The returned cursor was NOT persisted.",
    });
  } catch (error) {
    console.error(
      "Firestore synchronization test failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown Firestore synchronization error.",

        message:
          "Synchronization page failed. Watermark was not changed.",
      },
      {
        status: 500,
      }
    );
  }
}