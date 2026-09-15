import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

import {
  getGoogleAccessToken,
  getSearchConsoleSites,
} from "@/lib/googleSearchConsole";

export const runtime = "nodejs";

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

  try {
    const googleAccessToken =
      await getGoogleAccessToken();

    const sites =
      await getSearchConsoleSites(
        googleAccessToken
      );

    return NextResponse.json({
      success: true,
      connected: true,
      sites,
    });
  } catch (error) {
    console.error(
      "Search Console sites error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        connected: false,
        error:
          "Unable to retrieve Search Console properties.",
      },
      {
        status: 502,
      }
    );
  }
}