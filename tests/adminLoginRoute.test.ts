import test from "node:test";
import assert from "node:assert/strict";

import { adminSessionCookie } from "../src/lib/adminAuth";
import { handleAdminLogin } from "../src/lib/handleAdminLogin";
import {
  LOGIN_ATTEMPT_LIMIT,
  LOGIN_MAX_BODY_BYTES,
  LOGIN_MAX_PASSWORD_LENGTH,
  LOGIN_WINDOW_MS,
  createAdminLoginLimiter,
  resolveAdminClientIdentity,
} from "../src/lib/adminLoginGuard";

const sessionToken =
  "1893456000.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function jsonRequest(
  body: string,
  headers: Record<string, string> = {}
) {
  return new Request("https://biztoollab.com/api/admin/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body,
  });
}

function jsonOfLength(byteLength: number) {
  const prefix = JSON.stringify({
    password: "pw",
    pad: "",
  });
  const marker = `"pad":""`;
  const markerAt = prefix.lastIndexOf(marker);

  assert.notEqual(markerAt, -1);

  const room = byteLength - Buffer.byteLength(prefix);

  assert.ok(room >= 0);

  const text =
    prefix.slice(0, markerAt) +
    `"pad":"${"a".repeat(room)}"` +
    prefix.slice(markerAt + marker.length);

  assert.equal(Buffer.byteLength(text), byteLength);

  return text;
}

function loginOptions(overrides: {
  now?: () => number;
  limiter?: ReturnType<typeof createAdminLoginLimiter>;
  verifyPassword?: (password: string) => boolean;
  createSessionToken?: () => string;
} = {}) {
  const calls: string[] = [];

  return {
    calls,
    options: {
      now: overrides.now ?? (() => 1_000_000),
      limiter: overrides.limiter ?? createAdminLoginLimiter(),
      createSessionToken:
        overrides.createSessionToken ?? (() => sessionToken),
      verifyPassword:
        overrides.verifyPassword ??
        ((password: string) => {
          calls.push(password);
          return password === "correct-password";
        }),
    },
  };
}

async function postLogin(
  body: string,
  headers: Record<string, string> = {},
  overrides: Parameters<typeof loginOptions>[0] = {}
) {
  const prepared = loginOptions(overrides);
  const response = await handleAdminLogin(
    jsonRequest(body, headers),
    prepared.options
  );

  return {
    response,
    calls: prepared.calls,
  };
}

test("valid login returns the existing success body and session cookie", async () => {
  const { response, calls } = await postLogin(
    JSON.stringify({
      password: "correct-password",
    })
  );
  const body = await response.json();
  const setCookie = response.headers.get("set-cookie") ?? "";

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    success: true,
  });
  assert.deepEqual(calls, ["correct-password"]);
  assert.match(
    setCookie,
    new RegExp(
      `${adminSessionCookie.name}=${sessionToken}`
    )
  );
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Path=\//i);
  assert.match(setCookie, /SameSite=lax/i);
  assert.match(
    setCookie,
    new RegExp(`Max-Age=${adminSessionCookie.maxAge}`, "i")
  );

  if (process.env.NODE_ENV === "production") {
    assert.match(setCookie, /Secure/i);
  }
});

test("incorrect password returns a generic 401", async () => {
  const { response, calls } = await postLogin(
    JSON.stringify({
      password: "wrong-password",
    })
  );
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.deepEqual(body, {
    success: false,
    error: "Invalid credentials.",
  });
  assert.deepEqual(calls, ["wrong-password"]);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("malformed JSON returns 400 and does not verify a password", async () => {
  const { response, calls } = await postLogin("{bad");
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    success: false,
    error: "Unable to process login.",
  });
  assert.deepEqual(calls, []);
});

test("a non-string password is rejected without verification", async () => {
  const { response, calls } = await postLogin(
    JSON.stringify({
      password: 12345,
    })
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    success: false,
    error: "Invalid credentials.",
  });
  assert.deepEqual(calls, []);
});

test("an oversized body returns 413 and does not verify a password", async () => {
  const { response, calls } = await postLogin(
    jsonOfLength(LOGIN_MAX_BODY_BYTES + 1)
  );

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), {
    success: false,
    error: "Request body is too large.",
  });
  assert.deepEqual(calls, []);
});

test("a body at the size boundary is still verified", async () => {
  const { response, calls } = await postLogin(
    jsonOfLength(LOGIN_MAX_BODY_BYTES)
  );

  assert.equal(response.status, 401);
  assert.deepEqual(calls, ["pw"]);
  assert.equal(
    (await response.json()).error,
    "Invalid credentials."
  );
});

