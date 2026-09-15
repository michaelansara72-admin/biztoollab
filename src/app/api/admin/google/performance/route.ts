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

export const runtime = "nodejs";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
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

  const endDateObject = new Date();
  endDateObject.setDate(
    endDateObject.getDate() - 1
  );

  const startDateObject = new Date(
    endDateObject
  );

  startDateObject.setDate(
    startDateObject.getDate() - 27
  );

  const startDate = formatDate(startDateObject);
  const endDate = formatDate(endDateObject);

  try {
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
        ["query"]
      ),
      querySearchConsole(
        googleAccessToken,
        startDate,
        endDate,
        ["page"]
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
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    })
  ) ?? [];

    const pages =
      pagesData.rows?.map(
        (row: SearchConsoleRow) => ({
          page: row.keys?.[0] ?? "",
          clicks: row.clicks ?? 0,
          impressions: row.impressions ?? 0,
          ctr: row.ctr ?? 0,
          position: row.position ?? 0,
        })
      ) ?? [];

    return NextResponse.json({
      success: true,
      connected: true,
      siteUrl: getSearchConsoleSiteUrl(),

      period: {
        startDate,
        endDate,
      },

      metrics: {
        clicks: totals.clicks ?? 0,
        impressions: totals.impressions ?? 0,
        ctr: totals.ctr ?? 0,
        position: totals.position ?? 0,
      },

      queries,
      pages,
    });
  } catch (error) {
    console.error(
      "Search Console performance error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        connected: false,
        error:
          "Unable to retrieve Search Console performance.",
      },
      {
        status: 502,
      }
    );
  }
}