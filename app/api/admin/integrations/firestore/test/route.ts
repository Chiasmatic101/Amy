import { NextRequest, NextResponse } from "next/server";

import { getAmyGoogleAuthClient } from "@/lib/integrations/firestore/vercel-google-auth";

import {
  prepareFirestoreImport,
} from "@/lib/integrations/firestore/firestore-importer";

import {
  RawFirestoreDocument,
} from "@/lib/integrations/firestore/firestore-mapper";

import {
  mapFirestoreEvent,
} from "@/lib/integrations/firestore/firestore-mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // ---------------------------------------------------------
    // 1. Protect this administrative endpoint
    // ---------------------------------------------------------

    const adminSecret = process.env.AMY_ADMIN_SECRET;

    if (!adminSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "AMY_ADMIN_SECRET is not configured.",
        },
        { status: 500 }
      );
    }

    const suppliedSecret =
      request.headers.get("x-amy-admin-secret");

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
      process.env.CHIASMATIC_CALAMITY_PROJECT_ID;

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

    const authClient = getAmyGoogleAuthClient();

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
    // Example external structure:
    //
    // gameTelemetry
    //   ├── telemetryId-A
    //   │      └── events
    //   │            └── eventDocument
    //   │
    //   └── telemetryId-B
    //          └── events
    //                └── eventDocument
    //
    // allDescendants=true performs a collection-group query.
    // ---------------------------------------------------------

    const url =
      `https://firestore.googleapis.com/v1/projects/` +
      `${encodeURIComponent(projectId)}` +
      `/databases/(default)/documents:runQuery`;

    const response = await fetch(url, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify({
        structuredQuery: {
          from: [
            {
              collectionId: "events",
              allDescendants: true,
            },
          ],

          limit: 100,
        },
      }),

      cache: "no-store",
    });

    const result = await response.json();

    // ---------------------------------------------------------
    // 5. Handle Google / Firestore errors
    // ---------------------------------------------------------

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          stage: "firestore-query",
          status: response.status,
          googleError: result,
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 6. Firestore runQuery returns an array:
    //
    // [
    //   { document: {...} },
    //   { document: {...} }
    // ]
    //
    // Extract the actual documents.
    // ---------------------------------------------------------

    const queryResults =
      Array.isArray(result)
        ? result
        : [];

    const documents = queryResults
      .map((item) => item.document)
      .filter(Boolean);

    // ---------------------------------------------------------
    // 7. Return a SAFE sample
    //
    // We deliberately do NOT return:
    //
    // uid
    // email
    // displayName
    // photoUrl
    //
    // This endpoint is only proving that AMY can discover
    // gameplay events across telemetry IDs.
    // ---------------------------------------------------------
const dryRun = prepareFirestoreImport(
  documents as RawFirestoreDocument[],
  "chiasmatic-calamity"
);
        /*
          A document name should look approximately like:

          projects/candycrushtrial/
          databases/(default)/
          documents/
          gameTelemetry/
          1779897291355/
          events/
          4SJ2FUMi4B5UnwqJq7CU

          Therefore:

          last item     = event document ID
          third-to-last = telemetry ID
        */


    // ---------------------------------------------------------
    // 8. Successful result
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

  dryRun,
});

  } catch (error) {
    // ---------------------------------------------------------
    // 9. Authentication / unexpected errors
    // ---------------------------------------------------------

    console.error(
      "External Firestore collection-group test failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        stage: "authentication-or-runtime",

        error:
          error instanceof Error
            ? error.message
            : "Unknown connection error.",
      },
      { status: 500 }
    );
  }
}