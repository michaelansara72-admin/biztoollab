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
    " BIZTOOLLAB EVIDENCE FINGERPRINT SCHEMA"
  );
  console.log(
    "=============================================="
  );

  const [columns] = await connection.execute(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = 'ai_recommendations'
        AND column_name = 'evidence_fingerprint'
    `,
    [MYSQL_DATABASE]
  );

  if (Number(columns[0].count) === 0) {
    await connection.execute(`
      ALTER TABLE ai_recommendations
      ADD COLUMN evidence_fingerprint CHAR(64) NULL
      AFTER evidence_end
    `);

    console.log(
      "[PASS] evidence_fingerprint column added."
    );
  } else {
    console.log(
      "[PASS] evidence_fingerprint column already exists."
    );
  }

  const [verification] =
    await connection.execute(
      `
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = ?
          AND table_name = 'ai_recommendations'
          AND column_name = 'evidence_fingerprint'
      `,
      [MYSQL_DATABASE]
    );

  if (verification.length !== 1) {
    throw new Error(
      "Unable to verify evidence_fingerprint column."
    );
  }

  const column = verification[0];

  if (
    column.data_type !== "char" ||
    Number(column.character_maximum_length) !== 64 ||
    column.is_nullable !== "YES"
  ) {
    throw new Error(
      "evidence_fingerprint column does not match expected schema."
    );
  }

  console.log(
    "[PASS] evidence_fingerprint schema verified."
  );

  console.log(
    "[PASS] Existing recommendations remain unchanged."
  );
} finally {
  await connection.end();
}