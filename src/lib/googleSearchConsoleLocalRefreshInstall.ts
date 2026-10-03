import crypto from "node:crypto";
import path from "node:path";
import * as fs from "node:fs/promises";

export const googleSearchConsoleLocalRefreshInstallOptIn =
  "GOOGLE_SEARCH_CONSOLE_ALLOW_LOCAL_REFRESH_INSTALL";

export const localRefreshInstallFailureMessage =
  "Local Search Console refresh token installation failed.";

const refreshTokenKey =
  "GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN";

type InstallLocalRefreshTokenInput = {
  refreshToken: string;
  adminAuthenticated: boolean;
  oauthStateValid: boolean;
  envFilePath: string;
  nodeEnv?: string;
  allowLocalInstall?: string;
  redirectUri?: string;
};

export type RefreshTokenHandoff =
  | {
      action: "installed";
    }
  | {
      action: "cookie";
    }
  | {
      action: "failed";
    };

export function isLoopbackRedirectUri(
  value: string | undefined
) {
  if (!value) {
    return false;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.username || url.password) {
    return false;
  }

  if (
    url.protocol !== "http:" &&
    url.protocol !== "https:"
  ) {
    return false;
  }

  const hostname = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "");

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

function isSafeRefreshToken(value: string) {
  return (
    value.length > 0 &&
    value.length <= 512 &&
    !/[\s#"'\\]/.test(value) &&
    !/[\u0000-\u001F\u007F]/.test(value)
  );
}

function splitEnvContents(contents: string) {
  if (!contents) {
    return {
      newline: "\n",
      lines: [] as string[],
      trailingNewline: false,
    };
  }

  const newline = contents.includes("\r\n")
    ? "\r\n"
    : contents.includes("\n")
      ? "\n"
      : contents.includes("\r")
        ? "\r"
        : "\n";

  const trailingNewline =
    contents.endsWith("\n") ||
    contents.endsWith("\r");

  const lines = contents.split(/\r?\n|\r/);

  if (trailingNewline && lines.at(-1) === "") {
    lines.pop();
  }

  return {
    newline,
    lines,
    trailingNewline,
  };
}

function joinEnvContents(
  lines: readonly string[],
  newline: string,
  trailingNewline: boolean
) {
  const body = lines.join(newline);

  if (!trailingNewline) {
    return body;
  }

  return body ? `${body}${newline}` : newline;
}

function refreshTokenLineIndex(line: string) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) {
    return false;
  }

  const separator = trimmed.indexOf("=");

  if (separator < 1) {
    return false;
  }

  return (
    trimmed.slice(0, separator).trim() ===
    refreshTokenKey
  );
}

export function replaceGoogleSearchConsoleRefreshToken(
  contents: string,
  refreshToken: string
) {
  if (!isSafeRefreshToken(refreshToken)) {
    return null;
  }

  const { newline, lines, trailingNewline } =
    splitEnvContents(contents);

  const matches = lines.flatMap(
    (line, index) =>
      refreshTokenLineIndex(line) ? [index] : []
  );

  if (matches.length > 1) {
    return null;
  }

  const nextLines = [...lines];

  if (matches.length === 1) {
    const index = matches[0];
    const line = nextLines[index] ?? "";
    const separator = line.indexOf("=");

    if (separator < 0) {
      return null;
    }

    const prefix = line.slice(0, separator + 1);
    const currentValue = line
      .slice(separator + 1)
      .trim();
    const leadingSpace =
      line.slice(separator + 1).match(/^\s*/)?.[0] ??
      "";
    const quote =
      (currentValue.startsWith('"') &&
        currentValue.endsWith('"') &&
        currentValue.length >= 2) ||
      (currentValue.startsWith("'") &&
        currentValue.endsWith("'") &&
        currentValue.length >= 2)
        ? currentValue[0]
        : "";

    nextLines[index] = quote
      ? `${prefix}${leadingSpace}${quote}${refreshToken}${quote}`
      : `${prefix}${leadingSpace}${refreshToken}`;
  } else {
    nextLines.push(
      `${refreshTokenKey}=${refreshToken}`
    );
  }

  return joinEnvContents(
    nextLines,
    newline,
    matches.length === 0 ? true : trailingNewline
  );
}

