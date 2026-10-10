export const ANALYZE_MAX_BODY_BYTES = 32_768;

export const ANALYZE_CLIENT_LIMIT = 5;
export const ANALYZE_CLIENT_WINDOW_MS = 60_000;

export const ANALYZE_PROCESS_LIMIT = 30;
export const ANALYZE_PROCESS_WINDOW_MS = 60_000;

export const ANALYZE_MAX_TRACKED_CLIENTS = 1_000;

export const ANALYZE_OPENAI_TIMEOUT_MS = 20_000;

export const ANALYZE_RATE_LIMIT_MESSAGE =
  "Too many AI requests. Please wait a moment and try again.";

export const ANALYZE_BODY_TOO_LARGE_MESSAGE =
  "Request body is too large.";

export const ANALYZE_INVALID_JSON_MESSAGE = "Invalid JSON.";

/**
 * In-memory limits apply only inside the current Node process.
 * They reset on restart and are not shared across instances.
 *
 * This repository does not identify a trusted proxy for Hostinger.
 * X-Forwarded-For and X-Real-IP are caller-controlled unless the
 * platform replaces them, which is not established here, so they
 * are not used as a client identity.
 */
export type AnalyzeClientIdentity =
  | {
      trusted: false;
    }
  | {
      trusted: true;
      key: string;
    };

export function resolveAnalyzeClientIdentity(
  headers: Headers
): AnalyzeClientIdentity {
  headers.get("x-forwarded-for");
  headers.get("x-real-ip");

  return { trusted: false };
}

type BodyRead =
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      status: 400 | 413;
      error: string;
    };

export async function readBoundedJsonBody(
  request: Request,
  maxBytes = ANALYZE_MAX_BODY_BYTES
): Promise<BodyRead> {
  const declaredLength = request.headers.get("content-length");

  if (declaredLength !== null && declaredLength.trim() !== "") {
    if (!/^\d+$/.test(declaredLength.trim())) {
      return {
        ok: false,
        status: 400,
        error: ANALYZE_INVALID_JSON_MESSAGE,
      };
    }

    if (Number(declaredLength) > maxBytes) {
      return {
        ok: false,
        status: 413,
        error: ANALYZE_BODY_TOO_LARGE_MESSAGE,
      };
    }
  }

  const reader = request.body?.getReader();

  if (!reader) {
    return {
      ok: false,
      status: 400,
      error: ANALYZE_INVALID_JSON_MESSAGE,
    };
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      total += value.byteLength;

      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);

        return {
          ok: false,
          status: 413,
          error: ANALYZE_BODY_TOO_LARGE_MESSAGE,
        };
      }

      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);

    return {
      ok: false,
      status: 400,
      error: ANALYZE_INVALID_JSON_MESSAGE,
    };
  }

  const encoded = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    encoded.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder().decode(encoded);

  try {
    return {
      ok: true,
      value: JSON.parse(text) as unknown,
    };
  } catch {
    return {
      ok: false,
      status: 400,
      error: ANALYZE_INVALID_JSON_MESSAGE,
    };
  }
}

function recentHits(hits: number[], now: number, windowMs: number) {
  return hits.filter((timestamp) => now - timestamp < windowMs);
}

export function createAnalyzeRateLimiter(
  limits: {
    clientLimit?: number;
    processLimit?: number;
    maxTrackedClients?: number;
  } = {}
) {
  const clientLimit = limits.clientLimit ?? ANALYZE_CLIENT_LIMIT;
  const processLimit = limits.processLimit ?? ANALYZE_PROCESS_LIMIT;
  const maxTrackedClients =
    limits.maxTrackedClients ?? ANALYZE_MAX_TRACKED_CLIENTS;
  const clientHits = new Map<string, number[]>();
  let processHits: number[] = [];

  function prune(now: number) {
    processHits = recentHits(
      processHits,
      now,
      ANALYZE_PROCESS_WINDOW_MS
    );

    for (const [key, hits] of clientHits) {
      const active = recentHits(
        hits,
        now,
        ANALYZE_CLIENT_WINDOW_MS
      );

      if (active.length === 0) {
        clientHits.delete(key);
      } else {
        clientHits.set(key, active);
      }
    }
  }

  return {
    trackedClients() {
      return clientHits.size;
    },

    check(identity: AnalyzeClientIdentity, now: number) {
      prune(now);

      const clientKey = identity.trusted
        ? identity.key.trim()
        : "";
      const trackClient = clientKey.length > 0;

      if (trackClient) {
        const hits = clientHits.get(clientKey) ?? [];

        if (hits.length >= clientLimit) {
          return { allowed: false as const };
        }

        if (
          !clientHits.has(clientKey) &&
          clientHits.size >= maxTrackedClients
        ) {
          return { allowed: false as const };
        }
      }

      if (processHits.length >= processLimit) {
        return { allowed: false as const };
      }

      if (trackClient) {
        const hits = clientHits.get(clientKey) ?? [];
        clientHits.set(clientKey, [...hits, now]);
      }

      processHits = [...processHits, now];

      return { allowed: true as const };
    },
  };
}

export type AnalyzeRateLimiter = ReturnType<
  typeof createAnalyzeRateLimiter
>;
