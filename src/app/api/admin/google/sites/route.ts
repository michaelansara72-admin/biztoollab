import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

const SEARCH_CONSOLE_SITES_URL =
  "https://www.googleapis.com/webmasters/v3/sites";

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

  const googleAccessToken = cookieStore.get(
    "biztoollab_google_access_token"
  )?.value;

  if (!googleAccessToken) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: "Google Search Console is not connected.",
      },
      {
        status: 401,
      }
    );
  }

  const response = await fetch(
    SEARCH_CONSOLE_SITES_URL,
    {
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error:
          "Unable to retrieve Search Console properties.",
      },
      {
        status: response.status,
      }
    );
  }

  const data = await response.json();

  return NextResponse.json({
    success: true,
    connected: true,
    sites: data.siteEntry ?? [],
  });
}