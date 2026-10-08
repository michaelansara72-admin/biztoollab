import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import SearchConsoleCredentialNotice from "../src/app/admin/components/SearchConsoleCredentialNotice";
import {
  localRefreshInstalledGoogleFlag,
  productionSearchConsoleCredentialNotice,
  serverConfiguredGoogleFlag,
} from "../src/lib/googleSearchConsoleLocalRefreshInstall";

test("the production callback notice does not offer a reconnect control", () => {
  const html = renderToStaticMarkup(
    createElement(SearchConsoleCredentialNotice, {
      googleFlag: serverConfiguredGoogleFlag,
    })
  );

  assert.match(
    html,
    new RegExp(productionSearchConsoleCredentialNotice)
  );
  assert.match(html, /configured on the server/);
  assert.match(html, /did not change them/);
  assert.doesNotMatch(html, /<a /);
  assert.doesNotMatch(html, /<button/);
  assert.doesNotMatch(html, /google\/connect/);
});

test("the local installer notice does not display a credential", () => {
  const html = renderToStaticMarkup(
    createElement(SearchConsoleCredentialNotice, {
      googleFlag: localRefreshInstalledGoogleFlag,
    })
  );

  assert.match(html, /was not displayed/);
  assert.doesNotMatch(html, /ya29/);
  assert.doesNotMatch(html, /refresh_token/);
});

test("an unexpected callback flag renders nothing", () => {
  const html = renderToStaticMarkup(
    createElement(SearchConsoleCredentialNotice, {
      googleFlag: "refresh-token-ready&token=secret",
    })
  );

  assert.equal(html, "");
});
