import test from "node:test";
import assert from "node:assert/strict";

import { handleAnalyzeRequest } from "../src/lib/ai/handleAnalyzeRequest";
import {
  ANALYZE_CLIENT_LIMIT,
  ANALYZE_MAX_BODY_BYTES,
  ANALYZE_MAX_TRACKED_CLIENTS,
  ANALYZE_OPENAI_TIMEOUT_MS,
  ANALYZE_PROCESS_LIMIT,
  createAnalyzeRateLimiter,
  readBoundedJsonBody,
  resolveAnalyzeClientIdentity,
} from "../src/lib/ai/analyzeRequestGuard";

const secretMarker = "sk-test-secret-do-not-leak";

const analysis = {
  summary: "Summary",
  strength: "Strength",
  opportunity: "Opportunity",
  risk: "Risk",
  scenarioToTest: "Scenario",
  nextStep: "Next step",
};

function validPayload(extra = "") {
  return {
    tool: "laundromat-profit",
    analysisType: "business-opportunity",
    inputs: {
      washers: 30,
      note: extra,
    },
    results: {
      monthlyProfit: 4908,
    },
  };
}

function jsonRequest(
  body: string,
  headers: Record<string, string> = {}
) {
  return new Request("https://biztoollab.com/api/ai/analyze", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body,
  });
}

function paddedJson(byteLength: number) {
  const prefix = JSON.stringify({
    tool: "laundromat-profit",
    results: {
      note: "",
    },
  });
  const marker = `"note":""`;
  const markerAt = prefix.lastIndexOf(marker);

  assert.notEqual(markerAt, -1);

  const room = byteLength - Buffer.byteLength(prefix);
  assert.ok(room >= 0);

  const text =
    prefix.slice(0, markerAt) +
    `"note":"${"a".repeat(room)}"` +
    prefix.slice(markerAt + marker.length);

  assert.equal(Buffer.byteLength(text), byteLength);

  return text;
}

function completionOk() {
  const calls: Array<{
    body: Record<string, unknown>;
    options: {
      timeout: number;
      maxRetries: number;
    };
  }> = [];

  return {
    calls,
    createResponse: async (
      body: Record<string, unknown>,
      options: {
        timeout: number;
        maxRetries: number;
      }
    ) => {
      calls.push({ body, options });

      return {
        output_text: JSON.stringify(analysis),
      };
    },
  };
}

async function postAnalyze(
  body: string,
  options: {
    headers?: Record<string, string>;
    createResponse?: ReturnType<typeof completionOk>["createResponse"];
    identity?: ReturnType<typeof resolveAnalyzeClientIdentity>;
    now?: number;
    limiter?: ReturnType<typeof createAnalyzeRateLimiter>;
    apiKey?: string;
  } = {}
) {
  const generated = completionOk();

  const response = await handleAnalyzeRequest(
    jsonRequest(body, options.headers),
    {
      apiKey: options.apiKey ?? "test-api-key",
      now: () => options.now ?? 1_000_000,
      rateLimiter: options.limiter ?? createAnalyzeRateLimiter(),
      resolveIdentity: () =>
        options.identity ?? { trusted: false },
      createResponse:
        options.createResponse ?? generated.createResponse,
    }
  );

  const payload = (await response.json()) as {
    success: boolean;
    error?: string;
    tool?: string;
    analysis?: typeof analysis;
  };

  return {
    response,
    payload,
    calls: generated.calls,
  };
}

test("a valid analysis request keeps the success response shape", async () => {
  const completion = completionOk();
  const { response, payload } = await postAnalyze(
    JSON.stringify(validPayload()),
    { createResponse: completion.createResponse }
  );

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.tool, "laundromat-profit");
  assert.deepEqual(payload.analysis, analysis);
  assert.equal(completion.calls.length, 1);
  assert.equal(completion.calls[0]?.body.model, "gpt-5.6-luna");
  assert.equal(completion.calls[0]?.body.store, false);
  assert.equal(completion.calls[0]?.body.max_output_tokens, 1200);
  assert.equal(
    completion.calls[0]?.options.timeout,
    ANALYZE_OPENAI_TIMEOUT_MS
  );
  assert.equal(completion.calls[0]?.options.maxRetries, 0);
});

