export const canonicalApplicationOrigin =
  "https://biztoollab.com";

const loopbackHosts = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
]);

const applicationHosts = new Set([
  "biztoollab.com",
  "www.biztoollab.com",
]);

export type ApplicationOriginInput = {
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
  requestUrl?: string | null;
};

function headerValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (
    !trimmed ||
    trimmed.includes(",") ||
    /[\s\\]/.test(trimmed)
  ) {
    return null;
  }

  return trimmed;
}

function protocolName(value: string | null) {
  if (value === "http" || value === "https") {
    return value;
  }

  return null;
}

function originForHost(
  hostHeader: string | null,
  requestedProtocol: "http" | "https" | null
) {
  if (!hostHeader) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(`http://${hostHeader}`);
  } catch {
    return null;
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    return null;
  }

  const hostname = parsed.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  const loopback = loopbackHosts.has(hostname);
  const application = applicationHosts.has(hostname);

  if (!loopback && !application) {
    return null;
  }

  if (
    parsed.port &&
    (!/^\d+$/.test(parsed.port) ||
      Number(parsed.port) < 1 ||
      Number(parsed.port) > 65535)
  ) {
    return null;
  }

  const port = parsed.port
    ? Number(parsed.port)
    : undefined;
  const protocol = loopback
    ? requestedProtocol ?? "http"
    : "https";

  if (!loopback && port && port !== 443) {
    return null;
  }

  const defaultPort =
    (protocol === "https" && port === 443) ||
    (protocol === "http" && port === 80);

  const portSuffix =
    port && !defaultPort ? `:${port}` : "";
  const hostLabel = hostname.includes(":")
    ? `[${hostname}]`
    : hostname;

  return `${protocol}://${hostLabel}${portSuffix}`;
}

function protocolFromRequestUrl(requestUrl: string | null) {
  if (!requestUrl) {
    return null;
  }

  try {
    const protocol = new URL(requestUrl).protocol;

    if (protocol === "http:") {
      return "http" as const;
    }

    if (protocol === "https:") {
      return "https" as const;
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveApplicationOrigin(
  input: ApplicationOriginInput
) {
  const forwardedHost = headerValue(input.forwardedHost);
  const forwardedProto = protocolName(
    headerValue(input.forwardedProto)?.toLowerCase() ??
      null
  );

  if (input.forwardedHost?.trim()) {
    return (
      originForHost(forwardedHost, forwardedProto) ??
      canonicalApplicationOrigin
    );
  }

  const requestProtocol = protocolFromRequestUrl(
    input.requestUrl ?? null
  );

  return (
    originForHost(
      headerValue(input.host),
      forwardedProto ?? requestProtocol
    ) ?? canonicalApplicationOrigin
  );
}
