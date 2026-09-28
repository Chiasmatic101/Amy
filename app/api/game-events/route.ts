import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

async function resolveDeveloperIdentity(
  developerUserId: string
) {
  const snapshot = await adminDb
    .collection("identityMap")
    .where("developerUserId", "==", developerUserId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data().researchId as string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // --------------------------------------------------
    // 1. Validate external developer identity
    // --------------------------------------------------

    const developerUserId =
      typeof body.developerUserId === "string"
        ? body.developerUserId
        : null;

    if (!developerUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "developerUserId is required",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 2. Resolve external ID -> AMY research ID
    // --------------------------------------------------

    const researchId =
      await resolveDeveloperIdentity(developerUserId);

    if (!researchId) {
      return NextResponse.json(
        {
          success: false,
          error: "Developer identity not registered",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 3. Build pseudonymized research event
    //
    // IMPORTANT:
    // developerUserId is deliberately NOT stored here.
    // --------------------------------------------------

    const event = {
      schemaVersion: "1.1",

      researchId,

      sessionId:
        typeof body.sessionId === "string"
          ? body.sessionId
          : "unknown",

      eventSequence:
        typeof body.eventSequence === "number"
          ? body.eventSequence
          : null,

      eventTimestamp:
        typeof body.eventTimestamp === "string"
          ? body.eventTimestamp
          : new Date().toISOString(),

      source: "game",

      ingestionSource: "game_developer_api",

      gameId:
        typeof body.gameId === "string"
          ? body.gameId
          : "unknown",

      gameVersion:
        typeof body.gameVersion === "string"
          ? body.gameVersion
          : "unknown",

      eventType:
        typeof body.eventType === "string"
          ? body.eventType
          : "unknown",

      payload:
        body.payload &&
        typeof body.payload === "object"
          ? body.payload
          : {},

      receivedAt:
        FieldValue.serverTimestamp(),
    };

    // --------------------------------------------------
    // 4. Store append-only event
    // --------------------------------------------------

    const docRef = await adminDb
      .collection("telemetryEvents")
      .add(event);

    return NextResponse.json({
      success: true,

      eventId: docRef.id,

      // Returning researchId is useful while developing.
      // We can remove this from the public API later.
      researchId,

      identityMatch: "developerUserId",
    });
  } catch (error) {
    console.error(
      "Game telemetry error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to ingest game event",
      },
      { status: 500 }
    );
  }
}