test("a JSON body of exactly 32768 bytes is accepted", async () => {
  const body = paddedJson(ANALYZE_MAX_BODY_BYTES);
  const { response, payload } = await postAnalyze(body);

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.tool, "laundromat-profit");
});

test("a JSON body larger than 32768 bytes is rejected before OpenAI", async () => {
  const completion = completionOk();
  const { response, payload } = await postAnalyze(
    paddedJson(ANALYZE_MAX_BODY_BYTES + 1),
    { createResponse: completion.createResponse }
  );

  assert.equal(response.status, 413);
  assert.equal(payload.success, false);
  assert.equal(payload.error, "Request body is too large.");
  assert.equal(completion.calls.length, 0);
});

test("an oversized stream is cancelled without reading the rest", async () => {
  let pulls = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls += 1;

      if (pulls === 1) {
        controller.enqueue(new Uint8Array(20_000));
        return;
      }

      if (pulls === 2) {
        controller.enqueue(new Uint8Array(20_000));
        return;
      }

      controller.enqueue(new Uint8Array(1_000_000));
    },
  });

  const request = new Request(
    "https://biztoollab.com/api/ai/analyze",
    {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit
  );

  const result = await readBoundedJsonBody(request);

  assert.equal(result.ok, false);

  if (result.ok) {
    return;
  }

  assert.equal(result.status, 413);
  assert.equal(pulls, 2);
});

test("a declared content length above the limit does not read the body", async () => {
  const request = {
    headers: new Headers({
      "content-length": String(ANALYZE_MAX_BODY_BYTES + 1),
    }),
    body: {
      getReader() {
        throw new Error("body was read");
      },
    },
  } as unknown as Request;

  const result = await readBoundedJsonBody(request);

  assert.equal(result.ok, false);

  if (result.ok) {
    return;
  }

  assert.equal(result.status, 413);
  assert.equal(result.error, "Request body is too large.");
});

test("malformed JSON is rejected before OpenAI", async () => {
  const completion = completionOk();
  const { response, payload } = await postAnalyze("{", {
    createResponse: completion.createResponse,
  });

  assert.equal(response.status, 400);
  assert.equal(payload.error, "Invalid JSON.");
  assert.equal(completion.calls.length, 0);
});

test("existing tool and result validation still runs before OpenAI", async () => {
  const completion = completionOk();
  const missingTool = await postAnalyze(
    JSON.stringify({ results: { monthlyProfit: 1 } }),
    { createResponse: completion.createResponse }
  );
  const missingResults = await postAnalyze(
    JSON.stringify({ tool: "laundromat-profit", results: {} }),
    { createResponse: completion.createResponse }
  );
  const unsupported = await postAnalyze(
    JSON.stringify({
      tool: "not-a-calculator",
      results: { monthlyProfit: 1 },
    }),
    { createResponse: completion.createResponse }
  );

  assert.equal(missingTool.response.status, 400);
  assert.equal(
    missingTool.payload.error,
    "Unsupported or missing tool."
  );
  assert.equal(missingResults.response.status, 400);
  assert.equal(
    missingResults.payload.error,
    "Calculator results are required."
  );
  assert.equal(unsupported.response.status, 400);
  assert.equal(completion.calls.length, 0);
});

test("a trusted client is rejected after its own limit", () => {
  const limiter = createAnalyzeRateLimiter();
  const now = 5_000_000;

  for (let attempt = 0; attempt < ANALYZE_CLIENT_LIMIT; attempt += 1) {
    assert.equal(
      limiter.check(
        { trusted: true, key: "client-a" },
        now
      ).allowed,
      true
    );
  }

  assert.equal(
    limiter.check({ trusted: true, key: "client-a" }, now)
      .allowed,
    false
  );
  assert.equal(
    limiter.check({ trusted: true, key: "client-b" }, now)
      .allowed,
    true
  );
});

