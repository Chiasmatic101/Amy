import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

async function resolvePublisherIdentity(
  publisherUserId: string
) {
  const snapshot = await adminDb
    .collection("identityMap")
    .where("publisherUserId", "==", publisherUserId)
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

    const publisherUserId =
      typeof body.publisherUserId === "string"
        ? body.publisherUserId
        : null;

    if (!publisherUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "publisherUserId is required",
        },
        { status: 400 }
      );
    }

    const researchId =
      await resolvePublisherIdentity(publisherUserId);

    if (!researchId) {
      return NextResponse.json(
        {
          success: false,
          error: "Publisher identity not registered",
        },
        { status: 404 }
      );
    }

    const event = {
      schemaVersion: "1.0",

      researchId,

      sourceUserId: publisherUserId,

      sessionId: body.sessionId ?? "unknown",

      source: "ad",

      ingestionSource:
        body.provider ?? "simulated_ad_provider",

      eventType: body.eventType ?? "unknown",
      gameId: body.gameId ?? "unknown",

      eventTimestamp:
        body.eventTimestamp ?? new Date().toISOString(),

      payload: {
        provider:
          body.provider ?? "simulated",

        adId:
          body.adId ?? null,

        placement:
          body.placement ?? null,

        format:
          body.format ?? null,

        ...(body.payload ?? {}),
      },

      receivedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb
      .collection("telemetryEvents")
      .add(event);

    return NextResponse.json({
      success: true,
      eventId: docRef.id,
      researchId,
      identityMatch: "publisherUserId",
    });
  } catch (error) {
    console.error("Ad telemetry error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to ingest ad event",
      },
      { status: 500 }
    );
  }
}