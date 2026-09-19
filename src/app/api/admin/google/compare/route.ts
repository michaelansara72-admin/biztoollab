import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

import {
  getSearchConsoleSnapshotById,
} from "@/lib/searchConsoleSnapshotRepository";

import {
  parseSnapshotIds,
  compareStoredSnapshots,
} from "@/lib/searchConsoleComparisonRequest";

export const runtime = "nodejs";

export async function GET(request: Request) {
  // Step 1: Verify administrator authentication.
  const cookieStore = await cookies();

  const adminToken = cookieStore.get(
    adminSessionCookie.name
  )?.value;

  if (!verifyAdminSessionToken(adminToken)) {
    return NextResponse.json(
      {
        success: false,
        error: "Admin authentication required.",
      },
      { status: 401 }
    );
  }

  // Step 2: Validate the requested snapshot IDs.
  const { searchParams } = new URL(request.url);

  const ids = parseSnapshotIds(
    searchParams.get("baselineId"),
    searchParams.get("comparisonId")
  );

  if (!ids.valid) {
    return NextResponse.json(
      {
        success: false,
        error: ids.reason,
      },
      { status: 400 }
    );
  }

  const { baselineId, comparisonId } = ids;

  try {
    // Step 3: Retrieve both snapshots.
    // This operation is read-only.
    const [baselineRecord, comparisonRecord] =
      await Promise.all([
        getSearchConsoleSnapshotById(baselineId),
        getSearchConsoleSnapshotById(comparisonId),
      ]);

    // Step 4: Confirm both snapshots exist.
    if (!baselineRecord || !comparisonRecord) {
      return NextResponse.json(
        {
          success: false,
          error: "One or both snapshots were not found.",
        },
        { status: 404 }
      );
    }

    // Step 5: Run the validated comparison engine.
    const result = compareStoredSnapshots(
      baselineRecord,
      comparisonRecord
    );

    // Step 6: Reject invalid comparisons.
    if (!result.valid) {
      return NextResponse.json(
        {
          success: false,
          error: result.reason,
        },
        { status: 400 }
      );
    }

    // Step 7: Return the comparison results.
    return NextResponse.json({
      success: true,
      baselineId,
      comparisonId,
      result,
    });
  } catch (error) {
    console.error(
      "Search Console comparison failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to compare Search Console snapshots.",
      },
      { status: 500 }
    );
  }
}