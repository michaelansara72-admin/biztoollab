import assert from "node:assert/strict";
import test from "node:test";
import { canonicalApplicationOrigin } from "../src/lib/applicationOrigin";
import { wwwHostRedirects } from "../src/lib/wwwHostRedirects";

test("www requests redirect permanently to the apex canonical host", () => {
  const redirects = wwwHostRedirects();

  assert.equal(redirects.length, 1);

  const redirect = redirects[0];

  assert.equal(redirect.source, "/:path*");
  assert.equal(redirect.destination, `${canonicalApplicationOrigin}/:path*`);
  assert.equal(redirect.permanent, true);
  assert.deepEqual(redirect.has, [
    {
      type: "host",
      value: "www.biztoollab.com",
    },
  ]);
  assert.equal(redirect.basePath, undefined);
  assert.equal(canonicalApplicationOrigin, "https://biztoollab.com");
});
