import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getFirestoreIntegration,
} from "@/lib/integrations/firestore/firestore-integration";

import {
  buildFirestoreSyncQuery,
} from "@/lib/integrations/firestore/firestore-sync";

import {
  getAmyGoogleAuthClient,
} from "@/lib/integrations/firestore/vercel-google-auth";

import {
  RawFirestoreDocument,
} from "@/lib/integrations/firestore/firestore-mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTEGRATION_ID =
  "chiasmatic-calamity-firestore";

function getDocumentPath(
  documentName?: string
): string | null {
  if (!documentName) {
    return null;
  }

  const marker =
    "/documents/";

  const index =
    documentName.indexOf(marker);

  if (index === -1) {
    return null;
  }

  return documentName.substring(
    index + marker.length
  );
}

function getStringField(
  document: RawFirestoreDocument,
  fieldName: string
): string | null {
  const value =
    document.fields?.[fieldName];

  if (!value) {
    return null;
  }

  if (
    typeof value.stringValue ===
    "string"
  ) {
    return value.stringValue;
  }

  if (
    typeof value.timestampValue ===
    "string"
  ) {
    return value.timestampValue;
  }

  return null;
}

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
     * BUILD ASCENDING SYNC QUERY
     * =====================================================
     */

    const query =
      buildFirestoreSyncQuery(
        integration,
        100
      );

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
     * RUN EXTERNAL FIRESTORE QUERY
     * =====================================================
     */

    const queryUrl =
      `https://firestore.googleapis.com/v1/projects/` +
      `${encodeURIComponent(integration.projectId)}` +
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

          body:
            JSON.stringify(query),

          cache:
            "no-store",
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
 * =====================================================
 * OPTIONAL SECOND-PAGE TEST
 * =====================================================
 *
 * ?next=true proves that the cursor generated from
 * page 1 correctly retrieves page 2.
 *
 * Nothing is persisted.
 */

let secondPage:
  | {
      returned: number;
      firstTimestamp: string | null;
      firstDocumentPath: string | null;
      lastTimestamp: string | null;
      lastDocumentPath: string | null;
    }
  | null = null;

const testNextPage =
  request.nextUrl.searchParams.get(
    "next"
  ) === "true";

if (
  testNextPage &&
  documents.length > 0
) {
  const lastPageOneDocument =
    documents[
      documents.length - 1
    ];

  const cursorTimestamp =
    getStringField(
      lastPageOneDocument,
      integration.timestampField
    );

  const cursorDocumentPath =
    getDocumentPath(
      lastPageOneDocument.name
    );

  if (
    cursorTimestamp &&
    cursorDocumentPath
  ) {
    const secondPageIntegration = {
      ...integration,

      watermarkTimestamp:
        cursorTimestamp,

      watermarkEventId:
        cursorDocumentPath,
    };

    const secondQuery =
      buildFirestoreSyncQuery(
        secondPageIntegration,
        100
      );

    const secondResponse =
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

          body:
            JSON.stringify(
              secondQuery
            ),

          cache:
            "no-store",
        }
      );

    const secondResult =
      await secondResponse.json();

    if (!secondResponse.ok) {
      return NextResponse.json(
        {
          success: false,

          stage:
            "second-page-query",

          status:
            secondResponse.status,

          googleError:
            secondResult,
        },
        { status: 500 }
      );
    }

    const secondDocuments =
      (
        Array.isArray(
          secondResult
        )
          ? secondResult
          : []
      )
        .map(
          (item) =>
            item.document
        )
        .filter(Boolean) as
        RawFirestoreDocument[];

    const firstSecondPage =
      secondDocuments[0];

    const lastSecondPage =
      secondDocuments[
        secondDocuments.length - 1
      ];

    secondPage = {
      returned:
        secondDocuments.length,

      firstTimestamp:
        firstSecondPage
          ? getStringField(
              firstSecondPage,
              integration.timestampField
            )
          : null,

      firstDocumentPath:
        firstSecondPage
          ? getDocumentPath(
              firstSecondPage.name
            )
          : null,

      lastTimestamp:
        lastSecondPage
          ? getStringField(
              lastSecondPage,
              integration.timestampField
            )
          : null,

      lastDocumentPath:
        lastSecondPage
          ? getDocumentPath(
              lastSecondPage.name
            )
          : null,
    };
  }
}


    /*
     * =====================================================
     * DETERMINE POTENTIAL NEXT WATERMARK
     * =====================================================
     *
     * PREVIEW ONLY.
     *
     * We calculate it but DO NOT save it.
     */

    const lastDocument =
      documents[
        documents.length - 1
      ];

    let nextWatermark:
      | {
          timestamp: string;
          documentPath: string;
        }
      | null = null;

    if (lastDocument) {
      const timestamp =
        getStringField(
          lastDocument,
          integration.timestampField
        );

      const documentPath =
        getDocumentPath(
          lastDocument.name
        );

      if (
        timestamp &&
        documentPath
      ) {
        nextWatermark = {
          timestamp,
          documentPath,
        };
      }
    }

    /*
     * =====================================================
     * SAFE EVENT PREVIEW
     * =====================================================
     *
     * Do NOT expose UID.
     */

    const preview =
      documents
        .slice(0, 10)
        .map(
          (document) => ({
            documentPath:
              getDocumentPath(
                document.name
              ),

            timestamp:
              getStringField(
                document,
                integration.timestampField
              ),

            event:
              getStringField(
                document,
                integration.eventField
              ),

            sessionId:
              getStringField(
                document,
                integration.sessionIdField
              ),
          })
        );

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

      currentWatermark: {
        timestamp:
          integration.watermarkTimestamp,

        documentPath:
          integration.watermarkEventId,
      },

      page: {
        requested:
          100,

        returned:
          documents.length,

        hasPotentialNextPage:
          documents.length === 100,
      },

      nextWatermark,

      secondPage,

      preview,

      message:
        "Read-only synchronization preview completed. No events were imported and the watermark was not changed.",
    });
  } catch (error) {
    console.error(
      "Firestore sync preview failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown synchronization preview error.",
      },
      { status: 500 }
    );
  }
}