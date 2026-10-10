import { NextResponse } from "next/server";
import {
  adminSessionCookie,
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/adminAuth";
import { readBoundedJsonBody } from "@/lib/ai/analyzeRequestGuard";
import {
  LOGIN_BODY_TOO_LARGE_MESSAGE,
  LOGIN_INVALID_CREDENTIALS_MESSAGE,
  LOGIN_MAX_BODY_BYTES,
  LOGIN_MAX_PASSWORD_LENGTH,
  LOGIN_RATE_LIMIT_MESSAGE,
  LOGIN_UNABLE_MESSAGE,
  createAdminLoginLimiter,
  resolveAdminClientIdentity,
  type AdminLoginLimiter,
} from "@/lib/adminLoginGuard";

export type AdminLoginDependencies = {
  now?: () => number;
  limiter?: AdminLoginLimiter;
  verifyPassword?: (password: string) => boolean;
  createSessionToken?: () => string;
};

const sharedLimiter = createAdminLoginLimiter();

function jsonError(
  error: string,
  status: number,
  headers?: Record<string, string>
) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    {
      status,
      headers,
    }
  );
}

function passwordFromBody(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return "";
  }

  const password = (value as { password?: unknown }).password;

  return typeof password === "string" ? password : "";
}

export async function handleAdminLogin(
  request: Request,
  dependencies: AdminLoginDependencies = {}
) {
  const limiter = dependencies.limiter ?? sharedLimiter;
  const now = dependencies.now ?? (() => Date.now());
  const identity = resolveAdminClientIdentity(request.headers);
  const decision = limiter.check(now(), identity);

  if (!decision.allowed) {
    return jsonError(LOGIN_RATE_LIMIT_MESSAGE, 429, {
      "Retry-After": String(decision.retryAfterSeconds),
    });
  }

  try {
    const bodyResult = await readBoundedJsonBody(
      request,
      LOGIN_MAX_BODY_BYTES
    );

    if (!bodyResult.ok) {
      return jsonError(
        bodyResult.status === 413
          ? LOGIN_BODY_TOO_LARGE_MESSAGE
          : LOGIN_UNABLE_MESSAGE,
        bodyResult.status
      );
    }

    const password = passwordFromBody(bodyResult.value);

    if (
      password.length === 0 ||
      password.length > LOGIN_MAX_PASSWORD_LENGTH
    ) {
      return jsonError(LOGIN_INVALID_CREDENTIALS_MESSAGE, 401);
    }

    const verifyPassword =
      dependencies.verifyPassword ?? verifyAdminPassword;

    if (!verifyPassword(password)) {
      return jsonError(LOGIN_INVALID_CREDENTIALS_MESSAGE, 401);
    }

    const sessionToken = (
      dependencies.createSessionToken ?? createAdminSessionToken
    )();

    limiter.reset();

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set({
      name: adminSessionCookie.name,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: adminSessionCookie.maxAge,
    });

    return response;
  } catch {
    return jsonError(LOGIN_UNABLE_MESSAGE, 400);
  }
}
