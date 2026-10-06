import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  buildMigrationConnectionConfig,
  loadOptionalLocalEnv,
} from "../scripts/database/migrationConnection.mjs";

const samplePassword = "test-password-do-not-leak";

function sampleEnvironment(
  overrides: Record<string, string | undefined> = {}
): NodeJS.ProcessEnv {
  return {
    MYSQL_HOST: "db.example.test",
    MYSQL_PORT: "3306",
    MYSQL_DATABASE: "biztoollab_test",
    MYSQL_USER: "migration_test_user",
    MYSQL_PASSWORD: samplePassword,
    ...overrides,
  } as unknown as NodeJS.ProcessEnv;
}

test("verified TLS and the connection timeout are always set", () => {
  const config = buildMigrationConnectionConfig(
    sampleEnvironment()
  );

  assert.deepEqual(config, {
    host: "db.example.test",
    port: 3306,
    database: "biztoollab_test",
    user: "migration_test_user",
    password: samplePassword,
    connectTimeout: 10000,
    ssl: {
      rejectUnauthorized: true,
    },
  });
});

test("a missing or empty required variable fails closed without echoing values", () => {
  for (const name of [
    "MYSQL_HOST",
    "MYSQL_PORT",
    "MYSQL_DATABASE",
    "MYSQL_USER",
    "MYSQL_PASSWORD",
  ]) {
    assert.throws(
      () =>
        buildMigrationConnectionConfig(
          sampleEnvironment({
            [name]: undefined,
          })
        ),
      {
        message:
          `Missing required database environment variable: ${name}`,
      }
    );

    assert.throws(
      () =>
        buildMigrationConnectionConfig(
          sampleEnvironment({
            [name]: "   ",
          })
        ),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(
          error.message,
          `Missing required database environment variable: ${name}`
        );
        assert.equal(
          error.message.includes(samplePassword),
          false
        );
        assert.equal(
          error.message.includes("db.example.test"),
          false
        );
        return true;
      }
    );
  }
});

test("invalid ports are rejected without echoing the supplied text", () => {
  for (const port of ["0", "-1", "3306.5", "nope", "1e3"]) {
    assert.throws(
      () =>
        buildMigrationConnectionConfig(
          sampleEnvironment({
            MYSQL_PORT: port,
          })
        ),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(
          error.message,
          "MYSQL_PORT must be a valid positive integer."
        );
        assert.equal(error.message.includes(port), false);
        assert.equal(
          error.message.includes(samplePassword),
          false
        );
        return true;
      }
    );
  }
});

test("a surrounding-space port is accepted as an integer", () => {
  const config = buildMigrationConnectionConfig(
    sampleEnvironment({
      MYSQL_PORT: " 3306 ",
    })
  );

  assert.equal(config.port, 3306);
});

test("an absent environment file leaves the process environment unchanged", async () => {
  const key = "MIGRATION_CONNECTION_ABSENT_FILE_TEST";
  const previous = process.env[key];
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "migration-connection-")
  );

  delete process.env[key];

  try {
    loadOptionalLocalEnv(
      path.join(directory, ".env.local")
    );

    assert.equal(process.env[key], undefined);
  } finally {
    await fs.rm(directory, {
      recursive: true,
      force: true,
    });

    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
});

test("process environment values take precedence over .env.local", async () => {
  const key = "MIGRATION_CONNECTION_PRECEDENCE_TEST";
  const previous = process.env[key];
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "migration-connection-")
  );
  const envPath = path.join(directory, ".env.local");

  process.env[key] = "from-process";

  try {
    await fs.writeFile(
      envPath,
      `${key}=from-file\n`,
      "utf8"
    );

    loadOptionalLocalEnv(envPath);

    assert.equal(process.env[key], "from-process");
  } finally {
    await fs.rm(directory, {
      recursive: true,
      force: true,
    });

    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
});

test("an empty process value is kept and a missing value can be filled from the file", async () => {
  const keptKey = "MIGRATION_CONNECTION_EMPTY_PROCESS_TEST";
  const filledKey = "MIGRATION_CONNECTION_FILLED_FROM_FILE_TEST";
  const previousKept = process.env[keptKey];
  const previousFilled = process.env[filledKey];
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "migration-connection-")
  );
  const envPath = path.join(directory, ".env.local");

  process.env[keptKey] = "";
  delete process.env[filledKey];

  try {
    await fs.writeFile(
      envPath,
      [
        `# comment`,
        ``,
        `${keptKey}="from-file"`,
        `${filledKey}='from-file'`,
      ].join("\n"),
      "utf8"
    );

    loadOptionalLocalEnv(envPath);

    assert.equal(process.env[keptKey], "");
    assert.equal(process.env[filledKey], "from-file");
  } finally {
    await fs.rm(directory, {
      recursive: true,
      force: true,
    });

    if (previousKept === undefined) {
      delete process.env[keptKey];
    } else {
      process.env[keptKey] = previousKept;
    }

    if (previousFilled === undefined) {
      delete process.env[filledKey];
    } else {
      process.env[filledKey] = previousFilled;
    }
  }
});
