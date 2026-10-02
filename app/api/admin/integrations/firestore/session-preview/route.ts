import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getFirestoreIntegration,
} from "@/lib/integrations/firestore/firestore-integration";

import {
  readFirestoreSyncPage,
  withSyncCursor,
} from "@/lib/integrations/firestore/firestore-sync-reader";

import {
  discoverFirestoreSessions,
} from "@/lib/integrations/firestore/firestore-session-discovery";

import {
  readCompleteFirestoreSessions,
} from "@/lib/integrations/firestore/firestore-session-reader";

import {
  getAmyGoogleAuthClient,
} from "@/lib/integrations/firestore/vercel-google-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTEGRATION_ID =
  "chiasmatic-calamity-firestore";

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
      return NextResponse.json(
        {
          success: false,
          error:
            "Integration is not active.",
        },
        { status: 400 }
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

    if (!accessToken.token) {
      throw new Error(
        "Google Workload Identity Federation did not return an access token."
      );
    }

    const token =
      accessToken.token;

    /*
     * =====================================================
     * READ PAGE 1
     * =====================================================
     *
     * We know from our previous test that page 1 contains
     * legacy telemetry.
     */

    const pageOne =
      await readFirestoreSyncPage(
        integration,
        token,
        100
      );

    /*
     * We need a cursor before requesting page 2.
     */

    if (!pageOne.nextCursor) {
      return NextResponse.json({
        success: true,

        dryRun: true,

        message:
          "The first synchronization page did not contain enough data to reach a second page.",

        pageOne: {
          count:
            pageOne.count,
        },
      });
    }

    /*
     * =====================================================
     * READ PAGE 2
     * =====================================================
     */

    const pageTwoIntegration =
      withSyncCursor(
        integration,
        pageOne.nextCursor
      );

    const pageTwo =
      await readFirestoreSyncPage(
        pageTwoIntegration,
        token,
        100
      );

    /*
     * =====================================================
     * DISCOVER MODERN SESSIONS
     * =====================================================
     */

    const discovery =
      discoverFirestoreSessions(
        pageTwo.documents
      );

    /*
     * If page 2 contains no modern sessions, return a safe
     * diagnostic response rather than failing.
     */

    if (
      discovery.sessions.length ===
      0
    ) {
      return NextResponse.json({
        success: true,

        dryRun: true,

        pageOne: {
          count:
            pageOne.count,
        },

        pageTwo: {
          count:
            pageTwo.count,

          modernDocuments:
            discovery.modernDocumentCount,

          legacyDocuments:
            discovery.legacyDocumentCount,

          invalidDocuments:
            discovery.invalidDocumentCount,

          uniqueModernSessions:
            0,
        },

        message:
          "Page 2 contained no modern telemetry sessions.",
      });
    }

    /*
     * =====================================================
     * FETCH ONE COMPLETE MODERN SESSION
     * =====================================================
     *
     * For this diagnostic test we deliberately fetch only
     * the first discovered modern session.
     */

    const firstSession =
      discovery.sessions[0];

    if (!firstSession) {
      throw new Error(
        "Session discovery returned an unexpected empty result."
      );
    }

    const completeSessions =
      await readCompleteFirestoreSessions(
        integration,
        [
          firstSession,
        ],
        token
      );

    const completeSession =
      completeSessions[0];

    if (!completeSession) {
      throw new Error(
        "Complete session reader returned no session."
      );
    }

    /*
     * =====================================================
     * SAFE EVENT SUMMARY
     * =====================================================
     *
     * Do not return the source UID.
     */

    const eventNames =
      completeSession.documents
        .map(
          (document) =>
            document.fields
              ?.event
              ?.stringValue
        )
        .filter(
          (
            event
          ): event is string =>
            typeof event ===
            "string"
        );

    const firstEvent =
      eventNames[0] ??
      null;

    const lastEvent =
      eventNames[
        eventNames.length - 1
      ] ?? null;

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      dryRun: true,

      integration: {
        id:
          integration.id,

        gameId:
          integration.gameId,

        projectId:
          integration.projectId,
      },

      pageOne: {
        count:
          pageOne.count,
      },

      pageTwo: {
        count:
          pageTwo.count,

        modernDocuments:
          discovery.modernDocumentCount,

        legacyDocuments:
          discovery.legacyDocumentCount,

        invalidDocuments:
          discovery.invalidDocumentCount,

        uniqueModernSessions:
          discovery.uniqueSessionCount,
      },

      completeSession: {
        sessionId:
          completeSession.sessionId,

        eventCount:
          completeSession.eventCount,

        firstEvent,

        lastEvent,

        containsSessionStart:
          eventNames.includes(
            "game_session_started"
          ),

        containsSessionEnd:
          eventNames.includes(
            "game_session_ended"
          ),
      },

      message:
        "Complete external Firestore session retrieved successfully. No events were imported and no watermark was changed.",
    });
  } catch (error) {
    console.error(
      "Firestore session preview failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown session preview error.",
      },
      { status: 500 }
    );
  }
}