test("the process-wide ceiling rejects further analysis calls", async () => {
  const limiter = createAnalyzeRateLimiter();
  const completion = completionOk();
  let allowed = 0;

  for (let attempt = 0; attempt < ANALYZE_PROCESS_LIMIT + 1; attempt += 1) {
    const { response } = await postAnalyze(
      JSON.stringify(validPayload()),
      {
        limiter,
        createResponse: completion.createResponse,
        identity: { trusted: false },
      }
    );

    if (response.status === 200) {
      allowed += 1;
    } else {
      assert.equal(response.status, 429);
    }
  }

  assert.equal(allowed, ANALYZE_PROCESS_LIMIT);
  assert.equal(completion.calls.length, ANALYZE_PROCESS_LIMIT);
});

test("forwarded addresses are not trusted as separate clients", async () => {
  const limiter = createAnalyzeRateLimiter();
  const completion = completionOk();

  for (let attempt = 0; attempt < ANALYZE_CLIENT_LIMIT + 1; attempt += 1) {
    const { response } = await postAnalyze(
      JSON.stringify(validPayload()),
      {
        limiter,
        createResponse: completion.createResponse,
        headers: {
          "x-forwarded-for": `203.0.113.${attempt}`,
          "x-real-ip": `198.51.100.${attempt}`,
        },
      }
    );

    assert.equal(response.status, 200);
  }

  assert.equal(completion.calls.length, ANALYZE_CLIENT_LIMIT + 1);
  assert.deepEqual(
    resolveAnalyzeClientIdentity(
      new Headers({
        "x-forwarded-for": "203.0.113.9, 10.0.0.4",
        "x-real-ip": "198.51.100.8",
      })
    ),
    { trusted: false }
  );
});

test("an unavailable client identity uses only the process ceiling", () => {
  const limiter = createAnalyzeRateLimiter();
  const now = 8_000_000;

  for (let attempt = 0; attempt < ANALYZE_PROCESS_LIMIT; attempt += 1) {
    assert.equal(
      limiter.check({ trusted: false }, now).allowed,
      true
    );
  }

  assert.equal(
    limiter.check({ trusted: false }, now).allowed,
    false
  );
  assert.equal(
    limiter.check({ trusted: true, key: "   " }, now).allowed,
    false
  );
});

test("tracked client state stays bounded", () => {
  const trackedLimit = 3;
  const limiter = createAnalyzeRateLimiter({
    maxTrackedClients: trackedLimit,
    processLimit: 20,
  });
  const now = 9_000_000;

  for (let index = 0; index < trackedLimit; index += 1) {
    assert.equal(
      limiter.check(
        { trusted: true, key: `client-${index}` },
        now
      ).allowed,
      true
    );
  }

  assert.equal(limiter.trackedClients(), trackedLimit);
  assert.equal(
    limiter.check(
      { trusted: true, key: "one-more-client" },
      now
    ).allowed,
    false
  );
  assert.equal(limiter.trackedClients(), trackedLimit);
  assert.equal(
    limiter.check({ trusted: true, key: "client-0" }, now)
      .allowed,
    true
  );
  assert.equal(ANALYZE_MAX_TRACKED_CLIENTS, 1_000);
});

test("an OpenAI timeout returns a generic client error", async () => {
  const { response, payload } = await postAnalyze(
    JSON.stringify(validPayload()),
    {
      createResponse: async () => {
        throw new Error(
          `timed out while using ${secretMarker}`
        );
      },
    }
  );
  const serialized = JSON.stringify(payload);

  assert.equal(response.status, 500);
  assert.equal(payload.success, false);
  assert.equal(payload.error, "Unable to generate AI analysis.");
  assert.equal(serialized.includes(secretMarker), false);
  assert.equal(serialized.includes("timed out"), false);
});

test("client errors do not include the API key or stack details", async () => {
  const { payload } = await postAnalyze(
    JSON.stringify(validPayload()),
    {
      apiKey: secretMarker,
      createResponse: async () => {
        const error = new Error(`stack using ${secretMarker}`);
        error.stack = `Error: ${secretMarker}\n at secretFrame`;
        throw error;
      },
    }
  );

  const serialized = JSON.stringify(payload);

  assert.equal(serialized.includes(secretMarker), false);
  assert.equal(serialized.includes("secretFrame"), false);
  assert.equal(payload.error, "Unable to generate AI analysis.");
});
