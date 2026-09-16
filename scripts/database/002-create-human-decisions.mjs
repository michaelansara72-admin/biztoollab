import mysql from "mysql2/promise";
import fs from "node:fs";

function loadLocalEnvironment() {
  const envText = fs.readFileSync(".env.local", "utf8");

  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadLocalEnvironment();

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  connectTimeout: 10000,
});

try {
  console.log("==============================================");
  console.log(" BIZTOOLLAB HUMAN GOVERNANCE SCHEMA");
  console.log("==============================================");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS human_decisions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

      recommendation_id BIGINT UNSIGNED NOT NULL,

      decision ENUM(
        'review-experiment',
        'monitor-longer',
        'modify',
        'reject'
      ) NOT NULL,

      notes TEXT NULL,

      decided_by VARCHAR(100) NOT NULL DEFAULT 'admin',

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      PRIMARY KEY (id),

      INDEX idx_human_decisions_recommendation_id (
        recommendation_id
      ),

      INDEX idx_human_decisions_decision (
        decision
      ),

      INDEX idx_human_decisions_created_at (
        created_at
      ),

      CONSTRAINT fk_human_decisions_recommendation
        FOREIGN KEY (recommendation_id)
        REFERENCES ai_recommendations(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    )
  `);

  const [tables] = await connection.query(
    `
      SHOW TABLES LIKE 'human_decisions'
    `
  );

  if (Array.isArray(tables) && tables.length === 1) {
    console.log(
      "[PASS] human_decisions table is available."
    );
  } else {
    throw new Error(
      "human_decisions table could not be verified."
    );
  }

  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS decision_count
      FROM human_decisions
    `
  );

  console.log(
    `[PASS] Current human decision records: ${rows[0].decision_count}`
  );

  console.log(
    "[PASS] No human decisions were created by this migration."
  );
} finally {
  await connection.end();
}