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
  console.log(
    "=============================================="
  );
  console.log(
    " BIZTOOLLAB RECOMMENDATION EVIDENCE LINKS"
  );
  console.log(
    "=============================================="
  );

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS recommendation_snapshot_links (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

      recommendation_id BIGINT UNSIGNED NOT NULL,
      snapshot_id BIGINT UNSIGNED NOT NULL,

      relationship_type ENUM(
        'analysis-time',
        'historical-reconstruction'
      ) NOT NULL,

      notes TEXT NULL,

      created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      PRIMARY KEY (id),

      UNIQUE KEY uq_recommendation_snapshot (
        recommendation_id,
        snapshot_id
      ),

      INDEX idx_snapshot_links_snapshot (
        snapshot_id
      ),

      CONSTRAINT fk_snapshot_link_recommendation
        FOREIGN KEY (recommendation_id)
        REFERENCES ai_recommendations(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

      CONSTRAINT fk_snapshot_link_snapshot
        FOREIGN KEY (snapshot_id)
        REFERENCES search_console_snapshots(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    )
  `);

  const [rows] = await connection.execute(`
    SELECT COUNT(*) AS count
    FROM recommendation_snapshot_links
  `);

  console.log(
    "[PASS] recommendation_snapshot_links table is available."
  );

  console.log(
    `[PASS] Current relationship records: ${rows[0].count}`
  );

  console.log(
    "[PASS] No recommendation-snapshot links were created by this migration."
  );
} finally {
  await connection.end();
}