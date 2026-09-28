import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const event = {
      schemaVersion: "1.0",

      researchId: body.researchId ?? "anonymous",
      sessionId: body.sessionId ?? "unknown",

      source: body.source ?? "game",
      eventType: body.eventType ?? "unknown",
      gameId: body.gameId ?? "unknown",

      payload: body.payload ?? {},

      receivedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb
      .collection("telemetryEvents")
      .add(event);

    return NextResponse.json({
      success: true,
      eventId: docRef.id,
    });
  } catch (error) {
    console.error("Telemetry ingestion error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to ingest telemetry event",
      },
      { status: 500 }
    );
  }
}