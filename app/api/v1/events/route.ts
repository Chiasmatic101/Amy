import crypto from "crypto";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { hashApiKey } from "@/lib/api-keys";

type IncomingEvent = {
  eventId: string;
  playerId: string;
  sessionId: string;
  eventSequence: number;
  event: string;
  timestamp?: string;
  data?: Record<string, unknown>;
};

function pseudonymizePlayerId(
  gameId: string,
  playerId: string
) {
  return crypto
    .createHash("sha256")
    .update(`${gameId}:${playerId}`)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    // --------------------------------------------------
    // 1. Read Bearer API key
    // --------------------------------------------------

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid Authorization header",
        },
        { status: 401 }
      );
    }

    const apiKey = authorization
      .slice("Bearer ".length)
      .trim();

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // 2. Authenticate client
    // --------------------------------------------------

    const keyHash = hashApiKey(apiKey);

    const keySnapshot = await adminDb
      .collection("apiKeys")
      .where("keyHash", "==", keyHash)
      .where("active", "==", true)
      .limit(1)
      .get();

    if (keySnapshot.empty) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    const credential =
      keySnapshot.docs[0].data();

    const gameId = credential.gameId;

    if (!gameId || typeof gameId !== "string") {
      return NextResponse.json(
        { error: "Invalid credential configuration" },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // 3. Make sure game is active
    // --------------------------------------------------

    const gameDoc = await adminDb
      .collection("games")
      .doc(gameId)
      .get();

    if (!gameDoc.exists) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    const game = gameDoc.data();

    if (game?.status !== "active") {
      return NextResponse.json(
        { error: "Game is not active" },
        { status: 403 }
      );
    }

    // --------------------------------------------------
    // 4. Parse incoming event
    // --------------------------------------------------

    const body =
      (await request.json()) as IncomingEvent;

    const {
      eventId,
      playerId,
      sessionId,
      eventSequence,
      event,
      timestamp,
      data,
    } = body;

    // --------------------------------------------------
    // 5. Validate incoming event
    // --------------------------------------------------

    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(eventSequence) ||
      eventSequence < 0
    ) {
      return NextResponse.json(
        {
          error:
            "eventSequence must be a non-negative integer",
        },
        { status: 400 }
      );
    }

    if (!playerId || typeof playerId !== "string") {
      return NextResponse.json(
        { error: "playerId is required" },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    if (!event || typeof event !== "string") {
      return NextResponse.json(
        { error: "event is required" },
        { status: 400 }
      );
    }

    if (
      data !== undefined &&
      (typeof data !== "object" ||
        data === null ||
        Array.isArray(data))
    ) {
      return NextResponse.json(
        { error: "data must be an object" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 6. Validate client timestamp
    // --------------------------------------------------

    let eventTimestamp: string;

    if (timestamp) {
      const parsedTimestamp = new Date(timestamp);

      if (Number.isNaN(parsedTimestamp.getTime())) {
        return NextResponse.json(
          {
            error:
              "timestamp must be a valid ISO date",
          },
          { status: 400 }
        );
      }

      eventTimestamp = parsedTimestamp.toISOString();
    } else {
      eventTimestamp = new Date().toISOString();
    }

    // --------------------------------------------------
    // 7. Pseudonymize external player ID
    // --------------------------------------------------

    const playerHash = pseudonymizePlayerId(
      gameId,
      playerId
    );

    // --------------------------------------------------
    // 8. Create deterministic event document ID
    // --------------------------------------------------

    const eventDocumentId = crypto
      .createHash("sha256")
      .update(`${gameId}:${eventId}`)
      .digest("hex");

    const eventRef = adminDb
      .collection("gameEvents")
      .doc(eventDocumentId);

    // --------------------------------------------------
    // 9. Check for duplicate event
    // --------------------------------------------------

    const existingEvent = await eventRef.get();

    if (existingEvent.exists) {
      return NextResponse.json(
        {
          success: true,
          duplicate: true,
          eventId,
          gameId,
          receivedAt: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // --------------------------------------------------
    // 10. Store event
    // --------------------------------------------------

    await eventRef.set({
      eventId,
      gameId,
      playerHash,
      sessionId,
      eventSequence,
      event,
      eventTimestamp,
      data: data ?? {},
      schemaVersion: "1.0",
      environment:
        credential.environment ?? "test",
      receivedAt: FieldValue.serverTimestamp(),
    });

    // --------------------------------------------------
    // 11. Confirm receipt
    // --------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        duplicate: false,
        eventId,
        gameId,
        receivedAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Event ingestion failed:",
      error
    );

    return NextResponse.json(
      { error: "Event ingestion failed" },
      { status: 500 }
    );
  }
}