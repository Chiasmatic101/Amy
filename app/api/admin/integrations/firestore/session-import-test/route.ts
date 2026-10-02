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
  readCompleteFirestoreSession,
} from "@/lib/integrations/firestore/firestore-session-reader";

import {
  validateFirestoreSessionDocuments,
} from "@/lib/integrations/firestore/firestore-session-validation";

import {
  evaluateFirestoreConsent,
} from "@/lib/integrations/firestore/firestore-consent";

import {
  processFirestoreSession,
} from "@/lib/integrations/firestore/firestore-session-processor";

import {
  writeProcessedFirestoreSession,
} from "@/lib/integrations/firestore/firestore-session-writer";

import {
  getAmyGoogleAuthClient,
} from "@/lib/integrations/firestore/vercel-google-auth";

import {
  RawFirestoreDocument,
} from "@/lib/integrations/firestore/firestore-mapper";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const INTEGRATION_ID =
  "chiasmatic-calamity-firestore";


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
          error:
            "Unauthorized.",
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
     * GOOGLE WIF AUTHENTICATION
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
     * DISCOVERY PAGE 1
     * =====================================================
     */

    const pageOne =
      await readFirestoreSyncPage(
        integration,
        token,
        100
      );

    if (
      !pageOne.nextCursor
    ) {
      throw new Error(
        "Unable to reach the modern telemetry test session."
      );
    }


    /*
     * =====================================================
     * DISCOVERY PAGE 2
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

    const discovery =
      discoverFirestoreSessions(
        pageTwo.documents
      );

    const identity =
      discovery.sessions[0];

    if (!identity) {
      throw new Error(
        "No modern Firestore session was discovered on the test page."
      );
    }


    /*
     * =====================================================
     * FETCH COMPLETE SESSION
     * =====================================================
     */

    const completeSession =
      await readCompleteFirestoreSession(
        integration,
        identity,
        token
      );


    /*
     * =====================================================
     * IDENTITY VALIDATION
     * =====================================================
     */

    const identityValidation =
      validateFirestoreSessionDocuments(
        identity,
        completeSession.documents
      );

    if (
      !identityValidation.valid
    ) {
      throw new Error(
        `Session ${completeSession.sessionId} failed identity validation.`
      );
    }


    /*
     * =====================================================
     * CONSENT VALIDATION
     * =====================================================
     */

    const userDocument =
      await readFirestoreUserDocument(
        integration.projectId,
        identity.uid,
        token
      );

    if (!userDocument) {
      throw new Error(
        "Source user profile was not found. Import denied."
      );
    }

    const consent =
      evaluateFirestoreConsent(
        userDocument
      );

    if (
      !consent.eligible
    ) {
      throw new Error(
        `Source player is not eligible for research import: ${consent.reason}.`
      );
    }


    /*
     * =====================================================
     * PRIVACY BOUNDARY
     * =====================================================
     *
     * Raw UID disappears from the canonical dataset here.
     */

    const processedSession =
      processFirestoreSession(
        integration,
        identity,
        completeSession,
        consent
      );


    /*
     * =====================================================
     * WRITE TO AMY
     * =====================================================
     */

    const writeResult =
      await writeProcessedFirestoreSession(
        integration,
        processedSession
      );


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

      source: {
        discoveryPage:
          2,

        discoveryDocuments:
          pageTwo.count,

        modernDocuments:
          discovery.modernDocumentCount,

        legacyDocuments:
          discovery.legacyDocumentCount,
      },

      validation: {
        identityValid:
          identityValidation.valid,

        researchConsent:
          consent.researchConsent,

        ageVerified:
          consent.ageVerified,
      },

      canonicalSession: {
        sessionId:
          processedSession.sessionId,

        playerHash:
          processedSession.playerHash,

        eventCount:
          processedSession.eventCount,

        completeness:
          processedSession.completeness,

        firstEventTimestamp:
          processedSession.firstEventTimestamp,

        lastEventTimestamp:
          processedSession.lastEventTimestamp,
      },

      write:
        writeResult,

      message:
        "Validated complete Firestore session imported into AMY.",
    });
  } catch (error) {
    console.error(
      "Firestore session import test failed:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown Firestore session import error.",
      },
      {
        status: 500,
      }
    );
  }
}