test("a password at the length boundary is verified", async () => {
  const password = "b".repeat(LOGIN_MAX_PASSWORD_LENGTH);
  const { calls } = await postLogin(
    JSON.stringify({
      password,
    })
  );

  assert.deepEqual(calls, [password]);
});

test("an excessively long password returns 401 without verification", async () => {
  const password = "c".repeat(LOGIN_MAX_PASSWORD_LENGTH + 1);
  const { response, calls } = await postLogin(
    JSON.stringify({
      password,
    })
  );

  assert.ok(
    Buffer.byteLength(JSON.stringify({ password })) <=
      LOGIN_MAX_BODY_BYTES
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    success: false,
    error: "Invalid credentials.",
  });
  assert.deepEqual(calls, []);
});

test("the ninth attempt in the window is throttled and does not verify", async () => {
  const limiter = createAdminLoginLimiter();
  const now = () => 5_000;
  const overrides = {
    limiter,
    now,
  };

  for (let attempt = 0; attempt < LOGIN_ATTEMPT_LIMIT; attempt += 1) {
    const { response, calls } = await postLogin(
      JSON.stringify({
        password: "wrong-password",
      }),
      {},
      overrides
    );

    assert.equal(response.status, 401);
    assert.equal(calls.length, 1);
  }

  const blocked = await postLogin(
    JSON.stringify({
      password: "wrong-password",
    }),
    {},
    overrides
  );
  const body = await blocked.response.json();

  assert.equal(blocked.response.status, 429);
  assert.deepEqual(body, {
    success: false,
    error: "Too many login attempts. Please wait and try again.",
  });
  assert.equal(blocked.response.headers.get("retry-after"), "60");
  assert.deepEqual(blocked.calls, []);
  assert.equal(limiter.pendingAttempts(), LOGIN_ATTEMPT_LIMIT);
});

test("the throttle expires and a correct password can sign in", async () => {
  let current = 10_000;
  const limiter = createAdminLoginLimiter();
  const overrides = {
    limiter,
    now: () => current,
  };

  for (let attempt = 0; attempt < LOGIN_ATTEMPT_LIMIT; attempt += 1) {
    const { response } = await postLogin(
      JSON.stringify({
        password: "wrong-password",
      }),
      {},
      overrides
    );

    assert.equal(response.status, 401);
  }

  current += LOGIN_WINDOW_MS - 1;

  const stillBlocked = await postLogin(
    JSON.stringify({
      password: "correct-password",
    }),
    {},
    overrides
  );

  assert.equal(stillBlocked.response.status, 429);
  assert.equal(
    stillBlocked.response.headers.get("retry-after"),
    "1"
  );
  assert.deepEqual(stillBlocked.calls, []);

  current += 1;

  const recovered = await postLogin(
    JSON.stringify({
      password: "correct-password",
    }),
    {},
    overrides
  );

  assert.equal(recovered.response.status, 200);
  assert.deepEqual(await recovered.response.json(), {
    success: true,
  });
  assert.deepEqual(recovered.calls, ["correct-password"]);
});

test("rejected requests do not extend the throttle window", async () => {
  let current = 20_000;
  const limiter = createAdminLoginLimiter();
  const overrides = {
    limiter,
    now: () => current,
  };

  for (let attempt = 0; attempt < LOGIN_ATTEMPT_LIMIT; attempt += 1) {
    await postLogin(
      JSON.stringify({
        password: "wrong-password",
      }),
      {},
      overrides
    );
  }

  current += 50_000;

  for (let extra = 0; extra < 10; extra += 1) {
    const rejected = await postLogin(
      JSON.stringify({
        password: "wrong-password",
      }),
      {},
      overrides
    );

    assert.equal(rejected.response.status, 429);
    assert.deepEqual(rejected.calls, []);
  }

  assert.equal(limiter.pendingAttempts(), LOGIN_ATTEMPT_LIMIT);
  assert.equal(
    (
      await postLogin(
        JSON.stringify({
          password: "wrong-password",
        }),
        {},
        overrides
      )
    ).response.headers.get("retry-after"),
    "10"
  );

  current += 10_000;

  const { response, calls } = await postLogin(
    JSON.stringify({
      password: "wrong-password",
    }),
    {},
    overrides
  );

  assert.equal(response.status, 401);
  assert.equal(calls.length, 1);
});

