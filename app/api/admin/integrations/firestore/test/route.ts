import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAmyGoogleAuthClient,
} from "@/lib/integrations/firestore/vercel-google-auth";

import {
  evaluateFirestoreConsent,
} from "@/lib/integrations/firestore/firestore-consent";

import {
  RawFirestoreDocument,
} from "@/lib/integrations/firestore/firestore-mapper";

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

    if (suppliedSecret !== adminSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // 2. External Firestore project
    // ---------------------------------------------------------

    const projectId =
      process.env
        .CHIASMATIC_CALAMITY_PROJECT_ID;

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "CHIASMATIC_CALAMITY_PROJECT_ID is not configured.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 3. Authenticate
    //
    // Vercel
    //   ↓
    // Workload Identity Federation
    //   ↓
    // AMY Firestore Connector
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

    // ---------------------------------------------------------
    // 4. Retrieve newest telemetry event
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
              `Bearer ${accessToken.token}`,

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

              limit: 1,
            },
          }),

          cache: "no-store",
        }
      );

    const result =
      await response.json();

    // ---------------------------------------------------------
    // 5. Handle Firestore query errors
    // ---------------------------------------------------------

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
    // 6. Extract document
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

    if (documents.length === 0) {
      return NextResponse.json({
        success: true,

        documentsFound: 0,

        message:
          "No telemetry events were found.",
      });
    }

    const eventDocument =
      documents[0];

    if (!eventDocument?.name) {
      throw new Error(
        "Telemetry event does not contain a document path."
      );
    }

    // ---------------------------------------------------------
    // 7. Extract UID from document path
    //
    // Expected:
    //
    // users/{uid}/gameTelemetry/{sessionId}/events/{eventId}
    // ---------------------------------------------------------

    const pathParts =
      eventDocument.name.split("/");

    const usersIndex =
      pathParts.lastIndexOf(
        "users"
      );

    const pathUid =
      usersIndex >= 0 &&
      usersIndex + 1 <
        pathParts.length
        ? pathParts[
            usersIndex + 1
          ]
        : null;

    if (!pathUid) {
      return NextResponse.json(
        {
          success: false,

          stage:
            "identity-validation",

          reason:
            "Telemetry event does not contain a users/{uid} path.",

          legacyTelemetry:
            true,
        },
        { status: 422 }
      );
    }

    // ---------------------------------------------------------
    // 8. Extract UID stored in event
    // ---------------------------------------------------------

    const eventUid =
      eventDocument
        .fields
        ?.uid
        ?.stringValue ??
      null;

    if (!eventUid) {
      return NextResponse.json(
        {
          success: false,

          stage:
            "identity-validation",

          reason:
            "Telemetry event does not contain a uid field.",
        },
        { status: 422 }
      );
    }

    // ---------------------------------------------------------
    // 9. Verify path UID matches event UID
    //
    // We do NOT guess if they disagree.
    // ---------------------------------------------------------

    const identityValid =
      pathUid === eventUid;

    if (!identityValid) {
      return NextResponse.json(
        {
          success: false,

          stage:
            "identity-validation",

          identityValid:
            false,

          reason:
            "UID in telemetry path does not match UID stored in event.",
        },
        { status: 422 }
      );
    }

    // ---------------------------------------------------------
    // 10. Retrieve users/{uid}
    //
    // UID is used only for the source lookup.
    // ---------------------------------------------------------

    const userUrl =
      `https://firestore.googleapis.com/v1/projects/` +
      `${encodeURIComponent(projectId)}` +
      `/databases/(default)/documents/users/` +
      `${encodeURIComponent(pathUid)}`;

    const userResponse =
      await fetch(
        userUrl,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken.token}`,

            Accept:
              "application/json",
          },

          cache: "no-store",
        }
      );

    if (!userResponse.ok) {
      const errorText =
        await userResponse.text();

      throw new Error(
        `Unable to retrieve external user consent: ` +
        `${userResponse.status} ${errorText}`
      );
    }

    const userDocument =
      (await userResponse.json()) as
        RawFirestoreDocument;

    // ---------------------------------------------------------
    // 11. Evaluate consent
    //
    // Current AMY eligibility:
    //
    // consent.research === true
    // consent.ageVerified === true
    // ---------------------------------------------------------

    const consent =
      evaluateFirestoreConsent(
        userDocument
      );

    // ---------------------------------------------------------
    // 12. Return SAFE result
    //
    // Deliberately NOT returned:
    //
    // Firebase UID
    // email
    // displayName
    // photoUrl
    //
    // No AMY database write occurs.
    // ---------------------------------------------------------

    return NextResponse.json({
      success: true,

      authentication:
        "vercel-oidc-google-wif",

      connection:
        "firestore-rest",

      projectId,

      identity: {
        valid: true,

        pathUidPresent:
          true,

        eventUidPresent:
          true,

        pathAndEventUidMatch:
          true,
      },

      consent,

      importEligible:
        consent.eligible,

      message:
        consent.eligible
          ? "Telemetry identity and research consent validated. Event is eligible for AMY import."
          : "Telemetry identity validated, but consent requirements are not satisfied.",
    });
  } catch (error) {
    console.error(
      "External Firestore consent test failed:",
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
            : "Unknown connection error.",
      },
      { status: 500 }
    );
  }
}