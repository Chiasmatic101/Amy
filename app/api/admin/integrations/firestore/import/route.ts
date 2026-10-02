import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAmyGoogleAuthClient,
} from "@/lib/integrations/firestore/vercel-google-auth";

import {
  RawFirestoreDocument,
} from "@/lib/integrations/firestore/firestore-mapper";

import {
  prepareConsentAwareFirestoreImport,
} from "@/lib/integrations/firestore/firestore-consent-importer";

import {
  writeConsentAwareImportToAmy,
} from "@/lib/integrations/firestore/firestore-importer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
     * EXTERNAL PROJECT CONFIGURATION
     * =====================================================
     */

    const projectIdEnv =
      process.env
        .CHIASMATIC_CALAMITY_PROJECT_ID;

    if (!projectIdEnv) {
      return NextResponse.json(
        {
          success: false,
          error:
            "CHIASMATIC_CALAMITY_PROJECT_ID is not configured.",
        },
        { status: 500 }
      );
    }

    /*
     * Explicit string avoids the TypeScript narrowing
     * problem we encountered in the dry-run route.
     */

    const projectId: string =
      projectIdEnv;

    const gameId =
      "chiasmatic-calamity";

    /*
     * =====================================================
     * GOOGLE WORKLOAD IDENTITY FEDERATION
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
     * READ EXTERNAL TELEMETRY
     * =====================================================
     */

    const queryUrl =
      `https://firestore.googleapis.com/v1/projects/` +
      `${encodeURIComponent(projectId)}` +
      `/databases/(default)/documents:runQuery`;

    const response =
      await fetch(
        queryUrl,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify({
            structuredQuery: {
              from: [
                {
                  collectionId:
                    "events",

                  allDescendants:
                    true,
                },
              ],

              orderBy: [
                {
                  field: {
                    fieldPath:
                      "createdAt",
                  },

                  direction:
                    "DESCENDING",
                },
              ],

              /*
               * Prototype import window.
               *
               * Later we'll replace this with
               * incremental synchronization.
               */

              limit: 100,
            },
          }),

          cache: "no-store",
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,

          stage:
            "firestore-query",

          status:
            response.status,

          googleError:
            result,
        },
        { status: 500 }
      );
    }

    const queryResults =
      Array.isArray(result)
        ? result
        : [];

    const documents =
      queryResults
        .map(
          (item) =>
            item.document
        )
        .filter(Boolean) as
        RawFirestoreDocument[];

    /*
     * Nothing available to import.
     */

    if (
      documents.length === 0
    ) {
      return NextResponse.json({
        success: true,

        projectId,

        gameId,

        sourceDocumentCount:
          0,

        received:
          0,

        created:
          0,

        duplicates:
          0,

        message:
          "No external telemetry events were found.",
      });
    }

    /*
     * =====================================================
     * EXTERNAL USER LOOKUP
     * =====================================================
     *
     * The consent-aware importer calls this once
     * for each unique source player.
     *
     * The returned source profile stays inside
     * the consent-validation layer.
     */

    async function getUserDocument(
      uid: string
    ): Promise<
      RawFirestoreDocument | null
    > {
      const userUrl =
        `https://firestore.googleapis.com/v1/projects/` +
        `${encodeURIComponent(projectId)}` +
        `/databases/(default)/documents/users/` +
        `${encodeURIComponent(uid)}`;

      const userResponse =
        await fetch(
          userUrl,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,

              Accept:
                "application/json",
            },

            cache:
              "no-store",
          }
        );

      if (
        userResponse.status ===
        404
      ) {
        return null;
      }

      if (
        !userResponse.ok
      ) {
        throw new Error(
          `External user lookup failed with status ${userResponse.status}.`
        );
      }

      return (
        await userResponse.json()
      ) as RawFirestoreDocument;
    }

    /*
     * =====================================================
     * VALIDATE + PSEUDONYMIZE
     * =====================================================
     */

    const prepared =
      await prepareConsentAwareFirestoreImport(
        documents,
        gameId,
        getUserDocument
      );

    /*
     * =====================================================
     * WRITE TO AMY
     * =====================================================
     */

    const writeResult =
      await writeConsentAwareImportToAmy(
        prepared
      );

    /*
     * =====================================================
     * SAFE RESPONSE
     * =====================================================
     *
     * Do not return:
     *
     * - Firebase UID
     * - email
     * - displayName
     * - external user profile
     */

    return NextResponse.json({
      success: true,

      authentication:
        "vercel-oidc-google-wif",

      connection:
        "firestore-rest",

      projectId,

      gameId,

      sourceDocumentCount:
        prepared.sourceDocumentCount,

      eligibleDocumentCount:
        prepared.eligibleDocumentCount,

      skipped: {
        identity:
          prepared.skippedIdentity,

        identityMismatch:
          prepared.skippedIdentityMismatch,

        consent:
          prepared.skippedConsent,

        invalid:
          prepared.invalidDocuments,
      },

      players: {
        checked:
          prepared.playersChecked,

        eligible:
          prepared.eligiblePlayers,
      },

      sessions: {
        count:
          prepared.sessionCount,
      },

      write: {
        received:
          writeResult.received,

        created:
          writeResult.created,

        duplicates:
          writeResult.duplicates,

        writtenAt:
          writeResult.writtenAt,
      },

      message:
        "Consent-aware Firestore import completed.",
    });
  } catch (error) {
    console.error(
      "Consent-aware Firestore import failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        stage:
          "authentication-or-runtime",

        error:
          error instanceof Error
            ? error.message
            : "Unknown import error.",
      },
      { status: 500 }
    );
  }
}