test("a throttled request skips an oversized body and password verification", async () => {
  const limiter = createAdminLoginLimiter();
  const overrides = {
    limiter,
    now: () => 30_000,
  };

  for (let attempt = 0; attempt < LOGIN_ATTEMPT_LIMIT; attempt += 1) {
    await postLogin(
      JSON.stringify({
        password: "wrong-password",
      }),
      {},
      overrides
    );
  }

  const { response, calls } = await postLogin(
    jsonOfLength(LOGIN_MAX_BODY_BYTES + 500),
    {},
    overrides
  );

  assert.equal(response.status, 429);
  assert.deepEqual(calls, []);
});

test("concurrent requests admit only the process allowance", async () => {
  const limiter = createAdminLoginLimiter();
  let calls = 0;
  const verifyPassword = () => {
    calls += 1;
    return false;
  };
  const responses = await Promise.all(
    Array.from({ length: 20 }, () =>
      handleAdminLogin(
        jsonRequest(
          JSON.stringify({
            password: "wrong-password",
          })
        ),
        {
          limiter,
          now: () => 40_000,
          verifyPassword,
          createSessionToken: () => sessionToken,
        }
      )
    )
  );
  const statuses = await Promise.all(
    responses.map(async (response) => response.status)
  );

  assert.equal(
    statuses.filter((status) => status === 401).length,
    LOGIN_ATTEMPT_LIMIT
  );
  assert.equal(
    statuses.filter((status) => status === 429).length,
    20 - LOGIN_ATTEMPT_LIMIT
  );
  assert.equal(calls, LOGIN_ATTEMPT_LIMIT);
  assert.equal(limiter.pendingAttempts(), LOGIN_ATTEMPT_LIMIT);
});

test("forwarded IP headers do not create a separate allowance", async () => {
  const limiter = createAdminLoginLimiter();
  const overrides = {
    limiter,
    now: () => 50_000,
  };

  for (let attempt = 0; attempt < LOGIN_ATTEMPT_LIMIT; attempt += 1) {
    const { response } = await postLogin(
      JSON.stringify({
        password: "wrong-password",
      }),
      {
        "x-forwarded-for": `${attempt}.0.0.1`,
        "x-real-ip": `10.0.0.${attempt}`,
      },
      overrides
    );

    assert.equal(response.status, 401);
  }

  const { response, calls } = await postLogin(
    JSON.stringify({
      password: "wrong-password",
    }),
    {},
    overrides
  );

  assert.equal(response.status, 429);
  assert.deepEqual(calls, []);
  assert.deepEqual(resolveAdminClientIdentity(new Headers({
    "x-forwarded-for": "203.0.113.5",
    "x-real-ip": "203.0.113.5",
  })), {
    trusted: false,
  });
});

test("a successful login clears the shared allowance", async () => {
  const limiter = createAdminLoginLimiter();
  const overrides = {
    limiter,
    now: () => 60_000,
  };

  for (let attempt = 0; attempt < LOGIN_ATTEMPT_LIMIT - 1; attempt += 1) {
    await postLogin(
      JSON.stringify({
        password: "wrong-password",
      }),
      {},
      overrides
    );
  }

  const success = await postLogin(
    JSON.stringify({
      password: "correct-password",
    }),
    {},
    overrides
  );

  assert.equal(success.response.status, 200);
  assert.equal(limiter.pendingAttempts(), 0);

  for (let attempt = 0; attempt < LOGIN_ATTEMPT_LIMIT; attempt += 1) {
    const { response } = await postLogin(
      JSON.stringify({
        password: "wrong-password",
      }),
      {},
      overrides
    );

    assert.equal(response.status, 401);
  }
});

test("limiter memory stays capped after repeated checks", () => {
  const limiter = createAdminLoginLimiter();
  const identity = resolveAdminClientIdentity(new Headers());

  for (let attempt = 0; attempt < 100; attempt += 1) {
    limiter.check(70_000, identity);
  }

  assert.equal(limiter.pendingAttempts(), LOGIN_ATTEMPT_LIMIT);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    limiter.check(70_000 + (attempt + 1) * LOGIN_WINDOW_MS, identity);
  }

  assert.ok(limiter.pendingAttempts() <= LOGIN_ATTEMPT_LIMIT);
  assert.ok(limiter.pendingAttempts() > 0);
});

test("a verifier failure returns a generic 400 and no session cookie", async () => {
  const { response } = await postLogin(
    JSON.stringify({
      password: "correct-password",
    }),
    {},
    {
      verifyPassword: () => {
        throw new Error("ADMIN_PASSWORD_HASH is not configured.");
      },
    }
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    error: "Unable to process login.",
  });
  assert.equal(response.headers.get("set-cookie"), null);
});
