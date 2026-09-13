import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  const savedState = cookieStore.get(
    "biztoollab_google_oauth_state"
  )?.value;

  const returnedState =
    request.nextUrl.searchParams.get("state");

  const code =
    request.nextUrl.searchParams.get("code");

  const oauthError =
    request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      new URL(
        `/admin?google=error&reason=${encodeURIComponent(
          oauthError
        )}`,
        request.url
      )
    );
  }

  if (
    !savedState ||
    !returnedState ||
    savedState !== returnedState
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid OAuth state.",
      },
      {
        status: 400,
      }
    );
  }

  if (!code) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Google did not return an authorization code.",
      },
      {
        status: 400,
      }
    );
  }

  const clientId =
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;

  const clientSecret =
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;

  const redirectUri =
    process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
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

  const tokenResponse = await fetch(
    GOOGLE_TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    }
  );

  if (!tokenResponse.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "Google token exchange failed.",
      },
      {
        status: 502,
      }
    );
  }

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Google did not return an access token.",
      },
      {
        status: 502,
      }
    );
  }

  if (!tokenData.refresh_token) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Google did not return a refresh token. Reauthorize using the consent flow.",
      },
      {
        status: 502,
      }
    );
  }

  const response = NextResponse.redirect(
    new URL(
      "/admin?google=refresh-token-ready",
      request.url
    )
  );

  response.cookies.set({
    name: "biztoollab_google_refresh_token_temp",
    value: tokenData.refresh_token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  response.cookies.set({
    name: "biztoollab_google_oauth_state",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/admin/google",
    maxAge: 0,
  });

  return response;
}