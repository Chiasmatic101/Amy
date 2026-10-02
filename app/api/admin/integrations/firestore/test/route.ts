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
    // 3. Authenticate to Google
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
    // 4. Collection-group query
    //
    // Find documents in every collection named "events".
    //
    // For this diagnostic we only need ONE document.
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

              limit: 1,
            },
          }),

          cache: "no-store",
        }
      );

    const result =
      await response.json();

    // ---------------------------------------------------------
    // 5. Firestore error handling
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
    // 6. Extract returned documents
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

        diagnostic: true,

        projectId,

        documentsFound: 0,

        message:
          "No external telemetry events were found.",
      });
    }

    // ---------------------------------------------------------
    // 7. Inspect exactly what Firestore returned
    // ---------------------------------------------------------

    const firstDocument =
      documents[0];

    if (!firstDocument) {
      throw new Error(
        "No Firestore document available for inspection."
      );
    }

    const documentName =
      firstDocument.name ?? null;

    const fields =
      firstDocument.fields ?? {};

    const fieldNames =
      Object.keys(fields);

    // ---------------------------------------------------------
    // 8. Inspect the Firestore path
    //
    // We are specifically looking for whether the path is:
    //
    // users/{uid}/gameTelemetry/{sessionId}/events/{eventId}
    //
    // OR:
    //
    // gameTelemetry/{sessionId}/events/{eventId}
    // ---------------------------------------------------------

    const pathParts =
      documentName
        ? documentName.split("/")
        : [];

    const usersIndex =
      pathParts.lastIndexOf(
        "users"
      );

    const uidFromPath =
      usersIndex >= 0 &&
      usersIndex + 1 <
        pathParts.length
        ? pathParts[
            usersIndex + 1
          ]
        : null;

    const gameTelemetryIndex =
      pathParts.lastIndexOf(
        "gameTelemetry"
      );

    const sessionFromPath =
      gameTelemetryIndex >= 0 &&
      gameTelemetryIndex + 1 <
        pathParts.length
        ? pathParts[
            gameTelemetryIndex + 1
          ]
        : null;

    // ---------------------------------------------------------
    // 9. Inspect UID field
    //
    // Do NOT attempt mapping yet.
    // Do NOT attempt consent yet.
    //
    // We first want to know what the source actually contains.
    // ---------------------------------------------------------

    const uidValue =
      fields.uid ?? null;

    const sessionIdValue =
      fields.sessionId ?? null;

    const eventValue =
      fields.event ?? null;

    const createdAtValue =
      fields.createdAt ?? null;

    // ---------------------------------------------------------
    // 10. Return diagnostic information
    //
    // TEMPORARY ADMIN DIAGNOSTIC ONLY.
    //
    // This may expose the source UID if one exists.
    // Once we understand the schema, this diagnostic response
    // should be removed.
    // ---------------------------------------------------------

    return NextResponse.json({
      success: true,

      diagnostic: true,

      authentication:
        "vercel-oidc-google-wif",

      connection:
        "firestore-rest",

      projectId,

      documentsFound:
        documents.length,

      documentName,

      pathAnalysis: {
        pathParts,

        usersIndex,

        uidFromPath,

        gameTelemetryIndex,

        sessionFromPath,
      },

      fieldNames,

      fieldAnalysis: {
        hasUidField:
          Object.prototype
            .hasOwnProperty
            .call(
              fields,
              "uid"
            ),

        uidValue,

        sessionIdValue,

        eventValue,

        createdAtValue,
      },
    });
  } catch (error) {
    console.error(
      "External Firestore diagnostic failed:",
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