import crypto from "crypto";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }

  return secret;
}

export function verifyAdminPassword(password: string) {
  const storedValue = process.env.ADMIN_PASSWORD_HASH;

  if (!storedValue) {
    throw new Error("ADMIN_PASSWORD_HASH is not configured.");
  }

  const [saltHex, storedHashHex] = storedValue.split(":");

  if (!saltHex || !storedHashHex) {
    throw new Error("ADMIN_PASSWORD_HASH has an invalid format.");
  }

  const salt = Buffer.from(saltHex, "hex");

  const calculatedHash = crypto.pbkdf2Sync(
    password,
    salt,
    100000,
    64,
    "sha256"
  );

  const storedHash = Buffer.from(storedHashHex, "hex");

  if (calculatedHash.length !== storedHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(calculatedHash, storedHash);
}

export function createAdminSessionToken() {
  const expiresAt =
    Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;

  const payload = String(expiresAt);

  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(token?: string) {
  if (!token) {
    return false;
  }

  const [expiresAtString, suppliedSignature] = token.split(".");

  if (!expiresAtString || !suppliedSignature) {
    return false;
  }

  const expiresAt = Number(expiresAtString);

  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  if (expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(expiresAtString)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const suppliedBuffer = Buffer.from(suppliedSignature, "hex");

  if (expectedBuffer.length !== suppliedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    suppliedBuffer
  );
}

export const adminSessionCookie = {
  name: "biztoollab_admin_session",
  maxAge: SESSION_MAX_AGE_SECONDS,
};