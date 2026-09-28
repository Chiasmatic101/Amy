import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("telemetryEvents")
      .orderBy("receivedAt", "desc")
      .limit(500)
      .get();

    const events = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        schemaVersion: data.schemaVersion ?? "1.0",
        researchId: data.researchId ?? "unknown",
        sessionId: data.sessionId ?? "unknown",
        source: data.source ?? "unknown",
        eventType: data.eventType ?? "unknown",
        gameId: data.gameId ?? "unknown",
        payload: data.payload ?? {},
        receivedAt:
          data.receivedAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error("Telemetry read error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to read telemetry",
      },
      { status: 500 }
    );
  }
}