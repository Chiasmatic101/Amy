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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest
) {
  try {
    // ---------------------------------------------------------
    // 1. Protect administrative endpoint
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // 2. External project
    // ---------------------------------------------------------

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

const projectId: string =
  projectIdEnv;
    const gameId =
      "chiasmatic-calamity";

    // ---------------------------------------------------------
    // 3. Authenticate to external Google project
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // 4. Query external telemetry
    //
    // For the prototype we inspect the newest 100 events.
    //
    // This is NOT yet our production synchronization strategy.
    // Later we'll add pagination / watermarks.
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // 5. Extract Firestore documents
    // ---------------------------------------------------------

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

    if (
      documents.length === 0
    ) {
      return NextResponse.json({
        success: true,

        dryRun: true,

        projectId,

        gameId,

        message:
          "No external telemetry events were found.",

        sourceDocumentCount:
          0,
      });
    }

    // ---------------------------------------------------------
    // 6. External user lookup
    //
    // Called ONCE for each unique UID by the consent-aware
    // importer.
    //
    // The raw UID never enters the final result.
    // ---------------------------------------------------------

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

      /*
       * Missing user record:
       *
       * fail closed.
       */

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

    // ---------------------------------------------------------
    // 7. Prepare consent-aware import
    //
    // This:
    //
    // ✓ validates path UID
    // ✓ validates event UID
    // ✓ checks UID consistency
    // ✓ checks consent once per player
    // ✓ excludes ineligible players
    // ✓ pseudonymizes eligible players
    // ✓ reconstructs sessions
    // ✓ assigns eventSequence
    //
    // It DOES NOT write to AMY.
    // ---------------------------------------------------------

    const prepared =
      await prepareConsentAwareFirestoreImport(
        documents,
        gameId,
        getUserDocument
      );

    // ---------------------------------------------------------
    // 8. Produce a compact session preview
    //
    // We don't need to dump all event data into PowerShell.
    // ---------------------------------------------------------

    const sessionPreview =
      prepared.sessions.map(
        (session) => ({
          sessionId:
            session.sessionId,

          playerHash:
            session.playerHash,

          eventCount:
            session.eventCount,

          firstEventTimestamp:
            session.firstEventTimestamp,

          lastEventTimestamp:
            session.lastEventTimestamp,

          events:
            session.events.map(
              (event) => ({
                eventSequence:
                  event.eventSequence,

                eventId:
                  event.eventId,

                event:
                  event.event,

                eventTimestamp:
                  event.eventTimestamp,
              })
            ),
        })
      );

    // ---------------------------------------------------------
    // 9. SAFE response
    //
    // No Firebase UID.
    // No email.
    // No display name.
    // No profile data.
    // No AMY writes.
    // ---------------------------------------------------------

    return NextResponse.json({
      success: true,

      dryRun: true,

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

        preview:
          sessionPreview,
      },

      message:
        "Consent-aware Firestore import dry run completed. No AMY data was written.",
    });
  } catch (error) {
    console.error(
      "Consent-aware Firestore dry run failed:",
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