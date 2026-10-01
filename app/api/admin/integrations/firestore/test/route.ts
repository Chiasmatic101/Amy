import { NextRequest, NextResponse } from "next/server";

import { getExternalFirestore } from "@/lib/integrations/firestore/firestore-connector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Protect this administrative endpoint.
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

    // Authenticate through:
    // Vercel OIDC -> Google WIF -> AMY Firestore Connector
    const externalDb =
      await getExternalFirestore(projectId);

    // Read only a few documents.
    // We deliberately do not return uid or other player data.
    const snapshot = await externalDb
      .collection("events")
      .limit(5)
      .get();

    const sampleEvents = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        documentId: doc.id,
        event:
          typeof data.event === "string"
            ? data.event
            : null,
        sessionIdPresent:
          typeof data.sessionId === "string",
        timestampPresent:
          data.createdAt != null,
      };
    });

    return NextResponse.json({
      success: true,
      connection: "firestore",
      projectId,
      collection: "events",
      documentsFound: snapshot.size,
      sampleEvents,
    });
  } catch (error) {
    console.error(
      "External Firestore connection test failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown connection error.",
      },
      { status: 500 }
    );
  }
}