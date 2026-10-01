import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import {
  generateApiKey,
  getApiKeyPrefix,
  hashApiKey,
} from "@/lib/api-keys";

export async function POST(request: Request) {
  try {
    // --------------------------------------------------
    // 1. Authenticate AMY administrator
    // --------------------------------------------------

    const adminSecret = process.env.AMY_ADMIN_SECRET;
    const suppliedSecret = request.headers.get("x-amy-admin-secret");

    if (!adminSecret) {
      console.error("AMY_ADMIN_SECRET is not configured.");

      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (!suppliedSecret || suppliedSecret !== adminSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // 2. Read request
    // --------------------------------------------------

    const body = await request.json();
    const gameId = body.gameId;

    if (!gameId || typeof gameId !== "string") {
      return NextResponse.json(
        { error: "gameId is required" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 3. Confirm game exists
    // --------------------------------------------------

    const gameRef = adminDb.collection("games").doc(gameId);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 4. Generate API credential
    // --------------------------------------------------

    const apiKey = generateApiKey("test");
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = getApiKeyPrefix(apiKey);

    // --------------------------------------------------
    // 5. Store only the hashed credential
    // --------------------------------------------------

    const credentialRef = await adminDb.collection("apiKeys").add({
      gameId,
      keyHash,
      keyPrefix,
      environment: "test",
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    // --------------------------------------------------
    // 6. Return raw API key ONCE
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      credentialId: credentialRef.id,
      gameId,
      apiKey,
      keyPrefix,
    });
  } catch (error) {
    console.error("Failed to create API key:", error);

    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}