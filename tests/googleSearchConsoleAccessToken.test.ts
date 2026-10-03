import test from "node:test";
import assert from "node:assert/strict";

import { getGoogleAccessToken } from "../src/lib/googleSearchConsole";

const credentialKeys = [
  "GOOGLE_SEARCH_CONSOLE_CLIENT_ID",
  "GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET",
  "GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN",
] as const;

const clientId = "test-client-id";
const clientSecret = "test-client-secret-do-not-leak";
const refreshToken = "test-refresh-token-do-not-leak";
const accessToken = "test-access-token-do-not-leak";

async function withGoogleCredentials(
  values: Partial<
    Record<(typeof credentialKeys)[number], string>
  >,
  run: () => Promise<void>
) {
  const previous = new Map(
    credentialKeys.map((key) => [
      key,
      process.env[key],
    ])
  );

  try {
    for (const key of credentialKeys) {
      const value = values[key];

      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    await run();
  } finally {
    for (const key of credentialKeys) {
      const value = previous.get(key);

      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function assertNoCredentialMaterial(message: string) {
  assert.equal(message.includes(clientSecret), false);
  assert.equal(message.includes(refreshToken), false);
  assert.equal(message.includes(accessToken), false);
  assert.equal(message.includes("client_secret"), false);
  assert.equal(message.includes("refresh_token"), false);
  assert.equal(message.includes("access_token"), false);
  assert.equal(message.includes("authorization_code"), false);
}

test("a token HTTP 400 reports invalid_grant without credential material", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  globalThis.fetch = (async () => {
    fetchCalls += 1;

    return new Response(
      JSON.stringify({
        error: "invalid_grant",
        error_description:
          "Token has been expired or revoked.",
        refresh_token: refreshToken,
        access_token: accessToken,
        client_secret: clientSecret,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }) as typeof fetch;

  try {
    await withGoogleCredentials(
      {
        GOOGLE_SEARCH_CONSOLE_CLIENT_ID: clientId,
        GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET:
          clientSecret,
        GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN:
          refreshToken,
      },
      async () => {
        await assert.rejects(
          () => getGoogleAccessToken(),
          (error: unknown) => {
            assert.ok(error instanceof Error);
            assert.match(error.message, /invalid_grant/);
            assert.match(
              error.message,
              /Google access-token refresh failed: 400/
            );
            assert.match(
              error.message,
              /Token has been expired or revoked\./
            );
            assertNoCredentialMaterial(error.message);
            return true;
          }
        );
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(fetchCalls, 1);
});

test("an unsafe error_description is omitted", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        error: "invalid_grant",
        error_description: `revoked ${refreshToken}`,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }) as typeof fetch;

  try {
    await withGoogleCredentials(
      {
        GOOGLE_SEARCH_CONSOLE_CLIENT_ID: clientId,
        GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET:
          clientSecret,
        GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN:
          refreshToken,
      },
      async () => {
        await assert.rejects(
          () => getGoogleAccessToken(),
          (error: unknown) => {
            assert.ok(error instanceof Error);
            assert.match(error.message, /invalid_grant/);
            assert.equal(
              error.message.includes(refreshToken),
              false
            );
            assert.equal(
              error.message.includes(
                "error_description="
              ),
              false
            );
            return true;
          }
        );
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("missing Search Console credentials do not call Google", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  globalThis.fetch = (async () => {
    fetchCalls += 1;
    throw new Error("Google should not be called.");
  }) as typeof fetch;

  try {
    await withGoogleCredentials(
      {},
      async () => {
        await assert.rejects(
          () => getGoogleAccessToken(),
          {
            message:
              "Google Search Console credentials are not fully configured.",
          }
        );
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(fetchCalls, 0);
});
