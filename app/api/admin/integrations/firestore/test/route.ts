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
  prepareFirestoreImport,
} from "@/lib/integrations/firestore/firestore-importer";

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
    // 1. Protect this administrative endpoint
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
    // 2. Get the external Firestore project ID
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
    // Vercel OIDC
    //      ↓
    // Google Workload Identity Federation
    //      ↓
    // AMY Firestore Connector service account
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
    // 4. Query every subcollection called "events"
    //
    // Example:
    //
    // gameTelemetry
    //   └── telemetryId
    //         └── events
    //               └── eventDocument
    //
    // allDescendants=true performs a collection-group query.
    // ---------------------------------------------------------

    const queryUrl =
      `https://firestore.googleapis.com/v1/projects/` +
      `${encodeURIComponent(projectId)}` +
      `/databases/(default)/documents:runQuery`;

    const response = await fetch(
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

            limit: 100,
          },
        }),

        cache: "no-store",
      }
    );

    const result =
      await response.json();

    // ---------------------------------------------------------
    // 5. Handle Google / Firestore query errors
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
    // 6. Extract Firestore documents
    //
    // runQuery returns:
    //
    // [
    //   { document: {...} },
    //   { document: {...} }
    // ]
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
        authentication:
          "vercel-oidc-google-wif",
        connection:
          "firestore-rest",
        projectId,
        query:
          "collection-group",
        collection:
          "events",
        documentsFound: 0,
        message:
          "No external telemetry events were found.",
      });
    }

    // ---------------------------------------------------------
    // 7. Prepare the telemetry import
    //
    // This:
    //
    // - maps source events
    // - pseudonymizes the player
    // - groups events into sessions
    // - sorts them chronologically
    // - assigns eventSequence
    //
    // It DOES NOT write anything into AMY.
    // ---------------------------------------------------------

    const dryRun =
      prepareFirestoreImport(
        documents,
        "chiasmatic-calamity"
      );

    // ---------------------------------------------------------
    // 8. Determine the external player identifier
    //
    // Example Firestore document name:
    //
    // projects/candycrushtrial/
    // databases/(default)/
    // documents/
    // gameTelemetry/
    // 1779897291355/
    // events/
    // 4SJ2FUMi4B5UnwqJq7CU
    //
    // last item:
    //   event document ID
    //
    // third-to-last:
    //   telemetry / external player ID
    // ---------------------------------------------------------

    const firstDocument =
      documents[0];

    if (!firstDocument?.name) {
      throw new Error(
        "No Firestore telemetry document available for consent test."
      );
    }

   const pathParts =
  firstDocument.name.split("/");

const usersIndex =
  pathParts.lastIndexOf("users");

const externalPlayerId =
  usersIndex >= 0 &&
  usersIndex + 1 < pathParts.length
    ? pathParts[usersIndex + 1]
    : null;

if (!externalPlayerId) {
  throw new Error(
    "Unable to determine external player ID from Firestore document path."
  );
}
    // ---------------------------------------------------------
    // 9. Retrieve the external user's consent record
    //
    // IMPORTANT:
    //
    // We only use this source identity long enough to evaluate
    // whether AMY is allowed to import the player's research
    // telemetry.
    //
    // We do NOT return the user record or externalPlayerId.
    // ---------------------------------------------------------

const telemetryId =
  externalPlayerId;

const telemetryUrl =
  `https://firestore.googleapis.com/v1/projects/` +
  `${encodeURIComponent(projectId)}` +
  `/databases/(default)/documents/gameTelemetry/` +
  `${encodeURIComponent(telemetryId)}`;

const telemetryResponse =
  await fetch(
    telemetryUrl,
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

const telemetryDocument =
  telemetryResponse.ok
    ? await telemetryResponse.json()
    : null;



    const userUrl =
      `https://firestore.googleapis.com/v1/projects/` +
      `${encodeURIComponent(projectId)}` +
      `/databases/(default)/documents/users/` +
      `${encodeURIComponent(externalPlayerId)}`;

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

    // ---------------------------------------------------------
    // 10. Handle missing / inaccessible user record
    // ---------------------------------------------------------

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
    // 11. Evaluate research consent
    //
    // Required:
    //
    // consent.research == true
    // consent.ageVerified == true
    // ---------------------------------------------------------

    const consent =
      evaluateFirestoreConsent(
        userDocument
      );

    // ---------------------------------------------------------
    // 12. Return SAFE test result
    //
    // Deliberately excluded:
    //
    // externalPlayerId
    // uid
    // email
    // displayName
    // photoUrl
    //
    // No AMY database writes occur here.
    // ---------------------------------------------------------

    return NextResponse.json({
      success: true,

      authentication:
        "vercel-oidc-google-wif",

      connection:
        "firestore-rest",

      projectId,

      query:
        "collection-group",

      collection:
        "events",

      documentsFound:
        documents.length,

      consent,

      dryRun,
    });
  } catch (error) {
    // ---------------------------------------------------------
    // 13. Authentication / runtime errors
    // ---------------------------------------------------------

    console.error(
      "External Firestore collection-group test failed:",
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