/**
 * Read-only production SEO audit for https://biztoollab.com.
 *
 * Sends GET requests only. Does not submit forms, set cookies, or change
 * the site. Compare the live response with src/app/sitemap.ts and
 * src/app/robots.ts in this checkout.
 *
 * Run: npx tsx scripts/seo-audit.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CANONICAL_ORIGIN = "https://biztoollab.com";
const USER_AGENT = "BizToolLabSEOAudit/1.0 (read-only investigation)";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 8;

type Severity = "defect" | "warning" | "inconclusive";

type Finding = {
  severity: Severity;
  code: string;
  detail: string;
};

type Hop = {
  url: string;
  status: number;
  location: string | null;
};

type Fetched = {
  hops: Hop[];
  finalUrl: string;
  status: number;
  headers: Headers;
  body: string;
};

const findings: Finding[] = [];

function add(severity: Severity, code: string, detail: string) {
  findings.push({ severity, code, detail });
}

function repositorySitemapPaths(source: string): string[] {
  const paths: string[] = [];
  const pattern = /url:\s*(?:baseUrl|`\$\{baseUrl\}([^`]*)`)/g;

  for (const match of source.matchAll(pattern)) {
    const path = match[1] ?? "/";
    paths.push(path.length === 0 ? "/" : path);
  }

  return paths;
}

function repositoryRobotsSitemap(source: string): string | null {
  const match = source.match(/sitemap:\s*"([^"]+)"/);
  return match?.[1] ?? null;
}

function absolute(path: string): string {
  if (path === "/") {
    return `${CANONICAL_ORIGIN}/`;
  }

  return `${CANONICAL_ORIGIN}${path}`;
}

function withoutHash(value: string): string {
  const url = new URL(value);
  url.hash = "";
  return url.href;
}

function normalizePath(pathname: string): string {
  if (pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

async function follow(start: string): Promise<Fetched> {
  let current = start;
  const hops: Hop[] = [];

  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt += 1) {
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml,text/plain,*/*",
        "user-agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const location = response.headers.get("location");
    hops.push({ url: current, status: response.status, location });

    if (
      response.status >= 300 &&
      response.status < 400 &&
      location &&
      attempt < MAX_REDIRECTS
    ) {
      current = new URL(location, current).href;
      continue;
    }

    return {
      hops,
      finalUrl: current,
      status: response.status,
      headers: response.headers,
      body: await response.text(),
    };
  }

  throw new Error(`Redirect limit exceeded for ${start}`);
}

function linkHrefs(html: string, relValue: string): string[] {
  const hrefs: string[] = [];
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];

  for (const tag of tags) {
    const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i);
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);

    if (!rel || !href) {
      continue;
    }

    const names = rel[1].toLowerCase().split(/\s+/);
    if (names.includes(relValue)) {
      hrefs.push(href[1]);
    }
  }

  return hrefs;
}

function metaByName(html: string, name: string): string[] {
  const contents: string[] = [];
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of tags) {
    const nameMatch = tag.match(/\bname\s*=\s*["']([^"']+)["']/i);
    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);

    if (!nameMatch || !contentMatch) {
      continue;
    }

    if (nameMatch[1].toLowerCase() === name) {
      contents.push(contentMatch[1]);
    }
  }

  return contents;
}

function titleText(html: string): string | null {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match?.[1]?.trim() ?? null;
}

function sitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) =>
    match[1].trim(),
  );
}

function robotsDirectives(text: string): {
  allows: string[];
  disallows: string[];
  sitemaps: string[];
} {
  const allows: string[] = [];
  const disallows: string[] = [];
  const sitemaps: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    const separator = trimmed.indexOf(":");

    if (separator < 1 || trimmed.startsWith("#")) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim().toLowerCase();
    const value = trimmed.slice(separator + 1).trim();

    if (key === "allow") {
      allows.push(value);
    } else if (key === "disallow") {
      disallows.push(value);
    } else if (key === "sitemap") {
      sitemaps.push(value);
    }
  }

  return { allows, disallows, sitemaps };
}

function hopSummary(hops: Hop[]): string {
  return hops
    .map((hop) => {
      const location = hop.location ? ` -> ${hop.location}` : "";
      return `${hop.status} ${hop.url}${location}`;
    })
    .join(" | ");
}

function headerRobots(headers: Headers): string | null {
  return headers.get("x-robots-tag");
}

