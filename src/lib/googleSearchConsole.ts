const SITE_URL = "sc-domain:biztoollab.com";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const SEARCH_CONSOLE_SITES_URL =
  "https://www.googleapis.com/webmasters/v3/sites";

export type SearchConsoleRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

export function getSearchConsoleSiteUrl() {
  return SITE_URL;
}

export async function getGoogleAccessToken() {
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

export async function querySearchConsole(
  accessToken: string,
  startDate: string,
  endDate: string,
  dimensions?: string[],
  rowLimit = 25
) {
  const endpoint =
    `https://www.googleapis.com/webmasters/v3/sites/` +
    `${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;

  const body: Record<string, unknown> = {
    startDate,
    endDate,
    rowLimit,
  };

  if (dimensions?.length) {
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

export async function getSearchConsoleSites(
  accessToken: string
) {
  const response = await fetch(
    SEARCH_CONSOLE_SITES_URL,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Search Console sites request failed: ${response.status}`
    );
  }

  const data = await response.json();

  return data.siteEntry ?? [];
}