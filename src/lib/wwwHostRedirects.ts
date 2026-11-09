import type { NextConfig } from "next";
import { canonicalApplicationOrigin } from "./applicationOrigin";

type Redirect = Awaited<
  ReturnType<NonNullable<NextConfig["redirects"]>>
>[number];

const wwwHostname = "www.biztoollab.com";

export function wwwHostRedirects(): Redirect[] {
  return [
    {
      source: "/:path*",
      has: [
        {
          type: "host",
          value: wwwHostname,
        },
      ],
      destination: `${canonicalApplicationOrigin}/:path*`,
      permanent: true,
    },
  ];
}
