import crypto from "crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

const GOOGLE_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";

const SEARCH_CONSOLE_SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly";

export async function GET() {
  const cookieStore = await cookies();

  const sessionToken = cookieStore.get(
    adminSessionCookie.name
  )?.value;

  if (!verifyAdminSessionToken(sessionToken)) {
    return NextResponse.redirect(
      new URL("/admin/login", "http://localhost:3000")
    );
  }

  const clientId =
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;

  const redirectUri =
    process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Google Search Console OAuth is not configured.",
      },
      {
        status: 500,
      }
    );
  }

  const state = crypto.randomBytes(32).toString("hex");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SEARCH_CONSOLE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const response = NextResponse.redirect(
    `${GOOGLE_AUTH_URL}?${params.toString()}`
  );

  response.cookies.set({
    name: "biztoollab_google_oauth_state",
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/admin/google",
    maxAge: 60 * 10,
  });

  return response;
}