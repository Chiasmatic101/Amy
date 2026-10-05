import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAmyGoogleAuthClient,
} from "@/lib/integrations/firestore/vercel-google-auth";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


type TestConnectionRequest = {
  projectId?: string;
};


export async function POST(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * 1. READ REQUEST
     * =====================================================
     */

    const body =
      (await request.json()) as
        TestConnectionRequest;

    const projectId =
      body.projectId?.trim();


    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          stage: "validation",
          error:
            "Google Cloud project ID is required.",
        },
        {
          status: 400,
        }
      );
    }


    /*
     * Basic defensive validation.
     *
     * Google Cloud project IDs contain lowercase letters,
     * numbers and hyphens.
     */

    const validProjectId =
      /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(
        projectId
      );


    if (!validProjectId) {
      return NextResponse.json(
        {
          success: false,
          stage: "validation",
          error:
            "The Google Cloud project ID does not appear to be valid.",
        },
        {
          status: 400,
        }
      );
    }


    /*
     * =====================================================
     * 2. AUTHENTICATE AMY
     * =====================================================
     *
     * Vercel
     *   ↓
     * Workload Identity Federation
     *   ↓
     * AMY Firestore Connector
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


    /*
     * =====================================================
     * 3. TEST FIRESTORE READ ACCESS
     * =====================================================
     *
     * We perform a minimal read-only query.
     *
     * This does NOT import telemetry and does NOT write
     * anything to either Firestore project.
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


    /*
     * =====================================================
     * 4. HANDLE GOOGLE RESPONSE
     * =====================================================
     */

    if (!response.ok) {
      const googleError =
        await response.text();


      if (
        response.status === 403
      ) {
        return NextResponse.json(
          {
            success: false,

            stage:
              "firestore-permission",

            error:
              "AMY cannot read this Firestore project. Confirm that the AMY service account has been granted the Cloud Datastore Viewer role.",

            googleStatus:
              response.status,
          },
          {
            status: 403,
          }
        );
      }


      if (
        response.status === 404
      ) {
        return NextResponse.json(
          {
            success: false,

            stage:
              "firestore-project",

            error:
              "The Firestore project or default database could not be found. Check the project ID and confirm that Firestore has been created.",

            googleStatus:
              response.status,
          },
          {
            status: 404,
          }
        );
      }


      console.error(
        "Firestore onboarding connection test failed:",
        response.status,
        googleError
      );


      return NextResponse.json(
        {
          success: false,

          stage:
            "firestore-connection",

          error:
            "AMY could not connect to this Firestore project.",

          googleStatus:
            response.status,
        },
        {
          status: 502,
        }
      );
    }


    /*
     * =====================================================
     * 5. SUCCESS
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      projectId,

      provider:
        "firestore",

      authentication:
        "google-wif",

      access:
        "read-only",

      message:
        "AMY successfully connected to this Firestore project.",
    });

  } catch (error) {
    console.error(
      "Firestore onboarding connection test failed:",
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
            : "Unknown Firestore connection error.",
      },
      {
        status: 500,
      }
    );
  }
}