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
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

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
  console.log(" BIZTOOLLAB EXPERIMENT LIFECYCLE V1");
  console.log("==============================================");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS experiments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

      recommendation_id BIGINT UNSIGNED NOT NULL,
      source_decision_id BIGINT UNSIGNED NOT NULL,

      title VARCHAR(255) NOT NULL,

      hypothesis TEXT NOT NULL,
      proposed_change TEXT NOT NULL,
      control_description TEXT NULL,

      success_metric TEXT NOT NULL,
      baseline_value VARCHAR(255) NULL,
      target_value VARCHAR(255) NULL,

      status ENUM(
        'draft',
        'ready-for-review',
        'approved',
        'rejected'
      ) NOT NULL DEFAULT 'draft',

      created_by VARCHAR(100) NOT NULL DEFAULT 'admin',

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      PRIMARY KEY (id),

      INDEX idx_experiments_recommendation_id (
        recommendation_id
      ),

      INDEX idx_experiments_source_decision_id (
        source_decision_id
      ),

      INDEX idx_experiments_status (
        status
      ),

      INDEX idx_experiments_created_at (
        created_at
      ),

      CONSTRAINT fk_experiments_recommendation
        FOREIGN KEY (recommendation_id)
        REFERENCES ai_recommendations(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      CONSTRAINT fk_experiments_source_decision
        FOREIGN KEY (source_decision_id)
        REFERENCES human_decisions(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    )
  `);

  const [tables] = await connection.query(`
    SHOW TABLES LIKE 'experiments'
  `);

  if (!Array.isArray(tables) || tables.length !== 1) {
    throw new Error(
      "experiments table could not be verified."
    );
  }

  console.log("[PASS] experiments table is available.");

  const [rows] = await connection.query(`
    SELECT COUNT(*) AS experiment_count
    FROM experiments
  `);

  console.log(
    `[PASS] Current experiment records: ${rows[0].experiment_count}`
  );

  console.log(
    "[PASS] No experiment records were created by this migration."
  );
} finally {
  await connection.end();
}
