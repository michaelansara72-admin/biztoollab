import mysql from "mysql2/promise";
import fs from "node:fs";

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

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
});

try {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS ai_recommendations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

      source VARCHAR(100) NOT NULL,
      site_url VARCHAR(255) NOT NULL,

      evidence_start DATE NOT NULL,
      evidence_end DATE NOT NULL,

      summary TEXT NOT NULL,
      evidence_assessment TEXT NOT NULL,
      opportunity TEXT NOT NULL,
      evidence TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      proposed_experiment TEXT NOT NULL,
      measurement_plan TEXT NOT NULL,

      confidence ENUM(
        'low',
        'moderate',
        'high'
      ) NOT NULL,

      ai_governance_status ENUM(
        'monitor-longer',
        'candidate-experiment'
      ) NOT NULL,

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      PRIMARY KEY (id),

      INDEX idx_ai_recommendations_created_at (created_at),
      INDEX idx_ai_recommendations_governance_status (
        ai_governance_status
      )
    )
  `);

  console.log("==============================================");
  console.log(" BIZTOOLLAB DATABASE SCHEMA");
  console.log("==============================================");
  console.log("[PASS] ai_recommendations table is available.");
  console.log("[PASS] No recommendation records were inserted.");
} finally {
  await connection.end();
}