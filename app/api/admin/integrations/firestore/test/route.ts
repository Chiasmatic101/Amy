import { NextRequest, NextResponse } from "next/server";
import { getAmyGoogleAuthClient } from "@/lib/integrations/firestore/vercel-google-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
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

    // Vercel OIDC -> Google WIF ->
    // AMY Firestore Connector service account
    const authClient = getAmyGoogleAuthClient();

    const accessToken =
      await authClient.getAccessToken();

    if (!accessToken.token) {
      throw new Error(
        "Google Workload Identity Federation did not return an access token."
      );
    }

    // Read the external Firestore directly through
    // Google's Firestore REST API.
const url =
  `https://firestore.googleapis.com/v1/projects/` +
  `${encodeURIComponent(projectId)}` +
  `/databases/(default)/documents/gameTelemetry?pageSize=20`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          stage: "firestore-read",
          status: response.status,
          googleError: result,
        },
        { status: 500 }
      );
    }

    const documents =
      Array.isArray(result.documents)
        ? result.documents
        : [];

  const telemetryDocuments = documents.map(
  (document: {
    name?: string;
    fields?: Record<string, unknown>;
  }) => ({
    telemetryId:
      document.name?.split("/").pop() ?? null,
    fieldsPresent:
      Object.keys(document.fields ?? {}),
  })
);

  return NextResponse.json({
  success: true,
  authentication: "vercel-oidc-google-wif",
  connection: "firestore-rest",
  projectId,
  collection: "gameTelemetry",
  documentsFound: documents.length,
  telemetryDocuments,
});
  } catch (error) {
    console.error(
      "External Firestore connection test failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        stage: "authentication",
        error:
          error instanceof Error
            ? error.message
            : "Unknown connection error.",
      },
      { status: 500 }
    );
  }
}