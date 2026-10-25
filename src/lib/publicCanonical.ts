import { canonicalApplicationOrigin } from "./applicationOrigin";

/**
 * Public pages that are listed in src/app/sitemap.ts.
 * The homepage entry is the origin with no path and no trailing slash.
 */
export const publicCanonicalPaths = [
  "/",
  "/calculators",
  "/calculators/laundromat-profit-calculator",
  "/calculators/vending-machine-profit-calculator",
  "/calculators/car-wash-profit-roi-calculator",
  "/calculators/startup-cost-calculator",
  "/calculators/break-even-calculator",
  "/calculators/profit-margin-calculator",
  "/calculators/roi-calculator",
  "/calculators/operating-outlook",
  "/calculators/operating-resilience",
  "/about",
  "/privacy",
  "/terms",
  "/contact",
] as const;

export type PublicCanonicalPath = (typeof publicCanonicalPaths)[number];

export function publicCanonicalUrl(path: PublicCanonicalPath): string {
  if (path === "/") {
    return canonicalApplicationOrigin;
  }

  return `${canonicalApplicationOrigin}${path}`;
}
