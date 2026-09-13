import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

const SITE_URL = "sc-domain:biztoollab.com";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function getGoogleAccessToken() {
  const clientId =
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;

  const clientSecret =
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;

  const refreshToken =
    process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Search Console credentials are not fully configured."
    );
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type":
        "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Google access-token refresh failed: ${response.status}`
    );
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error(
      "Google did not return a fresh access token."
    );
  }

  return data.access_token as string;
}

async function querySearchConsole(
  accessToken: string,
  startDate: string,
  endDate: string,
  dimensions?: string[]
) {
  const endpoint =
    `https://www.googleapis.com/webmasters/v3/sites/` +
    `${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;

  const body: Record<string, unknown> = {
    startDate,
    endDate,
    rowLimit: 25,
  };

  if (dimensions) {
    body.dimensions = dimensions;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Search Console request failed: ${response.status}`
    );
  }

  return response.json();
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

  const startDate =
    formatDate(startDateObject);

  const endDate =
    formatDate(endDateObject);

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

    const totals =
      totalsData.rows?.[0] ?? {
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
      };

    const queries =
      queriesData.rows?.map(
        (row: {
          keys?: string[];
          clicks?: number;
          impressions?: number;
          ctr?: number;
          position?: number;
        }) => ({
          query: row.keys?.[0] ?? "",
          clicks: row.clicks ?? 0,
          impressions:
            row.impressions ?? 0,
          ctr: row.ctr ?? 0,
          position:
            row.position ?? 0,
        })
      ) ?? [];

    const pages =
      pagesData.rows?.map(
        (row: {
          keys?: string[];
          clicks?: number;
          impressions?: number;
          ctr?: number;
          position?: number;
        }) => ({
          page: row.keys?.[0] ?? "",
          clicks: row.clicks ?? 0,
          impressions:
            row.impressions ?? 0,
          ctr: row.ctr ?? 0,
          position:
            row.position ?? 0,
        })
      ) ?? [];

    return NextResponse.json({
      success: true,
      connected: true,
      siteUrl: SITE_URL,

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