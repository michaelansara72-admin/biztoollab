import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

import {
  getGoogleAccessToken,
  getSearchConsoleSiteUrl,
  querySearchConsole,
  type SearchConsoleRow,
} from "@/lib/googleSearchConsole";

import {
  getSnapshotByPeriod,
  saveSearchConsoleSnapshot,
} from "@/lib/searchConsoleSnapshotRepository";

export const runtime = "nodejs";

type SnapshotRequest = {
  startDate?: unknown;
  endDate?: unknown;
};

function isValidDateString(
  value: unknown
): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export async function POST(request: Request) {
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
      {
        status: 401,
      }
    );
  }

  let body: SnapshotRequest;

  try {
    body = (await request.json()) as SnapshotRequest;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid JSON request body.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !isValidDateString(body.startDate) ||
    !isValidDateString(body.endDate)
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "startDate and endDate must use YYYY-MM-DD format.",
      },
      {
        status: 400,
      }
    );
  }

  const startDate = body.startDate;
  const endDate = body.endDate;

  const startDateObject = new Date(
    `${startDate}T00:00:00Z`
  );

  const endDateObject = new Date(
    `${endDate}T00:00:00Z`
  );

  if (startDateObject > endDateObject) {
    return NextResponse.json(
      {
        success: false,
        error:
          "startDate cannot be later than endDate.",
      },
      {
        status: 400,
      }
    );
  }

  const yesterday = new Date();
  yesterday.setUTCHours(0, 0, 0, 0);
  yesterday.setUTCDate(
    yesterday.getUTCDate() - 1
  );

  if (endDateObject > yesterday) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Snapshot periods cannot include today or future dates.",
      },
      {
        status: 400,
      }
    );
  }

  const siteUrl = getSearchConsoleSiteUrl();

  try {
    const existingSnapshot =
      await getSnapshotByPeriod({
        siteUrl,
        evidenceStart: startDate,
        evidenceEnd: endDate,
      });

    if (existingSnapshot) {
      return NextResponse.json(
        {
          success: true,
          duplicate: true,
          snapshotId: existingSnapshot.id,
          message:
            "A snapshot for this exact evidence period already exists.",
        },
        {
          status: 200,
        }
      );
    }

    const googleAccessToken =
      await getGoogleAccessToken();

    const [
      totalsData,
      queriesData,
      pagesData,
    ] = await Promise.all([
      querySearchConsole(
        googleAccessToken,
        startDate,
        endDate
      ),

      querySearchConsole(
        googleAccessToken,
        startDate,
        endDate,
        ["query"],
        1000
      ),

      querySearchConsole(
        googleAccessToken,
        startDate,
        endDate,
        ["page"],
        1000
      ),
    ]);

    const totals: SearchConsoleRow =
      totalsData.rows?.[0] ?? {
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
      };

    const queries =
      queriesData.rows?.map(
        (row: SearchConsoleRow) => ({
          query: row.keys?.[0] ?? "",
          clicks: row.clicks ?? 0,
          impressions:
            row.impressions ?? 0,
          ctr: row.ctr ?? 0,
          position: row.position ?? 0,
        })
      ) ?? [];

    const pages =
      pagesData.rows?.map(
        (row: SearchConsoleRow) => ({
          page: row.keys?.[0] ?? "",
          clicks: row.clicks ?? 0,
          impressions:
            row.impressions ?? 0,
          ctr: row.ctr ?? 0,
          position: row.position ?? 0,
        })
      ) ?? [];

    const result =
      await saveSearchConsoleSnapshot({
        siteUrl,

        evidenceStart: startDate,
        evidenceEnd: endDate,

        clicks: totals.clicks ?? 0,
        impressions:
          totals.impressions ?? 0,
        ctr: totals.ctr ?? 0,
        position: totals.position ?? 0,

        queries,
        pages,
      });

    return NextResponse.json(
      {
        success: true,
        duplicate: false,
        snapshotId: result.id,

        siteUrl,

        period: {
          startDate,
          endDate,
        },

        metrics: {
          clicks: totals.clicks ?? 0,
          impressions:
            totals.impressions ?? 0,
          ctr: totals.ctr ?? 0,
          position:
            totals.position ?? 0,
        },

        capturedRows: {
          queries: queries.length,
          pages: pages.length,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Search Console snapshot capture failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to capture Search Console snapshot.",
      },
      {
        status: 500,
      }
    );
  }
}