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

type ValidatedEvent = IncomingEvent & {
  eventTimestamp: string;
};

const MAX_BATCH_SIZE = 100;

function pseudonymizePlayerId(
  gameId: string,
  playerId: string
) {
  return crypto
    .createHash("sha256")
    .update(`${gameId}:${playerId}`)
    .digest("hex");
}

function validateEvent(
  event: IncomingEvent,
  index: number
):
  | { valid: true; event: ValidatedEvent }
  | { valid: false; error: string } {
  if (!event || typeof event !== "object") {
    return {
      valid: false,
      error: `Event ${index}: event must be an object`,
    };
  }

  if (!event.eventId || typeof event.eventId !== "string") {
    return {
      valid: false,
      error: `Event ${index}: eventId is required`,
    };
  }

  if (!event.playerId || typeof event.playerId !== "string") {
    return {
      valid: false,
      error: `Event ${index}: playerId is required`,
    };
  }

  if (!event.sessionId || typeof event.sessionId !== "string") {
    return {
      valid: false,
      error: `Event ${index}: sessionId is required`,
    };
  }

  if (
    !Number.isInteger(event.eventSequence) ||
    event.eventSequence < 0
  ) {
    return {
      valid: false,
      error:
        `Event ${index}: eventSequence must be a non-negative integer`,
    };
  }

  if (!event.event || typeof event.event !== "string") {
    return {
      valid: false,
      error: `Event ${index}: event is required`,
    };
  }

  if (
    event.data !== undefined &&
    (typeof event.data !== "object" ||
      event.data === null ||
      Array.isArray(event.data))
  ) {
    return {
      valid: false,
      error: `Event ${index}: data must be an object`,
    };
  }

  let eventTimestamp: string;

  if (event.timestamp) {
    const parsedTimestamp = new Date(event.timestamp);

    if (Number.isNaN(parsedTimestamp.getTime())) {
      return {
        valid: false,
        error:
          `Event ${index}: timestamp must be a valid ISO date`,
      };
    }

    eventTimestamp = parsedTimestamp.toISOString();
  } else {
    eventTimestamp = new Date().toISOString();
  }

  return {
    valid: true,
    event: {
      ...event,
      eventTimestamp,
    },
  };
}

export async function POST(request: Request) {
  try {
    // --------------------------------------------------
    // 1. Authenticate request
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
    // 2. Verify game
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
    // 3. Parse batch
    // --------------------------------------------------

    const body = await request.json();

    if (!Array.isArray(body.events)) {
      return NextResponse.json(
        { error: "events must be an array" },
        { status: 400 }
      );
    }

    if (body.events.length === 0) {
      return NextResponse.json(
        { error: "events cannot be empty" },
        { status: 400 }
      );
    }

    if (body.events.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          error:
            `Maximum batch size is ${MAX_BATCH_SIZE} events`,
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 4. Validate every event before writing anything
    // --------------------------------------------------

    const validatedEvents: ValidatedEvent[] = [];

    for (let index = 0; index < body.events.length; index++) {
      const result = validateEvent(
        body.events[index] as IncomingEvent,
        index
      );

      if (!result.valid) {
        return NextResponse.json(
          {
            error: result.error,
          },
          { status: 400 }
        );
      }

      validatedEvents.push(result.event);
    }

    // --------------------------------------------------
    // 5. Determine document IDs
    // --------------------------------------------------

    const preparedEvents = validatedEvents.map((incomingEvent) => {
      const eventDocumentId = crypto
        .createHash("sha256")
        .update(`${gameId}:${incomingEvent.eventId}`)
        .digest("hex");

      const ref = adminDb
        .collection("gameEvents")
        .doc(eventDocumentId);

      return {
        incomingEvent,
        ref,
      };
    });

    // --------------------------------------------------
    // 6. Check which events already exist
    // --------------------------------------------------

    const existingSnapshots = await adminDb.getAll(
      ...preparedEvents.map((item) => item.ref)
    );

    const writeBatch = adminDb.batch();

    const results: {
      eventId: string;
      duplicate: boolean;
    }[] = [];

    let created = 0;
    let duplicates = 0;

    preparedEvents.forEach((item, index) => {
      const {
        eventId,
        playerId,
        sessionId,
        eventSequence,
        event,
        eventTimestamp,
        data,
      } = item.incomingEvent;

      const existingSnapshot = existingSnapshots[index];

      if (existingSnapshot.exists) {
        duplicates++;

        results.push({
          eventId,
          duplicate: true,
        });

        return;
      }

      const playerHash = pseudonymizePlayerId(
        gameId,
        playerId
      );

      writeBatch.set(item.ref, {
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

      created++;

      results.push({
        eventId,
        duplicate: false,
      });
    });

    // --------------------------------------------------
    // 7. Commit new events
    // --------------------------------------------------

    if (created > 0) {
      await writeBatch.commit();
    }

    // --------------------------------------------------
    // 8. Confirm receipt
    // --------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        gameId,
        received: validatedEvents.length,
        created,
        duplicates,
        results,
        receivedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Batch event ingestion failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Batch event ingestion failed",
      },
      { status: 500 }
    );
  }
}