async function inspectDocument(
  start: string,
  expectation: {
    path: string;
    indexable: boolean;
  },
) {
  let fetched: Fetched;

  try {
    fetched = await follow(start);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    add("inconclusive", "fetch-failed", `${start} could not be fetched: ${message}`);
    return;
  }

  const final = new URL(fetched.finalUrl);
  const redirects = fetched.hops.length - 1;

  if (fetched.status !== 200) {
    add(
      "defect",
      "unexpected-status",
      `${start} ended at ${fetched.status} ${fetched.finalUrl}. Chain: ${hopSummary(fetched.hops)}`,
    );
    return;
  }

  if (final.protocol !== "https:" || final.hostname !== "biztoollab.com") {
    add(
      "defect",
      "final-host",
      `${start} resolved to ${fetched.finalUrl}, not ${CANONICAL_ORIGIN}.`,
    );
  }

  if (normalizePath(final.pathname) !== expectation.path) {
    add(
      "defect",
      "final-path",
      `${start} resolved to path ${final.pathname}. Expected ${expectation.path}.`,
    );
  }

  if (redirects > 1) {
    add(
      "warning",
      "redirect-chain",
      `${start} used ${redirects} redirects. Chain: ${hopSummary(fetched.hops)}`,
    );
  }

  const canonicals = linkHrefs(fetched.body, "canonical").map((href) =>
    withoutHash(new URL(href, fetched.finalUrl).href),
  );
  const robotsMeta = metaByName(fetched.body, "robots");
  const googlebotMeta = metaByName(fetched.body, "googlebot");
  const xRobots = headerRobots(fetched.headers);
  const title = titleText(fetched.body);
  const combinedRobots = [...robotsMeta, ...googlebotMeta, xRobots ?? ""]
    .join(" ")
    .toLowerCase();

  if (!title) {
    add("warning", "missing-title", `${fetched.finalUrl} has no <title>.`);
  }

  if (canonicals.length === 0) {
    add(
      "warning",
      "missing-canonical",
      `${fetched.finalUrl} has no rel=canonical link.`,
    );
  } else if (canonicals.length > 1) {
    add(
      "defect",
      "multiple-canonicals",
      `${fetched.finalUrl} has ${canonicals.length} canonical links: ${canonicals.join(", ")}`,
    );
  } else {
    const canonical = new URL(canonicals[0]);
    if (canonical.protocol !== "https:" || canonical.hostname !== "biztoollab.com") {
      add(
        "defect",
        "canonical-host",
        `${fetched.finalUrl} canonical is ${canonicals[0]}.`,
      );
    } else if (normalizePath(canonical.pathname) !== expectation.path) {
      add(
        "defect",
        "canonical-path",
        `${fetched.finalUrl} canonical path is ${canonical.pathname}. Expected ${expectation.path}.`,
      );
    }
  }

  const noindex = combinedRobots.includes("noindex");
  const none = /(^|[\s,])none([\s,]|$)/.test(combinedRobots);

  if (expectation.indexable && (noindex || none)) {
    add(
      "defect",
      "public-noindex",
      `${fetched.finalUrl} is marked noindex. robots meta: ${robotsMeta.join(" | ") || "(none)"}. x-robots-tag: ${xRobots ?? "(none)"}.`,
    );
  }

  if (!expectation.indexable && !noindex && !none) {
    add(
      "defect",
      "private-indexable",
      `${fetched.finalUrl} has no noindex directive. robots meta: ${robotsMeta.join(" | ") || "(none)"}. x-robots-tag: ${xRobots ?? "(none)"}.`,
    );
  }
}

async function inspectHostVariant(start: string) {
  let fetched: Fetched;

  try {
    fetched = await follow(start);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    add("inconclusive", "host-variant-failed", `${start} could not be fetched: ${message}`);
    return;
  }

  const final = new URL(fetched.finalUrl);

  if (
    fetched.status !== 200 ||
    final.protocol !== "https:" ||
    final.hostname !== "biztoollab.com" ||
    normalizePath(final.pathname) !== "/"
  ) {
    add(
      "defect",
      "host-variant",
      `${start} ended at ${fetched.status} ${fetched.finalUrl}. Chain: ${hopSummary(fetched.hops)}`,
    );
    return;
  }

  if (fetched.hops.length > 2) {
    add(
      "warning",
      "host-redirect-chain",
      `${start} reached the apex host in ${fetched.hops.length - 1} redirects. Chain: ${hopSummary(fetched.hops)}`,
    );
  }
}

