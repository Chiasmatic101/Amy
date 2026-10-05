import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  acquireFirestoreSyncLease,
} from "@/lib/integrations/firestore/firestore-integration";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const INTEGRATION_ID =
  "chiasmatic-calamity-firestore";


export async function POST(
  request: NextRequest
) {
  try {
    const adminSecret =
      process.env.AMY_ADMIN_SECRET;

    if (!adminSecret) {
      throw new Error(
        "AMY_ADMIN_SECRET is not configured."
      );
    }

    const suppliedSecret =
      request.headers.get(
        "x-amy-admin-secret"
      );

    if (
      suppliedSecret !==
      adminSecret
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const lease =
      await acquireFirestoreSyncLease(
        INTEGRATION_ID
      );

    return NextResponse.json({
      success: true,

      lease: {
        acquired:
          lease.acquired,

        /*
         * Don't expose the lease ID.
         */

        expiresAt:
          lease.expiresAt,
      },

      message:
        lease.acquired
          ? "Test lease acquired. It will expire automatically."
          : "Integration already has an active synchronization lease.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown lease test error.",
      },
      {
        status: 500,
      }
    );
  }
}