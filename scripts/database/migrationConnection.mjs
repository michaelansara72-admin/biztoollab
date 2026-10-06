import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const requiredVariableNames = [
  "MYSQL_HOST",
  "MYSQL_PORT",
  "MYSQL_DATABASE",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
];

export function loadOptionalLocalEnv(
  envPath = path.resolve(process.cwd(), ".env.local")
) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (
      !line ||
      line.startsWith("#") ||
      !line.includes("=")
    ) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    const key = line.slice(0, separatorIndex).trim();

    if (!key) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function buildMigrationConnectionConfig(
  env = process.env
) {
  const values = {};

  for (const name of requiredVariableNames) {
    const value = env[name];

    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(
        `Missing required database environment variable: ${name}`
      );
    }

    values[name] = value;
  }

  const portText = values.MYSQL_PORT.trim();
  const port = Number(portText);

  if (
    !/^[1-9]\d*$/.test(portText) ||
    !Number.isSafeInteger(port)
  ) {
    throw new Error(
      "MYSQL_PORT must be a valid positive integer."
    );
  }

  return {
    host: values.MYSQL_HOST,
    port,
    database: values.MYSQL_DATABASE,
    user: values.MYSQL_USER,
    password: values.MYSQL_PASSWORD,
    connectTimeout: 10000,
    ssl: {
      rejectUnauthorized: true,
    },
  };
}

export async function createMigrationConnection() {
  loadOptionalLocalEnv();

  return mysql.createConnection(
    buildMigrationConnectionConfig()
  );
}