async function main() {
  const root = process.cwd();
  const sitemapSource = readFileSync(
    resolve(root, "src/app/sitemap.ts"),
    "utf8",
  );
  const robotsSource = readFileSync(resolve(root, "src/app/robots.ts"), "utf8");
  const expectedPaths = repositorySitemapPaths(sitemapSource);
  const expectedRobotsSitemap = repositoryRobotsSitemap(robotsSource);

  if (expectedPaths.length === 0) {
    add(
      "inconclusive",
      "repository-sitemap",
      "src/app/sitemap.ts did not yield any URL entries.",
    );
  }

  if (expectedRobotsSitemap !== `${CANONICAL_ORIGIN}/sitemap.xml`) {
    add(
      "defect",
      "repository-robots",
      `src/app/robots.ts sitemap value is ${expectedRobotsSitemap ?? "(missing)"}.`,
    );
  }

  console.log(`Repository sitemap paths: ${expectedPaths.length}`);
  console.log(`Repository robots sitemap: ${expectedRobotsSitemap ?? "(missing)"}`);

  let robotsFetched: Fetched;
  try {
    robotsFetched = await follow(`${CANONICAL_ORIGIN}/robots.txt`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    add("inconclusive", "robots-fetch", message);
    robotsFetched = {
      hops: [],
      finalUrl: "",
      status: 0,
      headers: new Headers(),
      body: "",
    };
  }

  let liveLocs: string[] = [];

  if (robotsFetched.status === 200) {
    const parsed = robotsDirectives(robotsFetched.body);
    console.log("--- live robots.txt ---");
    console.log(robotsFetched.body.trim());

    if (parsed.disallows.some((rule) => rule === "/")) {
      add("defect", "robots-disallow-all", "robots.txt disallows /.");
    }

    if (!parsed.allows.includes("/")) {
      add(
        "warning",
        "robots-allow",
        `robots.txt allow rules are: ${parsed.allows.join(", ") || "(none)"}. Repository allows /.`,
      );
    }

    if (parsed.sitemaps.length !== 1 || parsed.sitemaps[0] !== `${CANONICAL_ORIGIN}/sitemap.xml`) {
      add(
        "defect",
        "robots-sitemap",
        `robots.txt sitemap entries: ${parsed.sitemaps.join(", ") || "(none)"}.`,
      );
    }
  } else if (robotsFetched.status !== 0) {
    add(
      "defect",
      "robots-status",
      `robots.txt returned ${robotsFetched.status}. Chain: ${hopSummary(robotsFetched.hops)}`,
    );
  }

  let sitemapFetched: Fetched | null = null;
  try {
    sitemapFetched = await follow(`${CANONICAL_ORIGIN}/sitemap.xml`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    add("inconclusive", "sitemap-fetch", message);
  }

  if (sitemapFetched?.status === 200) {
    liveLocs = sitemapLocs(sitemapFetched.body);
    const livePaths = liveLocs.map((loc) => {
      const url = new URL(loc);
      return {
        loc,
        host: `${url.protocol}//${url.hostname}`,
        path: normalizePath(url.pathname),
      };
    });

    console.log(`Live sitemap URLs: ${liveLocs.length}`);

    const offHost = livePaths.filter((entry) => entry.host !== CANONICAL_ORIGIN);
    if (offHost.length > 0) {
      add(
        "defect",
        "sitemap-host",
        `Sitemap contains non-apex URLs: ${offHost.map((entry) => entry.loc).join(", ")}`,
      );
    }

    const livePathSet = new Set(livePaths.map((entry) => entry.path));
    const expectedSet = new Set(expectedPaths);

    for (const path of expectedPaths) {
      if (!livePathSet.has(path)) {
        add(
          "defect",
          "sitemap-missing-repository-path",
          `${path} is in src/app/sitemap.ts and absent from the live sitemap.`,
        );
      }
    }

    for (const entry of livePaths) {
      if (!expectedSet.has(entry.path)) {
        add(
          "warning",
          "sitemap-extra-live-path",
          `${entry.loc} is live and is not declared in this checkout's src/app/sitemap.ts.`,
        );
      }
    }

    const counts = new Map<string, number>();
    for (const entry of livePaths) {
      counts.set(entry.path, (counts.get(entry.path) ?? 0) + 1);
    }
    for (const [path, count] of counts) {
      if (count > 1) {
        add("defect", "sitemap-duplicate", `${path} appears ${count} times in the live sitemap.`);
      }
    }

    const lastMods = [
      ...sitemapFetched.body.matchAll(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/gi),
    ].map((match) => match[1]);
    const uniqueLastMods = new Set(lastMods);
    if (lastMods.length > 0 && uniqueLastMods.size === 1) {
      add(
        "warning",
        "sitemap-lastmod",
        `All ${lastMods.length} live lastmod values are identical (${[...uniqueLastMods][0]}). src/app/sitemap.ts sets lastModified to new Date() on each request.`,
      );
    }
  } else if (sitemapFetched) {
    add(
      "defect",
      "sitemap-status",
      `sitemap.xml returned ${sitemapFetched.status}. Chain: ${hopSummary(sitemapFetched.hops)}`,
    );
  }

  for (const path of expectedPaths) {
    await inspectDocument(absolute(path), { path, indexable: true });
  }

  await inspectDocument(`${CANONICAL_ORIGIN}/admin/login`, {
    path: "/admin/login",
    indexable: false,
  });

  await inspectHostVariant("http://biztoollab.com/");
  await inspectHostVariant("http://www.biztoollab.com/");
  await inspectHostVariant("https://www.biztoollab.com/");
  await inspectHostVariant("https://biztoollab.com");
  await inspectDocument(`${CANONICAL_ORIGIN}/calculators/`, {
    path: "/calculators",
    indexable: true,
  });

  const order: Severity[] = ["defect", "warning", "inconclusive"];
  console.log("--- findings ---");

  for (const severity of order) {
    const group = findings.filter((finding) => finding.severity === severity);
    console.log(`${severity}: ${group.length}`);
    for (const finding of group) {
      console.log(`- [${finding.code}] ${finding.detail}`);
    }
  }

  if (findings.some((finding) => finding.severity === "inconclusive" && findings.length === 1)) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
