/**
 * Process-wide login admission for one Node process.
 *
 * Hostinger's proxy behavior is not established in this repository.
 * X-Forwarded-For and X-Real-IP stay caller-controlled, so they are
 * not a client identity. Every login shares one allowance.
 *
 * Eight password checks may start immediately. A later check waits
 * until an earlier one leaves the 60 second window, which is at most
 * 60 seconds. Checks that are turned away are not recorded, so they
 * do not move that deadline. A correct password clears the window.
 * There is no permanent lock and no escalating delay.
 *
 * The hash does not reveal the current password's length. The
 * character cap is 4096, which still accepts any ordinary passphrase,
 * while the body cap rejects multi-kilobyte payloads before hashing.
 */

export const LOGIN_MAX_BODY_BYTES = 8192;

export const LOGIN_MAX_PASSWORD_LENGTH = 4096;

export const LOGIN_ATTEMPT_LIMIT = 8;

export const LOGIN_WINDOW_MS = 60_000;

export const LOGIN_INVALID_CREDENTIALS_MESSAGE =
  "Invalid credentials.";

export const LOGIN_UNABLE_MESSAGE = "Unable to process login.";

export const LOGIN_BODY_TOO_LARGE_MESSAGE =
  "Request body is too large.";

export const LOGIN_RATE_LIMIT_MESSAGE =
  "Too many login attempts. Please wait and try again.";

export type AdminClientIdentity = {
  trusted: false;
};

export function resolveAdminClientIdentity(
  headers: Headers
): AdminClientIdentity {
  headers.get("x-forwarded-for");
  headers.get("x-real-ip");

  return { trusted: false };
}

export type AdminLoginDecision =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      retryAfterSeconds: number;
    };

export function createAdminLoginLimiter() {
  let attempts: number[] = [];

  function prune(now: number) {
    const active = attempts.filter(
      (timestamp) => now - timestamp < LOGIN_WINDOW_MS
    );

    attempts = active;
  }

  return {
    pendingAttempts() {
      return attempts.length;
    },

    reset() {
      attempts = [];
    },

    check(
      now: number,
      _identity: AdminClientIdentity
    ): AdminLoginDecision {
      prune(now);

      if (attempts.length >= LOGIN_ATTEMPT_LIMIT) {
        const oldest = attempts[0] ?? now;
        const retryAfterMs = Math.max(
          0,
          oldest + LOGIN_WINDOW_MS - now
        );

        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil(retryAfterMs / 1000)
          ),
        };
      }

      attempts = [...attempts, now];

      return { allowed: true };
    },
  };
}

export type AdminLoginLimiter = ReturnType<
  typeof createAdminLoginLimiter
>;
