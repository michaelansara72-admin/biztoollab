import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

function loadLocalEnv() {
  const envPath = path.resolve(
    process.cwd(),
    ".env.local"
  );

  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(
    envPath,
    "utf8"
  );

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

    const key = line
      .slice(0, separatorIndex)
      .trim();

    let value = line
      .slice(separatorIndex + 1)
      .trim();

    if (
      (value.startsWith('"') &&
        value.endsWith('"')) ||
      (value.startsWith("'") &&
        value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_DATABASE,
  MYSQL_USER,
  MYSQL_PASSWORD,
} = process.env;

if (
  !MYSQL_HOST ||
  !MYSQL_DATABASE ||
  !MYSQL_USER ||
  !MYSQL_PASSWORD
) {
  throw new Error(
    "MySQL environment variables are incomplete."
  );
}

const connection = await mysql.createConnection({
  host: MYSQL_HOST,
  port: Number(MYSQL_PORT || 3306),
  database: MYSQL_DATABASE,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  ssl: {
    rejectUnauthorized: true,
  },
});

try {
  console.log(
    "=============================================="
  );
  console.log(
    " BIZTOOLLAB SEARCH CONSOLE SNAPSHOT SCHEMA"
  );
  console.log(
    "=============================================="
  );

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS search_console_snapshots (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

      site_url VARCHAR(255) NOT NULL,

      evidence_start DATE NOT NULL,
      evidence_end DATE NOT NULL,

      clicks DECIMAL(14,4) NOT NULL DEFAULT 0,
      impressions DECIMAL(14,4) NOT NULL DEFAULT 0,
      ctr DECIMAL(14,8) NOT NULL DEFAULT 0,
      position DECIMAL(14,8) NOT NULL DEFAULT 0,

      queries_json JSON NULL,
      pages_json JSON NULL,

      collected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      PRIMARY KEY (id),

      UNIQUE KEY uq_search_console_snapshot_period (
        site_url,
        evidence_start,
        evidence_end
      ),

      INDEX idx_search_console_snapshot_dates (
        evidence_start,
        evidence_end
      ),

      INDEX idx_search_console_snapshot_collected (
        collected_at
      )
    )
  `);

  const [rows] = await connection.execute(
    `
      SELECT COUNT(*) AS count
      FROM search_console_snapshots
    `
  );

  console.log(
    "[PASS] search_console_snapshots table is available."
  );

  console.log(
    `[PASS] Current snapshot records: ${rows[0].count}`
  );

  console.log(
    "[PASS] No Search Console snapshots were created by this migration."
  );
} finally {
  await connection.end();
}