async function assertRegularEnvFile(envFilePath: string) {
  const resolved = path.resolve(envFilePath);
  const parent = path.dirname(resolved);
  const parentStat = await fs.lstat(parent);

  if (
    parentStat.isSymbolicLink() ||
    !parentStat.isDirectory()
  ) {
    throw new Error(
      "Env directory is not a regular directory."
    );
  }

  const fileStat = await fs.lstat(resolved);

  if (
    fileStat.isSymbolicLink() ||
    !fileStat.isFile()
  ) {
    throw new Error(
      "Env file is not a regular file."
    );
  }

  return resolved;
}

async function replaceFileAtomically(
  envFilePath: string,
  contents: string
) {
  const tempPath = path.join(
    path.dirname(envFilePath),
    `.${path.basename(envFilePath)}.${crypto
      .randomBytes(16)
      .toString("hex")}.tmp`
  );
  let handle: fs.FileHandle | undefined;

  try {
    handle = await fs.open(tempPath, "wx", 0o600);
    await handle.writeFile(contents, "utf8");
    await handle.sync();
    await handle.chmod(0o600);

    const tempStat = await fs.lstat(tempPath);

    if (
      tempStat.isSymbolicLink() ||
      !tempStat.isFile()
    ) {
      throw new Error(
        "Temporary env file was not a regular file."
      );
    }

    if (
      process.platform !== "win32" &&
      (tempStat.mode & 0o077) !== 0
    ) {
      throw new Error(
        "Temporary env file permissions were too broad."
      );
    }

    await handle.close();
    handle = undefined;
    await fs.rename(tempPath, envFilePath);
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => undefined);
    }

    await fs.unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

export async function installLocalGoogleSearchConsoleRefreshToken({
  refreshToken,
  adminAuthenticated,
  oauthStateValid,
  envFilePath,
  nodeEnv = process.env.NODE_ENV,
  allowLocalInstall = process.env[
    googleSearchConsoleLocalRefreshInstallOptIn
  ],
  redirectUri = process.env
    .GOOGLE_SEARCH_CONSOLE_REDIRECT_URI,
}: InstallLocalRefreshTokenInput) {
  if (!adminAuthenticated || !oauthStateValid) {
    return false;
  }

  if (nodeEnv === "production") {
    return false;
  }

  if (allowLocalInstall !== "true") {
    return false;
  }

  if (!isLoopbackRedirectUri(redirectUri)) {
    return false;
  }

  try {
    const resolved =
      await assertRegularEnvFile(envFilePath);
    const current = await fs.readFile(
      resolved,
      "utf8"
    );
    const contents =
      replaceGoogleSearchConsoleRefreshToken(
        current,
        refreshToken
      );

    if (contents === null) {
      return false;
    }

    await replaceFileAtomically(
      resolved,
      contents
    );

    return true;
  } catch {
    return false;
  }
}

export function shouldUseLocalRefreshInstall({
  nodeEnv = process.env.NODE_ENV,
  allowLocalInstall = process.env[
    googleSearchConsoleLocalRefreshInstallOptIn
  ],
  redirectUri = process.env
    .GOOGLE_SEARCH_CONSOLE_REDIRECT_URI,
}: {
  nodeEnv?: string;
  allowLocalInstall?: string;
  redirectUri?: string;
}) {
  return (
    nodeEnv !== "production" &&
    allowLocalInstall === "true" &&
    isLoopbackRedirectUri(redirectUri)
  );
}

export async function handoffGoogleSearchConsoleRefreshToken(
  input: InstallLocalRefreshTokenInput & {
    installLocalRefreshToken?: (
      value: InstallLocalRefreshTokenInput
    ) => Promise<boolean>;
  }
): Promise<RefreshTokenHandoff> {
  if (
    !input.adminAuthenticated ||
    !input.oauthStateValid
  ) {
    return {
      action: "failed",
    };
  }

  if (!shouldUseLocalRefreshInstall(input)) {
    return {
      action: "cookie",
    };
  }

  const install =
    input.installLocalRefreshToken ??
    installLocalGoogleSearchConsoleRefreshToken;
  const installed = await install(input);

  return installed
    ? {
        action: "installed",
      }
    : {
        action: "failed",
      };
}
