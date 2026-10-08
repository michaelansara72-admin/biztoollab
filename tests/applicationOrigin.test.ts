import test from "node:test";
import assert from "node:assert/strict";

import {
  canonicalApplicationOrigin,
  resolveApplicationOrigin,
} from "../src/lib/applicationOrigin";

test("a forwarded public host stays on the application over https", () => {
  assert.equal(
    resolveApplicationOrigin({
      forwardedHost: "biztoollab.com",
      forwardedProto: "https",
      host: "internal.example",
      requestUrl: "http://internal.example/api/admin/google/connect",
    }),
    "https://biztoollab.com"
  );
});

test("loopback development keeps its http origin and port", () => {
  assert.equal(
    resolveApplicationOrigin({
      host: "localhost:3000",
      requestUrl:
        "http://localhost:3000/api/admin/google/connect",
    }),
    "http://localhost:3000"
  );
});

test("an untrusted forwarded host cannot choose the redirect origin", () => {
  assert.equal(
    resolveApplicationOrigin({
      forwardedHost: "evil.example",
      forwardedProto: "https",
      host: "biztoollab.com",
      requestUrl: "https://biztoollab.com/api/admin/google/connect",
    }),
    canonicalApplicationOrigin
  );
});

test("a forwarded host list is rejected", () => {
  assert.equal(
    resolveApplicationOrigin({
      forwardedHost: "biztoollab.com, evil.example",
      forwardedProto: "https",
    }),
    canonicalApplicationOrigin
  );
});

test("a public host is not redirected to an alternate port", () => {
  assert.equal(
    resolveApplicationOrigin({
      forwardedHost: "www.biztoollab.com:8443",
      forwardedProto: "https",
    }),
    canonicalApplicationOrigin
  );
});

test("an IPv6 loopback host keeps its port", () => {
  assert.equal(
    resolveApplicationOrigin({
      host: "[::1]:3000",
      requestUrl:
        "http://[::1]:3000/api/admin/google/connect",
    }),
    "http://[::1]:3000"
  );
});

test("a missing host falls back to the canonical application origin", () => {
  assert.equal(
    resolveApplicationOrigin({
      requestUrl: "http://10.0.0.8/api/admin/google/connect",
    }),
    canonicalApplicationOrigin
  );
});
