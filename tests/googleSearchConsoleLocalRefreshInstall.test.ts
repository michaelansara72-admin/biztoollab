import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  googleSearchConsoleLocalRefreshInstallOptIn,
  handoffGoogleSearchConsoleRefreshToken,
  installLocalGoogleSearchConsoleRefreshToken,
  isLoopbackRedirectUri,
  localRefreshInstallFailureMessage,
  localRefreshInstalledGoogleFlag,
  localSearchConsoleCredentialNotice,
  productionSearchConsoleCredentialNotice,
  searchConsoleCredentialNotice,
  serverConfiguredGoogleFlag,
} from "../src/lib/googleSearchConsoleLocalRefreshInstall";

const previousRefreshToken = "previous-local-refresh";
const nextRefreshToken = "rotated-local-refresh";
const loopbackRedirect =
  "http://127.0.0.1:3000/api/admin/google/callback";

function allowedInstall(envFilePath: string) {
  return {
    refreshToken: nextRefreshToken,
    adminAuthenticated: true,
    oauthStateValid: true,
    envFilePath,
    nodeEnv: "development",
    allowLocalInstall: "true",
    redirectUri: loopbackRedirect,
  };
}

async function withEnvFile(
  contents: string,
  run: (envFilePath: string, directory: string) => Promise<void>
) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "gsc-refresh-")
  );
  const envFilePath = path.join(
    directory,
    ".env.local"
  );

  await fs.writeFile(envFilePath, contents, "utf8");

  try {
    await run(envFilePath, directory);
  } finally {
    await fs.rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

function assertSecretNotLeaked(value: string) {
  assert.equal(value.includes(nextRefreshToken), false);
  assert.equal(
    value.includes(previousRefreshToken),
    false
  );
  assert.equal(value.includes("client_secret"), false);
  assert.equal(value.includes("access_token"), false);
  assert.equal(value.includes("authorization_code"), false);
}

test("loopback redirect URIs are the only accepted install targets", () => {
  assert.equal(
    isLoopbackRedirectUri(loopbackRedirect),
    true
  );
  assert.equal(
    isLoopbackRedirectUri(
      "http://localhost:3000/api/admin/google/callback"
    ),
    true
  );
  assert.equal(
    isLoopbackRedirectUri("http://[::1]:3000/callback"),
    true
  );
  assert.equal(
    isLoopbackRedirectUri(
      "https://biztoollab.com/api/admin/google/callback"
    ),
    false
  );
  assert.equal(
    isLoopbackRedirectUri(
      "http://localhost.evil.com/callback"
    ),
    false
  );
  assert.equal(
    isLoopbackRedirectUri("not a url"),
    false
  );
});

test("a local install replaces only the refresh token and preserves formatting", async () => {
  const original =
    "# comment\r\n" +
    "OTHER_SETTING=leave-this-line\r\n" +
    `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${previousRefreshToken}\r\n` +
    "NEXT_SETTING=still-here\r\n";

  await withEnvFile(original, async (envFilePath) => {
    const installed =
      await installLocalGoogleSearchConsoleRefreshToken(
        allowedInstall(envFilePath)
      );

    assert.equal(installed, true);
    assert.equal(
      await fs.readFile(envFilePath, "utf8"),
      "# comment\r\n" +
        "OTHER_SETTING=leave-this-line\r\n" +
        `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${nextRefreshToken}\r\n` +
        "NEXT_SETTING=still-here\r\n"
    );
  });
});

test("a missing refresh token key is appended without rewriting other lines", async () => {
  const original = "OTHER_SETTING=leave-this-line\n";

  await withEnvFile(original, async (envFilePath) => {
    const installed =
      await installLocalGoogleSearchConsoleRefreshToken(
        allowedInstall(envFilePath)
      );

    assert.equal(installed, true);
    assert.equal(
      await fs.readFile(envFilePath, "utf8"),
      "OTHER_SETTING=leave-this-line\n" +
        `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${nextRefreshToken}\n`
    );
  });
});

test("duplicate refresh token keys fail closed and preserve the file", async () => {
  const original =
    `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${previousRefreshToken}\n` +
    `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${previousRefreshToken}\n`;

  await withEnvFile(original, async (envFilePath) => {
    const installed =
      await installLocalGoogleSearchConsoleRefreshToken(
        allowedInstall(envFilePath)
      );

    assert.equal(installed, false);
    assert.equal(
      await fs.readFile(envFilePath, "utf8"),
      original
    );
  });
});

test("install is refused when the explicit opt-in is not true", async () => {
  const original = `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${previousRefreshToken}\n`;

  for (const allowLocalInstall of [
    undefined,
    "false",
    "TRUE",
    "",
  ]) {
    await withEnvFile(original, async (envFilePath) => {
      const installed =
        await installLocalGoogleSearchConsoleRefreshToken({
          ...allowedInstall(envFilePath),
          allowLocalInstall,
        });

      assert.equal(installed, false);
      assert.equal(
        await fs.readFile(envFilePath, "utf8"),
        original
      );
    });
  }
});

test("production never installs a refresh token", async () => {
  const original = `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${previousRefreshToken}\n`;

  await withEnvFile(original, async (envFilePath) => {
    const installed =
      await installLocalGoogleSearchConsoleRefreshToken({
        ...allowedInstall(envFilePath),
        nodeEnv: "production",
      });

    assert.equal(installed, false);
    assert.equal(
      await fs.readFile(envFilePath, "utf8"),
      original
    );
  });
});

test("missing admin authentication or OAuth state does not install", async () => {
  const original = `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${previousRefreshToken}\n`;

  for (const flags of [
    {
      adminAuthenticated: false,
      oauthStateValid: true,
    },
    {
      adminAuthenticated: true,
      oauthStateValid: false,
    },
  ]) {
    await withEnvFile(original, async (envFilePath) => {
      const installed =
        await installLocalGoogleSearchConsoleRefreshToken({
          ...allowedInstall(envFilePath),
          ...flags,
        });

      assert.equal(installed, false);
      assert.equal(
        await fs.readFile(envFilePath, "utf8"),
        original
      );
    });
  }
});

test("a failed replacement preserves the original file and removes the temp file", async () => {
  const original = `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${previousRefreshToken}\n`;

  await withEnvFile(
    original,
    async (envFilePath, directory) => {
      const handle = await fs.open(envFilePath, "r+");

      try {
        const installed =
          await installLocalGoogleSearchConsoleRefreshToken(
            allowedInstall(envFilePath)
          );

        assert.equal(installed, false);
      } finally {
        await handle.close();
      }

      assert.equal(
        await fs.readFile(envFilePath, "utf8"),
        original
      );

      const entries = await fs.readdir(directory);
      assert.equal(
        entries.some((entry) => entry.includes(".tmp")),
        false
      );
    }
  );
});

test("a symlinked env file is not updated", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "gsc-refresh-link-")
  );
  const target = path.join(directory, "real.env");
  const link = path.join(directory, ".env.local");
  const original = `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${previousRefreshToken}\n`;

  await fs.writeFile(target, original, "utf8");

  try {
    await fs.symlink(target, link, "file");
  } catch {
    await fs.rm(directory, {
      recursive: true,
      force: true,
    });
    return;
  }

  try {
    const installed =
      await installLocalGoogleSearchConsoleRefreshToken(
        allowedInstall(link)
      );

    assert.equal(installed, false);
    assert.equal(
      await fs.readFile(target, "utf8"),
      original
    );
  } finally {
    await fs.rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test("failure results do not contain credential material", () => {
  assertSecretNotLeaked(localRefreshInstallFailureMessage);
  assert.equal(
    googleSearchConsoleLocalRefreshInstallOptIn,
    "GOOGLE_SEARCH_CONSOLE_ALLOW_LOCAL_REFRESH_INSTALL"
  );
});

test("opted-in loopback development uses the installer", async () => {
  const original = `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${previousRefreshToken}\n`;
  let installerCalls = 0;

  await withEnvFile(original, async (envFilePath) => {
    const handoff =
      await handoffGoogleSearchConsoleRefreshToken({
        ...allowedInstall(envFilePath),
        installLocalRefreshToken: async (input) => {
          installerCalls += 1;
          return installLocalGoogleSearchConsoleRefreshToken(
            input
          );
        },
      });

    assert.equal(handoff.action, "installed");
    assert.equal(installerCalls, 1);
    assert.equal(
      await fs.readFile(envFilePath, "utf8"),
      `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${nextRefreshToken}\n`
    );
  });
});

test("development without the opt-in stays server-configured and does not install", async () => {
  const original = `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${previousRefreshToken}\n`;
  let installerCalls = 0;

  await withEnvFile(original, async (envFilePath) => {
    const handoff =
      await handoffGoogleSearchConsoleRefreshToken({
        ...allowedInstall(envFilePath),
        allowLocalInstall: "false",
        installLocalRefreshToken: async () => {
          installerCalls += 1;
          return true;
        },
      });

    assert.equal(handoff.action, "server-configured");
    assert.equal(installerCalls, 0);
    assert.equal(
      await fs.readFile(envFilePath, "utf8"),
      original
    );
  });
});

test("production stays server-configured and never invokes the installer", async () => {
  const original = `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${previousRefreshToken}\n`;
  let installerCalls = 0;

  await withEnvFile(original, async (envFilePath) => {
    const handoff =
      await handoffGoogleSearchConsoleRefreshToken({
        ...allowedInstall(envFilePath),
        nodeEnv: "production",
        installLocalRefreshToken: async () => {
          installerCalls += 1;
          throw new Error(
            "Production invoked the local installer."
          );
        },
      });

    assert.equal(handoff.action, "server-configured");
    assert.equal(installerCalls, 0);
    assert.equal(
      await fs.readFile(envFilePath, "utf8"),
      original
    );
  });
});

test("invalid auth or OAuth state does not install", async () => {
  const original = `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${previousRefreshToken}\n`;

  for (const flags of [
    {
      adminAuthenticated: false,
      oauthStateValid: true,
    },
    {
      adminAuthenticated: true,
      oauthStateValid: false,
    },
  ]) {
    let installerCalls = 0;

    await withEnvFile(original, async (envFilePath) => {
      const handoff =
        await handoffGoogleSearchConsoleRefreshToken({
          ...allowedInstall(envFilePath),
          ...flags,
          installLocalRefreshToken: async () => {
            installerCalls += 1;
            return true;
          },
        });

      assert.equal(handoff.action, "failed");
      assert.equal(installerCalls, 0);
      assert.equal(
        await fs.readFile(envFilePath, "utf8"),
        original
      );
    });
  }
});

test("installer failure leaves the env file unchanged", async () => {
  const original =
    `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${previousRefreshToken}\n` +
    `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${previousRefreshToken}\n`;

  await withEnvFile(original, async (envFilePath) => {
    const handoff =
      await handoffGoogleSearchConsoleRefreshToken(
        allowedInstall(envFilePath)
      );

    assert.equal(handoff.action, "failed");
    assert.equal(
      await fs.readFile(envFilePath, "utf8"),
      original
    );
  });
});

test("credential notices stay fixed and do not echo a supplied flag", () => {
  assert.equal(
    searchConsoleCredentialNotice(
      serverConfiguredGoogleFlag
    ),
    productionSearchConsoleCredentialNotice
  );
  assert.equal(
    searchConsoleCredentialNotice(
      localRefreshInstalledGoogleFlag
    ),
    localSearchConsoleCredentialNotice
  );
  assert.equal(
    searchConsoleCredentialNotice(
      "refresh-token-ready"
    ),
    null
  );
  assert.equal(
    searchConsoleCredentialNotice(nextRefreshToken),
    null
  );
  assert.equal(
    searchConsoleCredentialNotice(undefined),
    null
  );

  for (const notice of [
    productionSearchConsoleCredentialNotice,
    localSearchConsoleCredentialNotice,
  ]) {
    assertSecretNotLeaked(notice);
    assert.equal(notice.includes("GOOGLE_"), false);
    assert.equal(notice.includes(".env"), false);
  }
});

test("the production callback does not store a refresh token cookie", async () => {
  const source = await fs.readFile(
    path.join(
      process.cwd(),
      "src/app/api/admin/google/callback/route.ts"
    ),
    "utf8"
  );

  assert.equal(
    source.includes(
      "biztoollab_google_refresh_token_temp"
    ),
    false
  );
  assert.equal(
    source.includes("refresh-token-ready"),
    false
  );
  assert.match(
    source,
    /handoffGoogleSearchConsoleRefreshToken/
  );
  assert.equal(
    source.includes(
      "installLocalGoogleSearchConsoleRefreshToken"
    ),
    false
  );
  assert.match(
    source,
    /serverConfiguredGoogleFlag/
  );
  assert.match(
    source,
    /localRefreshInstalledGoogleFlag/
  );
  assert.match(source, /request\.url/);
  assert.equal(source.includes(nextRefreshToken), false);
  assert.equal(
    source.includes(previousRefreshToken),
    false
  );
});
