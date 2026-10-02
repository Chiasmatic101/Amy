import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getFirestoreIntegration,
} from "@/lib/integrations/firestore/firestore-integration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
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
      return NextResponse.json(
        {
          success: false,
          error:
            "AMY_ADMIN_SECRET is not configured.",
        },
        { status: 500 }
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
        { status: 401 }
      );
    }

    /*
     * =====================================================
     * LOAD INTEGRATION CONFIGURATION
     * =====================================================
     */

    const integrationId =
      "chiasmatic-calamity-firestore";

    const integration =
      await getFirestoreIntegration(
        integrationId
      );

    /*
     * =====================================================
     * SAFE RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      integration: {
        id:
          integration.id,

        gameId:
          integration.gameId,

        provider:
          integration.provider,

        projectId:
          integration.projectId,

        status:
          integration.status,

        environment:
          integration.environment,

        mapping: {
          collectionId:
            integration.collectionId,

          timestampField:
            integration.timestampField,

          playerIdField:
            integration.playerIdField,

          sessionIdField:
            integration.sessionIdField,

          eventField:
            integration.eventField,
        },

        sync: {
          status:
            integration.syncStatus,

          lastSyncAt:
            integration.lastSyncAt
              ? integration.lastSyncAt.toISOString()
              : null,

          watermarkTimestamp:
            integration.watermarkTimestamp,

          watermarkEventId:
            integration.watermarkEventId,
        },
      },
    });
  } catch (error) {
    console.error(
      "Integration configuration test failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown integration configuration error.",
      },
      { status: 500 }
    );
  }
}