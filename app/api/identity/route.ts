import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

function createResearchId() {
  return `R_AMY_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const developerUserId =
      typeof body.developerUserId === "string"
        ? body.developerUserId
        : null;

    const publisherUserId =
      typeof body.publisherUserId === "string"
        ? body.publisherUserId
        : null;

    if (!developerUserId && !publisherUserId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "developerUserId or publisherUserId is required",
        },
        { status: 400 }
      );
    }

    // First try to find an existing identity by developer ID.
    if (developerUserId) {
      const existingDeveloper = await adminDb
        .collection("identityMap")
        .where("developerUserId", "==", developerUserId)
        .limit(1)
        .get();

      if (!existingDeveloper.empty) {
        const doc = existingDeveloper.docs[0];

        if (publisherUserId) {
          await doc.ref.update({
            publisherUserId,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        return NextResponse.json({
          success: true,
          researchId: doc.data().researchId,
          matchType: "existing_developer_identity",
        });
      }
    }

    // Then try publisher ID.
    if (publisherUserId) {
      const existingPublisher = await adminDb
        .collection("identityMap")
        .where("publisherUserId", "==", publisherUserId)
        .limit(1)
        .get();

      if (!existingPublisher.empty) {
        const doc = existingPublisher.docs[0];

        if (developerUserId) {
          await doc.ref.update({
            developerUserId,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        return NextResponse.json({
          success: true,
          researchId: doc.data().researchId,
          matchType: "existing_publisher_identity",
        });
      }
    }

    // No identity exists yet.
    const researchId = createResearchId();

    await adminDb.collection("identityMap").add({
      researchId,

      developerUserId,
      publisherUserId,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      researchId,
      matchType: "new_identity",
    });
  } catch (error) {
    console.error("Identity API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to resolve identity",
      },
      { status: 500 }
    );
  }
}